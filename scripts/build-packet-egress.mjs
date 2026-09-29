#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {isDeepStrictEqual} from 'node:util';

const require=createRequire(import.meta.url);
const R=require('../lib/packet-egress.js');
const ROOT=path.resolve(new URL('..',import.meta.url).pathname);
const OUT=path.join(ROOT,'control/PACKET_EGRESS.json');
const ORDER=new Map(['NOW','GATE','DELTA','RESIDUE','NEXT','ARCHIVE'].map((x,i)=>[x,i]));

const readJson=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const exists=p=>fs.existsSync(path.join(ROOT,p));
const rel=p=>p.replaceAll('\\','/').replace(/^\.\//,'');
const listFiles=dir=>fs.existsSync(path.join(ROOT,dir))
  ? fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true}).filter(x=>x.isFile()).map(x=>rel(path.join(dir,x.name)))
  : [];

function collect(){
  const current=readJson('control/CURRENT.json');
  const packets=[];
  const unstructured=[];
  const ignoredExamples=[];
  const seen=new Set();

  for(const head of current.current_heads||[]){
    const source=head.latest_return||head.last_return;
    if(!source||typeof source!=='string'||!source.startsWith('/returns/'))continue;
    const p=source.slice(1);
    if(seen.has(p)||!exists(p))continue;
    try{
      const record=readJson(p);
      packets.push({packet:R.fromReturn(record,{source:p,route:head.route}),head_lineage:head.lineage||null});
      seen.add(p);
    }catch(_){unstructured.push(p)}
  }

  const legacy=[
    ...listFiles('control/packets'),
    ...listFiles('control/confluence').filter(p=>p.toUpperCase().includes('PACKET'))
  ].sort();

  for(const p of legacy){
    if(seen.has(p))continue;
    if(/\.example\.json$/i.test(p)){ignoredExamples.push(p);continue}
    if(!/\.json$/i.test(p)){unstructured.push(p);continue}
    try{
      const record=readJson(p);
      packets.push({packet:R.controlEligible(record)?R.standard(record,{source:p}):R.fromLegacyPacket(record,{source:p}),head_lineage:null});
      seen.add(p);
    }catch(_){unstructured.push(p)}
  }

  const entries=packets.map(({packet,head_lineage})=>({...R.reduceOne(packet),head_lineage}))
    .sort((a,b)=>(ORDER.get(a.category)??99)-(ORDER.get(b.category)??99)||String(a.source||'').localeCompare(String(b.source||'')));
  const counts=Object.fromEntries(R.CATEGORIES.map(k=>[k,0]));
  for(const e of entries)counts[e.category]=(counts[e.category]||0)+1;

  return {
    schema:'field-packet-egress-projection/v0.1',
    generated_at:null,
    current_updated:current.updated||null,
    authority:'DERIVED_PROJECTION_ONLY / CURRENT REMAINS ATTENTION AUTHORITY',
    laws:[
      'PACKET != CONTROL.',
      'Only external CURRENT context may classify a packet as NOW; packet AUTHORITY text cannot self-promote.',
      'Standard control-eligible packet egress requires OBJECT, AUTHORITY, STATE_IN, DELTA, EVIDENCE, STATE_OUT, RESIDUE, WAITING, NEXT, STOP.',
      'Adapted RETURNs and legacy packets are evidence projections only and can never mutate CURRENT/QUEUE.',
      'One primary category never erases secondary facets or source evidence.',
      'RETURN closes the move; NEXT is a suggestion and never inherited authority.'
    ],
    precedence:'NOW(external CURRENT only) → GATE → DELTA(evidence/terminal) → RESIDUE → NEXT → DELTA(unproved) → ARCHIVE',
    counts,
    entries,
    unstructured_legacy:[...new Set(unstructured)].sort(),
    ignored_examples:[...new Set(ignoredExamples)].sort(),
    source_rules:{
      returns:'latest_return/last_return named by CURRENT current_heads, when local JSON exists',
      packets:'machine-readable JSON under control/packets plus control/confluence/*PACKET*.json',
      markdown:'preserved as unstructured legacy; never interpreted into CONTROL'
    }
  };
}

function stable(x){return JSON.stringify(x,null,2)+'\n'}
const projection=collect();
const args=new Set(process.argv.slice(2));
if(args.has('--write')){
  fs.writeFileSync(OUT,stable(projection));
  console.log('PACKET EGRESS WRITE PASS · '+projection.entries.length+' entries');
}else if(args.has('--check')){
  let actual=null;
  try{actual=JSON.parse(fs.readFileSync(OUT,'utf8'))}catch(_){}
  if(!isDeepStrictEqual(actual,projection)){
    console.error('PACKET EGRESS DRIFT FAIL · run node scripts/build-packet-egress.mjs --write');
    process.exit(1);
  }
  console.log('PACKET EGRESS DRIFT PASS · '+projection.entries.length+' entries');
}else{
  process.stdout.write(stable(projection));
}
