export const bearings = ['home','compute','phone','hands','output','out','people','wait'];

export const bearingLabel = {
  home: ['HOME','家 / 根'], compute: ['COMPUTE','計算 / 研究'], phone: ['PHONE','通信 / 連接'],
  hands: ['HANDS','動手 / 實作'], output: ['OUTPUT','輸出 / 創造'], out: ['OUT','外出 / 探索'],
  people: ['PEOPLE','人 / 關係'], wait: ['WAIT','等待 / 沉澱']
};

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const hm = value => {
  const [h,m] = String(value || '00:00').split(':').map(Number);
  return clamp((Number.isFinite(h)?h:0)*60 + (Number.isFinite(m)?m:0), 0, 1439);
};
export const ft = minutes => {
  const value = ((Math.round(Number(minutes) || 0) % 1440) + 1440) % 1440;
  return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
};
export const deepCopy = value => JSON.parse(JSON.stringify(value));

export const seedTasks = [
  {id:'t:backup',title:'BACKUP + RESTORE',long:'Verify one recoverable backup and name one restore path.',home:'compute',duration:18,value:5,earliest:'08:00',latest:'22:00',status:'open',anchor:'Create',doneWhen:'one restore path is named and checked',returnTarget:'backup receipt + unresolved gap',returned:false,returnResidue:'',returnTags:[],manualBias:0},
  {id:'t:bench',title:'BOUND BENCH ZONE',long:'Clear one bounded work surface without reorganising the whole room.',home:'hands',duration:20,value:4,earliest:'08:00',latest:'21:00',status:'open',anchor:'Create',doneWhen:'one surface accepts the next build',returnTarget:'photo or note of the cleared boundary',returned:false,returnResidue:'',returnTags:[],manualBias:0},
  {id:'t:print',title:'PRINT ALIGNMENT',long:'Run one controlled print / alignment test.',home:'output',duration:14,value:4,earliest:'09:00',latest:'20:30',status:'open',anchor:'Create',doneWhen:'one test is compared against target alignment',returnTarget:'settings kept + one correction',returned:false,returnResidue:'',returnTags:[],manualBias:0},
  {id:'t:measure',title:'MEASURE INTERFACE',long:'Measure one wall / partition interface once.',home:'hands',duration:10,value:4,earliest:'08:00',latest:'21:00',status:'open',anchor:'Create',doneWhen:'critical dimensions and substrate are recorded',returnTarget:'dimension note usable by next prototype',returned:false,returnResidue:'',returnTags:[],manualBias:0},
  {id:'t:litter',title:'LITTER FAILURE NOTE',long:'Inspect one failure mode and record only the next safe test.',home:'home',duration:15,value:4,earliest:'08:00',latest:'20:00',status:'open',anchor:'Health',doneWhen:'failure mode is isolated without unnecessary teardown',returnTarget:'one-line hypothesis + next safe test',returned:false,returnResidue:'',returnTags:[],manualBias:0},
  {id:'t:model',title:'MODEL LATENCY FIXTURE',long:'Run one bounded local-model capability / latency fixture.',home:'compute',duration:25,value:5,earliest:'09:00',latest:'22:30',status:'open',anchor:'Learn',doneWhen:'one model has a repeatable prompt and latency result',returnTarget:'fixture result + keep/drop decision',returned:false,returnResidue:'',returnTags:[],manualBias:0},
  {id:'t:pixel',title:'PIXEL BACKUP PREFLIGHT',long:'Prepare reversible backup preflight before any phone-system change.',home:'phone',duration:20,value:4,earliest:'10:00',latest:'22:00',status:'open',anchor:'Learn',doneWhen:'backup scope and restore path are explicit',returnTarget:'preflight checklist with stop rule',returned:false,returnResidue:'',returnTags:[],manualBias:0},
  {id:'t:market',title:'MARKETPLACE RECHECK',long:'Recheck shortlisted listings only at action time.',home:'phone',duration:18,value:3,earliest:'10:00',latest:'21:30',status:'open',anchor:'Explore',doneWhen:'shortlist is reduced to buy / ask / drop',returnTarget:'3-state shortlist',returned:false,returnResidue:'',returnTags:[],manualBias:0},
  {id:'t:reentry',title:'TEN-MIN RE-ENTRY',long:'Test whether the current artifact can be resumed within ten minutes.',home:'compute',duration:10,value:5,earliest:'08:00',latest:'23:00',status:'open',anchor:'Learn',doneWhen:'next test is obvious within ten minutes',returnTarget:'re-entry friction note',returned:false,returnResidue:'',returnTags:[],manualBias:0},
  {id:'t:return',title:'RETURN LOG',long:'Preserve one useful state change without narrative bloat.',home:'output',duration:8,value:5,earliest:'08:00',latest:'23:30',status:'open',anchor:'Learn',doneWhen:'one state change is explicit',returnTarget:'before → after → delta → next',returned:false,returnResidue:'',returnTags:[],manualBias:0}
];

export const baseTerrain = Object.fromEntries(bearings.map(b => [b,{factor:1,n:0,totalMin:0}]));

export const defaultState = {
  selected:'t:backup', context:'home', projection:'auto', depth:'world', previewMin:0, simulating:false,
  proposal:null, hardAnchors:[], sessions:[], activeSession:null, terrain:baseTerrain, tasks:seedTasks,
  eventLog:[], firstRun:true
};

export function normalizeTask(task){
  if(!task || typeof task !== 'object' || !task.id || !task.title) return null;
  const earliest = /^\d\d:\d\d$/.test(task.earliest) ? task.earliest : '08:00';
  const latest = /^\d\d:\d\d$/.test(task.latest) ? task.latest : '22:00';
  return {
    id:String(task.id), title:String(task.title).slice(0,60), long:String(task.long || task.title).slice(0,180),
    home:bearings.includes(task.home)?task.home:'home', duration:clamp(Number(task.duration)||10,1,360),
    value:clamp(Number(task.value)||3,1,5), earliest, latest,
    status:['open','parked','done'].includes(task.status)?task.status:'open', anchor:String(task.anchor||'Learn').slice(0,30),
    doneWhen:String(task.doneWhen||'').slice(0,100), returnTarget:String(task.returnTarget||'').slice(0,100),
    returned:Boolean(task.returned), returnResidue:String(task.returnResidue||'').slice(0,220),
    returnTags:Array.isArray(task.returnTags)?task.returnTags.map(String).slice(0,6):[], manualBias:clamp(Number(task.manualBias)||0,-20,20)
  };
}

export function validAnchor(a){
  return Boolean(a && typeof a === 'object' && a.title && /^\d\d:\d\d$/.test(a.start) && /^\d\d:\d\d$/.test(a.end) && hm(a.end) > hm(a.start));
}

export function normalizeState(candidate){
  const safe = deepCopy(defaultState);
  if(!candidate || typeof candidate !== 'object') return safe;
  safe.selected = typeof candidate.selected === 'string' ? candidate.selected : safe.selected;
  safe.context = bearings.includes(candidate.context) ? candidate.context : safe.context;
  safe.projection = ['auto','atlas','aperture'].includes(candidate.projection) ? candidate.projection : 'auto';
  safe.depth = ['world','district','task','return'].includes(candidate.depth) ? candidate.depth : 'world';
  safe.previewMin = clamp(Number(candidate.previewMin)||0,0,240);
  safe.hardAnchors = Array.isArray(candidate.hardAnchors) ? candidate.hardAnchors.filter(validAnchor) : [];
  safe.sessions = Array.isArray(candidate.sessions) ? candidate.sessions.slice(-300) : [];
  safe.activeSession = candidate.activeSession && typeof candidate.activeSession==='object' ? candidate.activeSession : null;
  safe.terrain = {...deepCopy(baseTerrain), ...(candidate.terrain || {})};
  safe.tasks = Array.isArray(candidate.tasks) && candidate.tasks.length ? candidate.tasks.map(normalizeTask).filter(Boolean) : deepCopy(seedTasks);
  if(!safe.tasks.some(t=>t.id===safe.selected)) safe.selected = safe.tasks[0].id;
  safe.proposal = candidate.proposal && typeof candidate.proposal==='object' ? candidate.proposal : null;
  safe.eventLog = Array.isArray(candidate.eventLog) ? candidate.eventLog.slice(-500) : [];
  safe.firstRun = Boolean(candidate.firstRun);
  safe.simulating = false;
  return safe;
}

export function terrainFor(state, task){
  return state.terrain[task.home] || {factor:1,n:0,totalMin:0};
}
export function measuredDuration(state, task){
  const t = terrainFor(state,task);
  const factor = t.n ? clamp(Number(t.factor)||1,.65,1.8) : 1;
  return Math.max(1,Math.round(task.duration*factor));
}
export function windowFit(task, at){
  const s=hm(task.earliest), e=hm(task.latest);
  if(at>=s && at<=e) return 1;
  if(at<s) return clamp(1-(s-at)/240,0,1);
  return 0;
}
export function contextFit(state, task){
  if(task.home===state.context) return 1;
  if(state.context==='home' && ['compute','hands','output'].includes(task.home)) return .55;
  if(state.context==='out' && task.home==='people') return .45;
  return .12;
}
export function activeAnchor(state, at){
  return state.hardAnchors.find(a=>at>=hm(a.start)&&at<hm(a.end)) || null;
}
export function nextAnchor(state, at){
  return state.hardAnchors.filter(a=>hm(a.start)>at).sort((a,b)=>hm(a.start)-hm(b.start))[0] || null;
}
export function gapInfo(state, at){
  const active=activeAnchor(state,at);
  if(active) return {mode:'occupied',minutes:Math.max(0,hm(active.end)-at),anchor:active};
  const next=nextAnchor(state,at);
  if(next) return {mode:'free',minutes:Math.max(0,hm(next.start)-at),anchor:next};
  return {mode:'open',minutes:null,anchor:null};
}
export function gapFit(state, task, at){
  const gap=gapInfo(state,at);
  if(gap.mode==='occupied') return 0;
  if(gap.minutes===null) return 1;
  const d=measuredDuration(state,task);
  return d<=gap.minutes ? 1 : clamp(gap.minutes/d,0,1);
}
export function score(state, task, at){
  if(task.status==='done') return -999;
  const parkedPenalty=task.status==='parked'?42:0;
  return task.value*11 + contextFit(state,task)*31 + windowFit(task,at)*23 + gapFit(state,task,at)*18 - measuredDuration(state,task)*.28 + task.manualBias - parkedPenalty;
}
export function reach(state,task,at){ return clamp(.93-(score(state,task,at)+10)/145,.12,.92); }
export function reachBand(state,task,at){
  const r=reach(state,task,at); if(r<.32)return 'IMMEDIATE'; if(r<.5)return 'NEAR'; if(r<.7)return 'FURTHER'; return 'LATENT';
}
export function rankedTasks(state, at){
  return [...state.tasks].filter(t=>t.status!=='done').sort((a,b)=>score(state,b,at)-score(state,a,at));
}
export function explainFit(state,task,at){
  const reasons=[], friction=[]; const gap=gapInfo(state,at); const d=measuredDuration(state,task);
  if(task.home===state.context) reasons.push('context already active'); else friction.push(`switch to ${task.home}`);
  if(windowFit(task,at)===1) reasons.push('window open'); else if(at<hm(task.earliest)) friction.push(`opens ${task.earliest}`); else friction.push('window missed');
  if(gap.mode==='open') reasons.push('open horizon');
  else if(gap.mode==='free' && d<=gap.minutes) reasons.push(`fits ${gap.minutes}m horizon`);
  else if(gap.mode==='free') friction.push(`${d-gap.minutes}m over horizon`);
  else friction.push(`inside ${gap.anchor.title}`);
  const terrain=terrainFor(state,task); if(terrain.n<2) friction.push('duration terrain uncertain');
  return {reasons,friction};
}
export function tailRoute(state,selectedId,at,max=2){
  const selected=state.tasks.find(t=>t.id===selectedId); if(!selected) return [];
  const gap=gapInfo(state,at); if(gap.mode==='occupied') return [];
  let remaining=gap.minutes===null?120:Math.max(0,gap.minutes-measuredDuration(state,selected));
  if(remaining<=0) return [];
  const candidates=rankedTasks(state,at).filter(t=>t.id!==selected.id && t.status==='open' && t.home===selected.home && windowFit(t,at)>.5);
  const out=[];
  for(const t of candidates){ const d=measuredDuration(state,t); if(d<=remaining){out.push(t);remaining-=d;} if(out.length>=max)break; }
  return out;
}
