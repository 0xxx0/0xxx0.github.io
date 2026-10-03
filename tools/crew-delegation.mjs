#!/usr/bin/env node
import fs from 'node:fs';

const SCHEMA='field-crew-delegation/v0.1';
const EFFECTS=['NONE','LOCAL','REPO_BRANCH','REPO_PUBLIC','EXTERNAL','IRREVERSIBLE'];
const effectRank=x=>EFFECTS.indexOf(String(x||'').toUpperCase());
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const token=x=>String(x??'').trim().toUpperCase().replace(/[\s-]+/g,'_');
const arr=x=>Array.isArray(x)?x:[];

function glob(pattern,value){
  pattern=String(pattern??''); value=String(value??'');
  if(pattern==='*')return true;
  const esc=pattern.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*');
  return new RegExp('^'+esc+'$').test(value);
}

function validateLease(lease){
  const errors=[];
  if(!lease||typeof lease!=='object'||Array.isArray(lease))return ['lease must be an object'];
  if(lease.schema!==SCHEMA)errors.push('schema must equal '+SCHEMA);
  for(const k of ['lease_id','issuer','issued_at','principals','resources','allow_actions','deny_actions','side_effect_ceiling','require_reversible','stop_conditions','transfer']){
    if(lease[k]===undefined||lease[k]===null)errors.push('missing '+k);
  }
  if(!lease.issuer||typeof lease.issuer!=='object'||!String(lease.issuer.ref||'').trim())errors.push('issuer.ref required');
  for(const k of ['principals','resources','allow_actions','deny_actions','stop_conditions'])if(!Array.isArray(lease[k]))errors.push(k+' must be an array');
  if(effectRank(lease.side_effect_ceiling)<0)errors.push('invalid side_effect_ceiling');
  if(typeof lease.require_reversible!=='boolean')errors.push('require_reversible must be boolean');
  if(lease.transfer!=='NON_DELEGABLE')errors.push('transfer must be NON_DELEGABLE in v0.1');
  if(lease.expires_at!=null&&Number.isNaN(Date.parse(lease.expires_at)))errors.push('expires_at must be ISO timestamp or null');
  if(Number.isNaN(Date.parse(lease.issued_at)))errors.push('issued_at must be ISO timestamp');
  return [...new Set(errors)];
}

function checkBack(lease,request,decision,reason){
  const issuer=lease?.issuer?.ref||'UNKNOWN_ISSUER';
  const side=token(request?.context?.side_effect||'UNKNOWN');
  const rev=request?.context?.reversible===true?'REVERSIBLE':request?.context?.reversible===false?'NOT_REVERSIBLE':'REVERSIBILITY_UNKNOWN';
  return `LEASE ${lease?.lease_id||'UNKNOWN'} · ${issuer} → ${request?.principal||'UNKNOWN_PRINCIPAL'} · ${request?.action||'UNKNOWN_ACTION'} @ ${request?.resource||'UNKNOWN_RESOURCE'} · ${side} · ${rev} · ${decision}: ${reason}`;
}

export function evaluate(lease,request,now=new Date()){
  const errors=validateLease(lease);
  if(errors.length)return {schema:'field-crew-delegation-decision/v0.1',decision:'DENY',reason:'INVALID_LEASE',errors,authority:'NONE / INVALID LEASE',check_back:checkBack(lease,request,'DENY','INVALID_LEASE')};
  if(!request||typeof request!=='object'||Array.isArray(request))return {schema:'field-crew-delegation-decision/v0.1',decision:'ESCALATE',reason:'REQUEST_REQUIRED',authority:'NONE',check_back:checkBack(lease,request,'ESCALATE','REQUEST_REQUIRED')};
  const action=token(request.action),principal=String(request.principal||''),resource=String(request.resource||'');
  const side=token(request.context?.side_effect),sideRank=effectRank(side),ceilingRank=effectRank(lease.side_effect_ceiling);
  const flags=arr(request.context?.flags).map(token);
  let decision='ALLOW',reason='LEASE_SCOPE_MATCH';
  if(lease.revoked===true){decision='DENY';reason='LEASE_REVOKED'}
  else if(lease.expires_at&&now.getTime()>Date.parse(lease.expires_at)){decision='DENY';reason='LEASE_EXPIRED'}
  else if(arr(lease.deny_actions).map(token).includes(action)){decision='DENY';reason='ACTION_EXPLICITLY_DENIED'}
  else if(!arr(lease.principals).some(x=>glob(x,principal))){decision='ESCALATE';reason='PRINCIPAL_OUT_OF_SCOPE'}
  else if(!arr(lease.resources).some(x=>glob(x,resource))){decision='ESCALATE';reason='RESOURCE_OUT_OF_SCOPE'}
  else if(!arr(lease.allow_actions).map(token).includes(action)){decision='ESCALATE';reason='ACTION_NOT_PREAUTHORIZED'}
  else if(sideRank<0){decision='ESCALATE';reason='SIDE_EFFECT_UNKNOWN'}
  else if(sideRank>ceilingRank){decision='ESCALATE';reason='SIDE_EFFECT_EXCEEDS_CEILING'}
  else if(lease.require_reversible===true&&request.context?.reversible!==true){decision='ESCALATE';reason='REVERSIBILITY_NOT_PROVED'}
  else {
    const hit=arr(lease.stop_conditions).map(token).find(x=>flags.includes(x));
    if(hit){decision='ESCALATE';reason='STOP_CONDITION_'+hit}
  }
  return {
    schema:'field-crew-delegation-decision/v0.1',
    lease_id:lease.lease_id,
    decision,reason,
    request:{principal,action,resource,context:{side_effect:side||null,reversible:request.context?.reversible??null,flags}},
    lease_scope:{principals:lease.principals,resources:lease.resources,allow_actions:lease.allow_actions,deny_actions:lease.deny_actions,side_effect_ceiling:lease.side_effect_ceiling,require_reversible:lease.require_reversible,expires_at:lease.expires_at??null,transfer:lease.transfer},
    authority:decision==='ALLOW'?'ISSUER_SCOPED_MATCH_ONLY / NATIVE HOST STILL REQUIRED':'NONE UNTIL FRESH EXPLICIT AUTHORIZATION',
    effects:'NONE / REDUCER ONLY',
    trace_return_required:true,
    check_back:checkBack(lease,request,decision,reason)
  };
}

function example(){
  return {
    lease:{
      schema:SCHEMA,lease_id:'crew-demo-01',issuer:{kind:'human',ref:'conversation:explicit-grant'},issued_at:'2026-10-03T08:30:00+08:00',expires_at:'2026-10-03T12:00:00+08:00',revoked:false,
      principals:['agent:codex','agent:chatgpt'],resources:['repo:0xxx0/0xxx0.github.io/*'],
      allow_actions:['READ','COMPARE','RUN_CHECKS','WRITE_BRANCH','OPEN_PR'],deny_actions:['MONEY_MOVEMENT','DELETE_HISTORY'],
      side_effect_ceiling:'REPO_BRANCH',require_reversible:true,stop_conditions:['TARGET_DRIFT','SENSITIVE_DATA','AUTHORITY_CONFLICT'],transfer:'NON_DELEGABLE'
    },
    request:{principal:'agent:chatgpt',action:'WRITE_BRANCH',resource:'repo:0xxx0/0xxx0.github.io/field-intake',context:{side_effect:'REPO_BRANCH',reversible:true,flags:[]}}
  };
}

function selftest(){
  const e=example(),tests=[];
  const at=new Date('2026-10-03T09:00:00+08:00');
  tests.push(['allow bounded branch write',evaluate(e.lease,e.request,at).decision==='ALLOW']);
  tests.push(['public publish escalates',evaluate(e.lease,{...e.request,action:'PUBLIC_PUBLISH',context:{...e.request.context,side_effect:'REPO_PUBLIC'}},at).decision==='ESCALATE']);
  tests.push(['explicit deny wins',evaluate(e.lease,{...e.request,action:'MONEY_MOVEMENT',context:{...e.request.context,side_effect:'EXTERNAL'}},at).decision==='DENY']);
  tests.push(['resource mismatch escalates',evaluate(e.lease,{...e.request,resource:'repo:elsewhere/project'},at).decision==='ESCALATE']);
  tests.push(['unknown reversibility escalates',evaluate(e.lease,{...e.request,context:{...e.request.context,reversible:null}},at).decision==='ESCALATE']);
  tests.push(['stop flag escalates',evaluate(e.lease,{...e.request,context:{...e.request.context,flags:['TARGET_DRIFT']}},at).reason==='STOP_CONDITION_TARGET_DRIFT']);
  tests.push(['expired denies',evaluate(e.lease,e.request,new Date('2026-10-03T13:00:00+08:00')).decision==='DENY']);
  tests.push(['task auth state does not mint action',evaluate(e.lease,{...e.request,action:'AUTH_REQUIRED',context:{...e.request.context,flags:['A2A_TASK_AUTH_REQUIRED']}},at).decision==='ESCALATE']);
  tests.push(['nondelegable enforced',evaluate({...e.lease,transfer:'DELEGABLE'},e.request,at).decision==='DENY']);
  const failed=tests.filter(([,ok])=>!ok);
  if(failed.length){console.error('CREW DELEGATION FAIL · '+failed.map(([n])=>n).join(' · '));process.exit(1)}
  console.log('CREW DELEGATION PASS · '+tests.length+'/'+tests.length);
}

const args=process.argv.slice(2);
if(args.includes('--selftest'))selftest();
else if(args.includes('--example'))process.stdout.write(JSON.stringify(example(),null,2)+'\n');
else {
  const li=args.indexOf('--lease'),ri=args.indexOf('--request');
  if(li<0||ri<0||!args[li+1]||!args[ri+1]){
    console.error('usage: node tools/crew-delegation.mjs --lease <lease.json> --request <request.json> | --example | --selftest');
    process.exit(2);
  }
  try{process.stdout.write(JSON.stringify(evaluate(read(args[li+1]),read(args[ri+1])),null,2)+'\n')}
  catch(e){console.error(String(e?.message||e));process.exit(2)}
}
