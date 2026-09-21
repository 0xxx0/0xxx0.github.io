#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('lib/constraint-surface.js','utf8');
const box={module:{exports:{}},exports:{},globalThis:{}};box.globalThis=box;vm.createContext(box);vm.runInContext(source,box,{filename:'constraint-surface.js'});
const C=box.ConstraintSurfaceCore||box.module.exports;
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const eq=(a,b,msg)=>assert(JSON.stringify(a)===JSON.stringify(b),msg+'\n'+JSON.stringify(a)+'\n!=\n'+JSON.stringify(b));
function refSupport(records,keys,selected,key,value,getValues,predicate){
 let n=0;for(const r of records){if(predicate&&!predicate(r))continue;let ok=true;for(const k of keys){const want=k===key?value:(selected[k]??'ANY');if(want==='ANY')continue;const vals=getValues(r,k);if(!vals.map(String).includes(String(want))){ok=false;break}}if(ok)n++}return n;
}
function parity(name,records,dimensions,selected,getValues,predicate){
 const keys=dimensions.map(d=>typeof d==='string'?d:d.key);
 for(const d of dimensions){
   const key=typeof d==='string'?d:d.key;
   const vals=C.candidates(records,d,getValues);
   for(const v of vals){
     const got=C.support(records,dimensions,selected,key,v,getValues,predicate);
     const want=refSupport(records,keys,selected,key,v,getValues,predicate);
     assert(got===want,name+' support mismatch '+key+'='+v+': '+got+' vs '+want);
   }
 }
 const ev=C.evaluate({records,dimensions,selection:selected,getValues,predicate});
 assert(ev.status===C.status(ev.survivors.length),name+' status mismatch');
 return ev;
}

// Synthetic: multi-valued dimensions + dead state + explain.
const toy=[
 {id:'a',state:'ACTIVE',op:'ORIENT',mode:['VERIFY','OPERATE']},
 {id:'b',state:'ACTIVE',op:'PROVE',mode:['VERIFY']},
 {id:'c',state:'STABLE',op:'ORIENT',mode:['OPERATE']}
];
const toyDims=[{key:'state',values:['ANY','ACTIVE','STABLE']},{key:'op',values:['ANY','ORIENT','PROVE']},{key:'mode',values:['ANY','VERIFY','OPERATE']}];
const gv=(r,k)=>Array.isArray(r[k])?r[k]:[r[k]];
const toyEv=parity('toy',toy,toyDims,{state:'ACTIVE',op:'ORIENT',mode:'ANY'},gv);
eq(toyEv.survivors.map(x=>x.id),['a'],'toy survivor');
assert(toyEv.status==='LOCK','toy should LOCK');
eq(C.explain(toy[0],toyDims,gv),{state:['ACTIVE'],op:['ORIENT'],mode:['VERIFY','OPERATE']},'toy explain');

// FIELD adapter against the actual manifest.
const manifest=JSON.parse(fs.readFileSync('showcase-manifest.json','utf8'));
const routes=(manifest.routes||[]).filter(r=>r.href!=='/');
const opOf=r=>r.operation||r.kind||'—';
const modesOf=r=>Array.isArray(r.index?.work_modes)&&r.index.work_modes.length?r.index.work_modes:['UNKNOWN'];
const fieldGet=(r,k)=>k==='state'?[r.state||'UNSET']:k==='operation'?[opOf(r)]:k==='mode'?modesOf(r):[];
const fieldDims=['state','operation','mode'];
const active=routes.find(r=>r.state==='ACTIVE')||routes[0];
const fieldSel={state:active?.state||'ANY',operation:active?opOf(active):'ANY',mode:active?modesOf(active)[0]:'ANY'};
const fieldEv=parity('FIELD',routes,fieldDims,fieldSel,fieldGet);
assert(fieldEv.survivors.length>=1,'FIELD chosen route must survive its own facets');

// Full AXIAL FIELD adapter: FAMILY × KIND × OPERATION × STATE × ROLE.
const family=h=>h==='/'?'ROOT':(String(h).split('/').filter(Boolean)[0]||'ROOT').toUpperCase();
const axRecords=routes.map(r=>({raw:r,family:family(r.href),kind:String(r.kind||'NONE').toUpperCase(),operation:String(r.operation||'NONE').toUpperCase(),state:String(r.state||'NONE').toUpperCase(),role:(r.field?.roles?.length?r.field.roles:['NONE']).map(v=>String(v).toUpperCase())}));
const axGet=(r,k)=>Array.isArray(r[k])?r[k]:[r[k]];
const axDims=['family','kind','operation','state','role'];
const seed=axRecords.find(r=>r.raw.href==='/foundry/axial/')||axRecords[0];
const axSel=Object.fromEntries(axDims.map(k=>[k,axGet(seed,k)[0]||'ANY']));
const axEv=parity('AXIAL_FIELD',axRecords,axDims,axSel,axGet);
assert(axEv.survivors.length>=1,'AXIAL FIELD seed must survive its own address');

// HOUSE adapter when available.
if(fs.existsSync('house/spatial/model.json')){
 const house=JSON.parse(fs.readFileSync('house/spatial/model.json','utf8')),anchors=house.anchors||[];
 if(anchors.length){
  const hs=anchors.map(a=>({room:String(a.room||'NONE').toUpperCase(),type:String(a.type||'NONE').toUpperCase(),confidence:String(a.confidence||'NONE').toUpperCase(),entity:(a.entities?.length?a.entities:['NONE']).map(String)}));
  const hd=['room','type','confidence','entity'],hget=(r,k)=>Array.isArray(r[k])?r[k]:[r[k]],s=hs[0],sel=Object.fromEntries(hd.map(k=>[k,hget(s,k)[0]]));
  const hev=parity('HOUSE',hs,hd,sel,hget);assert(hev.survivors.length>=1,'HOUSE seed must survive');
 }
}

// Predicate parity: search/filter remains outside constraint semantics.
const pred=r=>JSON.stringify(r).includes('ACTIVE');
parity('PREDICATE',routes,fieldDims,{state:'ANY',operation:'ANY',mode:'ANY'},fieldGet,pred);

console.log('CONSTRAINT SURFACE SELFTEST PASS');
console.log('FIELD records:',routes.length,'survivors:',fieldEv.survivors.length);
console.log('AXIAL FIELD records:',axRecords.length,'survivors:',axEv.survivors.length);
