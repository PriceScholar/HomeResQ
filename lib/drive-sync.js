// Reuse the application's existing private record storage; no public asset or new package.
import {createHash,createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {pdfBytes} from './pdf';
import {readSettings,listRecords,fetchRecord,saveRecord,totals} from './store';

// This integration is isolated from the existing invoice/quotation storage.
// A refresh token is AES-256-GCM encrypted before being written to Blob.
const KEY_ID='gdrive-company-v1';
const SCOPE='https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';
const BASE='https://www.googleapis.com/drive/v3';
const UPLOAD='https://www.googleapis.com/upload/drive/v3';
const redirectURI=()=>process.env.GOOGLE_DRIVE_REDIRECT_URI||'https://resqhome-office.vercel.app/api/drive/callback';
export function googleDriveConfigured(){
 return Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID&&process.env.GOOGLE_DRIVE_CLIENT_SECRET&&process.env.SESSION_SECRET&&process.env.BLOB_READ_WRITE_TOKEN);
}
function cryptKey(){
 if(!process.env.SESSION_SECRET)throw Error('Drive encryption secret is missing');
 return createHash('sha256').update('resqhome-google-drive:'+process.env.SESSION_SECRET).digest();
}
function seal(value){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',cryptKey(),iv);
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
 return JSON.stringify({version:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:encrypted.toString('base64')});
}
function unseal(raw){
 const val=JSON.parse(raw),decipher=createDecipheriv('aes-256-gcm',cryptKey(),Buffer.from(val.iv,'base64'));
 decipher.setAuthTag(Buffer.from(val.tag,'base64'));
 return JSON.parse(Buffer.concat([decipher.update(Buffer.from(val.data,'base64')),decipher.final()]).toString('utf8'));
}
async function loadConnection(){
 if(!googleDriveConfigured())return null;
 const row=await fetchRecord('integrations',KEY_ID);
 if(!row?.sealed)return null;
 const stored=unseal(row.sealed);
 return stored.disconnected?null:stored;
}
async function saveConnection(record){
 await saveRecord('integrations',KEY_ID,{sealed:seal(record),updatedAt:new Date().toISOString()});
}
export async function driveStatus(){
 const configured=googleDriveConfigured();
 if(!configured)return {configured:false,connected:false,callback:redirectURI(),message:'Google OAuth credentials must be configured in Vercel before connecting.'};
 try{
  const c=await loadConnection();
  return {configured:true,connected:!!c,account:c?.email||null,folderId:c?.folders?.root||null,folderUrl:c?.folders?.root?'https://drive.google.com/drive/folders/'+c.folders.root:null,callback:redirectURI()};
 }catch(err){return {configured:true,connected:false,message:'Drive storage needs attention: '+String(err.message||err).slice(0,180),callback:redirectURI()};}
}
export function oauthURL(state){
 if(!googleDriveConfigured())throw Error('Google Drive credentials are not configured');
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 for(const [k,v] of Object.entries({client_id:process.env.GOOGLE_DRIVE_CLIENT_ID,redirect_uri:redirectURI(),response_type:'code',scope:SCOPE,access_type:'offline',prompt:'consent select_account',state}))url.searchParams.set(k,v);
 return url.toString();
}
async function tokenRequest(args){
 const resp=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GOOGLE_DRIVE_CLIENT_ID,client_secret:process.env.GOOGLE_DRIVE_CLIENT_SECRET,...args}),signal:AbortSignal.timeout(16000),cache:'no-store'});
 const data=await resp.json();if(!resp.ok)throw Error('Google OAuth token request failed: '+(data.error||resp.status));
 return data;
}
async function google(accessToken,url,options={}){
 const res=await fetch(url,{...options,headers:{...(options.headers||{}),Authorization:'Bearer '+accessToken},signal:AbortSignal.timeout(25000),cache:'no-store'});
 if(!res.ok){const short=(await res.text()).slice(0,250);throw Error('Google Drive HTTP '+res.status+': '+short);}
 return res.status===204?{}:res.json();
}
async function folder(token,name,parent='root'){
 const q="name = '"+name.replace(/'/g,"\\'")+"' and mimeType = 'application/vnd.google-apps.folder' and '"+parent+"' in parents and trashed = false";
 const params=new URLSearchParams({q,fields:'nextPageToken,files(id,name)',pageSize:'20',spaces:'drive'});
 const found=await google(token,BASE+'/files?'+params.toString());
 if(found.files?.length)return found.files[0].id;
 const created=await google(token,BASE+'/files?fields=id',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder',parents:[parent]})});
 return created.id;
}
export async function completeAuthorization(code){
 const tok=await tokenRequest({code,redirect_uri:redirectURI(),grant_type:'authorization_code'});
 if(!tok.access_token)throw Error('Google returned no access token');
 const profile=await google(tok.access_token,'https://www.googleapis.com/oauth2/v3/userinfo');
 const old=await loadConnection();
 if(!tok.refresh_token&&(!old||old.email!==profile.email))throw Error('Google did not grant offline access; reconnect with consent');
 const email=String(profile.email||'').toLowerCase();
 if(!email||profile.email_verified===false)throw Error('Google account email not verified');
 const root=await folder(tok.access_token,'HOME RESCUE OFFICE');
 const [invoices,quotations,expenses]=await Promise.all([
  folder(tok.access_token,'Invoices',root),folder(tok.access_token,'Quotations',root),folder(tok.access_token,'Expenses & Profit',root)
 ]);
 await saveConnection({email,refreshToken:tok.refresh_token||old.refreshToken,folders:{root,invoices,quotations,expenses},linkedAt:new Date().toISOString()});
 return email;
}
async function access(){
 const c=await loadConnection();if(!c)return null;
 const t=await tokenRequest({refresh_token:c.refreshToken,grant_type:'refresh_token'});
 if(!t.access_token)throw Error('Google Drive access was revoked. Reconnect in Settings.');
 return {token:t.access_token,connection:c};
}
async function upsert(token,parent,name,mime,data){
 const q="'"+parent+"' in parents and name = '"+name.replace(/'/g,"\\'")+"' and trashed = false";
 const found=await google(token,BASE+'/files?'+new URLSearchParams({q,fields:'files(id,name),nextPageToken',pageSize:'30'}));
 const prior=found.files?.[0]?.id;
 if(prior){
  await google(token,UPLOAD+'/files/'+encodeURIComponent(prior)+'?uploadType=media&fields=id',{method:'PATCH',headers:{'Content-Type':mime},body:data});
  return prior;
 }
 const boundary='resqhome-'+randomBytes(9).toString('hex');
 const head=Buffer.from('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify({name,mimeType:mime,parents:[parent]})+'\r\n--'+boundary+'\r\nContent-Type: '+mime+'\r\n\r\n');
 const tail=Buffer.from('\r\n--'+boundary+'--');
 const body=Buffer.concat([head,Buffer.isBuffer(data)?data:Buffer.from(data),tail]);
 const created=await google(token,UPLOAD+'/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});
 return created.id;
}
const csv=s=>{const v=String(s??'');return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
const line=(...x)=>x.map(csv).join(',');
function expenseCSV(doc,expenses,payments){
 const t=totals(doc);
 const es=expenses.filter(x=>x.invoice_id===doc.id),ps=payments.filter(x=>x.invoice_id===doc.id);
 const e=Math.round(es.reduce((n,x)=>n+Number(x.amount||0),0)*100)/100;
 const p=Math.round(ps.reduce((n,x)=>n+Number(x.amount||0),0)*100)/100;
 const money=x=>Number(x).toFixed(2);
 return '\uFEFF'+[
  line('RESQHOME INVOICE EXPENSE REPORT'),line('Invoice',doc.number),line('Customer',doc.client_name),
  line('Revenue excluding VAT (AED)',money(t.subtotal)),line('VAT (AED)',money(t.vat)),
  line('Invoice total (AED)',money(t.total)),line('Actual expenses (AED)',money(e)),
  line('Net job profit (AED)',money(Number(t.subtotal)-e)),line('Payment received (AED)',money(p)),
  line('Outstanding incl VAT (AED)',money(Number(t.total)-p)), '',
  line('Date','Category','Description','Expense Amount AED'),
  ...es.map(x=>line(x.date,x.category,x.description,money(x.amount))), '',
  line('Customer payments'),line('Date','Method','Reference','Amount AED'),
  ...ps.map(x=>line(x.date,x.method,x.reference,money(x.amount)))
 ].join('\r\n')+'\r\n';
}
export async function syncDocumentToGoogle(doc){
 const auth=await access();if(!auth)return {skipped:true};
 const setting=await readSettings(),pdf=await pdfBytes(doc,setting);
 const parent=doc.type==='invoice'?auth.connection.folders.invoices:auth.connection.folders.quotations;
 await upsert(auth.token,parent,doc.number+'.pdf','application/pdf',Buffer.from(pdf));
 return {ok:true};
}
export async function syncExpenseToGoogle(invoiceId){
 const auth=await access();if(!auth)return {skipped:true};
 const invoice=await fetchRecord('documents',invoiceId);if(!invoice||invoice.type!=='invoice')return {skipped:true};
 const [expenses,payments]=await Promise.all([listRecords('expenses'),listRecords('payments')]);
 await upsert(auth.token,auth.connection.folders.expenses,'Expenses-'+invoice.number+'.csv','text/csv',expenseCSV(invoice,expenses,payments));
 return {ok:true};
}
export async function syncCompanyExpenseReport(){
 const auth=await access();if(!auth)return {skipped:true};
 const [documents,expenses,payments]=await Promise.all([listRecords('documents'),listRecords('expenses'),listRecords('payments')]);
 const money=x=>Number(x).toFixed(2);
 const content='\uFEFF'+[
  line('Invoice','Client','Revenue excl VAT AED','Expenses AED','Net job profit AED','Invoice total AED','Payments received AED'),
  ...documents.filter(x=>x.type==='invoice').map(doc=>{
   const t=totals(doc);
   const ex=expenses.filter(x=>x.invoice_id===doc.id).reduce((a,e)=>a+Number(e.amount||0),0);
   const pay=payments.filter(x=>x.invoice_id===doc.id).reduce((a,e)=>a+Number(e.amount||0),0);
   return line(doc.number,doc.client_name,money(t.subtotal),money(ex),money(Number(t.subtotal)-ex),money(t.total),money(pay));
  })
 ].join('\r\n')+'\r\n';
 await upsert(auth.token,auth.connection.folders.expenses,'Company-Expenses-and-Profit.csv','text/csv',content);
 return {ok:true};
}
export async function syncAllPage(offset=0,limit=5){
 const auth=await access();if(!auth)throw Error('Connect Google Drive first');
 const docs=await listRecords('documents');docs.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
 const slice=docs.slice(offset,offset+limit),errors=[];
 for(const doc of slice){
  try{await syncDocumentToGoogle(doc);if(doc.type==='invoice')await syncExpenseToGoogle(doc.id);}
  catch(err){errors.push({number:doc.number,error:String(err.message||err).slice(0,150)});}
 }
 if(offset+limit>=docs.length){
  try{await syncCompanyExpenseReport()}catch(err){errors.push({number:'Company expense sheet',error:String(err.message||err).slice(0,150)});}
 }
 return {processed:slice.length,total:docs.length,nextOffset:offset+slice.length,hasMore:offset+slice.length<docs.length,errors};
}
export async function disconnectGoogle(){await saveConnection({disconnected:true});}
