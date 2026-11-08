import {NextResponse} from 'next/server';
import {isAuthenticated,checkOrigin} from '../../../lib/auth';
import {bootstrap,defaults,readSettings,saveRecord,fetchRecord,listRecords,deleteRecord,nextNumber,validateDoc,totals} from '../../../lib/store';
import {pdfBytes} from '../../../lib/pdf';
import {randomUUID} from 'node:crypto';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function json(x,code=200){return NextResponse.json(x,{status:code,headers:{'Cache-Control':'no-store'}})}
const fail=(message,code=400)=>json({detail:message},code);
function isSafeId(id){return /^[0-9a-f-]{36}$/i.test(id||'')}
function errorResponse(e){console.error('RESQHOME API:',e); const m=String(e?.message||e);return fail(m.includes('BLOB')||m.includes('token')||m.includes('store')?'Cloud storage is not connected. Check Vercel Storage settings.':m, /not found/i.test(m)?404:500)}
function csvCell(x){const s=String(x??'');return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
async function handle(request,method,context){
 try{
  const {path}=await context.params;const p=path||[];
  if(p[0]==='health'&&p.length===1)return json({status:'ok',storageConfigured:!!(process.env.BLOB_STORE_ID||process.env.BLOB_READ_WRITE_TOKEN),authConfigured:!!process.env.OFFICE_PASSWORD_HASH});
  if(!isAuthenticated(request))return fail('Please sign in to RESQHOME Office',401);
  if(!['GET','HEAD'].includes(method)&&!checkOrigin(request))return fail('Invalid origin',403);
  const body=()=>request.json();
  const when=()=>new Date().toISOString();
  if(p[0]==='bootstrap'&&method==='GET')return json(await bootstrap());
  if(p[0]==='documents'){
   if(p.length===1&&method==='GET')return json(await listRecords('documents'));
   if(p.length===1&&method==='POST'){
    const d=validateDoc(await body());const id=randomUUID();const stamp=when();
    const r={...d,id,number:await nextNumber(d.type),total:totals(d).total,origin_id:null,created_at:stamp,updated_at:stamp};
    return json(await saveRecord('documents',id,r),201);
   }
   if(p.length>=2){
    if(!isSafeId(p[1]))return fail('Invalid document ID');
    const old=await fetchRecord('documents',p[1]);if(!old)return fail('Document not found',404);
    if(p.length===2&&method==='GET')return json(old);
    if(p.length===2&&method==='PUT'){
      const d=validateDoc(await body());if(d.type!==old.type)return fail('Document type cannot change',422);
      return json(await saveRecord('documents',old.id,{...old,...d,number:old.number,total:totals(d).total,updated_at:when()}));
    }
    if(p.length===2&&method==='DELETE'){await deleteRecord('documents',old.id);return json({success:true})}
    if(p[2]==='convert'&&method==='POST'){
     if(old.type!=='quotation')return fail('Only quotations can convert to invoices',422);
     const newdoc={...old,id:randomUUID(),type:'invoice',status:'draft',issue_date:new Date().toISOString().slice(0,10),created_at:when(),updated_at:when(),origin_id:old.id};
     newdoc.number=await nextNumber('invoice'); return json(await saveRecord('documents',newdoc.id,newdoc),201);
    }
    if(p[2]==='pdf'&&method==='GET'){
     const settings=await readSettings();const bytes=await pdfBytes(old,settings);
     return new Response(bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${old.number}.pdf"`,'Cache-Control':'private, no-store'}})
    }
   }
  }
  if(p[0]==='clients'){
   if(p.length===1&&method==='GET')return json(await listRecords('clients'));
   if(p.length===1&&method==='POST'){
    const val=await body();if(!String(val.name||'').trim())return fail('Client name required',422);
    const id=randomUUID(),stamp=when();const r={id,name:String(val.name).trim().slice(0,200),email:String(val.email||''),phone:String(val.phone||''),address:String(val.address||''),created_at:stamp,updated_at:stamp};return json(await saveRecord('clients',id,r),201)
   }
   if(p.length===2){if(!isSafeId(p[1]))return fail('Invalid client ID');const old=await fetchRecord('clients',p[1]);if(!old)return fail('Client not found',404);
    if(method==='PUT'){const v=await body();if(!String(v.name||'').trim())return fail('Client name required',422);await saveRecord('clients',old.id,{...old,name:String(v.name),phone:String(v.phone||''),email:String(v.email||''),address:String(v.address||''),updated_at:when()});return json({success:true})}
    if(method==='DELETE'){await deleteRecord('clients',old.id);return json({success:true})}
   }
  }
  if(p[0]==='settings'&&method==='PUT'){
   const v=await body(),old=await readSettings();const merged={...old};for(const key of Object.keys(defaults))if(key in v)merged[key]=v[key];return json(await saveRecord('settings','company',merged));
  }
  if(p[0]==='backup'&&method==='GET'){
   const b={...(await bootstrap()),exported_at:when(),format:'RESQHOME_OFFICE_BACKUP_V1'};
   return new Response(JSON.stringify(b,null,2),{headers:{'Content-Type':'application/json','Content-Disposition':`attachment; filename="resqhome-backup-${new Date().toISOString().slice(0,10)}.json"`}})
  }
  if(p[0]==='restore'&&method==='POST'){
   const b=await body();if(b?.format!=='RESQHOME_OFFICE_BACKUP_V1'||!Array.isArray(b.documents)||!Array.isArray(b.clients)||b.documents.length>3000||b.clients.length>3000)return fail('Invalid or excessive backup',422);
   // Preserve current records as a pre-restore snapshot before any mutation. Stored privately.
   const snapshot=await bootstrap();await saveRecord('snapshots',randomUUID(),{...snapshot,created_at:when(),reason:'pre-restore'});
   const existing=await bootstrap();
   const validDocs=b.documents.map(x=>{if(!isSafeId(x.id)||!/^RQ-(INV|QT)-\d{4}-\d{3,}$/.test(x.number))throw Error('Invalid backup document');const d=validateDoc(x);return {...x,...d,total:totals(d).total}});
   const validClients=b.clients.map(x=>{if(!isSafeId(x.id)||!String(x.name||'').trim())throw Error('Invalid backup client');return x});
   for(const row of validDocs)await saveRecord('documents',row.id,row);
   for(const row of validClients)await saveRecord('clients',row.id,row);
   await saveRecord('settings','company',{...defaults,...(b.settings||{})});
   for(const row of existing.documents){if(!validDocs.some(d=>d.id===row.id))await deleteRecord('documents',row.id)}
   for(const row of existing.clients){if(!validClients.some(d=>d.id===row.id))await deleteRecord('clients',row.id)}
   return json({success:true,documents:validDocs.length,clients:validClients.length});
  }
  if(p[0]==='export'&&p[1]==='csv'&&method==='GET'){
   const docs=await listRecords('documents');const head=['Number','Type','Status','Issue Date','Client','Project','Subtotal (AED)','VAT (AED)','Total (AED)'];
   const lines=[head,...docs.map(d=>{const v=totals(d);return [d.number,d.type,d.status,d.issue_date,d.client_name,d.project_title||'',v.subtotal,v.vat,v.total]})].map(r=>r.map(csvCell).join(','));
   return new Response(lines.join('\r\n'),{headers:{'Content-Type':'text/csv','Content-Disposition':'attachment; filename="resqhome-records.csv"'}})
  }
  return fail('Route not found',404);
 }catch(e){return errorResponse(e)}
}
export async function GET(r,c){return handle(r,'GET',c)}
export async function POST(r,c){return handle(r,'POST',c)}
export async function PUT(r,c){return handle(r,'PUT',c)}
export async function DELETE(r,c){return handle(r,'DELETE',c)}
