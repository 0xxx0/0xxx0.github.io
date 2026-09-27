export const TRACE_SCHEMA = 'field-jlens-trace/v0.1';
export const STEER_SCHEMA = 'field-steering-request/v0.1';
export const RETURN_SCHEMA = 'field-steering-return/v0.1';
export const PULSE_SCHEMA = 'field-pulse/v0.1';

const clone = x => globalThis.structuredClone ? structuredClone(x) : JSON.parse(JSON.stringify(x));
const finite = x => Number.isFinite(Number(x));
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
const tokenText = x => typeof x === 'string' && x.length > 0;

function fail(message){ throw new Error(message); }

export function normalizeTrace(input={}){
  if(input?.schema !== TRACE_SCHEMA) fail('JLENS_TRACE_SCHEMA_REQUIRED');
  const model = input.model || {};
  const lens = input.lens || {};
  if(!nonempty(model.id)) fail('JLENS_MODEL_ID_REQUIRED');
  if(!nonempty(lens.id)) fail('JLENS_LENS_ID_REQUIRED');
  if(!Array.isArray(input.cells) || input.cells.length === 0) fail('JLENS_CELLS_REQUIRED');

  const seen = new Set();
  const cells = input.cells.map((cell,i)=>{
    if(!Number.isInteger(cell?.layer)) fail('JLENS_CELL_LAYER_REQUIRED:'+i);
    if(!Number.isInteger(cell?.position)) fail('JLENS_CELL_POSITION_REQUIRED:'+i);
    const key = `${cell.layer}:${cell.position}`;
    if(seen.has(key)) fail('JLENS_DUPLICATE_CELL:'+key);
    seen.add(key);
    const top = Array.isArray(cell.top) ? cell.top.map((x,j)=>{
      if(!Number.isInteger(x?.token_id)) fail(`JLENS_TOKEN_ID_REQUIRED:${key}:${j}`);
      if(!tokenText(String(x?.token ?? ''))) fail(`JLENS_TOKEN_TEXT_REQUIRED:${key}:${j}`);
      const out = {token_id:x.token_id, token:String(x.token)};
      if(finite(x.logit)) out.logit=Number(x.logit);
      if(Number.isInteger(x.rank)) out.rank=x.rank;
      return out;
    }) : [];
    if(!top.length) fail('JLENS_TOP_REQUIRED:'+key);
    return {
      layer:cell.layer,
      position:cell.position,
      kind:cell.kind === 'MODEL_OUTPUT' ? 'MODEL_OUTPUT' : 'J_LENS',
      top
    };
  }).sort((a,b)=>a.layer-b.layer || a.position-b.position);

  return {
    schema:TRACE_SCHEMA,
    trace_id:nonempty(input.trace_id)?input.trace_id:`${model.id}::${lens.id}::trace`,
    created_at:nonempty(input.created_at)?input.created_at:null,
    model:{id:model.id, revision:model.revision||null, n_layers:Number.isInteger(model.n_layers)?model.n_layers:null},
    lens:{id:lens.id, revision:lens.revision||null, n_prompts:Number.isInteger(lens.n_prompts)?lens.n_prompts:null, d_model:Number.isInteger(lens.d_model)?lens.d_model:null},
    source:{
      prompt:String(input.source?.prompt ?? ''),
      token_count:Number.isInteger(input.source?.token_count)?input.source.token_count:null,
      ...(Array.isArray(input.source?.token_ids)?{token_ids:input.source.token_ids.map((id,i)=>{
        if(!Number.isInteger(id)||id<0) fail('JLENS_SOURCE_TOKEN_ID_INVALID:'+i);
        return id;
      })}:{})
    },
    cells
  };
}

export function cellRef(trace,layer,position){
  const t=normalizeTrace(trace);
  return `jlens://${encodeURIComponent(t.model.id)}/${encodeURIComponent(t.lens.id)}/L${layer}/P${position}`;
}

export function readCell(trace,{layer,position}){
  const t=normalizeTrace(trace);
  const cell=t.cells.find(x=>x.layer===Number(layer)&&x.position===Number(position));
  if(!cell) return null;
  return {...clone(cell),ref:cellRef(t,cell.layer,cell.position),trace_id:t.trace_id,model_id:t.model.id,lens_id:t.lens.id};
}

export function buildSteeringRequest(trace,spec={}){
  const t=normalizeTrace(trace);
  const target=readCell(t,spec.target||{});
  if(!target) fail('STEERING_TARGET_UNRESOLVED');
  const direction=spec.direction||{};
  // A decoded token is an observation, not a causal direction. Require an explicit
  // external direction reference produced by model-side intervention tooling.
  if(!nonempty(direction.ref)) fail('STEERING_DIRECTION_REF_REQUIRED');
  const strength=Number(spec.strength ?? 1);
  if(!Number.isFinite(strength) || strength===0) fail('STEERING_STRENGTH_NONZERO_REQUIRED');
  return {
    schema:STEER_SCHEMA,
    request_id:nonempty(spec.request_id)?spec.request_id:`steer::${t.trace_id}::L${target.layer}P${target.position}`,
    trace_id:t.trace_id,
    model:{...t.model},
    lens:{...t.lens},
    target:{ref:target.ref,layer:target.layer,position:target.position,observed_top:clone(target.top)},
    direction:{
      ref:direction.ref,
      space:direction.space||'RESIDUAL_STREAM',
      label:direction.label||null,
      source:direction.source||'EXTERNAL_INTERVENTION_TOOL'
    },
    operation:spec.operation||'ADD_VECTOR',
    strength,
    authority:'MODEL_INTERVENTION',
    commit_required:true,
    return_required:true,
    annotations:clone(spec.annotations||{})
  };
}

function sameInstrument(a,b){
  return a.model.id===b.model.id && (a.model.revision||null)===(b.model.revision||null) &&
    a.model.n_layers===b.model.n_layers && a.lens.id===b.lens.id &&
    (a.lens.revision||null)===(b.lens.revision||null) &&
    a.lens.n_prompts===b.lens.n_prompts && a.lens.d_model===b.lens.d_model;
}

export function witnessSteering(beforeInput,afterInput,request,execution={}){
  const before=normalizeTrace(beforeInput),after=normalizeTrace(afterInput);
  if(request?.schema!==STEER_SCHEMA) fail('STEERING_REQUEST_SCHEMA_REQUIRED');
  if(request.trace_id!==before.trace_id) fail('STEERING_REQUEST_BEFORE_TRACE_MISMATCH');
  if(!sameInstrument(before,after)) fail('STEERING_INSTRUMENT_MISMATCH');
  const target={layer:request.target.layer,position:request.target.position};
  const b=readCell(before,target),a=readCell(after,target);
  if(!b||!a) fail('STEERING_TARGET_MISSING_FROM_TRACE');
  const b0=b.top[0],a0=a.top[0];
  const observed={
    top_changed:b0.token_id!==a0.token_id,
    before_top:clone(b0),
    after_top:clone(a0),
    before_ref:b.ref,
    after_ref:a.ref
  };
  return {
    schema:RETURN_SCHEMA,
    request_id:request.request_id,
    before_trace_id:before.trace_id,
    after_trace_id:after.trace_id,
    target:{ref:b.ref,layer:b.layer,position:b.position},
    direction:clone(request.direction),
    strength:request.strength,
    execution:{
      receipt_ref:execution.receipt_ref||null,
      committed:execution.committed===true,
      executor:execution.executor||null
    },
    observed,
    causal_claim:execution.committed===true && nonempty(execution.receipt_ref)
      ? 'INTERVENTION_EXECUTED; OBSERVED DELTA RECORDED; CAUSAL INTERPRETATION STILL REQUIRES CONTROLS'
      : 'NO EXECUTION RECEIPT; OBSERVATIONAL COMPARISON ONLY'
  };
}

export function steeringPulse(request,witness,opt={}){
  if(request?.schema!==STEER_SCHEMA) fail('STEERING_REQUEST_SCHEMA_REQUIRED');
  if(witness && witness.schema!==RETURN_SCHEMA) fail('STEERING_RETURN_SCHEMA_REQUIRED');
  return {
    schema:PULSE_SCHEMA,
    source:String(opt.source||'JSPACE_READFIELD'),
    instance:String(opt.instance||request.request_id),
    kind:'steering',
    seq:Number.isInteger(opt.seq)?Math.max(0,opt.seq):1,
    wall:Number.isFinite(Number(opt.wall))?Number(opt.wall):0,
    at:Number.isFinite(Number(opt.at))?Number(opt.at):0,
    data:{
      request_id:request.request_id,
      target_ref:request.target.ref,
      direction_ref:request.direction.ref,
      direction_label:request.direction.label,
      strength:request.strength,
      authority:'NONE',
      model_authority:request.authority,
      observed:witness?clone(witness.observed):null,
      return_ref:witness?.execution?.receipt_ref||null
    }
  };
}
