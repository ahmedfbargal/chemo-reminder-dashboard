(function(){
'use strict';
const SEED=JSON.parse(document.getElementById('data').textContent);
const DAY=86400000;
const iso=d=>d.toISOString().slice(0,10);
const P=s=>new Date(s+'T00:00:00Z');
const add=(s,n)=>iso(new Date(P(s).getTime()+n*DAY));
const diff=(a,b)=>Math.round((P(a)-P(b))/DAY);
const fd=(s,o)=>s?P(s).toLocaleDateString('en-GB',Object.assign({timeZone:'UTC',weekday:'short',day:'numeric',month:'short'},o||{})):'';
const fl=s=>fd(s,{weekday:'long',year:'numeric',month:'long'});
const fy=s=>fd(s,{year:'numeric'});
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const r2=x=>Math.round(x*100)/100;
function cairo(){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo'}).format(new Date())}catch(e){return iso(new Date())}}
function stamp(){try{return new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date())}catch(e){return new Date().toISOString()}}

/* ---------- drug classes ---------- */
const CLS={'Vincristine':'vinca','Daunorubicin':'anthra','Doxorubicin':'anthra','PEG-asparaginase':'aspa','Dexamethasone':'ster','IT methotrexate':'it','Oral methotrexate':'anti','Methotrexate (Capizzi)':'anti','Mercaptopurine':'anti','Cytarabine':'anti','Cyclophosphamide':'alky'};
const CLSN={vinca:'Vinca alkaloid',anthra:'Anthracycline',aspa:'Asparaginase',ster:'Steroid',it:'Intrathecal',anti:'Antimetabolite',alky:'Alkylator'};

/* ---------- schedule templates (days are phase days; D1 = first day of the phase) ---------- */
const AGE={basis:'age',unit:'mg',text:'By age: <2 yrs 8 mg; 2 yrs 10 mg; ≥3 yrs 12 mg'};
const bsa=(per,unit,text,cap,warn)=>({basis:'bsa',per,unit,text,cap:cap==null?null:cap,warn:warn||null});
const it=(days,x)=>Object.assign({drug:'IT methotrexate',route:'IT',days,dose:AGE,remind:true},x||{});
const vcr=(days,cap,x)=>Object.assign({drug:'Vincristine',route:'IV',days,dose:cap?bsa(1.5,'mg','1.5 mg/m² (max 2 mg)',2):bsa(1.5,'mg','1.5 mg/m² (no maximum stated in this file)',null,2),remind:true},x||{});
const peg=(days,x)=>Object.assign({drug:'PEG-asparaginase',route:'IM',days,dose:bsa(1000,'units','1000 units/m²'),remind:true},x||{});
const anth=(drug,days)=>({drug,route:'IV over 1 h',days,dose:bsa(25,'mg','25 mg/m²'),remind:true});
const cyc=days=>({drug:'Cyclophosphamide',route:'IV over 30 min',days,dose:bsa(1000,'mg','1000 mg/m²'),remind:true,note:'Hydration before and after per protocol'});
const arac=starts=>({drug:'Cytarabine',route:'IV',courses:starts.map(s=>[s,4]),dose:bsa(75,'mg/day','75 mg/m²/day × 4 days'),remind:true});
const dex=(starts,len,per,cap,note)=>({drug:'Dexamethasone',route:'Oral',courses:starts.map(s=>[s,len]),dose:bsa(per,'mg/day',per+' mg/m²/day in 2 doses'+(cap?' (max '+cap+' mg/day)':''),cap||null),remind:true,note});
const mp=(start,len,per,note)=>({drug:'Mercaptopurine',route:'Oral',courses:[[start,len]],dose:bsa(per,'mg/day',per+' mg/m²/day'),remind:true,note});
const omtx=days=>({drug:'Oral methotrexate',route:'Oral',days,dose:bsa(20,'mg','20 mg/m² once weekly'),remind:false,note:'Taken at home; no reminder'});
function maint(n){const out=[];for(let c=0;c<n;c++){const o=c*84;
  out.push(vcr([1,29,57].map(d=>d+o),true),dex([1,29,57].map(d=>d+o),5,6,null,'D1–5 with each vincristine pulse'),it([15+o]),
  omtx([1,8,22,29,36,43,50,57,64,71,78].map(d=>d+o)),mp(1+o,84,75,'Daily, 12-week cycle '+(c+1)));}return out}
const TPL=[
 {id:'A-IND',proto:'A-IND',label:'Regimen A: Induction',weeks:'Weeks 1–5',len:35,items:()=>[it([1,8,29]),vcr([2,9,16,23,30],true),peg([4,18]),dex([1],28,6,10,'Then taper over 7 days'),mp(29,7,75,'Only if ANC >0.75 & Plt >75; continues into consolidation')]},
 {id:'A-CONS',proto:'A-IND',label:'Regimen A: Consolidation',weeks:'Weeks 6–8',len:21,needsCounts:true,items:()=>[it([1,8,15]),mp(1,21,75,'Continues to end of week 8')]},
 {id:'A-IM1',proto:'A-IND',label:'Regimen A: Interim maintenance I',weeks:'Weeks 9–17',len:63,needsCounts:true,derived:true,items:()=>[vcr([1,29],true),dex([1,29],5,6,null,'D1–5 pulse'),it([15,43]),omtx([1,8,22,29,36,43,50,57])]},
 {id:'A-DI',proto:'A-DI',label:'Regimen A: Delayed intensification I',weeks:'Weeks 18–24',len:49,derived:true,items:()=>[it([1]),vcr([1,8,15]),anth('Doxorubicin',[1,8,15]),peg([4]),cyc([29]),arac([30,37])]},
 {id:'A-MNT',proto:'A-MNT',label:'Regimen A: Maintenance',weeks:'From week 25',cycles:true,needsCounts:true,derived:true,items:n=>maint(n)},
 {id:'B-IND',proto:'B-IND',label:'Regimen B: Induction',weeks:'Weeks 1–5',len:35,items:()=>[it([1,8,29]),vcr([2,9,16,23,30],true),anth('Daunorubicin',[2,9,16,23]),peg([4,18]),dex([1],28,6,10,'Then taper over 7 days')]},
 {id:'B-CONS',proto:'B-IND',label:'Regimen B: BFM consolidation',weeks:'Weeks 6–10',len:35,needsCounts:true,items:()=>[it([1,8,15]),cyc([1,15]),arac([2,9,16,23])]},
 {id:'B-IM',proto:'B-IMDI',label:'Regimen B: Interim maintenance',weeks:'Weeks 11–19',len:63,derived:true,items:()=>[it([1,29]),vcr([1,29]),dex([1,29],5,6,null,'D1–5 pulse'),omtx([8,15,22,36,43,50,57])]},
 {id:'B-DI',proto:'B-IMDI',label:'Regimen B: Delayed intensification',weeks:'Weeks 20–26',len:49,needsCounts:true,derived:true,items:()=>[it([1,29,36]),vcr([1,8,15]),dex([1,15],7,10,null,'D1–7 and D15–21'),anth('Doxorubicin',[1,8,15]),peg([4]),cyc([29]),arac([30,37])]},
 {id:'B-MNT',proto:'B-MNT',label:'Regimen B: Maintenance',weeks:'From week 27',cycles:true,needsCounts:true,derived:true,items:n=>maint(n)},
 {id:'C-CONS',proto:'C-CONS',label:'Regimen C: Consolidation phase II',weeks:'Weeks 6–15',len:70,derived:true,items:()=>[it([1,8,22],{note:'This file’s age bands differ; standard bands used pending your answer'}),vcr([15,22,43,50]),cyc([1,29]),arac([2,9,30,37]),peg([16,44])]},
 {id:'C-CAP',proto:'C-CAP',label:'Regimen C: Capizzi maintenance I',weeks:'Weeks 16–23',len:56,items:()=>[it([1,31]),vcr([2,12,22,32,42]),{drug:'Methotrexate (Capizzi)',route:'IV',days:[2,12,22,32,42],perDay:[100,150,200,250,300],dose:{basis:'bsa',unit:'mg',text:'Escalating 100 → 300 mg/m²'},remind:true},peg([3,23])]},
 {id:'C-DI',proto:'C-CAP',label:'Regimen C: Delayed intensification I',weeks:'Weeks 24–31',len:56,needsCounts:true,derived:true,items:()=>[it([1,29,36]),vcr([1,8,15,43,50]),peg([4,43]),anth('Doxorubicin',[1,8,15]),cyc([29]),arac([30,37])]},
 {id:'C-MNT',proto:'C-MNT',label:'Regimen C: Maintenance',weeks:'From week 32',cycles:true,needsCounts:true,derived:true,items:n=>maint(n)}
];
const TPLID=Object.fromEntries(TPL.map(t=>[t.id,t]));
let uid=0;const nid=p=>p+'-'+Date.now().toString(36)+'-'+(uid++).toString(36);
function buildPhase(code,tid,start,cycles){
  const t=TPLID[tid];const phaseId=nid(code+'-'+tid);const evs=[];
  t.items(cycles||2).forEach(it=>{
    const base={drug:it.drug,cls:CLS[it.drug]||'anti',route:it.route,remind:it.remind,note:it.note||'',derived:!!t.derived,phaseId,tpl:tid,phase:t.label,
      state:'scheduled',actualDate:null,origDate:null,reason:'',mod:null,verified:false};
    (it.days||[]).forEach((d,i)=>{const dose=clone(it.dose);if(it.perDay){dose.per=it.perDay[i];dose.text=it.perDay[i]+' mg/m² (dose '+(i+1)+' of 5)'}
      evs.push(Object.assign({},base,{id:nid(code),kind:'dose',day:d,date:add(start,d-1),dose}))});
    (it.courses||[]).forEach(([s,l])=>evs.push(Object.assign({},base,{id:nid(code),kind:'course',day:s,len:l,date:add(start,s-1),end:add(start,s+l-2),dose:clone(it.dose)})));
  });
  evs.sort((a,b)=>a.date.localeCompare(b.date)||a.drug.localeCompare(b.drug));
  return {phase:{id:phaseId,tpl:tid,label:t.label,weeks:t.weeks,start,cycles:t.cycles?(cycles||2):null},events:evs};
}

/* ---------- state ---------- */
let saved=hydrate(clone(SEED));
let S=clone(saved);
let dirty=0;
let asOf=cairo();
const ui={view:'overview',patient:null,calMonth:null,calSel:null,calPatient:'all',calCls:'all',calStatus:'all',pq:'',pstatus:'all',reg:'all',prq:'',emailDate:null,logTab:'rem',logPt:'all'};
const shared=window.chemoSharedStore;
let canWrite=false;
let busy=false;
let revision=0;
let pendingWrite=null;
let sharedNotice='';
const DL={save({filename,data}){
  const url=URL.createObjectURL(new Blob([data],{type:'text/plain;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;link.download=filename;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}};

function hydrate(d){
  if(!d.patients)d.patients=[];if(!d.sent_log)d.sent_log=[];if(!d.audit)d.audit=[];if(!d.settings)d.settings={lead:5};
  d.patients.forEach(p=>{
    if(!p.events){p.events=[];p.phases=[];(p.seedPhases||[]).forEach(sp=>{const b=buildPhase(p.code,sp.tpl,sp.start,sp.cycles);p.phases.push(b.phase);p.events.push(...b.events)});
      const snap=d.snapshot;
      if(p.demoConfirmBefore)p.events.forEach(e=>{if(e.date<p.demoConfirmBefore){e.state='administered';e.actualDate=e.date;e.verified=true;e.reason='Demo: recorded as given'}});
      (p.demoHold||[]).forEach(h=>{const e=p.events.find(e=>e.drug===h.drug&&e.day===h.day);if(e){e.state='held';e.reason=h.reason}});
      p.events.forEach(e=>{if(!e.remind)return;const r=add(e.date,-d.settings.lead);if(r>=p.registered&&r<snap&&e.state!=='held')d.sent_log.push({eventId:e.id,patient:p.code,drug:e.drug,date:e.date,sentOn:r,method:'gmail',demo:true})});
      delete p.seedPhases;delete p.demoConfirmBefore;delete p.demoHold;}
    if(!p.history)p.history=[];if(!p.items)p.items=[];
  });
  return d;
}
const lead=()=>S.settings.lead||5;
const pt=code=>S.patients.find(p=>p.code===code);
const ALL=()=>{const a=[];S.patients.forEach(p=>p.events.forEach(e=>a.push({p,e})));return a.sort((x,y)=>x.e.date.localeCompare(y.e.date)||x.p.code.localeCompare(y.p.code))};
const sentFor=e=>S.sent_log.find(s=>s.eventId===e.id&&s.date===e.date);
const live=e=>e.state==='scheduled'||e.state==='delayed';
function rem(e){
  if(!e.remind)return{k:'none',t:'No reminder (home medicine)',c:'t-na'};
  if(!live(e))return{k:'na',t:'No reminder needed',c:'t-na'};
  const s=sentFor(e);if(s)return{k:'sent',t:(s.method==='gmail'?'Sent ':'Marked sent ')+fd(s.sentOn),c:'t-sent'};
  if(e.date<asOf)return{k:'past',t:'Date passed',c:'t-na'};
  const r=add(e.date,-lead());
  if(r===asOf)return{k:'due',t:'Reminder due today',c:'t-due'};
  if(r<asOf)return{k:'miss',t:'Reminder missed',c:'t-miss'};
  return{k:'plan',t:'Reminder '+fd(r),c:'t-plan'};
}
const STATE={scheduled:['Scheduled','t-plan'],delayed:['Rescheduled','t-plan'],administered:['Given','t-sent'],held:['Held','t-due'],cancelled:['Cancelled','t-na']};
function stateTag(e){if(!e.remind&&live(e))return'<span class="tag t-na">Home dose</span>';if(live(e)&&e.date<asOf)return'<span class="tag t-wait">Needs confirmation</span>';const s=STATE[e.state];return'<span class="tag '+s[1]+'">'+s[0]+(e.state==='administered'&&e.actualDate&&e.actualDate!==e.date?' '+fd(e.actualDate):'')+'</span>'}
function calc(e,p){
  if(e.mod)return{v:e.mod.value,u:e.mod.unit,f:'Physician-approved modified dose',type:'Physician-approved modified'};
  const d=e.dose;
  if(d.basis==='age'){if(p.age==null||p.age==='')return{miss:'Age needed'};const v=p.age<2?8:p.age<3?10:12;return{v,u:'mg',f:'Age '+p.age+' yrs → '+(p.age<2?'<2 yrs':p.age<3?'2 yrs':'≥3 yrs')+' band',type:'Patient-specific'}}
  if(d.basis==='bsa'){if(!p.bsa)return{miss:'BSA needed'};const raw=r2(d.per*p.bsa);let v=raw,capped=false;if(d.cap!=null&&raw>d.cap){v=d.cap;capped=true}
    return{v,u:d.unit,raw,capped,cap:d.cap,f:d.per+' × '+p.bsa+' m²'+(capped?' = '+raw+', capped at '+d.cap:''),type:'Patient-calculated',warn:d.warn&&raw>d.warn?'Above '+d.warn+' '+d.unit+'; this file states no maximum':null}}
  return{v:null,f:d.text};
}
function doseHTML(e,p,brief){const c=calc(e,p);
  if(c.miss)return'<span class="warnt">'+c.miss+'</span><div class="sub">'+esc(e.dose.text)+'</div>';
  return'<div class="dose"><b>'+esc(c.v)+' '+esc(c.u)+'</b>'+(e.mod?' <span class="tag t-wait">Modified</span>':'')+(e.verified?' <span class="tag t-sent">Verified</span>':'')+'</div>'+(brief?'':'<div class="sub">'+esc(c.f)+'</div><div class="sub">Protocol: '+esc(e.dose.text)+'</div>')+(c.warn?'<div class="warnt">'+esc(c.warn)+'</div>':'');}
const lbl=e=>e.kind==='course'?e.drug+' ('+(e.len===1?'1 day':e.len+' days')+')':e.drug;
const short=c=>c.replace('HEM-','');

/* ---------- metrics ---------- */
function metrics(){const a=ALL();const out={due:[],miss:[],week:[],wait:[],q:0,items:0};
  a.forEach(x=>{const r=rem(x.e);if(r.k==='due')out.due.push(x);if(r.k==='miss')out.miss.push(x);
    if(x.e.remind&&live(x.e)&&x.e.date>=asOf&&x.e.date<=add(asOf,7))out.week.push(x);if(x.e.remind&&live(x.e)&&x.e.date<asOf)out.wait.push(x)});
  S.protocols.forEach(p=>p.flags.forEach(f=>{if(!f.resolved)out.q++}));
  S.patients.forEach(p=>p.items.forEach(i=>{if(!i.done)out.items++}));return out}

/* ---------- icons ---------- */
const I={
 overview:'<path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z"/>',
 calendar:'<path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 7H5v10h14V9Z"/>',
 patients:'<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9c0-3.3 3.1-6 7-6s7 2.7 7 6v1H2v-1Zm15-9a3 3 0 1 0 0-6v6Zm1.5 3.2c2.1.7 3.5 2.6 3.5 4.8v2h-3v-1c0-2.3-.2-4.2-.5-5.8Z"/>',
 protocols:'<path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1.5V8h4.5L14 3.5ZM8 12v2h8v-2H8Zm0 4v2h6v-2H8Z"/>',
 email:'<path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm9 7.2L4.4 7H4v1.3l8 5.5 8-5.5V7h-.4L12 12.2Z"/>',
 log:'<path d="M4 4h16v2H4V4Zm0 5h16v2H4V9Zm0 5h10v2H4v-2Zm0 5h10v2H4v-2Zm13-4.5 1.4-1.4 1.6 1.6 1.6-1.6L23 14.5 21.4 16l1.6 1.6-1.4 1.4-1.6-1.6-1.6 1.6-1.4-1.4L18.6 16 17 14.5Z"/>',
 settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 5.4v-2.8l-2.3-.5a7 7 0 0 0-.7-1.6l1.3-2-2-2-2 1.3a7 7 0 0 0-1.6-.7L13.4 3h-2.8l-.5 2.3a7 7 0 0 0-1.6.7l-2-1.3-2 2 1.3 2a7 7 0 0 0-.7 1.6L3 10.6v2.8l2.3.5c.2.6.4 1.1.7 1.6l-1.3 2 2 2 2-1.3c.5.3 1 .5 1.6.7l.5 2.3h2.8l.5-2.3c.6-.2 1.1-.4 1.6-.7l2 1.3 2-2-1.3-2c.3-.5.5-1 .7-1.6l2.3-.5Z"/>',
 warn:'<path d="M12 2 1 21h22L12 2Zm1 15h-2v2h2v-2Zm0-8h-2v6h2V9Z"/>',
 mail:'<path d="M3 5h18v14H3V5Zm9 7L5 7.5V17h14V7.5L12 12Z"/>',
 check:'<path d="m9.5 16.2-4.2-4.2-1.4 1.4 5.6 5.6L21 7.5l-1.4-1.4z"/>',
 drop:'<path d="M12 2s7 7.6 7 12.5A7 7 0 0 1 5 14.5C5 9.6 12 2 12 2Zm-3 13a3 3 0 0 0 3 3v-2a1 1 0 0 1-1-1H9Z"/>'};
const icon=(n,s)=>'<svg width="'+(s||18)+'" height="'+(s||18)+'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'+I[n]+'</svg>';

/* ---------- layout ---------- */
const VIEWS=[['overview','Overview'],['calendar','Calendar'],['patients','Patients'],['protocols','Protocols'],['email','Email'],['log','Reminder log'],['settings','Settings']];
const TITLES={overview:'Overview',calendar:'Treatment calendar',patients:'Patients',protocols:'Protocols',email:'Reminder email',log:'Reminder log',settings:'Settings'};
function render(){
  if(!canWrite){renderSignIn();return}
  const m=metrics();
  const cnt={overview:m.due.length+m.miss.length?'<span class="cnt '+(m.miss.length?'red':'hot')+'">'+(m.due.length+m.miss.length)+'</span>':'',patients:'<span class="cnt">'+S.patients.length+'</span>',protocols:m.q?'<span class="cnt hot">'+m.q+'</span>':'',email:m.due.length?'<span class="cnt hot">1</span>':''};
  const nav=VIEWS.map(([k,l])=>'<a href="#'+k+'"'+(ui.view===k?' aria-current="page"':'')+'>'+icon(k)+'<span class="lbl">'+l+'</span>'+(cnt[k]||'')+'</a>').join('');
  const mode='<span class="pill edit"><span class="dot"></span>Shared board</span>';
  const disabled=busy?' disabled':'';
  const save='<button class="btn" data-act="shared-load"'+disabled+'>Load shared version</button>'+
    '<button class="btn" data-act="shared-signout"'+disabled+'>Sign out</button>'+
    '<button class="btn" data-act="discard"'+(dirty?disabled:' disabled')+'>Discard</button>'+
    '<button class="btn pri" data-act="save"'+(dirty?disabled:' disabled')+'>'+
    (busy?'Please wait…':dirty?'Save changes <span class="badge">'+dirty+'</span>':'All changes saved')+'</button>';
  document.getElementById('root').innerHTML=
   '<div class="app"><aside class="side"><div class="brand"><span class="mark">'+icon('drop',20).replace('currentColor','#fff')+'</span><div><b>Chemo board</b><small>Hematology pharmacy</small></div></div><nav class="nav" aria-label="Sections">'+nav+'</nav>'+
   '<div class="foot"><b>UKALL 2011</b><br>Reminders '+lead()+' days ahead<br>Africa/Cairo time<br>'+(S.savedAt?'Saved '+esc(S.savedAt):'Demo data')+'</div></aside>'+
   '<div class="main"><div class="top"><div class="topin"><h1>'+TITLES[ui.view]+'</h1><label class="asof">As of <input type="date" id="asof" value="'+asOf+'"></label>'+(asOf!==cairo()?'<button class="btn sm" data-act="today">Back to today</button>':'')+mode+save+'</div></div>'+
   '<div class="content" id="view">'+V[ui.view](m)+'</div></div></div>';
  document.getElementById('asof').addEventListener('change',ev=>{if(ev.target.value){asOf=ev.target.value;ui.emailDate=null;render()}});
}
function banner(){
  let h='';
  h+='<div class="banner">'+icon('warn',16)+'<span><b>Demo workspace.</b> Use fictional records. For workflow testing only.</span></div>';
  if(sharedNotice)h+='<div class="banner" role="status">'+esc(sharedNotice)+'</div>';
  return h;
}

/* ---------- views ---------- */
const V={};
V.overview=function(m){
  const target=add(asOf,lead());
  let st='';for(let i=0;i<=lead();i++){const d=add(asOf,i);const xs=ALL().filter(x=>x.e.date===d&&x.e.remind&&x.e.state!=='cancelled');
    st+='<div class="stn '+(i===0?'t0':i===lead()?'t'+5:'')+'"><div class="node"><span>'+(i===0?'0':i)+'</span></div><div class="dl">'+fd(d)+'</div><div class="ds">'+(i===0?'Today':i===lead()?'In today’s email':'In '+i+' day'+(i>1?'s':''))+'</div><div class="items">'+
    (xs.length?xs.map(x=>{const r=rem(x.e);return'<button class="drug cls-'+x.e.cls+' '+(r.k==='miss'||r.k==='due'?r.k:'')+'" data-act="ev" data-p="'+esc(x.p.code)+'" data-e="'+x.e.id+'"><span class="cd"></span><span><b>'+esc(short(x.p.code))+'</b> '+esc(x.e.drug)+'</span></button>'}).join(''):'<div class="none">Nothing scheduled</div>')+'</div></div>'}
  let h=banner()+'<div class="kpis">'+
   kpi('due',m.due.length,'Reminder items due today','email')+kpi('miss',m.miss.length,'Missed reminders','miss')+kpi('week',m.week.length,'Doses in the next 7 days','calendar')+kpi('wait',m.wait.length,'Doses awaiting confirmation','wait')+kpi('q',m.q+m.items,'Open questions','protocols')+'</div>';
  h+='<div class="sec"><div class="sechead"><h2>Five-day runway</h2><p>Each dose reaches this track five days before it is given. Select a dose to manage it.</p></div><div class="panel runway"><div class="track">'+st+'</div></div></div>';
  if(m.miss.length)h+='<div class="sec" id="miss"><div class="panel alert"><div class="alerthead"><span class="ic">'+icon('warn')+'</span><div><h3>'+m.miss.length+' dose'+(m.miss.length>1?'s':'')+' inside the five-day window with no reminder</h3><p class="sub" style="margin:2px 0 0">Prepare these now, then mark the reminder as handled from the Email tab or the dose itself.</p></div></div>'+evTable(m.miss,{rem:true,why:true})+'</div></div>';
  const tp=[...new Set(m.due.map(x=>x.p.code))];
  h+='<div class="sec two"><div><div class="sechead"><h2>Today’s reminder email</h2></div><div class="panel mailcard '+(m.due.length?'':'ok')+'"><span class="ic">'+icon(m.due.length?'mail':'check',22)+'</span><div style="flex:1;min-width:0">'+
   (m.due.length?'<h3>'+tp.length+' patient'+(tp.length>1?'s':'')+' for '+fl(target)+'</h3><div class="sub">'+esc(tp.join(', '))+'. '+m.due.length+' item'+(m.due.length>1?'s':'')+'.</div>':'<h3>No email needed today</h3><div class="sub">Nothing is scheduled for '+fl(target)+'.</div>')+
   '</div>'+(m.due.length?'<a class="btn pri" href="#email">Open email</a>':'')+'</div>'+
   '<div class="sechead" style="margin-top:22px" id="waitlist"><h2>Awaiting confirmation</h2><p>Past doses not yet recorded as given, held or cancelled.</p></div><div class="panel">'+
   (m.wait.length?'<div class="list">'+m.wait.slice(0,8).map(x=>'<div class="li"><span class="cdot cls-'+x.e.cls+'"></span><div class="grow"><b>'+esc(x.p.code)+'</b> '+esc(lbl(x.e))+'<div class="sub">'+fd(x.e.date)+', '+esc(x.e.phase)+' D'+x.e.day+'</div></div>'+(canWrite?'<button class="btn sm" data-act="quickgiven" data-p="'+esc(x.p.code)+'" data-e="'+x.e.id+'">Confirm given</button>':'')+'<button class="btn sm ghost" data-act="ev" data-p="'+esc(x.p.code)+'" data-e="'+x.e.id+'">Manage</button></div>').join('')+'</div>'+(m.wait.length>8?'<div class="sub" style="padding:8px 16px 12px">'+(m.wait.length-8)+' more in Patients.</div>':''):'<div class="empty"><b>All past doses are recorded</b>Nothing is waiting for confirmation.</div>')+'</div></div>'+
   '<div><div class="sechead"><h2>Patients at a glance</h2></div><div class="panel"><div class="list">'+S.patients.map(p=>{const nx=p.events.find(e=>e.remind&&live(e)&&e.date>=asOf);return'<div class="li" style="cursor:pointer" data-act="openpt" data-p="'+esc(p.code)+'"><div class="grow"><b>'+esc(p.code)+'</b><div class="sub">'+esc(curPhase(p))+'</div></div><div style="text-align:right"><div class="small"><b>'+(nx?fd(nx.date):'—')+'</b></div><div class="sub">'+(nx?esc(nx.drug):'No upcoming dose')+'</div></div></div>'}).join('')+'</div></div></div></div>';
  h+='<div class="sec"><div class="sechead"><h2>Next seven days</h2><div class="row"><a class="btn sm" href="#calendar">Open calendar</a></div></div><div class="panel">'+(m.week.length?evTable(m.week,{rem:true}):'<div class="empty"><b>No doses this week</b>The calendar shows the weeks after.</div>')+'</div></div>';
  return h;
};
function kpi(cls,v,l,go){return'<button class="kpi '+cls+'" data-act="kpi" data-go="'+go+'"><span class="v">'+v+'</span><span class="l">'+l+'</span></button>'}
function curPhase(p){const ph=p.phases[p.phases.length-1];return ph?ph.label:'No phase'}
function evTable(xs,o){
  return'<div class="tw"><table><thead><tr><th>Date</th><th>Patient</th><th>Drug</th><th>Route</th><th>Dose (reference)</th><th>'+(o.rem?'Reminder':'Status')+'</th><th></th></tr></thead><tbody>'+xs.map(x=>{const r=rem(x.e);
   return'<tr class="click" data-act="ev" data-p="'+esc(x.p.code)+'" data-e="'+x.e.id+'"><td><b>'+fd(x.e.date)+'</b><div class="sub">'+esc(x.e.phase)+', D'+x.e.day+'</div></td><td class="nw">'+esc(x.p.code)+'</td><td><span class="cdot cls-'+x.e.cls+'"></span>'+esc(lbl(x.e))+(x.e.end?'<div class="sub">to '+fd(x.e.end)+'</div>':'')+'</td><td>'+esc(x.e.route)+'</td><td>'+doseHTML(x.e,x.p)+'</td><td>'+(o.rem?'<span class="tag '+r.c+'">'+r.t+'</span>':stateTag(x.e))+(o.why&&x.p.registered>add(x.e.date,-lead())?'<div class="sub" style="margin-top:4px">Registered '+fd(x.p.registered)+', after the reminder date</div>':'')+'</td><td><span class="btn sm ghost">Manage</span></td></tr>'}).join('')+'</tbody></table></div>';
}
V.calendar=function(){
  if(!ui.calMonth)ui.calMonth=asOf.slice(0,7);
  const [y,mo]=ui.calMonth.split('-').map(Number);const first=y+'-'+String(mo).padStart(2,'0')+'-01';
  const dow=(P(first).getUTCDay()+6)%7;const gs=add(first,-dow);
  const filt=x=>(ui.calPatient==='all'||x.p.code===ui.calPatient)&&(ui.calCls==='all'||x.e.cls===ui.calCls)&&(ui.calStatus==='all'||(ui.calStatus==='open'?live(x.e):x.e.state===ui.calStatus))&&(x.e.remind||ui.calShowOral);
  const all=ALL().filter(filt);
  let cells='';['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(w=>cells+='<div class="wd">'+w+'</div>');
  for(let i=0;i<42;i++){const d=add(gs,i);const xs=all.filter(x=>x.e.date===d);const out=d.slice(0,7)!==ui.calMonth;
    cells+='<button class="cell'+(out?' out':'')+(d===asOf?' today':'')+(d===ui.calSel?' sel':'')+'" data-act="calday" data-d="'+d+'" aria-label="'+fl(d)+', '+xs.length+' items"><span class="dn">'+P(d).getUTCDate()+'</span>'+
    xs.slice(0,3).map(x=>{const r=rem(x.e);return'<span class="ev cls-'+x.e.cls+' '+(r.k==='miss'||r.k==='due'?r.k:'')+(live(x.e)?'':' done')+'"><span class="cd"></span><span>'+esc(short(x.p.code))+' '+esc(x.e.drug)+'</span></span>'}).join('')+(xs.length>3?'<span class="more">+'+(xs.length-3)+' more</span>':'')+'</button>';}
  const sel=ui.calSel||asOf;const sx=all.filter(x=>x.e.date===sel||(x.e.end&&x.e.date<sel&&x.e.end>=sel&&x.e.kind==='course'));
  const opts=['<option value="all">All patients</option>'].concat(S.patients.map(p=>'<option'+(ui.calPatient===p.code?' selected':'')+' value="'+esc(p.code)+'">'+esc(p.code)+'</option>')).join('');
  const clsChips=['all'].concat(Object.keys(CLSN)).map(c=>'<button class="chip" data-act="calcls" data-v="'+c+'" aria-pressed="'+(ui.calCls===c)+'">'+(c==='all'?'All drugs':'<span class="cdot cls-'+c+'"></span>'+CLSN[c])+'</button>').join('');
  return banner()+'<div class="calhead"><h2>'+P(first).toLocaleDateString('en-GB',{timeZone:'UTC',month:'long',year:'numeric'})+'</h2><button class="btn sm" data-act="calnav" data-v="-1" aria-label="Previous month">‹</button><button class="btn sm" data-act="calnav" data-v="0">This month</button><button class="btn sm" data-act="calnav" data-v="1" aria-label="Next month">›</button><span class="spacer"></span>'+
   '<select class="input" style="width:auto" id="calpt">'+opts+'</select><select class="input" style="width:auto" id="calst">'+[['all','Any status'],['open','Not yet given'],['administered','Given'],['held','Held'],['cancelled','Cancelled']].map(o=>'<option value="'+o[0]+'"'+(ui.calStatus===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select>'+
   '<label class="check" style="margin:0"><input type="checkbox" id="caloral"'+(ui.calShowOral?' checked':'')+'> Show home oral doses</label></div>'+
   '<div class="filters">'+clsChips+'</div>'+
   '<div class="calgrid"><div><div class="month">'+cells+'</div><div class="legend"><span><span class="tag t-due">Amber</span> reminder due today</span><span><span class="tag t-miss">Red</span> reminder missed</span><span>Struck through: given, held or cancelled</span></div></div>'+
   '<div class="panel"><div class="pad" style="border-bottom:1px solid var(--line)"><h3>'+fl(sel)+'</h3><div class="sub">'+sx.length+' item'+(sx.length===1?'':'s')+(sx.some(x=>x.e.date!==sel)?', including ongoing oral courses':'')+'</div></div>'+
   (sx.length?'<div class="list">'+sx.map(x=>{const r=rem(x.e);return'<div class="li" style="cursor:pointer" data-act="ev" data-p="'+esc(x.p.code)+'" data-e="'+x.e.id+'"><span class="cdot cls-'+x.e.cls+'"></span><div class="grow"><b>'+esc(x.p.code)+'</b> '+esc(lbl(x.e))+'<div class="sub">'+esc(x.e.route)+', '+esc(x.e.phase)+' D'+x.e.day+(x.e.date!==sel?', started '+fd(x.e.date):'')+'</div><div style="margin-top:4px" class="row">'+stateTag(x.e)+(x.e.date===sel?' <span class="tag '+r.c+'">'+r.t+'</span>':'')+'</div></div></div>'}).join('')+'</div>':'<div class="empty"><b>Nothing on this day</b>Select another day in the month.</div>')+'</div></div>';
};
V.patients=function(){
  if(ui.patient&&pt(ui.patient))return patientDetail(pt(ui.patient));
  const q=ui.pq.toLowerCase();
  const ps=S.patients.filter(p=>(ui.pstatus==='all'||p.status===ui.pstatus)&&(!q||(p.code+' '+p.diagnosis+' '+curPhase(p)).toLowerCase().includes(q)));
  return banner()+'<div class="filters"><input class="input search" id="pq" placeholder="Search code, diagnosis or phase" value="'+esc(ui.pq)+'" aria-label="Search patients">'+
   [['all','All'],['active','Active'],['held','On hold'],['completed','Completed'],['off','Off protocol']].map(o=>'<button class="chip" data-act="pstatus" data-v="'+o[0]+'" aria-pressed="'+(ui.pstatus===o[0])+'">'+o[1]+'</button>').join('')+
   '<span class="spacer"></span>'+(canWrite?'<button class="btn pri" data-act="addpt">Add patient</button>':'')+'</div>'+
   (ps.length?'<div class="pgrid">'+ps.map(p=>{const ph=p.phases[p.phases.length-1];const pe=p.events.filter(e=>e.phaseId===(ph&&ph.id));const done=pe.filter(e=>!live(e)).length;const nx=p.events.find(e=>e.remind&&live(e)&&e.date>=asOf);const w=p.events.filter(e=>e.remind&&live(e)&&e.date<asOf).length;
    return'<button class="pcard" data-act="openpt" data-p="'+esc(p.code)+'"><div class="row"><span class="code">'+esc(p.code)+'</span><span class="spacer"></span>'+statusTag(p)+'</div><div class="sub">'+esc(p.diagnosis)+'</div>'+
    '<div class="meta"><span>Phase</span><span>'+esc(curPhase(p))+'</span><span>Next dose</span><span>'+(nx?esc(nx.drug)+', '+fd(nx.date):'None scheduled')+'</span><span>To confirm</span><span>'+(w?'<b style="color:var(--wait)">'+w+' past dose'+(w>1?'s':'')+'</b>':'None')+'</span><span>Open items</span><span>'+p.items.filter(i=>!i.done).length+'</span></div>'+
    '<div class="prog" title="'+done+' of '+pe.length+' phase items recorded"><i style="width:'+(pe.length?Math.round(done/pe.length*100):0)+'%"></i></div><div class="sub" style="margin-top:5px">'+done+' of '+pe.length+' items in this phase recorded</div></button>'}).join('')+'</div>'
   :'<div class="panel empty"><b>No patients match</b>'+(canWrite?'Clear the search or add a patient.':'Clear the search to see all patients.')+'</div>');
};
function statusTag(p){const m={active:['Active','t-sent'],held:['On hold','t-due'],completed:['Completed','t-na'],off:['Off protocol','t-miss']}[p.status]||['Active','t-sent'];return'<span class="tag '+m[1]+'">'+m[0]+'</span>'}
function patientDetail(p){
  const w=canWrite;
  let h=banner()+'<div class="row" style="margin-bottom:12px"><button class="btn sm" data-act="back">‹ All patients</button></div>'+
   '<div class="panel"><div class="phead"><div style="flex:1;min-width:240px"><div class="row"><span class="code">'+esc(p.code)+'</span>'+statusTag(p)+'</div><div class="muted">'+esc(p.diagnosis)+'</div>'+
   '<div class="facts"><div><span>Current phase</span><b>'+esc(curPhase(p))+'</b></div><div><span>Age</span><b>'+(p.age!=null&&p.age!==''?p.age+' yrs':'Not set')+'</b></div><div><span>BSA</span><b>'+(p.bsa?p.bsa+' m²':'Not set')+'</b></div><div><span>Registered</span><b>'+fd(p.registered,{year:'numeric'})+'</b></div></div></div>'+
   (w?'<div class="row"><button class="btn" data-act="editpt" data-p="'+esc(p.code)+'">Edit details</button><button class="btn" data-act="addphase" data-p="'+esc(p.code)+'">Add next phase</button><button class="btn warn" data-act="delpt" data-p="'+esc(p.code)+'">Delete</button></div>':'')+'</div></div>';
  p.phases.slice().reverse().forEach(ph=>{const es=p.events.filter(e=>e.phaseId===ph.id);
    h+='<div class="panel phase"><div class="ph"><h3>'+esc(ph.label)+'</h3><span class="sub">'+esc(ph.weeks)+', D1 '+fd(ph.start,{year:'numeric'})+(ph.cycles?', '+ph.cycles+' cycles':'')+'</span><span class="spacer"></span>'+(TPLID[ph.tpl]&&TPLID[ph.tpl].derived?'<span class="tag t-wait" title="The hospital grid marks weeks only; days were placed at the start of each marked week">Days from weekly grid</span>':'')+(w?'<button class="btn sm warn" data-act="delphase" data-p="'+esc(p.code)+'" data-ph="'+ph.id+'">Remove phase</button>':'')+'</div>'+
    '<div class="tw"><table><thead><tr><th>Day</th><th>Date</th><th>Drug</th><th>Route</th><th>Dose (reference)</th><th>Status</th><th>Reminder</th></tr></thead><tbody>'+es.map(e=>{const r=rem(e);return'<tr class="click" data-act="ev" data-p="'+esc(p.code)+'" data-e="'+e.id+'"><td>D'+e.day+'</td><td><b>'+fd(e.date)+'</b>'+(e.end?'<div class="sub">to '+fd(e.end)+'</div>':'')+(e.origDate?'<div class="sub">was '+fd(e.origDate)+'</div>':'')+'</td><td><span class="cdot cls-'+e.cls+'"></span>'+esc(lbl(e))+(e.note?'<div class="sub">'+esc(e.note)+'</div>':'')+(e.reason?'<div class="sub"><i>'+esc(e.reason)+'</i></div>':'')+'</td><td>'+esc(e.route)+'</td><td>'+doseHTML(e,p,true)+'</td><td>'+stateTag(e)+'</td><td><span class="tag '+r.c+'">'+r.t+'</span></td></tr>'}).join('')+'</tbody></table></div></div>';});
  h+='<div class="sec two"><div class="panel pad"><div class="row"><h3>Open items</h3><span class="spacer"></span></div><ul class="items-check" style="margin-top:6px">'+(p.items.length?p.items.map((it,i)=>'<li class="'+(it.done?'done':'')+'">'+(w?'<input type="checkbox" data-act="itemdone" data-i="'+i+'"'+(it.done?' checked':'')+' aria-label="Mark resolved">':'<span>'+(it.done?'✓':'•')+'</span>')+'<span style="flex:1">'+esc(it.text)+'</span>'+(w?'<button class="btn sm ghost" data-act="itemdel" data-i="'+i+'" aria-label="Remove item">Remove</button>':'')+'</li>').join(''):'<li class="muted">No open items.</li>')+'</ul>'+
   (w?'<div class="row" style="margin-top:8px"><input class="input" id="newitem" placeholder="Add an item to review, e.g. missing lab result" style="flex:1"><button class="btn" data-act="itemadd">Add</button></div>':'')+'</div>'+
   '<div class="panel pad"><h3>Change history</h3><div style="margin-top:8px">'+(p.history.length?p.history.slice().reverse().slice(0,12).map(x=>'<div style="padding:6px 0;border-top:1px solid var(--line2)"><div class="small">'+esc(x.text)+'</div><div class="sub">'+esc(x.at)+'</div></div>').join(''):'<div class="muted small">No changes recorded yet.</div>')+'</div></div></div>';
  return h;
}
V.protocols=function(){
  const q=ui.prq.toLowerCase();
  const ps=S.protocols.filter(p=>(ui.reg==='all'||p.regimen===ui.reg)&&(!q||JSON.stringify(p).toLowerCase().includes(q)));
  const open=S.protocols.reduce((n,p)=>n+p.flags.filter(f=>!f.resolved).length,0);
  return banner()+'<div class="filters">'+[['all','All regimens'],['A','Regimen A'],['B','Regimen B'],['C','Regimen C']].map(o=>'<button class="chip" data-act="reg" data-v="'+o[0]+'" aria-pressed="'+(ui.reg===o[0])+'">'+o[1]+'</button>').join('')+
   '<input class="input search" id="prq" placeholder="Search drug or file" value="'+esc(ui.prq)+'" aria-label="Search protocols"><span class="spacer"></span><span class="sub">'+open+' open question'+(open===1?'':'s')+', '+S.protocols.filter(p=>p.reviewed).length+' of '+S.protocols.length+' reviewed</span></div>'+
   (ps.length?ps.map(p=>{const tpls=TPL.filter(t=>t.proto===p.id);const uo=p.flags.filter(f=>!f.resolved).length;
    return'<div class="panel pr"><div class="prh"><span class="reg '+p.regimen+'">'+p.regimen+'</span><div style="flex:1;min-width:220px"><h3>'+esc(p.phase)+'</h3><div class="sub">Weeks '+esc(p.weeks)+'. '+esc(p.file)+'</div></div>'+
    (p.reviewed?'<span class="tag t-sent">Reviewed</span>':'<span class="tag t-wait">Pending review</span>')+(canWrite?'<button class="btn sm" data-act="review" data-id="'+p.id+'">'+(p.reviewed?'Reopen':'Mark reviewed')+'</button>':'')+'</div>'+
    '<div class="tw"><table><thead><tr><th>Drug</th><th>Dose</th><th>Route</th><th>Schedule</th></tr></thead><tbody>'+p.rows.map(r=>'<tr><td><span class="cdot cls-'+(CLS[r[0]]||'anti')+'"></span>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td><td>'+esc(r[2])+'</td><td>'+esc(r[3])+'</td></tr>').join('')+'</tbody></table></div>'+
    '<div class="prmeta"><span>For</span><span>'+esc(p.who)+'</span><span>Supportive</span><span>'+esc(p.support)+'</span><span>Monitoring</span><span>'+esc(p.labs)+'</span><span>Schedule templates</span><span>'+(tpls.length?tpls.map(t=>esc(t.label)+(t.derived?' (days from weekly grid)':'')).join('; '):'None')+'</span></div>'+
    (p.flags.length?'<div style="padding:12px 20px 4px;border-top:1px solid var(--line2)"><b class="small">Questions for you</b> <span class="sub">'+uo+' open</span></div>'+p.flags.map((f,i)=>'<div class="q'+(f.resolved?' res':'')+'">'+(canWrite?'<input type="checkbox" data-act="flag" data-id="'+p.id+'" data-i="'+i+'"'+(f.resolved?' checked':'')+' aria-label="Mark resolved" style="margin-top:4px">':'<span>'+(f.resolved?'✓':'?')+'</span>')+'<div class="grow"><div class="qt">'+esc(f.text)+'</div>'+
     (canWrite?'<textarea class="input" style="min-height:44px;margin-top:6px" data-act="answer" data-id="'+p.id+'" data-i="'+i+'" placeholder="Your answer">'+esc(f.answer||'')+'</textarea>':(f.answer?'<div class="sub" style="margin-top:4px">Answer: '+esc(f.answer)+'</div>':''))+'</div></div>').join(''):'')+'</div>'}).join('')
   :'<div class="panel empty"><b>No protocols match</b>Clear the search or choose another regimen.</div>');
};
V.email=function(){
  const send=ui.emailDate||asOf;const target=add(send,lead());
  const xs=ALL().filter(x=>x.e.remind&&live(x.e)&&x.e.date===target);
  const sentAll=xs.length&&xs.every(x=>sentFor(x.e));
  const days=[];for(let i=0;i<14;i++){const sd=add(asOf,i);const n=ALL().filter(x=>x.e.remind&&live(x.e)&&x.e.date===add(sd,lead())).length;days.push([sd,n])}
  const body=emailText(send);
  let h=banner()+'<div class="two side300"><div><div class="panel"><div class="mailsub">'+(xs.length?esc(body.subject):'No email for this day')+'<small>Send on '+fl(send)+' at 09:00 Cairo time, for treatment on '+fl(target)+'</small></div>'+
   (xs.length?'<div class="mail" id="mailbody">'+esc(body.text)+'</div>':'<div class="empty"><b>Nothing scheduled for '+fl(target)+'</b>No empty email is sent. Pick another day on the right.</div>')+'</div>'+
   (xs.length?'<div class="row" style="margin-top:12px"><button class="btn pri" data-act="copymail">Copy email</button>'+(DL?'<button class="btn" data-act="dlmail">Download .txt</button>':'')+(canWrite?(sentAll?'<span class="tag t-sent">Marked sent</span><button class="btn sm ghost" data-act="unsend" data-d="'+send+'">Undo</button>':'<button class="btn" data-act="marksent" data-d="'+send+'">Mark as sent</button>'):'')+'<span class="sub">Gmail is not connected, so this board does not send email itself.</span></div>':'')+
   '</div><div class="panel"><div class="pad" style="border-bottom:1px solid var(--line)"><h3>Next 14 sending days</h3><div class="sub">Select a day to preview its email.</div></div><div class="list daylist">'+
   days.map(([sd,n])=>{const allS=n&&ALL().filter(x=>x.e.remind&&live(x.e)&&x.e.date===add(sd,lead())).every(x=>sentFor(x.e));return'<div class="li'+(sd===send?' sel':'')+'" data-act="emailday" data-d="'+sd+'" role="button" tabindex="0"><div class="grow"><b>'+fd(sd)+'</b><div class="sub">For '+fd(add(sd,lead()))+'</div></div>'+(n?'<span class="tag '+(allS?'t-sent':'t-due')+'">'+n+' item'+(n>1?'s':'')+'</span>':'<span class="sub">None</span>')+'</div>'}).join('')+'</div></div></div>';
  return h;
};
function emailText(send){
  const target=add(send,lead());const xs=ALL().filter(x=>x.e.remind&&live(x.e)&&x.e.date===target);
  const by={};xs.forEach(x=>(by[x.p.code]=by[x.p.code]||[]).push(x));
  let t='Dear Clinical Pharmacy Team,\n\nThe following patients are scheduled for chemotherapy in '+lead()+' calendar days.\n';
  Object.values(by).forEach(list=>{const p=list[0].p;const pr=S.protocols.find(q=>q.id===TPLID[list[0].e.tpl].proto);
    t+='\n────────────────────────\nPATIENT INFORMATION\nPatient identifier: '+p.code+'\nDiagnosis: '+p.diagnosis+'\nChemotherapy protocol: UKALL 2011, '+list[0].e.phase+'\nCycle / phase: '+list[0].e.phase+(TPLID[list[0].e.tpl].cycles?' (12-week cycles)':'')+'\nTreatment day: '+[...new Set(list.map(x=>'D'+x.e.day))].join(', ')+'\nExpected administration date: '+fl(target)+'\n\nSCHEDULED CHEMOTHERAPY\n';
    list.forEach(x=>{const c=calc(x.e,p);t+='• '+lbl(x.e)+', '+x.e.route+', D'+x.e.day+'\n   Protocol-specified dose: '+x.e.dose.text+'\n'+(c.miss?'   Patient dose: not calculated ('+c.miss+')\n':'   '+c.type+' dose: '+c.v+' '+c.u+' ('+c.f+')\n')+(c.warn?'   Check: '+c.warn+'\n':'')+(x.e.note?'   Instruction: '+x.e.note+'\n':'')+'   Verification: '+(x.e.verified?'pharmacist verified':'not yet verified')+'\n'});
    const mods=p.events.filter(e=>e.mod).map(e=>e.drug+' D'+e.day+': '+e.mod.value+' '+e.mod.unit+' ('+e.mod.reason+')');
    const dl=p.events.filter(e=>e.state==='delayed'||e.state==='held').map(e=>e.drug+' D'+e.day+': '+STATE[e.state][0].toLowerCase()+(e.reason?', '+e.reason:''));
    t+='\nLaboratory monitoring: '+(pr?pr.labs:'See protocol')+'\nKnown dose modifications: '+(mods.length?mods.join('; '):'none recorded')+'\nTreatment delays or holds: '+(dl.length?dl.join('; '):'none recorded')+'\nMissing information requiring review:\n'+(p.items.filter(i=>!i.done).map(i=>'   – '+i.text).join('\n')||'   none recorded')+'\n';});
  t+='\nIMPORTANT:\nThese are protocol-based treatment reminders. Please verify the current treatment plan, laboratory results, clinical status, and approved doses before chemotherapy preparation and administration.\n\nBest regards,\nHematology Clinical Pharmacy Reminder System.';
  return{subject:'HEMATOLOGY – CHEMOTHERAPY REMINDERS – '+fl(target),text:t};
}
V.log=function(){
  const tabs='<div class="filters">'+[['rem','Reminders'],['audit','Change history']].map(o=>'<button class="chip" data-act="logtab" data-v="'+o[0]+'" aria-pressed="'+(ui.logTab===o[0])+'">'+o[1]+'</button>').join('')+
   '<select class="input" style="width:auto" id="logpt"><option value="all">All patients</option>'+S.patients.map(p=>'<option'+(ui.logPt===p.code?' selected':'')+'>'+esc(p.code)+'</option>').join('')+'</select><span class="spacer"></span>'+(DL?'<button class="btn" data-act="exportcsv">Export CSV</button>':'')+'</div>';
  if(ui.logTab==='audit'){const rows=S.audit.filter(a=>ui.logPt==='all'||a.patient===ui.logPt).slice().reverse();
    return banner()+tabs+'<div class="panel">'+(rows.length?'<div class="tw"><table><thead><tr><th>When</th><th>Patient</th><th>Change</th></tr></thead><tbody>'+rows.map(a=>'<tr><td class="sub" style="white-space:nowrap">'+esc(a.at)+'</td><td>'+esc(a.patient||'—')+'</td><td>'+esc(a.text)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty"><b>No changes yet</b>Confirmed doses, delays, holds and edits appear here with their reasons.</div>')+'</div>';}
  const rows=S.sent_log.filter(s=>ui.logPt==='all'||s.patient===ui.logPt).slice().sort((a,b)=>b.sentOn.localeCompare(a.sentOn)||a.patient.localeCompare(b.patient));
  return banner()+tabs+'<div class="panel">'+(rows.length?'<div class="tw"><table><thead><tr><th>Sent on</th><th>Patient</th><th>Drug</th><th>For treatment</th><th>How</th><th></th></tr></thead><tbody>'+rows.map(s=>'<tr><td><b>'+fd(s.sentOn)+'</b></td><td>'+esc(s.patient)+'</td><td><span class="cdot cls-'+(CLS[s.drug]||'anti')+'"></span>'+esc(s.drug)+'</td><td>'+fd(s.date)+'</td><td>'+(s.method==='gmail'?'<span class="tag t-sent">Gmail confirmed'+(s.demo?' (demo)':'')+'</span>':'<span class="tag t-plan">Marked sent by you</span>')+'</td><td>'+(canWrite?'<button class="btn sm ghost" data-act="unlog" data-id="'+esc(s.eventId)+'" data-d="'+s.date+'">Remove</button>':'')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty"><b>No reminders logged</b>Reminders appear here once an email is marked as sent.</div>')+'</div>';
};
V.settings=function(){
  let th='system';try{th=localStorage.getItem('chemo-theme')||'system'}catch(e){}
  return banner()+'<div class="two"><div class="panel pad"><h3>Display</h3><div class="field" style="margin-top:12px">Theme<select class="input" id="theme">'+[['system','Match my device'],['light','Light'],['dark','Dark']].map(o=>'<option value="'+o[0]+'"'+(th===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select></div>'+
   '<h3 style="margin-top:22px">Reminder rules</h3><div class="kv" style="margin-top:10px"><span>Lead time</span><span>'+lead()+' calendar days</span><span>Send time</span><span>09:00, Africa/Cairo</span><span>Grouping</span><span>One email per treatment date</span><span>Empty days</span><span>No email sent</span></div>'+
   '<div class="note">This demo previews reminder emails and records manual sent marks. Automated sending requires a separate integration.</div></div>'+
   '<div class="panel pad"><h3>Data</h3><p class="sub">Back up the register, restore it, or return to the demo.</p><div class="row" style="margin-top:12px">'+(DL?'<button class="btn" data-act="exportjson">Export data (.json)</button>':'<button class="btn" data-act="copyjson">Copy data as JSON</button>')+(canWrite?'<label class="btn">Import data<input type="file" id="importf" accept=".json,application/json" hidden></label>':'')+'</div>'+
   (canWrite?'<div class="row" style="margin-top:10px"><button class="btn warn" data-act="resetdemo">Reset to starter board</button></div>':'')+
   '<h3 style="margin-top:22px">Privacy</h3><div class="note">Access is limited to approved demo accounts. Use fictional records only.</div>'+
   '<h3 style="margin-top:22px">Editing</h3><div class="note">'+'Select Save changes to update the shared board. Use Load shared version to retrieve another editor’s saved changes.'+'</div></div></div>';
};

/* ---------- modal ---------- */
let modalClose=null;
function modal(html,wide,onMount){const m=document.getElementById('modal');m.innerHTML='<div class="scrim" data-act="scrim"><div class="modal'+(wide?' wide':'')+'" role="dialog" aria-modal="true">'+html+'</div></div>';
  const f=m.querySelector('input:not([type=checkbox]),select,textarea,button.pri');if(f)f.focus();if(onMount)onMount(m);}
function closeModal(){document.getElementById('modal').innerHTML=''}
function toast(t){const b=document.getElementById('toasts');const d=document.createElement('div');d.className='toast';d.textContent=t;b.appendChild(d);setTimeout(()=>d.remove(),2600)}

function evModal(code,id,act){
  const p=pt(code);const e=p&&p.events.find(x=>x.id===id);if(!e)return;const r=rem(e);const c=calc(e,p);
  const acts=[['given','Confirm given'],['delay','Delay'],['hold','Hold'],['cancel','Cancel'],['modify','Modify dose'],['verify',e.verified?'Unverify dose':'Verify dose'],['reset','Reset']];
  let form='';
  if(act==='given')form='<div class="fgrid"><label class="field">Date given<input type="date" class="input" id="f-date" value="'+(e.date<=asOf?e.date:asOf)+'" max="'+cairo()+'"></label><label class="field">Note (optional)<input class="input" id="f-note" placeholder="e.g. given in day unit"></label></div><div class="mf" style="padding:14px 0 0;border:0"><button class="btn pri" data-act="do-given" data-p="'+esc(code)+'" data-e="'+id+'">Confirm as given</button></div>';
  if(act==='delay'){const later=p.events.filter(x=>x.phaseId===e.phaseId&&x.date>e.date&&live(x)).length;
    form='<div class="fgrid"><label class="field">New date<input type="date" class="input" id="f-date" value="'+add(e.date,7)+'"></label><label class="field">Reason (required)<input class="input" id="f-reason" placeholder="e.g. counts not recovered"></label></div><label class="check"><input type="checkbox" id="f-shift"> Also move the '+later+' later dose'+(later===1?'':'s')+' in this phase by the same number of days</label><div class="note w">Only move later doses when the revised treatment plan says so. A delay does not shift the schedule by itself.</div><div class="mf" style="padding:14px 0 0;border:0"><button class="btn pri" data-act="do-delay" data-p="'+esc(code)+'" data-e="'+id+'">Delay dose</button></div>';}
  if(act==='hold'||act==='cancel')form='<label class="field">Reason (required)<input class="input" id="f-reason" placeholder="'+(act==='hold'?'e.g. awaiting allergy review':'e.g. physician decision')+'"></label><div class="mf" style="padding:14px 0 0;border:0"><button class="btn pri" data-act="do-'+act+'" data-p="'+esc(code)+'" data-e="'+id+'">'+(act==='hold'?'Hold dose':'Cancel dose')+'</button></div>';
  if(act==='modify')form='<div class="fgrid"><label class="field">Approved dose<input type="number" step="any" min="0" class="input" id="f-val" value="'+(e.mod?e.mod.value:(c.v!=null?c.v:''))+'"></label><label class="field">Unit<input class="input" id="f-unit" value="'+esc(e.mod?e.mod.unit:(c.u||e.dose.unit||'mg'))+'"></label><label class="field full">Approved by and reason (required)<input class="input" id="f-reason" placeholder="e.g. Dr X, 50% reduction for neuropathy" value="'+esc(e.mod?e.mod.reason:'')+'"></label></div><div class="mf" style="padding:14px 0 0;border:0">'+(e.mod?'<button class="btn" data-act="do-unmod" data-p="'+esc(code)+'" data-e="'+id+'">Remove modification</button>':'')+'<button class="btn pri" data-act="do-modify" data-p="'+esc(code)+'" data-e="'+id+'">Save modified dose</button></div>';
  if(act==='reset')form='<p class="small" style="margin:0">Return this dose to scheduled'+(e.origDate?' and restore the original date, '+fd(e.origDate):'')+'. The reason is kept in the history.</p><div class="mf" style="padding:14px 0 0;border:0"><button class="btn pri" data-act="do-reset" data-p="'+esc(code)+'" data-e="'+id+'">Reset dose</button></div>';
  modal('<div class="mh"><span class="cdot cls-'+e.cls+'" style="width:12px;height:12px;margin-top:6px"></span><div style="flex:1"><h3>'+esc(lbl(e))+'</h3><div class="sub">'+esc(p.code)+', '+esc(e.phase)+', day '+e.day+'</div></div><button class="btn sm ghost" data-act="close" aria-label="Close">✕</button></div><div class="mb">'+
   '<div class="kv"><span>Date</span><span><b>'+fl(e.date)+'</b>'+(e.end?' to '+fl(e.end):'')+(e.origDate?'<br><span class="sub">Originally '+fl(e.origDate)+'</span>':'')+'</span><span>Status</span><span>'+stateTag(e)+(e.reason?' <span class="sub">'+esc(e.reason)+'</span>':'')+'</span><span>Reminder</span><span><span class="tag '+r.c+'">'+r.t+'</span></span><span>Route</span><span>'+esc(e.route)+'</span>'+
   '<span>Protocol dose</span><span>'+esc(e.dose.text)+'</span><span>'+(c.type||'Dose')+'</span><span>'+(c.miss?'<span class="warnt">'+c.miss+'</span>':'<b>'+c.v+' '+esc(c.u)+'</b> <span class="sub">'+esc(c.f)+'</span>')+(c.warn?'<div class="warnt">'+esc(c.warn)+'</div>':'')+'</span><span>Verification</span><span>'+(e.verified?'<span class="tag t-sent">Pharmacist verified</span>':'Not yet verified')+'</span>'+(e.note?'<span>Instruction</span><span>'+esc(e.note)+'</span>':'')+(e.derived?'<span>Source</span><span class="sub">Day placed at the start of the week marked in the hospital grid. Confirm the exact day.</span>':'')+'</div>'+
   '<div class="note">Preparation reference only. Verify against the current treatment plan, labs and clinical status before preparation.</div>'+
   (canWrite?'<div class="seg">'+acts.map(a=>'<button class="chip" data-act="evact" data-v="'+a[0]+'" data-p="'+esc(code)+'" data-e="'+id+'" aria-pressed="'+(act===a[0])+'">'+a[1]+'</button>').join('')+'</div>'+(form?'<div style="margin-top:10px">'+form+'<div class="err" id="f-err"></div></div>':''):'')+'</div>');
}
function ptForm(p,mode){
  const opts=TPL.map(t=>'<option value="'+t.id+'">'+esc(t.label)+' ('+esc(t.weeks)+')</option>').join('');
  const base=mode==='new';
  return '<div class="fgrid">'+(base?'<label class="field">Patient code<input class="input" id="f-code" placeholder="e.g. HEM-0412" autocomplete="off"></label><label class="field">Registered on<input type="date" class="input" id="f-reg" value="'+asOf+'"></label><label class="field full">Diagnosis<input class="input" id="f-dx" placeholder="e.g. BCP-ALL, NCI standard risk"></label><label class="field">Age (years)<input type="number" min="0" max="99" step="0.1" class="input" id="f-age"></label><label class="field">BSA (m²)<input type="number" min="0.2" max="3" step="0.01" class="input" id="f-bsa"></label>':'')+
   '<label class="field full">Treatment phase<select class="input" id="f-tpl">'+opts+'</select></label><label class="field">Phase day 1<input type="date" class="input" id="f-start" value="'+asOf+'"></label><label class="field" id="f-cyw">12-week cycles to schedule<input type="number" min="1" max="12" class="input" id="f-cyc" value="2"></label></div>'+
   '<div class="note" id="f-tnote"></div><div class="prev" id="f-prev"></div><div class="err" id="f-err"></div>';
}
function wirePreview(m,p){
  const upd=()=>{const tid=m.querySelector('#f-tpl').value;const t=TPLID[tid];const st=m.querySelector('#f-start').value;
    m.querySelector('#f-cyw').style.display=t.cycles?'':'none';
    const tmp=p||{age:+(m.querySelector('#f-age')||{}).value||null,bsa:+(m.querySelector('#f-bsa')||{}).value||null};
    if(m.querySelector('#f-age')){tmp.age=m.querySelector('#f-age').value===''?null:+m.querySelector('#f-age').value;tmp.bsa=+m.querySelector('#f-bsa').value||null}
    m.querySelector('#f-tnote').innerHTML=(t.needsCounts?'<b>Before day 1:</b> ANC >0.75 and platelets >75. ':'')+(t.derived?'Days are placed at the start of each week marked in the hospital grid; confirm exact days.':'Days follow the protocol day numbers.');
    if(!st){m.querySelector('#f-prev').innerHTML='';return}
    const b=buildPhase('PREVIEW',tid,st,+m.querySelector('#f-cyc').value||2);
    m.querySelector('#f-prev').innerHTML='<table><thead><tr><th>Day</th><th>Date</th><th>Drug</th><th>Dose</th></tr></thead><tbody>'+b.events.filter(e=>e.remind).map(e=>'<tr><td>D'+e.day+'</td><td>'+fd(e.date)+'</td><td><span class="cdot cls-'+e.cls+'"></span>'+esc(lbl(e))+'</td><td>'+doseHTML(e,tmp,true)+'</td></tr>').join('')+'</tbody></table>';};
  m.querySelectorAll('#f-tpl,#f-start,#f-cyc,#f-age,#f-bsa').forEach(x=>x.addEventListener('input',upd));upd();
}

/* ---------- mutations ---------- */
function log(p,text){const at=stamp();S.audit.push({at,patient:p?p.code:null,text});if(p)p.history.push({at,text});dirty++;}
function mutate(fn){
  if(!canWrite||busy)return;
  fn();pendingWrite=null;render();
}
function doAct(a,el){
  const code=el.dataset.p,id=el.dataset.e;const p=code?pt(code):null;const e=p&&id?p.events.find(x=>x.id===id):null;
  const val=s=>{const x=document.getElementById(s);return x?x.value.trim():''};
  const err=t=>{const x=document.getElementById('f-err');if(x)x.textContent=t};
  switch(a){
  case'close':case'scrim':if(a==='scrim'&&el!==event_target)return;closeModal();break;
  case'today':asOf=cairo();ui.emailDate=null;render();break;
  case'kpi':{const g=el.dataset.go;if(g==='miss'){const x=document.getElementById('miss');if(x)x.scrollIntoView({behavior:'smooth'});else toast('No missed reminders')}else if(g==='wait'){const x=document.getElementById('waitlist');if(x)x.scrollIntoView({behavior:'smooth'})}else location.hash=g;break}
  case'ev':evModal(code,id,null);break;
  case'evact':evModal(code,id,el.dataset.v==='verify'?null:el.dataset.v);if(el.dataset.v==='verify')mutate(()=>{e.verified=!e.verified;log(p,(e.verified?'Verified ':'Removed verification for ')+e.drug+' D'+e.day+' ('+fd(e.date)+')');evModal(code,id,null)});break;
  case'quickgiven':mutate(()=>{e.state='administered';e.actualDate=e.date;log(p,'Confirmed '+e.drug+' D'+e.day+' given on '+fd(e.date,{year:'numeric'}))});toast('Recorded as given');break;
  case'do-given':{const d=val('f-date');if(!d)return err('Enter the date given.');mutate(()=>{e.state='administered';e.actualDate=d;e.reason=val('f-note');log(p,'Confirmed '+e.drug+' D'+e.day+' given on '+fd(d,{year:'numeric'})+(e.reason?' ('+e.reason+')':''))});closeModal();toast('Recorded as given');break}
  case'do-delay':{const d=val('f-date'),rs=val('f-reason');if(!d)return err('Choose the new date.');if(!rs)return err('Add the reason for the delay.');if(d===e.date)return err('The new date is the same as the current date.');
    const sh=document.getElementById('f-shift').checked;const n=diff(d,e.date);
    mutate(()=>{const later=p.events.filter(x=>x.phaseId===e.phaseId&&x.date>e.date&&live(x));if(!e.origDate)e.origDate=e.date;e.date=d;if(e.end)e.end=add(e.end,n);e.state='delayed';e.reason=rs;
      if(sh)later.forEach(x=>{if(!x.origDate)x.origDate=x.date;x.date=add(x.date,n);if(x.end)x.end=add(x.end,n);x.reason='Moved with '+e.drug+' D'+e.day+' delay'});
      log(p,'Delayed '+e.drug+' D'+e.day+' to '+fd(d,{year:'numeric'})+' ('+rs+')'+(sh?'; moved '+later.length+' later doses by '+n+' days':''))});closeModal();toast('Dose delayed');break}
  case'do-hold':case'do-cancel':{const rs=val('f-reason');if(!rs)return err('Add the reason.');mutate(()=>{e.state=a==='do-hold'?'held':'cancelled';e.reason=rs;log(p,(a==='do-hold'?'Held ':'Cancelled ')+e.drug+' D'+e.day+' ('+rs+')')});closeModal();toast(a==='do-hold'?'Dose held':'Dose cancelled');break}
  case'do-modify':{const v=parseFloat(val('f-val')),u=val('f-unit'),rs=val('f-reason');if(!(v>=0))return err('Enter the approved dose.');if(!rs)return err('Add who approved it and why.');mutate(()=>{e.mod={value:v,unit:u||'mg',reason:rs};e.verified=false;log(p,'Physician-approved dose for '+e.drug+' D'+e.day+': '+v+' '+(u||'mg')+' ('+rs+')')});closeModal();toast('Modified dose saved');break}
  case'do-unmod':mutate(()=>{e.mod=null;log(p,'Removed dose modification for '+e.drug+' D'+e.day)});closeModal();break;
  case'do-reset':mutate(()=>{if(e.origDate){const n=diff(e.origDate,e.date);e.date=e.origDate;if(e.end)e.end=add(e.end,n);e.origDate=null}e.state='scheduled';e.actualDate=null;log(p,'Reset '+e.drug+' D'+e.day+' to scheduled');e.reason=''});closeModal();toast('Dose reset');break;
  case'openpt':ui.patient=code;if(ui.view!=='patients')location.hash='patients';else render();window.scrollTo(0,0);break;
  case'back':ui.patient=null;render();break;
  case'pstatus':ui.pstatus=el.dataset.v;render();break;
  case'addpt':modal('<div class="mh"><div style="flex:1"><h3>Add patient</h3><div class="sub">Use a fictional code such as DEMO-01. Review the sample schedule before you create it.</div></div><button class="btn sm ghost" data-act="close" aria-label="Close">✕</button></div><div class="mb">'+ptForm(null,'new')+'</div><div class="mf"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="do-addpt">Create patient and start reminders</button></div>',true,m=>wirePreview(m,null));break;
  case'do-addpt':{const c=val('f-code').toUpperCase(),dx=val('f-dx'),reg=val('f-reg'),st=val('f-start'),tid=val('f-tpl'),ag=val('f-age'),bs=val('f-bsa');
    if(!/^[A-Z0-9-]{3,24}$/.test(c))return err('Patient code: 3–24 letters, numbers or hyphens.');if(pt(c))return err('That code is already registered.');if(!dx)return err('Add the diagnosis.');if(!st||!reg)return err('Add the registration and phase dates.');
    if(ag!==''&&!(+ag>=0&&+ag<100))return err('Age looks wrong.');if(bs!==''&&!(+bs>=0.2&&+bs<=3))return err('BSA should be between 0.2 and 3 m².');
    mutate(()=>{const b=buildPhase(c,tid,st,+val('f-cyc')||2);const np={code:c,diagnosis:dx,age:ag===''?null:+ag,bsa:bs===''?null:+bs,registered:reg,status:'active',phases:[b.phase],events:b.events,items:[],history:[]};
      if(ag==='')np.items.push({text:'Age needed for intrathecal methotrexate dose',done:false});if(bs==='')np.items.push({text:'BSA needed for dose calculations',done:false});if(TPLID[tid].needsCounts)np.items.push({text:'ANC and platelet count before phase start',done:false});
      S.patients.push(np);log(np,'Registered with '+b.phase.label+', day 1 '+fd(st,{year:'numeric'}))});
    closeModal();ui.patient=c;render();toast('Patient added');break}
  case'editpt':modal('<div class="mh"><div style="flex:1"><h3>Edit '+esc(p.code)+'</h3><div class="sub">Changing age or BSA recalculates every dose that is not a physician-approved modification.</div></div><button class="btn sm ghost" data-act="close" aria-label="Close">✕</button></div><div class="mb"><div class="fgrid"><label class="field full">Diagnosis<input class="input" id="f-dx" value="'+esc(p.diagnosis)+'"></label><label class="field">Age (years)<input type="number" min="0" max="99" step="0.1" class="input" id="f-age" value="'+(p.age==null?'':p.age)+'"></label><label class="field">BSA (m²)<input type="number" min="0.2" max="3" step="0.01" class="input" id="f-bsa" value="'+(p.bsa||'')+'"></label><label class="field full">Status<select class="input" id="f-st">'+[['active','Active'],['held','On hold'],['completed','Completed'],['off','Off protocol']].map(o=>'<option value="'+o[0]+'"'+(p.status===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select></label></div><div class="err" id="f-err"></div></div><div class="mf"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="do-editpt" data-p="'+esc(p.code)+'">Save details</button></div>');break;
  case'do-editpt':{const ag=val('f-age'),bs=val('f-bsa');if(ag!==''&&!(+ag>=0&&+ag<100))return err('Age looks wrong.');if(bs!==''&&!(+bs>=0.2&&+bs<=3))return err('BSA should be between 0.2 and 3 m².');
    mutate(()=>{const ch=[];const na=ag===''?null:+ag,nb=bs===''?null:+bs,nd=val('f-dx'),ns=val('f-st');if(na!==p.age)ch.push('age '+(p.age==null?'—':p.age)+' → '+(na==null?'—':na));if(nb!==p.bsa)ch.push('BSA '+(p.bsa||'—')+' → '+(nb||'—'));if(nd!==p.diagnosis)ch.push('diagnosis');if(ns!==p.status)ch.push('status → '+ns);
      p.age=na;p.bsa=nb;p.diagnosis=nd;p.status=ns;if(nb!=null)p.events.forEach(e=>{if(live(e))e.verified=false});log(p,'Edited details: '+(ch.join(', ')||'no change'))});closeModal();toast('Details saved');break}
  case'addphase':modal('<div class="mh"><div style="flex:1"><h3>Add next phase for '+esc(p.code)+'</h3><div class="sub">Pick the phase and its day 1. The schedule appears below for review.</div></div><button class="btn sm ghost" data-act="close" aria-label="Close">✕</button></div><div class="mb">'+ptForm(p,'phase')+'</div><div class="mf"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="do-addphase" data-p="'+esc(p.code)+'">Add phase and start reminders</button></div>',true,m=>{const last=p.phases[p.phases.length-1];const nxt=last?TPL[TPL.findIndex(t=>t.id===last.tpl)+1]:null;if(nxt)m.querySelector('#f-tpl').value=nxt.id;wirePreview(m,p)});break;
  case'do-addphase':{const st=val('f-start'),tid=val('f-tpl');if(!st)return err('Choose day 1.');mutate(()=>{const b=buildPhase(p.code,tid,st,+val('f-cyc')||2);p.phases.push(b.phase);p.events.push(...b.events);p.events.sort((x,y)=>x.date.localeCompare(y.date));if(TPLID[tid].needsCounts)p.items.push({text:'ANC and platelet count before '+b.phase.label,done:false});log(p,'Added '+b.phase.label+', day 1 '+fd(st,{year:'numeric'}))});closeModal();toast('Phase added');break}
  case'delphase':{const ph=p.phases.find(x=>x.id===el.dataset.ph);modal('<div class="mh"><h3 style="flex:1">Remove '+esc(ph.label)+'?</h3></div><div class="mb"><p style="margin:0">This removes every dose in the phase for '+esc(p.code)+' and its pending reminders. Recorded history stays.</p></div><div class="mf"><button class="btn" data-act="close">Keep phase</button><button class="btn pri" data-act="do-delphase" data-p="'+esc(p.code)+'" data-ph="'+ph.id+'">Remove phase</button></div>');break}
  case'do-delphase':mutate(()=>{const ph=p.phases.find(x=>x.id===el.dataset.ph);p.phases=p.phases.filter(x=>x!==ph);p.events=p.events.filter(x=>x.phaseId!==ph.id);log(p,'Removed '+ph.label)});closeModal();toast('Phase removed');break;
  case'delpt':modal('<div class="mh"><h3 style="flex:1">Delete '+esc(p.code)+'?</h3></div><div class="mb"><p style="margin:0">This removes the patient, every scheduled dose and pending reminder. Type the patient code to confirm.</p><input class="input" id="f-conf" style="margin-top:12px" autocomplete="off"><div class="err" id="f-err"></div></div><div class="mf"><button class="btn" data-act="close">Keep patient</button><button class="btn pri" data-act="do-delpt" data-p="'+esc(p.code)+'">Delete patient</button></div>');break;
  case'do-delpt':if(val('f-conf').toUpperCase()!==p.code)return err('Type '+p.code+' to confirm.');mutate(()=>{S.patients=S.patients.filter(x=>x!==p);S.audit.push({at:stamp(),patient:p.code,text:'Deleted patient'});dirty++});ui.patient=null;closeModal();render();toast('Patient deleted');break;
  case'itemadd':{const t=val('newitem');if(!t)return;mutate(()=>{const pp=pt(ui.patient);pp.items.push({text:t,done:false});log(pp,'Added open item: '+t)});break}
  case'itemdel':mutate(()=>{const pp=pt(ui.patient);const it=pp.items.splice(+el.dataset.i,1)[0];log(pp,'Removed open item: '+it.text)});break;
  case'calnav':{const v=+el.dataset.v;if(v===0)ui.calMonth=asOf.slice(0,7);else{const[y,m]=ui.calMonth.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+v,1));ui.calMonth=iso(d).slice(0,7)}render();break}
  case'calday':ui.calSel=el.dataset.d;render();break;
  case'calcls':ui.calCls=el.dataset.v;render();break;
  case'reg':ui.reg=el.dataset.v;render();break;
  case'review':mutate(()=>{const pr=S.protocols.find(x=>x.id===el.dataset.id);pr.reviewed=!pr.reviewed;S.audit.push({at:stamp(),patient:null,text:(pr.reviewed?'Marked reviewed: ':'Reopened: ')+'Regimen '+pr.regimen+' '+pr.phase+(pr.reviewed&&pr.flags.some(f=>!f.resolved)?' (with open questions)':'')});dirty++});break;
  case'emailday':ui.emailDate=el.dataset.d;render();break;
  case'copymail':{const b=emailText(ui.emailDate||asOf);copy(b.subject+'\n\n'+b.text);break}
  case'dlmail':{const b=emailText(ui.emailDate||asOf);dl('chemo-reminders-'+add(ui.emailDate||asOf,lead())+'.txt','Subject: '+b.subject+'\n\n'+b.text);break}
  case'marksent':{const sd=el.dataset.d;const xs=ALL().filter(x=>x.e.remind&&live(x.e)&&x.e.date===add(sd,lead())&&!sentFor(x.e));mutate(()=>{xs.forEach(x=>S.sent_log.push({eventId:x.e.id,patient:x.p.code,drug:x.e.drug,date:x.e.date,sentOn:sd,method:'manual'}));S.audit.push({at:stamp(),patient:null,text:'Marked email for '+fd(add(sd,lead()),{year:'numeric'})+' as sent ('+xs.length+' items)'});dirty++});toast('Marked as sent');break}
  case'unsend':{const sd=el.dataset.d;const tg=add(sd,lead());mutate(()=>{const n=S.sent_log.length;S.sent_log=S.sent_log.filter(s=>!(s.date===tg&&s.method==='manual'));S.audit.push({at:stamp(),patient:null,text:'Undid sent mark for '+fd(tg,{year:'numeric'})+' ('+(n-S.sent_log.length)+' items)'});dirty++});break}
  case'unlog':mutate(()=>{S.sent_log=S.sent_log.filter(s=>!(s.eventId===el.dataset.id&&s.date===el.dataset.d));S.audit.push({at:stamp(),patient:null,text:'Removed a reminder log entry for '+fd(el.dataset.d,{year:'numeric'})});dirty++});break;
  case'logtab':ui.logTab=el.dataset.v;render();break;
  case'exportcsv':{let csv;if(ui.logTab==='audit')csv='When,Patient,Change\n'+S.audit.map(a=>[a.at,a.patient||'',a.text].map(q).join(',')).join('\n');else csv='Sent on,Patient,Drug,For treatment,How\n'+S.sent_log.map(s=>[s.sentOn,s.patient,s.drug,s.date,s.method==='gmail'?'Gmail confirmed':'Marked sent'].map(q).join(',')).join('\n');dl((ui.logTab==='audit'?'change-history':'reminder-log')+'-'+asOf+'.csv',csv);break}
  case'exportjson':dl('chemo-board-'+asOf+'.json',JSON.stringify(S,null,1));break;
  case'copyjson':copy(JSON.stringify(S));break;
  case'resetdemo':modal('<div class="mh"><h3 style="flex:1">Reset to starter board?</h3></div><div class="mb"><p style="margin:0">This replaces every patient, reminder and answer with the empty starter board. Export your data first if you need it.</p></div><div class="mf"><button class="btn" data-act="close">Keep my data</button><button class="btn pri" data-act="do-reset-demo">Reset</button></div>');break;
  case'do-reset-demo':mutate(()=>{S=hydrate(clone(SEED));dirty++});ui.patient=null;closeModal();toast('Starter board loaded. Save changes to apply.');break;
  case'discard':S=clone(saved);dirty=0;pendingWrite=null;render();toast('Changes discarded');break;
  case'shared-load':loadFromButton();break;
  case'shared-signout':signOut();break;
  case'save':saveAll();break;
  }
}
const q=s=>'"'+String(s).replace(/"/g,'""')+'"';
async function copy(t){try{await navigator.clipboard.writeText(t);toast('Copied')}catch(e){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(x){}ta.remove();toast(ok?'Copied':'Copy is blocked here; select the text instead')}}
async function dl(name,data){if(!DL){toast('Downloads are not available in this view');return}try{await DL.save({filename:name,data});}catch(e){if(e&&e.code!=='cancelled'&&e.code!=='declined')toast('Download did not start')}}
let event_target=null;

/* ---------- shared board ---------- */
function renderSignIn(){
  const root=document.getElementById('root');
  const fields=shared.configured?'<form id="shared-signin"><label class="field">Email<input class="input" type="email" name="email" autocomplete="username" required></label>'+
    '<label class="field">Password<input class="input" type="password" name="password" autocomplete="current-password" required></label>'+
    '<button class="btn pri" type="submit"'+(busy?' disabled':'')+'>'+(busy?'Connecting…':'Sign in')+'</button></form>':
    '<p>Complete the shared storage setup in the README to enable sign-in.</p>';
  root.innerHTML='<main class="shared-login panel pad"><h1>Hematology chemotherapy board</h1>'+
    '<p>Shared demo for approved accounts. Use fictional records only.</p>'+fields+
    '<p id="shared-message" class="sub" role="status">'+esc(sharedNotice)+'</p></main>';
}
function normalize(data){
  if(!data||typeof data!=='object'||!Array.isArray(data.patients)||!Array.isArray(data.protocols))throw new Error('Invalid board');
  delete data.demoSeed;
  return hydrate(data);
}
async function loadShared(){
  const result=await shared.load();
  if(result?.status==='forbidden')throw Object.assign(new Error('Access denied'),{status:403});
  if(result?.status!=='ok'||!Number.isInteger(result.revision))throw new Error('Board unavailable');
  const board=normalize(result.state??clone(SEED));
  saved=board;S=clone(board);revision=result.revision;dirty=0;pendingWrite=null;
  if(ui.patient&&!pt(ui.patient))ui.patient=null;
  canWrite=true;sharedNotice='';
}
async function loadFromButton(){
  if(busy||(dirty&&!confirm('Load the saved shared version and discard the edits open in this tab?')))return;
  busy=true;render();
  try{await loadShared();toast('Shared board loaded');}
  catch{sharedNotice='Could not load the shared board. The changes in this tab are still open.';}
  finally{busy=false;render();}
}
async function signOut(){
  if(busy||(dirty&&!confirm('Sign out and discard the edits open in this tab?')))return;
  busy=true;render();
  try{await shared.signOut();}
  finally{
    canWrite=false;busy=false;dirty=0;pendingWrite=null;sharedNotice='';
    saved=hydrate(clone(SEED));S=clone(saved);ui.patient=null;
    closeModal();render();
  }
}
async function saveAll(){
  if(!canWrite||busy||!dirty)return;
  if(!pendingWrite){
    const state=clone(S);
    state.rev=revision+1;state.savedAt=stamp();
    pendingWrite={expectedRevision:revision,state,writeId:crypto.randomUUID()};
  }
  busy=true;render();
  try{
    const result=await shared.save(pendingWrite);
    if(result?.status==='ok'&&Number.isInteger(result.revision)){
      revision=result.revision;saved=pendingWrite.state;S=clone(saved);dirty=0;pendingWrite=null;
      sharedNotice='';toast('Saved to the shared board');
    }else if(result?.status==='conflict'){
      sharedNotice='Another editor saved a newer version. Export your draft from Settings before loading the shared version.';
    }else if(result?.status==='forbidden'){
      sharedNotice='This account no longer has edit access. The draft is still open in this tab.';
    }else{
      sharedNotice='The database rejected this save. The draft is still open in this tab.';
    }
  }catch(error){
    sharedNotice=[400,401,403].includes(error.status)&&!shared.hasSession()
      ? 'Your sign-in expired. Export your draft from Settings before signing in again.'
      : 'Could not confirm the save. The draft is still open. Select Save changes to retry.';
  }finally{busy=false;render();}
}
async function startSession(credentials){
  if(busy||!shared.configured)return;
  sharedNotice='';busy=true;render();
  try{
    if(credentials)await shared.signIn(credentials.email,credentials.password);
    await loadShared();
  }catch(error){
    if(error.status===403){
      sharedNotice='This account is not approved for the shared board.';
      await shared.signOut();
    }else{
      sharedNotice=credentials&&[400,401].includes(error.status)
        ? 'Sign-in failed. Check the email and password.'
        : 'Could not open the shared board. Check the database setup or try again.';
    }
  }finally{busy=false;render();}
}
document.addEventListener('submit',event=>{
  if(event.target.id!=='shared-signin')return;
  event.preventDefault();
  const fields=new FormData(event.target);
  const email=String(fields.get('email')??'').trim();
  const password=String(fields.get('password')??'');
  event.target.reset();
  startSession({email,password});
});

/* ---------- events ---------- */
document.addEventListener('click',ev=>{
  if(busy||!canWrite)return;
  const el=ev.target.closest('[data-act]');if(!el)return;event_target=ev.target;
  const a=el.dataset.act;if(a==='flag'||a==='itemdone'||a==='answer')return;
  if(a==='scrim'&&ev.target!==el)return;
  if(el.tagName==='A')return;
  ev.preventDefault();doAct(a,el);
});
document.addEventListener('change',ev=>{
  if(busy||!canWrite)return;
  const t=ev.target;const a=t.dataset&&t.dataset.act;
  if(a==='flag')mutate(()=>{const pr=S.protocols.find(x=>x.id===t.dataset.id);const f=pr.flags[+t.dataset.i];f.resolved=t.checked;S.audit.push({at:stamp(),patient:null,text:(f.resolved?'Resolved: ':'Reopened: ')+f.text});dirty++});
  else if(a==='itemdone')mutate(()=>{const p=pt(ui.patient);const it=p.items[+t.dataset.i];it.done=t.checked;log(p,(it.done?'Resolved item: ':'Reopened item: ')+it.text)});
  else if(a==='answer')mutate(()=>{const pr=S.protocols.find(x=>x.id===t.dataset.id);pr.flags[+t.dataset.i].answer=t.value;S.audit.push({at:stamp(),patient:null,text:'Answered: '+pr.flags[+t.dataset.i].text});dirty++});
  else if(t.id==='calpt'){ui.calPatient=t.value;render()}
  else if(t.id==='calst'){ui.calStatus=t.value;render()}
  else if(t.id==='caloral'){ui.calShowOral=t.checked;render()}
  else if(t.id==='logpt'){ui.logPt=t.value;render()}
  else if(t.id==='theme'){setTheme(t.value);try{localStorage.setItem('chemo-theme',t.value)}catch(e){}}
  else if(t.id==='importf'&&t.files[0]){
    const file=t.files[0];t.value='';
    if(dirty&&!confirm('Replace the edits currently open in this tab with the selected export?'))return;
    const reader=new FileReader();
    reader.onload=()=>{
      if(!canWrite||busy)return;
      const previous=S, previousDirty=dirty;
      try{
        const imported=normalize(JSON.parse(reader.result));
        imported.audit.push({at:stamp(),patient:null,text:'Imported data from '+file.name});
        S=imported;dirty++;pendingWrite=null;ui.patient=null;
        render();toast('Data imported. Save changes to update the shared board.');
      }catch{
        S=previous;dirty=previousDirty;render();toast('That file is not a valid board export');
      }
    };
    reader.onerror=()=>toast('Could not read the selected file');
    reader.readAsText(file);
  }
});
document.addEventListener('input',ev=>{const t=ev.target;if(t.id==='pq'||t.id==='prq'){ui[t.id]=t.value;const pos=t.selectionStart;render();const n=document.getElementById(t.id);if(n){n.focus();n.setSelectionRange(pos,pos)}}});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&document.getElementById('modal').innerHTML)closeModal();
  if(ev.key==='Enter'&&ev.target.id==='newitem')doAct('itemadd',ev.target);
  if((ev.key==='Enter'||ev.key===' ')&&ev.target.matches('[role=button][data-act]')){ev.preventDefault();doAct(ev.target.dataset.act,ev.target)}});
window.addEventListener('beforeunload',ev=>{if(dirty){ev.preventDefault();ev.returnValue=''}});
function route(){const h=(location.hash||'').slice(1);ui.view=VIEWS.some(v=>v[0]===h)?h:'overview';if(ui.view!=='patients')ui.patient=ui.patient&&h==='patients'?ui.patient:null;closeModal();render();window.scrollTo(0,0)}
window.addEventListener('hashchange',route);
function setTheme(v){if(v==='light'||v==='dark')document.documentElement.dataset.theme=v;else delete document.documentElement.dataset.theme}
try{setTheme(localStorage.getItem('chemo-theme')||'system')}catch(e){}

route();
if(shared.configured&&shared.hasSession())startSession();
})();
