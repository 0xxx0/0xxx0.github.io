#!/usr/bin/env node
import fs from 'node:fs';

const current=JSON.parse(fs.readFileSync('control/CURRENT.json','utf8'));
const waiting=JSON.parse(fs.readFileSync('control/WAITING.json','utf8'));
const home=fs.readFileSync('index.html','utf8');
const items=Array.isArray(waiting)?waiting:(waiting.items||waiting.waiting||[]);
const human=/HUMAN|ORDINARY_USE|REAL_DEVICE|PRIVATE|PHYSICAL|WAIT|LIVED/i;
const fail=[];
let active=0;

for(const h of current.current_heads||[]){
  const n=h.next_executable;
  if(!n||!human.test(String(n.state||'')))continue;
  active++;
  const detail=n.human_questions||n.acceptance||[];
  if(!h.route)fail.push((h.lineage||'?')+' reality gate missing route');
  if(!n.id)fail.push((h.lineage||h.route||'?')+' reality gate missing id');
  if(!String(n.objective||'').trim())fail.push((n.id||h.lineage||'?')+' reality gate missing objective');
  if(!Array.isArray(detail)||detail.length===0)fail.push((n.id||h.lineage||'?')+' reality gate missing observable questions/acceptance');
  if(!String(n.law||'').trim())fail.push((n.id||h.lineage||'?')+' reality gate missing law');
}

for(const x of items){
  const state=String(x.surface_state||'PARKED').toUpperCase();
  if(!['PARKED','REMOVED'].includes(state))continue;
  if(!x.id)fail.push('WAITING dependency missing id');
  if(!x.route)fail.push((x.id||'?')+' WAITING dependency missing route');
  if(!x.dependency_kind)fail.push((x.id||'?')+' WAITING dependency missing dependency_kind');
  if(!String(x.human_move||'').trim())fail.push((x.id||'?')+' WAITING dependency missing human_move');
  if(!String(x.why||'').trim())fail.push((x.id||'?')+' WAITING dependency missing why');
}
if(!home.includes('REALITY GAP / YOU'))fail.push('FIELD root missing REALITY GAP / YOU aperture');
if(!home.includes('COPY TEST'))fail.push('FIELD root missing COPY TEST world handoff');
if(!home.includes('function copyRealityTest'))fail.push('FIELD root missing reality-test serializer');

if(fail.length){
  console.error('REALITY GAP FAIL\n- '+fail.join('\n- '));
  process.exit(1);
}
console.log('REALITY GAP PASS · '+active+' active CURRENT world gates · '+items.length+' WAITING memory entries');
