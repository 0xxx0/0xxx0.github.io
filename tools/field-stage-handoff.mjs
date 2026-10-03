#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileCrewHandoff,crewHandoffMarkdown} from '../lib/field-crew-handoff.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FILES={current:'control/CURRENT.json',manifest:'showcase-manifest.json'};
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const text=v=>String(v??'').replace(/\s+/g,' ').trim();
const upper=v=>text(v).toUpperCase();
const clone=v=>JSON.parse(JSON.stringify(v));

function load(){return {C:readJson(FILES.current),M:readJson(FILES.manifest)}}

function exactObject(query,{C,M}){
  const q=text(query);
  if(!q)throw new Error('FIELD_STAGE_SOURCE_REQUIRED');
  const heads=C.current_heads||[],routes=M.routes||M.entries||[];
  const candidates=[];
  const add=(head,route)=>{
    const objectRef=route?.href||head?.route||null;
    if(!objectRef)return;
    if(!candidates.some(x=>x.object_ref===objectRef))candidates.push({object_ref:objectRef,head:head||null,route:route||null});
  };
  for(const h of heads)if([h.route,h.lineage,h.head].some(v=>text(v)===q))add(h,routes.find(r=>r.href===h.route)||null);
  for(const r of routes)if([r.href,r.title].some(v=>text(v)===q))add(heads.find(h=>h.route===r.href)||null,r);
  if(!candidates.length)throw new Error('FIELD_STAGE_UNRESOLVED_SOURCE · exact route/lineage/head/title required: '+q);
  if(candidates.length>1)throw new Error('FIELD_STAGE_AMBIGUOUS_SOURCE · '+q+' → '+candidates.map(x=>x.object_ref).join(', '));
  return candidates[0];
}

function slug(value,index){
  const base=text(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'move';
  return base+'-'+(index+1);
}

function declaredMoves(route={}){
  const rows=[];
  const add=(label,target,origin)=>{
    label=text(label);target=text(target||route.href||'');
    if(!label||!target)return;
    const key=upper(label)+'|'+target;
    if(rows.some(x=>x.key===key)||rows.length>=3)return;
    rows.push({key,label,target,origin});
  };
  if(route.operation)add(route.operation,route.href,'MANIFEST_OPERATION');
  const exits=route?.field?.exit_paths||route?.exit_paths||[];
  if(Array.isArray(exits))for(const x of exits){
    if(rows.length>=3)break;
    if(typeof x==='string'){add(x,route.href,'DECLARED_EXIT');continue}
    if(!x||typeof x!=='object'||upper(x.status)!=='AVAILABLE')continue;
    add(x.label||x.operation||x.verb||x.class||x.id||x.href||x.via,x.href||x.target||route.href,'AVAILABLE_EXIT');
  }
  return rows.map((x,index)=>({
    id:slug(x.label,index),
    label:x.label,
    authority:'OFFER',
    target:x.target,
    reversibility:'UNKNOWN_UNTIL_NATIVE_HOST',
    commit_boundary:'HOST_NATIVE',
    _origin:x.origin
  })).map(({_origin,...move})=>move);
}

function evidenceRefs(object){
  const out=['/control/CURRENT.json','/showcase-manifest.json','/control/SUBMISSION_CONTRACT.json'];
  const h=object.head,r=object.route;
  if(h?.latest_return)out.push(h.latest_return);
  for(const x of (h?.evidence||[]).slice(-3))if(typeof x==='string')out.push(x);
  if(r?.receipt)out.push(r.receipt);
  return [...new Set(out.filter(Boolean))].slice(0,8);
}

function buildSubmission(query,opts={},sources=load()){
  const object=exactObject(query,sources),h=object.head,r=object.route,objectRef=object.object_ref;
  const moves=declaredMoves(r||{}),selected=text(opts.select)||null;
  const title=text(h?.head||r?.title||objectRef);
  const delta=text(opts.delta||h?.next_executable?.objective)||('Continue '+title+' through one bounded native move, TRACE, then RETURN.');
  const refs=evidenceRefs(object);
  return {
    source_ref:'/control/CURRENT.json + /showcase-manifest.json · '+objectRef,
    intent:text(opts.intent)||('Continue the current '+title+' object without reconstructing collaboration state.'),
    object_ref:objectRef,
    contribution_class:upper(opts.contribution||'DELTA'),
    evidence_class:upper(opts.evidence||'SPEC'),
    delta_or_question:delta,
    proof_available:{current_updated:sources.C.updated||null,head:h?{lineage:h.lineage||null,state:h.state||null,version:h.version||null}:null,manifest:r?{href:r.href||null,state:r.state||null,version:r.version||null,operation:r.operation||null}:null,refs},
    contributor_ref:text(opts.contributor)||'field:stage-helper',
    receiver_hint:text(opts.receiver)||'coding-worker:any',
    execution:{moves,selected_move_id:selected,return_to:text(opts.returnTo)||objectRef,evidence_refs:refs}
  };
}

function flag(args,name){const i=args.indexOf(name);if(i<0)return null;const v=args[i+1];if(v==null||String(v).startsWith('--'))throw new Error(name+' requires a value');return v}
function usage(){return `FIELD STAGE HANDOFF · PREP ONLY · authority NONE\n\nnode tools/field-stage-handoff.mjs --source <exact route|CURRENT lineage> [--json]\nnode tools/field-stage-handoff.mjs --source <...> --submission\nnode tools/field-stage-handoff.mjs --source <...> --select <move-id> [--json]\nnode tools/field-stage-handoff.mjs --selftest\n\nOptional: --intent <text> --delta <text> --receiver <label> --contributor <label> --return-to <address>\n\nThis helper resolves exactly one CURRENT/manifest object, derives at most three declared OFFER moves from its manifest operation + AVAILABLE exits, and feeds the existing field-crew-handoff/v0.1 contract. It never executes a move, grants authority, creates NOW, or writes state.\n`;}

function selftest(){
  const sources=load(),fail=[],assert=(ok,msg)=>{if(!ok)fail.push(msg)};
  const head=(sources.C.current_heads||[]).find(h=>h.route)||null;
  assert(!!head,'CURRENT has no addressable head');
  if(head){
    const submission=buildSubmission(head.route,{},sources),handoff=compileCrewHandoff(submission);
    assert(handoff.schema==='field-crew-handoff/v0.1','handoff schema');
    assert(handoff.authority==='NONE / TRANSIENT HANDOFF ONLY','handoff authority');
    assert(handoff.source.object_ref===head.route,'object continuity');
    assert(handoff.hold.moves.length<=3,'move bound');
    assert(handoff.hold.moves.every(m=>m.authority==='OFFER'),'derived move authority');
    assert(handoff.return.target===head.route,'return continuity');
    if(handoff.hold.moves.length){
      const selected=buildSubmission(head.route,{select:handoff.hold.moves[0].id},sources),selectedHandoff=compileCrewHandoff(selected);
      assert(selectedHandoff.status.state==='TURN_READY','selected move state');
      assert(selectedHandoff.authority==='NONE / TRANSIENT HANDOFF ONLY','selection did not acquire authority');
    }
  }
  let unresolved=false;try{buildSubmission('/definitely-not-a-field-route',{},sources)}catch(e){unresolved=String(e.message).includes('UNRESOLVED_SOURCE')}
  assert(unresolved,'unknown source must fail closed');
  if(fail.length){console.error('FIELD STAGE HANDOFF SELFTEST FAIL · '+fail.join(' · '));process.exit(1)}
  console.log('FIELD STAGE HANDOFF SELFTEST PASS · exact object → existing crew handoff · authority NONE');
}

const args=process.argv.slice(2);
if(!args.length||args.includes('--help')){process.stdout.write(usage());process.exit(0)}
if(args.includes('--selftest')){selftest();process.exit(0)}
const source=flag(args,'--source');
if(!source){console.error('FIELD_STAGE_SOURCE_REQUIRED · use --source <exact route|CURRENT lineage>');process.exit(2)}
try{
  const submission=buildSubmission(source,{
    select:flag(args,'--select'),intent:flag(args,'--intent'),delta:flag(args,'--delta'),receiver:flag(args,'--receiver'),contributor:flag(args,'--contributor'),returnTo:flag(args,'--return-to'),contribution:flag(args,'--class'),evidence:flag(args,'--evidence-class')
  });
  if(args.includes('--submission'))process.stdout.write(JSON.stringify(submission,null,2)+'\n');
  else{
    const handoff=compileCrewHandoff(submission);
    process.stdout.write(args.includes('--json')?JSON.stringify(handoff,null,2)+'\n':crewHandoffMarkdown(handoff));
  }
}catch(e){console.error(String(e?.message||e));process.exit(2)}
