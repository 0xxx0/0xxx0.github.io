(function(root){
'use strict';

const SCHEMA='env0-homebase/v0.1';
const RETURN_SCHEMA='env0-homebase-return/v0.1';
const PHASES=Object.freeze(['PLACE','PREP','SET_OUT','RETURN','SERVICE','READY']);

const clean=v=>String(v==null?'':v).trim();
const uniq=xs=>[...new Set(xs.filter(Boolean))];

function refs(v){
  if(Array.isArray(v))return uniq(v.map(clean));
  return uniq(clean(v).split(/[\n,]+/).map(clean));
}

function normalize(input={}){
  const phase=PHASES.includes(input.phase)?input.phase:'PLACE';
  return {
    schema:SCHEMA,
    authority:'LOCAL_OPERATOR_PROJECTION_ONLY',
    room:clean(input.room),
    task:clean(input.task),
    required:refs(input.required),
    nearby:refs(input.nearby),
    carried:refs(input.carried),
    phase,
    service_note:clean(input.service_note),
    source:clean(input.source||'MANUAL_SESSION'),
    return_to:'/house/'
  };
}

function derive(input={}){
  const s=normalize(input);
  const have=new Set([...s.nearby,...s.carried]);
  const carried=new Set(s.carried);
  const nearby=new Set(s.nearby);
  const missing=s.required.filter(x=>!have.has(x));
  const relation=s.required.map(ref=>({
    ref,
    relation:carried.has(ref)?'CARRIED':nearby.has(ref)?'NEARBY':'MISSING'
  }));
  let readiness='UNKNOWN';
  if(!s.task)readiness='NO_TASK';
  else if(s.required.length&&missing.length===0)readiness='READY';
  else if(s.required.length&&missing.length)readiness='MISSING';
  return {...s,missing,relation,readiness};
}

function transition(input,event){
  const s=normalize(input),e=clean(event).toUpperCase();
  const next={...s};
  if(e==='PLACE')next.phase='PLACE';
  else if(e==='PREP')next.phase='PREP';
  else if(e==='SET_OUT')next.phase='SET_OUT';
  else if(e==='RETURN')next.phase='RETURN';
  else if(e==='SERVICE')next.phase='SERVICE';
  else if(e==='READY')next.phase='READY';
  else if(e==='STOW'){next.carried=[];next.phase='SERVICE';}
  else if(e==='RESET')return normalize({room:s.room,source:s.source});
  return normalize(next);
}

function makeReturn(input={}){
  const d=derive(input);
  return {
    schema:RETURN_SCHEMA,
    created_at:new Date().toISOString(),
    room:d.room||null,
    task:d.task||null,
    phase:d.phase,
    requirements:d.required,
    carried:d.carried,
    nearby:d.nearby,
    missing:d.missing,
    readiness:d.readiness,
    service_note:d.service_note||null,
    evidence_class:'LOCAL_HUMAN_DECLARATION',
    authority:'EVIDENCE_ONLY / NO HOUSEBUS ACTUATION',
    claims:[
      'ENV-0 projects task-facing human capability; it does not own HOUSE place truth.',
      'Inventory relations are session-local declarations, not a canonical item database.',
      'READY is derived only from declared requirements and declared nearby/carried refs.',
      'RETURN records discrepancy/service residue without claiming physical completion.'
    ],
    return_to:'/house/'
  };
}

const Core={SCHEMA,RETURN_SCHEMA,PHASES,refs,normalize,derive,transition,makeReturn};
root.ENV0HomebaseCore=Core;
if(typeof module!=='undefined'&&module.exports)module.exports=Core;
})(typeof globalThis!=='undefined'?globalThis:this);
