(function(){
'use strict';
const SEED=JSON.parse(document.getElementById('data').textContent);
const REFS=(function(){try{return JSON.parse(document.getElementById('refs').textContent)}catch(e){return{pages:{},hits:{}}}})();
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

/* ---------- drugs ---------- */
const CLS={'Vincristine':'vinca','Daunorubicin':'anthra','Doxorubicin':'anthra','PEG-asparaginase':'aspa','Dexamethasone':'ster','IT methotrexate':'it','Oral methotrexate':'anti','Methotrexate (Capizzi)':'anti','Mercaptopurine':'anti','Cytarabine':'anti','Cyclophosphamide':'alky'};
const CLSN={vinca:'Vinca alkaloid',anthra:'Anthracycline',aspa:'Asparaginase',ster:'Steroid',it:'Intrathecal',anti:'Antimetabolite',alky:'Alkylator'};

/* ---------- templates: days are phase days (D1 = first day of the phase); startWeek gives the protocol week of D1 ---------- */
const AGE={basis:'age',unit:'mg',text:'By age: <2 yrs 8 mg; 2 yrs 10 mg; ≥3 yrs 12 mg'};
const bsa=(per,unit,text,cap,warn)=>({basis:'bsa',per,unit,text,cap:cap==null?null:cap,warn:warn||null});
const it=(days,x)=>Object.assign({drug:'IT methotrexate',route:'IT',days,dose:AGE,remind:true},x||{});
const vcr=(days,cap)=>({drug:'Vincristine',route:'IV',days,dose:cap?bsa(1.5,'mg','1.5 mg/m² (max 2 mg)',2):bsa(1.5,'mg','1.5 mg/m² (no maximum stated in this file)',null,2),remind:true});
const peg=days=>({drug:'PEG-asparaginase',route:'IM',days,dose:bsa(1000,'units','1000 units/m²'),remind:true});
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
 {id:'A-IND',reg:'A',proto:'A-IND',label:'Regimen A: Induction',weeks:'Weeks 1–5',sw:1,items:()=>[it([1,8,29]),vcr([2,9,16,23,30],true),peg([4,18]),dex([1],28,6,10,'Then taper over 7 days'),mp(29,7,75,'Only if ANC >0.75 & Plt >75; continues into consolidation')]},
 {id:'A-CONS',reg:'A',proto:'A-IND',label:'Regimen A: Consolidation',weeks:'Weeks 6–8',sw:6,needsCounts:true,items:()=>[it([1,8,15]),mp(1,21,75,'Continues to end of week 8')]},
 {id:'A-IM1',reg:'A',proto:'A-IND',label:'Regimen A: Interim maintenance I',weeks:'Weeks 9–17',sw:9,needsCounts:true,derived:true,items:()=>[vcr([1,29],true),dex([1,29],5,6,null,'D1–5 pulse'),it([15,43]),omtx([1,8,22,29,36,43,50,57])]},
 {id:'A-DI',reg:'A',proto:'A-DI',label:'Regimen A: Delayed intensification I',weeks:'Weeks 18–24',sw:18,derived:true,items:()=>[it([1]),vcr([1,8,15]),anth('Doxorubicin',[1,8,15]),peg([4]),cyc([29]),arac([30,37])]},
 {id:'A-MNT',reg:'A',proto:'A-MNT',label:'Regimen A: Maintenance',weeks:'From week 25',sw:25,cycles:true,needsCounts:true,derived:true,items:n=>maint(n)},
 {id:'B-IND',reg:'B',proto:'B-IND',label:'Regimen B: Induction',weeks:'Weeks 1–5',sw:1,items:()=>[it([1,8,29]),vcr([2,9,16,23,30],true),anth('Daunorubicin',[2,9,16,23]),peg([4,18]),dex([1],28,6,10,'Then taper over 7 days')]},
 {id:'B-CONS',reg:'B',proto:'B-IND',label:'Regimen B: BFM consolidation',weeks:'Weeks 6–10',sw:6,needsCounts:true,items:()=>[it([1,8,15]),cyc([1,15]),arac([2,9,16,23])]},
 {id:'B-IM',reg:'B',proto:'B-IMDI',label:'Regimen B: Interim maintenance',weeks:'Weeks 11–19',sw:11,derived:true,items:()=>[it([1,29]),vcr([1,29]),dex([1,29],5,6,null,'D1–5 pulse'),omtx([8,15,22,36,43,50,57])]},
 {id:'B-DI',reg:'B',proto:'B-IMDI',label:'Regimen B: Delayed intensification',weeks:'Weeks 20–26',sw:20,needsCounts:true,derived:true,items:()=>[it([1,29,36]),vcr([1,8,15]),dex([1,15],7,10,null,'D1–7 and D15–21'),anth('Doxorubicin',[1,8,15]),peg([4]),cyc([29]),arac([30,37])]},
 {id:'B-MNT',reg:'B',proto:'B-MNT',label:'Regimen B: Maintenance',weeks:'From week 27',sw:27,cycles:true,needsCounts:true,derived:true,items:n=>maint(n)},
 {id:'C-CONS',reg:'C',proto:'C-CONS',label:'Regimen C: Consolidation phase II',weeks:'Weeks 6–15',sw:6,derived:true,items:()=>[it([1,8,22],{note:'This file’s age bands differ; standard bands used pending your answer'}),vcr([15,22,43,50]),cyc([1,29]),arac([2,9,30,37]),peg([16,44])]},
 {id:'C-CAP',reg:'C',proto:'C-CAP',label:'Regimen C: Capizzi maintenance I',weeks:'Weeks 16–23',sw:16,items:()=>[it([1,31]),vcr([2,12,22,32,42]),{drug:'Methotrexate (Capizzi)',route:'IV',days:[2,12,22,32,42],perDay:[100,150,200,250,300],dose:{basis:'bsa',unit:'mg',text:'Escalating 100 → 300 mg/m²'},remind:true},peg([3,23])]},
 {id:'C-DI',reg:'C',proto:'C-CAP',label:'Regimen C: Delayed intensification I',weeks:'Weeks 24–31',sw:24,needsCounts:true,derived:true,items:()=>[it([1,29,36]),vcr([1,8,15,43,50]),peg([4,43]),anth('Doxorubicin',[1,8,15]),cyc([29]),arac([30,37])]},
 {id:'C-MNT',reg:'C',proto:'C-MNT',label:'Regimen C: Maintenance',weeks:'From week 32',sw:32,cycles:true,needsCounts:true,derived:true,items:n=>maint(n)}
];
const TPLID=Object.fromEntries(TPL.map(t=>[t.id,t]));
const TDRUGS=Object.fromEntries(TPL.map(t=>[t.id,[...new Set(t.items(1).map(i=>i.drug))]]));
let uid=0;const nid=p=>p+'-'+Date.now().toString(36)+'-'+(uid++).toString(36);
function buildPhase(code,tid,start,cycles){
  const t=TPLID[tid];const phaseId=nid(code+'-'+tid);const evs=[];
  t.items(cycles||2).forEach(it=>{
    const base={drug:it.drug,cls:CLS[it.drug]||'anti',route:it.route,remind:it.remind,note:it.note||'',derived:!!t.derived,phaseId,tpl:tid,phase:t.label,
      state:'scheduled',actualDate:null,origDate:null,reason:'',mod:null,verified:false};
    (it.days||[]).forEach((d,i)=>{const dose=clone(it.dose);if(it.perDay){dose.per=it.perDay[i];dose.text=it.perDay[i]+' mg/m² (dose '+(i+1)+' of 5)'}
      evs.push(Object.assign({},base,{id:nid(code),kind:'dose',day:d,week:t.sw+Math.floor((d-1)/7),date:add(start,d-1),dose}))});
    (it.courses||[]).forEach(([s,l])=>evs.push(Object.assign({},base,{id:nid(code),kind:'course',day:s,len:l,week:t.sw+Math.floor((s-1)/7),date:add(start,s-1),end:add(start,s+l-2),dose:clone(it.dose)})));
  });
  evs.sort((a,b)=>a.date.localeCompare(b.date)||a.drug.localeCompare(b.drug));
  return {phase:{id:phaseId,tpl:tid,reg:t.reg,label:t.label,weeks:t.weeks,start,cycles:t.cycles?(cycles||2):null,superseded:null},events:evs};
}
const STD_CHECKS=['Name and MRN match the record sheet','Weight and BSA confirmed for dosing','Diagnosis and protocol confirmed','Current phase and day 1 date confirmed','Upcoming doses checked against the protocol references'];

/* ---------- state ---------- */
const DEMO=makeDemo();
let saved=hydrate(clone(DEMO));
let S=clone(saved);
let dirty=0;
let asOf=cairo();
const ui={showAll:{},rmStart:null,rmSel:null,rmPt:'all',mar:{},editK:null,mailEdit:{},sf:{},gq:'',calMode:'week',focusSearch:false,view:'overview',patient:null,calMonth:null,calSel:null,calPatient:'all',calCls:'all',calStatus:'all',calShowOral:false,pq:'',pstatus:'all',reg:'all',prq:'',refReg:'all',emailDate:null,logTab:'rem',logPt:'all',sel:{}};
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
function makeDemo(){
  const d=clone(SEED), today=cairo();
  d.snapshot=today;
  d.patients=[
    {code:'DEMO-A',name:'Demo patient A',mrn:'DEMO-001',status:'active',approval:{state:'approved',at:today},days:[0,2,7]},
    {code:'DEMO-B',name:'Demo patient B',mrn:'DEMO-002',status:'active',approval:{state:'pending'},days:[1,4]}
  ].map(({days,...patient})=>{
    const phase={id:patient.code+'-phase',tpl:'A-IND',reg:'A',label:'Fictional sample phase',weeks:'Week 1',start:today};
    return {...patient,registered:today,admission:today,diagnosis:'Fictional training record',protocol:'Demonstration',
      phases:[phase],events:days.map((offset,index)=>({
        id:patient.code+'-visit-'+index,phaseId:phase.id,tpl:phase.tpl,phase:phase.label,drug:'Demo treatment',cls:'anti',
        route:'Demo only',day:offset+1,week:1,date:add(today,offset),kind:'dose',dose:{basis:'demo',text:'No clinical dose'},
        remind:true,state:'scheduled',note:'Fictional entry for workflow testing.'
      }))};
  });
  return d;
}
function readBoard(data){
  const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const safeKey=value=>typeof value==='string'&&value.length>0&&!(value in Object.prototype);
  const optionalLists=(record,keys)=>keys.every(key=>record[key]==null||Array.isArray(record[key]));
  if(!isObject(data)||!Array.isArray(data.patients)||!Array.isArray(data.protocols)||
    !optionalLists(data,['audit','sent_log'])||
    !data.protocols.every(p=>isObject(p)&&safeKey(p.id)&&typeof p.phase==='string'&&Array.isArray(p.rows)&&p.rows.every(row=>Array.isArray(row)&&safeKey(row[0]))&&Array.isArray(p.flags)&&p.flags.every(isObject))||
    !data.patients.every(p=>isObject(p)&&safeKey(p.code)&&
      optionalLists(p,['events','phases','seedPhases','seedOps','history','checklist','protocolChanges','measurements','conflicts','modLog','postponements'])&&
      (!p.events||Array.isArray(p.phases)&&p.events.every(e=>isObject(e)&&typeof e.id==='string'&&safeKey(e.drug)&&
        typeof e.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&Number.isFinite(P(e.date).getTime())&&isObject(e.dose))))){
    throw new Error('Invalid board export');
  }
  delete data.demoSeed;
  return hydrate(data);
}

function hydrate(d){
  ['patients','sent_log','audit'].forEach(k=>{if(!d[k])d[k]=[]});if(!d.settings)d.settings={lead:5,runway:7};
  if(!d.settings.bsaFormula)d.settings.bsaFormula={expr:'',source:'',by:'',at:'',verified:false};
  if(!d.formulary)d.formulary={};Object.keys(CLS).forEach(k=>{if(!d.formulary[k])d.formulary[k]={conc:null,unit:'mg/mL',form:'',na:false,source:'',by:'',at:''}});
  if(!d.stock)d.stock={};(d.protocols||[]).forEach(pr=>{if(!d.stock[pr.id])d.stock[pr.id]={};[...new Set(pr.rows.map(r=>r[0]))].forEach(dr=>{if(!d.stock[pr.id][dr])d.stock[pr.id][dr]={state:'unverified',note:'',by:'',at:''}})});
  d.patients.forEach(p=>{
    if(!p.events){p.events=[];p.phases=p.phases||[];
      (p.seedPhases||[]).forEach(sp=>{const b=buildPhase(p.code,sp.tpl,sp.start,sp.cycles);p.phases.push(b.phase);p.events.push(...b.events)});
      (p.seedOps||[]).forEach(op=>{
        const match=e=>e.drug===op.drug&&e.day===op.day&&(!op.tpl||e.tpl===op.tpl);
        if(op.op==='document')p.events.filter(match).forEach(e=>{e.state='documented';e.actualDate=op.actual||e.date;e.reason=op.note||'On the record sheet'});
        if(op.op==='given')p.events.filter(match).forEach(e=>{e.state='administered';e.actualDate=op.actual||e.date;e.reason=op.note||''});
        if(op.op==='delay')p.events.filter(match).forEach(e=>{const n=diff(op.to,e.date);const ph=e.phaseId;
          if(op.shift)p.events.filter(x=>x.phaseId===ph&&x.date>e.date&&x.state==='scheduled'&&!match(x)).forEach(x=>{if(!x.origDate)x.origDate=x.date;x.date=add(x.date,n);if(x.end)x.end=add(x.end,n);x.reason='Moved with the documented delay'});
          e.origDate=e.date;e.date=op.to;if(e.end)e.end=add(e.end,n);e.state='delayed';e.reason=op.reason;});
      });
      p.events.forEach(e=>{if(e.state==='scheduled'&&e.date<d.snapshot){e.state='unrecorded';e.reason='Before registration and not on the record sheet'}});
      p.events.sort((a,b)=>a.date.localeCompare(b.date));
      delete p.seedPhases;delete p.seedOps;}
    if(!p.history)p.history=[];if(!p.checklist)p.checklist=[];if(!p.protocolChanges)p.protocolChanges=[];if(!p.approval)p.approval={state:'pending'};
    if(!p.record)p.record={source:'',entries:[]};
    ['measurements','conflicts','modLog','postponements'].forEach(k=>{if(!p[k])p[k]=[]});
    if(p.height===undefined)p.height=null;
    if(!p.verification){p.verification={first:null,second:null};if(p.approval&&p.approval.state==='approved')p.verification.first={by:'Not recorded (approved before two-person verification)',at:p.approval.at||'',legacy:true}}
  });
  return d;
}
const lead=()=>S.settings.lead||5;
const RUN=()=>S.settings.runway||7;
const pt=code=>S.patients.find(p=>p.code===code);
const ALL=()=>{const a=[];S.patients.forEach(p=>p.events.forEach(e=>a.push({p,e})));return a.sort((x,y)=>x.e.date.localeCompare(y.e.date)||(x.p.name||'').localeCompare(y.p.name||''))};
const sentFor=e=>S.sent_log.find(s=>s.eventId===e.id&&s.date===e.date);
const live=e=>e.state==='scheduled'||e.state==='delayed';
const approved=p=>!!(p.verification&&p.verification.first);
function pstate(p){if(p.status==='delayed')return{k:'delayed',t:'Delayed',c:'st-red'};if(approved(p))return{k:'approved',t:'Confirmed',c:'st-green'};return{k:'awaiting',t:'Awaiting approval',c:'st-yellow'}}
const awaiting=e=>e.remind&&((live(e)&&e.date<asOf)||e.state==='documented');
function rem(e,p){
  if(!e.remind)return{k:'none',t:'Home dose, no reminder',c:'t-na'};
  if(!live(e))return{k:'na',t:'No reminder needed',c:'t-na'};
  const s=sentFor(e);if(s)return{k:'sent',t:(s.method==='gmail'?'Sent ':'Marked sent ')+fd(s.sentOn),c:'t-sent'};
  if(e.date<asOf)return{k:'past',t:'Date passed',c:'t-na'};
  const r=add(e.date,-lead());
  if(r<asOf)return{k:'miss',t:'Reminder missed',c:'t-miss'};
  if(p&&!approved(p))return{k:'blocked',t:r===asOf?'Due today: approve patient':'Waits for approval',c:'t-wait'};
  if(r===asOf)return{k:'due',t:'Reminder due today',c:'t-due'};
  return{k:'plan',t:'Reminder '+fd(r),c:'t-plan'};
}
const STATE={notgiven:['Not given','t-miss'],scheduled:['Scheduled','t-plan'],delayed:['Rescheduled','t-plan'],postponed:['Postponed','t-miss'],administered:['Given','t-sent'],held:['Held','t-due'],cancelled:['Cancelled','t-na'],documented:['On sheet: confirm','t-wait'],unrecorded:['Not on sheet','t-na'],superseded:['Superseded','t-na']};
function stateTag(e){if(!e.remind&&live(e))return'<span class="tag t-na">Home dose</span>';if(live(e)&&e.date<asOf)return'<span class="tag t-wait">Needs confirmation</span>';if(e.state==='administered'&&e.auto)return'<span class="tag t-sent" title="Confirmed by default because the date passed and nothing else was recorded">Given (default)</span>';const s=(e.state==='delayed'&&e.postponed?STATE.postponed:STATE[e.state])||STATE.scheduled;return'<span class="tag '+s[1]+'">'+s[0]+((e.state==='administered'||e.state==='documented')&&e.actualDate&&e.actualDate!==e.date?' '+fd(e.actualDate):'')+'</span>'}
function ageYears(p){const a=parseFloat(p.ageYears);return isNaN(a)?null:a}
function calc(e,p){
  if(e.mod)return{v:e.mod.value,u:e.mod.unit,f:'Physician-approved modified dose',type:'Physician-approved modified'};
  const d=e.dose;
  if(d.basis==='demo')return{miss:'No clinical dose'};
  if(d.basis==='age'){const a=ageYears(p);if(a==null)return{miss:'Age needed'};const v=a<2?8:a<3?10:12;return{v,u:'mg',f:'Age '+a+' yrs → '+(a<2?'<2 yrs':a<3?'2 yrs':'≥3 yrs')+' band',type:'Patient-specific'}}
  if(d.basis==='bsa'){if(!p.bsa)return{miss:'BSA needed'};const raw=r2(d.per*p.bsa);let v=raw,capped=false;if(d.cap!=null&&raw>d.cap){v=d.cap;capped=true}
    return{v,u:d.unit,raw,capped,cap:d.cap,f:d.per+' × '+p.bsa+' m²'+(capped?' = '+raw+', capped at '+d.cap:''),type:'Patient-calculated',warn:d.warn&&raw>d.warn?'Above '+d.warn+' '+d.unit+'; this file states no maximum':null}}
  return{v:null,f:d.text};
}
function vol(e,p,c){c=c||calc(e,p);if(c.miss||c.v==null)return null;const f=S.formulary[e.drug];if(!f)return{miss:'Concentration not set'};if(f.na)return{na:true};if(!f.conc)return{miss:'Concentration not set, volume not calculated'};
  const du=String(c.u).replace('/day','');const fu=(f.unit||CUNIT(e.drug)).split('/')[0];if(fu!==du)return{miss:'Concentration unit ('+f.unit+') does not match the dose unit ('+du+')'};
  return{ml:r2(c.v/f.conc),conc:f.conc,unit:f.unit||CUNIT(e.drug),form:f.form,perDay:/\/day/.test(c.u)}}
function disc(e,p){if(!e.entered)return null;const c=calc(e,p);if(c.miss||c.v==null)return{noCalc:true};const exp=c.v;const d=r2(e.entered.value-exp);if(Math.abs(d)<0.005)return null;
  const pct=exp?Math.round(d/exp*1000)/10:null;const a=e.discAuth;const auth=a&&a.entered===e.entered.value&&a.expected===exp?a:null;return{exp,ent:e.entered.value,u:c.u,d,pct,major:Math.abs(pct)>5,auth}}
const discOpen=(e,p)=>{const x=disc(e,p);return !!(x&&!x.noCalc&&!x.auth)&&e.state!=='cancelled'&&e.state!=='superseded'};
function stockOf(e){const t=TPLID[e.tpl];const pr=t&&t.proto;const s=S.stock[pr]&&S.stock[pr][e.drug];return s?s.state:'unverified'}
function unavailIn(drug){return Object.entries(S.stock||{}).filter(([pr,m])=>m[drug]&&m[drug].state==='unavailable').map(([pr])=>pr)}
const protoName=id=>{const p=S.protocols.find(x=>x.id===id);return p?'Regimen '+p.regimen+' '+p.phase.charAt(0).toLowerCase()+p.phase.slice(1):id};
const shortage=e=>unavailIn(e.drug).length>0;
const shortUpcoming=()=>ALL().filter(x=>live(x.e)&&x.e.date>=asOf&&shortage(x.e));
function doseHTML(e,p,brief){const c=calc(e,p);let h;
  if(e.dose.basis==='demo'&&!e.mod)h='<span class="sub">No clinical dose</span>';
  else if(c.miss)h='<span class="warnt">'+c.miss+'</span><div class="sub">'+esc(e.dose.text)+'</div>';
  else{const v=vol(e,p,c);
   h='<div class="dose"><b>'+esc(c.v)+' '+esc(c.u)+'</b>'+(e.mod?' <span class="tag t-wait">Modified</span>':'')+(e.verified?' <span class="tag t-sent">Verified</span>':'')+'</div>'+
   (v?(v.ml!=null?'<div class="mlline">'+v.ml+' mL'+(v.perDay?'/day':'')+' <span class="sub">system-calculated at '+v.conc+' '+esc(v.unit)+'</span></div>':(v.na?'':'<div class="sub mlmiss">mL: '+esc(v.miss)+'</div>')):'')+
   (brief?'':'<div class="sub">'+esc(c.f)+'</div><div class="sub">Protocol: '+esc(e.dose.text)+'</div>')+(c.warn?'<div class="warnt">'+esc(c.warn)+'</div>':'');}
  const x=disc(e,p);if(x&&!x.noCalc)h+='<div class="'+(x.auth?'discok':'discbad')+'">'+(x.auth?'Discrepancy authorized':'Dose discrepancy')+': entered '+x.ent+' vs calculated '+x.exp+' '+esc(x.u)+' ('+(x.d>0?'+':'')+x.d+', '+(x.pct>0?'+':'')+x.pct+'%)</div>';
  else if(e.entered&&!x)h+='<div class="sub">Entered dose matches the calculation</div>';
  if(shortage(e))h+='<div class="shortbad">Shortage alert: purchase required</div>';
  return h;}
const lbl=e=>e.kind==='course'?e.drug+' ('+(e.len===1?'1 day':e.len+' days')+')':e.drug;
const mrnTxt=p=>p.mrn?'MRN '+p.mrn:'MRN not recorded';
const nameH=p=>{const s=pstate(p);return'<span class="pname '+s.c+'"><span class="sdot" aria-hidden="true"></span><bdi class="nm" dir="auto">'+esc(p.name||p.code)+'</bdi></span>'};
const stTag=p=>{const s=pstate(p);return'<span class="tag stt '+s.c+'">'+s.t+'</span>'};
const whoH=p=>'<span class="nmline">'+nameH(p)+'<span class="mrn">'+esc(mrnTxt(p))+'</span>'+stTag(p)+'</span>';
const apTag=stTag;
const curPh=p=>p.phases.filter(x=>!x.superseded).slice(-1)[0];
const curPhase=p=>{const ph=curPh(p);return ph?ph.label:'No current phase'};
const regOf=p=>{const ph=curPh(p);return ph?'Regimen '+ph.reg:(p.protocol||'Not set')};
function refBtn(tpl,drug){return REFS.hits[tpl+'|'+drug]?'<button class="refbtn" data-act="ref" data-t="'+tpl+'" data-d="'+esc(drug)+'" title="Show the protocol page for this dose">References</button>':''}

/* ---------- metrics ---------- */
function metrics(){const a=ALL();const o={due:[],miss:[],blocked:[],week:[],wait:[],q:0,pend:S.patients.filter(p=>!approved(p)),disc:[],short:[],conf:[],unver:0};
  a.forEach(x=>{const r=rem(x.e,x.p);if(r.k==='due')o.due.push(x);if(r.k==='miss')o.miss.push(x);if(r.k==='blocked'&&add(x.e.date,-lead())<=asOf)o.blocked.push(x);
    if(x.e.remind&&live(x.e)&&x.e.date>=asOf&&x.e.date<=add(asOf,RUN()))o.week.push(x);if(awaiting(x.e))o.wait.push(x);
    if(discOpen(x.e,x.p))o.disc.push(x);if(live(x.e)&&x.e.date>=asOf&&shortage(x.e))o.short.push(x)});
  S.patients.forEach(p=>(p.conflicts||[]).forEach(c=>{if(!c.resolved)o.conf.push({p,c})}));
  Object.values(S.stock||{}).forEach(m=>Object.values(m).forEach(v=>{if(v.state==='unverified')o.unver++}));
  S.protocols.forEach(p=>p.flags.forEach(f=>{if(!f.resolved)o.q++}));return o}

/* ---------- icons ---------- */
const I={
 overview:'<path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z"/>',
 approvals:'<path d="M9 2h6v2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3V2Zm1.2 14.4 6.6-6.6-1.4-1.4-5.2 5.2-2.2-2.2-1.4 1.4 3.6 3.6Z"/>',
 calendar:'<path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 7H5v10h14V9Z"/>',
 patients:'<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9c0-3.3 3.1-6 7-6s7 2.7 7 6v1H2v-1Zm15-9a3 3 0 1 0 0-6v6Zm1.5 3.2c2.1.7 3.5 2.6 3.5 4.8v2h-3v-1c0-2.3-.2-4.2-.5-5.8Z"/>',
 protocols:'<path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1.5V8h4.5L14 3.5ZM8 12v2h8v-2H8Zm0 4v2h6v-2H8Z"/>',
 references:'<path d="M4 3h7a3 3 0 0 1 1 .2A3 3 0 0 1 13 3h7v16h-7a2 2 0 0 0-1 .3 2 2 0 0 0-1-.3H4V3Zm2 2v12h5V6a1 1 0 0 0-1-1H6Zm12 0h-4a1 1 0 0 0-1 1v11h5V5Z"/>',
 email:'<path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm9 7.2L4.4 7H4v1.3l8 5.5 8-5.5V7h-.4L12 12.2Z"/>',
 conc:'<path d="M9 2h6v2h-1v5.3l5.6 9.7A2 2 0 0 1 17.9 22H6.1a2 2 0 0 1-1.7-3L10 9.3V4H9V2Zm3 9.2L8.4 17h7.2L12 11.2Z"/>',
 mar:'<path d="M9 2h6a1 1 0 0 1 1 1v1h3a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V3a1 1 0 0 1 1-1Zm1 2v2h4V4h-4ZM7 10v2h2v-2H7Zm4 0v2h6v-2h-6Zm-4 4v2h2v-2H7Zm4 0v2h6v-2h-6Z"/>',
 search:'<path d="M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"/>',
 pharmacy:'<path d="M8.5 2.5a4.9 4.9 0 0 1 6.9 0 4.9 4.9 0 0 1 0 6.9l-6 6a4.9 4.9 0 0 1-6.9-6.9l6-6Zm1.4 1.4-3 3 4.6 4.6 3-3a3.3 3.3 0 0 0-4.6-4.6ZM15 13h7v2h-7v-2Zm2.5-3h2v7h-2v-7Z"/>',
 ai:'<path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2Zm7 13 1 2.5 2.5 1-2.5 1L19 22l-1-2.5-2.5-1 2.5-1L19 15Z"/>',
 log:'<path d="M4 4h16v2H4V4Zm0 5h16v2H4V9Zm0 5h10v2H4v-2Zm0 5h10v2H4v-2Z"/>',
 settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 5.4v-2.8l-2.3-.5a7 7 0 0 0-.7-1.6l1.3-2-2-2-2 1.3a7 7 0 0 0-1.6-.7L13.4 3h-2.8l-.5 2.3a7 7 0 0 0-1.6.7l-2-1.3-2 2 1.3 2a7 7 0 0 0-.7 1.6L3 10.6v2.8l2.3.5c.2.6.4 1.1.7 1.6l-1.3 2 2 2 2-1.3c.5.3 1 .5 1.6.7l.5 2.3h2.8l.5-2.3c.6-.2 1.1-.4 1.6-.7l2 1.3 2-2-1.3-2c.3-.5.5-1 .7-1.6l2.3-.5Z"/>',
 edit:'<path d="M3 17.2V21h3.8L17.9 9.9l-3.8-3.8L3 17.2Zm17.7-10.2a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.8 3.8 1.7-1.9Z"/>',
 warn:'<path d="M12 2 1 21h22L12 2Zm1 15h-2v2h2v-2Zm0-8h-2v6h2V9Z"/>',
 mail:'<path d="M3 5h18v14H3V5Zm9 7L5 7.5V17h14V7.5L12 12Z"/>',
 check:'<path d="m9.5 16.2-4.2-4.2-1.4 1.4 5.6 5.6L21 7.5l-1.4-1.4z"/>',
 swap:'<path d="M7 7h11l-3-3 1.4-1.4L21.8 8l-5.4 5.4L15 12l3-3H7V7Zm10 10H6l3 3-1.4 1.4L2.2 16l5.4-5.4L9 12l-3 3h11v2Z"/>',
 drop:'<path d="M12 2s7 7.6 7 12.5A7 7 0 0 1 5 14.5C5 9.6 12 2 12 2Zm-3 13a3 3 0 0 0 3 3v-2a1 1 0 0 1-1-1H9Z"/>'};
const icon=(n,s)=>'<svg width="'+(s||18)+'" height="'+(s||18)+'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'+I[n]+'</svg>';

/* ---------- layout ---------- */
const VIEWS=[['overview','Overview'],['mar','MAR'],['conc','Concentrations'],['search','Search'],['approvals','Approvals'],['calendar','Calendar'],['patients','Patients'],['protocols','Protocols'],['references','References'],['pharmacy','Pharmacy'],['email','Email'],['log','Reminder log'],['settings','Settings']];
const TITLES={conc:'Drug concentrations',mar:'Medication administration record',search:'Patient search',pharmacy:'Pharmacy',overview:'Overview',approvals:'Approvals',calendar:'Treatment calendar',patients:'Patients',protocols:'Protocols',references:'References',email:'Reminder email',log:'Reminder log',settings:'Settings'};
function render(){
  if(!canWrite){renderSignIn();return}
  const m=metrics();
  const cnt={overview:m.due.length+m.miss.length?'<span class="cnt '+(m.miss.length?'red':'hot')+'">'+(m.due.length+m.miss.length)+'</span>':'',approvals:(m.pend.length+m.wait.length)?'<span class="cnt hot">'+(m.pend.length+m.wait.length)+'</span>':'',patients:'<span class="cnt">'+S.patients.length+'</span>',protocols:m.q?'<span class="cnt hot">'+m.q+'</span>':'',email:m.due.length?'<span class="cnt hot">1</span>':''};
  const L=Object.fromEntries(VIEWS);const showAp=m.pend.length||m.wait.length||ui.view==='approvals';
  const GROUPS=[['Daily work',['overview'].concat(showAp?['approvals']:[],['mar','calendar','patients','email'])],['Pharmacy & protocols',['pharmacy','conc','protocols','references']],['Records',['log','settings']]];
  const nav=GROUPS.map(([g,ks])=>'<div class="navg">'+esc(g)+'</div>'+ks.map(k=>'<a href="#'+k+'"'+(ui.view===k?' aria-current="page"':'')+'>'+icon(k)+'<span class="lbl">'+L[k]+'</span>'+(cnt[k]||'')+'</a>').join('')).join('');
  const disabled=busy?' disabled':'';
  const save='<button class="btn" data-act="addpt"'+disabled+'>+ Add patient</button>'+
    (busy?'<span class="savedok" role="status">Please wait…</span>':
     dirty?'<button class="btn ghost" data-act="discard">Discard</button><button class="btn pri" data-act="save">Save changes <span class="badge">'+dirty+'</span></button>':
     '<span class="savedok">'+icon('check',16)+'Saved</span>');
  document.getElementById('root').innerHTML=
   '<div class="app"><aside class="side"><div class="brand"><span class="mark">'+icon('drop',20).replace('currentColor','#fff')+'</span><div><b>Chemo board</b><small>Hematology pharmacy</small></div></div><nav class="nav" aria-label="Sections">'+nav+'</nav>'+
   '<div class="foot"><b>UKALL 2011</b><br>Reminders '+lead()+' days ahead<br>Africa/Cairo time<br>'+(S.savedAt?'Saved '+esc(S.savedAt):'Not yet saved')+'</div></aside>'+
   '<div class="main"><div class="top"><div class="topin"><h1>'+TITLES[ui.view]+'</h1><label class="gsearch">'+icon('search',16)+'<input id="gsearch" type="search" placeholder="Search name, MRN, drug, week…" value="'+esc(ui.gq||'')+'" aria-label="Search patients" dir="auto"></label><label class="asof">As of <input type="date" id="asof" value="'+asOf+'"></label>'+(asOf!==cairo()?'<button class="btn sm" data-act="today">Back to today</button>':'')+save+'</div></div>'+
   '<div class="content" id="view"><div class="banner w">'+icon('warn',16)+'<span><b>Demo only.</b> Use fictional records. Saved changes are shared with approved editors.</span></div>'+(sharedNotice?'<div class="banner w" role="status">'+esc(sharedNotice)+'</div>':'')+V[ui.view](m)+'</div></div></div>';
  document.getElementById('asof').addEventListener('change',ev=>{if(ev.target.value){asOf=ev.target.value;ui.emailDate=null;render()}});
  if(ui.focusSearch){const g=document.getElementById('gsearch');if(g){g.focus();g.setSelectionRange(g.value.length,g.value.length)}ui.focusSearch=false}
  renderAI();
}
function banner(){
  let h='';
  const su=shortUpcoming();if(su.length){const ds=[...new Set(su.map(x=>x.e.drug))];h+='<div class="banner bad">'+icon('pharmacy',16)+'<span><b>Shortage alert:</b> '+ds.map(esc).join(', ')+' marked unavailable in the pharmacy checklist. '+su.length+' upcoming dose'+(su.length>1?'s':'')+' for '+new Set(su.map(x=>x.p.code)).size+' patient'+(new Set(su.map(x=>x.p.code)).size>1?'s':'')+' need'+(su.length>1?'':'s')+' '+(ds.length>1?'them':'it')+', first on '+fd(su[0].e.date)+'. <a href="#pharmacy">Review in Pharmacy</a></span></div>'}
  return h;
}
function pill(x,r){const st=pstate(x.p);return'<button class="drug cls-'+x.e.cls+' '+(r.k==='miss'||r.k==='due'?r.k:'')+(shortage(x.e)?' short':'')+'" data-act="ev" data-p="'+esc(x.p.code)+'" data-e="'+x.e.id+'"><span class="cd"></span><span><span class="who pname '+st.c+'" dir="auto"><span class="sdot"></span><b>'+esc(x.p.name||x.p.code)+'</b></span>'+esc(x.e.drug)+' · wk '+x.e.week+'<br><span class="small-muted">'+st.t+(x.e.postponed?' · postponed':'')+'</span>'+(shortage(x.e)?'<br><span class="shortchip">Purchase required</span>':'')+'</span></button>'}

/* ---------- views ---------- */
const V={};
function shortName(p){const n=(p.name||p.code).replace(/\s+/g,' ').trim().split(' ');return n.slice(0,2).join(' ')}
function initials(p){const w=(p.name||p.code).replace(/[…\.]/g,'').trim().split(/\s+/);return(w[0]?w[0][0]:'')+(w[1]?w[1][0]:'')}
function roadmap(){
  const start=ui.rmStart||asOf;const days=RUN()+1;const sel=ui.rmSel&&ui.rmSel>=start&&ui.rmSel<=add(start,days-1)?ui.rmSel:(asOf>=start&&asOf<=add(start,days-1)?asOf:start);
  const fit=x=>ui.rmPt==='all'||x.p.code===ui.rmPt;
  const items=d=>ALL().filter(x=>x.e.date===d&&x.e.remind&&(live(x.e)||x.e.state==='administered')&&fit(x));
  const email=add(asOf,lead());
  let cards='';for(let i=0;i<days;i++){const d=add(start,i);const xs=items(d);const pts=[...new Map(xs.map(x=>[x.p.code,x.p])).values()];const sh=xs.some(x=>live(x.e)&&shortage(x.e));
    cards+='<button class="tday'+(d===sel?' sel':'')+(d===asOf?' today':'')+(d<asOf?' past':'')+(xs.length?' has':'')+'" data-act="rmday" data-d="'+d+'" aria-pressed="'+(d===sel)+'" aria-label="'+fl(d)+', '+xs.length+' dose'+(xs.length===1?'':'s')+'">'+
     '<span class="tdw">'+(d===asOf?'Today':P(d).toLocaleDateString('en-GB',{timeZone:'UTC',weekday:'short'}))+'</span><span class="tdn">'+P(d).getUTCDate()+'</span><span class="tdm">'+P(d).toLocaleDateString('en-GB',{timeZone:'UTC',month:'short'})+'</span>'+
     '<span class="tdc">'+(xs.length?xs.length+' dose'+(xs.length>1?'s':''):'Free')+'</span>'+
     '<span class="tnames">'+pts.slice(0,3).map(p=>'<span class="tname '+pstate(p).c+'" dir="auto"><span class="sdot"></span><span>'+esc(String(p.name||p.code).replace(/\s+/g,' '))+'</span></span>').join('')+(pts.length>3?'<span class="tname more">+'+(pts.length-3)+' more</span>':'')+'</span>'+
     '<span class="tbars">'+xs.slice(0,6).map(x=>'<i class="cls-'+x.e.cls+'"></i>').join('')+'</span>'+
     (d===email?'<span class="tmark mail" title="Treatment date covered by today’s reminder email">'+icon('mail',13)+'</span>':'')+(sh?'<span class="tmark shortm" title="Needs an unavailable drug">!</span>':'')+'</button>'}
  const xs=items(sel);const npts=new Set(xs.map(x=>x.p.code)).size;const nsh=xs.filter(x=>live(x.e)&&shortage(x.e)).length;
  const tl=xs.length?'<ol class="tline">'+xs.map(x=>{const r=rem(x.e,x.p);const c=calc(x.e,x.p);const v=c.miss?null:vol(x.e,x.p,c);const sh=live(x.e)&&shortage(x.e);
     return'<li class="titem'+(sh?' short':'')+(x.e.state==='administered'?' done':'')+'"><span class="tnode cls-'+x.e.cls+'"></span><div class="tcard"><div class="tc-head"><span class="tc-drug">'+esc(lbl(x.e))+'</span><span class="tc-wk">Week '+x.e.week+'</span><span class="spacer"></span>'+stateTag(x.e)+'</div>'+
     '<div class="tc-who">'+whoH(x.p)+'</div>'+
     '<div class="tc-dose"><div><span class="tc-l">Dose</span><b>'+(c.miss?'<span class="warnt">'+esc(c.miss)+'</span>':c.v+' '+esc(c.u))+'</b></div><div><span class="tc-l">Volume</span><b>'+(v?(v.ml!=null?v.ml+' mL'+(v.perDay?'/day':''):v.na?'Oral':'<a href="#conc" class="mlmiss">Set concentration</a>'):'—')+'</b>'+(v&&v.ml!=null?'<span class="tc-s">at '+v.conc+' '+esc(v.unit)+'</span>':'')+'</div><div><span class="tc-l">Route</span><b>'+esc(x.e.route)+'</b></div><div><span class="tc-l">BSA</span><b>'+(x.p.bsa?x.p.bsa+' m²':'—')+'</b></div></div>'+
     (sh?'<div class="shortbad">Shortage alert: '+esc(x.e.drug)+' is marked unavailable. Purchase required.</div>':'')+
     '<div class="tc-foot"><span class="tag '+r.c+'">'+r.t+'</span><span class="spacer"></span><button class="btn sm" data-act="ev" data-p="'+esc(x.p.code)+'" data-e="'+x.e.id+'">Open</button>'+ppBtn(x.p,x.e)+'</div></div></li>'}).join('')+'</ol>':
     '<div class="tempty"><span class="tempty-ic">'+icon('check',26)+'</span><b>No clinic doses on '+fd(sel)+'</b><span>Pick another day above.</span></div>';
  return'<div class="panel tl2"><div class="tl-top"><div class="tl-nav"><button class="btn sm round" data-act="rmnav" data-v="-7" aria-label="Previous week">‹</button><button class="btn sm" data-act="rmnav" data-v="0">Today</button><button class="btn sm round" data-act="rmnav" data-v="7" aria-label="Next week">›</button><span class="tl-range">'+fd(start,{weekday:undefined})+' – '+fd(add(start,days-1),{weekday:undefined,year:'numeric'})+'</span></div>'+
   '<label class="tl-filter">'+icon('patients',16)+'<select class="input" id="rm-pt" aria-label="Show patient"><option value="all">All patients</option>'+S.patients.map(p=>'<option value="'+esc(p.code)+'"'+(ui.rmPt===p.code?' selected':'')+'>'+esc(p.name||p.code)+'</option>').join('')+'</select></label></div>'+
   '<div class="tdays">'+cards+'</div>'+
   '<div class="tl-legend"><span><i class="lg today"></i>Today</span><span>'+icon('mail',13)+' Email day</span><span><i class="lg short">!</i> Unavailable drug</span><span><i class="lg av st-green"></i>Confirmed</span><span><i class="lg av st-red"></i>Delayed</span></div>'+
   '<div class="tl-day"><div class="tl-dayhead"><h3>'+fl(sel)+'</h3><span class="tl-sum">'+(xs.length?xs.length+' dose'+(xs.length>1?'s':'')+' · '+npts+' patient'+(npts>1?'s':'')+(nsh?' · <span class="shorttext">'+nsh+' need an unavailable drug</span>':''):'')+'</span></div>'+tl+'</div></div>';
}
function attention(m){const rows=[];
  const add_=(cls,ic,title,sub,body,go)=>rows.push('<details class="att '+cls+'"><summary><span class="atic">'+icon(ic,18)+'</span><span class="attx"><b>'+title+'</b><span class="sub">'+sub+'</span></span>'+(go?'<a class="btn sm" href="'+go+'">Open</a>':'')+'<span class="chev">⌄</span></summary><div class="attbody">'+body+'</div></details>');
  if(m.miss.length)add_('bad','warn',m.miss.length+' dose'+(m.miss.length>1?'s':'')+' without a reminder','Inside the '+lead()+'-day reminder lead and no email was sent',evTable(m.miss,{rem:true,why:true}));
  if(m.short.length){const ds=[...new Set(m.short.map(x=>x.e.drug))];add_('bad','pharmacy','Shortage: '+ds.join(', '),m.short.length+' upcoming dose'+(m.short.length>1?'s':'')+' need'+(m.short.length>1?'':'s')+' an unavailable drug',evTable(m.short,{rem:true}),'#pharmacy')}
  if(m.disc.length)add_('bad','warn',m.disc.length+' dose discrepanc'+(m.disc.length>1?'ies':'y'),'Entered dose differs from the calculated dose',discTable(m.disc));
  if(m.conf.length)add_('warn','warn',m.conf.length+' data conflict'+(m.conf.length>1?'s':''),'Values that need checking against the record','<ul class="checklist">'+m.conf.map(x=>'<li><span style="flex:1">'+whoH(x.p)+'<div class="small">'+esc(x.c.text)+'</div></span><button class="btn sm" data-act="openpt" data-p="'+esc(x.p.code)+'">Open</button></li>').join('')+'</ul>');
  if(m.pend.length)add_('warn','approvals',m.pend.length+' patient'+(m.pend.length>1?'s':'')+' awaiting approval','Reminders start after approval','<div class="list">'+m.pend.map(p=>'<div class="li">'+whoH(p)+'<span class="spacer"></span><button class="btn sm" data-act="openpt" data-p="'+esc(p.code)+'">Open</button></div>').join('')+'</div>','#approvals');
  if(m.wait.length)add_('warn','check',m.wait.length+' past dose'+(m.wait.length>1?'s':'')+' to confirm','Not confirmed by default','<div class="list">'+m.wait.map(x=>'<div class="li">'+whoH(x.p)+'<span class="grow">'+esc(lbl(x.e))+', week '+x.e.week+', '+fd(x.e.date)+'</span><button class="btn sm" data-act="ev" data-p="'+esc(x.p.code)+'" data-e="'+x.e.id+'">Open</button></div>').join('')+'</div>','#approvals');
  return rows.length?'<div class="sec"><div class="sechead"><h2>Needs attention</h2><p>Select a line to see the details.</p></div><div class="panel attlist">'+rows.join('')+'</div></div>':'<div class="sec"><div class="panel pad allclear">'+icon('check',20)+'<b>Nothing needs attention</b></div></div>';}
V.overview=function(m){
  const today=ALL().filter(x=>x.e.date===asOf&&x.e.remind&&(live(x.e)||x.e.state==='administered')).length;
  const att=m.miss.length+m.short.length+m.disc.length+m.conf.length+m.pend.length+m.wait.length;
  let h=banner()+'<div class="kpis k4">'+kpi('week',today,'Clinic doses today','calendar')+kpi('week',m.week.length,'Doses in the next '+RUN()+' days','mar')+kpi(att?'miss':'q',att,'Items needing attention','attention')+kpi('due',m.due.length,'Reminder items due today','email')+'</div>';
  h+='<div class="sec"><div class="sechead"><h2>This week’s treatments</h2><p>Select a day to see its doses.</p></div>'+roadmap()+'</div>';
  h+='<div id="attention">'+attention(m)+'</div>';
  const tp=[...new Set(m.due.map(x=>x.p.code))];const target=add(asOf,lead());
  h+='<div class="sec two"><div><div class="sechead"><h2>Today’s reminder email</h2></div><div class="panel mailcard '+(m.due.length?'':'ok')+'"><span class="ic">'+icon(m.due.length?'mail':'check',22)+'</span><div style="flex:1;min-width:0">'+
   (m.due.length?'<h3>'+tp.length+' patient'+(tp.length>1?'s':'')+' for '+fl(target)+'</h3><div class="sub">'+m.due.length+' item'+(m.due.length>1?'s':'')+'.</div>':'<h3>No email needed today</h3><div class="sub">No dose is scheduled for '+fl(target)+'.</div>')+'</div>'+(m.due.length?'<a class="btn pri" href="#email">Open email</a>':'')+'</div></div>'+
   '<div><div class="sechead"><h2>Patients</h2></div><div class="panel"><div class="list">'+S.patients.map(p=>{const nx=p.events.find(e=>e.remind&&live(e)&&e.date>=asOf);return'<div class="li" style="cursor:pointer" data-act="openpt" data-p="'+esc(p.code)+'"><div class="grow">'+whoH(p)+'<div class="sub">'+esc(curPhase(p))+'</div></div><div style="text-align:right"><div class="small"><b>'+(nx?fd(nx.date):'—')+'</b></div><div class="sub">'+(nx?esc(nx.drug)+', wk '+nx.week:'No upcoming dose')+'</div></div></div>'}).join('')+'</div></div></div></div>';
  return h;
};
const CUNIT=d=>d==='PEG-asparaginase'?'units/mL':'mg/mL';const ORAL=['Dexamethasone','Mercaptopurine','Oral methotrexate'];
function concRow(d){const f=S.formulary[d]||{};const k=d.replace(/\W/g,'');const w=canWrite;const nx=ALL().filter(x=>x.e.drug===d&&live(x.e)&&x.e.date>=asOf);const first=nx.find(x=>!calc(x.e,x.p).miss);const c=first?calc(first.e,first.p):null;
  return'<tr class="'+(f.conc||f.na?'cset':'cunset')+'"><td><span class="cdot cls-'+(CLS[d]||'anti')+'"></span><b>'+esc(d)+'</b><div class="sub">'+(nx.length?nx.length+' upcoming dose'+(nx.length>1?'s':''):'No upcoming doses')+'</div></td>'+
   '<td class="nw"><div class="cin"><input type="number" step="any" min="0" class="input" id="cc-'+k+'" data-drug="'+esc(d)+'" value="'+(f.conc==null?'':f.conc)+'" placeholder="Enter"'+(w?'':' disabled')+(f.na?' disabled':'')+'><span>'+CUNIT(d)+'</span></div></td>'+
   '<td><input class="input" id="cf-'+k+'" value="'+esc(f.form||'')+'" placeholder="e.g. 2 mg/2 mL vial"'+(w?'':' disabled')+'></td>'+
   (ORAL.includes(d)?'<td><label class="check" style="margin:0"><input type="checkbox" id="cn-'+k+'"'+(f.na?' checked':'')+(w?'':' disabled')+'> Tablets, no mL</label></td>':'<td></td>')+
   '<td class="cprev" id="cp-'+k+'" data-v="'+(c?c.v:'')+'" data-u="'+(c?esc(c.u):'')+'">'+concPrev(c,f.conc,f.na)+'</td><td class="sub">'+(f.at?esc(f.at)+(f.by?'<br>'+esc(f.by):''):'Not set')+'</td></tr>'}
function concPrev(c,conc,na){if(na)return'<span class="sub">Oral tablets</span>';if(!c)return'<span class="sub">—</span>';if(!(conc>0))return'<span class="sub">'+c.v+' '+esc(c.u)+' → enter a concentration</span>';return'<b>'+c.v+' '+esc(c.u)+' → '+r2(c.v/conc)+' mL'+(/\/day/.test(c.u)?'/day':'')+'</b>'}
V.conc=function(){const inj=Object.keys(CLS).filter(d=>!ORAL.includes(d));const set=Object.keys(CLS).filter(d=>S.formulary[d]&&(S.formulary[d].conc||S.formulary[d].na)).length;
  const head='<thead><tr><th>Drug</th><th>Concentration</th><th>Formulation (optional)</th><th></th><th>Next dose → volume</th><th>Last saved</th></tr></thead>';
  return banner()+'<div class="panel pad cintro"><div class="row"><span class="cbig">'+set+' of '+Object.keys(CLS).length+'</span><div style="flex:1"><b>Concentrations entered</b><div class="sub">Type the concentration of the product you stock. Every dose in mL is calculated as <b>dose (mg) ÷ concentration (mg/mL)</b> and shows on the MAR, the timeline, the dose window, patient schedules and the email. Leave a drug blank and no volume is shown for it.</div></div></div></div>'+
   '<div class="sec"><div class="sechead"><h2>Injectable and intrathecal drugs</h2></div><div class="panel"><div class="tw"><table class="ctable">'+head+'<tbody>'+inj.map(concRow).join('')+'</tbody></table></div></div></div>'+
   '<div class="sec"><div class="sechead"><h2>Oral medicines</h2><p>Enter a concentration only for an oral liquid; tick Tablets for solid forms.</p></div><div class="panel"><div class="tw"><table class="ctable">'+head+'<tbody>'+ORAL.map(concRow).join('')+'</tbody></table></div></div></div>'+
   (canWrite?'<div class="panel pad csave"><div class="row"><label class="field" style="flex:1">Your name (required)<input class="input" id="cc-by" value="'+esc(lastBy())+'"></label><label class="field" style="flex:2">Source (optional)<input class="input" id="cc-src" placeholder="e.g. pharmacy stock list, product label"></label><button class="btn pri big" data-act="saveconc">Save concentrations</button></div><div class="err" id="cc-err"></div></div>':'');
};
V.mar=function(){
  const f=ui.mar;const from=f.from||asOf,to=f.to||add(asOf,RUN());const ptf=f.pt||'all';
  const xs=marRows(from,to,ptf,f.oral);
  const byDate={};xs.forEach(x=>(byDate[x.e.date]=byDate[x.e.date]||[]).push(x));
  return banner()+'<div class="panel pad mtools"><div class="row"><a class="btn" href="#conc" style="align-self:flex-end">Concentrations</a><label class="field">From<input type="date" class="input" id="mar-from" value="'+from+'"></label><label class="field">To<input type="date" class="input" id="mar-to" value="'+to+'"></label>'+
   '<label class="field">Patient<select class="input" id="mar-pt"><option value="all">All patients</option>'+S.patients.map(p=>'<option value="'+esc(p.code)+'"'+(ptf===p.code?' selected':'')+'>'+esc(p.name||p.code)+'</option>').join('')+'</select></label>'+
   '<label class="check" style="align-self:flex-end"><input type="checkbox" id="mar-oral"'+(f.oral?' checked':'')+'> Include home oral doses</label><span class="spacer"></span><div class="row" style="align-self:flex-end"><button class="btn" data-act="marprint">Print</button>'+(DL?'<button class="btn" data-act="marcsv">Export CSV</button>':'')+'</div></div></div>'+
   '<div class="panel martable"><div class="tw"><table><thead><tr><th>Patient name</th><th>BSA</th><th>Week of treatment</th><th>Drug name</th><th>Dose in mg</th><th>Dose in mL</th></tr></thead><tbody>'+
   (xs.length?Object.entries(byDate).map(([d,list])=>'<tr class="mardate"><td colspan="6">'+fl(d)+(d===asOf?' · Today':'')+'</td></tr>'+list.map(x=>{const c=calc(x.e,x.p);const v=c.miss?null:vol(x.e,x.p,c);
     return'<tr class="click'+(live(x.e)&&shortage(x.e)?' shortrow':'')+(x.e.state==='administered'?' given':'')+'" data-act="ev" data-p="'+esc(x.p.code)+'" data-e="'+x.e.id+'"><td>'+nameH(x.p)+'</td><td class="nw">'+(x.p.bsa?x.p.bsa+' m²':'—')+'</td><td>'+x.e.week+'</td><td><span class="cdot cls-'+x.e.cls+'"></span>'+esc(lbl(x.e))+(x.e.state==='administered'?' <span class="tag t-sent">Given</span>':x.e.postponed?' <span class="tag t-miss">Postponed</span>':'')+(live(x.e)&&shortage(x.e)?' <span class="shortchip">Shortage</span>':'')+'</td>'+
     '<td class="nw"><b>'+(c.miss?'<span class="warnt">'+esc(c.miss)+'</span>':c.v+' '+esc(c.u.replace('units','units')))+'</b></td><td class="nw">'+(v?(v.ml!=null?'<b>'+v.ml+' mL'+(v.perDay?'/day':'')+'</b><div class="sub">at '+v.conc+' '+esc(v.unit)+'</div>':v.na?'Oral, no mL':'<a href="#conc" class="mlmiss">Set concentration</a>'):'—')+'</td></tr>'}).join('')).join(''):'<tr><td colspan="6" class="empty">No doses in this period.</td></tr>')+
   '</tbody></table></div></div><p class="sub" style="margin-top:10px">mg = protocol dose × BSA (or the physician-modified dose). mL = mg ÷ the concentration entered under Concentrations.</p>';
};
function marRows(from,to,ptf,oral){return ALL().filter(x=>x.e.date>=from&&x.e.date<=to&&(ptf==='all'||x.p.code===ptf)&&(x.e.remind||oral)&&(live(x.e)||x.e.state==='administered'))}
function kpi(cls,v,l,go){return'<button class="kpi '+cls+'" data-act="kpi" data-go="'+go+'"><span class="v">'+v+'</span><span class="l">'+l+'</span></button>'}
function evTable(xs,o){
  return'<div class="tw"><table><thead><tr><th>Date</th><th>Patient</th><th>Drug</th><th>Dose (reference)</th><th>'+(o.rem?'Reminder':'Status')+'</th><th></th></tr></thead><tbody>'+xs.map(x=>{const r=rem(x.e,x.p);
   return'<tr class="click'+(live(x.e)&&shortage(x.e)?' shortrow':'')+'" data-act="ev" data-p="'+esc(x.p.code)+'" data-e="'+x.e.id+'"><td class="nw"><b>'+fd(x.e.date)+'</b><div class="sub">Week '+x.e.week+', D'+x.e.day+'</div></td><td>'+whoH(x.p)+'<div class="sub">'+esc(x.e.phase)+'</div></td><td><span class="cdot cls-'+x.e.cls+'"></span>'+esc(lbl(x.e))+'<div class="sub">'+esc(x.e.route)+'</div></td><td>'+doseHTML(x.e,x.p)+'</td><td>'+(o.rem?'<span class="tag '+r.c+'">'+r.t+'</span>':stateTag(x.e))+(o.why&&x.p.registered&&x.p.registered>add(x.e.date,-lead())?'<div class="sub" style="margin-top:4px">Registered '+fd(x.p.registered)+', after the reminder date</div>':'')+'</td><td class="nw">'+ppBtn(x.p,x.e)+refBtn(x.e.tpl,x.e.drug)+'</td></tr>'}).join('')+'</tbody></table></div>';
}
function ppBtn(p,e){return canWrite&&e.remind&&live(e)?'<button class="refbtn pp" data-act="postpone" data-p="'+esc(p.code)+'" data-e="'+e.id+'">Postpone</button> ':''}
function discTable(xs){return'<div class="tw"><table><thead><tr><th>Date</th><th>Patient</th><th>Drug</th><th>Calculated</th><th>Entered</th><th>Difference</th><th></th></tr></thead><tbody>'+xs.map(x=>{const d=disc(x.e,x.p);return'<tr><td class="nw"><b>'+fd(x.e.date)+'</b><div class="sub">Week '+x.e.week+'</div></td><td>'+whoH(x.p)+'</td><td><span class="cdot cls-'+x.e.cls+'"></span>'+esc(x.e.drug)+'</td><td>'+d.exp+' '+esc(d.u)+'</td><td><b>'+d.ent+' '+esc(d.u)+'</b><div class="sub">'+esc(x.e.entered.source||'')+'</div></td><td class="'+(d.major?'warnt':'')+'">'+(d.d>0?'+':'')+d.d+' ('+(d.pct>0?'+':'')+d.pct+'%)</td><td>'+(canWrite?'<button class="btn sm pri" data-act="evact" data-v="authdisc" data-p="'+esc(x.p.code)+'" data-e="'+x.e.id+'">Review</button>':'')+'</td></tr>'}).join('')+'</tbody></table></div>'}
function shortPanel(xs){const by={};xs.forEach(x=>{(by[x.e.drug]=by[x.e.drug]||[]).push(x)});return'<div class="sec"><div class="panel alert"><div class="alerthead"><span class="ic">'+icon('pharmacy')+'</span><div><h3>Shortage alert: '+Object.keys(by).length+' drug'+(Object.keys(by).length>1?'s':'')+' marked unavailable for upcoming treatment</h3><p class="sub" style="margin:2px 0 0">Purchase these before the first date shown. <a href="#pharmacy">Open the pharmacy checklist</a></p></div></div><div class="list">'+Object.entries(by).map(([d,list])=>'<div class="li"><span class="cdot cls-'+(CLS[d]||'anti')+'"></span><div class="grow"><b class="shorttext">'+esc(d)+'</b> <span class="shortchip">Purchase required</span><div class="sub">First needed '+fl(list[0].e.date)+'</div><div class="small" style="margin-top:4px">'+[...new Set(list.map(x=>x.p.code))].map(c=>{const p=pt(c);return nameH(p)+' <span class="sub">'+list.filter(x=>x.p.code===c).slice(0,3).map(x=>fd(x.e.date)).join(', ')+'</span>'}).join('<br>')+'</div></div></div>').join('')+'</div></div></div>'}
V.approvals=function(m){
  const pend=S.patients.filter(p=>!approved(p)),ok=S.patients.filter(approved);
  let h=banner()+'<div class="sechead"><h2>Chemotherapy approval</h2><p>Tick every item after checking it against the record, enter your name and approve. Reminders start only after approval.</p></div>';
  h+=pend.length?pend.map(p=>apCard(p)).join(''):'<div class="panel empty"><b>No patients waiting</b>Every patient has final approval.</div>';
  const by={};m.wait.forEach(x=>(by[x.p.code]=by[x.p.code]||[]).push(x));
  h+='<div class="sec"><div class="sechead"><h2>Dose confirmation checklist</h2><p>Past doses that need your confirmation. Select the ones you verified as given.</p><div class="row">'+(canWrite&&m.wait.length?'<button class="btn sm" data-act="selall">Select all</button><button class="btn sm pri" data-act="confirmsel">Confirm selected as given</button>':'')+'</div></div>';
  h+=Object.keys(by).length?Object.entries(by).map(([code,xs])=>{const p=pt(code);return'<div class="panel" style="margin-top:12px"><div class="ph" style="display:flex;gap:10px;align-items:center;padding:12px 18px;border-bottom:1px solid var(--line)">'+whoH(p)+'<span class="spacer"></span>'+(canWrite?'<button class="btn sm ghost" data-act="selpt" data-p="'+esc(code)+'">Select patient</button>':'')+'</div><ul class="checklist" style="padding:4px 18px">'+xs.map(x=>'<li>'+(canWrite?'<input type="checkbox" data-act="seldose" data-e="'+x.e.id+'"'+(ui.sel[x.e.id]?' checked':'')+' aria-label="Select dose">':'')+'<span style="flex:1"><span class="cdot cls-'+x.e.cls+'"></span><b>'+esc(lbl(x.e))+'</b>, week '+x.e.week+', '+fd(x.e.date,{year:'numeric'})+(x.e.actualDate&&x.e.actualDate!==x.e.date?' (sheet date '+fd(x.e.actualDate)+')':'')+'<div class="sub">'+(x.e.state==='documented'?'On the record sheet'+(x.e.reason&&x.e.reason!=='On the record sheet'?': '+esc(x.e.reason):''):'Scheduled dose, date passed')+'</div></span><button class="btn sm ghost" data-act="ev" data-p="'+esc(code)+'" data-e="'+x.e.id+'">Manage</button></li>').join('')+'</ul></div>'}).join(''):'<div class="panel empty"><b>Nothing to confirm</b>All past doses are recorded.</div>';
  h+='<div class="sec"><div class="sechead"><h2>Approved patients</h2></div><div class="panel">'+(ok.length?'<div class="list">'+ok.map(p=>'<div class="li"><div class="grow">'+whoH(p)+'<div class="sub">Approved by '+esc(p.verification.first.by)+', '+esc(p.verification.first.at)+'</div></div>'+(canWrite?'<button class="btn sm ghost" data-act="revoke" data-p="'+esc(p.code)+'">Revoke</button>':'')+'</div>').join('')+'</div>':'<div class="empty"><b>None yet</b>Approved patients appear here.</div>')+'</div></div>';
  return h;
};
function nextDoseSet(p){const nx=p.events.find(e=>e.remind&&live(e)&&e.date>=asOf);if(!nx)return null;return{date:nx.date,events:p.events.filter(e=>e.remind&&live(e)&&e.date===nx.date)}}
function apCard(p){
  const v=p.verification||{};const done=p.checklist.filter(c=>c.done).length,tot=p.checklist.length;const all=done===tot&&tot>0;const w=canWrite;const k=esc(p.code);
  const body='<ul class="checklist">'+p.checklist.map((c,i)=>'<li class="'+(c.done?'done':'')+'">'+(w?'<input type="checkbox" data-act="chk" data-p="'+k+'" data-i="'+i+'"'+(c.done?' checked':'')+'>':'<span>'+(c.done?'✓':'○')+'</span>')+'<span>'+(c.kind==='flag'?'<span class="flag">Flag</span>':'')+esc(c.text)+(c.note?'<div class="sub">'+esc(c.note)+'</div>':'')+'</span></li>').join('')+'</ul>'+
    (w?'<div class="row" style="margin-top:8px"><input class="input" data-newchk="'+k+'" placeholder="Add a check item" style="flex:1"><button class="btn sm" data-act="addchk" data-p="'+k+'">Add</button></div>'+
    '<div class="row" style="margin-top:12px"><input class="input" id="v1-'+k+'" placeholder="Approver’s full name" value="'+esc(lastBy())+'" style="flex:1"><button class="btn sm pri" data-act="verify1" data-p="'+k+'"'+(all?'':' disabled title="Tick every item first"')+'>Approve patient</button></div>':'');
  return'<div class="panel apcard"><div class="aph"><div style="flex:1;min-width:220px">'+whoH(p)+'<div class="sub">'+esc(regOf(p))+', '+esc(curPhase(p))+(p.record&&p.record.source?'. Source: '+esc(p.record.source):'')+'</div></div><div class="meter"><span class="bar"><i style="width:'+(tot?Math.round(done/tot*100):0)+'%"></i></span>'+done+' of '+tot+'</div>'+
   '<button class="btn sm" data-act="openpt" data-p="'+k+'">Open record</button>'+(w?'<button class="btn sm" data-act="editpt" data-p="'+k+'">Edit</button>':'')+'</div>'+
   '<div style="padding:14px 20px">'+body+'</div>'+
   '<div class="kvline"><span>MRN <b>'+esc(p.mrn||'Not recorded')+'</b></span><span>Age <b>'+esc(p.age||'Not recorded')+'</b></span><span>Weight <b>'+(p.weight?esc(p.weight)+' kg':'Not recorded')+'</b></span><span>Height <b>'+(p.height?esc(p.height)+' cm':'Not recorded')+'</b></span><span>BSA <b>'+(p.bsa?p.bsa+' m²':'Not set')+'</b></span><span>Diagnosis <b>'+esc(p.diagnosis||'Not recorded')+'</b></span></div></div>';
}
V.calendar=function(){
  if(!ui.calMonth)ui.calMonth=asOf.slice(0,7);
  const modeChips='<div class="seg" style="margin:0 0 12px"><button class="chip" data-act="calmode" data-v="week" aria-pressed="'+(ui.calMode!=='month')+'">Next 7 days</button><button class="chip" data-act="calmode" data-v="month" aria-pressed="'+(ui.calMode==='month')+'">Month</button></div>';
  if(ui.calMode!=='month')return banner()+modeChips+weekAgenda();
  const [y,mo]=ui.calMonth.split('-').map(Number);const first=y+'-'+String(mo).padStart(2,'0')+'-01';
  const dow=(P(first).getUTCDay()+6)%7;const gs=add(first,-dow);
  const filt=x=>x.e.state!=='superseded'&&x.e.state!=='unrecorded'&&(ui.calPatient==='all'||x.p.code===ui.calPatient)&&(ui.calCls==='all'||x.e.cls===ui.calCls)&&(ui.calStatus==='all'||(ui.calStatus==='open'?live(x.e):x.e.state===ui.calStatus))&&(x.e.remind||ui.calShowOral);
  const all=ALL().filter(filt);
  let cells='';['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(w=>cells+='<div class="wd">'+w+'</div>');
  for(let i=0;i<42;i++){const d=add(gs,i);const xs=all.filter(x=>x.e.date===d);const out=d.slice(0,7)!==ui.calMonth;
    cells+='<button class="cell'+(out?' out':'')+(d===asOf?' today':'')+(d===ui.calSel?' sel':'')+'" data-act="calday" data-d="'+d+'" aria-label="'+fl(d)+', '+xs.length+' items"><span class="dn">'+P(d).getUTCDate()+'</span>'+
    xs.slice(0,3).map(x=>{const r=rem(x.e,x.p);return'<span class="ev cls-'+x.e.cls+' '+(r.k==='miss'||r.k==='due'?r.k:'')+(live(x.e)?'':' done')+(live(x.e)&&shortage(x.e)?' shortev':'')+'"><span class="cd"></span><span dir="auto">'+esc((x.p.name||x.p.code).split(' ')[0])+' '+esc(x.e.drug)+'</span></span>'}).join('')+(xs.length>3?'<span class="more">+'+(xs.length-3)+' more</span>':'')+'</button>';}
  const sel=ui.calSel||asOf;const sx=all.filter(x=>x.e.date===sel||(x.e.kind==='course'&&x.e.date<sel&&x.e.end>=sel));
  const opts=['<option value="all">All patients</option>'].concat(S.patients.map(p=>'<option'+(ui.calPatient===p.code?' selected':'')+' value="'+esc(p.code)+'">'+esc(p.name||p.code)+'</option>')).join('');
  const clsChips=['all'].concat(Object.keys(CLSN)).map(c=>'<button class="chip" data-act="calcls" data-v="'+c+'" aria-pressed="'+(ui.calCls===c)+'">'+(c==='all'?'All drugs':'<span class="cdot cls-'+c+'"></span>'+CLSN[c])+'</button>').join('');
  return banner()+modeChips+'<div class="calhead"><h2>'+P(first).toLocaleDateString('en-GB',{timeZone:'UTC',month:'long',year:'numeric'})+'</h2><button class="btn sm" data-act="calnav" data-v="-1" aria-label="Previous month">‹</button><button class="btn sm" data-act="calnav" data-v="0">This month</button><button class="btn sm" data-act="calnav" data-v="1" aria-label="Next month">›</button><span class="spacer"></span>'+
   '<select class="input" style="width:auto" id="calpt">'+opts+'</select><select class="input" style="width:auto" id="calst">'+[['all','Any status'],['open','Not yet given'],['administered','Given'],['documented','On sheet'],['held','Held'],['cancelled','Cancelled']].map(o=>'<option value="'+o[0]+'"'+(ui.calStatus===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select>'+
   '<label class="check" style="margin:0"><input type="checkbox" id="caloral"'+(ui.calShowOral?' checked':'')+'> Show home oral doses</label></div><div class="filters">'+clsChips+'</div>'+
   '<div class="calgrid"><div><div class="month">'+cells+'</div><div class="legend"><span><span class="tag t-due">Amber</span> reminder due today</span><span><span class="tag t-miss">Red</span> reminder missed</span><span>Struck through: given, held or cancelled</span></div></div>'+
   '<div class="panel"><div class="pad" style="border-bottom:1px solid var(--line)"><h3>'+fl(sel)+'</h3><div class="sub">'+sx.length+' item'+(sx.length===1?'':'s')+'</div></div>'+
   (sx.length?'<div class="list">'+sx.map(x=>{const r=rem(x.e,x.p);return'<div class="li" style="cursor:pointer" data-act="ev" data-p="'+esc(x.p.code)+'" data-e="'+x.e.id+'"><span class="cdot cls-'+x.e.cls+'"></span><div class="grow">'+whoH(x.p)+'<div>'+esc(lbl(x.e))+', week '+x.e.week+'</div><div class="sub">'+esc(x.e.route)+(x.e.date!==sel?', started '+fd(x.e.date):'')+'</div><div style="margin-top:4px" class="row">'+stateTag(x.e)+(x.e.date===sel?' <span class="tag '+r.c+'">'+r.t+'</span>':'')+'</div></div></div>'}).join('')+'</div>':'<div class="empty"><b>Nothing on this day</b>Select another day.</div>')+'</div></div>';
};
function weekAgenda(pFilter){let h='';
  for(let i=0;i<=RUN();i++){const d=add(asOf,i);const xs=ALL().filter(x=>x.e.date===d&&x.e.remind&&x.e.state!=='superseded'&&x.e.state!=='unrecorded'&&(!pFilter||x.p.code===pFilter));
    if(pFilter&&!xs.length)continue;
    h+='<div class="agday'+(i===0?' today':'')+'"><div class="agd"><b>'+fd(d)+'</b><span>'+(i===0?'Today':i===lead()?'In today’s email':'In '+i+' day'+(i>1?'s':''))+'</span></div><div class="agitems">'+
    (xs.length?xs.map(x=>{const r=rem(x.e,x.p);return'<div class="agit'+(shortage(x.e)?' short':'')+'"><span class="cdot cls-'+x.e.cls+'"></span><div class="grow" data-act="ev" data-p="'+esc(x.p.code)+'" data-e="'+x.e.id+'" style="cursor:pointer">'+(pFilter?'':whoH(x.p))+'<div>'+esc(lbl(x.e))+', week '+x.e.week+'</div>'+doseHTML(x.e,x.p,true)+'</div><div class="row" style="justify-content:flex-end">'+stateTag(x.e)+'<span class="tag '+r.c+'">'+r.t+'</span>'+ppBtn(x.p,x.e)+'</div></div>'}).join(''):'<div class="sub" style="padding:6px 0">Nothing scheduled</div>')+'</div></div>'}
  return'<div class="panel agenda">'+(h||'<div class="empty"><b>No clinic doses in the next '+RUN()+' days</b></div>')+'</div>'}
V.patients=function(){
  if(ui.patient&&pt(ui.patient))return patientDetail(pt(ui.patient));
  const q=norm(ui.pq);
  const ps=S.patients.filter(p=>(ui.pstatus==='all'||(ui.pstatus==='pending'?pstate(p).k==='awaiting':ui.pstatus==='approved'?pstate(p).k==='approved':ui.pstatus==='delayed'?pstate(p).k==='delayed':p.status===ui.pstatus))&&(!q||norm([p.name,p.mrn,p.diagnosis,curPhase(p),p.protocol].join(' ')).includes(q)));
  return banner()+'<div class="filters"><input class="input search" id="pq" placeholder="Filter this list" value="'+esc(ui.pq)+'" aria-label="Filter patients" dir="auto">'+
   [['all','All'],['approved','Confirmed'],['pending','Awaiting approval'],['delayed','Delayed'],['held','On hold'],['completed','Completed'],['off','Off protocol']].map(o=>'<button class="chip" data-act="pstatus" data-v="'+o[0]+'" aria-pressed="'+(ui.pstatus===o[0])+'">'+o[1]+'</button>').join('')+
   '<span class="spacer"></span>'+(canWrite?'<button class="btn pri" data-act="addpt">Add new patient</button>':'')+'</div>'+
   (ps.length?'<div class="pgrid">'+ps.map(p=>{const nx=p.events.find(e=>e.remind&&live(e)&&e.date>=asOf);const w=p.events.filter(awaiting).length;const pc=p.protocolChanges.slice(-1)[0];const st=pstate(p);
    return'<div class="pcardw"><button class="pcard '+st.c+'" data-act="openpt" data-p="'+esc(p.code)+'"><div class="code">'+nameH(p)+'</div><div class="mrn">'+esc(mrnTxt(p))+'</div><div class="row" style="margin-top:8px">'+stTag(p)+(p.status!=='active'&&p.status!=='delayed'?statusTag(p):'')+(pc?'<span class="tag t-wait">Protocol changed</span>':'')+(p.conflicts.some(c=>!c.resolved)?'<span class="tag t-due">Data conflict</span>':'')+(p.events.some(e=>live(e)&&e.date>=asOf&&shortage(e))?'<span class="shortchip">Shortage: '+[...new Set(p.events.filter(e=>live(e)&&e.date>=asOf&&shortage(e)).map(e=>e.drug))].map(esc).join(', ')+'</span>':'')+'</div>'+
    '<div class="meta"><span>Protocol</span><span>'+esc(regOf(p))+'</span><span>Phase</span><span>'+esc(curPhase(p))+'</span><span>BSA</span><span>'+(p.bsa?p.bsa+' m²':'Not set')+'</span><span>Next dose</span><span>'+(nx?esc(nx.drug)+', '+fd(nx.date)+', wk '+nx.week:'None scheduled')+'</span><span>To confirm</span><span>'+(w?'<b style="color:var(--wait)">'+w+'</b>':'None')+'</span></div></button>'+(canWrite?'<button class="btn sm editbtn" data-act="editpt" data-p="'+esc(p.code)+'">Edit</button>':'')+'</div>'}).join('')+'</div>'
   :'<div class="panel empty"><b>No patients match</b>Clear the filter or choose another status.</div>');
};
function statusTag(p){const m={delayed:['Delayed','t-miss'],active:['Active','t-plan'],held:['On hold','t-due'],completed:['Completed','t-na'],off:['Off protocol','t-miss']}[p.status]||['Active','t-plan'];return'<span class="tag '+m[1]+'">'+m[0]+'</span>'}
function phaseTable(p,ph){const es=p.events.filter(e=>e.phaseId===ph.id);const w=canWrite;
  if(ui.editK==='ph-'+ph.id){const sts=[['scheduled','Scheduled'],['administered','Given'],['notgiven','Not given'],['held','Held'],['cancelled','Cancelled']];
    return'<div class="tw"><table class="edittable"><thead><tr><th>Week</th><th>Date</th><th>Drug</th><th>Route</th><th>Note</th><th>Status</th></tr></thead><tbody>'+es.map(e=>{const k=e.id;const cur=sts.some(x=>x[0]===e.state)?sts:sts.concat([[e.state,(STATE[e.state]||[e.state])[0]]]);
      return'<tr><td>'+IN('pe-w-'+k,e.week,'number',' style="width:70px"')+'</td><td>'+IN('pe-d-'+k,e.date,'date')+'</td><td><span class="cdot cls-'+e.cls+'"></span>'+esc(lbl(e))+'</td><td>'+IN('pe-r-'+k,e.route)+'</td><td>'+IN('pe-n-'+k,e.note)+'</td><td><select class="input in-sm" id="pe-s-'+k+'"'+(e.state==='superseded'?' disabled':'')+'>'+cur.map(o=>'<option value="'+o[0]+'"'+(o[0]===e.state?' selected':'')+'>'+o[1]+'</option>').join('')+'</select></td></tr>'}).join('')+'</tbody></table></div>'+
      editBar('ph-'+ph.id,'saveph','data-p="'+esc(p.code)+'" data-ph="'+ph.id+'"','Doses are calculated from the protocol and BSA. To change a dose amount use Modify dose in the dose window, so the change is tracked.')}
  const cut=add(asOf,-14);const hidden=ui.showAll[ph.id]?0:es.filter(e=>(e.end||e.date)<cut).length;const vis=hidden?es.filter(e=>(e.end||e.date)>=cut):es;
  return(hidden?'<div class="showmore"><button class="btn sm ghost" data-act="showall" data-ph="'+ph.id+'">Show '+hidden+' earlier dose'+(hidden>1?'s':'')+'</button></div>':'')+'<div class="tw"><table><thead><tr><th>Week</th><th>Date</th><th>Drug</th><th>Dose (reference)</th><th>Status</th><th>Reminder</th><th></th></tr></thead><tbody>'+vis.map(e=>{const r=rem(e,p);return'<tr class="click'+(live(e)&&e.date>=asOf&&shortage(e)?' shortrow':'')+'" data-act="ev" data-p="'+esc(p.code)+'" data-e="'+e.id+'"><td class="nw"><b>Wk '+e.week+'</b><div class="sub">D'+e.day+'</div></td><td class="nw"><b>'+fd(e.date)+'</b>'+(e.end?'<div class="sub">to '+fd(e.end)+'</div>':'')+(e.origDate?'<div class="sub">was '+fd(e.origDate)+'</div>':'')+'</td><td><span class="cdot cls-'+e.cls+'"></span>'+esc(lbl(e))+'<div class="sub">'+esc(e.route)+(e.note?'. '+esc(e.note):'')+'</div>'+(e.reason?'<div class="sub"><i>'+esc(e.reason)+'</i></div>':'')+'</td><td>'+doseHTML(e,p,true)+'</td><td>'+stateTag(e)+'</td><td><span class="tag '+r.c+'">'+r.t+'</span></td><td class="nw">'+ppBtn(p,e)+refBtn(e.tpl,e.drug)+'</td></tr>'}).join('')+'</tbody></table></div>';}
function journey(p){const cur=curPh(p);if(!cur)return'';const list=TPL.filter(t=>t.reg===cur.reg);const ci=list.findIndex(t=>t.id===cur.tpl);
  const es=p.events.filter(e=>e.phaseId===cur.id);const last=es.reduce((a,e)=>{const x=e.end||e.date;return x>a?x:a},cur.start);const len=Math.max(1,diff(last,cur.start)+1);const el=Math.min(len,Math.max(0,diff(asOf,cur.start)+1));const pct=Math.round(el/len*100);
  const wkNow=TPLID[cur.tpl].sw+Math.max(0,Math.floor(diff(asOf,cur.start)/7));const nx=p.events.find(e=>e.remind&&live(e)&&e.date>=asOf);
  const old=p.protocolChanges.length?'<div class="jold">'+icon('swap',14)+' Changed from '+esc(p.protocolChanges[p.protocolChanges.length-1].from)+' on '+fy(p.protocolChanges[p.protocolChanges.length-1].date)+'</div>':'';
  return'<div class="panel journey"><div class="row"><h3>Treatment journey · Regimen '+cur.reg+'</h3><span class="spacer"></span><span class="sub">Now in week '+wkNow+(nx?' · next: '+esc(nx.drug)+' on '+fd(nx.date):'')+'</span></div>'+old+'<div class="jroad">'+
   list.map((t,i)=>{const st=i<ci?'done':i===ci?'now':'next';return'<div class="jstop '+st+'"><span class="jdot">'+(st==='done'?icon('check',16):i+1)+'</span><span class="jname">'+esc(t.label.replace(/^Regimen .: /,''))+'</span><span class="jwk">'+esc(t.weeks)+'</span>'+(st==='now'?'<span class="jbar"><i style="width:'+pct+'%"></i></span><span class="jpct">'+pct+'% of this phase</span>':'')+'</div>'}).join('')+'</div></div>'}
function editBtn(k,label){if(!canWrite)return'';return ui.editK===k?'<span class="tag t-wait">Editing</span>':'<button class="btn sm" data-act="editmode" data-k="'+esc(k)+'">'+icon('edit',14)+(label||'Edit')+'</button>'}
function editBar(k,save,attrs,note){return'<div class="editbar">'+(note?'<div class="sub" style="flex-basis:100%">'+note+'</div>':'')+'<input class="input" id="eb-reason" placeholder="Reason for the change (required)"><input class="input" id="eb-by" placeholder="Your name (required)" value="'+esc(lastBy())+'"><button class="btn" data-act="editcancel">Cancel</button><button class="btn pri" data-act="'+save+'" '+(attrs||'')+'>Save this section</button><div class="err" id="eb-err" style="flex-basis:100%"></div></div>'}
const goEdit=(href,label)=>'<a class="btn sm" href="'+href+'">'+icon('edit',14)+(label||'Edit')+'</a>';
const IN=(id,v,t,extra)=>'<input class="input in-sm" id="'+id+'" '+(t?'type="'+t+'" ':'')+'value="'+esc(v==null?'':v)+'"'+(extra||'')+'>';
function asOfTxt(v){return v?' <span class="sub">as of '+esc(/^\d{4}-\d\d-\d\d$/.test(v)?fy(v):v)+'</span>':''}
function patientDetail(p){
  const w=canWrite;const st=pstate(p);
  let h=banner()+'<div class="row" style="margin-bottom:12px"><button class="btn sm" data-act="back">‹ All patients</button></div>'+
   '<div class="panel '+st.c+' phead-wrap"><div class="phead"><div style="flex:1;min-width:260px"><div class="code">'+nameH(p)+'</div><div class="row" style="margin-top:6px"><span class="mrn" style="font-size:13px">'+esc(mrnTxt(p))+'</span>'+stTag(p)+(p.status!=='active'&&p.status!=='delayed'?statusTag(p):'')+'</div>'+
   '<div class="facts"><div><span>Protocol</span><b>'+esc(regOf(p))+'</b></div><div><span>Current phase</span><b>'+esc(curPhase(p))+'</b></div><div><span>Age</span><b>'+esc(p.age||'Not recorded')+'</b></div><div><span>Sex</span><b>'+esc(p.sex||'Not recorded')+'</b></div>'+
   '<div><span>Weight</span><b>'+(p.weight?esc(p.weight)+' kg':'Not recorded')+'</b>'+asOfTxt(p.weightAsOf)+'</div><div><span>Height</span><b>'+(p.height?esc(p.height)+' cm':'Not recorded')+'</b>'+asOfTxt(p.heightAsOf)+'</div>'+
   '<div><span>BSA used for dosing</span><b>'+(p.bsa?p.bsa+' m²':'Not set')+'</b>'+asOfTxt(p.bsaAsOf)+(p.bsaSource?'<span class="sub" style="display:block">'+esc(p.bsaSource)+'</span>':'')+'</div><div><span>Diagnosis</span><b>'+esc(p.diagnosis||'Not recorded')+'</b></div><div><span>First admission</span><b>'+esc(p.admission||'Not recorded')+'</b></div></div></div>'+
   (w?'<div class="row"><button class="btn" data-act="editpt" data-p="'+esc(p.code)+'">Edit</button><button class="btn" data-act="addmeas" data-p="'+esc(p.code)+'">Record weight / height</button><button class="btn" data-act="addphase" data-p="'+esc(p.code)+'">Add next phase</button><button class="btn" data-act="chproto" data-p="'+esc(p.code)+'">'+icon('swap',16)+'Change protocol</button><button class="btn warn" data-act="delpt" data-p="'+esc(p.code)+'">Delete</button></div>':'')+'</div></div>';
  const oc=p.conflicts.filter(c=>!c.resolved);
  if(oc.length)h+='<div class="panel pad" style="margin-top:14px;border-left:4px solid var(--due)"><h3>Data conflicts for manual verification</h3><ul class="checklist" style="margin-top:6px">'+oc.map(c=>'<li><span style="flex:1">'+esc(c.text)+'<div class="sub">Raised '+esc(c.at||'')+'</div></span>'+(w?'<button class="btn sm" data-act="resolveconf" data-p="'+esc(p.code)+'" data-i="'+p.conflicts.indexOf(c)+'">Resolve</button>':'')+'</li>').join('')+'</ul></div>';
  const dd=p.events.filter(e=>discOpen(e,p));
  if(dd.length)h+='<div class="sec"><div class="panel alert"><div class="alerthead"><span class="ic">'+icon('warn')+'</span><div><h3>Dose discrepancy: clinical review required</h3><p class="sub" style="margin:2px 0 0">Confirmation and final approval are blocked until an authorized reviewer records a decision.</p></div></div>'+discTable(dd.map(e=>({p,e})))+'</div></div>';
  if(p.protocolChanges.length){const last=p.protocolChanges[p.protocolChanges.length-1];
    h+='<div class="pxbanner">'+icon('swap')+'<span><b>Protocol changed on '+fy(last.date)+':</b> '+esc(last.from)+' → '+esc(last.to)+'. Doses of the previous protocol after that date are stopped.</span></div>'+
    '<div class="panel" style="margin-top:12px"><div class="pad" style="border-bottom:1px solid var(--line)"><h3>Protocol changes</h3></div>'+p.protocolChanges.slice().reverse().map(c=>'<div class="change"><b class="nw">'+fy(c.date)+'</b><span class="from">'+esc(c.from)+'</span><span class="arrow">→</span><b>'+esc(c.to)+'</b><span class="sub" style="flex-basis:100%">'+esc(c.reason)+(c.stopped?'. '+c.stopped+' future dose'+(c.stopped===1?'':'s')+' of the previous protocol stopped.':'')+' New day 1: '+fy(c.newStart)+'.'+(c.by?' By '+esc(c.by)+'.':'')+'</span></div>').join('')+'</div>';}
  h+=journey(p);
  if(!approved(p))h+='<div class="sec">'+apCard(p)+'</div>';
  else if(false)h+='<div class="panel pad" style="margin-top:14px"><div class="row"><h3>Approved</h3><span class="spacer"></span>'+(canWrite?'<button class="btn sm ghost" data-act="revoke" data-p="'+esc(p.code)+'">Revoke approval</button>':'')+'</div><div class="small" style="margin-top:6px">By '+esc(p.verification.first.by)+', '+esc(p.verification.first.at)+'</div></div>';
  h+='<div class="sec"><div class="sechead"><h2>Next 7 days</h2><p>'+fd(asOf)+' to '+fd(add(asOf,RUN()))+'</p></div>'+weekAgenda(p.code)+'</div>';
  if(!p.phases.length)h+='<div class="panel empty" style="margin-top:16px"><b>No schedule yet</b>'+(w?'The current treatment position is not documented. Use Add next phase once you confirm it.':'The current treatment position is not documented.')+'</div>';
  p.phases.slice().reverse().forEach(ph=>{
    const head='<h3>'+esc(ph.label)+'</h3><span class="sub">'+esc(ph.weeks)+', D1 '+fy(ph.start)+(ph.cycles?', '+ph.cycles+' cycles':'')+'</span><span class="spacer"></span>'+(ph.superseded?'<span class="tag t-na">Superseded '+fd(ph.superseded)+'</span>':(TPLID[ph.tpl].derived?'<span class="tag t-wait" title="The hospital grid marks weeks only; days are at the start of each marked week">Days from weekly grid</span>':''))+(w&&!ph.superseded?editBtn('ph-'+ph.id,'Edit doses')+'<button class="btn sm" data-act="editphase" data-p="'+esc(p.code)+'" data-ph="'+ph.id+'">Move day 1</button><button class="btn sm warn" data-act="delphase" data-p="'+esc(p.code)+'" data-ph="'+ph.id+'">Remove</button>':'');
    h+=ph.superseded?'<details class="panel phase ph-old"><summary>'+head+'</summary>'+phaseTable(p,ph)+'</details>':'<details class="panel phase ph-cur" open><summary>'+head+'</summary>'+phaseTable(p,ph)+'</details>';});
  if(p.modLog.length)h+='<div class="sec"><div class="sechead"><h2>Dose modifications</h2><p>Every change to a prescribed dose, newest first. Nothing is deleted.</p></div><div class="panel"><div class="tw"><table><thead><tr><th>Date</th><th>Drug, week</th><th>Original</th><th>Modified</th><th>Change</th><th>Reason</th><th>By</th><th>Documentation</th></tr></thead><tbody>'+p.modLog.slice().reverse().map(m=>'<tr><td class="nw">'+(m.date?fy(m.date):'')+'</td><td>'+esc(m.drug)+', wk '+m.week+'</td><td>'+esc(m.orig)+' '+esc(m.unit)+'</td><td><b>'+(m.removed?'Removed':esc(m.value)+' '+esc(m.unit))+'</b></td><td>'+(m.removed?'Back to calculated':'<span class="tag '+(m.dir==='Reduced'?'t-due':m.dir==='Increased'?'t-miss':'t-na')+'">'+m.dir+(m.pct?' '+Math.abs(m.pct)+'%':'')+'</span>')+'</td><td>'+esc(m.reason)+'</td><td>'+esc(m.by)+'<div class="sub">'+esc(m.at)+'</div></td><td>'+esc(m.doc||'—')+'</td></tr>').join('')+'</tbody></table></div></div></div>';
  if(p.postponements.length)h+='<div class="sec"><div class="sechead"><h2>Postponed treatments</h2><p>Original dates are kept.</p></div><div class="panel"><div class="tw"><table><thead><tr><th>Drug, week</th><th>Original date</th><th>Revised date</th><th>Reason</th><th>By</th></tr></thead><tbody>'+p.postponements.slice().reverse().map(x=>'<tr><td>'+esc(x.drug)+', wk '+x.week+'</td><td class="nw">'+fy(x.from)+'</td><td class="nw"><b>'+fy(x.to)+'</b></td><td>'+esc(x.reason)+'</td><td>'+esc(x.by)+'<div class="sub">'+esc(x.at)+'</div></td></tr>').join('')+'</tbody></table></div></div></div>';
  const more=(title,body)=>body?'<details class="panel more"><summary><b>'+title+'</b><span class="chev">⌄</span></summary><div class="morebody">'+body+'</div></details>':'';
  const flags=p.checklist.filter(c=>c.kind==='flag'&&!c.done);
  h+='<div class="sec"><div class="sechead"><h2>More details</h2><p>Open a section to view or edit it.</p></div>'+more('Weight, height and BSA history',measSection(p))+more('Record sheet and documented treatments',recSection(p))+more('Record review notes ('+flags.length+' open)',chkSection(p))+'</div>';
  h+='<div class="sec"><div>'+
   '<div class="panel pad"><h3>Change history</h3><div class="sub">Audit records cannot be edited.</div><div style="margin-top:8px">'+(p.history.length?p.history.slice().reverse().slice(0,20).map(x=>'<div style="padding:6px 0;border-top:1px solid var(--line2)"><div class="small">'+esc(x.text)+'</div><div class="sub">'+esc(x.at)+'</div></div>').join(''):'<div class="muted small">No changes yet.</div>')+'</div></div></div>';
  return h;
}
function measSection(p){const k='meas-'+p.code,ed=ui.editK===k;if(!p.measurements.length&&!ed&&!canWrite)return'';
  let h='<div class="sec"><div class="sechead"><h2>Weight, height and BSA history</h2><p>The latest dated values drive dosing. Older values stay for reference.</p><div class="row">'+editBtn(k)+'</div></div><div class="panel">';
  if(ed){const rows=p.measurements.concat([{}]);h+='<div class="tw"><table class="edittable"><thead><tr><th>Date or label</th><th>Weight (kg)</th><th>Height (cm)</th><th>BSA (m²)</th><th>Source</th><th>Delete</th></tr></thead><tbody>'+rows.map((m,i)=>{const n=i===rows.length-1;return'<tr'+(n?' class="newrow"':'')+'><td>'+IN('ms-dt-'+i,m.date||m.label||'',null,' placeholder="'+(n?'New: YYYY-MM-DD or label':'')+'"')+'</td><td>'+IN('ms-w-'+i,m.weight,'number',' step="0.1"')+'</td><td>'+IN('ms-h-'+i,m.height,'number',' step="0.1"')+'</td><td>'+IN('ms-b-'+i,m.bsa,'number',' step="0.01"')+'</td><td>'+IN('ms-s-'+i,m.source)+'</td><td>'+(n?'':'<input type="checkbox" id="ms-x-'+i+'">')+'</td></tr>'}).join('')+'</tbody></table></div>'+editBar(k,'savemeas','data-p="'+esc(p.code)+'"','This edits the history only. To change the values used for dosing, use Record weight / height or Edit.')}
  else h+=p.measurements.length?'<div class="tw"><table><thead><tr><th>When</th><th>Weight</th><th>Height</th><th>BSA</th><th>Source</th></tr></thead><tbody>'+p.measurements.slice().reverse().map(x=>'<tr><td class="nw">'+esc(x.date&&/^\d{4}/.test(x.date)?fy(x.date):(x.label||x.date||''))+'</td><td>'+(x.weight!=null?x.weight+' kg':'—')+'</td><td>'+(x.height!=null?x.height+' cm':'—')+'</td><td>'+(x.bsa!=null?x.bsa+' m²':'—')+(x.bsaMethod?'<div class="sub">'+esc(x.bsaMethod)+'</div>':'')+'</td><td>'+esc(x.source||'')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">No measurements recorded.</div>';
  return h+'</div></div>'}
function recSection(p){const k='rec-'+p.code,ed=ui.editK===k;const es=(p.record&&p.record.entries)||[];if(!es.length&&!ed&&!canWrite)return'';
  let h='<div class="sec"><div class="sechead"><h2>Record sheet and documented treatments</h2><p>As written on '+esc(p.record&&p.record.source||'the record')+'. Highlighted rows were partly illegible.</p><div class="row">'+editBtn(k)+'</div></div><div class="panel">';
  if(ed){const rows=es.concat([{}]);h+='<div class="tw"><table class="edittable"><thead><tr><th>Week</th><th>Date as written</th><th>Medication</th><th>Dose / volume</th><th>Comment</th><th>Unclear</th><th>Delete</th></tr></thead><tbody>'+rows.map((r,i)=>{const n=i===rows.length-1;return'<tr'+(n?' class="newrow"':'')+'><td>'+IN('rs-wk-'+i,r.wk,null,' style="width:70px"'+(n?' placeholder="New"':''))+'</td><td>'+IN('rs-dt-'+i,r.date)+'</td><td>'+IN('rs-md-'+i,r.med)+'</td><td>'+IN('rs-ds-'+i,r.dose)+'</td><td>'+IN('rs-nt-'+i,r.note)+'</td><td><input type="checkbox" id="rs-un-'+i+'"'+(r.unclear?' checked':'')+'></td><td>'+(n?'':'<input type="checkbox" id="rs-x-'+i+'">')+'</td></tr>'}).join('')+'</tbody></table></div>'+editBar(k,'saverec','data-p="'+esc(p.code)+'"','The record table is a transcript of the source document. It does not change the schedule.')}
  else h+=es.length?'<div class="tw"><table class="rec"><thead><tr><th>Week</th><th>Date as written</th><th>Medication</th><th>Dose / volume</th><th>Comment</th></tr></thead><tbody>'+es.map(r=>'<tr class="'+(r.unclear?'flagrow':'')+'"><td class="nw">'+esc(r.wk)+'</td><td class="nw">'+esc(r.date)+'</td><td>'+esc(r.med)+'</td><td>'+esc(r.dose)+'</td><td>'+esc(r.note||'')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">No record entries.</div>';
  return h+'</div></div>'}
function chkSection(p){const k='chk-'+p.code,ed=ui.editK===k;let h='<div class="row"><h3>Approval checklist</h3><span class="spacer"></span>'+editBtn(k)+'</div><div class="sub">'+esc(pstate(p).t)+'</div>';
  if(ed)return h+'<table class="edittable" style="margin-top:8px"><tbody>'+p.checklist.map((c,i)=>'<tr><td style="width:100%">'+IN('ck-t-'+i,c.text)+'</td><td class="nw"><label class="check" style="margin:0"><input type="checkbox" id="ck-x-'+i+'"> Delete</label></td></tr>').join('')+'<tr class="newrow"><td>'+IN('ck-new','',null,' placeholder="New item"')+'</td><td></td></tr></tbody></table>'+editBar(k,'savechk','data-p="'+esc(p.code)+'"','These notes come from the record review. Ticking them is only needed while the patient is Awaiting approval.');
  return h+'<ul class="checklist" style="margin-top:8px">'+p.checklist.map(c=>'<li class="'+(c.done?'done':'')+'"><span>'+(c.done?'✓':'○')+'</span><span>'+(c.kind==='flag'?'<span class="flag">Flag</span>':'')+esc(c.text)+(c.note?'<div class="sub">'+esc(c.note)+'</div>':'')+'</span></li>').join('')+'</ul>'}
function norm(s){return String(s||'').toLowerCase().replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ').trim()}
V.search=function(){
  const f=ui.sf;const q=norm(ui.gq);
  const dxs=[...new Set(S.patients.map(p=>p.diagnosis).filter(Boolean))];
  const evF=f.drug||f.week||f.date;
  const res=[];S.patients.forEach(p=>{
    if(q&&!norm([p.name,p.mrn,p.code].join(' ')).includes(q))return;
    if(f.dx&&norm(p.diagnosis)!==norm(f.dx))return;
    if(f.proto){const phs=p.phases.filter(x=>!x.superseded);if(f.proto.length===1?!phs.some(x=>x.reg===f.proto):!phs.some(x=>x.tpl===f.proto))return}
    if(f.status){const k=pstate(p).k;if(['approved','awaiting','delayed'].includes(f.status)?k!==f.status:p.status!==f.status)return}
    let hits=[];if(evF){hits=p.events.filter(e=>e.state!=='superseded'&&e.state!=='unrecorded'&&(!f.drug||e.drug===f.drug)&&(!f.week||e.week===+f.week)&&(!f.date||e.date===f.date||(e.end&&e.date<=f.date&&e.end>=f.date)));if(!hits.length)return}
    res.push({p,hits})});
  const sel=(id,opts,v)=>'<select class="input" id="'+id+'"><option value="">Any</option>'+opts.map(o=>'<option value="'+esc(o[0])+'"'+(v===o[0]?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select>';
  return banner()+'<div class="panel pad"><div class="fgrid sgrid">'+
   '<label class="field">Name or MRN (partial)<input class="input" id="sf-q" value="'+esc(ui.gq||'')+'" dir="auto" placeholder="Part of a name or MRN"></label>'+
   '<label class="field">Diagnosis'+sel('sf-dx',dxs.map(d=>[d,d]),f.dx)+'</label>'+
   '<label class="field">Treatment protocol'+sel('sf-proto',[['A','Regimen A (any phase)'],['B','Regimen B (any phase)'],['C','Regimen C (any phase)']].concat(TPL.map(t=>[t.id,t.label])),f.proto)+'</label>'+
   '<label class="field">Chemotherapy drug'+sel('sf-drug',Object.keys(CLS).map(d=>[d,d]),f.drug)+'</label>'+
   '<label class="field">Treatment week<input type="number" min="1" max="200" class="input" id="sf-week" value="'+esc(f.week||'')+'"></label>'+
   '<label class="field">Treatment date<input type="date" class="input" id="sf-date" value="'+esc(f.date||'')+'"></label>'+
   '<label class="field">Patient status'+sel('sf-status',[['approved','Confirmed'],['awaiting','Awaiting approval'],['delayed','Delayed'],['held','On hold'],['completed','Completed'],['off','Off protocol']],f.status)+'</label>'+
   '<div class="field" style="justify-content:flex-end"><button class="btn" data-act="sfclear">Clear all filters</button></div></div></div>'+
   '<div class="sechead" style="margin-top:18px"><h2>'+res.length+' patient'+(res.length===1?'':'s')+'</h2><p>Select a result to open the patient record.</p></div>'+
   (res.length?'<div class="panel"><div class="list">'+res.map(({p,hits})=>{const nx=p.events.find(e=>e.remind&&live(e)&&e.date>=asOf);const show=hits.length?hits.slice(0,5):(nx?[nx]:[]);
     return'<div class="li sres" data-act="openpt" data-p="'+esc(p.code)+'" role="button" tabindex="0"><div class="grow">'+whoH(p)+'<div class="sub">'+esc(p.diagnosis||'Diagnosis not recorded')+' · '+esc(regOf(p))+', '+esc(curPhase(p))+'</div>'+
     (show.length?'<div class="small" style="margin-top:4px">'+(hits.length?'Matching: ':'Next: ')+show.map(e=>'<span class="cdot cls-'+e.cls+'"></span>'+esc(e.drug)+', wk '+e.week+', '+fd(e.date,{year:'numeric'})+' <span class="sub">('+(STATE[e.state]||STATE.scheduled)[0].toLowerCase()+')</span>').join('; ')+(hits.length>5?'; +'+(hits.length-5)+' more':'')+'</div>':'')+'</div><span class="btn sm">Open</span></div>'}).join('')+'</div></div>':'<div class="panel empty"><b>No patients match</b>Loosen a filter or clear them all.</div>');
};
V.pharmacy=function(m){
  const w=canWrite;const st=S.stock;let by='';try{by=localStorage.getItem('chemo-pharm-by')||''}catch(e){}
  const unav=[];Object.entries(st).forEach(([pr,ds])=>Object.entries(ds).forEach(([d,v])=>{if(v.state==='unavailable')unav.push([pr,d])}));
  let h=banner()+(m.short.length?shortPanel(m.short):'<div class="panel pad ok" style="border-left:4px solid var(--ok)"><h3>No upcoming treatment is affected by a shortage</h3><div class="sub">'+(unav.length?unav.length+' drug entr'+(unav.length>1?'ies are':'y is')+' marked unavailable, but no scheduled dose needs '+(unav.length>1?'them':'it')+'.':'No drug is marked unavailable.')+' '+m.unver+' entr'+(m.unver===1?'y is':'ies are')+' not yet verified.</div></div>');
  const su=shortUpcoming();if(su.length)h+='<div class="sec"><div class="sechead"><h2>Upcoming doses that need an unavailable drug</h2><p>A drug marked Unavailable under any protocol is flagged on every scheduled dose of that drug.</p></div><div class="panel alert">'+evTable(su,{rem:true})+'</div></div>';
  h+='<div class="sec"><div class="sechead"><h2>Protocol drug availability checklist</h2><p>Drugs come from each uploaded protocol. Mark each one Available, Unavailable or leave it Not verified; an unchecked drug is never treated as unavailable. Marking a drug Unavailable under one protocol flags every upcoming dose of it, whatever the patient’s protocol.</p>'+(w?'<div class="row"><input class="input" id="pharmby" value="'+esc(by)+'" placeholder="Your name (stamped on changes)" style="width:240px"></div>':'')+'</div>';
  h+=S.protocols.map(pr=>{const ds=Object.entries(st[pr.id]||{});const tpls=TPL.filter(t=>t.proto===pr.id).map(t=>t.id);
    return'<div class="panel pr"><div class="prh"><span class="reg '+pr.regimen+'">'+pr.regimen+'</span><div style="flex:1"><h3>'+esc(pr.phase)+'</h3><div class="sub">'+esc(pr.file)+'</div></div><span class="sub">'+ds.filter(([d,v])=>v.state==='available').length+' available · '+ds.filter(([d,v])=>v.state==='unavailable').length+' unavailable · '+ds.filter(([d,v])=>v.state==='unverified').length+' not verified</span></div>'+
    '<div class="tw"><table><thead><tr><th>Drug</th><th>Stock status</th><th>Upcoming need (all patients)</th><th>Last updated</th></tr></thead><tbody>'+ds.map(([d,v])=>{const need=ALL().filter(x=>live(x.e)&&x.e.date>=asOf&&x.e.drug===d);
      const oth=unavailIn(d).filter(x=>x!==pr.id);return'<tr class="'+(v.state==='unavailable'?'shortrow':oth.length?'shortrow2':'')+'"><td><span class="cdot cls-'+(CLS[d]||'anti')+'"></span><b class="'+(v.state==='unavailable'||oth.length?'shorttext':'')+'">'+esc(d)+'</b>'+(v.state==='unavailable'?' <span class="shortchip">Purchase required</span>':'')+(oth.length?'<div class="sub shorttext">Unavailable: marked under '+oth.map(protoName).map(esc).join(', ')+'</div>':'')+'</td><td><div class="tri" role="group" aria-label="Stock status for '+esc(d)+'">'+[['available','Available'],['unavailable','Unavailable'],['unverified','Not verified']].map(o=>'<button class="chip tri-'+o[0]+'" '+(w?'data-act="stock" data-pr="'+pr.id+'" data-dr="'+esc(d)+'" data-v="'+o[0]+'"':'disabled')+' aria-pressed="'+(v.state===o[0])+'">'+o[1]+'</button>').join('')+'</div></td><td>'+(need.length?need.length+' dose'+(need.length>1?'s':'')+', first '+fd(need[0].e.date)+'<div class="sub">'+[...new Set(need.map(x=>x.p.name||x.p.code))].map(esc).join(', ')+'</div>':'<span class="sub">None scheduled</span>')+'</td><td class="sub">'+(v.at?esc(v.at)+(v.by?', '+esc(v.by):''):'—')+'</td></tr>'}).join('')+'</tbody></table></div></div>'}).join('')+'</div>';
  const set=Object.keys(CLS).filter(d=>S.formulary[d]&&(S.formulary[d].conc||S.formulary[d].na)).length;
  h+='<div class="sec"><div class="panel pad row"><span class="cbig">'+set+' of '+Object.keys(CLS).length+'</span><div style="flex:1"><b>Drug concentrations</b><div class="sub">Used to turn doses in mg into volumes in mL.</div></div><a class="btn pri" href="#conc">Enter concentrations</a></div></div>';
  return h;
};
V.protocols=function(){
  const q=ui.prq.toLowerCase();
  const ps=S.protocols.filter(p=>(ui.reg==='all'||p.regimen===ui.reg)&&(!q||JSON.stringify(p).toLowerCase().includes(q)));
  const open=S.protocols.reduce((n,p)=>n+p.flags.filter(f=>!f.resolved).length,0);
  return banner()+'<div class="filters">'+[['all','All regimens'],['A','Regimen A'],['B','Regimen B'],['C','Regimen C']].map(o=>'<button class="chip" data-act="reg" data-v="'+o[0]+'" aria-pressed="'+(ui.reg===o[0])+'">'+o[1]+'</button>').join('')+
   '<input class="input search" id="prq" placeholder="Search drug or file" value="'+esc(ui.prq)+'" aria-label="Search protocols"><span class="spacer"></span><span class="sub">'+open+' open question'+(open===1?'':'s')+', '+S.protocols.filter(p=>p.reviewed).length+' of '+S.protocols.length+' reviewed</span></div>'+
   (ps.length?ps.map(p=>{const tpls=TPL.filter(t=>t.proto===p.id);const uo=p.flags.filter(f=>!f.resolved).length;
    return'<div class="panel pr"><div class="prh"><span class="reg '+p.regimen+'">'+p.regimen+'</span><div style="flex:1;min-width:220px"><h3>'+esc(p.phase)+'</h3><div class="sub">Weeks '+esc(p.weeks)+'. '+esc(p.file)+'</div></div>'+
    (p.reviewed?'<span class="tag t-sent">Reviewed</span>':'<span class="tag t-wait">Pending review</span>')+(canWrite?'<button class="btn sm" data-act="review" data-id="'+p.id+'">'+(p.reviewed?'Reopen':'Mark reviewed')+'</button>':'')+editBtn('pr-'+p.id)+'</div>'+(ui.editK==='pr-'+p.id?protoEdit(p):
    '<div class="tw"><table><thead><tr><th>Drug</th><th>Dose</th><th>Route</th><th>Schedule</th><th></th></tr></thead><tbody>'+p.rows.map(r=>{const t=tpls.find(t=>TDRUGS[t.id].includes(r[0]))||tpls[0];return'<tr><td><span class="cdot cls-'+(CLS[r[0]]||'anti')+'"></span>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td><td>'+esc(r[2])+'</td><td>'+esc(r[3])+'</td><td>'+(t?refBtn(t.id,r[0]):'')+'</td></tr>'}).join('')+'</tbody></table></div>'+
    '<div class="prmeta"><span>For</span><span>'+esc(p.who)+'</span><span>Supportive</span><span>'+esc(p.support)+'</span><span>Monitoring</span><span>'+esc(p.labs)+'</span><span>Schedule templates</span><span>'+(tpls.length?tpls.map(t=>esc(t.label)).join('; '):'None')+'</span></div>')+
    (p.flags.length?'<div style="padding:12px 20px 4px;border-top:1px solid var(--line2)"><b class="small">Questions for you</b> <span class="sub">'+uo+' open</span></div>'+p.flags.map((f,i)=>'<div class="q'+(f.resolved?' res':'')+'">'+(canWrite?'<input type="checkbox" data-act="flag" data-id="'+p.id+'" data-i="'+i+'"'+(f.resolved?' checked':'')+' aria-label="Mark resolved" style="margin-top:4px">':'<span>'+(f.resolved?'✓':'?')+'</span>')+'<div class="grow"><div class="qt">'+esc(f.text)+'</div>'+
     (canWrite?'<textarea class="input" style="min-height:44px;margin-top:6px" data-act="answer" data-id="'+p.id+'" data-i="'+i+'" placeholder="Your answer">'+esc(f.answer||'')+'</textarea>':(f.answer?'<div class="sub" style="margin-top:4px">Answer: '+esc(f.answer)+'</div>':''))+'</div></div>').join(''):'')+'</div>'}).join('')
   :'<div class="panel empty"><b>No protocols match</b>Clear the search or choose another regimen.</div>');
};
function protoEdit(p){const rows=p.rows.concat([['','','','']]);return'<div class="tw"><table class="edittable"><thead><tr><th>Drug</th><th>Dose</th><th>Route</th><th>Schedule</th><th>Delete</th></tr></thead><tbody>'+rows.map((r,i)=>{const n=i===rows.length-1;return'<tr'+(n?' class="newrow"':'')+'>'+[0,1,2,3].map(j=>'<td>'+IN('pr-'+j+'-'+i,r[j],null,n&&j===0?' placeholder="New drug"':'')+'</td>').join('')+'<td>'+(n?'':'<input type="checkbox" id="pr-x-'+i+'">')+'</td></tr>'}).join('')+'</tbody></table></div>'+
  '<div class="fgrid" style="padding:12px 20px"><label class="field full">For<input class="input" id="pr-who" value="'+esc(p.who)+'"></label><label class="field full">Supportive<input class="input" id="pr-sup" value="'+esc(p.support)+'"></label><label class="field full">Monitoring<input class="input" id="pr-lab" value="'+esc(p.labs)+'"></label></div>'+
  editBar('pr-'+p.id,'savepr','data-id="'+p.id+'"','This edits the protocol summary and the pharmacy drug list. Patient schedules and calculated doses come from the built-in templates and do not change.')}
V.references=function(){
  const ts=TPL.filter(t=>ui.refReg==='all'||t.reg===ui.refReg);
  return banner()+'<div class="filters">'+[['all','All regimens'],['A','Regimen A'],['B','Regimen B'],['C','Regimen C']].map(o=>'<button class="chip" data-act="refreg" data-v="'+o[0]+'" aria-pressed="'+(ui.refReg===o[0])+'">'+o[1]+'</button>').join('')+'<span class="spacer"></span><span class="sub">Reference index. Source scans are excluded from this demo.</span></div>'+
   '<div class="refgrid">'+ts.map(t=>{const h0=REFS.hits[t.id+'|'+TDRUGS[t.id][0]];const pg=h0?REFS.pages[h0.pdf.key]:null;return'<div class="panel"><div class="row"><span class="reg '+t.reg+'" style="width:30px;height:30px;font-size:13px">'+t.reg+'</span><div><h3>'+esc(t.label.replace(/^Regimen .: /,''))+'</h3><div class="sub">'+esc(t.weeks)+(h0?'. Protocol section '+esc(h0.section.split(' ')[0])+(pg?', page '+pg.page:''):'')+'</div></div></div><div class="drugs">'+TDRUGS[t.id].map(d=>'<button class="chip" data-act="ref" data-t="'+t.id+'" data-d="'+esc(d)+'"><span class="cdot cls-'+(CLS[d]||'anti')+'"></span>'+esc(d)+'</button>').join('')+'</div></div>'}).join('')+'</div>';
};
V.email=function(){
  const send=ui.emailDate||asOf;const target=add(send,lead());
  const xs=emailItems(send);const held=ALL().filter(x=>x.e.remind&&live(x.e)&&x.e.date===target&&!approved(x.p));
  const sentAll=xs.length&&xs.every(x=>sentFor(x.e));
  const days=[];for(let i=0;i<14;i++){const sd=add(asOf,i);days.push([sd,emailItems(sd).length,ALL().filter(x=>x.e.remind&&live(x.e)&&x.e.date===add(sd,lead())&&!approved(x.p)).length])}
  const body=emailText(send);
  return banner()+'<div class="two side300"><div>'+(held.length?'<div class="banner w">'+icon('warn',16)+'<span><b>'+held.length+' dose'+(held.length>1?'s':'')+' for patients pending approval '+(held.length>1?'are':'is')+' not in this email.</b> <a href="#approvals">Approve the patient</a> to include '+(held.length>1?'them':'it')+'.</span></div>':'')+
   '<div class="panel"><div class="mailsub"><div class="row"><span style="flex:1">'+(xs.length?esc(body.subject):'No email for this day')+'</span>'+(xs.length?editBtn('mail-'+send,'Edit text'):'')+'</div><small>Send on '+fl(send)+' at 09:00 Cairo time, for treatment on '+fl(target)+'. Contents: patient name, MRN, drug, dose and week only.</small></div>'+
   (xs.length?(ui.editK==='mail-'+send?'<div style="padding:14px 18px"><textarea class="input" id="mail-edit" rows="16" dir="auto">'+esc(mailText(send))+'</textarea><div class="row" style="margin-top:8px;justify-content:flex-end"><button class="btn" data-act="editcancel">Cancel</button><button class="btn pri" data-act="savemail" data-d="'+send+'">Use this text</button></div></div>':(S.mailEdits&&S.mailEdits[send]?'<div class="banner w" style="margin:12px 18px 0">Edited by hand'+(S.mailEdits[send].by?' ('+esc(S.mailEdits[send].by)+')':'')+'. You are responsible for keeping only name, MRN, drug, dose and week. '+(canWrite?'<button class="btn sm" data-act="mailrevert" data-d="'+send+'">Back to generated text</button>':'')+'</div>':'')+'<div class="mail" id="mailbody" dir="auto">'+esc(mailText(send))+'</div>'):'<div class="empty"><b>Nothing scheduled for approved patients on '+fl(target)+'</b>No empty email is sent. Pick another day on the right.</div>')+'</div>'+
   (xs.length?'<div class="row" style="margin-top:12px"><button class="btn pri" data-act="copymail">Copy email</button>'+(DL?'<button class="btn" data-act="dlmail">Download .txt</button>':'')+(canWrite?(sentAll?'<span class="tag t-sent">Marked sent</span><button class="btn sm ghost" data-act="unsend" data-d="'+send+'">Undo</button>':'<button class="btn" data-act="marksent" data-d="'+send+'">Mark as sent</button>'):'')+'<span class="sub">Gmail is not connected, so this board does not send email itself.</span></div>':'')+
   '</div><div class="panel"><div class="pad" style="border-bottom:1px solid var(--line)"><h3>Next 14 sending days</h3><div class="sub">Select a day to preview its email.</div></div><div class="list daylist">'+
   days.map(([sd,n,hn])=>'<div class="li'+(sd===send?' sel':'')+'" data-act="emailday" data-d="'+sd+'" role="button" tabindex="0"><div class="grow"><b>'+fd(sd)+'</b><div class="sub">For '+fd(add(sd,lead()))+'</div></div>'+(n?'<span class="tag t-due">'+n+' item'+(n>1?'s':'')+'</span>':'')+(hn?' <span class="tag t-wait">'+hn+' pending</span>':'')+(!n&&!hn?'<span class="sub">None</span>':'')+'</div>').join('')+'</div></div></div>';
};
function mailText(send){return S.mailEdits&&S.mailEdits[send]?S.mailEdits[send].text:emailText(send).text}
function emailItems(send){const target=add(send,lead());return ALL().filter(x=>x.e.remind&&live(x.e)&&x.e.date===target&&approved(x.p))}
function emailText(send){
  const target=add(send,lead());const xs=emailItems(send);const by={};xs.forEach(x=>(by[x.p.code]=by[x.p.code]||[]).push(x));
  let t='DEMO ONLY — fictional reminder preview.\n\nDear Clinical Pharmacy Team,\n\nChemotherapy scheduled for '+fl(target)+':\n';let n=0;
  Object.values(by).forEach(list=>{const p=list[0].p;n++;
    t+='\n'+n+'. Patient name: '+(p.name||'Not recorded')+'\n   MRN: '+(p.mrn||'Not recorded')+'\n';
    list.forEach(x=>{const c=calc(x.e,p);const v=c.miss?null:vol(x.e,p,c);const dose=x.e.dose.basis==='demo'&&!x.e.mod?'no clinical dose':c.miss?'dose not calculated ('+c.miss.toLowerCase()+')':(c.v+' '+c.u+(v&&v.ml!=null?' ('+v.ml+' mL'+(v.perDay?'/day':'')+' at '+v.conc+' '+v.unit+')':'')+(x.e.kind==='course'?' for '+x.e.len+' days':''));t+='   • '+x.e.drug+': '+dose+', week '+x.e.week+'\n'});});
  t+='\nBest regards,\nHematology Clinical Pharmacy Reminder System';
  return{subject:'DEMO – HEMATOLOGY REMINDER PREVIEW – '+fl(target),text:t};
}
V.log=function(){
  const tabs='<div class="filters">'+[['rem','Reminders'],['audit','Change history']].map(o=>'<button class="chip" data-act="logtab" data-v="'+o[0]+'" aria-pressed="'+(ui.logTab===o[0])+'">'+o[1]+'</button>').join('')+
   '<select class="input" style="width:auto" id="logpt"><option value="all">All patients</option>'+S.patients.map(p=>'<option value="'+esc(p.code)+'"'+(ui.logPt===p.code?' selected':'')+'>'+esc(p.name||p.code)+'</option>').join('')+'</select><span class="spacer"></span>'+(DL?'<button class="btn" data-act="exportcsv">Export CSV</button>':'')+'</div>';
  const nm=c=>{const p=pt(c);return p?(p.name||c):c};
  if(ui.logTab==='audit'){const rows=S.audit.filter(a=>ui.logPt==='all'||a.patient===ui.logPt).slice().reverse();
    return banner()+tabs+'<div class="panel">'+(rows.length?'<div class="tw"><table><thead><tr><th>When</th><th>Patient</th><th>Change</th></tr></thead><tbody>'+rows.map(a=>'<tr><td class="sub nw">'+esc(a.at)+'</td><td dir="auto">'+esc(a.patient?nm(a.patient):'—')+'</td><td>'+esc(a.text)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty"><b>No changes yet</b>Approvals, confirmed doses, delays, protocol changes and edits appear here.</div>')+'</div>';}
  const rows=S.sent_log.filter(s=>ui.logPt==='all'||s.patient===ui.logPt).slice().sort((a,b)=>b.sentOn.localeCompare(a.sentOn));
  return banner()+tabs+'<div class="panel">'+(rows.length?'<div class="tw"><table><thead><tr><th>Sent on</th><th>Patient</th><th>Drug</th><th>For treatment</th><th>How</th><th></th></tr></thead><tbody>'+rows.map(s=>'<tr><td><b>'+fd(s.sentOn)+'</b></td><td dir="auto">'+esc(nm(s.patient))+'</td><td><span class="cdot cls-'+(CLS[s.drug]||'anti')+'"></span>'+esc(s.drug)+'</td><td>'+fd(s.date)+'</td><td>'+(s.method==='gmail'?'<span class="tag t-sent">Gmail confirmed</span>':'<span class="tag t-plan">Marked sent by you</span>')+'</td><td>'+(canWrite?'<button class="btn sm ghost" data-act="unlog" data-id="'+esc(s.eventId)+'" data-d="'+s.date+'">Remove</button>':'')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty"><b>No reminders logged</b>Reminders appear here once an email is marked as sent.</div>')+'</div>';
};
function bsaEval(expr,W,H){const t=String(expr).replace(/\s+/g,'');let i=0;
  function num(){const m=/^\d+(\.\d+)?/.exec(t.slice(i));if(!m)throw new Error('number');i+=m[0].length;return parseFloat(m[0])}
  function prim(){if(t.startsWith('sqrt(',i)){i+=5;const v=sum();if(t[i]!==')')throw new Error(')');i++;return Math.sqrt(v)}const c=t[i];
    if(c==='('){i++;const v=sum();if(t[i]!==')')throw new Error(')');i++;return v}if(c==='-'){i++;return -prim()}
    if(c==='W'||c==='w'){i++;return W}if(c==='H'||c==='h'){i++;return H}return num()}
  function pw(){let v=prim();if(t[i]==='^'){i++;v=Math.pow(v,pw())}return v}
  function mul(){let v=pw();while(t[i]==='*'||t[i]==='/'){const o=t[i++];const r=pw();v=o==='*'?v*r:v/r}return v}
  function sum(){let v=mul();while(t[i]==='+'||t[i]==='-'){const o=t[i++];const r=mul();v=o==='+'?v+r:v-r}return v}
  if(!t)throw new Error('empty');const v=sum();if(i!==t.length||!isFinite(v))throw new Error('syntax');return v}
const bsaActive=()=>{const f=S.settings.bsaFormula;return!!(f&&f.expr&&f.source&&f.by&&f.verified)};
function bsaCalc(W,H){if(!bsaActive()||!(W>0))return null;if(/h/i.test(S.settings.bsaFormula.expr.replace(/sqrt/gi,''))&&!(H>0))return null;try{return r2(bsaEval(S.settings.bsaFormula.expr,W,H))}catch(e){return null}}
function bsaCard(){const f=S.settings.bsaFormula;const w=canWrite;
  return'<h3>BSA formula: Furqan and Haque</h3><div style="margin-top:6px">'+(bsaActive()?'<span class="tag t-sent">Configured</span> <span class="sub">Verified by '+esc(f.by)+', '+esc(f.at)+'</span>':'<span class="tag t-due">Not configured</span> <span class="sub">BSA is entered manually until the verified expression is saved.</span>')+'</div>'+
  (bsaActive()?'<div class="note">BSA (m²) = '+esc(f.expr)+', with W = weight in kg. Every BSA calculated from a weight uses this expression. A manual BSA correction (with a reason) takes precedence until the next weight is recorded.</div>':'<div class="note">Enter the expression exactly as published, using W for weight in kg and H for height in cm (operators + - * /, powers with ^, sqrt( ) allowed).</div>')+
  '<div class="fgrid" style="margin-top:10px"><label class="field full">Expression<input class="input" id="bf-expr" value="'+esc(f.expr)+'" placeholder="Exact published expression in W and H"'+(w?'':' disabled')+'></label>'+
  '<label class="field full">Published source (citation)<input class="input" id="bf-src" value="'+esc(f.source)+'"'+(w?'':' disabled')+'></label><label class="field">Verified by<input class="input" id="bf-by" value="'+esc(f.by)+'"'+(w?'':' disabled')+'></label>'+
  '<label class="field">Test: W (kg) and H (cm)<span class="row"><input type="number" class="input" id="bf-w" value="16" style="width:80px"><input type="number" class="input" id="bf-h" value="100" style="width:80px"><span id="bf-out" class="small"></span></span></label></div>'+
  (w?'<label class="check"><input type="checkbox" id="bf-ok"'+(f.verified?' checked':'')+'> I checked this expression against the published source</label><div class="err" id="bf-err"></div><div class="row" style="margin-top:8px"><button class="btn pri" data-act="savebsa">Save formula</button>'+(f.expr?'<button class="btn warn" data-act="clearbsa">Remove formula</button>':'')+'</div>':'')+'<hr class="sep">'}
V.settings=function(){
  let th='system';try{th=localStorage.getItem('chemo-theme')||'system'}catch(e){}
  return banner()+'<div class="two"><div class="panel pad"><h3>Display</h3><div class="field" style="margin-top:12px">Theme<select class="input" id="theme">'+[['system','Match my device'],['light','Light'],['dark','Dark']].map(o=>'<option value="'+o[0]+'"'+(th===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select></div>'+
   bsaCard()+'<h3 style="margin-top:22px">Reminder rules</h3><div class="kv" style="margin-top:10px"><span>Lead time</span><span>'+lead()+' calendar days</span><span>Treatment runway (all views)</span><span>'+RUN()+' days</span><span>Send time</span><span>09:00, Africa/Cairo</span><span>Email contents</span><span>Patient name, MRN, drug, dose, week</span><span>Who is included</span><span>Approved patients only</span><span>Empty days</span><span>No email sent</span><span>Past doses</span><span>Confirmed as given by default unless held, cancelled, recorded as not given, or a dose discrepancy is open'+(canWrite?' <button class="btn sm" data-act="toggleauto">'+(S.settings.autoConfirmPast===false?'Turn on':'Turn off')+'</button>':'')+'</span></div>'+
   '<div class="note">This demo previews reminder emails and records manual sent marks. Automated sending requires a separate integration.</div></div>'+
   '<div class="panel pad"><h3>Data</h3><p class="sub">Back up the register, restore it, or return to the sample records.</p><div class="row" style="margin-top:12px">'+(DL?'<button class="btn" data-act="exportjson">Export data (.json)</button>':'<button class="btn" data-act="copyjson">Copy data as JSON</button>')+(canWrite?'<label class="btn">Import data<input type="file" id="importf" accept=".json,application/json" hidden></label>':'')+'</div>'+
   (canWrite?'<div class="row" style="margin-top:10px"><button class="btn warn" data-act="resetdemo">Reset to the sample records</button></div>':'')+
   '<h3 style="margin-top:22px">Privacy</h3><div class="note">Only approved demo accounts can open the shared board. Use fictional records.</div>'+
   '<h3 style="margin-top:22px">Editing</h3><div class="note">'+'Select Save changes to update the shared board. Load shared version retrieves other editors’ saved changes.'+'</div>'+
   '<div class="row" style="margin-top:12px"><button class="btn" data-act="shared-load">Load shared version</button><button class="btn" data-act="shared-signout">Sign out</button></div></div></div>';
};

/* ---------- modals ---------- */
function modal(html,cls,onMount){const m=document.getElementById('modal');m.innerHTML='<div class="scrim" data-act="scrim"><div class="modal '+(cls||'')+'" role="dialog" aria-modal="true">'+html+'</div></div>';
  const f=m.querySelector('input:not([type=checkbox]),select,textarea,button.pri');if(f)f.focus();if(onMount)onMount(m);}
function closeModal(){document.getElementById('modal').innerHTML=''}
function toast(t){const b=document.getElementById('toasts');const d=document.createElement('div');d.className='toast';d.textContent=t;b.appendChild(d);setTimeout(()=>d.remove(),2600)}
const X='<button class="btn sm ghost" data-act="close" aria-label="Close">✕</button>';
const btnRow=(act,label,p,extra)=>'<div class="mf" style="padding:14px 0 0;border:0">'+(extra||'')+'<button class="btn pri" data-act="'+act+'" data-p="'+esc(p.code)+'" '+'>'+label+'</button></div>';

function refModal(tpl,drug,tab){
  const h=REFS.hits[tpl+'|'+drug];if(!h){toast('Reference scans are not included in this demo');return}
  const t=TPLID[tpl];tab=tab||'grid';const src=h[tab];const pg=REFS.pages[src.key];
  const boxes=(src.rects||[]).map(r=>'<span class="hl" style="left:'+(r[0]*100)+'%;top:'+(r[1]*100)+'%;width:'+((r[2]-r[0])*100)+'%;height:'+((r[3]-r[1])*100)+'%"></span>').join('');
  modal('<div class="mh"><span class="cdot cls-'+(CLS[drug]||'anti')+'" style="width:12px;height:12px;margin-top:6px"></span><div style="flex:1"><h3>'+esc(drug)+': '+esc(t.label)+'</h3><div class="sub">'+esc(pg.label)+'. File: '+esc(pg.file)+(tab==='pdf'?'. Section '+esc(h.section):'')+'</div></div>'+X+'</div><div class="mb">'+
   '<div class="seg" style="margin-top:0"><button class="chip" data-act="reftab" data-t="'+tpl+'" data-d="'+esc(drug)+'" data-v="grid" aria-pressed="'+(tab==='grid')+'">Hospital regimen sheet</button><button class="chip" data-act="reftab" data-t="'+tpl+'" data-d="'+esc(drug)+'" data-v="pdf" aria-pressed="'+(tab==='pdf')+'">UKALL 2011 protocol, page '+REFS.pages[h.pdf.key].page+'</button></div>'+
   '<p class="sub" style="margin:6px 0 10px">'+(src.rects&&src.rects.length?'Highlighted: “'+esc(src.found)+'” ('+src.rects.length+' place'+(src.rects.length>1?'s':'')+' on this page).':'The drug name was not found as text on this page; read the page directly.')+(tab==='grid'?' The hospital sheet is the primary reference.':'')+'</p>'+
   '<div class="refwrap" id="refwrap"><div class="refpage"><img src="'+pg.img+'" alt="'+esc(pg.label)+'" width="'+pg.w+'" height="'+pg.h+'">'+boxes+'</div></div></div>','xl',m=>{const b=m.querySelector('.hl');const w=m.querySelector('#refwrap');if(b&&w){setTimeout(()=>{w.scrollTop=Math.max(0,b.offsetTop-80)},30)}});
}
function evModal(code,id,act){
  const p=pt(code);const e=p&&p.events.find(x=>x.id===id);if(!e)return;const r=rem(e,p);const c=calc(e,p);const x=disc(e,p);const v=c.miss?null:vol(e,p,c);
  const acts=[['given','Confirm given'],['postpone','Postpone treatment'],['enter','Enter prescribed dose'],['modify','Modify dose'],['edit','Edit entry'],['notgiven','Not given'],['hold','Hold'],['cancel','Cancel'],['verify',e.verified?'Unverify dose':'Verify dose'],['reset','Reset']];
  if(x&&!x.noCalc)acts.unshift(['authdisc',x.auth?'Discrepancy decision':'Review discrepancy']);
  let form='';const foot=(a,l,extra)=>'<div class="mf" style="padding:14px 0 0;border:0">'+(extra||'')+'<button class="btn pri" data-act="'+a+'" data-p="'+esc(code)+'" data-e="'+id+'">'+l+'</button></div>';
  const nameF=(lab)=>'<label class="field">'+(lab||'Your name (required)')+'<input class="input" id="f-by" value="'+esc(lastBy())+'"></label>';
  if(act==='given')form=(discOpen(e,p)?'<div class="note w">This dose has an unreviewed discrepancy. Review it before confirming.</div>':'<div class="fgrid"><label class="field">Date given<input type="date" class="input" id="f-date" value="'+(e.actualDate||(e.date<=asOf?e.date:asOf))+'"></label><label class="field">Note (optional)<input class="input" id="f-note"></label></div>'+foot('do-given','Confirm as given'));
  if(act==='postpone'){const later=p.events.filter(y=>y.phaseId===e.phaseId&&y.date>e.date&&live(y)).length;
    form='<div class="kv"><span>Original date</span><span><b>'+fl(e.origDate||e.date)+'</b>'+(e.origDate&&e.origDate!==e.date?' (currently '+fl(e.date)+')':'')+'</span></div><div class="fgrid" style="margin-top:10px"><label class="field">Revised treatment date<input type="date" class="input" id="f-date" value="'+add(e.date,7)+'"></label><label class="field">Reason for postponement (required)<input class="input" id="f-reason" placeholder="e.g. neutropenia, ANC 0.5"></label>'+nameF()+'</div>'+
    '<label class="check"><input type="checkbox" id="f-shift"> Also move the '+later+' later dose'+(later===1?'':'s')+' in this phase by the same number of days</label><div class="note w">The patient’s status becomes Delayed and the seven-day runway updates. The treatment is not marked as given.</div>'+foot('do-postpone','Confirm postponement');}
  if(act==='enter')form='<p class="small" style="margin:0 0 8px">Record the dose written on the prescription. The board compares it with the calculated dose and flags any difference; it never changes either value.</p><div class="fgrid"><label class="field">Prescribed dose ('+esc(String(c.u||e.dose.unit||'mg'))+')<input type="number" step="any" min="0" class="input" id="f-val" value="'+(e.entered?e.entered.value:'')+'"></label><label class="field">Prescribed volume, if written (mL)<input type="number" step="any" min="0" class="input" id="f-ml" value="'+(e.entered&&e.entered.ml!=null?e.entered.ml:'')+'"></label><label class="field">Source<input class="input" id="f-src" value="'+esc(e.entered?e.entered.source:'Prescription')+'"></label>'+nameF('Entered by (required)')+'</div>'+foot('do-enter','Save prescribed dose');
  if(act==='authdisc')form=x&&!x.noCalc?'<div class="kv"><span>Calculated dose</span><span>'+x.exp+' '+esc(x.u)+' <span class="sub">'+esc(c.f)+'</span></span><span>Entered dose</span><span><b>'+x.ent+' '+esc(x.u)+'</b> <span class="sub">'+esc(e.entered.source||'')+', by '+esc(e.entered.by||'')+'</span></span><span>Difference</span><span class="'+(x.major?'warnt':'')+'">'+(x.d>0?'+':'')+x.d+' '+esc(x.u)+' ('+(x.pct>0?'+':'')+x.pct+'%)</span></div>'+
    (x.auth?'<div class="note">Authorized by '+esc(x.auth.by)+', '+esc(x.auth.at)+': '+esc(x.auth.reason)+'</div>':'<div class="note w">Authorizing records a clinical decision to proceed with the entered dose. Neither dose is changed. To change the dose, use Modify dose.</div><div class="fgrid" style="margin-top:10px">'+nameF('Authorizing clinician (required)')+'<label class="field">Clinical justification (required)<input class="input" id="f-reason"></label></div>'+foot('do-authdisc','Authorize to proceed')):'';
  if(act==='edit')form='<div class="fgrid"><label class="field">Date<input type="date" class="input" id="f-date" value="'+e.date+'"></label><label class="field">Protocol week<input type="number" class="input" id="f-week" value="'+e.week+'" min="1" max="200"></label><label class="field">Route<input class="input" id="f-route" value="'+esc(e.route)+'"></label><label class="field">Note<input class="input" id="f-note" value="'+esc(e.note)+'"></label><label class="field full">Reason for the edit (required)<input class="input" id="f-reason"></label></div>'+foot('do-edit','Save entry');
  if(act==='hold'||act==='cancel'||act==='notgiven')form='<label class="field">Reason (required)<input class="input" id="f-reason"></label>'+foot('do-'+act,act==='hold'?'Hold dose':act==='cancel'?'Cancel dose':'Record as not given');
  if(act==='modify'){const orig=e.mod?e.mod.value:c.v;form='<div class="kv"><span>Current dose</span><span>'+(orig!=null?orig+' '+esc(c.u||''):'Not calculated')+(e.mod?' (already modified)':'')+'</span></div><div class="fgrid" style="margin-top:10px"><label class="field">Modified dose<input type="number" step="any" min="0" class="input" id="f-val" value="'+(orig!=null?orig:'')+'"></label><label class="field">Unit<input class="input" id="f-unit" value="'+esc(c.u||e.dose.unit||'mg')+'"></label><label class="field">Date of modification<input type="date" class="input" id="f-mdate" value="'+asOf+'"></label>'+nameF('Responsible clinician (required)')+'<label class="field full">Reason (required)<input class="input" id="f-reason" placeholder="e.g. grade 2 neuropathy, 50% reduction"></label><label class="field full">Clinical documentation (optional)<input class="input" id="f-doc" placeholder="e.g. order number, note reference"></label></div>'+foot('do-modify','Save modification',e.mod?'<button class="btn" data-act="do-unmod" data-p="'+esc(code)+'" data-e="'+id+'">Remove modification</button>':'');}
  if(act==='reset')form='<p class="small" style="margin:0">Return this dose to scheduled'+(e.origDate?' and restore the original date, '+fd(e.origDate):'')+'.</p>'+foot('do-reset','Reset dose');
  const mh=p.modLog.filter(m=>m.eventId===e.id),ph=p.postponements.filter(m=>m.eventId===e.id);
  modal('<div class="mh"><span class="cdot cls-'+e.cls+'" style="width:12px;height:12px;margin-top:6px"></span><div style="flex:1"><h3>'+esc(lbl(e))+', week '+e.week+'</h3><div>'+whoH(p)+'</div><div class="sub">'+esc(e.phase)+', day '+e.day+'</div></div>'+refBtn(e.tpl,e.drug)+X+'</div><div class="mb">'+
   (shortage(e)?'<div class="banner w" style="margin-bottom:12px">'+icon('pharmacy',16)+'<span><b>Shortage alert:</b> '+esc(e.drug)+' is marked unavailable for this protocol. Purchase required.</span></div>':'')+
   '<div class="kv"><span>Date</span><span><b>'+fl(e.date)+'</b>'+(e.end?' to '+fl(e.end):'')+(e.origDate?'<br><span class="sub">Originally '+fl(e.origDate)+'</span>':'')+(e.actualDate&&e.actualDate!==e.date?'<br><span class="sub">Record date '+fl(e.actualDate)+'</span>':'')+'</span><span>Status</span><span>'+stateTag(e)+(e.reason?' <span class="sub">'+esc(e.reason)+'</span>':'')+'</span><span>Reminder</span><span><span class="tag '+r.c+'">'+r.t+'</span></span><span>Route</span><span>'+esc(e.route)+'</span>'+
   '<span>Protocol dose</span><span>'+esc(e.dose.text)+'</span><span>'+(c.type||'Dose')+' (mg)</span><span>'+(c.miss?'<span class="warnt">'+c.miss+'</span>':(c.v==null?esc(c.f):'<b>'+esc(c.v)+' '+esc(c.u)+'</b> <span class="sub">'+esc(c.f)+'</span>'))+(c.warn?'<div class="warnt">'+esc(c.warn)+'</div>':'')+'</span>'+
   '<span>Volume (mL)</span><span>'+(v?(v.ml!=null?'<b>'+v.ml+' mL'+(v.perDay?'/day':'')+'</b> <span class="sub">system-calculated: '+c.v+' ÷ '+v.conc+' '+esc(v.unit)+(v.form?', '+esc(v.form):'')+'</span>':v.na?'Not applicable (oral solid)':'<span class="mlmiss">'+esc(v.miss)+'</span> <a href="#conc">Set concentration</a>'):'—')+'</span>'+
   '<span>Prescribed (entered)</span><span>'+(e.entered?'<b>'+e.entered.value+' '+esc(c.u||'')+'</b>'+(e.entered.ml!=null?', '+e.entered.ml+' mL as written':'')+' <span class="sub">'+esc(e.entered.source||'')+', '+esc(e.entered.by||'')+', '+esc(e.entered.at||'')+'</span>':'Not entered')+(x&&!x.noCalc?'<div class="'+(x.auth?'discok':'discbad')+'">'+(x.auth?'Discrepancy authorized':'Discrepancy')+': '+(x.d>0?'+':'')+x.d+' '+esc(x.u)+' ('+(x.pct>0?'+':'')+x.pct+'%)</div>':'')+'</span>'+
   '<span>Verification</span><span>'+(e.verified?'<span class="tag t-sent">Pharmacist verified</span>':'Not yet verified')+'</span>'+(e.note?'<span>Instruction</span><span>'+esc(e.note)+'</span>':'')+(e.derived?'<span>Source</span><span class="sub">Day placed at the start of the week marked in the hospital grid. Confirm the exact day.</span>':'')+'</div>'+
   (mh.length?'<div class="note"><b>Modifications:</b> '+mh.map(m=>esc(m.date?fy(m.date):'')+': '+(m.removed?'removed':esc(m.orig)+' → '+esc(m.value)+' '+esc(m.unit)+' ('+m.dir+')')+', '+esc(m.reason)+', '+esc(m.by)).join('<br>')+'</div>':'')+
   (ph.length?'<div class="note"><b>Postponements:</b> '+ph.map(m=>fy(m.from)+' → '+fy(m.to)+', '+esc(m.reason)+', '+esc(m.by)).join('<br>')+'</div>':'')+
   '<div class="note">Preparation reference only. Verify against the current treatment plan, labs and clinical status before preparation.</div>'+
   (canWrite&&e.state!=='superseded'?'<div class="seg">'+acts.map(a=>'<button class="chip" data-act="evact" data-v="'+a[0]+'" data-p="'+esc(code)+'" data-e="'+id+'" aria-pressed="'+(act===a[0])+'">'+a[1]+'</button>').join('')+'</div>'+(form?'<div style="margin-top:10px">'+form+'<div class="err" id="f-err"></div></div>':''):'')+'</div>');
}
function lastBy(){try{return localStorage.getItem('chemo-last-by')||''}catch(e){return''}}
function setBy(v){try{localStorage.setItem('chemo-last-by',v)}catch(e){}}
function ptFields(p){p=p||{};const sx=['','Male','Female'];
  return '<label class="field full">Patient name (required)<input class="input" id="f-name" dir="auto" value="'+esc(p.name||'')+'"></label>'+
   '<label class="field">MRN<input class="input" id="f-mrn" value="'+esc(p.mrn||'')+'" placeholder="Leave blank if not on the record"></label><label class="field">Date of first admission<input class="input" id="f-adm" value="'+esc(p.admission||'')+'" placeholder="e.g. 5/6/2025"></label>'+
   '<label class="field">Age as recorded<input class="input" id="f-age" value="'+esc(p.age||'')+'" placeholder="e.g. 6 years"></label><label class="field">Age in years, for IT dosing<input type="number" step="0.1" min="0" max="99" class="input" id="f-agey" value="'+(p.ageYears==null?'':esc(p.ageYears))+'"></label>'+
   '<label class="field">Sex<select class="input" id="f-sex">'+sx.map(s=>'<option value="'+s+'"'+((p.sex||'')===s?' selected':'')+'>'+(s||'Not recorded')+'</option>').join('')+'</select></label><label class="field">Weight (kg)<input type="number" step="0.1" min="1" max="200" class="input" id="f-wt" value="'+esc(p.weight||'')+'"></label>'+
   '<label class="field">Height (cm)<input type="number" step="0.1" min="30" max="220" class="input" id="f-ht" value="'+esc(p.height||'')+'"></label><label class="field">BSA used for dosing (m²)<input type="number" step="0.01" min="0.2" max="3" class="input" id="f-bsa" value="'+esc(p.bsa||'')+'"></label><label class="field">BSA note<input class="input" id="f-bsan" value="'+esc(p.bsaNote||'')+'" placeholder="e.g. latest value on the sheet"></label>'+
   (p&&p.code?'':'<label class="field">Status<select class="input" id="f-apst"><option value="confirmed">Confirmed</option><option value="awaiting">Awaiting approval</option></select></label>')+'<label class="field">Diagnosis<input class="input" id="f-dx" value="'+esc(p.diagnosis||'')+'" placeholder="Leave blank if not recorded"></label><label class="field">Protocol as written<input class="input" id="f-proto" value="'+esc(p.protocol||'')+'" placeholder="e.g. UKALL 2011 Reg A"></label>';
}
function readPt(err){const v=s=>{const x=document.getElementById(s);return x?x.value.trim():''};
  const o={name:v('f-name'),mrn:v('f-mrn'),admission:v('f-adm'),age:v('f-age'),ageYears:v('f-agey')===''?null:+v('f-agey'),sex:v('f-sex'),weight:v('f-wt')===''?null:+v('f-wt'),height:v('f-ht')===''?null:+v('f-ht'),bsa:v('f-bsa')===''?null:+v('f-bsa'),bsaNote:v('f-bsan'),diagnosis:v('f-dx'),protocol:v('f-proto')};
  if(!o.name){err('Enter the patient name.');return null}
  if(o.bsa!=null&&!(o.bsa>=0.2&&o.bsa<=3)){err('BSA should be between 0.2 and 3 m².');return null}
  if(o.ageYears!=null&&!(o.ageYears>=0&&o.ageYears<100)){err('Age looks wrong.');return null}
  if(o.mrn&&S.patients.some(p=>p.mrn===o.mrn&&p.code!==readPt.code)){err('Another patient already has this MRN.');return null}
  return o;}
function tplSelect(list,selId){return list.map(t=>'<option value="'+t.id+'"'+(t.id===selId?' selected':'')+'>'+esc(t.label)+' ('+esc(t.weeks)+')</option>').join('')}
function phaseFields(list,selId,withNone){return '<label class="field full">Treatment phase<select class="input" id="f-tpl">'+(withNone?'<option value="">No schedule yet (position not documented)</option>':'')+tplSelect(list,selId)+'</select></label><label class="field">Phase day 1<input type="date" class="input" id="f-start" value="'+asOf+'"></label><label class="field" id="f-cyw">12-week cycles to schedule<input type="number" min="1" max="12" class="input" id="f-cyc" value="2"></label>'}
function wirePreview(m,getP){
  const upd=()=>{const tid=m.querySelector('#f-tpl').value;const pv=m.querySelector('#f-prev'),tn=m.querySelector('#f-tnote');
    if(!tid){m.querySelector('#f-cyw').style.display='none';tn.innerHTML='The patient is registered without doses. Add the phase once the current position is confirmed.';pv.innerHTML='';return}
    const t=TPLID[tid];const st=m.querySelector('#f-start').value;m.querySelector('#f-cyw').style.display=t.cycles?'':'none';
    tn.innerHTML=(t.needsCounts?'<b>Before day 1:</b> ANC >0.75 and platelets >75. ':'')+(t.derived?'Days sit at the start of each week marked in the hospital grid; confirm exact days.':'Days follow the protocol day numbers.');
    if(!st){pv.innerHTML='';return}const tmp=getP();
    const b=buildPhase('PREVIEW',tid,st,+m.querySelector('#f-cyc').value||2);
    pv.innerHTML='<table><thead><tr><th>Week</th><th>Date</th><th>Drug</th><th>Dose</th></tr></thead><tbody>'+b.events.filter(e=>e.remind).map(e=>'<tr><td>Wk '+e.week+'</td><td>'+fd(e.date)+'</td><td><span class="cdot cls-'+e.cls+'"></span>'+esc(lbl(e))+'</td><td>'+doseHTML(e,tmp,true)+'</td></tr>').join('')+'</tbody></table>';};
  m.querySelectorAll('input,select').forEach(x=>x.addEventListener('input',upd));upd();
}

/* ---------- mutations ---------- */
function log(p,text){const at=stamp();S.audit.push({at,patient:p?p.code:null,text});if(p)p.history.push({at,text});dirty++;}
function mutate(fn){
  if(!canWrite||busy)return;
  fn();pendingWrite=null;render();
}
function newChecklist(extra){return STD_CHECKS.map(t=>({text:t,done:false,kind:'std'})).concat((extra||[]).map(t=>({text:t,done:false,kind:'flag'})))}
function revokeIfApproved(p,why){log(p,'Review suggested: '+why+'. Status unchanged (Confirmed); set it to Awaiting approval in Edit if a full re-check is needed.')}
function setAwaiting(p,by){p.verification={first:null,second:null};p.approval={state:'pending'};p.checklist.forEach(c=>{if(c.kind==='std')c.done=false});log(p,'Status set to Awaiting approval'+(by?' by '+by:'')+'; approval checklist shown')}
function setConfirmed(p,by){p.verification={first:{by:by||'Not recorded',at:stamp()},second:null};p.approval={state:'approved',at:p.verification.first.at};log(p,'Status set to Confirmed'+(by?' by '+by:''))}
function restoreStatus(p){if(p.status==='delayed'&&!p.events.some(e=>e.postponed&&e.state==='delayed')){p.status=p.prevStatus||'active';log(p,'Status returned to '+p.status+': no postponed treatment remains')}}
function applyPostpone(p,e,d,rs,by,shift,via){const n=diff(d,e.date);const later=p.events.filter(x=>x.phaseId===e.phaseId&&x.date>e.date&&live(x));
  p.postponements.push({eventId:e.id,drug:e.drug,week:e.week,from:e.date,to:d,reason:rs,by,at:stamp(),shift:!!shift,via:via||''});
  if(!e.origDate)e.origDate=e.date;e.date=d;if(e.end)e.end=add(e.end,n);e.state='delayed';e.postponed=true;e.reason='Postponed: '+rs;
  if(shift)later.forEach(x=>{if(!x.origDate)x.origDate=x.date;x.date=add(x.date,n);if(x.end)x.end=add(x.end,n);x.reason='Moved with the '+e.drug+' postponement'});
  if(p.status!=='delayed'){p.prevStatus=p.status;p.status='delayed'}p.events.sort((a,b)=>a.date.localeCompare(b.date));
  log(p,'Postponed '+e.drug+' week '+e.week+' from '+fy(p.postponements[p.postponements.length-1].from)+' to '+fy(d)+' ('+rs+'), by '+by+(shift?'; moved '+later.length+' later doses by '+n+' days':'')+(via?' '+via:'')+'; status Delayed')}
function applyModify(p,e,val,unit,date,rs,by,doc,via){const c=calc(Object.assign({},e,{mod:null}),p);const orig=e.mod?e.mod.value:c.v;const pct=orig?Math.round((val-orig)/orig*1000)/10:null;const dir=val<orig?'Reduced':val>orig?'Increased':'Unchanged';
  p.modLog.push({eventId:e.id,drug:e.drug,week:e.week,orig:orig==null?'—':orig,value:val,unit,dir,pct,date,reason:rs,by,doc:doc||'',at:stamp(),via:via||''});
  e.mod={value:val,unit,reason:rs,by,date};e.verified=false;log(p,'Dose modified: '+e.drug+' week '+e.week+' '+orig+' → '+val+' '+unit+' ('+dir.toLowerCase()+(pct?' '+Math.abs(pct)+'%':'')+'), '+rs+', by '+by+(via?' '+via:''))}
function applyPatientUpdate(p,o,rs,by,via){const ch=[];const dosing=['bsa','ageYears','weight','height'];let bsaManual=false;
  Object.keys(o).forEach(k=>{if(String(o[k]==null?'':o[k])!==String(p[k]==null?'':p[k])){ch.push(k+': '+(p[k]==null||p[k]===''?'—':p[k])+' → '+(o[k]==null||o[k]===''?'—':o[k]));if(k==='bsa')bsaManual=true;p[k]=o[k]}});
  const today=asOf;const wc=ch.some(c=>/^weight/.test(c)),hc=ch.some(c=>/^height/.test(c));
  if(wc)p.weightAsOf=today;if(hc)p.heightAsOf=today;
  if(bsaManual){p.bsaAsOf=today;p.bsaSource='Manual correction: '+rs}
  else if((wc||hc)&&bsaActive()){const b=bsaCalc(p.weight,p.height);if(b){ch.push('bsa (Furqan and Haque): '+p.bsa+' → '+b);p.bsa=b;p.bsaAsOf=today;p.bsaSource='Furqan and Haque from '+p.weight+' kg'}}
  if(wc||hc||bsaManual)p.measurements.push({date:today,weight:wc?p.weight:null,height:hc?p.height:null,bsa:(bsaManual||ch.some(c=>/^bsa \(/.test(c)))?p.bsa:null,bsaMethod:bsaManual?'Manual':(ch.some(c=>/^bsa \(/.test(c))?'Furqan and Haque':''),source:'Edit by '+by+': '+rs});
  if(p.bsaAsOf&&p.weightAsOf&&/^\d{4}/.test(p.bsaAsOf)&&p.bsaAsOf<p.weightAsOf&&!p.conflicts.some(c=>!c.resolved&&c.kind==='stalebsa'))p.conflicts.push({kind:'stalebsa',text:'BSA ('+p.bsa+' m², '+fy(p.bsaAsOf)+') is older than the latest weight ('+p.weight+' kg, '+fy(p.weightAsOf)+'). Confirm the BSA before dosing.',at:stamp()});
  if(ch.some(c=>dosing.some(d=>c.startsWith(d)))){p.events.forEach(x=>{if(live(x))x.verified=false});revokeIfApproved(p,'dosing parameters changed')}
  log(p,'Edited patient ('+rs+'), by '+by+(via?' '+via:'')+': '+(ch.join('; ')||'no change'));return ch}
function stopFrom(p,date,why){let n=0;p.events.forEach(e=>{if(live(e)&&e.date>=date){e.state='superseded';e.reason=why;n++}});return n}
function doAct(a,el){
  const code=el.dataset.p,id=el.dataset.e;const p=code?pt(code):null;const e=p&&id?p.events.find(x=>x.id===id):null;
  const val=s=>{const x=document.getElementById(s);return x?x.value.trim():''};
  const err=t=>{const x=document.getElementById('f-err');if(x)x.textContent=t};
  switch(a){
  case'close':case'scrim':closeModal();break;
  case'today':asOf=cairo();ui.emailDate=null;render();break;
  case'kpi':{const g=el.dataset.go;if(g==='attention'){const x=document.getElementById('attention');if(x)x.scrollIntoView({behavior:'smooth'});break}if(g==='miss'){const x=document.getElementById('miss');if(x)x.scrollIntoView({behavior:'smooth'});else toast('No missed reminders')}else location.hash=g;break}
  case'ev':evModal(code,id,null);break;
  case'ref':refModal(el.dataset.t,el.dataset.d,'grid');break;
  case'reftab':refModal(el.dataset.t,el.dataset.d,el.dataset.v);break;
  case'refreg':ui.refReg=el.dataset.v;render();break;
  case'evact':if(el.dataset.v==='verify'){mutate(()=>{e.verified=!e.verified;log(p,(e.verified?'Verified ':'Removed verification for ')+e.drug+' week '+e.week)});evModal(code,id,null)}else evModal(code,id,el.dataset.v);break;
  case'do-given':{if(discOpen(e,p))return err('Review the dose discrepancy first.');const d=val('f-date');if(!d)return err('Enter the date given.');mutate(()=>{e.state='administered';e.actualDate=d;e.reason=val('f-note');log(p,'Confirmed '+e.drug+' week '+e.week+' given on '+fy(d));restoreStatus(p)});closeModal();toast('Recorded as given');break}
  case'postpone':evModal(code,id,'postpone');break;
  case'do-postpone':{const d=val('f-date'),rs=val('f-reason'),by=val('f-by');if(!d)return err('Choose the revised date.');if(!rs)return err('Add the reason for postponement.');if(!by)return err('Add your name.');if(d===e.date)return err('The revised date is the same as the current date.');if(d<e.date&&!confirm('The revised date is earlier than the current date. Continue?'))return;
    setBy(by);mutate(()=>applyPostpone(p,e,d,rs,by,document.getElementById('f-shift').checked));closeModal();toast('Treatment postponed; status Delayed');break}
  case'do-enter':{const v=parseFloat(val('f-val')),ml=val('f-ml'),by=val('f-by');if(!(v>=0))return err('Enter the prescribed dose.');if(!by)return err('Add who entered it.');setBy(by);
    mutate(()=>{e.entered={value:v,ml:ml===''?null:+ml,source:val('f-src')||'Prescription',by,at:stamp()};const x=disc(e,p);log(p,'Prescribed dose entered for '+e.drug+' week '+e.week+': '+v+(ml?' ('+ml+' mL)':'')+', by '+by+(x&&!x.noCalc?'; DISCREPANCY '+(x.d>0?'+':'')+x.d+' ('+x.pct+'%) vs calculated '+x.exp:'; matches the calculation'))});evModal(code,id,null);break}
  case'do-authdisc':{const x=disc(e,p);const by=val('f-by'),rs=val('f-reason');if(!by||!rs)return err('Add the authorizing clinician and the justification.');setBy(by);
    mutate(()=>{e.discAuth={by,reason:rs,at:stamp(),entered:x.ent,expected:x.exp};log(p,'Discrepancy authorized for '+e.drug+' week '+e.week+' (entered '+x.ent+', calculated '+x.exp+'), by '+by+': '+rs)});evModal(code,id,null);toast('Decision recorded');break}
  case'do-edit':{const d=val('f-date'),wk=parseInt(val('f-week'),10),rs=val('f-reason');if(!d||!(wk>0))return err('Enter a date and week.');if(!rs)return err('Add the reason for the edit.');
    mutate(()=>{const ch=[];if(d!==e.date){const n=diff(d,e.date);if(!e.origDate)e.origDate=e.date;e.date=d;if(e.end)e.end=add(e.end,n);ch.push('date → '+fy(d))}if(wk!==e.week){ch.push('week '+e.week+' → '+wk);e.week=wk}
      const ro=val('f-route'),no=val('f-note');if(ro!==e.route){ch.push('route → '+ro);e.route=ro}if(no!==e.note){ch.push('note');e.note=no}
      log(p,'Edited '+e.drug+' entry: '+(ch.join(', ')||'no change')+' ('+rs+')')});closeModal();toast('Entry saved');break}
  case'do-hold':case'do-cancel':case'do-notgiven':{const rs=val('f-reason');if(!rs)return err('Add the reason.');mutate(()=>{e.state=a==='do-hold'?'held':a==='do-cancel'?'cancelled':'notgiven';e.auto=false;e.noAuto=true;e.reason=rs;log(p,(a==='do-hold'?'Held ':a==='do-cancel'?'Cancelled ':'Recorded as not given: ')+e.drug+' week '+e.week+' ('+rs+')');restoreStatus(p)});closeModal();break}
  case'do-modify':{const v=parseFloat(val('f-val')),u=val('f-unit'),rs=val('f-reason'),by=val('f-by'),md=val('f-mdate');if(!(v>=0))return err('Enter the modified dose.');if(!rs)return err('Add the reason.');if(!by)return err('Add the responsible clinician.');setBy(by);
    mutate(()=>applyModify(p,e,v,u||'mg',md,rs,by,val('f-doc')));closeModal();toast('Modification recorded');break}
  case'do-unmod':{const by=val('f-by'),rs=val('f-reason');if(!by||!rs)return err('Add your name and the reason for removing it.');mutate(()=>{p.modLog.push({eventId:e.id,drug:e.drug,week:e.week,orig:e.mod.value,value:'',unit:e.mod.unit,removed:true,dir:'',date:asOf,reason:rs,by,at:stamp()});e.mod=null;log(p,'Removed dose modification for '+e.drug+' week '+e.week+', by '+by+': '+rs)});closeModal();break}
  case'do-reset':mutate(()=>{if(e.origDate){const n=diff(e.origDate,e.date);e.date=e.origDate;if(e.end)e.end=add(e.end,n);e.origDate=null}e.state='scheduled';e.actualDate=null;e.reason='';log(p,'Reset '+e.drug+' week '+e.week+' to scheduled');e.postponed=false;e.auto=false;if(e.date<cairo())e.noAuto=true;restoreStatus(p)});closeModal();break;
  case'openpt':ui.patient=code;if(ui.view!=='patients')location.hash='patients';else render();window.scrollTo(0,0);break;
  case'back':ui.patient=null;render();break;
  case'pstatus':ui.pstatus=el.dataset.v;render();break;
  case'addpt':readPt.code=null;modal('<div class="mh"><div style="flex:1"><h3>Add new patient</h3><div class="sub">Enter what the record shows. Leave unknown fields blank; they are listed as review notes.</div></div>'+X+'</div><div class="mb"><div class="fgrid">'+ptFields(null)+phaseFields(TPL,'A-IND',true)+'</div><div class="note" id="f-tnote"></div><div class="prev" id="f-prev"></div><div class="err" id="f-err"></div></div><div class="mf"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="do-addpt">Register patient</button></div>','wide',m=>wirePreview(m,()=>({ageYears:m.querySelector('#f-agey').value===''?null:+m.querySelector('#f-agey').value,bsa:+m.querySelector('#f-bsa').value||null})));break;
  case'do-addpt':{const o=readPt(err);if(!o)return;const tid=val('f-tpl'),st=val('f-start');if(tid&&!st)return err('Choose the phase day 1.');
    mutate(()=>{const c='PT-'+Date.now().toString(36).toUpperCase();const flags=[];if(!o.mrn)flags.push('MRN not entered');if(!o.diagnosis)flags.push('Diagnosis not entered');if(!o.bsa)flags.push('BSA not entered: doses cannot be calculated');if(o.ageYears==null)flags.push('Age in years not entered: IT methotrexate dose cannot be set');if(!tid)flags.push('No treatment phase yet: add it once the current position is confirmed');
      const np=Object.assign({code:c,registered:asOf,status:'active',phases:[],events:[],history:[],protocolChanges:[],approval:val('f-apst')==='awaiting'?{state:'pending'}:{state:'approved',at:stamp()},verification:val('f-apst')==='awaiting'?{first:null,second:null}:{first:{by:lastBy()||'Confirmed at registration',at:stamp()},second:null},measurements:[],conflicts:[],modLog:[],postponements:[],checklist:newChecklist(flags),record:{source:'Entered manually',entries:[]}},o);
      if(np.bsa==null&&bsaActive()){const bb=bsaCalc(np.weight,np.height);if(bb){np.bsa=bb;np.bsaSource='Furqan and Haque from '+np.weight+' kg'}}else if(np.bsa!=null)np.bsaSource='Entered at registration';
      if(np.weight!=null||np.height!=null||np.bsa!=null){np.measurements.push({date:asOf,weight:np.weight,height:np.height,bsa:np.bsa,bsaMethod:np.bsaSource||'',source:'Registration'});if(np.weight!=null)np.weightAsOf=asOf;if(np.height!=null)np.heightAsOf=asOf;if(np.bsa!=null)np.bsaAsOf=asOf}
      if(tid){const b=buildPhase(c,tid,st,+val('f-cyc')||2);np.phases.push(b.phase);np.events=b.events}
      S.patients.push(np);log(np,'Registered manually'+(tid?' with '+TPLID[tid].label+', day 1 '+fy(st):' without a schedule'));ui.patient=c});
    closeModal();location.hash='patients';render();toast('Patient registered');break}
  case'editpt':readPt.code=p.code;modal('<div class="mh"><div style="flex:1"><h3>Edit patient</h3><div>'+whoH(p)+'</div><div class="sub">Changes apply everywhere: runway, calendar, approvals and email. Changing BSA or age recalculates every dose that has no physician-approved modification.</div></div>'+X+'</div><div class="mb"><div class="fgrid">'+ptFields(p)+'<label class="field">Status<select class="input" id="f-st">'+[['active','Confirmed'],['awaiting','Awaiting approval'],['delayed','Delayed'],['held','On hold'],['completed','Completed'],['off','Off protocol']].map(o=>'<option value="'+o[0]+'"'+((approved(p)?p.status:'awaiting')===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select></label><label class="field">Reason for the change (required)<input class="input" id="f-reason"></label><label class="field">Your name (required)<input class="input" id="f-by" value="'+esc(lastBy())+'"></label></div><div class="err" id="f-err"></div></div><div class="mf"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="do-editpt" data-p="'+esc(p.code)+'">Save changes to patient</button></div>','wide');break;
  case'do-editpt':{const o=readPt(err);if(!o)return;const rs=val('f-reason'),by=val('f-by');if(!rs)return err('Add the reason for the change.');if(!by)return err('Add your name.');const ns=val('f-st');setBy(by);
    mutate(()=>{if(ns==='awaiting'){if(approved(p))setAwaiting(p,by)}else{if(!approved(p))setConfirmed(p,by);if(ns!==p.status&&!(p.status==='delayed'&&ns==='active'&&p.events.some(x=>x.postponed&&x.state==='delayed'))){log(p,'Status '+p.status+' → '+ns+', by '+by);p.status=ns}}applyPatientUpdate(p,o,rs,by)});closeModal();toast('Patient updated');break}
  case'addphase':{const reg=curPh(p)?curPh(p).reg:null;const list=TPL.filter(t=>!reg||t.reg===reg);const last=curPh(p);const nxt=last?TPL[TPL.findIndex(t=>t.id===last.tpl)+1]:null;
    modal('<div class="mh"><div style="flex:1"><h3>Add next phase</h3><div>'+whoH(p)+'</div><div class="sub">'+(reg?'Phases of Regimen '+reg+'. To move to another regimen, use Change protocol.':'Choose the phase and its day 1.')+'</div></div>'+X+'</div><div class="mb"><div class="fgrid">'+phaseFields(list,nxt&&nxt.reg===reg?nxt.id:list[0].id,false)+'</div><div class="note" id="f-tnote"></div><div class="prev" id="f-prev"></div><div class="err" id="f-err"></div></div><div class="mf"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="do-addphase" data-p="'+esc(p.code)+'">Add phase</button></div>','wide',m=>wirePreview(m,()=>p));break}
  case'do-addphase':{const st=val('f-start'),tid=val('f-tpl');if(!st)return err('Choose day 1.');mutate(()=>{const b=buildPhase(p.code,tid,st,+val('f-cyc')||2);p.phases.push(b.phase);p.events.push(...b.events);p.events.sort((x,y)=>x.date.localeCompare(y.date));revokeIfApproved(p,'new phase added');log(p,'Added '+b.phase.label+', day 1 '+fy(st))});closeModal();toast('Phase added');break}
  case'chproto':{const reg=curPh(p)?curPh(p).reg:null;const list=TPL.filter(t=>t.reg!==reg);
    modal('<div class="mh"><div style="flex:1"><h3>Change protocol</h3><div>'+whoH(p)+'</div><div class="sub">Current: '+esc(regOf(p))+', '+esc(curPhase(p))+'. Every scheduled dose of the current protocol on or after the change date stops.</div></div>'+X+'</div><div class="mb"><div class="fgrid"><label class="field">Date of protocol change<input type="date" class="input" id="f-chg" value="'+asOf+'"></label><label class="field">Reason (required)<input class="input" id="f-reason" placeholder="e.g. day 29 MRD high, moved to Regimen C"></label>'+phaseFields(list,list[0].id,false)+'</div><div class="note" id="f-tnote"></div><div class="prev" id="f-prev"></div><div class="err" id="f-err"></div></div><div class="mf"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="do-chproto" data-p="'+esc(p.code)+'">Change protocol</button></div>','wide',m=>wirePreview(m,()=>p));break}
  case'do-chproto':{const cd=val('f-chg'),rs=val('f-reason'),st=val('f-start'),tid=val('f-tpl');if(!cd||!st)return err('Enter the change date and the new day 1.');if(!rs)return err('Add the reason for the change.');
    mutate(()=>{const from=curPh(p)?'Regimen '+curPh(p).reg+' ('+curPh(p).label.replace(/^Regimen .: /,'')+')':(p.protocol||'Not set');
      const n=stopFrom(p,cd,'Stopped: protocol changed on '+fy(cd));p.phases.forEach(ph=>{if(!ph.superseded)ph.superseded=cd});
      const b=buildPhase(p.code,tid,st,+val('f-cyc')||2);p.phases.push(b.phase);p.events.push(...b.events);p.events.sort((x,y)=>x.date.localeCompare(y.date));
      const to='Regimen '+b.phase.reg+' ('+b.phase.label.replace(/^Regimen .: /,'')+')';p.protocol='UKALL 2011 Regimen '+b.phase.reg;
      p.protocolChanges.push({date:cd,from,to,reason:rs,stopped:n,newStart:st});revokeIfApproved(p,'protocol changed');
      log(p,'Protocol changed on '+fy(cd)+': '+from+' → '+to+' ('+rs+'); '+n+' future doses of the previous protocol stopped')});closeModal();toast('Protocol changed');break}
  case'editphase':{const ph=p.phases.find(x=>x.id===el.dataset.ph);modal('<div class="mh"><div style="flex:1"><h3>Edit '+esc(ph.label)+'</h3><div>'+whoH(p)+'</div><div class="sub">Moving day 1 moves every dose in this phase that is not yet given, held or documented.</div></div>'+X+'</div><div class="mb"><div class="fgrid"><label class="field">New day 1<input type="date" class="input" id="f-start" value="'+ph.start+'"></label><label class="field">Reason (required)<input class="input" id="f-reason"></label></div><div class="err" id="f-err"></div></div><div class="mf"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="do-editphase" data-p="'+esc(p.code)+'" data-ph="'+ph.id+'">Save phase</button></div>');break}
  case'do-editphase':{const st=val('f-start'),rs=val('f-reason');if(!st)return err('Choose day 1.');if(!rs)return err('Add the reason.');mutate(()=>{const ph=p.phases.find(x=>x.id===el.dataset.ph);const n=diff(st,ph.start);let k=0;p.events.forEach(x=>{if(x.phaseId===ph.id&&live(x)){if(!x.origDate)x.origDate=x.date;x.date=add(x.date,n);if(x.end)x.end=add(x.end,n);k++}});ph.start=st;p.events.sort((x,y)=>x.date.localeCompare(y.date));revokeIfApproved(p,'phase dates changed');log(p,'Moved '+ph.label+' day 1 to '+fy(st)+' ('+rs+'); '+k+' doses moved by '+n+' days')});closeModal();toast('Phase updated');break}
  case'delphase':{const ph=p.phases.find(x=>x.id===el.dataset.ph);modal('<div class="mh"><h3 style="flex:1">Remove '+esc(ph.label)+'?</h3></div><div class="mb"><p style="margin:0">This removes every dose in the phase and its pending reminders. History stays.</p></div><div class="mf"><button class="btn" data-act="close">Keep phase</button><button class="btn pri" data-act="do-delphase" data-p="'+esc(p.code)+'" data-ph="'+ph.id+'">Remove phase</button></div>');break}
  case'do-delphase':mutate(()=>{const ph=p.phases.find(x=>x.id===el.dataset.ph);p.phases=p.phases.filter(x=>x!==ph);p.events=p.events.filter(x=>x.phaseId!==ph.id);log(p,'Removed '+ph.label)});closeModal();break;
  case'delpt':modal('<div class="mh"><h3 style="flex:1">Delete patient?</h3></div><div class="mb"><div>'+whoH(p)+'</div><p>This removes the patient, every scheduled dose and pending reminder. Type DELETE to confirm.</p><input class="input" id="f-conf" autocomplete="off"><div class="err" id="f-err"></div></div><div class="mf"><button class="btn" data-act="close">Keep patient</button><button class="btn pri" data-act="do-delpt" data-p="'+esc(p.code)+'">Delete patient</button></div>');break;
  case'do-delpt':if(val('f-conf').toUpperCase()!=='DELETE')return err('Type DELETE to confirm.');mutate(()=>{S.patients=S.patients.filter(x=>x!==p);S.audit.push({at:stamp(),patient:p.code,text:'Deleted patient '+(p.name||'')});dirty++});ui.patient=null;closeModal();render();break;
  case'verify1':{const inp=document.getElementById('v1-'+code);const by=inp&&inp.value.trim();if(!by){toast('Enter the approver’s name');return}if(p.checklist.some(c=>!c.done)){toast('Tick every checklist item first');return}setBy(by);
    mutate(()=>{p.verification={first:{by,at:stamp()},second:null};p.approval={state:'approved',at:p.verification.first.at};log(p,'Approved by '+by+' ('+p.checklist.length+' checklist items ticked); reminders active')});toast('Patient approved');break}
  case'undofirst':mutate(()=>{p.verification={first:null,second:null};log(p,'First verification undone')});break;
  case'verify2':{const k=code;const g=id2=>{const x=document.getElementById(id2);return x?x.value.trim():''};const errs=[];const v1=p.verification.first;const ns=nextDoseSet(p);
    const by=g('v2n-'+k);if(!by)errs.push('Enter the second reviewer’s name.');else if(v1&&!v1.legacy&&by.toLowerCase()===String(v1.by).trim().toLowerCase())errs.push('The second reviewer must be a different person from the first reviewer.');
    if(!p.mrn)errs.push('The record has no MRN, so identity cannot be verified. Add the MRN first.');else if(g('v2m-'+k).toLowerCase()!==String(p.mrn).toLowerCase())errs.push('MRN does not match the record.');
    if(!(Math.abs((parseFloat(g('v2b-'+k))||0)-(p.bsa||-1))<0.006))errs.push('BSA does not match the BSA used for dosing.');
    const cur=curPh(p);if(!cur||g('v2p-'+k)!==cur.tpl)errs.push('Protocol and phase do not match the current schedule.');
    if(!ns)errs.push('No scheduled dose to verify.');else{if(g('v2d-'+k)!==ns.date)errs.push('Next treatment date does not match the schedule.');
      ns.events.forEach((e2,i)=>{const c=calc(e2,p);const typed=parseFloat(g('v2x-'+k+'-'+i));if(c.miss)errs.push(e2.drug+': the system cannot calculate this dose ('+c.miss.toLowerCase()+').');else if(!(typed>=0)||Math.abs(typed-c.v)>Math.max(0.01,c.v*0.01))errs.push(e2.drug+': your dose does not match the system calculation (±1%). If the prescription differs, record it with Enter prescribed dose and review the discrepancy.');if(discOpen(e2,p))errs.push(e2.drug+': has an unreviewed dose discrepancy.')})}
    if(!document.getElementById('v2c1-'+k).checked||!document.getElementById('v2c2-'+k).checked)errs.push('Tick both confirmations.');
    if(errs.length){const box=document.getElementById('v2e-'+k);if(box)box.innerHTML=errs.map(esc).join('<br>');return}
    setBy(by);mutate(()=>{p.verification.second={by,at:stamp(),checked:{mrn:true,bsa:p.bsa,tpl:cur.tpl,date:ns.date,drugs:ns.events.map(e2=>e2.drug)}};p.approval={state:'approved',at:p.verification.second.at};
      log(p,'Independent second verification by '+by+' (identity, protocol, '+ns.events.map(e2=>e2.drug).join(', ')+' doses and '+fy(ns.date)+' schedule); final approval. First reviewer: '+p.verification.first.by)});toast('Final approval recorded');break}
  case'revoke':mutate(()=>{p.verification={first:null,second:null};p.approval={state:'pending'};log(p,'Final approval revoked')});break;
  case'addmeas':modal('<div class="mh"><div style="flex:1"><h3>Record weight / height</h3><div>'+whoH(p)+'</div><div class="sub">Adds a dated entry. Earlier values stay in the history. '+(bsaActive()?'BSA is recalculated from the weight with the Furqan and Haque formula unless you enter a confirmed BSA.':'The Furqan and Haque formula is not configured, so BSA is not recalculated; enter a confirmed BSA if you have one.')+'</div></div>'+X+'</div><div class="mb"><div class="fgrid"><label class="field">Date measured<input type="date" class="input" id="f-mdate" value="'+asOf+'"></label><label class="field">Weight (kg)<input type="number" step="0.1" class="input" id="f-wt" value="'+(p.weight||'')+'"></label><label class="field">Height (cm)<input type="number" step="0.1" class="input" id="f-ht" value="'+(p.height||'')+'"></label><label class="field">Confirmed BSA (m², optional)<input type="number" step="0.01" class="input" id="f-bsa"></label><label class="field">Source<input class="input" id="f-src" placeholder="e.g. clinic scale, nursing chart"></label><label class="field">Your name (required)<input class="input" id="f-by" value="'+esc(lastBy())+'"></label></div><div class="err" id="f-err"></div></div><div class="mf"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="do-addmeas" data-p="'+esc(p.code)+'">Save measurement</button></div>');break;
  case'do-addmeas':{const dt=val('f-mdate'),wt=val('f-wt'),ht=val('f-ht'),bs=val('f-bsa'),by=val('f-by');if(!dt||!by)return err('Add the date and your name.');if(wt===''&&ht===''&&bs==='')return err('Enter at least one value.');setBy(by);
    mutate(()=>{const W=wt===''?null:+wt,H=ht===''?null:+ht;const conflict=p.measurements.find(m=>m.date===dt&&((W!=null&&m.weight!=null&&m.weight!==W)||(H!=null&&m.height!=null&&m.height!==H)));
      const latest=!p.weightAsOf||!/^\d{4}/.test(p.weightAsOf)||dt>=p.weightAsOf;let B=bs===''?null:+bs,meth=B!=null?'Manual (confirmed)':'';
      if(B==null&&bsaActive()){const b=bsaCalc(W!=null?W:p.weight,H!=null?H:p.height);if(b){B=b;meth='Furqan and Haque'}}
      p.measurements.push({date:dt,weight:W,height:H,bsa:B,bsaMethod:meth,source:(val('f-src')||'Entered')+', by '+by});
      if(latest){if(W!=null){p.weight=W;p.weightAsOf=dt}if(H!=null){p.height=H;p.heightAsOf=dt}if(B!=null){p.bsa=B;p.bsaAsOf=dt;p.bsaSource=meth}}
      if(conflict)p.conflicts.push({kind:'measure',text:'Two different measurements are recorded for '+fy(dt)+' ('+conflict.weight+' vs '+W+' kg). Confirm which is right.',at:stamp()});
      if(!latest)p.conflicts.push({kind:'measure',text:'A measurement dated '+fy(dt)+' was added after a newer one; current values were not changed.',at:stamp()});
      if(p.bsaAsOf&&p.weightAsOf&&/^\d{4}/.test(p.bsaAsOf)&&p.bsaAsOf<p.weightAsOf&&!p.conflicts.some(c=>!c.resolved&&c.kind==='stalebsa'))p.conflicts.push({kind:'stalebsa',text:'BSA ('+p.bsa+' m², '+fy(p.bsaAsOf)+') is older than the latest weight ('+p.weight+' kg, '+fy(p.weightAsOf)+'). Confirm the BSA before dosing.',at:stamp()});
      if(latest&&B!=null)p.conflicts.forEach(c=>{if(c.kind==='stalebsa'&&!c.resolved){c.resolved=true;c.resolution='BSA updated '+fy(dt)}});
      if(latest&&(W!=null||B!=null)){p.events.forEach(x=>{if(live(x))x.verified=false});revokeIfApproved(p,'new measurement')}
      log(p,'Measurement '+fy(dt)+': '+[W!=null?W+' kg':'',H!=null?H+' cm':'',B!=null?'BSA '+B+' ('+meth+')':''].filter(Boolean).join(', ')+', by '+by)});closeModal();toast('Measurement saved');break}
  case'resolveconf':{const c=p.conflicts[+el.dataset.i];modal('<div class="mh"><h3 style="flex:1">Resolve data conflict</h3>'+X+'</div><div class="mb"><p class="small" style="margin-top:0">'+esc(c.text)+'</p><div class="fgrid"><label class="field full">How it was resolved (required)<input class="input" id="f-reason"></label><label class="field">Your name (required)<input class="input" id="f-by" value="'+esc(lastBy())+'"></label></div><div class="err" id="f-err"></div></div><div class="mf"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="do-resolveconf" data-p="'+esc(p.code)+'" data-i="'+el.dataset.i+'">Mark resolved</button></div>');break}
  case'do-resolveconf':{const rs=val('f-reason'),by=val('f-by');if(!rs||!by)return err('Add the resolution and your name.');mutate(()=>{const c=p.conflicts[+el.dataset.i];c.resolved=true;c.resolution=rs;c.by=by;log(p,'Conflict resolved by '+by+': '+c.text+' → '+rs)});closeModal();break}
  case'stock':{let by='';try{by=(document.getElementById('pharmby')||{}).value||'';localStorage.setItem('chemo-pharm-by',by)}catch(x){}
    mutate(()=>{const it=S.stock[el.dataset.pr][el.dataset.dr];const old=it.state;it.state=el.dataset.v;it.at=stamp();it.by=by;S.audit.push({at:it.at,patient:null,text:'Stock: '+el.dataset.dr+' ('+el.dataset.pr+') '+old+' → '+it.state+(by?', by '+by:'')});dirty++});break}
  case'saveform':{const d=el.dataset.dr,k=d.replace(/\W/g,'');const g=i=>document.getElementById(i);const cv=g('fc-'+k).value.trim();const na=g('fn-'+k).checked;
    if(cv!==''&&!(+cv>0)){toast('Concentration must be above zero');return}if(cv!==''&&!g('fs-'+k).value.trim()){toast('Add the source of the concentration');return}
    let by='';try{by=(document.getElementById('pharmby')||{}).value||lastBy()}catch(x){}
    mutate(()=>{const f=S.formulary[d];const old=f.conc;f.conc=cv===''?null:+cv;f.unit=g('fu-'+k).value;f.form=g('ff-'+k).value.trim();f.na=na;f.source=g('fs-'+k).value.trim();f.at=stamp();f.by=by;S.audit.push({at:f.at,patient:null,text:'Concentration for '+d+': '+(old==null?'not set':old)+' → '+(f.conc==null?'not set':f.conc+' '+f.unit)+(na?' (oral solid, no mL)':'')+(f.source?', source '+f.source:'')+(by?', by '+by:'')});dirty++});toast('Saved');break}
  case'savebsa':{const ex=val('bf-expr'),src=val('bf-src'),by=val('bf-by'),ok=document.getElementById('bf-ok').checked;const be=t=>{const x=document.getElementById('bf-err');if(x)x.textContent=t};
    if(!ex||!src||!by)return be('Enter the expression, its published source and who verified it.');if(!ok)return be('Confirm you checked the expression against the published source.');
    try{const t=bsaEval(ex,16,100);if(!(t>0&&t<3))return be('The test result ('+r2(t)+' m² for 16 kg, 100 cm) is outside a plausible range; check the expression.')}catch(x){return be('The expression could not be read. Use W, H, numbers and + - * / ^ ( ) sqrt( ).')}
    mutate(()=>{S.settings.bsaFormula={expr:ex,source:src,by,at:stamp(),verified:true};S.audit.push({at:stamp(),patient:null,text:'BSA formula (Furqan and Haque) saved: '+ex+'; source '+src+'; verified by '+by});dirty++});toast('Formula saved. Existing BSAs are unchanged until a new measurement is recorded.');break}
  case'clearbsa':mutate(()=>{S.settings.bsaFormula={expr:'',source:'',by:'',at:'',verified:false};S.audit.push({at:stamp(),patient:null,text:'BSA formula removed'});dirty++});break;
  case'calmode':ui.calMode=el.dataset.v;render();break;
  case'saveconc':{const by=val('cc-by'),src=val('cc-src');const ce=t=>{const x=document.getElementById('cc-err');if(x)x.textContent=t};if(!by)return ce('Add your name.');const ch=[];let bad='';
    Object.keys(CLS).forEach(d=>{const k=d.replace(/\W/g,'');const ci=document.getElementById('cc-'+k);if(!ci)return;const v=ci.value.trim();const na=!!(document.getElementById('cn-'+k)||{}).checked;const form=(document.getElementById('cf-'+k)||{value:''}).value.trim();
      if(v!==''&&!(+v>0))bad=d+': concentration must be above zero.';const f=S.formulary[d]||(S.formulary[d]={});const nc=v===''?null:+v;
      if(nc!==(f.conc==null?null:f.conc)||na!==!!f.na||form!==(f.form||''))ch.push([d,f.conc,nc,na,form])});
    if(bad)return ce(bad);if(!ch.length)return ce('Nothing changed.');setBy(by);
    mutate(()=>{ch.forEach(([d,o,n,na,form])=>{const f=S.formulary[d];f.conc=n;f.unit=CUNIT(d);f.na=na;f.form=form;f.source=src||f.source||'';f.by=by;f.at=stamp();S.audit.push({at:f.at,patient:null,text:'Concentration for '+d+': '+(o==null?'not set':o+' '+CUNIT(d))+' → '+(na?'tablets (no mL)':n==null?'not set':n+' '+CUNIT(d))+(form?', '+form:'')+(src?', source '+src:'')+', by '+by});dirty++})});toast(ch.length+' concentration'+(ch.length>1?'s':'')+' saved; mL updated everywhere');break}
  case'rmday':ui.rmSel=el.dataset.d;render();break;
  case'showall':ui.showAll[el.dataset.ph]=true;render();break;
  case'rmnav':{const v=+el.dataset.v;ui.rmStart=v===0?null:add(ui.rmStart||asOf,v);ui.rmSel=v===0?asOf:ui.rmStart;render();break}
  case'rmpt':ui.rmPt=el.dataset.v;render();break;
  case'marprint':document.body.classList.add('printmar');setTimeout(()=>{try{window.print()}catch(x){}document.body.classList.remove('printmar')},50);break;
  case'marcsv':{const f=ui.mar;const xs=marRows(f.from||asOf,f.to||add(asOf,RUN()),f.pt||'all',f.oral);const csv='Date,Patient name,BSA (m2),Week of treatment,Drug name,Dose in mg,Dose in mL,Status\n'+xs.map(x=>{const c=calc(x.e,x.p);const v=c.miss?null:vol(x.e,x.p,c);return[x.e.date,x.p.name||x.p.code,x.p.bsa||'',x.e.week,lbl(x.e),c.miss?c.miss:c.v+' '+c.u,v&&v.ml!=null?v.ml:'',x.e.state==='administered'?'Given':x.e.postponed?'Postponed':'Scheduled'].map(q).join(',')}).join('\n');dl('MAR-'+(f.from||asOf)+'.csv','\ufeff'+csv);break}
  case'editmode':ui.editK=el.dataset.k;render();{const f=document.querySelector('.edittable input,#mail-edit,.edittable select');if(f)f.focus()}break;
  case'editcancel':ui.editK=null;render();break;
  case'saveph':case'saverec':case'savemeas':case'savechk':case'savepr':{const rs=val('eb-reason'),by=val('eb-by');const eb=t=>{const x=document.getElementById('eb-err');if(x)x.textContent=t};if(!rs||!by)return eb('Add the reason and your name.');setBy(by);const g=id2=>{const x=document.getElementById(id2);return x?(x.type==='checkbox'?x.checked:x.value.trim()):null};const tag=' ('+rs+'), by '+by;
    if(a==='saveph'){const ph=p.phases.find(x=>x.id===el.dataset.ph);const ch=[];let bad='';
      p.events.filter(e=>e.phaseId===ph.id).forEach(e=>{const k=e.id;const d=g('pe-d-'+k),w=parseInt(g('pe-w-'+k),10);if(!ISO(d))bad='Each dose needs a valid date.';if(!(w>0&&w<=200))bad='Weeks must be between 1 and 200.'});if(bad)return eb(bad);
      mutate(()=>{p.events.filter(e=>e.phaseId===ph.id).forEach(e=>{const k=e.id;const c=[];const d=g('pe-d-'+k),w=parseInt(g('pe-w-'+k),10),r=g('pe-r-'+k),n=g('pe-n-'+k),st=g('pe-s-'+k);
        if(d!==e.date){const nn=diff(d,e.date);if(!e.origDate)e.origDate=e.date;e.date=d;if(e.end)e.end=add(e.end,nn);c.push('date → '+fy(d))}
        if(w!==e.week){c.push('week '+e.week+' → '+w);e.week=w}if(r!==e.route){c.push('route → '+r);e.route=r}if(n!==e.note){c.push('note');e.note=n}
        if(st&&st!==e.state&&e.state!=='superseded'){c.push('status '+(STATE[e.state]||[e.state])[0]+' → '+(STATE[st]||[st])[0]);e.auto=false;
          if(st==='administered'){e.actualDate=e.actualDate||e.date}else if(st==='scheduled'){e.actualDate=null;e.postponed=false;if(e.date<cairo())e.noAuto=true}else{e.noAuto=true;e.reason=rs}e.state=st}
        if(c.length)ch.push(e.drug+' wk '+e.week+': '+c.join(', '))});
        p.events.sort((x,y)=>x.date.localeCompare(y.date));restoreStatus(p);log(p,'Edited '+ph.label+' doses'+tag+': '+(ch.join('; ')||'no change'))})}
    if(a==='saverec'){const es=p.record.entries;const out=[];let nch=0;
      es.concat([{}]).forEach((r,i)=>{const isNew=i===es.length;if(!isNew&&g('rs-x-'+i)){nch++;return}const o={wk:g('rs-wk-'+i),date:g('rs-dt-'+i),med:g('rs-md-'+i),dose:g('rs-ds-'+i),note:g('rs-nt-'+i),unclear:!!g('rs-un-'+i)};if(isNew&&!(o.wk||o.date||o.med||o.dose))return;if(isNew||JSON.stringify(o)!==JSON.stringify({wk:r.wk,date:r.date,med:r.med,dose:r.dose,note:r.note||'',unclear:!!r.unclear}))nch++;out.push(o)});
      mutate(()=>{p.record.entries=out;log(p,'Edited record sheet table'+tag+': '+nch+' row change'+(nch===1?'':'s'))})}
    if(a==='savemeas'){const ms=p.measurements;const out=[];let nch=0;
      ms.concat([{}]).forEach((m,i)=>{const isNew=i===ms.length;if(!isNew&&g('ms-x-'+i)){nch++;return}const dt=g('ms-dt-'+i),wv=g('ms-w-'+i),hv=g('ms-h-'+i),bv=g('ms-b-'+i);if(isNew&&!dt&&!wv&&!hv&&!bv)return;
        const o={weight:wv===''?null:+wv,height:hv===''?null:+hv,bsa:bv===''?null:+bv,bsaMethod:m.bsaMethod||'',source:g('ms-s-'+i)||''};if(ISO(dt))o.date=dt;else o.label=dt;
        if(isNew||o.weight!==(m.weight==null?null:m.weight)||o.height!==(m.height==null?null:m.height)||o.bsa!==(m.bsa==null?null:m.bsa)||o.source!==(m.source||'')||dt!==(m.date||m.label||''))nch++;out.push(o)});
      mutate(()=>{p.measurements=out;log(p,'Edited measurement history'+tag+': '+nch+' row change'+(nch===1?'':'s'))})}
    if(a==='savechk'){const cl=p.checklist;let reword=false;const out=[];
      cl.forEach((c,i)=>{if(g('ck-x-'+i))return;const t=g('ck-t-'+i);if(t!==c.text){reword=true;out.push(Object.assign({},c,{text:t,done:false}))}else out.push(c)});const nw=g('ck-new');if(nw){out.push({text:nw,done:false,kind:'flag'});reword=true}
      mutate(()=>{const n0=cl.length;p.checklist=out;log(p,'Edited approval checklist'+tag+': '+n0+' → '+out.length+' items'+(reword?', wording changed':''))})}
    if(a==='savepr'){const pr=S.protocols.find(x=>x.id===el.dataset.id);const out=[];pr.rows.concat([['','','','']]).forEach((r,i)=>{if(i<pr.rows.length&&g('pr-x-'+i))return;const row=[0,1,2,3].map(j=>g('pr-'+j+'-'+i));if(!row[0])return;out.push(row)});
      if(!out.length)return eb('A protocol needs at least one drug.');
      mutate(()=>{const before=pr.rows.length;pr.rows=out;pr.who=g('pr-who');pr.support=g('pr-sup');pr.labs=g('pr-lab');if(!S.stock[pr.id])S.stock[pr.id]={};out.forEach(r=>{if(!S.stock[pr.id][r[0]])S.stock[pr.id][r[0]]={state:'unverified',note:'',by:'',at:''}});
        S.audit.push({at:stamp(),patient:null,text:'Edited protocol '+protoName(pr.id)+tag+': '+before+' → '+out.length+' drug rows'});dirty++})}
    ui.editK=null;render();toast('Section saved');break}
  case'savemail':{const t=document.getElementById('mail-edit').value;const by=lastBy();mutate(()=>{if(!S.mailEdits)S.mailEdits={};S.mailEdits[el.dataset.d]={text:t,by,at:stamp()};S.audit.push({at:stamp(),patient:null,text:'Edited reminder email text for '+fy(add(el.dataset.d,lead()))+(by?', by '+by:'')});dirty++});ui.editK=null;render();break}
  case'mailrevert':mutate(()=>{delete S.mailEdits[el.dataset.d];S.audit.push({at:stamp(),patient:null,text:'Reminder email text for '+fy(add(el.dataset.d,lead()))+' returned to the generated version'});dirty++});break;
  case'toggleauto':mutate(()=>{S.settings.autoConfirmPast=S.settings.autoConfirmPast===false;S.audit.push({at:stamp(),patient:null,text:'Default confirmation of past doses turned '+(S.settings.autoConfirmPast?'on':'off')});dirty++;if(S.settings.autoConfirmPast)autoConfirm(S,cairo())});break;
  case'sfclear':ui.sf={};ui.gq='';render();break;
  case'ai':AI.open=!AI.open;renderAI();if(AI.open)setTimeout(()=>{const t=document.getElementById('ai-in');if(t)t.focus()},30);break;
  case'aisend':aiSend();break;
  case'aistop':if(AI.ctl)AI.ctl.abort();break;
  case'aiapply':aiApply();break;
  case'aidiscard':AI.proposal=null;AI.msgs.push({role:'assistant',text:'Discarded. Nothing was changed.'});renderAI();break;
  case'addchk':{const inp=document.querySelector('[data-newchk="'+CSS.escape(code)+'"]');const t=inp&&inp.value.trim();if(!t)return;mutate(()=>{p.checklist.push({text:t,done:false,kind:'flag'});log(p,'Added check item: '+t)});break}
  case'selall':metrics().wait.forEach(x=>ui.sel[x.e.id]=true);render();break;
  case'selpt':p.events.filter(awaiting).forEach(x=>ui.sel[x.id]=true);render();break;
  case'confirmsel':{const xs=metrics().wait.filter(x=>ui.sel[x.e.id]&&!discOpen(x.e,x.p));if(!xs.length){toast('Select at least one dose');return}
    mutate(()=>{xs.forEach(x=>{x.e.actualDate=x.e.actualDate||x.e.date;x.e.state='administered';log(x.p,'Confirmed '+x.e.drug+' week '+x.e.week+' given on '+fy(x.e.actualDate)+' (confirmation checklist)')})});ui.sel={};render();toast(xs.length+' dose'+(xs.length>1?'s':'')+' confirmed');break}
  case'calnav':{const v=+el.dataset.v;if(v===0)ui.calMonth=asOf.slice(0,7);else{const[y,m]=ui.calMonth.split('-').map(Number);ui.calMonth=iso(new Date(Date.UTC(y,m-1+v,1))).slice(0,7)}render();break}
  case'calday':ui.calSel=el.dataset.d;render();break;
  case'calcls':ui.calCls=el.dataset.v;render();break;
  case'reg':ui.reg=el.dataset.v;render();break;
  case'review':mutate(()=>{const pr=S.protocols.find(x=>x.id===el.dataset.id);pr.reviewed=!pr.reviewed;S.audit.push({at:stamp(),patient:null,text:(pr.reviewed?'Marked reviewed: ':'Reopened: ')+'Regimen '+pr.regimen+' '+pr.phase});dirty++});break;
  case'emailday':ui.emailDate=el.dataset.d;render();break;
  case'copymail':{const sd=ui.emailDate||asOf;const b=emailText(sd);copy('Subject: '+b.subject+'\n\n'+mailText(sd));break}
  case'dlmail':{const sd=ui.emailDate||asOf;const b=emailText(sd);dl('chemo-reminders-'+add(sd,lead())+'.txt','Subject: '+b.subject+'\n\n'+mailText(sd));break}
  case'marksent':{const sd=el.dataset.d;const xs=emailItems(sd).filter(x=>!sentFor(x.e));mutate(()=>{xs.forEach(x=>S.sent_log.push({eventId:x.e.id,patient:x.p.code,drug:x.e.drug,date:x.e.date,sentOn:sd,method:'manual'}));S.audit.push({at:stamp(),patient:null,text:'Marked email for '+fy(add(sd,lead()))+' as sent ('+xs.length+' items)'});dirty++});toast('Marked as sent');break}
  case'unsend':{const tg=add(el.dataset.d,lead());mutate(()=>{S.sent_log=S.sent_log.filter(s=>!(s.date===tg&&s.method==='manual'));S.audit.push({at:stamp(),patient:null,text:'Undid sent mark for '+fy(tg)});dirty++});break}
  case'unlog':mutate(()=>{S.sent_log=S.sent_log.filter(s=>!(s.eventId===el.dataset.id&&s.date===el.dataset.d));S.audit.push({at:stamp(),patient:null,text:'Removed a reminder log entry for '+fy(el.dataset.d)});dirty++});break;
  case'logtab':ui.logTab=el.dataset.v;render();break;
  case'exportcsv':{const nm=c=>{const p=pt(c);return p?(p.name||c):c};let csv;if(ui.logTab==='audit')csv='When,Patient,Change\n'+S.audit.map(a=>[a.at,a.patient?nm(a.patient):'',a.text].map(q).join(',')).join('\n');else csv='Sent on,Patient,MRN,Drug,For treatment,How\n'+S.sent_log.map(s=>{const p=pt(s.patient);return[s.sentOn,nm(s.patient),p&&p.mrn||'',s.drug,s.date,s.method==='gmail'?'Gmail confirmed':'Marked sent'].map(q).join(',')}).join('\n');dl((ui.logTab==='audit'?'change-history':'reminder-log')+'-'+asOf+'.csv','\ufeff'+csv);break}
  case'exportjson':dl('chemo-board-'+asOf+'.json',JSON.stringify(S,null,1));break;
  case'copyjson':copy(JSON.stringify(S));break;
  case'resetdemo':modal('<div class="mh"><h3 style="flex:1">Reset to the sample records?</h3></div><div class="mb"><p style="margin:0">This replaces every patient, approval, reminder and answer with the fictional sample records. Export your data first if you need it.</p></div><div class="mf"><button class="btn" data-act="close">Keep my data</button><button class="btn pri" data-act="do-reset-demo">Reset</button></div>');break;
  case'do-reset-demo':mutate(()=>{const d=hydrate(clone(DEMO));d.rev=S.rev;d.savedAt=S.savedAt;S=d;dirty++});ui.patient=null;closeModal();break;
  case'discard':S=clone(saved);dirty=0;pendingWrite=null;render();toast('Changes discarded');break;
  case'shared-load':loadFromButton();break;
  case'shared-signout':signOut();break;
  case'assistant-info':modal('<div class="mh"><h3 style="flex:1">Dashboard assistant</h3></div><div class="mb"><p>The original assistant uses Claude. It requires a separate integration on this site.</p></div><div class="mf"><button class="btn" data-act="close">Close</button></div>');break;
  case'save':saveAll();break;
  }
}
const q=s=>'"'+String(s).replace(/"/g,'""')+'"';
async function copy(t){try{await navigator.clipboard.writeText(t);toast('Copied')}catch(e){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy')}catch(x){}ta.remove();toast(ok?'Copied':'Copy is blocked here; select the text instead')}}
async function dl(name,data){if(!DL){toast('Downloads are not available in this view');return}try{await DL.save({filename:name,data})}catch(e){if(e&&e.code!=='cancelled'&&e.code!=='declined')toast('Download did not start')}}

/* ---------- shared board ---------- */
function renderSignIn(){
  const root=document.getElementById('root');
  const assistant=document.getElementById('aipanel');
  if(assistant)assistant.innerHTML='';
  const fields=shared.configured?'<form id="shared-signin"><label class="field">Email<input class="input" type="email" name="email" autocomplete="username" required></label>'+
    '<label class="field">Password<input class="input" type="password" name="password" autocomplete="current-password" required></label>'+
    '<button class="btn pri" type="submit"'+(busy?' disabled':'')+'>'+(busy?'Connecting…':'Sign in')+'</button></form>':
    '<p>Complete the shared storage setup in the README to enable sign-in.</p>';
  root.innerHTML='<main class="shared-login panel pad"><h1>Hematology chemotherapy board</h1>'+
    '<p>Shared demo for approved accounts. Use fictional records only.</p>'+fields+
    '<p id="shared-message" class="sub" role="status">'+esc(sharedNotice)+'</p></main>';
}
async function loadShared(){
  const result=await shared.load();
  if(result?.status==='forbidden')throw Object.assign(new Error('Access denied'),{status:403});
  if(result?.status!=='ok'||!Number.isInteger(result.revision))throw new Error('Board unavailable');
  const board=readBoard(result.state??clone(DEMO));
  autoConfirm(board,cairo());
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
    saved=hydrate(clone(DEMO));S=clone(saved);ui.patient=null;
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

function importBoard(file){
  const reader=new FileReader();
  reader.onload=()=>{
    if(!canWrite||busy)return;
    const previous=S, previousDirty=dirty, previousWrite=pendingWrite;
    try{
      const incoming=readBoard(JSON.parse(reader.result));
      incoming.rev=saved.rev;
      incoming.savedAt=saved.savedAt;
      incoming.audit.push({at:stamp(),patient:null,text:'Imported data from '+file.name});
      S=incoming;dirty++;pendingWrite=null;
      render();
      toast('Data imported. Select Save changes to update the shared board.');
    }catch(e){
      S=previous;dirty=previousDirty;pendingWrite=previousWrite;
      render();toast('That file is not a valid board export');
    }
  };
  reader.onerror=()=>toast('Could not read the selected file');
  reader.readAsText(file);
}

/* ---------- events ---------- */
document.addEventListener('click',ev=>{
  if(!canWrite||busy)return;
  const nav=ev.target.closest('a[href^="#"]');if(nav&&nav.getAttribute('href')===(location.hash||'#overview')){ev.preventDefault();ui.patient=null;closeModal();render();window.scrollTo(0,0);return}
  const el=ev.target.closest('[data-act]');if(!el)return;
  const a=el.dataset.act;if(a==='flag'||a==='chk'||a==='seldose'||a==='answer')return;
  if(a==='scrim'&&ev.target!==el)return;
  if(el.tagName==='A')return;
  ev.preventDefault();doAct(a,el);
});
document.addEventListener('change',ev=>{
  if(!canWrite||busy)return;
  const t=ev.target;const a=t.dataset&&t.dataset.act;
  if(a==='flag')mutate(()=>{const pr=S.protocols.find(x=>x.id===t.dataset.id);const f=pr.flags[+t.dataset.i];f.resolved=t.checked;S.audit.push({at:stamp(),patient:null,text:(f.resolved?'Resolved: ':'Reopened: ')+f.text});dirty++});
  else if(a==='chk')mutate(()=>{const p=pt(t.dataset.p);const c=p.checklist[+t.dataset.i];c.done=t.checked;if(!c.done&&(p.verification.first||p.verification.second)){p.verification={first:null,second:null};p.approval={state:'pending'}}log(p,(c.done?'Checked: ':'Unchecked: ')+c.text)});
  else if(a==='seldose'){ui.sel[t.dataset.e]=t.checked}
  else if(a==='answer')mutate(()=>{const pr=S.protocols.find(x=>x.id===t.dataset.id);pr.flags[+t.dataset.i].answer=t.value;S.audit.push({at:stamp(),patient:null,text:'Answered: '+pr.flags[+t.dataset.i].text});dirty++});
  else if(/^sf-(dx|proto|drug|status|date)$/.test(t.id)){ui.sf[t.id.slice(3)]=t.value;render()}
  else if(/^mar-(from|to|pt)$/.test(t.id)){ui.mar[t.id.slice(4)]=t.value;render()}
  else if(t.id==='mar-oral'){ui.mar.oral=t.checked;render()}
  else if(t.id==='rm-pt'){ui.rmPt=t.value;render()}
  else if(t.id&&/^cn-/.test(t.id)){const ci=document.getElementById('cc-'+t.id.slice(3));if(ci)ci.disabled=t.checked}
  else if(t.id==='pharmby'){try{localStorage.setItem('chemo-pharm-by',t.value)}catch(x){}}
  else if(t.id==='calpt'){ui.calPatient=t.value;render()}
  else if(t.id==='calst'){ui.calStatus=t.value;render()}
  else if(t.id==='caloral'){ui.calShowOral=t.checked;render()}
  else if(t.id==='logpt'){ui.logPt=t.value;render()}
  else if(t.id==='theme'){setTheme(t.value);try{localStorage.setItem('chemo-theme',t.value)}catch(e){}}
  else if(t.id==='importf'&&t.files[0]){
    const file=t.files[0];t.value='';
    if(!dirty||confirm('Replace the unsaved edits open in this tab with the selected export?'))importBoard(file);
  }
});
document.addEventListener('input',ev=>{const t=ev.target;
  if(t.id==='pq'||t.id==='prq'){ui[t.id]=t.value;const pos=t.selectionStart;render();const n=document.getElementById(t.id);if(n){n.focus();n.setSelectionRange(pos,pos)}return}
  if(t.id==='gsearch'){ui.gq=t.value;ui.focusSearch=true;if(ui.view!=='search')location.hash='search';else render();return}
  if(t.id==='sf-q'||t.id==='sf-week'){if(t.id==='sf-q')ui.gq=t.value;else ui.sf.week=t.value;const id=t.id,pos=t.selectionStart;render();const n=document.getElementById(id);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(x){}}return}
  if(t.id==='bf-expr'||t.id==='bf-w'||t.id==='bf-h'){const o=document.getElementById('bf-out');if(!o)return;try{const v=bsaEval(document.getElementById('bf-expr').value,+document.getElementById('bf-w').value,+document.getElementById('bf-h').value);o.textContent='= '+r2(v)+' m²'}catch(x){o.textContent='Cannot read the expression'}return}
  if(t.id&&t.id.startsWith('cc-')&&t.dataset.drug){const k=t.id.slice(3);const pv=document.getElementById('cp-'+k);if(pv){const v=pv.dataset.v;pv.innerHTML=concPrev(v===''?null:{v:+v,u:pv.dataset.u},parseFloat(t.value),false)}return}
  if(t.id==='ai-in'){AI.draft=t.value}});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&document.getElementById('modal').innerHTML)closeModal();
  if(ev.key==='Enter'&&!ev.shiftKey&&ev.target.id==='ai-in'){ev.preventDefault();aiSend();return}
  if((ev.key==='Enter'||ev.key===' ')&&ev.target.matches('[role=button][data-act]')){ev.preventDefault();doAct(ev.target.dataset.act,ev.target)}});
window.addEventListener('beforeunload',ev=>{if(dirty){ev.preventDefault();ev.returnValue=''}});
/* ---------- AI editing assistant ---------- */
let SAMPLE=null;const AI={open:false,msgs:[],busy:false,proposal:null,ctl:null,draft:''};
const AIRULES='You are the editing assistant inside a hospital hematology chemotherapy dashboard used by clinical pharmacists. Reply ONLY with one JSON object: {"reply": string, "navigate": null or {"view": one of the listed views, "patient": a patient code or null}, "proposal": null or one proposal object}.\n'+
 'Proposal types (at most one per reply, and only when the user explicitly asks for a change):\n'+
 '1. {"type":"update_patient","patient":CODE,"changes":{FIELD:VALUE},"reason":string}. FIELD is one of name, mrn, age (text as recorded), ageYears (number), sex ("Male" or "Female"), weight (kg), height (cm), bsa (m²), diagnosis, protocol (text as written on the record), admission, status ("active" = confirmed, "awaiting" = awaiting approval, "held","completed","off").\n'+
 '2. {"type":"postpone","patient":CODE,"eventId":ID,"newDate":"YYYY-MM-DD","reason":string,"shiftLater":boolean}\n'+
 '3. {"type":"modify_dose","patient":CODE,"eventId":ID,"value":number,"unit":string,"reason":string}\n'+
 '4. {"type":"edit_event","patient":CODE,"eventId":ID,"changes":{"date"?: "YYYY-MM-DD","week"?: number,"route"?: string,"note"?: string},"reason":string}\n'+
 '5. {"type":"change_protocol","patient":CODE,"tpl":TEMPLATE_ID,"changeDate":"YYYY-MM-DD","newStart":"YYYY-MM-DD","reason":string}\n'+
 'Rules: Identify exactly one patient from the data by name (partial or Arabic spelling variants) or MRN. If there is no match or more than one possible match, ask in "reply" and set "proposal" to null. Pick the eventId from that patient\'s upcoming list only. Use only values the user stated: never calculate, suggest or choose a dose, BSA, date, reason or protocol yourself, and never make a clinical decision. If a needed value or the reason is missing, ask for it instead of proposing. A person must confirm every change; say so briefly. For questions, answer only from the data and say when it does not contain the answer. Use "navigate" to open a section when it helps. Write "reply" in the language the user wrote in, in at most three short sentences.';
function aiContext(){return JSON.stringify({today:asOf,views:VIEWS.map(v=>v[0]),templates:TPL.map(t=>({id:t.id,label:t.label})),
  patients:S.patients.map(p=>({code:p.code,name:p.name,mrn:p.mrn||null,diagnosis:p.diagnosis||null,age:p.age||null,ageYears:p.ageYears,sex:p.sex||null,weightKg:p.weight,heightCm:p.height,bsa:p.bsa,status:pstate(p).t,protocol:regOf(p),phase:curPhase(p),
    upcoming:p.events.filter(e=>e.remind&&live(e)&&e.date>=asOf).slice(0,10).map(e=>{const c=calc(e,p);return{eventId:e.id,drug:e.drug,date:e.date,week:e.week,dose:c.miss?null:c.v+' '+c.u}}),
    lastGiven:p.events.filter(e=>e.state==='administered').slice(-3).map(e=>({drug:e.drug,date:e.actualDate||e.date,week:e.week}))}))})}
const ISO=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\d$/.test(v)&&!isNaN(P(v));
function validateProposal(pr){
  if(!pr||typeof pr!=='object')return{err:'the proposal was empty'};const p=pt(pr.patient);if(!p)return{err:'no patient with code '+pr.patient};
  const reason=String(pr.reason||'').trim();if(!reason)return{err:'a reason is required; please state why'};
  const ev=()=>p.events.find(e=>e.id===pr.eventId);const rows=[];
  if(pr.type==='update_patient'){const ch=pr.changes||{};const allowed=['name','mrn','age','ageYears','sex','weight','height','bsa','diagnosis','protocol','admission','status'];const keys=Object.keys(ch);if(!keys.length)return{err:'no fields to change'};
    for(const k of keys){if(!allowed.includes(k))return{err:'field "'+k+'" cannot be edited here'};let v=ch[k];
      if(['ageYears','weight','height','bsa'].includes(k)){v=+v;const lim={ageYears:[0,99],weight:[1,200],height:[30,220],bsa:[0.2,3]}[k];if(!(v>=lim[0]&&v<=lim[1]))return{err:k+' value '+ch[k]+' is out of range'};ch[k]=v}
      if(k==='sex'&&!['Male','Female'].includes(v))return{err:'sex must be Male or Female'};if(k==='status'&&!['active','awaiting','held','completed','off'].includes(v))return{err:'unknown status'};
      rows.push([k,p[k]==null||p[k]===''?'—':p[k],ch[k]])}
    return{pr,p,rows,title:'Update patient details',reason}}
  if(pr.type==='postpone'){const e=ev();if(!e||!live(e)||!e.remind)return{err:'that treatment was not found among the patient’s upcoming doses'};if(!ISO(pr.newDate)||pr.newDate===e.date)return{err:'a valid new date is required'};
    rows.push(['Treatment',e.drug+', week '+e.week,''],['Date',fy(e.date),fy(pr.newDate)],['Later doses',' ',pr.shiftLater?'Move by the same number of days':'Unchanged'],['Patient status',pstate(p).t,'Delayed']);return{pr,p,e,rows,title:'Postpone treatment',reason}}
  if(pr.type==='modify_dose'){const e=ev();if(!e||!live(e))return{err:'that dose was not found among the patient’s upcoming doses'};const v=+pr.value;if(!(v>0))return{err:'a positive dose value is required'};const c=calc(e,p);
    rows.push(['Dose',e.drug+', week '+e.week+', '+fy(e.date),''],['Amount',(e.mod?e.mod.value:c.v)+' '+(c.u||''),v+' '+(pr.unit||c.u||'mg')]);return{pr,p,e,rows,title:'Record a dose modification',reason,clinical:true}}
  if(pr.type==='edit_event'){const e=ev();if(!e)return{err:'that treatment entry was not found'};const ch=pr.changes||{};const ks=Object.keys(ch);if(!ks.length)return{err:'no changes given'};
    for(const k of ks){if(!['date','week','route','note'].includes(k))return{err:'field "'+k+'" cannot be edited here'};if(k==='date'&&!ISO(ch[k]))return{err:'invalid date'};if(k==='week'&&!(Number.isInteger(+ch[k])&&+ch[k]>0&&+ch[k]<=200))return{err:'invalid week'};rows.push([k,k==='date'?fy(e.date):e[k],k==='date'?fy(ch[k]):ch[k]])}
    return{pr,p,e,rows,title:'Edit treatment entry ('+e.drug+', week '+e.week+')',reason}}
  if(pr.type==='change_protocol'){const t=TPLID[pr.tpl];if(!t)return{err:'unknown protocol template'};const cur=curPh(p);if(cur&&cur.reg===t.reg)return{err:'that is the same regimen; use Add next phase instead'};if(!ISO(pr.changeDate)||!ISO(pr.newStart))return{err:'valid change and day 1 dates are required'};
    rows.push(['Protocol',regOf(p)+', '+curPhase(p),t.label],['Change date','',fy(pr.changeDate)],['New day 1','',fy(pr.newStart)]);return{pr,p,rows,title:'Change protocol',reason,clinical:true}}
  return{err:'unknown change type'}}
function aiErr(e){const c=e&&e.code;return c==='not_granted'?'The assistant was not allowed to use Claude in this view.':c==='rate_limited'?'Too many requests just now. Try again in a moment.':c==='invalid_json'?'The answer could not be read. Please rephrase and try again.':c==='session_expired'?'Please sign in again.':c==='refused'?'That request was declined. Try rephrasing it.':'The assistant is unavailable right now. Try again shortly.'}
async function aiSend(){const t=document.getElementById('ai-in');const msg=(t&&t.value||'').trim();if(!msg||AI.busy||!SAMPLE)return;AI.msgs.push({role:'user',text:msg});AI.draft='';AI.busy=true;AI.proposal=null;renderAI();
  const convo=AI.msgs.slice(-8).map(m=>(m.role==='user'?'User: ':'Assistant: ')+m.text).join('\n');
  const prompt=AIRULES+'\n\nDASHBOARD DATA (JSON):\n'+aiContext()+'\n\nCONVERSATION:\n'+convo+'\n\nReply to the last user message with the JSON object only.';
  AI.ctl=new AbortController();
  try{const r=await SAMPLE.json(prompt,{cache:false,signal:AI.ctl.signal});
    AI.msgs.push({role:'assistant',text:r&&typeof r.reply==='string'?r.reply:'(No reply)'});
    if(r&&r.navigate&&r.navigate.view&&VIEWS.some(v=>v[0]===r.navigate.view)){if(r.navigate.patient&&pt(r.navigate.patient))ui.patient=r.navigate.patient;if(location.hash==='#'+r.navigate.view)render();else location.hash=r.navigate.view}
    if(r&&r.proposal){const v=validateProposal(r.proposal);if(v.err)AI.msgs.push({role:'assistant',text:'I could not prepare that change: '+v.err+'.',warn:true});else AI.proposal=v}
  }catch(e){if(!e||e.code!=='cancelled')AI.msgs.push({role:'assistant',text:aiErr(e),warn:true});if(e&&['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'].includes(e.code))SAMPLE=null}
  AI.busy=false;AI.ctl=null;renderAI()}
function aiApply(){const v=AI.proposal;if(!v)return;if(!canWrite){toast('View only: changes need the owner signed in');return}const byEl=document.getElementById('ai-by');const by=byEl&&byEl.value.trim();if(!by){toast('Enter your name to confirm the change');return}
  const chk=validateProposal(v.pr);if(chk.err){AI.msgs.push({role:'assistant',text:'The data changed and the proposal is no longer valid: '+chk.err+'.',warn:true});AI.proposal=null;renderAI();return}
  setBy(by);const via='(via assistant, confirmed by '+by+')';const p=chk.p,pr=chk.pr;
  mutate(()=>{
    if(pr.type==='update_patient'){const ch=Object.assign({},pr.changes);if(ch.status){if(ch.status==='awaiting')setAwaiting(p,by+' '+via);else{if(!approved(p))setConfirmed(p,by);if(ch.status!==p.status){log(p,'Status '+p.status+' → '+ch.status+', by '+by+' '+via);p.status=ch.status}}delete ch.status}if(Object.keys(ch).length)applyPatientUpdate(p,ch,chk.reason,by,via)}
    if(pr.type==='postpone')applyPostpone(p,chk.e,pr.newDate,chk.reason,by,!!pr.shiftLater,via);
    if(pr.type==='modify_dose'){const c=calc(chk.e,p);applyModify(p,chk.e,+pr.value,pr.unit||c.u||'mg',asOf,chk.reason,by,'',via)}
    if(pr.type==='edit_event'){const e=chk.e;const ch=pr.changes;const out=[];if(ch.date&&ch.date!==e.date){const n=diff(ch.date,e.date);if(!e.origDate)e.origDate=e.date;e.date=ch.date;if(e.end)e.end=add(e.end,n);out.push('date → '+fy(ch.date))}if(ch.week){out.push('week '+e.week+' → '+ch.week);e.week=+ch.week}if(ch.route!=null){out.push('route → '+ch.route);e.route=ch.route}if(ch.note!=null){out.push('note');e.note=ch.note}p.events.sort((a,b)=>a.date.localeCompare(b.date));log(p,'Edited '+e.drug+' entry: '+out.join(', ')+' ('+chk.reason+') '+via)}
    if(pr.type==='change_protocol'){const cd=pr.changeDate,st=pr.newStart;const from=curPh(p)?'Regimen '+curPh(p).reg+' ('+curPh(p).label.replace(/^Regimen .: /,'')+')':(p.protocol||'Not set');const n=stopFrom(p,cd,'Stopped: protocol changed on '+fy(cd));p.phases.forEach(ph=>{if(!ph.superseded)ph.superseded=cd});
      const b=buildPhase(p.code,pr.tpl,st,2);p.phases.push(b.phase);p.events.push(...b.events);p.events.sort((x,y)=>x.date.localeCompare(y.date));const to='Regimen '+b.phase.reg+' ('+b.phase.label.replace(/^Regimen .: /,'')+')';p.protocol='UKALL 2011 Regimen '+b.phase.reg;
      p.protocolChanges.push({date:cd,from,to,reason:chk.reason,stopped:n,newStart:st,by});revokeIfApproved(p,'protocol changed');log(p,'Protocol changed on '+fy(cd)+': '+from+' → '+to+' ('+chk.reason+'); '+n+' future doses stopped '+via)}
  });
  AI.proposal=null;AI.msgs.push({role:'assistant',text:'Applied and recorded in the change history. Select Save changes to keep it for everyone.'});renderAI();toast('Change applied');}
function propCard(v){return'<div class="aiprop"><b>Proposed: '+esc(v.title)+'</b><div style="margin:4px 0">'+whoH(v.p)+'</div><table><thead><tr><th>Field</th><th>Now</th><th>Proposed</th></tr></thead><tbody>'+v.rows.map(r=>'<tr><td>'+esc(r[0])+'</td><td dir="auto">'+esc(r[1])+'</td><td dir="auto"><b>'+esc(r[2])+'</b></td></tr>').join('')+'</tbody></table><div class="sub" style="margin-top:4px">Reason: '+esc(v.reason)+'</div>'+
  (canWrite?'<label class="field" style="margin-top:8px">Confirmed by (your name)<input id="ai-by" class="input" value="'+esc(lastBy())+'"></label><div class="row" style="margin-top:8px;justify-content:flex-end"><button class="btn sm" data-act="aidiscard">Discard</button><button class="btn sm pri" data-act="aiapply">Apply change</button></div>':'<div class="sub" style="margin-top:6px">View only: sign in as the owner to apply changes.</div>')+'</div>'}
function renderAI(){let box=document.getElementById('aipanel');if(!box){box=document.createElement('div');box.id='aipanel';document.body.appendChild(box)}
  if(!SAMPLE){box.innerHTML=canWrite?'<button class="aibtn" data-act="assistant-info">'+icon('ai',18)+'<span>Assistant</span></button>':'';return}
  if(!AI.open){box.innerHTML='<button class="aibtn" data-act="ai">'+icon('ai',18)+'<span>Assistant</span></button>';return}
  box.innerHTML='<div class="aip" role="dialog" aria-label="Dashboard assistant"><div class="aih"><div style="flex:1"><b>Dashboard assistant</b><div class="sub">It proposes; you confirm. It never makes clinical decisions.</div></div><button class="btn sm ghost" data-act="ai" aria-label="Close assistant">✕</button></div><div class="aim" id="aim">'+
   (AI.msgs.length?'':'<div class="sub">Try “Update [patient]’s weight to 16 kg, reason: clinic scale today”, “What is [patient]’s next dose?” or “Open the pharmacy checklist”.</div>')+
   AI.msgs.map(m=>'<div class="aimsg '+m.role+(m.warn?' warn':'')+'" dir="auto">'+esc(m.text)+'</div>').join('')+(AI.busy?'<div class="aimsg assistant"><i>Thinking…</i></div>':'')+(AI.proposal?propCard(AI.proposal):'')+'</div>'+
   '<div class="aif"><textarea id="ai-in" class="input" rows="2" placeholder="Ask, or request a change…" dir="auto">'+esc(AI.draft)+'</textarea>'+(AI.busy?'<button class="btn" data-act="aistop">Stop</button>':'<button class="btn pri" data-act="aisend">Send</button>')+'</div></div>';
  const mm=document.getElementById('aim');if(mm)mm.scrollTop=mm.scrollHeight}
function autoConfirm(d,today){if(d.settings.autoConfirmPast===false)return 0;let n=0;
  d.patients.forEach(p=>{p.events.forEach(e=>{if(e.date<today&&!e.noAuto&&['scheduled','delayed','documented','unrecorded'].includes(e.state)&&!discOpen(e,p)){
    e.autoFrom=e.state;e.reason=(e.state==='documented'?'On the record sheet; ':e.state==='unrecorded'?'Not on the record sheet; ':'')+'confirmed by default (date passed, not marked otherwise)';e.state='administered';e.actualDate=e.actualDate||e.date;e.auto=true;n++}});
    if(p.status==='delayed'&&!p.events.some(e=>e.postponed&&e.state==='delayed'))p.status=p.prevStatus||'active'});return n}
function route(){ui.editK=null;const h=(location.hash||'').slice(1);ui.view=VIEWS.some(v=>v[0]===h)?h:'overview';if(ui.view!=='patients')ui.patient=null;closeModal();render();window.scrollTo(0,0)}
window.addEventListener('hashchange',route);
function setTheme(v){if(v==='light'||v==='dark')document.documentElement.dataset.theme=v;else delete document.documentElement.dataset.theme}
try{setTheme(localStorage.getItem('chemo-theme')||'system')}catch(e){}
route();
if(shared.configured&&shared.hasSession())startSession();
window.__board={get S(){return S},emailText,metrics,setAsOf:v=>{asOf=v;render()},validateProposal,pstate:c=>pstate(pt(c)),calc:(c,id)=>{const p=pt(c);return calc(p.events.find(e=>e.id===id),p)}};
})();
