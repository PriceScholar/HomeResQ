import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {totals} from './store';
const PAGE=[595.28,841.89];
let brandLogoPromise;
async function loadBrandLogo(){
 if(!brandLogoPromise)brandLogoPromise=fetch('https://resqhome-office.vercel.app/logo-invoice.png').then(async r=>{if(!r.ok)throw Error('Logo asset request failed: '+r.status);return new Uint8Array(await r.arrayBuffer())});
 return brandLogoPromise;
}
const NAVY=rgb(0.09,0.20,0.31),BLUE=rgb(.13,.36,.54),PALE=rgb(.95,.975,.989),WHITE=rgb(1,1,1),INK=rgb(.10,.16,.23),MUTED=rgb(.31,.38,.44),LINE=rgb(.83,.87,.89);
const terms=[
['SITE MEASUREMENT','Final quantities and billing will follow actual measurements verified at the site, even where these differ from initial estimates.'],
['CHANGES TO THE SCOPE','All additions, omissions and alterations require written approval by both parties, including any change in cost.'],
['ITEM-SPECIFIC RATES','Quoted rates apply only to the listed services, materials and finishes. Decorative or specialist work is not included unless agreed.'],
['VARIATIONS & APPROVALS','Additional work may be charged as an approved variation. Authority NOCs and permits, if required, are charged separately.'],
['PRICE INCLUSIONS','Rates include ordinary material transport, customs handling, mock-ups and routine related expenses unless excluded in writing.'],
['SITE UTILITIES','The client will provide suitable site access, water and electricity necessary to carry out the works.'],
['COMPLETION PERIOD','Expected completion is three days after receipt of the first payment or LPO, subject to site access and no change in scope.'],
['WARRANTY EXCLUSIONS','Warranty excludes damage caused by natural disasters, severe climatic conditions, misuse or human activity.'],
['ORDER CANCELLATION','Cancellation of an accepted order is subject to a charge equal to 20% of the total order value.'],
['OWNERSHIP OF MATERIALS','Materials supplied remain the property of Home Rescue Technical Services LLC until payment is received in full.'],
['RATE VALIDITY','Rates and conditions remain valid for 30 days from the quotation issue date unless otherwise agreed in writing.']
];
const clean=s=>String(s??'').replace(/[\u2013\u2014]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2022\u00B7]/g,'-').replace(/[^\x20-\x7e]/g,' ');
const fmt=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const datef=d=>{try{return new Date(String(d).slice(0,10)+'T12:00:00Z').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})}catch{return String(d||'')}};
export async function pdfBytes(d,s){
 const pdf=await PDFDocument.create();pdf.setTitle(`RESQHOME ${d.type==='invoice'?'Invoice':'Quotation'} ${d.number}`);pdf.setAuthor('HOME RESCUE TECHNICAL SERVICES LLC');
 const normal=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const brandLogo=await pdf.embedPng(await loadBrandLogo());
 let page;const [W,H]=PAGE;const margin=34;
 function rect(x,y,w,h,fill,border=null,borderWidth=.5){page.drawRectangle({x,y,width:w,height:h,color:fill,borderColor:border||fill,borderWidth})}
 function line(x,y,X,Y,col=LINE,width=.6){page.drawLine({start:{x,y},end:{x:X,y:Y},color:col,thickness:width})}
 function text(x,y,string,size=9,font=normal,color=INK,align='left'){
  const value=clean(string);let sx=x; const wid=font.widthOfTextAtSize(value,size);
  if(align==='right')sx-=wid;else if(align==='center')sx-=wid/2;
  page.drawText(value,{x:sx,y,size,font,color,maxWidth:W-2*margin})
 }
 function wrap(textValue,width,size=9,font=normal){
  let lines=[]; const input=clean(textValue).split(/\s+/);let row='';for(const word of input){const candidate=row?row+' '+word:word;
   if(font.widthOfTextAtSize(candidate,size)>width&&row){lines.push(row);row=word}else row=candidate}
  if(row)lines.push(row);return lines.length?lines:[''];
 }
 function paragraph(x,y,value,width,size=9,leading=13,font=normal,color=INK,maxLines=20){const rows=wrap(value,width,size,font).slice(0,maxLines);rows.forEach((r,i)=>text(x,y-i*leading,r,size,font,color));return y-rows.length*leading}
 function header(){
  rect(34,H-22,W-68,3,BLUE);
  // Align the existing website logo with the brand name rather than the address lines.
  page.drawImage(brandLogo,{x:39,y:H-77,width:31,height:31});
  text(78,H-64,'RESQHOME',18,bold,BLUE);text(78,H-80,clean(s.legal_name||''),7.5,bold,MUTED);
  text(78,H-93,'COMMERCIAL LICENSE NO. '+clean(s.license_number||''),7.4,normal,MUTED);
  // Required document heading and supplied tax-registration number.
  text(W-40,H-43,d.type==='invoice'?'tax invoice':'quotation',12,bold,INK,'right');
  text(W-40,H-58,'TR NO : '+clean(s.tax_registration_number||'104570745000003'),8.4,normal,INK,'right');
  text(W-40,H-74,clean(s.location||'Dubai, United Arab Emirates'),8,bold,INK,'right');
  text(W-40,H-86,clean(s.phone||''),8,normal,MUTED,'right');
  text(W-40,H-98,clean(s.email||''),8,normal,MUTED,'right');
  text(W-40,H-110,clean(s.website||''),8,normal,MUTED,'right');
  line(40,H-120,W-40,H-120,LINE,.8)
 }
 function footer(){line(40,66,W-40,66,LINE,.8);text(40,45,`RESQHOME    |    Commercial License ${clean(s.license_number||'')}`,7.5,bold,MUTED);text(W-40,45,`${clean(d.number)}    -    ${pdf.getPageCount()}`,7.4,normal,MUTED,'right')}
 function newPage(){if(page)footer();page=pdf.addPage(PAGE);header()}
 newPage();
 text(40,706,'PROPERTY MAINTENANCE & TECHNICAL SERVICES',8,bold,BLUE);
 const quote=d.type==='quotation';text(40,670,quote?'QUOTATION':'INVOICE',28,bold,NAVY);
 text(40,650,quote?'Service proposal  -  Dubai, United Arab Emirates':'Service invoice  -  Dubai, United Arab Emirates',9,normal,MUTED);
 text(W-40,683,quote?'SERVICE PROPOSAL':'SERVICE INVOICE',8,bold,BLUE,'right');
 // metadata
 const metaY=597;rect(34,metaY,527,41,PALE);
 const heads=quote?['QUOTATION NUMBER','ISSUE DATE','VALID UNTIL','CURRENCY']:['INVOICE NUMBER','ISSUE DATE','CURRENCY','PAYMENT TERMS'];
 const vals=quote?[d.number,datef(d.issue_date),datef(d.valid_until||d.issue_date),'AED']:[d.number,datef(d.issue_date),'AED',`${Number(d.advance_percent??80)}% / ${100-Number(d.advance_percent??80)}%`];
 [42,191,350,475].forEach((x,i)=>{text(x,621,heads[i],7.1,bold,MUTED);text(x,604,vals[i],9.2,bold,BLUE)});
 // client/project boxes
 rect(34,493,527,92,WHITE,LINE,.7);line(297,493,297,585,LINE,.7);
 text(45,565,quote?'PREPARED FOR':'BILL TO',8,bold,BLUE);text(45,544,d.client_name,10.6,bold,NAVY);
 paragraph(45,527,d.client_address||'Dubai, United Arab Emirates',237,8.2,12,normal,MUTED,3);
 text(310,565,'SERVICE / PROJECT DETAILS',8,bold,BLUE);text(310,544,d.project_title||'Property maintenance services',9.6,bold,NAVY);
 paragraph(310,526,'Service location: '+(d.project_location||'Dubai, UAE'),235,8.2,12,normal,MUTED,2);
 paragraph(310,501,quote?'Completion: '+(d.completion||'As agreed'):'' ,235,8.1,11,normal,MUTED,1);
 text(34,466,quote?'PROPOSED SCOPE & PRICING':'SERVICES & CHARGES',10.4,bold,NAVY);
 text(W-34,466,'All values in AED',7.7,normal,MUTED,'right');
 let y=444; const headerHeight=27;
 function tableHead(){rect(34,y-headerHeight,527,headerHeight,NAVY);text(47,y-18,'#',8.1,bold,WHITE);text(74,y-18,'DESCRIPTION / SCOPE OF WORK',8.1,bold,WHITE);text(407,y-18,'QTY',8.1,bold,WHITE,'center');text(473,y-18,'RATE',8.1,bold,WHITE,'right');text(549,y-18,'AMOUNT',8.1,bold,WHITE,'right');y-=headerHeight}
 tableHead();
 for(let i=0;i<d.items.length;i++){
  const item=d.items[i];const detailLines=wrap(item.description||'',298,8.1,normal).slice(0,3);
  const titleLines=wrap(item.title||'',298,9.0,bold).slice(0,2);
  const height=Math.max(49,16+titleLines.length*12+detailLines.length*11);
  if(y-height<168){newPage();y=720;tableHead()}
  rect(34,y-height,527,height,i%2===0?WHITE:PALE);
  line(34,y-height,561,y-height,LINE,.6);
  text(48,y-15,String(i+1).padStart(2,'0'),8.3,bold,BLUE);
  titleLines.forEach((row,k)=>text(74,y-15-k*12,row,8.9,bold,NAVY));
  detailLines.forEach((row,k)=>text(74,y-16-titleLines.length*12-k*11,row,8.1,normal,MUTED));
  text(407,y-17,Number(item.qty),8.7,normal,INK,'center');text(473,y-17,fmt(item.rate),8.7,normal,INK,'right');text(549,y-17,fmt(Number(item.qty)*Number(item.rate)),9,bold,NAVY,'right');
  y-=height;
 }
 if(y<193){newPage();y=720;}
 const t=totals(d),advance=(Number(t.total)*Number(d.advance_percent??80)/100),remain=Number(t.total)-advance;
 const bottomY=Math.min(150,y-12);
 rect(34,bottomY-93,270,91,PALE);text(43,bottomY-19,'PAYMENT SCHEDULE',8.8,bold,NAVY);
 text(43,bottomY-39,`${Number(d.advance_percent??80)}%  Advance upon LPO`,8.8,bold,BLUE);
 text(43,bottomY-54,'AED '+fmt(advance),8.7,normal,MUTED);
 text(43,bottomY-73,`${100-Number(d.advance_percent??80)}%  Balance after completion`,8.6,bold,INK);
 text(43,bottomY-86,'AED '+fmt(remain),8.2,normal,MUTED);
 text(317,bottomY-15,'Subtotal',9,normal,MUTED);text(552,bottomY-15,fmt(t.subtotal),9,bold,NAVY,'right');
 text(317,bottomY-37,`VAT (${Number(d.tax_rate??5)}%)`,9,normal,MUTED);text(552,bottomY-37,fmt(t.vat),9,bold,NAVY,'right');
 rect(312,bottomY-79,249,30,NAVY);text(321,bottomY-69,'TOTAL (AED)',9.3,bold,WHITE);text(551,bottomY-69,fmt(t.total),15,bold,WHITE,'right');
 if(!quote){
  // A signable box in the existing gap between the services table and totals.
  // Keeping this above the payment totals retains the single-page invoice.
  rect(34,bottomY+3,527,37,WHITE,LINE,.8);
  text(45,bottomY+26,'AUTHORIZED COMPANY SIGNATURE',8.2,bold,BLUE);
  text(45,bottomY+12,'For Home Rescue Technical Services LLC',7,normal,MUTED);
  line(330,bottomY+11,548,bottomY+11,LINE,1);
 }
 // Bottom note removed: it collided with the fixed footer on both PDF types.
 if(quote){newPage();text(40,706,'STANDARD COMMERCIAL CONDITIONS',8,bold,BLUE);text(40,670,'TERMS & CONDITIONS',22,bold,NAVY);text(W-40,676,d.number,8.5,bold,BLUE,'right');text(40,646,'Applicable to the services and estimated charges in the attached quotation.',8.6,normal,MUTED);
  let ty=618;
  terms.forEach((row,i)=>{if(ty<157){newPage();ty=724}
   text(42,ty,String(i+1).padStart(2,'0'),8.5,bold,BLUE);text(78,ty,row[0],9,bold,NAVY);
   const ll=wrap(row[1],472,8.0,normal).slice(0,3);ll.forEach((v,k)=>text(78,ty-14-k*10,v,8.0,normal,INK));
   const used=14+10*ll.length+6;ty-=Math.max(38,used);line(42,ty+8,553,ty+8,LINE,.55)
  });
  if(ty<170){newPage();ty=700}
  text(42,ty-17,'AGREED PAYMENT STRUCTURE',8.6,bold,NAVY);
  text(42,ty-31,`${Number(d.advance_percent??80)}% advance / ${100-Number(d.advance_percent??80)}% on completion`,8.1,normal,BLUE);
  // Two signature areas required for approval: company and client.
  rect(42,80,245,73,WHITE,LINE,.8);
  rect(305,80,248,73,WHITE,LINE,.8);
  text(53,137,'AUTHORIZED COMPANY SIGNATURE',8.7,bold,BLUE);
  text(53,124,'Home Rescue Technical Services LLC',7.1,normal,MUTED);
  line(53,109,276,109,LINE,1);
  text(53,95,'Signature / Company Stamp',7.1,normal,MUTED);
  text(53,84,'Date: ___________________________',7.0,normal,MUTED);
  text(316,137,'CLIENT ACCEPTANCE',8.7,bold,BLUE);
  text(316,124,'Accepted by the client / representative',7.1,normal,MUTED);
  line(316,109,542,109,LINE,1);
  text(316,95,'Name / Signature',7.1,normal,MUTED);
  text(316,84,'Date: ___________________________',7.0,normal,MUTED);
 }
 footer();return await pdf.save();
}
