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
need(html.includes("history.push(previous)"),'MARK does not retain previous boundary');
need(html.includes("setCatchupSeen(prior)"),'REWIND does not restore prior boundary');
need(html.includes("$('catchupRewind').onclick=rewindCaughtUp"),'REWIND control is not wired');

const ops=new Map((sem.operations||[]).map(x=>[x.id,x]));
for(const id of ['UNDO','REWIND','REVERT','RETURN']) need(ops.has(id),'interaction semantic missing '+id);
need(ops.get('REWIND')?.mutates_domain_state===false,'REWIND must not mutate canonical domain state');
need(ops.get('REVERT')?.creates_receipt===true,'REVERT must require evidence');
need(/REWIND/.test(sem.core_law||''),'root interaction law omits REWIND');
need(/REVERT/.test(sem.core_law||''),'root interaction law omits REVERT');
need((contract.laws||[]).some(x=>/^LOCAL ACKNOWLEDGEMENT IS REWINDABLE/.test(x)),'FIELD catch-up rewind law missing');

const root=(manifest.routes||[]).find(r=>r.href==='/');
need(root?.version==='0.8.6','FIELD root version not advanced');
need(root?.latest_return==='/returns/FIELD_INDEX_CATCHUP_REVERSIBILITY_2026-09-25.json','reversibility RETURN not attached');

if(fail.length){
  console.error('FIELD reversibility FAIL · '+fail.join(' · '));
  process.exit(1);
}
console.log('FIELD reversibility PASS · CATCH UP MARK → REWIND · UNDO ≠ REWIND ≠ REVERT ≠ RETURN');
