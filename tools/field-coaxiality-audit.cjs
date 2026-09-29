#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

const auditPath=path.join(__dirname,'..','control','FIELD_COAXIALITY_AUDIT.json');
const audit=JSON.parse(fs.readFileSync(auditPath,'utf8'));
const IDS=['A_STATE','B_RELATION','C_GESTURE','D_IDENTITY','E_REVERSAL','F_LIVE','G_RETURN','H_COMPRESSION'];
const VERDICTS=new Set(['PASS','FAIL','INDETERMINATE']);

assert.equal(audit.schema,'0xxx0/field-coaxiality-audit/v0.1');
assert.deepEqual(audit.tests.map(t=>t.id),IDS);
assert.ok(Array.isArray(audit.mechanisms) && audit.mechanisms.length>0);

function decision(tests){
  const pairs=IDS.map(id=>[id,tests[id]?.verdict]);
  for(const [id,v] of pairs) assert.ok(VERDICTS.has(v),`${id}: invalid verdict ${v}`);
  const failed=pairs.filter(([,v])=>v==='FAIL').map(([id])=>id);
  if(failed.some(id=>id!=='H_COMPRESSION')) return 'REPAIR_OR_DELETE';
  if(failed.includes('H_COMPRESSION')) return 'DECOAXIALIZE_OR_DELETE';
  if(pairs.some(([,v])=>v==='INDETERMINATE')) return 'PROVE_OR_DECOAXIALIZE';
  return 'KEEP';
}

let nonKeep=0;
for(const m of audit.mechanisms){
  for(const id of IDS){
    assert.ok(m.tests[id],`${m.id}: missing ${id}`);
    assert.ok(Array.isArray(m.tests[id].evidence) && m.tests[id].evidence.length>0,`${m.id}/${id}: missing evidence`);
  }
  const computed=decision(m.tests);
  assert.equal(m.decision,computed,`${m.id}: declared decision ${m.decision} != computed ${computed}`);
  if(computed!=='KEEP') nonKeep++;
  const verdicts=IDS.map(id=>`${id[0]}:${m.tests[id].verdict[0]}`).join(' ');
  console.log(`${computed.padEnd(23)} ${m.id}  ${verdicts}`);
}

const nonAdmitted=Array.isArray(audit.non_admitted_dispositions)?audit.non_admitted_dispositions:[];
const ids=new Set(audit.mechanisms.map(m=>m.id));
for(const d of nonAdmitted){
  assert.ok(d&&typeof d.id==='string'&&d.id,'non-admitted disposition missing id');
  assert.equal(d.admitted,false,`${d.id}: non-admitted entry must say admitted=false`);
  assert.ok(typeof d.disposition==='string'&&d.disposition,`${d.id}: missing disposition`);
  assert.ok(typeof d.reason==='string'&&d.reason,`${d.id}: missing reason`);
  assert.ok(Array.isArray(d.evidence)&&d.evidence.length>0,`${d.id}: missing evidence`);
  assert.ok(!ids.has(d.id),`${d.id}: cannot be both admitted and non-admitted`);
  assert.ok(!ids.has(d.id),`${d.id}: duplicate admission identity`);
  ids.add(d.id);
}
const rootReview=audit.scope?.root_admission_review;
assert.ok(rootReview&&Array.isArray(rootReview.reviewed)&&rootReview.reviewed.length>0,'root admission review missing');
for(const id of rootReview.reviewed) assert.ok(ids.has(id),`root admission review references unknown ${id}`);
for(const id of rootReview.admitted||[]) assert.ok(audit.mechanisms.some(m=>m.id===id),`admitted review id not in mechanisms: ${id}`);

console.log(`FIELD COAXIALITY AUDIT VALID · ${audit.mechanisms.length} admitted · ${nonAdmitted.length} explicitly non-admitted · ${nonKeep} admitted not KEEP`);
if(process.argv.includes('--require-pass') && nonKeep) process.exitCode=1;
