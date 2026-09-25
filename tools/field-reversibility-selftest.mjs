#!/usr/bin/env node
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const sem=JSON.parse(fs.readFileSync('control/INTERACTION_SEMANTICS.json','utf8'));
const contract=JSON.parse(fs.readFileSync('control/FIELD_INDEX_CONTRACT.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('showcase-manifest.json','utf8'));
const fail=[];

const need=(ok,msg)=>{if(!ok)fail.push(msg)};
need(html.includes('id="catchupRewind"'),'REWIND control missing');
need(html.includes("CATCHUP_HISTORY_KEY='field.catchup.history.v01'"),'bounded local history key missing');
need(html.includes('function rewindCaughtUp()'),'rewind function missing');
need(html.includes('pushCatchupHistory('),'acknowledgement does not retain a prior local boundary');
need(/setCatchupSeen\(prior(?:\.previous\|\|0)?\)|saveCatchupItems\(items\)/.test(html),'REWIND does not restore bulk or per-route local state');
need(html.includes("$('catchupRewind').onclick=rewindCaughtUp"),'REWIND control is not wired');

const ops=new Map((sem.operations||[]).map(x=>[x.id,x]));
for(const id of ['UNDO','REWIND','REVERT','RETURN']) need(ops.has(id),'interaction semantic missing '+id);
need(ops.get('REWIND')?.mutates_domain_state===false,'REWIND must not mutate canonical domain state');
need(ops.get('REVERT')?.creates_receipt===true,'REVERT must require evidence');
need(/REWIND/.test(sem.core_law||''),'root interaction law omits REWIND');
need(/REVERT/.test(sem.core_law||''),'root interaction law omits REVERT');
need((contract.laws||[]).some(x=>/^LOCAL ACKNOWLEDGEMENT IS REWINDABLE/.test(x)),'FIELD catch-up rewind law missing');

const root=(manifest.routes||[]).find(r=>r.href==='/');
need(Number(String(root?.version||'0').split('.').slice(0,2).join('.'))>=0.8,'FIELD root version missing');
need(/^\/returns\/FIELD_INDEX_.*2026-09-25\.json$/.test(root?.latest_return||''),'FIELD root RETURN not attached');

if(fail.length){
  console.error('FIELD reversibility FAIL · '+fail.join(' · '));
  process.exit(1);
}
console.log('FIELD reversibility PASS · local acknowledgement → REWIND · UNDO ≠ REWIND ≠ REVERT ≠ RETURN');
