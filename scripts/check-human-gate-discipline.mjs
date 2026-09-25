#!/usr/bin/env node
import fs from 'node:fs';

const path='control/CURRENT.json';
const raw=fs.readFileSync(path,'utf8');
const current=JSON.parse(raw);
const issues=[];

const requiredLaws=[
  'SELF-VERIFY BEFORE HUMAN-GATE',
  'HUMAN SUBJECTIVE USE IS EVIDENCE, NOT A DEFAULT TEST HARNESS',
  'A REAL-DEVICE/HUMAN GATE MUST NAME THE PHYSICAL OR SUBJECTIVE PROPERTY'
];

for(const marker of requiredLaws){
  if(!(current.laws||[]).some(x=>String(x).includes(marker))){
    issues.push('missing verification law: '+marker);
  }
}

if(raw.includes('HOLD_FOR_HUMAN_USE')) issues.push('active CURRENT still contains HOLD_FOR_HUMAN_USE');
if(raw.includes('"human_questions"')) issues.push('active CURRENT still delegates proof via human_questions');

const ladder=current.execution_contract?.verification_ladder;
if(!Array.isArray(ladder)||ladder.length<6) issues.push('verification ladder missing/incomplete');
if(!String(current.execution_contract?.human_gate_rule||'').includes('Do not ask the human to test')) {
  issues.push('human_gate_rule missing');
}

const vague=[
  /lived phone use remains the promotion gate/i,
  /promotion beyond candidate still waits on ordinary phone use/i,
  /hold for human use/i
];
for(const re of vague){
  if(re.test(raw)) issues.push('vague human gate remains: '+re);
}

if(issues.length){
  console.error('HUMAN GATE DISCIPLINE FAIL');
  for(const x of issues) console.error('- '+x);
  process.exit(1);
}

console.log('HUMAN GATE DISCIPLINE PASS');
console.log('- machine/self verification is primary');
console.log('- subjective evidence is optional');
console.log('- no generic HOLD_FOR_HUMAN_USE / human_questions in CURRENT');
