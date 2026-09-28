export const DECISION_APERTURE_SCHEMA='fold-bloom-decision-aperture/v0.1';

const round=(x,n=6)=>Number(Number(x).toFixed(n));
const infoBits=n=>n>0?round(Math.log2(n)):null;
const cleanId=x=>String(x??'').trim();

function cloneCandidate(x,i){
  const id=cleanId(x?.id);
  return {
    id,
    label:String(x?.label??(id||('CANDIDATE '+(i+1)))),
    address:x?.address==null?null:String(x.address),
    payload:x?.payload&&typeof x.payload==='object'?{...x.payload}:null
  };
}

export function candidateApertureWitness(spec={}){
  const candidates=(Array.isArray(spec.candidates)?spec.candidates:[]).map(cloneCandidate);
  if(candidates.some(x=>!x.id)){
    return {ok:false,schema:DECISION_APERTURE_SCHEMA,reason:'CANDIDATE_ID_REQUIRED'};
  }
  const ids=candidates.map(x=>x.id),unique=new Set(ids);
  if(unique.size!==ids.length){
    return {ok:false,schema:DECISION_APERTURE_SCHEMA,reason:'CANDIDATE_IDS_MUST_BE_UNIQUE'};
  }

  const requestedFocus=Array.isArray(spec.focusIds)?spec.focusIds.map(cleanId).filter(Boolean):[];
  const unknown=requestedFocus.filter(id=>!unique.has(id));
  if(unknown.length){
    return {ok:false,schema:DECISION_APERTURE_SCHEMA,reason:'FOCUS_MUST_REFERENCE_CANDIDATES',unknown_focus_ids:unknown};
  }

  const focusIds=[...new Set(requestedFocus)];
  const candidateCount=candidates.length,focusCount=focusIds.length;
  const candidateBits=infoBits(candidateCount),focusBits=infoBits(focusCount);
  const informationGain=candidateBits!=null&&focusBits!=null?round(Math.max(0,candidateBits-focusBits)):null;
  const plannedId=spec.plannedId==null?null:cleanId(spec.plannedId);
  if(plannedId&&!unique.has(plannedId)){
    return {ok:false,schema:DECISION_APERTURE_SCHEMA,reason:'PLANNED_ID_MUST_REFERENCE_CANDIDATE',planned_id:plannedId};
  }

  return {
    ok:true,
    schema:DECISION_APERTURE_SCHEMA,
    kind:String(spec.kind||'GENERIC'),
    authority:String(spec.authority||'WITNESS_ONLY'),
    epoch:spec.epoch==null?null:String(spec.epoch),
    candidate_basis:String(spec.candidateBasis||'DECLARED_CANDIDATE_SET'),
    candidate_count:candidateCount,
    candidate_ambiguity_bits:candidateBits,
    candidates,
    focus:{
      basis:String(spec.focusBasis||'NONE'),
      authority:String(spec.focusAuthority||'WITNESS_ONLY'),
      ids:focusIds,
      count:focusCount,
      fraction:candidateCount?round(focusCount/candidateCount):0,
      ambiguity_bits:focusBits,
      information_gain_bits:informationGain,
      semantics:String(spec.focusSemantics||'no narrowing witness supplied')
    },
    planned_id:plannedId||null,
    commit_semantics:String(spec.commitSemantics||'NONE'),
    refresh_semantics:String(spec.refreshSemantics||'STATIC'),
    law:String(spec.law||'candidate-set shape is inspectable; authority and meaning remain owned by the source system')
  };
}

function stateMaskForPrefix(lattice,step,cursor){
  const byLine=new Map((lattice?.moving_lines||[]).map((line,i)=>[Number(line),i]));
  const depth=Math.max(0,Math.min(step?.selected_order?.length||0,Math.trunc(Number(cursor)||0)));
  let mask=0;
  for(const line of (step?.selected_order||[]).slice(0,depth)){
    const bit=byLine.get(Number(line));
    if(bit!==undefined)mask|=(1<<bit);
  }
  return {mask,depth};
}

export function stateStepDecisionAperture(lattice,step,cursor=0){
  if(!lattice?.ok||!step?.ok){
    return {ok:false,schema:DECISION_APERTURE_SCHEMA,reason:'STATE_LATTICE_AND_STEP_PATH_REQUIRED'};
  }
  const {mask,depth}=stateMaskForPrefix(lattice,step,cursor);
  const vertexByMask=new Map((lattice.vertex_set||[]).map(v=>[Number(v.mask),v]));
  const outgoing=(lattice.edge_set||[]).filter(e=>Number(e.from_mask)===mask);
  const candidates=outgoing.map(e=>{
    const target=vertexByMask.get(Number(e.to_mask));
    return {
      id:'line:'+Number(e.line),
      label:'L'+Number(e.line),
      address:e.address||target?.address||null,
      payload:{
        line:Number(e.line),
        from_mask:Number(e.from_mask),
        to_mask:Number(e.to_mask),
        to_token:target?.token||null,
        to_binary:target?.binary||null
      }
    };
  });
  const plannedLine=step.selected_order?.[depth];
  const plannedId=plannedLine==null?null:'line:'+Number(plannedLine);
  return candidateApertureWitness({
    kind:'STATE_STEP',
    authority:'CALCULATION_ONLY',
    epoch:vertexByMask.get(mask)?.address||('change-lattice://mask/'+mask),
    candidateBasis:'BOOLEAN_LATTICE_OUT_EDGES',
    candidates,
    focusIds:plannedId&&candidates.some(x=>x.id===plannedId)?[plannedId]:[],
    focusBasis:plannedId?'SELECTED_PATH_NEXT':'NONE',
    focusAuthority:'CALCULATION_ONLY',
    focusSemantics:'the selected factoradic path nominates one next line without changing either endpoint or granting host authority',
    plannedId:plannedId&&candidates.some(x=>x.id===plannedId)?plannedId:null,
    commitSemantics:'PATH_SELECTION_ONLY',
    refreshSemantics:'CURSOR_OR_PATH_STEER_RECOMPUTES_FROM_WITNESSED_PREFIX',
    law:'outgoing lines are abstract endpoint-consistent moves in the Boolean change lattice; they are not LIVE forecasts, causal model directions, or permissions'
  });
}

export function nativeForecastDecisionAperture(nativeContext,steering=null){
  const forecasts=Array.isArray(nativeContext?.forecasts)?nativeContext.forecasts:[];
  const candidates=forecasts.map((f,i)=>{
    const slot=Number.isFinite(Number(f?.slot))?Number(f.slot):i;
    return {
      id:'slot:'+slot,
      label:String(f?.verb||'OPEN')+'@'+slot,
      address:'live://forecast/'+String(nativeContext?.seq??'epoch')+'/slot/'+slot,
      payload:{
        slot,
        verb:String(f?.verb||''),
        chain:Number(f?.chain)||1,
        power:Number(f?.power)||0,
        cadence:f?.cadence||null
      }
    };
  });

  let focusIds=[],focusBasis='NONE',focusSemantics='no model-support witness supplied';
  if(steering?.ok){
    const slots=new Set((Array.isArray(steering.candidates)?steering.candidates:[])
      .map(x=>Number(x?.slot)).filter(Number.isFinite));
    const verb=String(steering.verb||steering.top?.mapped_verb||'').toUpperCase();
    focusIds=candidates.filter(x=>slots.size?slots.has(x.payload.slot):(verb&&x.payload.verb.toUpperCase()===verb)).map(x=>x.id);
    focusBasis='STEERING_SUPPORT';
    focusSemantics='model/readout support may narrow attention to already-lawful native forecasts; it does not authorize RELEASE or choose among same-verb slots';
  }

  return candidateApertureWitness({
    kind:'NATIVE_FORECAST',
    authority:String(nativeContext?.authority||'NATIVE_EVIDENCE'),
    epoch:'live://seq/'+String(nativeContext?.seq??'unknown'),
    candidateBasis:'CURRENT_NATIVE_FORECAST_CONTEXT',
    candidates,
    focusIds,
    focusBasis,
    focusAuthority:steering?.ok?'PREVIEW_ONLY':'NONE',
    focusSemantics,
    plannedId:null,
    commitSemantics:'HOST_RELEASE_REQUIRED',
    refreshSemantics:'EVERY_NATIVE_COMMIT_INVALIDATES_THIS_FORECAST_EPOCH',
    law:'native forecasts are host-owned one-epoch affordances; model support may annotate the aperture but cannot inherit effect authority'
  });
}

export function compareDecisionApertures(a,b){
  if(!a?.ok||a.schema!==DECISION_APERTURE_SCHEMA||!b?.ok||b.schema!==DECISION_APERTURE_SCHEMA){
    return {ok:false,schema:DECISION_APERTURE_SCHEMA+'/comparison',reason:'TWO_VALID_DECISION_APERTURES_REQUIRED'};
  }
  return {
    ok:true,
    schema:DECISION_APERTURE_SCHEMA+'/comparison',
    authority:'WITNESS_ONLY',
    left:{kind:a.kind,authority:a.authority,candidates:a.candidate_count,ambiguity_bits:a.candidate_ambiguity_bits,focus:a.focus},
    right:{kind:b.kind,authority:b.authority,candidates:b.candidate_count,ambiguity_bits:b.candidate_ambiguity_bits,focus:b.focus},
    structural_rhyme:[
      'finite candidate set',
      'explicit addressable alternatives',
      'optional narrowing/focus witness',
      'declared commit semantics',
      'declared refresh semantics'
    ],
    non_equivalence:[
      'candidate identity is local to its source system',
      'equal candidate counts do not imply equal meaning, cost, probability, or authority',
      'STATE_STEP selection edits only a calculated trajectory witness',
      'NATIVE_FORECAST commitment requires the LIVE host and refreshes the entire forecast epoch',
      'J-space support is preview evidence, never permission'
    ],
    semantic_equivalence:false,
    authority_equivalence:a.authority===b.authority&&a.commit_semantics===b.commit_semantics,
    law:'compare aperture shape only; never infer semantic, causal, or authority equivalence from structural similarity'
  };
}
