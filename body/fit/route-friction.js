(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.BodyFitRouteFriction=api;
  if(typeof document!=='undefined'){
    const mount=()=>{try{api.mount()}catch(error){console.error('BODY/FIT route friction failed',error)}};
    document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount,{once:true}):queueMicrotask(mount);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const STATE_STORE='0xxx0.body.fit.v01';
  const PROFILE_STORE=['0xxx0.body.fit','route-friction','v01'].join('.');
  const PROFILE_SCHEMA='0xxx0/body-fit-route-friction/v0.1';
  const FRICTIONS=Object.freeze([
    {id:'CARRY',label:'carry / load',terms:['carry','load','pack','strap','bag','support']},
    {id:'WEATHER',label:'weather / exposure',terms:['weather','rain','waterproof','thermal','shelter','sun']},
    {id:'POWER',label:'power / charge',terms:['power','battery','charge','energy','usb']},
    {id:'INSTALL',label:'install / repair',terms:['install','tool','mount','attach','repair','fasten']},
    {id:'MOBILITY',label:'mobility / traction',terms:['mobility','walk','run','traction','balance','stability','support']},
    {id:'DURATION',label:'duration / service',terms:['duration','endurance','water','food','charge','service','backup']}
  ]);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s||'').trim().toLowerCase();
  function readJson(slot,fallback){try{const x=JSON.parse(localStorage.getItem(slot)||'null');return x??fallback}catch(_){return fallback}}
  function bodyState(){const x=readJson(STATE_STORE,{});return x&&typeof x==='object'?x:{}}
  function profiles(){const x=readJson(PROFILE_STORE,null);return x&&x.schema===PROFILE_SCHEMA&&x.profiles&&typeof x.profiles==='object'?x:{schema:PROFILE_SCHEMA,profiles:{}}}
  function saveProfiles(x){try{localStorage.setItem(PROFILE_STORE,JSON.stringify(x))}catch(_){}}
  function resolveHead(state,id){
    const fittings=Array.isArray(state?.fittings)?state.fittings:[];let x=fittings.find(q=>q.id===id),seen=new Set();
    while(x?.superseded_by&&!seen.has(x.id)){seen.add(x.id);x=fittings.find(q=>q.id===x.superseded_by)||x}
    return x||null
  }
  function relevantFittings(state,kitId){
    const fittings=Array.isArray(state?.fittings)?state.fittings:[];
    const ready=x=>x&&!x.superseded_by&&x.lifecycle!=='RETIRED'&&['ACTIVE','FITTED'].includes(String(x.lifecycle||'').toUpperCase());
    if(kitId){
      const kit=(Array.isArray(state?.kits)?state.kits:[]).find(k=>k.id===kitId);
      if(kit)return [...new Map((kit.fitting_ids||[]).map(id=>resolveHead(state,id)).filter(ready).map(x=>[x.id,x])).values()]
    }
    return fittings.filter(ready)
  }
  function searchable(fitting){return [fitting?.label,...(fitting?.capabilities||[]),...(fitting?.interfaces||[]),fitting?.power_note,fitting?.note].map(norm).filter(Boolean).join(' ')}
  function coverage(state,frictionIds,kitId){
    const ids=[...new Set((frictionIds||[]).map(x=>String(x).toUpperCase()).filter(id=>FRICTIONS.some(f=>f.id===id)))];
    const fittings=relevantFittings(state,kitId);
    return ids.map(id=>{
      const f=FRICTIONS.find(x=>x.id===id),matches=fittings.filter(x=>f.terms.some(t=>searchable(x).includes(t)));
      return{id,label:f.label,state:matches.length?'DECLARED_MATCH':'UNANSWERED',matches:matches.map(x=>({id:x.id,label:x.label}))}
    })
  }
  function profileId(kitId){return kitId?'kit:'+kitId:'active'}
  function readProfile(kitId){const all=profiles();return all.profiles[profileId(kitId)]||{frictions:[],note:''}}
  function writeProfile(kitId,profile){const all=profiles();all.profiles[profileId(kitId)]={frictions:[...new Set(profile.frictions||[])],note:String(profile.note||''),updated_at:new Date().toISOString()};saveProfiles(all);return all.profiles[profileId(kitId)]}
  function mount(){
    const host=document.querySelector('.kitPanel'),select=document.querySelector('#kitSelect');if(!host||!select||document.querySelector('#routeFrictionPanel'))return false;
    const style=document.createElement('style');style.textContent='.routeFriction{margin-top:8px;border-top:1px solid var(--line);padding-top:8px}.rfHead{display:flex;justify-content:space-between;gap:8px;align-items:end}.rfHead b{font-size:7px;letter-spacing:.12em}.rfHead span{font-size:7px;color:var(--mut)}.rfRail{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}.rfChip{min-height:29px;padding:5px 7px}.rfChip.on{border-color:var(--cool);color:#dff4ff;background:#0d181d}.rfNote{margin-top:6px}.rfResult{display:grid;gap:3px;margin-top:7px}.rfRow{display:grid;grid-template-columns:86px 104px minmax(0,1fr);gap:7px;padding:5px 0;border-top:1px solid #20292d;align-items:start}.rfRow b{font-size:7px;color:var(--gold)}.rfState{font-size:7px}.rfState.declared_match{color:var(--green)}.rfState.unanswered{color:var(--gold)}.rfMatches{font-size:7px;color:var(--mut)}@media(max-width:820px){.rfRow{grid-template-columns:82px 98px minmax(0,1fr)}}';document.head.append(style);
    const panel=document.createElement('section');panel.id='routeFrictionPanel';panel.className='routeFriction';panel.innerHTML='<div class="rfHead"><b>ROUTE / FRICTION</b><span>metadata relation · not adequacy / safety</span></div><div class="rfRail"></div><input class="rfNote" type="text" placeholder="route/environment note · stairs, rain, long day, no outlet…"><div class="rfResult"></div>';
    const anchor=host.querySelector('.kitActions')||host.lastElementChild;anchor?.insertAdjacentElement('afterend',panel);
    const rail=panel.querySelector('.rfRail'),note=panel.querySelector('.rfNote'),result=panel.querySelector('.rfResult');
    rail.innerHTML=FRICTIONS.map(f=>'<button type="button" class="rfChip" data-rf="'+f.id+'">'+esc(f.label)+'</button>').join('');
    function kitId(){return select.value||''}
    function render(){
      const p=readProfile(kitId()),active=new Set(p.frictions||[]);note.value=p.note||'';
      rail.querySelectorAll('[data-rf]').forEach(b=>b.classList.toggle('on',active.has(b.dataset.rf)));
      const rows=coverage(bodyState(),[...active],kitId());
      result.innerHTML=rows.length?rows.map(r=>'<div class="rfRow"><b>'+esc(r.label)+'</b><span class="rfState '+r.state.toLowerCase()+'">'+esc(r.state.replace('_',' '))+'</span><span class="rfMatches">'+esc(r.matches.length?r.matches.map(x=>x.label).join(' · '):'no matching fitted capability declared')+'</span></div>').join(''):'<span class="small">Choose only the frictions that matter for this route. Empty is valid.</span>';
    }
    rail.addEventListener('click',e=>{const b=e.target.closest('[data-rf]');if(!b)return;const p=readProfile(kitId()),s=new Set(p.frictions||[]);s.has(b.dataset.rf)?s.delete(b.dataset.rf):s.add(b.dataset.rf);writeProfile(kitId(),{frictions:[...s],note:p.note});render()});
    note.addEventListener('change',()=>{const p=readProfile(kitId());writeProfile(kitId(),{frictions:p.frictions,note:note.value.trim()});render()});
    select.addEventListener('change',render);
    const watch=document.querySelector('#kitResult')||host;new MutationObserver(()=>render()).observe(watch,{childList:true,subtree:true,characterData:true});
    render();return true
  }
  return Object.freeze({PROFILE_SCHEMA,FRICTIONS,relevantFittings,coverage,profileId,mount});
});
