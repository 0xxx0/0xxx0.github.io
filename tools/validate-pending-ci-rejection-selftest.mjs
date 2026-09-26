#!/usr/bin/env node
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const current=JSON.parse(fs.readFileSync('control/CURRENT.json','utf8'));
const head=(current.current_heads||[]).find(h=>h?.repo_verification?.status==='PASS'&&h.latest_return);
if(!head){
  console.error('PENDING-CI REJECTION SELFTEST FAIL · no CURRENT PASS head with latest_return');
  process.exit(1);
}

const receiptPath=String(head.latest_return).replace(/^\//,'');
const originalText=fs.readFileSync(receiptPath,'utf8');
const original=JSON.parse(originalText);
const markerState='CURRENT PASS head retains pending latest_return state: '+head.lineage;
const markerProof='CURRENT PASS head retains pending latest_return proof: '+head.lineage;

function runValidator(){
  return spawnSync(process.execPath,['tools/validate-public.mjs'],{encoding:'utf8'});
}
function output(r){return String(r.stdout||'')+String(r.stderr||'')}
function requireBaseline(){
  const r=runValidator();
  if(r.status!==0){
    console.error('PENDING-CI REJECTION SELFTEST FAIL · baseline validator is not PASS\n'+output(r));
    process.exit(1);
  }
}
function requireRejected(mutated,marker,label){
  fs.writeFileSync(receiptPath,JSON.stringify(mutated,null,2)+'\n');
  const r=runValidator(),out=output(r);
  if(r.status===0||!out.includes(marker)){
    console.error('PENDING-CI REJECTION SELFTEST FAIL · '+label+' was not rejected with expected marker\nexpected: '+marker+'\n'+out);
    process.exit(1);
  }
}

try{
  requireBaseline();

  const stateCase=structuredClone(original);
  stateCase.state='PASS_PENDING_CI';
  requireRejected(stateCase,markerState,'pending state');

  fs.writeFileSync(receiptPath,originalText);
  const proofCase=structuredClone(original);
  proofCase.proof={...(proofCase.proof&&typeof proofCase.proof==='object'&&!Array.isArray(proofCase.proof)?proofCase.proof:{}),selftest:'pending CI'};
  requireRejected(proofCase,markerProof,'pending proof');

  console.log('PENDING-CI REJECTION SELFTEST PASS · state + proof mutations both fail closed for '+head.lineage);
} finally {
  fs.writeFileSync(receiptPath,originalText);
}
