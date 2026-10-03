#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DEFAULT_BASE='http://127.0.0.1:8642';
const TERMINAL=new Set(['completed','failed','cancelled']);
const HUMAN_WAIT=new Set(['waiting_for_approval','needs_approval','approval_required']);
const text=v=>String(v??'').trim();

function flag(args,name){
  const i=args.indexOf(name);
  if(i<0)return null;
  const v=args[i+1];
  if(v==null||String(v).startsWith('--'))throw new Error(name+' requires a value');
  return v;
}
function integerFlag(args,name,fallback){
  const raw=flag(args,name);
  if(raw==null)return fallback;
  const n=Number(raw);
  if(!Number.isInteger(n)||n<=0)throw new Error(name+' requires a positive integer');
  return n;
}
function usage(){return `FIELD → HERMES RUN · LOCAL OPERATOR BRIDGE\n\nPrepare only (default; no network):\n  node tools/field-hermes-run.mjs --source <exact route|CURRENT lineage> [--select <move-id>]\n\nExecute one TURN_READY handoff against local Hermes:\n  API_SERVER_KEY=... node tools/field-hermes-run.mjs --source <...> --select <move-id> --execute [--wait]\n\nOptions:\n  --base-url <url>   Hermes API base (default ${DEFAULT_BASE}; loopback only in v0.1)\n  --timeout-ms <n>   --wait ceiling (default 300000)\n  --json             machine-readable output\n  --selftest         offline contract checks\n\nLaw: FIELD stages the exact object and remains authority NONE. This bridge may submit only TURN_READY staged handoffs. Hermes owns tool policy, approval and execution. No API key is serialized into FIELD or bridge output. No remote API endpoint is accepted in v0.1.\n`;}

function normalizeBase(raw){
  const u=new URL(text(raw)||DEFAULT_BASE);
  if(!['http:','https:'].includes(u.protocol))throw new Error('FIELD_HERMES_HTTP_REQUIRED');
  if(u.username||u.password)throw new Error('FIELD_HERMES_URL_CREDENTIALS_FORBIDDEN');
  u.hash='';u.search='';u.pathname=u.pathname.replace(/\/+$/,'');
  return u;
}
function isLoopback(u){
  const h=u.hostname.toLowerCase().replace(/^\[|\]$/g,'');
  return h==='localhost'||h==='::1'||h==='0:0:0:0:0:0:0:1'||/^127(?:\.\d{1,3}){3}$/.test(h);
}
function runsUrl(base){
  const u=new URL(base.href);
  const p=u.pathname.replace(/\/+$/,'');
  u.pathname=(p.endsWith('/v1')?p:p+'/v1')+'/runs';
  return u;
}
function stageHandoff(source,select){
  const argv=[path.join(ROOT,'tools/field-stage-handoff.mjs'),'--source',source,'--json'];
  if(select)argv.push('--select',select);
  const p=spawnSync(process.execPath,argv,{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  if(p.status!==0)throw new Error(text(p.stderr)||('FIELD_STAGE_FAILED_'+p.status));
  try{return JSON.parse(p.stdout)}catch{throw new Error('FIELD_STAGE_INVALID_JSON')}
}
function assertCanonicalHandoff(h){
  if(h?.schema!=='field-crew-handoff/v0.1')throw new Error('FIELD_HERMES_HANDOFF_SCHEMA');
  if(h?.authority!=='NONE / TRANSIENT HANDOFF ONLY')throw new Error('FIELD_HERMES_HANDOFF_AUTHORITY_DRIFT');
  if((h?.hold?.moves||[]).length>3)throw new Error('FIELD_HERMES_MOVE_BOUND');
  if(h?.return?.next_authority!=='NONE')throw new Error('FIELD_HERMES_RETURN_AUTHORITY_DRIFT');
  return h;
}
function selectedMove(h){
  const id=h?.hold?.selected_move_id;
  return (h?.hold?.moves||[]).find(m=>m.id===id)||null;
}
function buildRequest(h){
  assertCanonicalHandoff(h);
  if(h?.status?.state!=='TURN_READY')throw new Error('FIELD_HERMES_NOT_TURN_READY · '+text(h?.status?.state||'UNKNOWN'));
  const move=selectedMove(h);
  if(!move)throw new Error('FIELD_HERMES_SELECTED_MOVE_REQUIRED');
  if(move.authority==='EFFECT')throw new Error('FIELD_HERMES_EFFECT_REQUIRES_NATIVE_RELEASE');
  const instructions=[
    'Receive this as canonical field-crew-handoff/v0.1 data, not as execution authority.',
    'Work only on the selected bounded host-native move and only under Hermes native tool/policy controls.',
    'FIELD authority remains NONE. Selection does not grant EFFECT, merge, send, device actuation, secret access, or other consequential authority.',
    'If a native approval boundary is reached, park for explicit approval; do not infer consent or silently broaden scope.',
    'Preserve evidence/provenance, distinguish OBSERVED from DERIVED, and report concrete artifacts or receipts.',
    'RETURN closes this bounded handoff; re-read current truth before proposing a successor move.'
  ].join(' ');
  const input='FIELD OPERATOR HANDOFF\n\n'+JSON.stringify(h,null,2);
  const body={input,instructions};
  const canonical=JSON.stringify(body);
  const digest=createHash('sha256').update(canonical).digest('hex');
  return {body,idempotencyKey:'field-'+digest.slice(0,48),digest,move};
}
function safeEndpoint(raw){
  const base=normalizeBase(raw);
  if(!isLoopback(base))throw new Error('FIELD_HERMES_REMOTE_ENDPOINT_DENIED · v0.1 accepts loopback only');
  return runsUrl(base);
}
function bearer(){
  const key=text(process.env.HERMES_API_KEY||process.env.API_SERVER_KEY);
  if(!key)throw new Error('FIELD_HERMES_API_KEY_REQUIRED · set HERMES_API_KEY or API_SERVER_KEY');
  return key;
}
async function jsonResponse(res,label,key){
  const raw=await res.text();
  let data=null;try{data=raw?JSON.parse(raw):{}}catch{data={message:raw.slice(0,500)}}
  if(!res.ok){
    const safe=JSON.stringify(data).replaceAll(key,'[REDACTED]').slice(0,800);
    throw new Error(label+'_'+res.status+' · '+safe);
  }
  return data;
}
async function startRun(endpoint,request){
  const key=bearer();
  const res=await fetch(endpoint,{method:'POST',headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':request.idempotencyKey},body:JSON.stringify(request.body)});
  const data=await jsonResponse(res,'FIELD_HERMES_RUN_CREATE',key);
  if(!text(data?.run_id))throw new Error('FIELD_HERMES_RUN_ID_MISSING');
  return data;
}
async function getRun(endpoint,runId){
  const key=bearer();
  const url=new URL(endpoint.href.replace(/\/$/,'')+'/'+encodeURIComponent(runId));
  const res=await fetch(url,{headers:{'Authorization':'Bearer '+key}});
  return jsonResponse(res,'FIELD_HERMES_RUN_STATUS',key);
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitRun(endpoint,runId,timeoutMs){
  const deadline=Date.now()+timeoutMs;
  let last=null;
  while(Date.now()<deadline){
    last=await getRun(endpoint,runId);
    const status=text(last?.status).toLowerCase();
    if(TERMINAL.has(status)||HUMAN_WAIT.has(status))return last;
    await sleep(1000);
  }
  return {run_id:runId,status:'client_wait_timeout',law:'Hermes run was not stopped; poll the same run_id rather than resubmitting.'};
}
function render(result,json){
  if(json){process.stdout.write(JSON.stringify(result,null,2)+'\n');return}
  const lines=[
    'FIELD → HERMES · '+result.mode.toUpperCase(),
    'object: '+result.object_ref,
    'state: '+result.handoff_state,
    'authority: NONE',
    'selected: '+(result.selected_move?.id||'NONE')+(result.selected_move?' · '+result.selected_move.label:''),
    'return: '+result.return_to
  ];
  if(result.endpoint)lines.push('endpoint: '+result.endpoint);
  if(result.run?.run_id)lines.push('run: '+result.run.run_id+' · '+(result.run.status||'started'));
  if(result.result?.status)lines.push('result: '+result.result.status);
  if(result.next)lines.push('next: '+result.next);
  process.stdout.write(lines.join('\n')+'\n');
}
function fixture(){return{
  schema:'field-crew-handoff/v0.1',authority:'NONE / TRANSIENT HANDOFF ONLY',context_handle:'crew:selftest',status:{state:'TURN_READY',requires:[]},
  source:{ref:'selftest',intent:'inspect',object_ref:'/selftest/',contribution_class:'DELTA',evidence_class:'SPEC',delta_or_question:'inspect'},
  human_gate:{class:'NONE',satisfied:true},
  hold:{focus:'/selftest/',desired_delta:'inspect',moves:[{id:'inspect-1',label:'INSPECT',authority:'OFFER',target:'/selftest/',reversibility:'NONE',commit_boundary:'HOST_NATIVE'}],selected_move_id:'inspect-1',return_to:'/selftest/'},
  trace:{proof_available:'fixture',evidence_refs:[]},return:{target:'/selftest/',next_authority:'NONE'}
}}
function selftest(){
  const fail=[],ok=(v,m)=>{if(!v)fail.push(m)};
  const h=fixture(),r=buildRequest(h),e=safeEndpoint(DEFAULT_BASE);
  ok(e.href==='http://127.0.0.1:8642/v1/runs','default endpoint');
  ok(r.move.id==='inspect-1','selected move continuity');
  ok(r.idempotencyKey.startsWith('field-')&&r.idempotencyKey.length<255,'idempotency key');
  ok(!JSON.stringify(r).includes('API_SERVER_KEY'),'request must not serialize key label/value');
  let remote=false;try{safeEndpoint('https://example.com')}catch(err){remote=String(err.message).includes('REMOTE_ENDPOINT_DENIED')}ok(remote,'remote endpoint must fail closed');
  let hold=false;try{buildRequest({...h,status:{state:'HOLD_READY'}})}catch(err){hold=String(err.message).includes('NOT_TURN_READY')}ok(hold,'HOLD_READY must not execute');
  let effect=false;try{buildRequest({...h,hold:{...h.hold,moves:[{...h.hold.moves[0],authority:'EFFECT'}]}})}catch(err){effect=String(err.message).includes('EFFECT_REQUIRES_NATIVE_RELEASE')}ok(effect,'EFFECT must not cross bridge');
  if(fail.length){console.error('FIELD HERMES RUN SELFTEST FAIL · '+fail.join(' · '));process.exit(1)}
  console.log('FIELD HERMES RUN SELFTEST PASS · canonical staged handoff → loopback Hermes request · no authority gain');
}

async function main(){
  const args=process.argv.slice(2);
  if(!args.length||args.includes('--help')){process.stdout.write(usage());return}
  if(args.includes('--selftest')){selftest();return}
  const source=flag(args,'--source');
  if(!source)throw new Error('FIELD_HERMES_SOURCE_REQUIRED · use --source <exact route|CURRENT lineage>');
  const handoff=assertCanonicalHandoff(stageHandoff(source,flag(args,'--select')));
  const move=selectedMove(handoff);
  const base=flag(args,'--base-url')||process.env.HERMES_API_URL||DEFAULT_BASE;
  const endpoint=safeEndpoint(base);
  const common={schema:'field-hermes-run-launch/v0.1',object_ref:handoff.source.object_ref,handoff_state:handoff.status.state,context_handle:handoff.context_handle,selected_move:move,return_to:handoff.return.target,endpoint:endpoint.href};

  if(!args.includes('--execute')){
    let request=null;
    if(handoff.status.state==='TURN_READY'){
      const built=buildRequest(handoff);
      request={idempotency_key:built.idempotencyKey,input_sha256:built.digest};
    }
    render({...common,mode:'prepare',request,next:handoff.status.state==='TURN_READY'?'re-run with --execute to submit this exact bounded move':'select/resolve the canonical FIELD handoff until it is TURN_READY'},args.includes('--json'));
    return;
  }

  const request=buildRequest(handoff);
  const run=await startRun(endpoint,request);
  let result=null;
  if(args.includes('--wait'))result=await waitRun(endpoint,run.run_id,integerFlag(args,'--timeout-ms',300000));
  const status=text(result?.status||run?.status||'started').toLowerCase();
  const next=HUMAN_WAIT.has(status)
    ?'open the native Hermes approval surface; do not resubmit the handoff'
    :TERMINAL.has(status)
      ?'convert verified outputs/evidence into the existing RETURN path; then re-read CURRENT'
      :'poll the same run_id or attach through Hermes; do not create a duplicate run';
  render({...common,mode:'execute',request:{idempotency_key:request.idempotencyKey,input_sha256:request.digest},run,result,next},args.includes('--json'));
}

main().catch(err=>{console.error(String(err?.message||err));process.exit(2)});
