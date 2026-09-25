#!/usr/bin/env node
import fs from 'node:fs';

const ROOT=new URL('../',import.meta.url);
const p=name=>new URL(name,ROOT);
const read=name=>fs.readFileSync(p(name),'utf8');
const one=s=>String(s??'').replace(/\s+/g,' ').trim();
const digest=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
const sources=['control/CURRENT.json','showcase-manifest.json','control/WAITING.json','control/FIELD_INDEX_CONTRACT.json'];
const raw=Object.fromEntries(sources.map(x=>[x,read(x)]));
const CURRENT=JSON.parse(raw['control/CURRENT.json']);
const MANIFEST=JSON.parse(raw['showcase-manifest.json']);
const WAITING=JSON.parse(raw['control/WAITING.json']);

const currentGates=(CURRENT.current_heads||[]).flatMap(h=>{
  const n=h.next_executable,state=String(n?.state||'');
  if(!n||!/HUMAN|ORDINARY_USE|REAL_DEVICE|PRIVATE|PHYSICAL|WAIT/.test(state))return[];
  return [{id:n.id||('current-'+one(h.lineage||h.route)),route:h.route||'',state:state||'WAITING_ON_HUMAN',human_move:n.objective||'Observed human/world evidence required.',source:'CURRENT'}];
});
const gateMap=new Map((WAITING.items||[]).map(x=>[x.id,{...x,source:'WAITING'}]));
for(const x of currentGates){const old=gateMap.get(x.id);gateMap.set(x.id,old?{...x,...old,source:'WAITING + CURRENT'}:x)}
const gates=[...gateMap.values()];
const routeMap=new Map((MANIFEST.routes||[]).map(r=>[r.href,r]));

const lines=[];
lines.push('# CONFLUENCE / FIELD','',
'> GENERATED MACHINE TRANSCRIPT · NON-CANONICAL · REGENERATE, DO NOT HAND-EDIT',
'> Purpose: compact re-entry packet for agents/tools. Canonical truth remains in the source files below.',
\`> CURRENT.updated: \${CURRENT.updated||'—'} · manifest.updated: \${MANIFEST.updated||'—'} · routes: \${(MANIFEST.routes||[]).length}\`,'',
'## Φ / SOURCE BOUNDARY');
for(const name of sources)lines.push(\`- /\${name} · digest:\${digest(raw[name])}\`);
lines.push('- /spikes/005-expression-transcript/ · donor proof for Φ boundary / φ locus / revision-bound transcript semantics','',
'If any source digest differs from this transcript, treat this file as stale and read/regenerate from source.','',
'## OPERATING LAW',
'- RECOVER BEFORE INVENTING.',
'- CURRENT owns attention; Git owns exact repository mutation chronology; manifest is an addressed route projection.',
'- LARGE ARCHIVE / SMALL ACTIVE SURFACE.',
'- DATA EXISTS ONCE; projections/transcripts do not become authority.',
'- WAITING is human/world dependency, not queue or priority.',
'- ONE BOUNDED MOVE → EVIDENCE → RETURN → REPLAN.',
'- RETURN restores context; REWIND revisits expression/history; REVERT requires a new authorized canonical operation.','',
'## NOW');
for(const f of CURRENT.active_fronts||[]){lines.push(\`- [\${one(f.state)}] \${one(f.id)} — \${one(f.center)}\`);if(f.objective)lines.push(\`  objective: \${one(f.objective)}\`)}
lines.push('','## NEXT');
if(CURRENT.next_single_action)lines.push(\`- \${one(CURRENT.next_single_action.id)} — \${one(CURRENT.next_single_action.instruction)}\`);else lines.push('- —');
lines.push('','## CURRENT HEADS');
for(const h of CURRENT.current_heads||[]){const r=routeMap.get(h.route)||{};lines.push(\`- \${one(h.lineage)} · [\${one(h.state)}] · \${one(h.route)} · \${one(h.head)}\`);if(r.version)lines.push(\`  route_version: \${one(r.version)}\`);if(h.next_executable)lines.push(\`  gate: [\${one(h.next_executable.state)}] \${one(h.next_executable.objective)}\`)}
lines.push('','## WAITING / HUMAN-WORLD GATES');
if(!gates.length)lines.push('- none');
for(const g of gates){lines.push(\`- \${one(g.id)} · [\${one(g.state)}] · \${one(g.route)} · source:\${one(g.source)}\`);lines.push(\`  move: \${one(g.human_move)}\`)}
lines.push('','## MACHINE ENTRYPOINTS');
const seen=new Set();
for(const h of CURRENT.current_heads||[]){if(!h.route||seen.has(h.route))continue;seen.add(h.route);const r=routeMap.get(h.route);lines.push(\`- \${h.route} · \${one(r?.title||h.lineage)} · \${one(r?.kind||'route')} · \${one(r?.state||h.state||'—')}\`)}
lines.push('','## READ BEFORE MUTATION',
'- Follow exact evidence/source pointers from CURRENT or the addressed route before changing anything.',
'- Do not infer user obligation from issues, prose, open ports, or promotion language.',
'- Do not treat this transcript as a changelog, memory database, backlog, or second canonical store.',
'- If a task crosses authority boundaries, produce a bounded packet/receipt and let the owning host commit.','',
'## REGENERATE',
'- node tools/build-field-transcript.mjs',
'- node tools/build-field-transcript.mjs --check','');

const out=lines.join('\n');
const target=p('llms.txt');
if(process.argv.includes('--check')){
  const existing=fs.existsSync(target)?fs.readFileSync(target,'utf8'):'';
  if(existing!==out){console.error('FIELD MACHINE TRANSCRIPT STALE — run node tools/build-field-transcript.mjs');process.exit(1)}
  console.log('FIELD MACHINE TRANSCRIPT PASS');
}else{
  fs.writeFileSync(target,out);
  console.log(\`wrote llms.txt (\${out.length} bytes)\`);
}
