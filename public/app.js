const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const round2=n=>Math.round((Number(n)||0)*100)/100;
const money=n=>Number(n||0).toLocaleString('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});
const qty=n=>Number(n||0);
const today=()=>new Date().toLocaleDateString('en-CA');
const days=(d,n)=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return x.toLocaleDateString('en-CA');};
const formatDate=s=>{try{return new Date(s+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}catch{return s}};
const state={page:'overview',data:{documents:[],clients:[],settings:{},services:[],expenses:[],payments:[]},edit:null,editId:null,currentView:null,filter:'all',search:'',customerEdit:null,expenseInvoiceId:null,expensePeriod:'all',expenseProfitFilter:'all',expenseSearch:''};
const nav=[['overview','▦','Dashboard'],['documents','▤','All Documents'],['quotations','▧','Quotations'],['invoices','▥','Invoices'],['profit_dashboard','📈','Expenses & Profit'],['clients','♙','Clients'],['settings','⚙','Settings & Backups']];
async function api(path,opts={}){const r=await fetch(path,{cache:'no-store',credentials:'same-origin',...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});const text=await r.text();let obj;try{obj=JSON.parse(text)}catch{obj={detail:text}}if(!r.ok)throw new Error(typeof obj.detail==='string'?obj.detail:JSON.stringify(obj.detail||obj));return obj}
let activePreviewUrl=null;
function clearPreviewUrl(){if(activePreviewUrl){URL.revokeObjectURL(activePreviewUrl);activePreviewUrl=null}}
async function downloadFile(url,fallbackName='document.pdf'){
 try{
  const res=await fetch(url,{credentials:'same-origin',cache:'no-store'});
  if(!res.ok){
   const txt=await res.text();let msg=txt;
   try{const obj=JSON.parse(txt);msg=obj.detail||txt;}catch{}
   throw new Error(msg||'Download failed ('+res.status+')');
  }
  const blob=await res.blob();
  const cd=res.headers.get('Content-Disposition')||'';
  const m=cd.match(/filename="([^"]+)"/i);
  const filename=(m&&m[1])||fallbackName;
  const objUrl=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=objUrl;a.download=filename;a.style.display='none';
  document.body.appendChild(a);a.click();
  setTimeout(()=>{a.remove();URL.revokeObjectURL(objUrl);},10000);
 }catch(e){toast(e.message||'Could not download file',true)}
}
function toast(msg,isError=false){const prior=$('.toast');if(prior)prior.remove();const n=document.createElement('div');n.className='toast';n.textContent=(isError?'⚠  ':'✓  ')+msg;document.body.appendChild(n);setTimeout(()=>n.remove(),3900)}
async function refresh(){state.data=await api('/api/bootstrap')}
async function driveApi(path,body={}){
 const token=window.__resqhomeDrive?.getAccessToken?.();
 if(!token)return null;
 const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(body)});
 const text=await r.text();let obj;try{obj=JSON.parse(text)}catch{obj={detail:text}}
 if(r.status===401){window.__resqhomeDrive?.clearToken?.(obj.detail||'Google Drive session expired. Please reconnect in Settings.');}
 if(!r.ok)throw new Error(typeof obj.detail==='string'?obj.detail:JSON.stringify(obj.detail||obj));
 return obj;
}
function autoSyncDriveDoc(doc){if(!doc?.id||!window.__resqhomeDrive?.getAccessToken?.())return;driveApi('/api/drive/sync-doc',{id:doc.id}).catch(err=>toast('Google Drive sync failed: '+err.message,true))}
function autoSyncDriveExpense(invoiceId){if(!invoiceId||!window.__resqhomeDrive?.getAccessToken?.())return;driveApi('/api/drive/sync-expense',{invoice_id:invoiceId}).catch(err=>toast('Google Drive expense sync failed: '+err.message,true))}
function autoSyncDriveCompany(){if(!window.__resqhomeDrive?.getAccessToken?.())return;driveApi('/api/drive/sync-company',{}).catch(err=>toast('Google Drive report sync failed: '+err.message,true))}
function gsiButtonMarkup(label='Sign in with Google'){return `<button type="button" id="gdriveSignIn" class="gsi-material-button"><div class="gsi-material-button-state"></div><div class="gsi-material-button-content-wrapper"><div class="gsi-material-button-icon"><svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style="display:block"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg></div><span class="gsi-material-button-contents">${esc(label)}</span><span style="display:none">${esc(label)}</span></div></button>`}

const SpeechAPI=typeof window!=='undefined'&&(window.SpeechRecognition||window.webkitSpeechRecognition);
let activeSpeech=null;
function tidyText(v){return String(v||'').replace(/[ \t]{2,}/g,' ').replace(/\s+([,.!?;:])/g,'$1').replace(/([,.!?;:])([^\s\n])/g,'$1 $2').replace(/(^|[.!?]\s+|\n)([a-z])/g,(all,sep,c)=>sep+c.toUpperCase()).trim()}
function voiceControl(id){return SpeechAPI?'<button type="button" class="voice-btn" data-voice="'+id+'" title="Dictate into field" aria-label="Voice dictation">🎤</button>':''}
function wireSmart(){
 document.querySelectorAll('[data-voice]').forEach(btn=>btn.onclick=()=>{
  const field=document.getElementById(btn.dataset.voice);
  if(!field)return;
  if(!SpeechAPI){field.focus();toast('Browser speech recognition is unavailable. Use the microphone key on your phone keyboard.',true);return}
  if(!window.isSecureContext){toast('Voice input requires HTTPS. Open the secure Office URL.',true);return}
  if(activeSpeech){try{activeSpeech.abort()}catch{}activeSpeech=null}
  const r=new SpeechAPI();activeSpeech=r;
  r.lang='en-US';r.interimResults=false;r.maxAlternatives=1;r.continuous=false;
  // Start inside the original click event; waiting for permissions or language checks
  // can lose browser user activation and break speech recognition.
  btn.classList.add('listening');btn.setAttribute('aria-pressed','true');
  let found=false;
  const finish=()=>{btn.classList.remove('listening');btn.setAttribute('aria-pressed','false');if(activeSpeech===r)activeSpeech=null};
  r.onresult=event=>{
   found=true;
   const heard=Array.from(event.results).map(x=>x[0]?.transcript||'').join(' ')
    .replace(/\bcomma\b/gi,',').replace(/\b(full stop|period)\b/gi,'.')
    .replace(/\bquestion mark\b/gi,'?').replace(/\bnew line\b/gi,'\n');
   field.value=tidyText((field.value?field.value+' ':'')+heard);
   field.dispatchEvent(new Event('input',{bubbles:true}));
  };
  r.onend=()=>{finish();if(!found && !r._reportedError)toast('No words captured. Tap the mic, then speak clearly.',true)};
  r.onerror=event=>{
   r._reportedError=true;finish();
   const hints={
    'not-allowed':'Microphone permission is denied. Allow it in your browser site settings, then retry.',
    'service-not-allowed':'This browser blocks speech recognition. Try Chrome or Edge, or use the keyboard mic.',
    'audio-capture':'No microphone detected. Check the device input and browser permission.',
    'network':'Speech service connection failed. Browser speech may be unavailable on this network; use the keyboard microphone.',
    'no-speech':'No speech detected. Tap the microphone and speak clearly.',
    'language-not-supported':'English voice recognition is unavailable in this browser.',
    'aborted':null
   };
   const msg=Object.prototype.hasOwnProperty.call(hints,event.error)?hints[event.error]:'Speech input error ('+(event.error||'unknown')+'). Try your keyboard microphone.';
   if(msg)toast(msg,true);
  };
  try{r.start()}catch(e){r._reportedError=true;finish();toast('Could not start microphone: '+(e?.message||'Try the keyboard microphone.'),true)}
 });
 document.querySelectorAll('input[type="text"],textarea').forEach(field=>{
  field.setAttribute('spellcheck','true');field.setAttribute('autocorrect','on');field.setAttribute('autocapitalize','sentences');
  if(!field.dataset.smart){field.dataset.smart='1';field.addEventListener('blur',()=>{const v=tidyText(field.value);if(v!==field.value){field.value=v;field.dispatchEvent(new Event('input',{bubbles:true}))}})}
 });
}

function sidebar(){return `<aside class="sidebar"><div class="brand"><div class="brand-logo">RESQ<span>HOME</span></div><div class="brand-sub">OFFICE SUITE</div></div><nav class="nav-section"><div class="nav-caption">Workspace</div>${nav.map(([p,ic,title])=>`<a href="#${p}" data-nav="${p}" class="nav-link ${state.page===p?'active':''}"><span class="icon">${ic}</span><span>${title}</span></a>`).join('')}</nav><div class="sidebar-bottom"><strong>RESQHOME • Dubai, UAE</strong><br>Secure cloud workspace<br>Private Vercel storage<a class="side-link" href="https://www.resqhome.ae/" target="_blank" rel="noopener">↗ Visit company website</a></div></aside>`}
const titles={overview:'Dashboard',documents:'Documents',quotations:'Quotations',invoices:'Invoices',profit_dashboard:'Profit Dashboard',expense_tracker:'Invoice Expense Tracker',clients:'Client Records',settings:'Company Settings',editor:'Document Builder',preview:'Document Preview'};

function mobileNav(){
  const tabs=[['overview','⌂','Home'],['invoices','▥','Invoices'],['profit_dashboard','📈','Profit'],['quotations','▧','Quotes']];
  const buttons=tabs.map(([id,icon,label])=>'<button type="button" class="mobile-tab '+(state.page===id?'active':'')+'" data-nav="'+id+'" aria-label="'+label+'"><span class="mobile-tab-icon" aria-hidden="true">'+icon+'</span><span>'+label+'</span></button>').join('');
  const menuItems=nav.map(([id,icon,label])=>'<button type="button" class="mobile-sheet-link '+(state.page===id?'active':'')+'" data-nav="'+id+'"><span aria-hidden="true">'+icon+'</span>'+label+'</button>').join('');
  const menu='<div id="mobileOverlay" class="mobile-overlay" hidden><div class="mobile-sheet" role="dialog" aria-modal="true" aria-label="Office menu"><div class="mobile-sheet-head"><div><strong>RESQHOME Office</strong><small>Quick actions & navigation</small></div><button type="button" class="mobile-close" data-mobile-close aria-label="Close menu">×</button></div><div class="mobile-sheet-actions"><button type="button" class="btn" data-new="invoice">＋ New Invoice</button><button type="button" class="btn secondary" data-new="quotation">＋ New Quotation</button></div><div class="mobile-sheet-links">'+menuItems+'</div></div></div>';
  const save=state.page==='editor'?'<div class="mobile-savebar"><span>Total <strong id="mobileTotal">AED 0.00</strong></span><button type="button" class="btn" data-mobile-save>✓ Save '+(state.edit?.type==='quotation'?'Quotation':'Invoice')+'</button></div>':'';
  return '<nav class="mobile-bottom-nav" aria-label="Mobile navigation">'+buttons+'<button type="button" class="mobile-tab" data-mobile-menu aria-label="Open menu"><span class="mobile-tab-icon" aria-hidden="true">☰</span><span>More</span></button></nav>'+menu+save;
}
function closeMobileMenu(){const el=document.querySelector('#mobileOverlay');if(el)el.hidden=true;document.body.classList.remove('mobile-menu-open')}
function openMobileMenu(){const el=document.querySelector('#mobileOverlay');if(el){el.hidden=false;document.body.classList.add('mobile-menu-open');const close=el.querySelector('[data-mobile-close]');if(close)close.focus()}}
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMobileMenu()});

function layout(inner){$('#app').innerHTML=`<div class="app-shell">${sidebar()}<main class="workspace"><header class="topbar"><div><div class="topbar-kicker">RESQHOME / OFFICE</div><div class="topbar-title">${titles[state.page]||'Workspace'}</div></div><div class="topbar-actions"><span class="today-label">${new Date().toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}</span><button type="button" class="btn mobile-create-btn" data-mobile-menu>＋ New</button><button class="btn secondary" data-new="quotation">＋ New Quotation</button><button class="btn" data-new="invoice">＋ New Invoice</button></div></header><div class="page-content">${inner}</div></main>${mobileNav()}</div>`;wireCommon();wireSmart()}
function wireCommon(){document.querySelectorAll('[data-nav]').forEach(x=>x.onclick=e=>{e.preventDefault();closeMobileMenu();navigate(x.dataset.nav)});document.querySelectorAll('[data-new]').forEach(x=>x.onclick=()=>{closeMobileMenu();newDocument(x.dataset.new)});document.querySelectorAll('[data-mobile-menu]').forEach(x=>x.onclick=openMobileMenu);document.querySelectorAll('[data-mobile-close]').forEach(x=>x.onclick=closeMobileMenu);const overlay=$('#mobileOverlay');if(overlay)overlay.onclick=e=>{if(e.target===overlay)closeMobileMenu()};document.querySelectorAll('[data-mobile-save]').forEach(x=>x.onclick=()=>$('#saveDoc')?.click());document.querySelectorAll('[data-download-url]').forEach(x=>x.onclick=e=>{e.preventDefault();downloadFile(x.dataset.downloadUrl,x.dataset.downloadName||'export')})}
function navigate(page){clearPreviewUrl();state.page=page;state.edit=null;state.currentView=null;if(page==='documents'||page==='quotations'||page==='invoices')state.filter=page==='documents'?'all':page==='quotations'?'quotation':'invoice';render();window.scrollTo(0,0)}
function heading(kicker,title,sub,buttons=''){return `<div class="page-head"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p class="lede">${sub}</p></div><div class="button-row">${buttons}</div></div>`}
function cardEmpty(title,sub,action=''){return `<div class="no-records"><div class="empty-illustration">▣</div><h3>${title}</h3><p>${sub}</p>${action}</div>`}
function status(s){return `<span class="status ${esc(s||'draft')}">${esc(s||'draft')}</span>`}
function table(docs){return `<div class="table-scroll"><table class="doc-table"><thead><tr><th>Document</th><th>Client / Project</th><th>Issued</th><th>Amount (AED)</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead><tbody>${docs.map(d=>`<tr><td><div class="doc-code" data-view="${esc(d.id)}">${esc(d.number)}</div><div class="doc-type">${d.type}</div></td><td><div class="doc-client">${esc(d.client_name)}</div><div class="hint">${esc(d.project_title||'General services')}</div></td><td>${esc(formatDate(d.issue_date))}</td><td><strong style="color:var(--navy)">${money(d.total)}</strong></td><td>${status(d.status)}</td><td style="text-align:right;white-space:nowrap"><button class="btn tiny secondary" data-view="${esc(d.id)}">View</button> ${d.type==='invoice'?`<button class="btn tiny secondary" data-track-expense="${esc(d.id)}" title="Track Expenses">📊 Expenses</button>`:''} <button class="icon-button" title="Edit" data-edit="${esc(d.id)}">✎</button> <button class="icon-button" title="Open PDF" data-pdf="${esc(d.id)}">⇩</button> <button class="icon-button" title="Delete" data-delete-doc="${esc(d.id)}">🗑</button></td></tr>`).join('')}</tbody></table></div>`}
function wireTables(){document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>viewDoc(el.dataset.view));document.querySelectorAll('[data-edit]').forEach(el=>el.onclick=()=>editDocument(el.dataset.edit));document.querySelectorAll('[data-pdf]').forEach(el=>el.onclick=()=>{const d=state.data.documents.find(x=>x.id===el.dataset.pdf);downloadFile('/api/documents/'+el.dataset.pdf+'/pdf?download=1',(d?.number||'document')+'.pdf')});document.querySelectorAll('[data-track-expense]').forEach(el=>el.onclick=()=>openExpenseTracker(el.dataset.trackExpense));document.querySelectorAll('[data-delete-doc]').forEach(el=>el.onclick=async()=>{const d=state.data.documents.find(x=>x.id===el.dataset.deleteDoc);if(!d||!confirm('Permanently delete '+d.number+'? Its number will NOT be reused.'))return;try{await api('/api/documents/'+d.id,{method:'DELETE'});await refresh();render();toast('Document deleted')}catch(e){toast(e.message,true)}})}
function renderOverview(){const docs=state.data.documents;const invoices=docs.filter(d=>d.type==='invoice'),quotes=docs.filter(d=>d.type==='quotation');const total=invoices.filter(d=>d.status!=='cancelled').reduce((a,b)=>a+Number(b.total),0);layout(`${heading('OFFICE OVERVIEW','A smarter way to run RESQHOME.','Create consistent business documents, track your client history and manage every AED with confidence.')}<div class="hero-card"><div><div class="eyebrow">Executive Blue document system</div><h2>Professional documents. One organized workspace.</h2><p>Your approved invoice layout is preserved without Terms & Conditions; quotations include commercial terms and client acceptance.</p></div><button class="btn" data-new="quotation">＋ Create a quotation</button></div><div class="stats"><div class="card metric"><div class="metric-name">Total documents</div><div class="metric-value">${docs.length}</div><div class="metric-foot">Saved in private cloud storage</div></div><div class="card metric"><div class="metric-name">Quotations</div><div class="metric-value">${quotes.length}</div><div class="metric-foot">Drafts and proposals</div></div><div class="card metric"><div class="metric-name">Invoices</div><div class="metric-value">${invoices.length}</div><div class="metric-foot">All statuses included</div></div><div class="card metric"><div class="metric-name">Invoice value</div><div class="metric-value"><small>AED</small>${money(total)}</div><div class="metric-foot">Excludes cancelled invoices; not cash received</div></div></div><div class="grid-2"><section class="card section-card"><div class="section-top"><h3>Recent documents</h3><span class="text-link" data-nav="documents">View all →</span></div>${docs.length?table(docs.slice(0,6)):cardEmpty('No documents yet','Create your first quotation or invoice to start your secure document record.','<button class="btn" data-new="invoice">＋ New invoice</button>')}</section><section class="card section-card"><div class="section-top"><h3>Quick actions</h3></div><div class="quick-line"><div class="quick-bubble">▧</div><div class="quick-body"><div class="quick-title">New quotation</div><div class="quick-sub">Proposal + terms + client acceptance</div></div><button class="btn tiny secondary" data-new="quotation">Create →</button></div><div class="quick-line"><div class="quick-bubble">▤</div><div class="quick-body"><div class="quick-title">New invoice</div><div class="quick-sub">Approved 1-page design • no terms</div></div><button class="btn tiny secondary" data-new="invoice">Create →</button></div><div class="quick-line"><div class="quick-bubble">♙</div><div class="quick-body"><div class="quick-title">Client directory</div><div class="quick-sub">Reuse customer details faster</div></div><button class="btn tiny secondary" data-nav="clients">Open →</button></div><div class="quick-line"><div class="quick-bubble">⇩</div><div class="quick-body"><div class="quick-title">Backup records</div><div class="quick-sub">Download every saved document as JSON</div></div><a class="btn tiny secondary" href="/api/backup" data-download-url="/api/backup" data-download-name="resqhome-backup-${today()}.json">Export →</a></div><div class="info-pill" style="margin-top:18px"><b>Storage:</b> Records are saved to private Vercel Blob storage and accessible across devices after login. Download regular JSON backups for additional protection.</div></section></div>`);wireTables();wireCommon()}
function renderDocuments(){const docs=state.data.documents;layout(`${heading('DOCUMENT REGISTER',state.page==='invoices'?'Invoices':state.page==='quotations'?'Quotations':'All documents','Search, edit, preview and export every saved business document.',`<a class="btn secondary" href="/api/export/csv" data-download-url="/api/export/csv" data-download-name="resqhome-records.csv">⇩ Export CSV</a>`)}<div class="filter-bar"><div class="search">⌕ <input id="searchInput" placeholder="Search number, customer, project..." value="${esc(state.search)}"></div><select class="select" id="filterType"><option value="all" ${state.filter==='all'?'selected':''}>All types</option><option value="quotation" ${state.filter==='quotation'?'selected':''}>Quotations</option><option value="invoice" ${state.filter==='invoice'?'selected':''}>Invoices</option></select><select class="select" id="filterStatus"><option value="all">Any status</option>${['draft','sent','accepted','rejected','expired','partial','paid','cancelled'].map(x=>`<option value="${x}">${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select><span class="badge" id="docCount"></span></div><div class="card section-card" id="docList"></div>`);$('#searchInput').oninput=e=>{state.search=e.target.value;updateDocs()};$('#filterType').onchange=e=>{state.filter=e.target.value;updateDocs()};$('#filterStatus').onchange=updateDocs;updateDocs()}
function updateDocs(){let docs=state.data.documents.filter(d=>state.filter==='all'||d.type===state.filter);const s=$('#filterStatus')?.value||'all';if(s!=='all')docs=docs.filter(d=>d.status===s);const q=(state.search||'').toLowerCase();if(q)docs=docs.filter(d=>[d.number,d.client_name,d.project_title,d.project_location].join(' ').toLowerCase().includes(q));$('#docCount').textContent=docs.length+' results';$('#docList').innerHTML=docs.length?table(docs):cardEmpty('No matching documents','Try another search or create a new document.');wireTables()}
const defaultInvoiceBank={"bank_payable_to":"HOME RESCUE TECHNICAL SERVICES L.L.C","bank_name":"","bank_branch":"","bank_account_number":"","bank_iban":"AE730860000009657476381","bank_swift_code":"WIOBAEADXXX","bank_address":"Etihad Airways Centre 5th Floor, Abu Dhabi, UAE"};
function defaultDoc(type){const s=state.data.settings;return {type,status:'draft',issue_date:today(),valid_until:days(today(),Number(s.quotation_valid_days||30)),client_name:'',client_phone:'',client_email:'',client_address:'',project_title:'',project_location:'Dubai, UAE',completion:'3 days after first payment / LPO',tax_rate:Number(s.tax_rate??5),advance_percent:Number(s.advance_percent??80),items:[{title:'',description:'',qty:1,rate:0}],notes:'',...(type==='invoice'?{...defaultInvoiceBank}:{})}}
function newDocument(type){state.edit=defaultDoc(type);state.editId=null;state.page='editor';render()}
function editDocument(id){const d=state.data.documents.find(d=>d.id===id);if(!d){toast('Document not found',true);return}state.edit=JSON.parse(JSON.stringify(d));if(d.type==='invoice'){for(const key of ["bank_payable_to","bank_name","bank_branch","bank_account_number","bank_iban","bank_swift_code","bank_address"])if(state.edit[key]===undefined)state.edit[key]=String(defaultInvoiceBank[key]??'')}state.editId=id;state.page='editor';render()}
function exampleDocument(){state.edit={...state.edit,client_name:'Alex Morgan',client_address:'Villa 18, Example Gardens\nDubai, UAE',project_title:'Residential Maintenance Visit',project_location:'Dubai, UAE',items:[{title:'AC Preventive Maintenance',description:'Inspection, filter cleaning and operational checks for two indoor AC units.',qty:2,rate:250},{title:'Kitchen Sink Leak Rectification',description:'Repair and reseal leaking waste connection, including final functional testing.',qty:1,rate:180},{title:'Interior Wall Painting',description:'Surface preparation, minor filling and two finishing coats to bedroom wall.',qty:1,rate:650},{title:'LED Light Fixture Installation',description:'Mount, connect and test client-supplied fittings at existing points.',qty:4,rate:75}]};render();toast('Sample details loaded — edit before saving')}
function f(label,key,value='',type='text',extra=''){
 const id='f_'+key;const isText=type==='text'||type==='textarea';
 const control=type==='textarea'?'<textarea id="'+id+'" data-field="'+key+'" '+extra+'>'+esc(value)+'</textarea>':'<input id="'+id+'" data-field="'+key+'" type="'+type+'" value="'+esc(value)+'" '+extra+'>';
 return '<div class="field"><label for="'+id+'">'+label+'</label><div class="smart-control">'+control+(isText?voiceControl(id):'')+'</div></div>'
}
function selectF(label,key,value,options){return '<div class="field"><label for="f_'+key+'">'+label+'</label><select id="f_'+key+'" data-field="'+key+'">'+options.map(o=>'<option value="'+o+'" '+(value===o?'selected':'')+'>'+o[0].toUpperCase()+o.slice(1)+'</option>').join('')+'</select></div>'}
function lineCard(item,i){const title='lineTitle'+i,description='lineDesc'+i;return '<div class="line-card" data-index="'+i+'"><div class="line-top"><strong>Item '+String(i+1).padStart(2,'0')+'</strong><button class="btn tiny danger" data-remove-item="'+i+'">Remove</button></div><div class="form-grid"><div class="field full"><label>Service / Item name</label><div class="smart-control"><input id="'+title+'" data-item="'+i+'" data-key="title" value="'+esc(item.title)+'" placeholder="e.g. AC Preventive Maintenance" required>'+voiceControl(title)+'</div></div><div class="field full"><label>Professional scope of work / description</label><div class="smart-control"><textarea id="'+description+'" data-item="'+i+'" data-key="description" rows="2" placeholder="Detailed scope, inclusions and measurements">'+esc(item.description)+'</textarea>'+voiceControl(description)+'</div></div><div class="line-row"><div class="field"><label>Quantity</label><input data-item="'+i+'" data-key="qty" type="number" min=".01" step="any" value="'+esc(item.qty)+'"></div><div class="field"><label>Rate (AED)</label><input data-item="'+i+'" data-key="rate" type="number" min="0" step=".01" value="'+esc(item.rate)+'"></div><div class="line-amount" id="rowAmt_'+i+'">AED '+money(qty(item.qty)*qty(item.rate))+'</div></div></div></div>'}
function totals(){const sub=round2(state.edit.items.reduce((a,i)=>a+qty(i.qty)*qty(i.rate),0)),tax=round2(sub*qty(state.edit.tax_rate)/100),t=round2(sub+tax);return {sub,tax,total:t,adv:round2(t*qty(state.edit.advance_percent)/100)}}
function editorHTML(){const d=state.edit,creating=!state.editId;const clientList=state.data.clients;return `${heading(creating?'CREATE DOCUMENT':'EDIT DOCUMENT',creating?`New ${d.type==='invoice'?'Invoice':'Quotation'}`:esc(d.number),d.type==='invoice'?'Approved Executive Blue invoice: no Terms & Conditions page.':'Executive Blue quotation: full commercial conditions and client acceptance.',`<button class="btn secondary" id="backToDocs">← Back</button><button class="btn ghost" id="loadSample">Use sample</button>`)}<div class="editor-layout"><div><section class="card form-card"><h3>Document information</h3><div class="form-grid">${selectF('Document status','status',d.status,d.type==='invoice'?['draft','sent','partial','paid','cancelled']:['draft','sent','accepted','rejected','expired'])}${f('Issue date','issue_date',d.issue_date,'date')}${d.type==='quotation'?f('Valid until','valid_until',d.valid_until,'date'):f('Completion estimate','completion',d.completion)}${f('Project / work title','project_title',d.project_title)}${f('Site / service location','project_location',d.project_location)}${f('VAT rate (%)','tax_rate',d.tax_rate,'number','min="0" max="100" step=".01"')}${f('Advance payment (%)','advance_percent',d.advance_percent,'number','min="0" max="100" step=".01"')}</div></section><section class="card form-card"><h3>Client information</h3><div class="form-grid"><div class="field full"><label>Fill from saved client</label><select id="clientPick"><option value="">Select a saved client (optional)</option>${clientList.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></div>${f('Client / company name *','client_name',d.client_name)}${f('Phone number','client_phone',d.client_phone)}${f('Email','client_email',d.client_email)}<div class="full">${f('Client address / location','client_address',d.client_address,'textarea')}</div></div></section><section class="card form-card"><div class="section-top"><h3>Services & charges</h3><button class="btn tiny secondary" id="addLine">＋ Add item</button></div><div class="field" style="margin-bottom:16px"><label>Insert from RESQHOME service library</label><select id="servicePicker"><option value="">Choose service to add</option>${state.data.services.map((s,i)=>`<option value="${i}">${esc(s.title)}</option>`).join('')}</select></div><div class="item-stack">${d.items.map(lineCard).join('')}</div><button class="btn secondary" id="addLineBottom" style="margin-top:15px">＋ Add another service</button></section>${d.type==='invoice'?`<section class="card form-card"><h3>Bank &amp; Payment Details</h3><p class="help">Invoice only. Fill or edit these details; they will be saved with this invoice and printed in its PDF.</p><div class="form-grid">${f('Account holder','bank_payable_to',d.bank_payable_to??defaultInvoiceBank.bank_payable_to)}${f('IBAN','bank_iban',d.bank_iban??defaultInvoiceBank.bank_iban)}${f('BIC / SWIFT','bank_swift_code',d.bank_swift_code??defaultInvoiceBank.bank_swift_code)}${f('Bank address','bank_address',d.bank_address??defaultInvoiceBank.bank_address,'textarea')}</div></section>`:''}<section class="card form-card"><h3>Internal notes (saved record)</h3>${f('Notes for your office (not printed on PDF)','notes',d.notes,'textarea')}</section></div><aside class="sticky"><div class="card summary-card"><h3>Amount summary</h3><div class="sum-line"><span>Subtotal</span><strong id="sumSub">AED 0.00</strong></div><div class="sum-line"><span>VAT</span><strong id="sumTax">AED 0.00</strong></div><div class="sum-total"><span>Total amount</span><strong id="sumTotal">AED 0.00</strong></div><div class="sum-line"><span>Advance</span><strong id="sumAdv">AED 0.00</strong></div><div class="sum-line"><span>Balance</span><strong id="sumBalance">AED 0.00</strong></div><p class="side-note">${d.type==='invoice'?'1-page approved invoice for standard four-item jobs. Long invoices continue onto additional service pages; no terms.':'Quotation includes an extra page for Terms & Conditions plus client acceptance.'}</p><div class="summary-actions"><button class="btn" id="saveDoc">✓ ${creating?'Save document':'Save changes'}</button>${!creating?`<button class="btn secondary" id="viewCurrent">↗ Preview PDF</button>`:''}<button class="btn secondary" id="cancelEdit">Cancel</button></div></div></aside></div>`}
function renderEditor(){layout(editorHTML());wireEditor();wireSmart();recalc()}
function wireEditor(){document.querySelectorAll('[data-field]').forEach(el=>el.addEventListener('input',()=>{const num=Number(el.value);state.edit[el.dataset.field]=['tax_rate','advance_percent'].includes(el.dataset.field)?(Number.isFinite(num)?num:0):el.value;recalc()}));document.querySelectorAll('[data-item]').forEach(el=>el.addEventListener('input',()=>{const i=+el.dataset.item;const num=Number(el.value);state.edit.items[i][el.dataset.key]=['qty','rate'].includes(el.dataset.key)?(Number.isFinite(num)?num:0):el.value;recalc()}));document.querySelectorAll('[data-remove-item]').forEach(el=>el.onclick=()=>{if(state.edit.items.length===1){toast('Keep at least one item',true);return}state.edit.items.splice(+el.dataset.removeItem,1);render()});$('#servicePicker').onchange=e=>{if(e.target.value==='')return;let svc=state.data.services[+e.target.value];if(state.edit.items.length===1&&!state.edit.items[0].title)state.edit.items[0]={...svc,qty:1,rate:0};else state.edit.items.push({...svc,qty:1,rate:0});render()};for(const id of ['addLine','addLineBottom'])$('#'+id).onclick=()=>{state.edit.items.push({title:'',description:'',qty:1,rate:0});render()};$('#loadSample').onclick=exampleDocument;$('#backToDocs').onclick=()=>navigate('documents');$('#cancelEdit').onclick=()=>navigate('documents');$('#clientPick').onchange=e=>{const cl=state.data.clients.find(x=>x.id===e.target.value);if(!cl)return;Object.assign(state.edit,{client_name:cl.name,client_email:cl.email,client_phone:cl.phone,client_address:cl.address});render();toast('Client details added')};$('#saveDoc').onclick=saveDocument;if($('#viewCurrent'))$('#viewCurrent').onclick=()=>downloadFile('/api/documents/'+state.editId+'/pdf?download=1',(state.edit?.number||'document')+'.pdf')}
function recalc(){if(!state.edit)return;const t=totals();for(const [id,val] of [['sumSub',t.sub],['sumTax',t.tax],['sumTotal',t.total],['sumAdv',t.adv],['sumBalance',round2(t.total-t.adv)],['mobileTotal',t.total]]){const el=$('#'+id);if(el)el.textContent='AED '+money(val)}state.edit.items.forEach((item,i)=>{const el=$('#rowAmt_'+i);if(el)el.textContent='AED '+money(round2(qty(item.qty)*qty(item.rate)))})}
let savingDoc=false;
async function saveDocument(){const d=state.edit;if(!d||savingDoc)return;if(!d.client_name.trim()){toast('Please enter client name',true);$('#f_client_name').focus();return}if(d.items.some(it=>!it.title.trim()||qty(it.qty)<=0||qty(it.rate)<0)){toast('Check each service name, quantity and rate',true);return}savingDoc=true;const saveBtn=$('#saveDoc'),mobBtn=$('[data-mobile-save]');if(saveBtn)saveBtn.disabled=true;if(mobBtn)mobBtn.disabled=true;try{const old=state.editId;const saved=await api(old?'/api/documents/'+old:'/api/documents',{method:old?'PUT':'POST',body:JSON.stringify(d)});await refresh();autoSyncDriveDoc(saved);toast((old?'Updated ':'Created ')+saved.number);viewDoc(saved.id)}catch(e){toast(e.message,true)}finally{savingDoc=false;if(saveBtn&&saveBtn.isConnected)saveBtn.disabled=false;if(mobBtn&&mobBtn.isConnected)mobBtn.disabled=false}}
function viewDoc(id){state.currentView=state.data.documents.find(x=>x.id===id);if(!state.currentView){toast('Document not found',true);return}state.page='preview';render()}
function renderPreview(){clearPreviewUrl();const d=state.currentView;if(!d){navigate('documents');return}layout(`${heading('DOCUMENT PREVIEW',esc(d.number),esc(d.client_name)+' • '+esc(d.project_title||'Service document'),`<button class="btn secondary" id="backFromPreview">← Back</button><a class="btn" href="/api/documents/${d.id}/pdf?download=1" data-download-pdf="${esc(d.id)}">↗ Open PDF</a>`)}<div class="preview-layout"><div class="card preview-tile"><div class="mobile-pdf-note"><strong>PDF ready to view</strong><p>Tap below to open your full-size document on mobile.</p><a class="btn" href="/api/documents/${d.id}/pdf?download=1" data-download-pdf="${esc(d.id)}">↗ Open PDF</a></div><iframe title="PDF preview" id="previewFrame" class="preview-frame"></iframe></div><aside><div class="card summary-card"><h3>Document actions</h3><div class="sum-line"><span>Type</span><strong>${d.type}</strong></div><div class="sum-line"><span>Status</span>${status(d.status)}</div><div class="sum-line"><span>Issue date</span><strong>${formatDate(d.issue_date)}</strong></div><div class="sum-total"><span>Grand total</span><strong style="font-size:16px">AED ${money(d.total)}</strong></div><div class="summary-actions"><button class="btn" id="editPreview">✎ Edit document</button><a class="btn secondary" href="/api/documents/${d.id}/pdf?download=1" data-download-pdf="${esc(d.id)}">⇩ PDF / Print</a>${d.type==='invoice'?`<button class="btn secondary" id="trackExpensePreview">📊 Track Expenses</button>`:''}${d.type==='quotation'?`<button class="btn secondary" id="convertDoc">↗ Convert to invoice</button>`:''}<button class="btn secondary" id="duplicateDoc">⧉ Duplicate</button><button class="btn danger" id="deleteDoc">Delete record</button></div><p class="side-note">${d.type==='invoice'?'Invoices have no Terms & Conditions.':'Quotations include commercial terms and an acceptance section.'}</p></div></aside></div>`);document.querySelectorAll('[data-download-pdf]').forEach(el=>el.onclick=e=>{e.preventDefault();downloadFile('/api/documents/'+d.id+'/pdf?download=1',d.number+'.pdf')});(async()=>{const frame=$('#previewFrame');if(!frame)return;try{const res=await fetch('/api/documents/'+d.id+'/pdf',{credentials:'same-origin',cache:'no-store'});if(!res.ok)throw new Error('Could not load PDF preview ('+res.status+')');const blob=await res.blob();const url=URL.createObjectURL(blob);if(!frame.isConnected||state.page!=='preview'||state.currentView?.id!==d.id){URL.revokeObjectURL(url);return}clearPreviewUrl();activePreviewUrl=url;frame.src=url;}catch(e){toast(e.message,true)}})();$('#backFromPreview').onclick=()=>navigate('documents');$('#editPreview').onclick=()=>editDocument(d.id);if($('#trackExpensePreview'))$('#trackExpensePreview').onclick=()=>openExpenseTracker(d.id);$('#duplicateDoc').onclick=()=>{state.edit={...d,items:JSON.parse(JSON.stringify(d.items)),status:'draft'};state.editId=null;state.page='editor';render();toast('Duplicate draft — save to assign a new number')};if($('#convertDoc'))$('#convertDoc').onclick=async()=>{if(!confirm('Create a new invoice from quotation '+d.number+'?'))return;try{const x=await api('/api/documents/'+d.id+'/convert',{method:'POST'});await refresh();autoSyncDriveDoc(x);toast('Invoice created: '+x.number);viewDoc(x.id)}catch(e){toast(e.message,true)}};$('#deleteDoc').onclick=async()=>{if(!confirm('Delete '+d.number+'? Automatic local snapshots are retained, but deleting is permanent in live records.'))return;try{await api('/api/documents/'+d.id,{method:'DELETE'});await refresh();if(d.type==='invoice')autoSyncDriveCompany();navigate('documents');toast('Document deleted')}catch(e){toast(e.message,true)}}}
function renderClients(){const c=state.data.clients;layout(`${heading('CLIENT DIRECTORY','Your customer records','Reuse customer contact and address details when creating documents.',`<button class="btn" id="newClient">＋ Add client</button>`)}<div class="clients-grid"><section class="card">${c.length?c.map(cl=>`<div class="client-tile"><div><div class="client-name">${esc(cl.name)}</div><div class="client-sub">${esc([cl.email,cl.phone].filter(Boolean).join(' • ')||cl.address||'No contact info')}</div></div><div class="button-row"><button class="btn tiny secondary" data-clientedit="${cl.id}">Edit</button><button class="btn tiny danger" data-clientdelete="${cl.id}">Delete</button></div></div>`).join(''):cardEmpty('No clients yet','Add your first client to reuse their details in future documents.')}</section><aside class="card section-card"><h3>Client record security</h3><p class="help">Customer details are stored in your local SQLite database and covered by automatic snapshots. Download a backup from Settings to keep an off-device copy.</p></aside></div>`);$('#newClient').onclick=()=>clientModal();document.querySelectorAll('[data-clientedit]').forEach(b=>b.onclick=()=>clientModal(c.find(x=>x.id===b.dataset.clientedit)));document.querySelectorAll('[data-clientdelete]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this client from client directory? Saved documents stay unchanged.'))return;await api('/api/clients/'+b.dataset.clientdelete,{method:'DELETE'});await refresh();render();toast('Client deleted')})}
function clientModal(cl){const edit=!!cl;const div=document.createElement('div');div.className='overlay';div.innerHTML=`<div class="modal"><h3>${edit?'Edit client':'New client'}</h3><p>Save this contact once and reuse it for future quotations or invoices.</p><div class="form-grid">${f('Client name *','name',cl?.name||'')}${f('Phone','phone',cl?.phone||'')}${f('Email','email',cl?.email||'')}<div class="full">${f('Address','address',cl?.address||'','textarea')}</div></div><div class="button-row" style="justify-content:flex-end;margin-top:22px"><button class="btn secondary" id="closeClient">Cancel</button><button class="btn" id="saveClient">Save client</button></div></div>`;document.body.appendChild(div);wireSmart();$('#closeClient').onclick=()=>div.remove();div.onclick=e=>{if(e.target===div)div.remove()};$('#saveClient').onclick=async()=>{const data=Object.fromEntries(['name','phone','email','address'].map(k=>[k,div.querySelector('#f_'+k).value.trim()]));if(!data.name){toast('Enter client name',true);return}try{await api(edit?'/api/clients/'+cl.id:'/api/clients',{method:edit?'PUT':'POST',body:JSON.stringify(data)});div.remove();await refresh();render();toast('Client saved')}catch(e){toast(e.message,true)}}}
function renderSettings(){let s=state.data.settings;layout(`${heading('OFFICE CONFIGURATION','Settings & backups','Keep your company identity and document defaults up to date.')}<div class="settings-layout"><div><div class="card form-card"><h3>Company information</h3><div class="form-grid">${f('Legal business name','legal_name',s.legal_name)}${f('Commercial licence','license_number',s.license_number)}${f('Business phone','phone',s.phone)}${f('Business email','email',s.email)}${f('Website','website',s.website)}${f('Office location','location',s.location)}${f('TR NO / Tax Registration Number','tax_registration_number',s.tax_registration_number||'104570745000003')}${f('Default VAT rate (%)','tax_rate',s.tax_rate,'number')}${f('Default advance (%)','advance_percent',s.advance_percent,'number')}${f('Quotation validity (days)','quotation_valid_days',s.quotation_valid_days,'number')}</div><button class="btn" id="saveSettings" style="margin-top:19px">Save settings</button></div><div class="card section-card"><div class="section-top"><h3>Data exports</h3></div><div class="export-item"><div><strong>Full document backup</strong><p>Download clients, settings and document history as JSON.</p></div><a href="/api/backup" class="btn secondary" data-download-url="/api/backup" data-download-name="resqhome-backup-${today()}.json">⇩ JSON</a></div><div class="export-item"><div><strong>Restore a JSON backup</strong><p>Replace records from a previously exported backup.</p></div><button class="btn secondary" id="restoreButton">↑ Restore</button><input type="file" id="restoreFile" accept=".json,application/json" hidden></div><div class="export-item"><div><strong>Accounting summary</strong><p>Export line totals and statuses for Excel.</p></div><a href="/api/export/csv" class="btn secondary" data-download-url="/api/export/csv" data-download-name="resqhome-records.csv">⇩ CSV</a></div></div><div class="card section-card" style="margin-top:18px"><div class="section-top"><h3>Google Drive automatic backup</h3></div><p class="help">Automatically copy saved invoices, quotations and expense &amp; profit reports to your Google Drive folder (HOME RESCUE OFFICE). Original records remain in RESQHOME Office.</p><div id="gdriveStatus" class="help" style="margin:12px 0">Checking Google Drive connection...</div><div id="gdriveActions" class="button-row"><span id="gdriveSignInWrap">${gsiButtonMarkup('Sign in with Google')}</span><button type="button" id="gdriveSync" class="btn" style="display:none">Sync All Now</button><button type="button" id="gdriveDisconnect" class="btn danger" style="display:none">Disconnect</button></div></div><div class="card section-card" style="margin-top:18px"><h3>Security & account</h3><p class="help">Change your first-login password.</p><div class="form-grid">${f("Current password","current_password","","password")}${f("New password (12+ characters)","new_password","","password")}</div><div class="button-row" style="margin-top:18px"><button class="btn" id="changePassword">Update password</button><button class="btn secondary" id="logOut">Sign out</button></div></div></div><aside><div class="card section-card"><div class="eyebrow">Storage</div><h3 style="margin:0 0 11px">Private cloud storage</h3><div class="metric-value" style="font-size:20px">Cloud <small>connected</small></div><p class="help">Documents and clients are saved in your workspace store. Connect Google Drive to keep live PDF and CSV copies in your Drive account.</p><hr class="divider"><h3 style="font-size:13px">Important</h3><p class="help">This office workspace is protected by an office password. Regularly export JSON backups or sync with Google Drive for off-site protection.</p></div><div class="info-pill" style="margin-top:16px"><b>Document rules</b><br>Invoice: no Terms & Conditions.<br>Quotation: Terms & Conditions + signature.<br>PDF style: RESQHOME Executive Blue.</div></aside></div>`);
 const updateDriveUI=()=>{
  const statusEl=$('#gdriveStatus'),signInWrap=$('#gdriveSignInWrap'),signInBtn=$('#gdriveSignIn'),sync=$('#gdriveSync'),disconnect=$('#gdriveDisconnect');
  if(!statusEl||!statusEl.isConnected)return;
  const drv=window.__resqhomeDrive?.getState?.();
  if(!drv||!drv.ready){statusEl.textContent='Initializing Google Drive client...';if(signInWrap)signInWrap.style.display='inline-flex';sync.style.display='none';disconnect.style.display='none';return;}
  if(drv.connected){
   statusEl.textContent='Connected: '+(drv.email||'Google Drive')+' · Automatic backup enabled';
   if(drv.folderUrl){const a=document.createElement('a');a.href=drv.folderUrl;a.target='_blank';a.rel='noopener';a.className='text-link';a.textContent='  Open Drive folder';statusEl.appendChild(a);}
   if(signInWrap)signInWrap.style.display='none';
   sync.style.display='inline-flex';disconnect.style.display='inline-flex';
  }else{
   if(drv.needsReconnect){
    statusEl.textContent='Signed in as '+(drv.email||'Google account')+'. Reconnect Google Drive to resume automatic backups for this session.';
    if(signInBtn){const label=signInBtn.querySelector('.gsi-material-button-contents');if(label)label.textContent='Reconnect Google Drive';}
   }else{
    statusEl.textContent='Not connected. Sign in with Google to automatically sync invoice PDFs, quotation PDFs and expense reports.';
    if(signInBtn){const label=signInBtn.querySelector('.gsi-material-button-contents');if(label)label.textContent='Sign in with Google';}
   }
   if(drv.error){const errSpan=document.createElement('div');errSpan.style.color='var(--red)';errSpan.style.marginTop='6px';errSpan.textContent=drv.error;statusEl.appendChild(errSpan);}
   if(signInWrap)signInWrap.style.display='inline-flex';
   sync.style.display='none';disconnect.style.display='none';
  }
 };
 updateDriveUI();
 if(window.__resqhomeDriveSettingsUnsub)window.__resqhomeDriveSettingsUnsub();
 if(window.__resqhomeDrive?.subscribe){window.__resqhomeDriveSettingsUnsub=window.__resqhomeDrive.subscribe(updateDriveUI);}
 else{const onReady=()=>{if(window.__resqhomeDrive?.subscribe){window.removeEventListener('resqhome-drive-state',onReady);window.__resqhomeDriveSettingsUnsub=window.__resqhomeDrive.subscribe(updateDriveUI);}updateDriveUI();};window.addEventListener('resqhome-drive-state',onReady);}
 if($('#gdriveSignIn'))$('#gdriveSignIn').onclick=async()=>{const btn=$('#gdriveSignIn');if(!window.__resqhomeDrive?.signIn){toast('Google Drive client is still loading, please retry',true);return}btn.disabled=true;try{await window.__resqhomeDrive.signIn();updateDriveUI();toast('Google Drive connected & folder initialized')}catch(e){toast(e.message,true)}finally{if(btn.isConnected)btn.disabled=false}};
 if($('#gdriveSync'))$('#gdriveSync').onclick=async()=>{const sync=$('#gdriveSync');const docCount=state.data.documents.length;if(!confirm('Sync all '+docCount+' documents and expense & profit reports to your Google Drive folder ("HOME RESCUE OFFICE")? Existing Drive files with matching names will be updated.'))return;sync.disabled=true;const origText=sync.textContent;sync.textContent='Syncing...';let offset=0,failures=[];try{do{const data=await driveApi('/api/drive/sync-all',{offset});if(!data)throw Error('Google Drive session expired. Please reconnect.');offset=data.nextOffset;failures.push(...(data.errors||[]));if(!data.hasMore)break;}while(true);toast(failures.length?'Drive sync completed with '+failures.length+' errors.':'Google Drive sync completed ('+docCount+' documents)',Boolean(failures.length));}catch(e){toast(e.message,true)}finally{if(sync.isConnected){sync.disabled=false;sync.textContent=origText;}}};
 if($('#gdriveDisconnect'))$('#gdriveDisconnect').onclick=async()=>{if(!confirm('Disconnect Google Drive from RESQHOME Office? Existing files stored in your Google Drive will stay intact.'))return;try{await window.__resqhomeDrive?.signOut?.();updateDriveUI();toast('Google Drive disconnected')}catch(e){toast(e.message,true)}};
 $('#restoreButton').onclick=()=>$('#restoreFile').click();$('#restoreFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const txt=await file.text();const data=JSON.parse(txt);if(data.format!=='RESQHOME_OFFICE_BACKUP_V1')throw Error('Invalid backup file');if(!confirm('Restore '+data.documents.length+' documents and '+data.clients.length+' clients? This REPLACES current records. Download a JSON backup before restoring.'))return;const res=await api('/api/restore',{method:'POST',body:JSON.stringify(data)});await refresh();render();toast('Restored '+res.documents+' documents and '+res.clients+' clients')}catch(e){toast(e.message,true)}};$('#changePassword').onclick=async()=>{const current_password=document.querySelector('[data-field=current_password]').value;const new_password=document.querySelector('[data-field=new_password]').value;try{if(new_password.length<12)throw Error('Password must be at least 12 characters');await api('/api/auth',{method:'PATCH',body:JSON.stringify({current_password,new_password})});document.querySelector('[data-field=current_password]').value='';document.querySelector('[data-field=new_password]').value='';toast('Office password updated')}catch(e){toast(e.message,true)}};$('#logOut').onclick=async()=>{await api('/api/auth',{method:'DELETE'});location.reload()};$('#saveSettings').onclick=async()=>{const data={};document.querySelectorAll('[data-field]').forEach(i=>{const k=i.dataset.field;if(k==='current_password'||k==='new_password')return;if(['tax_rate','advance_percent','quotation_valid_days'].includes(k)){const num=Number(i.value);data[k]=Number.isFinite(num)?num:0;}else{data[k]=i.value;}});try{await api('/api/settings',{method:'PUT',body:JSON.stringify(data)});await refresh();toast('Company settings updated')}catch(e){toast(e.message,true)}}}
const EXPENSE_CATEGORIES=['Labour Cost','Material Cost','Fuel / Petrol','Tools / Consumables','Transportation','Equipment Rental','Subcontractor Payments','Parking / Toll Charges','Other Expense'];

function getInvoiceRev(doc){
  if(!doc)return {total:0,subtotal:0,vat:0,taxRate:5};
  let subtotal=0;
  if(Array.isArray(doc.items)&&doc.items.length){
    for(const item of doc.items){subtotal+=(Number(item.qty)||0)*(Number(item.rate)||0)}
    subtotal=Math.round(subtotal*100)/100;
  }
  const taxRate=Number(doc.tax_rate??5);
  const vat=Math.round(subtotal*(taxRate/100)*100)/100;
  const total=Math.round((doc.total?Number(doc.total):subtotal+vat)*100)/100;
  const revenueExclVat=subtotal>0?subtotal:Math.round((total/(1+taxRate/100))*100)/100;
  return {total,subtotal:revenueExclVat,vat:Math.round((total-revenueExclVat)*100)/100,taxRate};
}

function getInvoiceExpenses(invId){return (state.data.expenses||[]).filter(e=>e.invoice_id===invId)}
function getInvoicePayments(invId){return (state.data.payments||[]).filter(p=>p.invoice_id===invId)}

function calcInvoiceProfit(doc){
  const rev=getInvoiceRev(doc);
  const exps=getInvoiceExpenses(doc?.id);
  const pays=getInvoicePayments(doc?.id);
  const totalExpenses=Math.round(exps.reduce((a,b)=>a+(Number(b.amount)||0),0)*100)/100;
  const totalPayments=Math.round(pays.reduce((a,b)=>a+(Number(b.amount)||0),0)*100)/100;
  const netProfit=Math.round((rev.subtotal-totalExpenses)*100)/100;
  const profitMargin=rev.subtotal>0?Math.round((netProfit/rev.subtotal)*1000)/10:0;
  const outstandingBalance=Math.round(Math.max(0,rev.total-totalPayments)*100)/100;
  return {invoiceTotal:rev.total,revenueExclVat:rev.subtotal,vatAmount:rev.vat,totalExpenses,netProfit,profitMargin,paymentReceived:totalPayments,outstandingBalance,isProfitable:netProfit>0,isLoss:netProfit<0};
}

function calcCompanyMetrics(periodFilter='all'){
  const invoices=(state.data.documents||[]).filter(d=>d.type==='invoice'&&d.status!=='cancelled');
  const filteredInvoices=invoices.filter(doc=>{
    if(periodFilter==='all')return true;
    const dStr=String(doc.issue_date||doc.created_at||'');
    return dStr.startsWith(periodFilter);
  });
  const invIds=new Set(filteredInvoices.map(d=>d.id));
  const filteredExpenses=(state.data.expenses||[]).filter(e=>invIds.has(e.invoice_id));
  const filteredPayments=(state.data.payments||[]).filter(p=>invIds.has(p.invoice_id));
  let totalRevenue=0,totalInvoiceTotal=0,totalPayments=0;
  const summaries=filteredInvoices.map(doc=>{
    const p=calcInvoiceProfit(doc);
    totalRevenue+=p.revenueExclVat;
    totalInvoiceTotal+=p.invoiceTotal;
    totalPayments+=p.paymentReceived;
    return {...p,doc};
  });
  totalRevenue=Math.round(totalRevenue*100)/100;
  totalInvoiceTotal=Math.round(totalInvoiceTotal*100)/100;
  totalPayments=Math.round(totalPayments*100)/100;
  const totalExpenses=Math.round(filteredExpenses.reduce((a,b)=>a+(Number(b.amount)||0),0)*100)/100;
  const netProfit=Math.round((totalRevenue-totalExpenses)*100)/100;
  const profitMargin=totalRevenue>0?Math.round((netProfit/totalRevenue)*1000)/10:0;
  const outstandingBalance=Math.round(Math.max(0,totalInvoiceTotal-totalPayments)*100)/100;

  const catMap={};
  for(const e of filteredExpenses){const c=e.category||'Other Expense';catMap[c]=(catMap[c]||0)+(Number(e.amount)||0)}
  const categories=Object.entries(catMap).map(([category,amount])=>({
    category,amount:Math.round(amount*100)/100,percentage:totalExpenses>0?Math.round((amount/totalExpenses)*1000)/10:0
  })).sort((a,b)=>b.amount-a.amount);

  const monthMap={};
  for(const inv of filteredInvoices){
    const m=String(inv.issue_date||inv.created_at||'').slice(0,7);
    if(!/^\d{4}-\d{2}$/.test(m))continue;
    if(!monthMap[m])monthMap[m]={revenue:0,expenses:0};
    monthMap[m].revenue+=getInvoiceRev(inv).subtotal;
  }
  const invById=new Map(filteredInvoices.map(d=>[d.id,d]));
  for(const e of filteredExpenses){
    const linked=invById.get(e.invoice_id);
    const m=String(linked?.issue_date||e.date||'').slice(0,7);
    if(!/^\d{4}-\d{2}$/.test(m))continue;
    if(!monthMap[m])monthMap[m]={revenue:0,expenses:0};
    monthMap[m].expenses+=(Number(e.amount)||0);
  }
  const sortedMonths=Object.keys(monthMap).sort().slice(-6);
  const monthly=(sortedMonths.length?sortedMonths:[today().slice(0,7)]).map(m=>({
    month:m,
    revenue:round2(monthMap[m]?.revenue||0),
    expenses:round2(monthMap[m]?.expenses||0)
  }));
  return {totalRevenue,totalInvoiceTotal,totalExpenses,netProfit,profitMargin,totalPayments,outstandingBalance,invoiceCount:filteredInvoices.length,expenseCount:filteredExpenses.length,summaries,categories,monthly};
}

function openExpenseTracker(invoiceId){
  const inv=state.data.documents.find(d=>d.id===invoiceId);
  if(!inv){toast('Invoice not found',true);return}
  if(inv.type!=='invoice'){toast('Expenses can only be tracked for invoices',true);return}
  if(inv.job_status!=='confirmed'){
    const div=document.createElement('div');
    div.className='overlay';
    div.innerHTML=`<div class="modal"><div class="badge-unconfirmed" style="margin-bottom:12px">⚠️ Job Not Confirmed</div><h3>Confirm Job for ${esc(inv.number)}</h3><p>To record job expenses and calculate actual profit, please confirm this project first.</p><p style="font-size:12px;color:var(--muted)">Client: <strong>${esc(inv.client_name)}</strong><br>Total: <strong>AED ${money(inv.total)}</strong></p><div class="button-row" style="justify-content:flex-end;margin-top:22px"><button class="btn secondary" id="cancelConfirm">Cancel</button><button class="btn" id="confirmJobAction">✓ Confirm Job &amp; Track Expenses</button></div></div>`;
    document.body.appendChild(div);
    div.querySelector('#cancelConfirm').onclick=()=>div.remove();
    div.querySelector('#confirmJobAction').onclick=async()=>{
      try{
        await api('/api/documents/'+inv.id+'/confirm-job',{method:'POST'});
        inv.job_status='confirmed';
        div.remove();
        state.expenseInvoiceId=inv.id;
        state.page='expense_tracker';
        render();
        toast('Job confirmed for '+inv.number);
      }catch(e){toast(e.message,true)}
    };
    return;
  }
  state.expenseInvoiceId=inv.id;
  state.page='expense_tracker';
  render();
  window.scrollTo(0,0);
}

function expenseModal(exp=null,defaultCat='Labour Cost'){
  const inv=state.data.documents.find(d=>d.id===state.expenseInvoiceId);
  if(!inv)return;
  const isEdit=!!exp;
  const div=document.createElement('div');
  div.className='overlay';
  div.innerHTML=`<div class="modal"><h3>${isEdit?'Edit Expense':'Add New Expense'}</h3><p>Invoice <strong>${esc(inv.number)}</strong> (${esc(inv.client_name)})</p><div class="form-grid"><div class="field"><label>Expense Date *</label><input type="date" id="m_exp_date" value="${exp?.date||today()}" required></div><div class="field"><label>Category *</label><select id="m_exp_cat">${EXPENSE_CATEGORIES.map(c=>`<option value="${c}" ${(exp?.category||defaultCat)===c?'selected':''}>${c}</option>`).join('')}</select></div><div class="field full"><label>Description / Work Details *</label><input type="text" id="m_exp_desc" placeholder="e.g. Technician team (2 days) or AC parts" value="${esc(exp?.description||'')}" required></div><div class="field full"><label>Amount (AED) *</label><input type="number" id="m_exp_amt" step="0.01" min="0.01" placeholder="0.00" value="${exp?.amount||''}" required></div></div><div class="button-row" style="justify-content:flex-end;margin-top:24px"><button class="btn secondary" id="closeExpModal">Cancel</button><button class="btn" id="saveExpBtn">✓ ${isEdit?'Update Expense':'Save Expense'}</button></div></div>`;
  document.body.appendChild(div);
  div.querySelector('#closeExpModal').onclick=()=>div.remove();
  div.onclick=e=>{if(e.target===div)div.remove()};
  div.querySelector('#saveExpBtn').onclick=async()=>{
    const date=div.querySelector('#m_exp_date').value;
    const category=div.querySelector('#m_exp_cat').value;
    const description=div.querySelector('#m_exp_desc').value.trim();
    const amount=Number(div.querySelector('#m_exp_amt').value);
    if(!date||!category||!description||!amount||amount<=0){toast('Please fill all required fields with a positive amount',true);return}
    const payload={invoice_id:inv.id,invoice_number:inv.number,date,category,description,amount};
    try{
      await api(isEdit?'/api/expenses/'+exp.id:'/api/expenses',{method:isEdit?'PUT':'POST',body:JSON.stringify(payload)});
      div.remove();
      await refresh();
      autoSyncDriveExpense(inv.id);
      render();
      toast(isEdit?'Expense updated':'Expense recorded');
    }catch(e){toast(e.message,true)}
  };
}

function paymentModal(){
  const inv=state.data.documents.find(d=>d.id===state.expenseInvoiceId);
  if(!inv)return;
  const p=calcInvoiceProfit(inv);
  const div=document.createElement('div');
  div.className='overlay';
  div.innerHTML=`<div class="modal"><h3>Record Customer Payment</h3><p>Invoice <strong>${esc(inv.number)}</strong> • Outstanding: <strong style="color:var(--navy)">AED ${money(p.outstandingBalance)}</strong></p><div class="form-grid"><div class="field"><label>Payment Date *</label><input type="date" id="m_pay_date" value="${today()}" required></div><div class="field"><label>Payment Method *</label><select id="m_pay_method"><option value="Bank Transfer">Bank Transfer</option><option value="Cash">Cash</option><option value="Card">Card</option><option value="Other">Other</option></select></div><div class="field full"><label>Payment Amount (AED) *</label><input type="number" id="m_pay_amt" step="0.01" min="0.01" value="${p.outstandingBalance>0?p.outstandingBalance:''}" placeholder="0.00" required></div><div class="field full"><label>Payment Reference / Notes</label><input type="text" id="m_pay_ref" placeholder="e.g. RAK Bank transfer ref #12345"></div></div><div class="button-row" style="justify-content:flex-end;margin-top:24px"><button class="btn secondary" id="closePayModal">Cancel</button><button class="btn" id="savePayBtn">✓ Save Payment</button></div></div>`;
  document.body.appendChild(div);
  div.querySelector('#closePayModal').onclick=()=>div.remove();
  div.onclick=e=>{if(e.target===div)div.remove()};
  div.querySelector('#savePayBtn').onclick=async()=>{
    const date=div.querySelector('#m_pay_date').value;
    const method=div.querySelector('#m_pay_method').value;
    const amount=Number(div.querySelector('#m_pay_amt').value);
    const reference=div.querySelector('#m_pay_ref').value.trim();
    if(!date||!amount||amount<=0){toast('Enter a valid date and positive payment amount',true);return}
    try{
      await api('/api/payments',{method:'POST',body:JSON.stringify({invoice_id:inv.id,invoice_number:inv.number,date,method,amount,reference})});
      div.remove();
      await refresh();
      autoSyncDriveExpense(inv.id);
      render();
      toast('Payment of AED '+money(amount)+' recorded');
    }catch(e){toast(e.message,true)}
  };
}

function renderExpenseTracker(){
  const inv=state.data.documents.find(d=>d.id===state.expenseInvoiceId)||state.data.documents.find(d=>d.type==='invoice');
  if(!inv){navigate('invoices');return}
  const profit=calcInvoiceProfit(inv);
  const exps=getInvoiceExpenses(inv.id);
  const pays=getInvoicePayments(inv.id);
  const isConfirmed=inv.job_status==='confirmed';

  const defaultCats=['Labour Cost','Material Cost','Fuel / Petrol','Tools / Consumables','Other Expense'];
  const catRows=defaultCats.map(cat=>{
    const amt=exps.filter(e=>e.category===cat).reduce((a,b)=>a+(Number(b.amount)||0),0);
    return `<div class="category-input-row"><div class="category-label">${cat}</div><div class="category-val-wrap"><span class="category-currency">AED</span><span class="category-amount-input" style="background:#f8fafc;display:inline-block;line-height:18px">${money(amt)}</span><button type="button" class="icon-button" data-cat-add="${cat}" title="Add/Edit ${cat}">✎</button></div></div>`;
  }).join('');

  const expTableRows=exps.length?exps.map(e=>`<tr><td>${formatDate(e.date)}</td><td><span class="category-pill">${esc(e.category)}</span></td><td>${esc(e.description||'—')}</td><td><strong>${money(e.amount)}</strong></td><td style="white-space:nowrap"><button class="icon-button" data-exp-edit="${e.id}" title="Edit expense">✎</button> <button class="icon-button" data-exp-delete="${e.id}" title="Delete expense" style="color:var(--red)">🗑</button></td></tr>`).join(''):`<tr><td colspan="5" style="text-align:center;padding:26px 12px;color:var(--muted)">No expenses recorded for this invoice yet. Tap <strong>＋ Add Expense</strong> to begin.</td></tr>`;

  const paymentsHTML=pays.length?`<div style="margin-top:22px;border-top:1px solid var(--line);padding-top:16px"><div style="font-size:12px;font-weight:800;color:var(--navy);margin-bottom:10px">Recorded Customer Payments (${pays.length})</div><div class="table-scroll"><table class="doc-table"><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th>Amount (AED)</th><th>Action</th></tr></thead><tbody>${pays.map(p=>`<tr><td>${formatDate(p.date)}</td><td><span class="status paid">${esc(p.method)}</span></td><td>${esc(p.reference||'—')}</td><td><strong>AED ${money(p.amount)}</strong></td><td><button class="icon-button" data-pay-delete="${p.id}" title="Delete payment" style="color:var(--red)">🗑</button></td></tr>`).join('')}</tbody></table></div></div>`:'';

  layout(`<div class="page-head"><div><div class="eyebrow"><a href="#invoices" data-nav="invoices" style="color:var(--blue)">Invoices</a> &gt; ${esc(inv.number)}</div><h1 style="display:flex;align-items:center;gap:10px"><span style="font-size:24px">📄</span> Invoice Expense Tracker</h1><p class="lede">Track actual job expenses per invoice, record customer payments and calculate true net profit.</p></div><div class="button-row"><button class="btn secondary" id="backToInvoices">&lt; Back to Invoices</button><button class="btn" id="saveExpenseChanges">✓ Save Changes</button></div></div>
  <div class="invoice-info-card">
    <div class="invoice-info-header">
      <div class="invoice-code-title">${esc(inv.number)}</div>
      ${isConfirmed?'<span class="badge-confirmed">✓ Confirmed</span>':'<button class="btn tiny secondary" id="confirmJobBtn">Confirm Job</button>'}
    </div>
    <div class="invoice-info-body">
      <div class="client-info-col">
        <div class="client-info-line"><span>👤</span> <span>Client: <strong>${esc(inv.client_name)}</strong></span></div>
        <div class="client-info-line"><span>🔧</span> <span>Service: <strong>${esc(inv.project_title||'Home Maintenance (AC, Plumbing & General Repairs)')}</strong></span></div>
      </div>
      <div class="invoice-amount-col">
        <div class="amount-kicker">Invoice Amount</div>
        <div class="amount-main">AED ${money(profit.invoiceTotal)}</div>
      </div>
      <div class="invoice-meta-col">
        <div>📅 Invoice Date: <strong>${formatDate(inv.issue_date)}</strong></div>
        <div>📅 Due Date: <strong>${formatDate(inv.due_date||days(inv.issue_date,14))}</strong></div>
        <div>💳 Payment: ${profit.outstandingBalance<=0?'<span class="badge-confirmed">✓ Received</span>':profit.paymentReceived>0?'<span class="status partial">Partial</span>':'<span class="status sent">Pending</span>'}</div>
      </div>
    </div>
  </div>
  <div class="grid-2">
    <div class="card form-card" style="margin-bottom:0">
      <div class="section-top" style="margin-bottom:12px">
        <div>
          <h3 style="display:flex;align-items:center;gap:8px"><span>▦</span> Expenses &amp; Profit</h3>
          <p class="help" style="margin:4px 0 0">Enter the actual costs for this invoice to track total expenses and profit.</p>
        </div>
      </div>
      <div class="category-inputs-list">${catRows}</div>
      <div class="button-row" style="margin-top:20px">
        <button class="btn" id="addExpenseBtn">＋ Add Expense</button>
        <button class="btn secondary" id="resetExpenseBtn">↺ Reset</button>
      </div>
    </div>
    <div class="profit-summary-card">
      <div class="section-top" style="margin-bottom:14px">
        <h3 style="display:flex;align-items:center;gap:7px;margin:0"><span>📊</span> Invoice Profit Summary</h3>
      </div>
      <div class="profit-stat-row"><span>Invoice Total:</span><strong>AED ${money(profit.invoiceTotal)}</strong></div>
      <div class="profit-stat-row"><span>Revenue (Excl. VAT):</span><strong>AED ${money(profit.revenueExclVat)}</strong></div>
      <div class="profit-stat-row"><span>Total Expenses:</span><strong>AED ${money(profit.totalExpenses)}</strong></div>
      <div class="profit-highlight-row ${profit.isLoss?'is-loss':''}">
        <span class="profit-highlight-label">Net Profit:</span>
        <span class="profit-highlight-val">AED ${money(profit.netProfit)}</span>
      </div>
      <div class="profit-stat-row"><span>Profit Margin:</span><span class="profit-margin-pill ${profit.isLoss?'is-loss':''}">${profit.profitMargin.toFixed(1)}%</span></div>
      <div class="profit-stat-row"><span>Payment Received:</span><strong>AED ${money(profit.paymentReceived)}</strong></div>
      <div class="profit-stat-row" style="border-bottom:none"><span>Outstanding Balance:</span><strong style="color:${profit.outstandingBalance>0?'#b7791f':'#16803c'}">AED ${money(profit.outstandingBalance)}</strong></div>
      <button class="btn tiny secondary" id="recordPaymentBtn" style="width:100%;margin-top:14px">💳 Record Customer Payment</button>
    </div>
  </div>
  <div class="card section-card" style="margin-top:22px">
    <div class="section-top">
      <h3 style="display:flex;align-items:center;gap:8px"><span>☰</span> Expense Entries (This Invoice)</h3>
      <button class="btn tiny secondary" id="addTableExpenseBtn">＋ Add Entry</button>
    </div>
    <div class="table-scroll">
      <table class="doc-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Amount (AED)</th>
            <th style="text-align:right">Actions</th>
          </tr>
        </thead>
        <tbody>${expTableRows}</tbody>
      </table>
    </div>
    ${paymentsHTML}
  </div>`);

  $('#backToInvoices').onclick=()=>navigate('invoices');
  $('#saveExpenseChanges').onclick=()=>{toast('All expenses and profits are saved in private cloud storage');render()};
  if($('#confirmJobBtn'))$('#confirmJobBtn').onclick=async()=>{
    try{
      await api('/api/documents/'+inv.id+'/confirm-job',{method:'POST'});
      inv.job_status='confirmed';
      render();
      toast('Job confirmed');
    }catch(e){toast(e.message,true)}
  };
  $('#addExpenseBtn').onclick=()=>expenseModal();
  $('#addTableExpenseBtn').onclick=()=>expenseModal();
  $('#resetExpenseBtn').onclick=async()=>{await refresh();render();toast('Values refreshed')};
  $('#recordPaymentBtn').onclick=()=>paymentModal();

  document.querySelectorAll('[data-cat-add]').forEach(btn=>btn.onclick=()=>expenseModal(null,btn.dataset.catAdd));
  document.querySelectorAll('[data-exp-edit]').forEach(btn=>{
    const exp=exps.find(e=>e.id===btn.dataset.expEdit);
    btn.onclick=()=>expenseModal(exp);
  });
  document.querySelectorAll('[data-exp-delete]').forEach(btn=>btn.onclick=async()=>{
    const exp=exps.find(e=>e.id===btn.dataset.expDelete);
    if(!exp||!confirm('Delete this expense ('+exp.category+' - AED '+money(exp.amount)+')?'))return;
    try{
      await api('/api/expenses/'+exp.id,{method:'DELETE'});
      await refresh();
      autoSyncDriveExpense(inv.id);
      render();
      toast('Expense deleted');
    }catch(e){toast(e.message,true)}
  });
  document.querySelectorAll('[data-pay-delete]').forEach(btn=>btn.onclick=async()=>{
    const pay=pays.find(p=>p.id===btn.dataset.payDelete);
    if(!pay||!confirm('Delete payment record of AED '+money(pay.amount)+'?'))return;
    try{
      await api('/api/payments/'+pay.id,{method:'DELETE'});
      await refresh();
      autoSyncDriveExpense(inv.id);
      render();
      toast('Payment record deleted');
    }catch(e){toast(e.message,true)}
  });
}

function barChartSVG(monthlyData){
  const list=Array.isArray(monthlyData)&&monthlyData.length?monthlyData:[{month:today().slice(0,7),revenue:0,expenses:0}];
  const rawMax=Math.max(1000,...list.flatMap(d=>[Number(d.revenue)||0,Number(d.expenses)||0]));
  const rawStep=rawMax/5;
  const mag=Math.pow(10,Math.floor(Math.log10(rawStep||1)));
  const ratio=rawStep/mag;
  const snapped=ratio<=1?1:ratio<=2?2:ratio<=2.5?2.5:ratio<=5?5:10;
  const niceStep=Math.max(200,snapped*mag);
  const maxVal=niceStep*5;
  const W=520,H=190,padLeft=58,padBottom=32,padTop=20;
  const chartW=W-padLeft-15,chartH=H-padTop-padBottom;
  const gridVals=[0,1,2,3,4,5].map(k=>Math.round(k*niceStep));
  const gridLines=gridVals.map(val=>{
    const y=padTop+chartH-(val/maxVal)*chartH;
    const label=val===0?'AED 0':val>=1000?'AED '+(val%1000===0?(val/1000):(val/1000).toFixed(1))+'K':'AED '+val;
    return `<line x1="${padLeft}" y1="${y}" x2="${W-10}" y2="${y}" stroke="#e5edf4" stroke-width="1"/><text x="${padLeft-6}" y="${y+3}" font-size="8.5" fill="#788e9e" text-anchor="end" font-weight="600">${label}</text>`;
  }).join('');

  const count=list.length;
  const colW=chartW/count;
  const barW=16;
  const bars=list.map((d,i)=>{
    const cx=padLeft+i*colW+colW/2;
    const revH=d.revenue>0?Math.min(chartH,Math.max(2,(d.revenue/maxVal)*chartH)):0;
    const expH=d.expenses>0?Math.min(chartH,Math.max(2,(d.expenses/maxVal)*chartH)):0;
    const revY=padTop+chartH-revH;
    const expY=padTop+chartH-expH;
    const mLabel=new Date(d.month+'-01T12:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
    const [mon,yr]=mLabel.split(' ');
    return `<g><rect x="${cx-barW-2}" y="${revY}" width="${barW}" height="${revH}" fill="#08264B" rx="3"><title>${d.month} Revenue: AED ${money(d.revenue)}</title></rect><rect x="${cx+2}" y="${expY}" width="${barW}" height="${expH}" fill="#5EA6D6" rx="3"><title>${d.month} Expenses: AED ${money(d.expenses)}</title></rect><text x="${cx}" y="${H-14}" font-size="9" fill="#587189" text-anchor="middle" font-weight="600">${mon}</text><text x="${cx}" y="${H-4}" font-size="8" fill="#889dae" text-anchor="middle">${yr}</text></g>`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" style="overflow:visible">${gridLines}${bars}</svg>`;
}

function donutChartSVG(categories,totalExpenses){
  const colors=['#08264B','#3D8FBD','#70B2DE','#A8D1EC','#C6E2F5'];
  const R=40,C=2*Math.PI*R;
  let offset=0;
  let circles='';
  if(!totalExpenses||!categories.length){
    circles=`<circle cx="85" cy="85" r="${R}" fill="none" stroke="#e8f0f6" stroke-width="22"/>`;
  }else{
    categories.slice(0,5).forEach((c,i)=>{
      const strokeLen=(c.amount/totalExpenses)*C;
      const color=colors[i%colors.length];
      circles+=`<circle cx="85" cy="85" r="${R}" fill="none" stroke="${color}" stroke-width="22" stroke-dasharray="${strokeLen} ${C-strokeLen}" stroke-dashoffset="${-offset}"><title>${c.category}: AED ${money(c.amount)} (${c.percentage}%)</title></circle>`;
      offset+=strokeLen;
    });
  }
  return `<svg viewBox="0 0 170 170" width="100%" height="100%"><g transform="rotate(-90 85 85)">${circles}</g><text x="85" y="80" text-anchor="middle" font-size="11.5" font-weight="850" fill="#08264B">AED ${money(totalExpenses)}</text><text x="85" y="94" text-anchor="middle" font-size="8.5" font-weight="600" fill="#718698">Total Expenses</text></svg>`;
}

function renderProfitDashboard(){
  const metrics=calcCompanyMetrics(state.expensePeriod);
  const colors=['#08264B','#3D8FBD','#70B2DE','#A8D1EC','#C6E2F5'];

  const activeInvoices=(state.data.documents||[]).filter(d=>d.type==='invoice'&&d.status!=='cancelled');
  const monthSet=new Set([today().slice(0,7)]);
  const yearSet=new Set([today().slice(0,4)]);
  for(const d of activeInvoices){
    const ds=String(d.issue_date||d.created_at||'');
    if(/^\d{4}-\d{2}/.test(ds))monthSet.add(ds.slice(0,7));
    if(/^\d{4}/.test(ds))yearSet.add(ds.slice(0,4));
  }
  if(/^\d{4}-\d{2}$/.test(state.expensePeriod))monthSet.add(state.expensePeriod);
  if(/^\d{4}$/.test(state.expensePeriod))yearSet.add(state.expensePeriod);
  const formatMonthLabel=ym=>{try{return new Date(ym+'-01T12:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'});}catch{return ym;}};
  const periods=[
    ['all','All Time'],
    ...Array.from(monthSet).sort().reverse().map(m=>[m,formatMonthLabel(m)]),
    ...Array.from(yearSet).sort().reverse().map(y=>[y,'Year '+y])
  ];

  const catRowsHTML=metrics.categories.length?metrics.categories.slice(0,5).map((c,i)=>`<div class="donut-cat-row"><div class="donut-cat-name"><span class="donut-dot" style="background:${colors[i%colors.length]}"></span><span>${c.category}</span></div><div><span class="donut-cat-val">AED ${money(c.amount)}</span><span class="donut-cat-pct">(${c.percentage.toFixed(1)}%)</span></div></div>`).join(''):'<div style="color:var(--muted);font-size:12px;padding:12px 0">No expenses recorded for this period.</div>';

  let filteredSummaries=metrics.summaries;
  if(state.expenseProfitFilter==='profit')filteredSummaries=filteredSummaries.filter(s=>s.isProfitable);
  if(state.expenseProfitFilter==='loss')filteredSummaries=filteredSummaries.filter(s=>s.isLoss);
  if(state.expenseSearch){
    const q=state.expenseSearch.toLowerCase();
    filteredSummaries=filteredSummaries.filter(s=>[s.doc.number,s.doc.client_name,s.doc.project_title].join(' ').toLowerCase().includes(q));
  }

  const tableRowsHTML=filteredSummaries.length?filteredSummaries.map(s=>`<tr><td><a href="javascript:void(0)" data-open-tracker="${s.doc.id}" style="color:var(--blue);font-weight:800;text-decoration:underline">${esc(s.doc.number)}</a></td><td><strong>${esc(s.doc.client_name)}</strong></td><td>${money(s.invoiceTotal)}</td><td>${money(s.totalExpenses)}</td><td><span class="profit-margin-pill ${s.isLoss?'is-loss':''}">AED ${money(s.netProfit)}</span></td><td><span class="profit-margin-pill ${s.isLoss?'is-loss':''}">${s.profitMargin.toFixed(1)}%</span></td><td>${s.outstandingBalance<=0?'<span class="badge-confirmed">✓ Paid</span>':s.paymentReceived>0?'<span class="status partial">Partial</span>':'<span class="status sent">Unpaid</span>'}</td><td><button class="btn tiny secondary" data-open-tracker="${s.doc.id}">Track Expenses →</button></td></tr>`).join(''):`<tr><td colspan="8" style="text-align:center;padding:30px 10px;color:var(--muted)">No invoices found for the selected search and filter criteria.</td></tr>`;

  layout(`<div class="page-head"><div><div class="eyebrow">Financial Performance &amp; Job Profitability</div><h1 style="display:flex;align-items:center;gap:10px"><span>📈</span> Profit Dashboard</h1><p class="lede">Company-wide overview of revenue, expenses and profit across all invoices.</p></div><div class="button-row"><div style="display:flex;align-items:center;gap:7px"><span style="font-size:14px">📅</span><select class="select" id="periodSelect" style="font-weight:750;color:var(--navy);padding:9px 12px">${periods.map(([k,label])=>`<option value="${k}" ${state.expensePeriod===k?'selected':''}>${label}</option>`).join('')}</select></div></div></div>
  <div class="profit-metric-grid">
    <div class="profit-metric-card">
      <div class="profit-metric-card-head"><div class="profit-metric-icon-bubble bubble-revenue">📄</div><div class="profit-metric-title">Total Revenue</div></div>
      <div class="profit-metric-val">AED ${money(metrics.totalRevenue)}</div>
      <div class="profit-metric-trend neutral">${metrics.invoiceCount} active invoice${metrics.invoiceCount===1?'':'s'}</div>
    </div>
    <div class="profit-metric-card">
      <div class="profit-metric-card-head"><div class="profit-metric-icon-bubble bubble-expense">📉</div><div class="profit-metric-title">Total Expenses</div></div>
      <div class="profit-metric-val">AED ${money(metrics.totalExpenses)}</div>
      <div class="profit-metric-trend trend-expense">${metrics.expenseCount} expense entr${metrics.expenseCount===1?'y':'ies'}</div>
    </div>
    <div class="profit-metric-card">
      <div class="profit-metric-card-head"><div class="profit-metric-icon-bubble bubble-profit">📈</div><div class="profit-metric-title">Net Profit</div></div>
      <div class="profit-metric-val ${metrics.netProfit<0?'':'green'}">AED ${money(metrics.netProfit)}</div>
      <div class="profit-metric-trend">${metrics.profitMargin.toFixed(1)}% profit margin</div>
    </div>
    <div class="profit-metric-card">
      <div class="profit-metric-card-head"><div class="profit-metric-icon-bubble bubble-balance">👛</div><div class="profit-metric-title">Outstanding Balance</div></div>
      <div class="profit-metric-val">AED ${money(metrics.outstandingBalance)}</div>
      <div class="profit-metric-trend neutral">(${metrics.invoiceCount} invoices)</div>
    </div>
  </div>
  <div class="charts-grid">
    <div class="chart-card">
      <div class="chart-card-head">
        <h3 class="chart-card-title"><span>📊</span> Monthly Revenue vs Expenses</h3>
        <div class="chart-legend"><div class="legend-item"><span class="legend-dot legend-navy"></span> Revenue</div><div class="legend-item"><span class="legend-dot legend-blue"></span> Expenses</div></div>
      </div>
      <div style="height:190px">${barChartSVG(metrics.monthly)}</div>
    </div>
    <div class="chart-card">
      <div class="chart-card-head"><h3 class="chart-card-title"><span>🍩</span> Top Expense Categories</h3></div>
      <div class="donut-wrap"><div class="donut-svg-box">${donutChartSVG(metrics.categories,metrics.totalExpenses)}</div><div class="donut-categories-list">${catRowsHTML}</div></div>
    </div>
  </div>
  <div class="card section-card">
    <div class="section-top" style="flex-wrap:wrap;gap:12px">
      <h3 style="display:flex;align-items:center;gap:8px"><span>📋</span> Invoice Profit Summary</h3>
      <span class="text-link" id="viewAllInvoicesLink">View All Invoices →</span>
    </div>
    <div class="filter-bar" style="margin-bottom:14px">
      <div class="search">⌕ <input id="dashSearch" placeholder="Search invoice number, client..." value="${esc(state.expenseSearch)}"></div>
      <select class="select" id="dashProfitFilter"><option value="all" ${state.expenseProfitFilter==='all'?'selected':''}>All Margins</option><option value="profit" ${state.expenseProfitFilter==='profit'?'selected':''}>Profitable Only</option><option value="loss" ${state.expenseProfitFilter==='loss'?'selected':''}>In Loss Only</option></select>
    </div>
    <div class="table-scroll">
      <table class="doc-table">
        <thead>
          <tr>
            <th>Invoice No.</th>
            <th>Client</th>
            <th>Invoice Total (AED)</th>
            <th>Expense Total (AED)</th>
            <th>Net Profit (AED)</th>
            <th>Margin</th>
            <th>Payment Status</th>
            <th style="text-align:right">Actions</th>
          </tr>
        </thead>
        <tbody>${tableRowsHTML}</tbody>
      </table>
    </div>
  </div>`);

  $('#periodSelect').onchange=e=>{state.expensePeriod=e.target.value;render()};
  $('#dashSearch').oninput=e=>{state.expenseSearch=e.target.value;render()};
  $('#dashProfitFilter').onchange=e=>{state.expenseProfitFilter=e.target.value;render()};
  $('#viewAllInvoicesLink').onclick=()=>navigate('invoices');
  document.querySelectorAll('[data-open-tracker]').forEach(el=>el.onclick=()=>openExpenseTracker(el.dataset.openTracker));
}

function render(){switch(state.page){case 'overview':renderOverview();break;case 'documents':case 'quotations':case 'invoices':renderDocuments();break;case 'editor':renderEditor();break;case 'preview':renderPreview();break;case 'clients':renderClients();break;case 'settings':renderSettings();break;case 'profit_dashboard':renderProfitDashboard();break;case 'expense_tracker':renderExpenseTracker();break;default:navigate('overview')}}
(async function init(){try{await refresh();render()}catch(e){$('#app').innerHTML=`<main class="no-records"><h2>Unable to load RESQHOME Office</h2><p>${esc(e.message)}</p><button onclick="location.reload()">Retry</button></main>`}})();
