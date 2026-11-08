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
 [
  "Parties and contract documents.",
  "The supplier is the legal entity printed on the quotation and verified trade licence (trading as RESQHOME). The agreement comprises the signed quotation, itemised scope, agreed drawings/specifications, milestone schedule, approved variation orders and these terms."
 ],
 [
  "Scope and exclusions.",
  "Only the items, quantities, locations and materials expressly listed in the accepted quotation are included. Hidden defects, major system upgrades, structural works and unlisted services are outside the price until separately evaluated and approved."
 ],
 [
  "Free inspection and transparent pricing.",
  "The standard initial inspection advertised as free will not be charged. Any intrusive diagnosis, specialist tests or additional visits that attract a charge must be explained and approved in writing in advance. No unapproved or hidden charges will be added."
 ],
 [
  "Quotation validity and acceptance.",
  "The quotation is open until the stated validity date. Work begins after clear written or legally valid electronic acceptance and any necessary site permissions. A quote or appointment request alone does not authorise extra paid work."
 ],
 [
  "Permits, NOCs and legal scope.",
  "The parties will identify approvals required by Dubai Municipality, the building owner/manager, the applicable free-zone or development authority, DEWA or other regulators. RESQHOME will only perform works it is appropriately licensed and qualified to undertake; no work requiring approval begins before necessary approval."
 ],
 [
  "Customer access and site conditions.",
  "The client will provide lawful site access, an authorised contact, relevant existing-system information and safe access to water/electricity isolation points. The supplier will take reasonable precautions to protect adjacent property, occupants and work areas."
 ],
 [
  "Materials, brands and ownership.",
  "The quotation identifies supplied materials and their specifications where material. Substitutions require the customer's prior approval. Customer-supplied parts are identified separately; RESQHOME remains responsible for its own workmanship while manufacturer/product warranties depend on the actual supplier and applicable law."
 ],
 [
  "Timing and unforeseen conditions.",
  "Start and target completion dates are agreed estimates subject to access, approvals and identified site conditions. RESQHOME will promptly notify the customer of material delays and propose an updated schedule; delays do not remove statutory rights or permit unilateral price increases."
 ],
 [
  "Written variations.",
  "Before carrying out extra work, RESQHOME will explain the additional scope, itemised cost, applicable tax, time impact and any warranty implications. An authorised customer must approve the variation in a retrievable written/electronic record."
 ],
 [
  "Prices, VAT and payment methods.",
  "All prices are in AED and must clearly state VAT treatment. VAT will be charged and documented only where legally applicable and the supplier has the required registration. Accepted payment methods are cash, card and bank transfer; no credit-card surcharge will be added to the advertised price."
 ],
 [
  "Stage payments and final payment.",
  "For staged services, the quotation will show measurable completion milestones and payments linked to those stages. The final payment becomes due under the agreed schedule after completion of the relevant work and issue of the applicable invoice; any bona fide defect dispute will be addressed under law."
 ],
 [
  "Handover and service records.",
  "At completion, the parties may sign a job completion record identifying items delivered, test results, visible outstanding points, supplied parts and handover date. Signing acknowledges inspection/receipt, not a waiver of hidden defects, contractual warranties or statutory remedies."
 ],
 [
  "Workmanship and parts warranty.",
  "The service-specific warranty period and covered work are shown in the quotation or a separate warranty record. RESQHOME will remedy defects attributable to its service in a reasonable manner and period, consistent with its advertised quality guarantee and mandatory UAE consumer rights. Relevant product/manufacturer warranties will be passed through where applicable."
 ],
 [
  "Fair warranty exclusions.",
  "A warranty may exclude a clearly evidenced unrelated fault, normal wear, misuse or later unauthorised alterations, to the extent permitted by law. It does not exclude faulty workmanship, negligence, defective materials supplied by RESQHOME or any statutory remedy. The customer must receive clear warranty terms and complaint contacts."
 ],
 [
  "Cancellation and termination.",
  "Cancellation or termination requests should be given in writing. Charges/refunds will be itemised based on work completed, lawfully recoverable committed costs and any further compensation permitted under the applicable law and agreed contract. Deposits are not automatically forfeited, and the customer's mandatory rights remain intact."
 ],
 [
  "Safety, property damage and insurance.",
  "The supplier will follow applicable safety and technical rules and take reasonable care of the premises. No clause excludes liability for matters that cannot legally be excluded, including relevant consumer rights or legally attributable damage. Site-specific hazards must be reported before work starts."
 ],
 [
  "Complaints and dispute resolution.",
  "Report problems to the phone/email shown on the quotation, quoting the job number. RESQHOME will record the complaint, inspect as appropriate and propose a lawful remedy. Either party may use competent consumer authorities or courts; nothing here removes mandatory complaint or legal remedies."
 ],
 [
  "Personal data and photographs.",
  "Customer details and service photos are used only for legitimate service administration, warranty and legal recordkeeping, under applicable privacy law. Public advertising or portfolio use of identifiable people/private interiors requires separate appropriate permission. Records and approval messages will be securely maintained."
 ],
 [
  "Governing law and order of precedence.",
  "UAE law and applicable rules of the competent Emirate govern the work, subject to mandatory customer rights. If there is a conflict, governing law prevails; then approved variations, signed quotation/scope and these standard terms. An Arabic customer-facing version accompanies these English terms."
 ]
];
const invoiceTerms=[
 [
  "Payment Terms",
  "Payment shall be made in accordance with the agreed payment terms and the due date specified on this invoice."
 ],
 [
  "Approved Quotation",
  "This invoice is issued in accordance with the customer-approved quotation. All previously agreed terms and conditions remain applicable."
 ],
 [
  "Additional Charges",
  "Any additional work or charges must be approved by the customer before being carried out or applied."
 ],
 [
  "Warranty & Service",
  "Applicable workmanship and material warranties shall remain valid as specified in the approved quotation or warranty documentation, subject to UAE law."
 ],
 [
  "Customer Support",
  "For any payment queries, invoice discrepancies, or service-related concerns, please contact RESQHOME through our official contact channels."
 ]
];
const clean=s=>String(s??'').replace(/[\u2013\u2014]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2022\u00B7]/g,'-').replace(/[^\x20-\x7e]/g,' ');
const fmt=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const datef=d=>{try{return new Date(String(d).slice(0,10)+'T12:00:00Z').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})}catch{return String(d||'')}};
export async function pdfBytes(d,s){
 const pdf=await PDFDocument.create();pdf.setTitle(`RESQHOME ${d.type==='invoice'?'Invoice':'Quotation'} ${d.number}`);pdf.setAuthor('HOME RESCUE TECHNICAL SERVICES LLC');
 const normal=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const logoSerif=await pdf.embedFont(StandardFonts.TimesRomanBold);
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
  // Recreate the original navy-and-gold brand in native PDF vector graphics.
  // The icon and lettering stay razor-sharp at every zoom level and in print.
  const logoNavy=rgb(0.055,0.155,0.29), logoGold=rgb(0.84,0.61,0.15);
  // Fixed PDF coordinates keep the icon within x=40..76 and y=H-91..H-55.
  // Do not use drawSvgPath here: its SVG transform caused the logo to drop
  // into the business details at the top of the invoice/quotation.
  rect(40,H-91,36,36,logoGold);
  rect(42.6,H-88.4,30.8,30.8,logoNavy);
  text(49.8,H-81.5,'H',25,bold,logoGold);
  text(85,H-60,'HOME RESCUE',18.7,logoSerif,logoNavy);
  text(85,H-77,'T E C H N I C A L   S E R V I C E S',6.35,bold,logoGold);
  text(42,H-103,clean(s.legal_name||''),7.5,bold,MUTED);
  text(42,H-114,'COMMERCIAL LICENSE NO. '+clean(s.license_number||''),7.4,normal,MUTED);
  // Required document heading and supplied tax-registration number.
  text(W-40,H-43,d.type==='invoice'?'tax invoice':'quotation',12,bold,INK,'right');
  text(W-40,H-58,'TR NO : '+clean(s.tax_registration_number||'104570745000003'),8.4,normal,INK,'right');
  text(W-40,H-74,clean(s.location||'Dubai, United Arab Emirates'),8,bold,INK,'right');
  text(W-40,H-86,clean(s.phone||''),8,normal,MUTED,'right');
  text(W-40,H-98,clean(s.email||''),8,normal,MUTED,'right');
  text(W-40,H-110,clean(s.website||''),8,normal,MUTED,'right');
  line(40,H-120,W-40,H-120,LINE,.8)
 }
 function footer(){line(40,66,W-40,66,LINE,.8);text(40,45,`HOME RESCUE    |    Commercial License ${clean(s.license_number||'')}`,7.5,bold,MUTED);text(W-40,45,`${clean(d.number)}    -    ${pdf.getPageCount()}`,7.4,normal,MUTED,'right')}
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
  const height=Math.max(44,15+titleLines.length*11+detailLines.length*10);
  if(y-height<(i===d.items.length-1?(quote?202:230):168)){newPage();y=694;tableHead()}
  rect(34,y-height,527,height,i%2===0?WHITE:PALE);
  line(34,y-height,561,y-height,LINE,.6);
  text(48,y-15,String(i+1).padStart(2,'0'),8.3,bold,BLUE);
  titleLines.forEach((row,k)=>text(74,y-15-k*11,row,8.9,bold,NAVY));
  detailLines.forEach((row,k)=>text(74,y-16-titleLines.length*11-k*10,row,8.1,normal,MUTED));
  text(407,y-17,Number(item.qty),8.7,normal,INK,'center');text(473,y-17,fmt(item.rate),8.7,normal,INK,'right');text(549,y-17,fmt(Number(item.qty)*Number(item.rate)),9,bold,NAVY,'right');
  y-=height;
 }
 // Keep payment breakdown directly beneath the last service; reserve space above the footer.
 if(y<(quote?202:230)){newPage();y=435;}
 const t=totals(d),advance=(Number(t.total)*Number(d.advance_percent??80)/100),remain=Number(t.total)-advance;
 const blockGap=quote?Math.max(12,Math.min(130,(y-190)*0.70)):Math.max(12,Math.min(90,(y-230)*0.62));
 const bottomY=y-blockGap;
 rect(34,bottomY-93,270,91,PALE);text(43,bottomY-19,'PAYMENT SCHEDULE',8.8,bold,NAVY);
 text(43,bottomY-39,`${Number(d.advance_percent??80)}%  Advance upon LPO`,8.8,bold,BLUE);
 text(43,bottomY-54,'AED '+fmt(advance),8.7,normal,MUTED);
 text(43,bottomY-73,`${100-Number(d.advance_percent??80)}%  Balance after completion`,8.6,bold,INK);
 text(43,bottomY-86,'AED '+fmt(remain),8.2,normal,MUTED);
 text(317,bottomY-15,'Subtotal',9,normal,MUTED);text(552,bottomY-15,fmt(t.subtotal),9,bold,NAVY,'right');
 text(317,bottomY-37,`VAT (${Number(d.tax_rate??5)}%)`,9,normal,MUTED);text(552,bottomY-37,fmt(t.vat),9,bold,NAVY,'right');
 rect(312,bottomY-79,249,30,NAVY);text(321,bottomY-69,'TOTAL (AED)',9.3,bold,WHITE);text(551,bottomY-69,fmt(t.total),15,bold,WHITE,'right');

 // Bottom note removed: it collided with the fixed footer on both PDF types.

 if(quote){
  const intro='To be provided before acceptance; the quotation/service-specific schedule controls the scope and price. Clauses are subject to mandatory UAE law.';
  const italic=await pdf.embedFont(StandardFonts.HelveticaOblique);
  const colXs=[42,307],colW=246,top=612,bottom=197;
  function drawLegalHeading(continuation=false){
   text(40,706,'RESQHOME   /   COMMERCIAL CONDITIONS',8,bold,BLUE);
   text(40,670,continuation?'TERMS & CONDITIONS  (CONTINUED)':'TERMS & CONDITIONS',20,bold,NAVY);
   text(W-40,678,d.number,8.3,bold,BLUE,'right');
   if(!continuation){
    const introLines=wrap(intro,512,7.6,italic).slice(0,3);
    introLines.forEach((row,k)=>text(41,649-k*10.5,row,7.6,italic,BLUE));
   }
   line(40,625,W-40,625,LINE,.8);
  }
  function legalRows(index,size){
   const words=[];
   const heading=String(index+1).padStart(2,'0')+'  '+terms[index][0];
   for(const token of clean(heading).split(/\s+/))words.push({word:token,font:bold,color:NAVY});
   for(const token of clean(terms[index][1]).split(/\s+/))words.push({word:token,font:normal,color:INK});
   const rows=[];let row=[],w=0;
   for(const item of words){
    const wordWidth=item.font.widthOfTextAtSize(item.word,size);
    const trailing=item.font.widthOfTextAtSize(' ',size);
    if(row.length&&w+wordWidth>colW){rows.push(row);row=[];w=0;}
    row.push({word:item.word,font:item.font,color:item.color,x:w});
    w+=wordWidth+trailing;
   }
   if(row.length)rows.push(row);
   return rows;
  }
  function planLegal(size){
   const leading=size*1.30,gap=5.0;
   const plan=[];let col=0,y=top,pageIndex=0;
   for(let i=0;i<terms.length;i++){
    const rows=legalRows(i,size),block=rows.length*leading+gap;
    if(y-block<bottom){
     col++;y=top;
     if(col>1){col=0;pageIndex++;}
    }
    plan.push({i,rows,x:colXs[col],y,pageIndex,leading,block});
    y-=block;
   }
   return {plan,pages:pageIndex+1,endY:y,size};
  }
  let selected;
  for(const size of [7.65,7.4,7.2,7.0,6.85,6.7]){
   const trial=planLegal(size);
   if(trial.pages===1){selected=trial;break;}
  }
  if(!selected)selected=planLegal(7.0);
  newPage();
  drawLegalHeading();
  let currentTermsPage=0;
  for(const entry of selected.plan){
   while(entry.pageIndex>currentTermsPage){newPage();currentTermsPage++;drawLegalHeading(true);}
   entry.rows.forEach((row,k)=>row.forEach(piece=>{
    text(entry.x+piece.x,entry.y-k*entry.leading,piece.word,selected.size,piece.font,piece.color);
   }));
  }
  text(42,171,'AGREED PAYMENT STRUCTURE',8.2,bold,NAVY);
  text(228,171,(Number(d.advance_percent??80))+'% advance / '+(100-Number(d.advance_percent??80))+'% on completion',8.0,normal,BLUE);
  rect(42,80,245,72,WHITE,LINE,.8);
  rect(305,80,248,72,WHITE,LINE,.8);
  text(53,137,'AUTHORIZED COMPANY SIGNATURE',8.5,bold,BLUE);
  text(53,124,'Home Rescue Technical Services LLC',7,normal,MUTED);
  line(53,108,276,108,LINE,1);
  text(53,94,'Signature / Company Stamp',7,normal,MUTED);
  text(53,84,'Date: ___________________________',7,normal,MUTED);
  text(316,137,'CLIENT ACCEPTANCE',8.5,bold,BLUE);
  text(316,124,'Accepted by the client / representative',7,normal,MUTED);
  line(316,108,542,108,LINE,1);
  text(316,94,'Name / Signature',7,normal,MUTED);
  text(316,84,'Date: ___________________________',7,normal,MUTED);
 } else {
  // Invoice-specific legal page. Quotation's 19 clauses and acceptance page are untouched.
  newPage();
  text(40,706,'RESQHOME / INVOICE CONDITIONS',8,bold,BLUE);
  text(40,670,'TERMS & CONDITIONS',22,bold,NAVY);
  text(W-40,676,d.number,8.5,bold,BLUE,'right');
  text(40,646,'The following conditions apply to this invoice and the approved quotation.',8.0,normal,MUTED);
  let ty=615;
  invoiceTerms.forEach((row,i)=>{
   text(42,ty,String(i+1)+'.',7.8,bold,BLUE);
   text(58,ty,row[0],8.2,bold,NAVY);
   const ll=wrap(row[1],490,7.4,normal).slice(0,4);
   ll.forEach((v,k)=>text(58,ty-12-k*9.2,v,7.4,normal,INK));
   const used=14+9.2*ll.length+8;
   ty-=Math.max(34,used);
   line(42,ty+7,553,ty+7,LINE,.55);
  });
  // Signature and bank instructions follow the five invoice conditions.
  rect(42,335,511,45,WHITE,LINE,.8);
  text(53,363,'AUTHORIZED COMPANY SIGNATURE',8.3,bold,BLUE);
  text(53,347,'For Home Rescue Technical Services LLC',7.2,normal,MUTED);
  line(300,348,540,348,LINE,1);
  rect(42,105,511,205,PALE,LINE,.8);
  text(55,289,'MAKE PAYABLE TO:',9.3,bold,NAVY);
  text(55,270,'HOME RESCUE TECHNICAL SERVICES LLC',8.8,bold,INK);
  const bankRows=[
   ['Bank Name','RAK BANK'],
   ['Bank Branch','AL QUOZ, DUBAI'],
   ['Account Number','0553196914001'],
   ['IBAN','AE110400000553196914001'],
   ['Swift Code','NRAKAEAK']
  ];
  bankRows.forEach((entry,i)=>{
   const by=242-i*27;
   text(55,by,entry[0]+':',8.7,normal,INK);
   text(220,by,entry[1],8.7,i===3?bold:normal,NAVY);
  });
 }
 footer();return await pdf.save();
}
