#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const G=require('../lib/interphase-glyph.js');
const P=require('../lib/project-head-glyph.js');
const CHANNELS=G.CHANNELS;
const text=v=>String(v??'').replace(/\s+/g,' ').trim();

function flag(args,name){
  const i=args.indexOf(name);
  if(i<0)return null;
  const v=args[i+1];
  if(v==null||String(v).startsWith('--'))throw new Error(name+' requires a value');
  return v;
}
function readJson(rel){return JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'))}
function stage(source,select=null){
  const argv=[path.join(ROOT,'tools/field-stage-handoff.mjs'),'--source',source,'--json'];
  if(select)argv.push('--select',select);
  const p=spawnSync(process.execPath,argv,{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  if(p.status!==0)throw new Error(text(p.stderr)||'FIELD_GLYPH_STAGE_FAILED');
  let h;try{h=JSON.parse(p.stdout)}catch{throw new Error('FIELD_GLYPH_STAGE_INVALID_JSON')}
  if(h?.schema!=='field-crew-handoff/v0.1')throw new Error('FIELD_GLYPH_HANDOFF_SCHEMA');
  if(h?.authority!=='NONE / TRANSIENT HANDOFF ONLY')throw new Error('FIELD_GLYPH_AUTHORITY_DRIFT');
  return h;
}
function resolveProject(handoff){
  const current=readJson('control/CURRENT.json'),manifest=readJson('showcase-manifest.json');
  const route=(manifest.routes||manifest.entries||[]).find(x=>x.href===handoff.source.object_ref);
  if(!route)throw new Error('FIELD_GLYPH_ROUTE_NOT_FOUND · '+handoff.source.object_ref);
  const head=(current.current_heads||[]).find(x=>x.route===route.href)||{};
  const children=(manifest.routes||manifest.entries||[]).filter(x=>x.parent===route.href);
  const built=P.descriptor(head,route,{children});
  if(built.model.id!==route.href)throw new Error('FIELD_GLYPH_IDENTITY_DRIFT');
  if(built.model.authority!=='VIEW')throw new Error('FIELD_GLYPH_PROJECT_AUTHORITY_DRIFT');
  return {route,head,children,built,svg:P.svg(head,route,{children,size:240})};
}

// One Unicode Braille cell carries the eight canonical INTERPHASE channel bits.
// It is a compact support witness, never a source of truth or an invertible state store.
function channelCell(channels=[]){
  const present=new Set(channels),mask=CHANNELS.reduce((m,c,i)=>present.has(c)?m|(1<<i):m,0);
  return String.fromCodePoint(0x2800+mask);
}
function channelLegend(channels=[]){
  const present=new Set(channels);
  return CHANNELS.map((c,i)=>(present.has(c)?'●':'·')+(i+1)+' '+c).join('  ');
}
function chafaAvailable(){
  const p=spawnSync('chafa',['--version'],{encoding:'utf8',stdio:['ignore','pipe','ignore']});
  return p.status===0;
}
function renderSvgWithChafa(svg,width=28,height=14){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'field-glyph-'));
  const file=path.join(dir,'glyph.svg');
  try{
    fs.writeFileSync(file,svg,'utf8');
    const p=spawnSync('chafa',['--format','symbols','--symbols','braille+block+space','--size',`${width}x${height}`,file],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
    if(p.status!==0)throw new Error(text(p.stderr)||'CHAFA_RENDER_FAILED');
    return p.stdout.replace(/\s+$/,'');
  }finally{fs.rmSync(dir,{recursive:true,force:true})}
}
function oneLine(h,built){
  const gate=h.human_gate?.class||'UNSPECIFIED';
  const cell=channelCell(built.model.channels);
  return `${cell} ${h.source.object_ref} · ${h.status.state} · gate ${gate} · authority NONE · ↩ ${h.return.target}`;
}
function renderText(h,project,{visual=true,legend=false}={}){
  const m=project.built.model,lines=[];
  lines.push('FIELD / GLYPH TERMINAL · PROJECTION ONLY');
  lines.push(oneLine(h,project.built));
  lines.push('');
  if(visual&&chafaAvailable()){
    lines.push(renderSvgWithChafa(project.svg));
    lines.push('');
  }else{
    lines.push('channel-cell '+channelCell(m.channels)+' · '+m.channels.length+'/'+CHANNELS.length+' channels');
    if(legend)lines.push(channelLegend(m.channels));
    lines.push('');
  }
  lines.push('HOLD · '+text(m.label||h.source.object_ref));
  lines.push('state '+h.status.state+' · human '+(h.human_gate?.class||'UNSPECIFIED')+(h.human_gate?.satisfied?' SATISFIED':' OPEN'));
  lines.push('');
  lines.push('TURN');
  const moves=h.hold?.moves||[];
  if(!moves.length)lines.push('  — no declared native moves');
  moves.forEach((move,i)=>{
    const selected=h.hold?.selected_move_id===move.id?'●':'○';
    lines.push(`  ${selected} ${i+1}  ${move.label} [${move.authority}] → ${move.target}`);
  });
  lines.push('');
  const refs=(h.trace?.evidence_refs||[]).slice(0,3);
  lines.push('TRACE · '+(refs.length?refs.join(' · '):'no attached evidence refs'));
  lines.push('RETURN ↩ '+h.return.target+' · next authority '+h.return.next_authority);
  lines.push('');
  lines.push('law · glyph is a projection; selection is not EFFECT authority; native host owns consequence');
  return lines.join('\n')+'\n';
}
function jsonView(h,project){
  return {
    schema:'field-glyph-terminal/v0.1',
    projection_only:true,
    authority:'NONE',
    object_ref:h.source.object_ref,
    context_handle:h.context_handle,
    handoff_state:h.status.state,
    human_gate:h.human_gate,
    channel_cell:channelCell(project.built.model.channels),
    glyph:{schema:project.built.model.schema,id:project.built.model.id,authority:project.built.model.authority,channels:project.built.model.channels,operations:project.built.model.operations},
    moves:h.hold?.moves||[],
    selected_move_id:h.hold?.selected_move_id||null,
    evidence_refs:h.trace?.evidence_refs||[],
    return_to:h.return.target,
    next_authority:h.return.next_authority
  };
}
function usage(){return `FIELD / GLYPH TERMINAL · projection-only experiment\n\nnode tools/field-glyph-terminal.mjs --source <exact route|CURRENT lineage>\nnode tools/field-glyph-terminal.mjs --source <...> --select <move-id>\nnode tools/field-glyph-terminal.mjs --source <...> --json\nnode tools/field-glyph-terminal.mjs --selftest\n\nOptions:\n  --no-visual   never invoke optional chafa renderer\n  --legend      show canonical 8-channel bit legend\n\nThe tool reuses the canonical FIELD stage handoff and INTERPHASE glyph model. If chafa is installed, it projects the existing SVG into terminal symbols; otherwise it falls back to a one-cell Braille channel witness plus text. It never executes a move, grants authority, writes FIELD state, or infers canonical state from the glyph.\n`;}
function selftest(){
  const C=readJson('control/CURRENT.json'),head=(C.current_heads||[]).find(x=>x.route);
  if(!head)throw new Error('FIELD_GLYPH_SELFTEST_NO_HEAD');
  const h=stage(head.route),p=resolveProject(h),j=jsonView(h,p),out=renderText(h,p,{visual:false,legend:true});
  const fail=[],need=(ok,msg)=>{if(!ok)fail.push(msg)};
  need(j.schema==='field-glyph-terminal/v0.1','schema');
  need(j.authority==='NONE','authority');
  need(j.object_ref===head.route,'identity continuity');
  need(j.glyph.id===head.route,'glyph identity continuity');
  need(j.glyph.authority==='VIEW','glyph authority');
  need(j.moves.length<=3,'move bound');
  need(j.next_authority==='NONE','return authority');
  need([...j.channel_cell].length===1,'channel cell must be one code point');
  need(p.svg.includes('data-interphase-glyph="interphase-glyph/v0.1"'),'canonical svg reuse');
  need(out.includes('projection; selection is not EFFECT authority'),'projection law');
  if(fail.length){console.error('FIELD GLYPH TERMINAL SELFTEST FAIL · '+fail.join(' · '));process.exit(1)}
  console.log('FIELD GLYPH TERMINAL SELFTEST PASS · exact FIELD object → existing glyph + ≤3 action aperture → RETURN · authority NONE');
}

const args=process.argv.slice(2);
if(!args.length||args.includes('--help')){process.stdout.write(usage());process.exit(0)}
if(args.includes('--selftest')){selftest();process.exit(0)}
try{
  const source=flag(args,'--source');
  if(!source)throw new Error('FIELD_GLYPH_SOURCE_REQUIRED · use --source <exact route|CURRENT lineage>');
  const h=stage(source,flag(args,'--select'));
  const p=resolveProject(h);
  if(args.includes('--json'))process.stdout.write(JSON.stringify(jsonView(h,p),null,2)+'\n');
  else process.stdout.write(renderText(h,p,{visual:!args.includes('--no-visual'),legend:args.includes('--legend')}));
}catch(err){console.error(String(err?.message||err));process.exit(2)}
