#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {reducePacket,EGRESS_CLASSES} from '../lib/field-egress-reducer.mjs';

const argv=process.argv.slice(2);
const takeFlags=name=>{
  const out=[];
  for(let i=0;i<argv.length;){
    if(argv[i]!==name){i++;continue}
    const value=argv[i+1];
    if(value==null||value.startsWith('--')){
      console.error(name+' requires exactly one packet ID; repeat the flag for multiple IDs');
      process.exit(2);
    }
    out.push(value);
    argv.splice(i,2);
  }
  return out;
};
const json=argv.includes('--json');
const quiet=argv.includes('--quiet');
for(const f of ['--json','--quiet']){let i;while((i=argv.indexOf(f))>=0)argv.splice(i,1)}
const nowIds=new Set(takeFlags('--now'));
const selectedIds=new Set(takeFlags('--selected'));
const reactivatedIds=new Set(takeFlags('--reactivate'));

const idOf=p=>String(p?.packet_id||p?.id||p?.task_id||p?.return_id||p?.object?.id||p?.OBJECT?.id||p?.subject||'packet');

function walk(p){
  const st=fs.statSync(p);
  if(st.isDirectory()){
    return fs.readdirSync(p,{withFileTypes:true})
      .sort((a,b)=>a.name.localeCompare(b.name))
      .flatMap(d=>walk(path.join(p,d.name)));
  }
  return p.endsWith('.json')?[p]:[];
}

function parseFile(file){
  const v=JSON.parse(fs.readFileSync(file,'utf8'));
  const packets=Array.isArray(v)?v:[v];
  return packets.map((packet,index)=>({packet,file,index}));
}

if(!argv.length){
  console.error('usage: node scripts/reduce-field-egress.mjs [--json] [--quiet] [--now ID]... [--selected ID]... [--reactivate ID]... <packet.json|dir> [...]');
  process.exit(2);
}

const files=[...new Set(argv.flatMap(walk))].sort();
const rows=[];
for(const file of files){
  for(const {packet,index} of parseFile(file)){
    const id=idOf(packet);
    const context={
      now:nowIds.has(id),
      selected:selectedIds.has(id),
      reactivated:reactivatedIds.has(id)
    };
    const reduced=reducePacket(packet,context);
    rows.push({...reduced,file,index});
  }
}

const counts=Object.fromEntries(EGRESS_CLASSES.map(k=>[k,0]));
for(const r of rows)counts[r.class]=(counts[r.class]||0)+1;

const out={
  schema:'field-egress-sweep/v0.1',
  packet_count:rows.length,
  file_count:files.length,
  counts,
  items:rows
};

if(json){
  process.stdout.write(JSON.stringify(out,null,2)+'\n');
}else{
  if(!quiet){
    for(const r of rows){
      process.stdout.write([r.class,r.packet_id,r.reason,r.file].join('\t')+'\n');
    }
  }
  process.stdout.write('COUNTS\t'+EGRESS_CLASSES.map(k=>k+'='+counts[k]).join('\t')+'\n');
}

if(rows.length===0)process.exitCode=3;
