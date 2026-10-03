#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FILES={current:'control/CURRENT.json',manifest:'showcase-manifest.json',glyph:'field-glyph.js'};
const text=v=>String(v??'').replace(/\s+/g,' ').trim();
const arr=v=>Array.isArray(v)?v:[];

function readJson(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'))}
function load(){return {current:readJson(FILES.current),manifest:readJson(FILES.manifest)}}
function routesOf(manifest){return arr(manifest?.routes||manifest?.entries)}
function routeFor(href,manifest){return routesOf(manifest).find(r=>r?.href===href)||null}
function headFor(href,current){return arr(current?.current_heads).find(h=>h?.route===href)||null}

function fieldGlyph(){
  const source=fs.readFileSync(path.join(ROOT,FILES.glyph),'utf8');
  const sandbox={window:{}};
  vm.runInNewContext(source,sandbox,{filename:FILES.glyph,timeout:1000});
  if(!sandbox.window.FieldGlyph)throw new Error('FIELD_TERMINAL_GLYPH_API_MISSING');
  return sandbox.window.FieldGlyph;
}
const FG=fieldGlyph();

function flag(args,name){
  const i=args.indexOf(name);
  if(i<0)return null;
  const v=args[i+1];
  if(v==null||String(v).startsWith('--'))throw new Error(name+' requires a value');
  return v;
}
function usage(){return `FIELD TERMINAL LENS · PROJECTION ONLY · authority NONE\n\nOverview of canonical CURRENT heads:\n  node tools/field-terminal-lens.mjs [--heads] [--ascii] [--json]\n\nExact held object via the canonical FIELD stage compiler:\n  node tools/field-terminal-lens.mjs --source <exact route|CURRENT lineage> [--select <move-id>] [--ascii] [--json]\n\nChecks:\n  node tools/field-terminal-lens.mjs --selftest\n\nGlyphs compress recognition only. Address, label, state, moves and RETURN remain textual. This lens never writes, executes, grants authority, or creates a second FIELD state surface.\n`;}

function glyphRoute(route={},head={}){
  return {
    kind:text(route.kind)||'route',
    operation:text(route.operation)||'ADDRESS',
    state:text(head.state||route.state)||'REFERENCE'
  };
}
function glyphToken(route,head,ascii=false){
  const r=glyphRoute(route,head);
  if(ascii)return '['+r.kind+'/'+r.operation+']';
  return FG.mnemonic(r);
}
function overviewModel(sources,ascii=false){
  const rows=[];
  for(const head of arr(sources.current.current_heads)){
    if(!text(head?.route))continue;
    const route=routeFor(head.route,sources.manifest)||{href:head.route,title:head.lineage||head.head||head.route,kind:'route',operation:'ADDRESS',state:head.state};
    rows.push({
      token:glyphToken(route,head,ascii),
      address:head.route,
      lineage:text(head.lineage)||null,
      label:text(route.title||head.head||head.lineage||head.route),
      state:text(head.state||route.state)||'UNKNOWN',
      operation:text(route.operation)||'ADDRESS',
      kind:text(route.kind)||'route',
      evidence_count:arr(head.evidence).length,
      latest_return:head.latest_return||null,
      next:head.next_executable?{id:head.next_executable.id||null,state:head.next_executable.state||null,objective:head.next_executable.objective||null}:null
    });
  }
  return {schema:'field-terminal-lens/v0.1',mode:'heads',projection:'TERMINAL',authority:'NONE',updated:sources.current.updated||null,rows};
}
function renderOverview(model){
  const out=['FIELD·TTY · HEADS · PROJECTION_ONLY','authority: NONE · canonical: CURRENT + manifest',''];
  if(!model.rows.length)out.push('— no addressable CURRENT heads');
  for(const r of model.rows){
    out.push(r.token+'  '+r.address+'  '+r.label);
    out.push('   state='+r.state+' · op='+r.operation+' · '+(r.next?'next='+(r.next.state||r.next.id||'DECLARED'):'next=—')+' · evidence='+r.evidence_count);
  }
  out.push('','HOLD one exact address/lineage to expose ≤3 canonical native moves.');
  return out.join('\n')+'\n';
}

function stage(source,selected){
  const argv=[path.join(ROOT,'tools/field-stage-handoff.mjs'),'--source',source,'--json'];
  if(selected)argv.push('--select',selected);
  const p=spawnSync(process.execPath,argv,{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  if(p.status!==0)throw new Error(text(p.stderr)||'FIELD_TERMINAL_STAGE_FAILED');
  try{return JSON.parse(p.stdout)}catch{throw new Error('FIELD_TERMINAL_STAGE_INVALID_JSON')}
}
function assertCanonical(h){
  if(h?.schema!=='field-crew-handoff/v0.1')throw new Error('FIELD_TERMINAL_HANDOFF_SCHEMA_DRIFT');
  if(h?.authority!=='NONE / TRANSIENT HANDOFF ONLY')throw new Error('FIELD_TERMINAL_AUTHORITY_DRIFT');
  if(arr(h?.hold?.moves).length>3)throw new Error('FIELD_TERMINAL_MOVE_BOUND');
  if(h?.return?.next_authority!=='NONE')throw new Error('FIELD_TERMINAL_RETURN_AUTHORITY_DRIFT');
  return h;
}
function shellQuote(v){return "'"+String(v).replaceAll("'","'\\''")+"'"}
function exactModel(source,selected,sources,ascii=false){
  const h=assertCanonical(stage(source,selected));
  const route=routeFor(h.source.object_ref,sources.manifest)||{href:h.source.object_ref,title:h.source.object_ref,kind:'route',operation:'ADDRESS'};
  const head=headFor(h.source.object_ref,sources.current)||{};
  const selectedMove=arr(h.hold.moves).find(m=>m.id===h.hold.selected_move_id)||null;
  const hermes=selectedMove&&h.status.state==='TURN_READY'
    ?'node tools/field-hermes-run.mjs --source '+shellQuote(source)+' --select '+shellQuote(selectedMove.id)
    :null;
  return {
    schema:'field-terminal-lens/v0.1',mode:'object',projection:'TERMINAL',authority:'NONE',
    token:glyphToken(route,head,ascii),
    object:{address:h.source.object_ref,label:text(route.title||head.head||head.lineage||h.source.object_ref),state:text(head.state||route.state)||'UNKNOWN',kind:text(route.kind)||'route',operation:text(route.operation)||'ADDRESS'},
    handoff:{context_handle:h.context_handle,state:h.status.state,human_gate:h.human_gate,desired_delta:h.hold.desired_delta,moves:h.hold.moves,selected_move_id:h.hold.selected_move_id,evidence_refs:h.trace.evidence_refs,return_to:h.return.target},
    hermes_prepare:hermes
  };
}
function renderExact(m){
  const h=m.handoff,out=['FIELD·TTY · OBJECT · PROJECTION_ONLY','authority: NONE',''];
  out.push('HOLD');
  out.push('  '+m.token+'  '+m.object.address+'  '+m.object.label);
  out.push('  state='+m.object.state+' · kind='+m.object.kind+' · op='+m.object.operation+' · handoff='+h.state);
  out.push('','TURN');
  if(!h.moves.length)out.push('  — no declared native moves');
  h.moves.forEach((move,i)=>{
    const selected=h.selected_move_id===move.id;
    out.push('  '+(selected?'▸':'·')+' '+(i+1)+' '+move.id+' · '+move.label+' ['+move.authority+'] → '+move.target);
    out.push('      commit='+move.commit_boundary+' · reverse='+move.reversibility);
  });
  out.push('','TRACE');
  out.push('  gate='+text(h.human_gate?.class||'UNSPECIFIED')+' · '+(h.human_gate?.satisfied?'SATISFIED':'OPEN')+' · evidence='+arr(h.evidence_refs).length);
  if(text(h.desired_delta))out.push('  delta='+text(h.desired_delta));
  out.push('','RETURN');
  out.push('  ↩ '+h.return_to+' · next_authority NONE');
  if(m.hermes_prepare){
    out.push('','EXECUTOR · explicit handoff only');
    out.push('  '+m.hermes_prepare);
  }
  return out.join('\n')+'\n';
}

function selftest(){
  const fail=[],ok=(v,m)=>{if(!v)fail.push(m)};
  const sources=load(),overview=overviewModel(sources,false),ascii=overviewModel(sources,true);
  ok(overview.authority==='NONE','overview authority');
  ok(overview.rows.length>0,'CURRENT heads visible');
  ok(overview.rows.every(r=>r.token&&r.address&&r.label&&r.state),'glyph is never sole meaning');
  ok(ascii.rows.every(r=>/^\[.+\/.+\]$/.test(r.token)),'ascii fallback');
  const exact=exactModel('field-index',null,sources,false),plain=renderExact(exact);
  ok(exact.authority==='NONE','object authority');
  ok(exact.handoff.moves.length<=3,'move bound');
  ok(exact.object.address===exact.handoff.return_to,'object/RETURN continuity');
  ok(plain.includes(exact.object.address)&&plain.includes(exact.object.label)&&plain.includes('state='),'text redundancy');
  ok(plain.includes('RETURN')&&plain.includes('next_authority NONE'),'return visible');
  const own=fs.readFileSync(fileURLToPath(import.meta.url),'utf8');
  ok(!/\bfetch\s*\(/.test(own),'lens must not network');
  ok(!/\b(?:fs\.)?(?:writeFile|appendFile|createWriteStream|rmSync|unlinkSync|renameSync)\s*\(/.test(own),'lens must not write');
  if(fail.length){console.error('FIELD TERMINAL LENS SELFTEST FAIL · '+fail.join(' · '));process.exit(1)}
  console.log('FIELD TERMINAL LENS SELFTEST PASS · same object → glyph/text projection → ≤3 moves → exact RETURN · authority NONE');
}

function main(){
  const args=process.argv.slice(2);
  if(args.includes('--help'))return process.stdout.write(usage());
  if(args.includes('--selftest'))return selftest();
  const sources=load(),ascii=args.includes('--ascii'),jsonMode=args.includes('--json'),source=flag(args,'--source');
  const model=source?exactModel(source,flag(args,'--select'),sources,ascii):overviewModel(sources,ascii);
  if(jsonMode)return process.stdout.write(JSON.stringify(model,null,2)+'\n');
  process.stdout.write(source?renderExact(model):renderOverview(model));
}

try{main()}catch(e){console.error(String(e?.message||e));process.exit(2)}
