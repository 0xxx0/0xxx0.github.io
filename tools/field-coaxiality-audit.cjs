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

console.log(`FIELD COAXIALITY AUDIT VALID · ${audit.mechanisms.length} mechanism(s) · ${nonKeep} not KEEP`);
if(process.argv.includes('--require-pass') && nonKeep) process.exitCode=1;
