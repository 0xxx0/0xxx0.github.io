(function(root){
'use strict';

const SCHEMA='env0-homebase/v0.1';
const RETURN_SCHEMA='env0-homebase-return/v0.1';
const PHASES=Object.freeze(['PLACE','PREP','SET_OUT','RETURN','SERVICE','READY']);
const READY_LIFECYCLES=new Set(['ACTIVE','FITTED']);
const clean=v=>String(v==null?'':v).trim();

function normalize(input={}){
  const phase=PHASES.includes(input.phase)?input.phase:'PLACE';
  return {schema:SCHEMA,authority:'LOCAL_OPERATOR_PROJECTION_ONLY',room:clean(input.room),task:clean(input.task),kit_id:clean(input.kit_id),phase,service_note:clean(input.service_note),source:clean(input.source||'MANUAL_SESSION'),return_to:'/house/'};
}
function resolveHead(state,id){
  const fittings=Array.isArray(state?.fittings)?state.fittings:[];let x=fittings.find(q=>q.id===id)||null,seen=new Set();
  while(x?.superseded_by&&!seen.has(x.id)){seen.add(x.id);x=fittings.find(q=>q.id===x.superseded_by)||x}
  return x;
}
function kitSnapshot(state={},kitId=''){
  const kit=(Array.isArray(state?.kits)?state.kits:[]).find(k=>k.id===kitId)||null;
  if(!kit)return {found:false,id:kitId||null,name:null,purpose:null,modules:[],attention:0};
  const modules=(kit.fitting_ids||[]).map(source_id=>{
    const head=resolveHead(state,source_id),lifecycle=clean(head?.lifecycle).toUpperCase()||'MISSING',ready=!!head&&READY_LIFECYCLES.has(lifecycle)&&!head.superseded_by;
    return {source_id,resolved_id:head?.id||null,label:head?.label||source_id,lifecycle,ready};
  });
  return {found:true,id:kit.id,name:kit.name||kit.id,purpose:kit.purpose||null,modules,attention:modules.filter(x=>!x.ready).length};
}
function derive(input={},bodyFitState={},frictionRows=[]){
  const s=normalize(input),kit=kitSnapshot(bodyFitState,s.kit_id),rows=Array.isArray(frictionRows)?frictionRows:[],unanswered=rows.filter(x=>x?.state!=='DECLARED_MATCH');
  let readiness='DECLARED_READY';
  if(!s.task)readiness='NO_TASK';
  else if(!kit.found)readiness='NO_KIT';
  else if(kit.attention)readiness='KIT_ATTENTION';
  else if(unanswered.length)readiness='FRICTION_OPEN';
  return {...s,kit,friction:{rows,unanswered:unanswered.map(x=>x.id||x.label||'UNKNOWN')},readiness};
}
function transition(input,event){
  const s=normalize(input),e=clean(event).toUpperCase(),next={...s};
  if(PHASES.includes(e))next.phase=e;
  else if(e==='RESET')return normalize({room:s.room,source:s.source});
  return normalize(next);
}
function makeReturn(input={},bodyFitState={},frictionRows=[]){
  const d=derive(input,bodyFitState,frictionRows);
  return {schema:RETURN_SCHEMA,created_at:new Date().toISOString(),room:d.room||null,task:d.task||null,phase:d.phase,body_fit_kit:d.kit.found?{id:d.kit.id,name:d.kit.name,purpose:d.kit.purpose,module_refs:d.kit.modules.map(x=>({source_id:x.source_id,resolved_id:x.resolved_id,lifecycle:x.lifecycle}))}:null,route_friction:{rows:d.friction.rows.map(x=>({id:x.id||null,label:x.label||null,state:x.state||null,matches:Array.isArray(x.matches)?x.matches.map(m=>({id:m.id,label:m.label})):[]})),unanswered:d.friction.unanswered},readiness:d.readiness,service_note:d.service_note||null,evidence_class:'LOCAL_HUMAN_DECLARATION + BODY_FIT_REFERENCES',authority:'EVIDENCE_ONLY / NO HOUSEBUS ACTUATION / BODY_FIT REMAINS LOADOUT AUTHORITY',claims:['HOUSE owns place; ENV-0 only composes the current operator view.','BODY/FIT remains fitting, kit and route-friction authority; ENV-0 stores only the selected kit reference in this session.','DECLARED_READY means current BODY/FIT declarations have no known kit/friction gap; it is not adequacy, safety or physical completion.','RETURN records discrepancy/service residue without mutating HOUSE, BODY/FIT or HOUSEBUS state.'],return_to:'/house/'};
}
const Core={SCHEMA,RETURN_SCHEMA,PHASES,normalize,resolveHead,kitSnapshot,derive,transition,makeReturn};root.ENV0HomebaseCore=Core;if(typeof module!=='undefined'&&module.exports)module.exports=Core;
})(typeof globalThis!=='undefined'?globalThis:this);
