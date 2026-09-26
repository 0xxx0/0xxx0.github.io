#!/usr/bin/env node
import fs from 'node:fs';

const packet=JSON.parse(fs.readFileSync('control/confluence/VIDEO_GAME_DONOR_TRANSFERS_2026-09-26.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('showcase-manifest.json','utf8'));
const current=JSON.parse(fs.readFileSync('control/CURRENT.json','utf8'));
const routes=new Set((manifest.routes||[]).map(r=>r.href));
const issues=[];
const allowed=new Set(['IMPLEMENTED_CANDIDATE','CONTRACT','DONOR']);

if(packet.schema!=='field-game-donor-transfer/v0.1')issues.push('schema');
if(!Array.isArray(packet.selection_gate)||packet.selection_gate.length<7)issues.push('selection gate incomplete');

for(const t of packet.transfers||[]){
  if(!t.id)issues.push('transfer missing id');
  if(!Array.isArray(t.donors)||!t.donors.length)issues.push(t.id+': no donor');
  if(!allowed.has(t.status))issues.push(t.id+': bad status '+t.status);
  if(!Array.isArray(t.recipients)||!t.recipients.length)issues.push(t.id+': no recipient');
  for(const r of t.recipients||[]) if(!routes.has(r))issues.push(t.id+': unknown recipient '+r);
  if(!t.invariant)issues.push(t.id+': invariant missing');
  if(!Array.isArray(t.non_transfer)||!t.non_transfer.length)issues.push(t.id+': non_transfer missing');
  if(t.new_sovereign_app!==false)issues.push(t.id+': sovereign app not explicitly false');
  if(!t.retirement)issues.push(t.id+': retirement missing');
  if(t.status==='IMPLEMENTED_CANDIDATE'){
    if(!t.executable_test||!fs.existsSync(t.executable_test))issues.push(t.id+': executable test missing');
  }
  if(t.status==='CONTRACT'){
    if(!t.contract_key)issues.push(t.id+': contract key missing');
    else if(!current.execution_contract?.game_donor_transfer?.[t.contract_key])issues.push(t.id+': CURRENT contract missing '+t.contract_key);
  }
}

if(issues.length){
  console.error('GAME DONOR TRANSFER FAIL');
  for(const x of issues)console.error('- '+x);
  process.exit(1);
}
console.log('GAME DONOR TRANSFER PASS');
console.log('- '+packet.transfers.length+' bounded transfers');
console.log('- no new sovereign app');
console.log('- recipients resolve to current manifest routes');
