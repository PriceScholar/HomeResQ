import {list,put,get,del} from './blob-mock';
const ROOT='resqhome-office/v1/';
export const defaults={legal_name:'HOME RESCUE TECHNICAL SERVICES LLC',license_number:'1191464',phone:'+971 52 452 4295',email:'info@homerescue.ae',website:'www.resqhome.ae',location:'Al Nahda 1, Dubai, UAE',tax_rate:5,advance_percent:80,quotation_valid_days:30,tax_registration_number:'104570745000003',bank_payable_to:'HOME RESCUE TECHNICAL SERVICES LLC',bank_name:'RAK BANK',bank_branch:'AL QUOZ, DUBAI',bank_account_number:'0553196914001',bank_iban:'AE110400000553196914001',bank_swift_code:'NRAKAEAK'};
export const services=[
['AC Maintenance','Preventive inspection, filter cleaning and operational checks.'],['AC Emergency Repair','Fault diagnosis and repair of air conditioning equipment.'],['AC Installation','Installation, connection and performance testing of AC units.'],['Plumbing Services','Investigation and rectification of plumbing defects and leaks.'],['Kitchen Sink Leak Rectification','Repair and reseal leaking connections with final functional test.'],['Interior Wall Painting','Surface preparation, minor filling and two finishing coats.'],['Exterior Painting','External surface preparation and weather-resistant finishing.'],['Electrical Services','Fault diagnosis, safe repair and electrical checks.'],['LED Light Fixture Installation','Install, connect and test customer-supplied LED light fixtures.'],['Gypsum & Ceiling Works','Supply, installation and finishing of gypsum ceiling works.'],['Handyman Services','General residential maintenance and fitting repairs.'],['Home General Maintenance','Preventive and corrective maintenance across the property.'],['Wooden Work & Carpentry','Measure, supply and fit bespoke joinery and timber details.'],['Kitchen Carpentry','Kitchen cabinet and storage carpentry fabrication and installation.'],['Wardrobes & Cupboards','Custom-built wardrobes, shelving and cupboard fittings.'],['TV & Entertainment Units','Custom timber TV units and integrated entertainment fittings.']].map(([title,description])=>({title,description}));
const location=(type,id)=>`${ROOT}${type}/${id}.json`;
export async function fetchRecord(type,id){
 const result=await get(location(type,id),{access:'private',useCache:false});
 if(!result||result.statusCode===404)return null;
 if(result.statusCode!==200)throw new Error('Cloud storage returned '+result.statusCode);
 return JSON.parse(await new Response(result.stream).text());
}
export async function saveRecord(type,id,record){
 await put(location(type,id),JSON.stringify(record),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'});
 return record;
}
export async function deleteRecord(type,id){await del(location(type,id));}
export async function listRecords(type){
 let cursor,items=[],pages=0;
 do{
   const response=await list({prefix:`${ROOT}${type}/`,limit:1000,cursor});
   for(const item of response.blobs){
    const key=item.pathname.split('/').pop().replace(/\.json$/,'');
    const row=await fetchRecord(type,key); if(row)items.push(row);
   }
   cursor=response.hasMore?response.cursor:undefined;
 }while(cursor&&++pages<50);
 return items;
}
export async function readSettings(){try{return {...defaults,...(await fetchRecord('settings','company')||{})}}catch(e){if(String(e).includes('404'))return {...defaults};throw e}}
export async function bootstrap(){const [documents,clients,settings]=await Promise.all([listRecords('documents'),listRecords('clients'),readSettings()]);documents.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));clients.sort((a,b)=>a.name.localeCompare(b.name));return {documents,clients,settings,services,backup_count:0}}
export function totals(d){let subtotal=0;for(const item of (d.items||[])){subtotal+=Number(item.qty||0)*Number(item.rate||0)};subtotal=Math.round(subtotal*100)/100;const vat=Math.round(subtotal*Number(d.tax_rate??5))/100;return {subtotal:subtotal.toFixed(2),vat:vat.toFixed(2),total:(subtotal+vat).toFixed(2)}}
export function validateDoc(obj){
 if(!obj||!['invoice','quotation'].includes(obj.type))throw new Error('Invalid document type');
 if(!String(obj.client_name||'').trim())throw new Error('Client name required');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(obj.issue_date||'')))throw new Error('Invalid issue date');
 if(!Array.isArray(obj.items)||!obj.items.length||obj.items.length>80)throw new Error('Add 1–80 service lines');
 const status=obj.type==='invoice'?['draft','sent','partial','paid','cancelled']:['draft','sent','accepted','rejected','expired'];
 if(!status.includes(obj.status||'draft'))throw new Error('Invalid status');
 for(const item of obj.items){if(!String(item.title||'').trim()||!Number.isFinite(Number(item.qty))||Number(item.qty)<=0||!Number.isFinite(Number(item.rate))||Number(item.rate)<0)throw new Error('Invalid service line');if(String(item.title).length>220||String(item.description||'').length>1300)throw new Error('Service description too long')}
 return {...obj,client_name:String(obj.client_name).trim(),items:obj.items.map(i=>({title:String(i.title).trim(),description:String(i.description||''),qty:Number(i.qty),rate:Number(i.rate)})),status:obj.status||'draft',tax_rate:Math.min(100,Math.max(0,Number(obj.tax_rate??5))),advance_percent:Math.min(100,Math.max(0,Number(obj.advance_percent??80)))};
}
export async function nextNumber(type){
 // Separate consecutive series per document type and year; a deleted document never releases its number.
 const docs=await listRecords('documents');
 const year=new Date().getUTCFullYear();
 const prefix=type==='invoice'?'RQ-INV-':'RQ-QT-';
 const bucket=`${ROOT}issued-numbers/${type}/${year}/`;
 let max=509;
 for(const d of docs){
  if(String(d.number||'').startsWith(`${prefix}${year}-`)){
   const n=Number(String(d.number).split('-').pop());
   if(Number.isSafeInteger(n))max=Math.max(max,n);
  }
 }
 let cursor;do{
  const page=await list({prefix:bucket,limit:1000,cursor});
  for(const entry of page.blobs||[]){
   const n=Number(entry.pathname.slice(bucket.length).replace(/\\.json$/,''));
   if(Number.isSafeInteger(n))max=Math.max(max,n);
  }
  cursor=page.hasMore?page.cursor:undefined;
 }while(cursor);
 // Atomic no-overwrite reservations prevent reuse after deletion and collisions on concurrent requests.
 for(let n=max+1;n<max+201;n++){
  try{
   await put(`${bucket}${n}.json`,JSON.stringify({number:`${prefix}${year}-${n}`,issued_at:new Date().toISOString()}),{
    access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json'
   });
   return `${prefix}${year}-${n}`;
  }catch(e){
   if(/already.?exists|blobpreconditionfailed|precondition.?failed|409/i.test(String(e?.name||'')+' '+String(e?.message||'')))continue;
   throw e;
  }
 }
 throw Error('Could not allocate a unique document number. Please retry.');
}
