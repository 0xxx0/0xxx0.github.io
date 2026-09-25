#!/usr/bin/env node
import fs from 'node:fs';

const current=JSON.parse(fs.readFileSync('control/CURRENT.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('showcase-manifest.json','utf8'));
const routes=new Map((manifest.routes||[]).map(r=>[r.href,r]));
const fail=[];
const seen=new Set();

if((current.active_fronts||[]).length>3) fail.push('CURRENT active_fronts > 3');

for(const h of current.current_heads||[]){
  if(!h.route){fail.push('current head missing route: '+(h.lineage||h.head||'?'));continue}
  if(seen.has(h.route)) fail.push('duplicate current head route '+h.route);
  seen.add(h.route);
  const r=routes.get(h.route);
  if(!r){fail.push('current head route absent from manifest: '+h.route);continue}
  const mv=r.version==null?null:String(r.version);
  const cv=h.version==null?null:String(h.version);
  if(mv!==cv) fail.push('version drift '+h.route+' CURRENT='+String(cv)+' manifest='+String(mv));
}
if(fail.length){
  console.error('CURRENT↔MANIFEST DRIFT FAIL\n- '+fail.join('\n- '));
  process.exit(1);
}
console.log('CURRENT↔MANIFEST DRIFT PASS · '+seen.size+' current heads · <=3 active fronts');
