#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FILES={
  current:'control/CURRENT.json',
  manifest:'showcase-manifest.json',
  protocol:'control/SOURCE_HOLD_TURN_TRACE_RETURN.json'
};
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const one=v=>String(v??'').replace(/\s+/g,' ').trim();
const token=v=>one(v).toUpperCase();
const compact=v=>v==null?null:JSON.parse(JSON.stringify(v));

function load(){return {C:readJson(FILES.current),M:readJson(FILES.manifest),P:readJson(FILES.protocol)}}

function routeMoves(route={}){
  const out=[];
  const add=(label,target=null,kind='DECLARED_OPERATION')=>{
    label=one(label);if(!label)return;
    const key=label.toUpperCase()+'|'+String(target||'');
    if(out.some(x=>x.key===key))return;
    out.push({key,label,target,kind,authority:'HOST_NATIVE_REQUIRED'});
  };
  const op=one(route.operation);
  if(op)for(const part of op.split(/\s*(?:\/|·|\||,)\s*/).filter(Boolean))add(part,route.href||null,'MANIFEST_OPERATION');
  const exits=route?.field?.exit_paths||route?.exit_paths||[];
  if(Array.isArray(exits))for(const x of exits){
    if(typeof x==='string')add(x,x,'DECLARED_EXIT');
    else if(x&&typeof x==='object')add(x.label||x.operation||x.verb||x.id||x.href,x.href||x.target||null,'DECLARED_EXIT');
  }
  return out.slice(0,3).map(({key,...x})=>x);
}

function candidatesFor(query,{C,M}){
  const q=one(query);
  if(!q)throw new Error('UNRESOLVED_SOURCE · --source requires one exact route, lineage, or unique head label');
  const heads=C.current_heads||[],routes=M.routes||M.entries||[];
  const exactHeads=heads.filter(h=>h.route===q||h.lineage===q||h.head===q);
  const exactRoutes=routes.filter(r=>r.href===q||r.title===q);
  let pairs=[];
  if(exactHeads.length)for(const h of exactHeads){const r=routes.find(x=>x.href===h.route)||null;pairs.push({head:h,route:r});}
  if(exactRoutes.length)for(const r of exactRoutes){const h=heads.find(x=>x.route===r.href)||null;pairs.push({head:h,route:r});}
  if(!pairs.length){
    const needle=q.toLowerCase();
    for(const h of heads){if([h.route,h.lineage,h.head].some(v=>String(v||'').toLowerCase().includes(needle)))pairs.push({head:h,route:routes.find(x=>x.href===h.route)||null});}
    for(const r of routes){if([r.href,r.title].some(v=>String(v||'').toLowerCase().includes(needle)))pairs.push({head:heads.find(x=>x.route===r.href)||null,route:r});}
  }
  const uniq=[];
  for(const p of pairs){const id=p.route?.href||p.head?.route||p.head?.lineage;if(id&&!uniq.some(x=>(x.route?.href||x.head?.route||x.head?.lineage)===id))uniq.push(p);}
  if(!uniq.length)throw new Error('UNRESOLVED_SOURCE · no CURRENT/manifest object matches '+q);
  if(uniq.length>1)throw new Error('UNRESOLVED_SOURCE · ambiguous '+q+' → '+uniq.map(x=>x.route?.href||x.head?.route||x.head?.lineage).join(', '));
  return uniq[0];
}

function buildOperation(query,sources=load()){
  const {C,M,P}=sources,{head,route}=candidatesFor(query,sources);
  const objectId=route?.href||head?.route||head?.lineage;
  const owner=route?.field?.owner||route?.owner||objectId;
  const moves=routeMoves(route||{});
  const provenance=[
    '/'+FILES.current+'#current_heads',
    '/'+FILES.manifest+'#'+objectId,
    '/'+FILES.protocol
  ];
  const before={
    current_updated:C.updated||null,
    head:head?{lineage:head.lineage||null,route:head.route||null,head:head.head||null,state:head.state||null,version:head.version||null}:null,
    manifest:route?{href:route.href||null,title:route.title||null,state:route.state||null,version:route.version||null,operation:route.operation||null}:null
  };
  const returnFields=P.return_schema?.required_fields||[];
  const ret=Object.fromEntries(returnFields.map(k=>[k,null]));
  Object.assign(ret,{source_object:objectId,host:owner,before:compact(before),evidence_refs:[],unknowns:[],unresolved_gate:null,return_address:objectId,next_authority:'NONE'});
  return {
    schema:'field-operation-packet/v0.1',
    authority:'NONE',
    mode:'STAGED_NOT_EXECUTED',
    protocol_ref:'/'+FILES.protocol,
    source:{
      object_id:objectId,
      owner,
      provenance,
      state_before:before,
      desired_delta:null,
      return_address:objectId
    },
    hold:{
      focus:objectId,
      objective:head?.next_executable?.objective||null,
      candidate_moves:moves,
      selected_turn:null,
      acceptance_checks:[],
      commit_boundary:null,
      reversibility:null,
      stop_condition:moves.length?'NONE':'TURN_UNSUPPORTED_UNTIL_NATIVE_MOVE_IS_EXPLICIT',
      exact_return:objectId
    },
    turn:{status:'NOT_EXECUTED',selected_move:null,target:objectId,turn_ref:null,native_result:null},
    trace:{status:'NOT_RUN',observed_delta:null,evidence_refs:[],claims:{observed:[],derived:[],unknown:[]}},
    return:ret,
    declared_next:head?.next_executable?compact(head.next_executable):null,
    laws:[
      'This packet stages one explicit object; it never creates NOW, priority, permission, or effect authority.',
      'Manifest operation labels and exits are candidate host-native apertures, not permission to execute.',
      'HOLD exposes at most three candidates; caller must select exactly one TURN.',
      'EFFECT requires explicit host-native RELEASE/commit outside this tool.',
      'TRACE must distinguish OBSERVED / DERIVED / UNKNOWN.',
      'RETURN is mandatory for changed, unchanged, failed, blocked, or unknown outcomes.',
      'After RETURN, next_authority remains NONE and CURRENT must be re-read.'
    ]
  };
}

function validateOperation(p,protocol=readJson(FILES.protocol)){
  const errors=[],warnings=[];
  const req=(ok,msg)=>{if(!ok)errors.push(msg)};
  req(p&&typeof p==='object'&&!Array.isArray(p),'PACKET_OBJECT_REQUIRED');
  if(errors.length)return {schema:'field-operation-validation/v0.1',status:'FAIL',authority:'NONE',errors,warnings};
  req(p.schema==='field-operation-packet/v0.1','SCHEMA');
  req(one(p.source?.object_id),'SOURCE_OBJECT');
  req(one(p.source?.owner),'SOURCE_OWNER');
  req(one(p.source?.return_address),'SOURCE_RETURN_ADDRESS');
  const moves=p.hold?.candidate_moves||[];
  req(Array.isArray(moves),'HOLD_MOVES_ARRAY');
  req(moves.length<=3,'HOLD_MAX_3_MOVES');
  req(one(p.hold?.focus),'HOLD_FOCUS');
  req(one(p.hold?.exact_return),'HOLD_EXACT_RETURN');
  const turnStatus=token(p.turn?.status||'NOT_EXECUTED');
  const turnRecorded=turnStatus!=='NOT_EXECUTED';
  if(turnRecorded)req(one(p.hold?.selected_turn||p.turn?.selected_move),'TURN_SELECTED');
  const traceStatus=token(p.trace?.status||'NOT_RUN');
  req(['NOT_RUN','PASS','FAIL','INDETERMINATE'].includes(traceStatus),'TRACE_STATUS');
  if(traceStatus==='PASS')req(Array.isArray(p.trace?.evidence_refs)&&p.trace.evidence_refs.length>0,'TRACE_PASS_REQUIRES_EVIDENCE');
  const result=p.return?.result_status;
  if(result!=null){
    req((protocol.return_schema?.status_enum||[]).includes(result),'RETURN_STATUS');
    for(const k of protocol.return_schema?.required_fields||[])req(Object.prototype.hasOwnProperty.call(p.return||{},k),'RETURN_FIELD_'+k);
    req(turnRecorded,'RETURN_REQUIRES_TURN_OR_STOP_RECORD');
    req(traceStatus!=='NOT_RUN','RETURN_REQUIRES_TRACE');
    req(p.return?.next_authority==='NONE','RETURN_NEXT_AUTHORITY_NONE');
    req(one(p.return?.turn_ref),'RETURN_TURN_REF');
    req(one(p.return?.return_address),'RETURN_ADDRESS');
    req(one(p.return?.closed_at),'RETURN_CLOSED_AT');
    req(p.return?.source_object===p.source?.object_id,'RETURN_SOURCE_MATCH');
    req(p.return?.host===p.source?.owner,'RETURN_HOST_MATCH');
    req(p.return?.return_address===p.hold?.exact_return&&p.return?.return_address===p.source?.return_address,'RETURN_ADDRESS_MATCH');
    if(p.turn?.turn_ref!=null)req(p.return?.turn_ref===p.turn?.turn_ref,'RETURN_TURN_REF_MATCH');
    req(Array.isArray(p.return?.evidence_refs),'RETURN_EVIDENCE_ARRAY');
    req(Array.isArray(p.return?.unknowns),'RETURN_UNKNOWNS_ARRAY');
    if(p.return?.after==null)req(Array.isArray(p.return?.unknowns)&&p.return.unknowns.length>0,'RETURN_AFTER_NULL_REQUIRES_UNKNOWN');
    if(result==='CHANGED')req(one(p.return?.observed_delta),'RETURN_CHANGED_REQUIRES_DELTA');
  }else warnings.push('RETURN_OPEN');
  if(!moves.length)warnings.push('NO_NATIVE_MOVE_DECLARED');
  if(p.authority!=='NONE')errors.push('PACKET_AUTHORITY_MUST_BE_NONE');
  return {schema:'field-operation-validation/v0.1',status:errors.length?'FAIL':'PASS',authority:'NONE',errors,warnings};
}

function markdown(p){
  const lines=['# FIELD OPERATION','authority: NONE','mode: '+p.mode,'','## SOURCE',
    '- object: '+p.source.object_id,'- owner: '+p.source.owner,'- desired_delta: '+(p.source.desired_delta||'UNSET'),
    '','## HOLD','- focus: '+p.hold.focus,'- candidates: '+(p.hold.candidate_moves.length||0)];
  for(const [i,m] of p.hold.candidate_moves.entries())lines.push('  '+(i+1)+'. '+m.label+' · '+m.authority+(m.target?' · '+m.target:''));
  lines.push('- selected_turn: '+(p.hold.selected_turn||'UNSET'),'- stop: '+(p.hold.stop_condition||'NONE'),'','## TURN','- '+p.turn.status,
    '','## TRACE','- '+p.trace.status,'','## RETURN','- address: '+p.return.return_address,'- next_authority: NONE','');
  return lines.join('\n');
}

function usage(){return `FIELD OPERATION · authority NONE\n\nnode tools/field-operation.mjs --source <route|lineage> [--markdown]\nnode tools/field-operation.mjs --validate <packet.json>\nnode tools/field-operation.mjs --selftest\n\nStages one exact CURRENT/manifest object into SOURCE → HOLD → TURN → TRACE → RETURN.\nIt never executes, mutates, merges, sends, or grants host authority.\n`;}

function selftest(){
  const sources=load();
  const root=buildOperation('/',sources);
  const fail=[];
  const assert=(ok,msg)=>{if(!ok)fail.push(msg)};
  assert(root.authority==='NONE','packet authority');
  assert(root.source.object_id==='/','root source resolution');
  assert(root.hold.candidate_moves.length<=3,'move bound');
  assert(root.return.next_authority==='NONE','return next authority');
  const open=validateOperation(root,sources.P);
  assert(open.status==='PASS','open staged packet validates');
  assert(open.warnings.includes('RETURN_OPEN'),'open return warning');
  const closed=compact(root);
  closed.hold.selected_turn=closed.hold.candidate_moves[0]?.label||'HOST_NATIVE_TEST';
  closed.turn={status:'ATTEMPTED',selected_move:closed.hold.selected_turn,target:'/',turn_ref:'selftest:turn',native_result:'UNCHANGED'};
  closed.trace={status:'PASS',observed_delta:'selftest no-op',evidence_refs:['selftest:fixture'],claims:{observed:['fixture'],derived:[],unknown:[]}};
  Object.assign(closed.return,{result_status:'UNCHANGED',turn_ref:'selftest:turn',after:closed.return.before,observed_delta:'selftest no-op',evidence_refs:['selftest:fixture'],residue:'validator exercised',unknowns:[],unresolved_gate:null,closed_at:'2000-01-01T00:00:00Z',next_authority:'NONE'});
  const done=validateOperation(closed,sources.P);
  assert(done.status==='PASS','closed packet validates');
  const overflow=compact(root);overflow.hold.candidate_moves=[1,2,3,4].map((n)=>({label:'M'+n}));
  assert(validateOperation(overflow,sources.P).status==='FAIL','>3 moves fail');
  const bad=compact(closed);bad.return.next_authority='GO';
  assert(validateOperation(bad,sources.P).status==='FAIL','next authority fails');
  const ghost=compact(closed);ghost.turn.status='NOT_EXECUTED';
  assert(validateOperation(ghost,sources.P).status==='FAIL','closed return requires turn/stop record');
  const untraced=compact(closed);untraced.trace.status='NOT_RUN';
  assert(validateOperation(untraced,sources.P).status==='FAIL','closed return requires TRACE');
  const spoof=compact(closed);spoof.return.source_object='/other';
  assert(validateOperation(spoof,sources.P).status==='FAIL','return cannot change source identity');
  const afterless=compact(closed);afterless.return.after=null;afterless.return.unknowns=[];
  assert(validateOperation(afterless,sources.P).status==='FAIL','null after requires explicit unknown');
  if(fail.length){console.error('FIELD OPERATION SELFTEST FAIL · '+fail.join(' · '));process.exit(1)}
  console.log('FIELD OPERATION SELFTEST PASS · SOURCE/HOLD/TURN/TRACE/RETURN staged without authority');
}

const args=process.argv.slice(2);
if(args.includes('--help')||!args.length){process.stdout.write(usage());process.exit(0)}
if(args.includes('--selftest')){selftest();process.exit(0)}
const sourceAt=args.indexOf('--source'),validateAt=args.indexOf('--validate');
if(sourceAt>=0&&validateAt>=0){console.error('choose one: --source or --validate');process.exit(2)}
if(sourceAt>=0){
  const q=args[sourceAt+1];if(!q||q.startsWith('--')){console.error('UNRESOLVED_SOURCE · --source requires one route or lineage');process.exit(2)}
  try{const p=buildOperation(q);process.stdout.write(args.includes('--markdown')?markdown(p)+'\n':JSON.stringify(p,null,2)+'\n')}
  catch(e){console.error(String(e?.message||e));process.exit(2)}
}else if(validateAt>=0){
  const file=args[validateAt+1];if(!file||file.startsWith('--')){console.error('--validate requires a JSON packet');process.exit(2)}
  try{const out=validateOperation(readJson(path.relative(ROOT,path.resolve(file))));process.stdout.write(JSON.stringify(out,null,2)+'\n');if(out.status!=='PASS')process.exitCode=1}
  catch(e){console.error(String(e?.message||e));process.exit(2)}
}else{console.error(usage());process.exit(2)}
