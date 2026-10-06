#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MANIFEST=path.join(ROOT,'showcase-manifest.json');
const CURRENT=path.join(ROOT,'control/CURRENT.json');
const RECEIPT_REL='returns/FIELD_INDEX_GLYPH_URLBAR_0834_2026-10-06.json';
const RECEIPT='/'+RECEIPT_REL;
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const now=()=>{
  const d=new Date(Date.now()+8*3600*1000),z=n=>String(n).padStart(2,'0');
  return d.getUTCFullYear()+'-'+z(d.getUTCMonth()+1)+'-'+z(d.getUTCDate())+'T'+z(d.getUTCHours())+':'+z(d.getUTCMinutes())+':'+z(d.getUTCSeconds())+'+08:00';
};
const stamp=now();
const run=process.env.GITHUB_RUN_ID||'local-registration';
const parent=process.env.GITHUB_SHA||'local-worktree';

const manifest=read(MANIFEST);
const current=read(CURRENT);
const routes=manifest.routes||[];
const root=routes.find(r=>r.href==='/');
const head=(current.current_heads||[]).find(h=>h.route==='/');
if(!root||!head)throw new Error('FIELD_URLBAR_REGISTER_ROOT_REQUIRED');

const already=root.version==='0.8.34'&&head.version==='0.8.34'&&root.receipt===RECEIPT&&head.latest_return===RECEIPT;
if(!already&&(root.version!=='0.8.33'||head.version!=='0.8.33')){
  throw new Error('FIELD_URLBAR_REGISTER_VERSION_DRIFT · manifest='+root.version+' CURRENT='+head.version+' · expected 0.8.33 or already 0.8.34');
}

if(!routes.some(r=>r.href==='/artifacts/')){
  const rootIndex=routes.indexOf(root);
  routes.splice(Math.max(0,rootIndex+1),0,{
    href:'/artifacts/',
    title:'FIELD / ARTIFACTS',
    kind:'hub',
    parent:'/',
    operation:'RECOVER',
    state:'ACTIVE',
    version:'0.2',
    showcase_card:false,
    role:'Retained-output index: exact public routes remain linkable; Library-only material remains Library-only; presence does not imply current role, canonical status, authority or proven utility.',
    index:{updated_at:'2026-10-06T22:45:00+08:00',work_modes:['RECOVER','VERIFY']}
  });
}

const transfer='0.8.34 glyph URLbar: one keyboard-addressable FIELD:// line projects the existing object graph as address/glyph search, CURRENT-head filtering, bounded TURN, structural RISE, existing command projections and Hermes PREP; it adds no queue/store/shell authority, no recency rank and no direct EFFECT path.';
if(!(root.transfer||[]).some(x=>String(x).startsWith('0.8.34 glyph URLbar:')))(root.transfer||(root.transfer=[])).unshift(transfer);
root.version='0.8.34';
root.receipt=RECEIPT;
root.index=root.index||{};
root.index.updated_at=stamp;
root.role='FIELD INDEX root: one glyph/address URLbar now compresses exact object addressing, HOLD, bounded TURN, TRACE-adjacent commands and Hermes PREP into a single re-enterable line over the existing FIELD object graph. Canonical state remains CURRENT + manifest + native hosts; URLbar input is a projection only. '+String(root.role||'');

head.version='0.8.34';
head.head='FIELD INDEX 0.8.34 / GLYPH URLBAR + PERSISTENT RUN DOCK + HELD WORK DEPTH + ONE HELD OBJECT';
head.retained_function='A single FIELD:// URLbar now fronts the existing acting hand: words, exact paths and project glyph mnemonics address the same manifest object; @ limits to CURRENT heads without turning recorded order into rank; > opens one selected route; ^ rises one structural depth; : reuses existing FIELD projections/commands; ! copies only a safe local Hermes PREP command through the existing bridge and never carries --execute, API credentials or EFFECT authority. Ctrl/Cmd+K, / and : provide keyboard entry; Arrow keys choose; Enter HOLDs/focuses; Ctrl/Cmd+Enter TURNs. The line persists only as ?fi= projection state and creates no canonical store, queue, planner or second object. '+String(head.retained_function||'');
head.evidence=[RECEIPT,'/field-urlbar.js','/tools/field-urlbar-selftest.mjs','/.github/workflows/field-urlbar.yml','/tools/field-hermes-run.mjs',...(head.evidence||[]).filter(x=>![RECEIPT,'/field-urlbar.js','/tools/field-urlbar-selftest.mjs','/.github/workflows/field-urlbar.yml','/tools/field-hermes-run.mjs'].includes(x))];
head.latest_return=RECEIPT;
head.repo_verification={
  status:'PASS / MASTER URLBAR REGISTRATION',
  registration_run:String(run),
  parent_sha:String(parent),
  checks:{
    current_manifest:'PASS before commit gate',
    urlbar_contract:'PASS before commit gate',
    hermes_prepare_boundary:'PASS before commit gate',
    public_surface:'PASS before commit gate'
  },
  browser:'Machine/static proof only at registration; ordinary-use and visual-regression evidence remain separate claims.',
  note:'This registration commit is emitted only after the named checks pass in the same worktree; it does not promote navigation/Hermes preparation into effect authority.',
  predecessor:head.repo_verification||null
};

manifest.updated=stamp;
current.updated=stamp;

const receipt={
  schema:'field-return/v1',
  id:'FIELD_INDEX_GLYPH_URLBAR_0834_2026-10-06',
  date:'2026-10-06',
  state:'MERGED_CI_GREEN',
  object:'FIELD INDEX 0.8.34 / GLYPH URLBAR',
  predecessor:'/returns/FIELD_INDEX_PERSISTENT_RUN_DOCK_0833_2026-10-03.json',
  operation:'exact address / glyph / command → HOLD → bounded TURN or PREP → native owner → exact RETURN',
  delta:[
    'Replace hunt-through-surface interaction with one visible FIELD:// address line over the existing FIELD object graph.',
    'Accept exact paths, titles, state/operation terms and deterministic project glyph mnemonics; rank by textual evidence rather than recency or opaque recommendation.',
    'Expose @ CURRENT-head filtering, > bounded navigation TURN, ^ structural RISE and : reuse of existing FIELD commands without creating a second command model.',
    'Expose ! as Hermes PREP only: copy the existing local bridge command for the addressed object; never append --execute and never serialize API credentials.',
    'Persist the line only as ?fi= projection state so links/re-entry can carry the operator expression while canonical truth remains elsewhere.',
    'Register /artifacts/ as the already-present retained-output index so public-route integrity is restored without granting that catalog product or authority status.'
  ],
  authority:[
    'showcase-manifest + CURRENT retain object/address/version truth; the URLbar derives and filters them.',
    'window.__fieldAct remains the root HOLD/TURN/RISE acting hand; FieldZUI, FieldLensHost and existing controls retain command semantics.',
    'Hermes execution remains owned by tools/field-hermes-run.mjs and native Hermes policy/approval; URLbar can prepare only.',
    'FieldGlyph/project-head glyph mnemonics are address cues, not truth, priority, permission or semantic ontology.',
    'Recorded CURRENT order and index.updated_at are not converted into ranking authority.'
  ],
  verification:{
    registration_run:String(run),
    registration_parent_sha:String(parent),
    urlbar_core:'node tools/field-urlbar-selftest.mjs · PASS required before registration commit',
    hermes_bridge:'node tools/field-hermes-run.mjs --selftest · PASS required before registration commit',
    current_manifest:'node scripts/check-current-heads.mjs · PASS required before registration commit',
    release_versions:'node scripts/check-release-versions.mjs · PASS required before registration commit',
    html_integrity:'node tools/html-document-integrity-selftest.mjs · PASS required before registration commit',
    public_surface:'node tools/validate-public.mjs · PASS required before registration commit'
  },
  falsifier:'Fail if query text becomes canonical state; glyphs gain semantic/permission authority; empty/head results silently rank by recency; selection mutates without an explicit TURN/native boundary; Hermes mode executes, embeds secrets or accepts remote authority; or the new line creates another queue/store/planner/object frame.',
  residue:[
    'Protected OSINT/cybersecurity work remains a separate host compartment; only sanitized references/receipts should cross into public FIELD.',
    'ESP32/device payload execution remains behind a named Device Harness/native capability adapter; the URLbar does not gain arbitrary shell/flash authority.',
    'Visual-regression and ordinary-use evidence are separate from grammar/static correctness; any intentional baseline change must be reviewed as presentation evidence, not inferred from CI grammar success.'
  ],
  stop:'Do not add another console. Improve this line only when a measured addressing/action cost remains; new execution classes belong behind existing/native capability adapters and RETURN.'
};

write(MANIFEST,manifest);
write(CURRENT,current);
write(path.join(ROOT,RECEIPT_REL),receipt);
console.log('FIELD URLBAR REGISTERED · 0.8.34 · '+stamp+' · run '+run);
