#!/usr/bin/env node
import fs from 'node:fs';

const current=JSON.parse(fs.readFileSync('control/CURRENT.json','utf8'));
const waiting=JSON.parse(fs.readFileSync('control/WAITING.json','utf8'));
const items=Array.isArray(waiting)?waiting:(waiting.items||[]);
const fail=[];
const tokens=[
  {re:/WAITING_REAL_DEVICE/i,kind:'REAL_DEVICE'},
  {re:/WAITING_PHYSICAL|PHYSICAL_PROOF_REQUIRED/i,kind:'PHYSICAL_BUILD'},
  {re:/WAITING_PRIVATE_INPUT/i,kind:'PRIVATE_INPUT'}
];

function routeCovers(itemRoute,headRoute){
  const a=String(itemRoute||''),b=String(headRoute||'');
  return !!a&&!!b&&(a===b||a.startsWith(b));
}

for(const h of current.current_heads||[]){
  const state=String(h.state||'');
  for(const t of tokens){
    if(!t.re.test(state))continue;
    const matches=items.filter(x=>
      String(x.surface_state||'').toUpperCase()!=='REMOVED' &&
      String(x.dependency_kind||'').toUpperCase()===t.kind &&
      routeCovers(x.route,h.route)
    );
    if(!matches.length){
      fail.push((h.lineage||h.route||'?')+' declares '+t.re+' but has no '+t.kind+' WAITING proof record under '+h.route);
    }
  }
}

if(fail.length){
  console.error('REALITY GAP COVERAGE FAIL\n- '+fail.join('\n- '));
  process.exit(1);
}
console.log('REALITY GAP COVERAGE PASS · explicit CURRENT world-gap tokens are recoverable in WAITING');
