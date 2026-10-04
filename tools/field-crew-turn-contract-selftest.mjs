#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');
const SCHEMA_PATH=path.join(ROOT,'control/schemas/field-crew-turn-v0.1.schema.json');
const SUBMISSION_PATH=path.join(ROOT,'control/SUBMISSION_CONTRACT.json');
const SCHEMA=JSON.parse(fs.readFileSync(SCHEMA_PATH,'utf8'));
const SUBMISSION=JSON.parse(fs.readFileSync(SUBMISSION_PATH,'utf8'));

const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const clone=x=>JSON.parse(JSON.stringify(x));
const leafCount=x=>{
  let n=0;
  const walk=v=>{
    if(v&&typeof v==='object'&&!Array.isArray(v))for(const k of Object.keys(v))walk(v[k]);
    else n++;
  };
  walk(x);
  return n;
};

function validate(packet){
  const errors=[];
  const err=x=>errors.push(x);
  const exact=(obj,keys,label)=>{
    if(!obj||typeof obj!=='object'||Array.isArray(obj)){err(label+' object');return}
    const got=Object.keys(obj);
    if(got.join('|')!==keys.join('|'))err(label+' keys '+got.join('|'));
  };

  exact(packet,['source','hold','turn','trace','return'],'packet');
  exact(packet?.source,['object','owner'],'source/FIELD');
  exact(packet?.hold,['delta'],'hold/CARRY');
  exact(packet?.turn,['move','release'],'turn/OPERATE');
  exact(packet?.trace,['status','result','evidence'],'trace/PROVE');
  exact(packet?.return,['gate','to'],'return/RETURN');

  if(!String(packet?.source?.object||'').trim())err('source.object');
  if(!String(packet?.source?.owner||'').trim())err('source.owner');
  if(!String(packet?.hold?.delta||'').trim())err('hold.delta');
  if(!String(packet?.turn?.move||'').trim())err('turn.move');
  if(!String(packet?.turn?.release||'').trim())err('turn.release');

  const statuses=['CHANGED','UNCHANGED','FAILED','BLOCKED','UNKNOWN'];
  if(!statuses.includes(packet?.trace?.status))err('trace.status');
  if(typeof packet?.trace?.result!=='string')err('trace.result');
  if(!Array.isArray(packet?.trace?.evidence)||packet.trace.evidence.some(x=>typeof x!=='string'||!x.trim()))err('trace.evidence');
  if(Array.isArray(packet?.trace?.evidence)&&new Set(packet.trace.evidence).size!==packet.trace.evidence.length)err('trace.evidence duplicate');

  if(!(packet?.return?.gate===null||(typeof packet?.return?.gate==='string'&&packet.return.gate.trim())))err('return.gate');
  if(!String(packet?.return?.to||'').trim())err('return.to');

  if(['CHANGED','UNCHANGED'].includes(packet?.trace?.status)&&packet.trace.evidence.length===0)err('behavioral claim requires evidence');
  if(leafCount(packet)!==10)err('leaf_count != 10');

  return errors;
}

const base={
  source:{object:'/docs/',owner:'READFIELD'},
  hold:{delta:'Make one existing action easier to reach without changing source/cursor authority'},
  turn:{move:'Patch the existing host action surface',release:'HOST_NATIVE Git commit'},
  trace:{status:'CHANGED',result:'Action is reachable; source/cursor authority unchanged',evidence:['commit:abc','selftest:123']},
  return:{gate:null,to:'/?focus=%2Fdocs%2F'}
};

const cases=[
  ['valid changed',base,true],
  ['valid unknown no evidence',{...clone(base),trace:{status:'UNKNOWN',result:'No material claim yet',evidence:[]}},true],
  ['valid blocked with gate',{...clone(base),trace:{status:'BLOCKED',result:'Needs physical/device evidence',evidence:[]},return:{gate:'REAL_DEVICE',to:'/?focus=%2Fdocs%2F'}},true],
  ['changed without evidence',{...clone(base),trace:{status:'CHANGED',result:'Claimed changed',evidence:[]}},false],
  ['unchanged without evidence',{...clone(base),trace:{status:'UNCHANGED',result:'Claimed unchanged',evidence:[]}},false],
  ['actor forbidden',(()=>{const x=clone(base);x.actor='worker';return x})(),false],
  ['next forbidden',(()=>{const x=clone(base);x.next='do more';return x})(),false],
  ['second move forbidden',(()=>{const x=clone(base);x.turn.second_move='another';return x})(),false],
  ['source extra field forbidden',(()=>{const x=clone(base);x.source.route='/docs/';return x})(),false],
  ['empty owner',(()=>{const x=clone(base);x.source.owner='';return x})(),false],
  ['empty release',(()=>{const x=clone(base);x.turn.release='';return x})(),false],
  ['bad status',(()=>{const x=clone(base);x.trace.status='PASS';return x})(),false],
  ['duplicate evidence',(()=>{const x=clone(base);x.trace.evidence=['a','a'];return x})(),false],
  ['empty return target',(()=>{const x=clone(base);x.return.to='';return x})(),false],
  ['empty-string gate forbidden',(()=>{const x=clone(base);x.return.gate='';return x})(),false]
];

for(const [name,packet,valid] of cases){
  const errors=validate(packet);
  if(valid)assert(errors.length===0,name+' expected valid · '+errors.join(' · '));
  else assert(errors.length>0,name+' expected invalid');
}

assert(SCHEMA.$schema==='https://json-schema.org/draft/2020-12/schema','JSON Schema draft');
assert(SCHEMA.$id==='https://0xxx0.github.io/control/schemas/field-crew-turn-v0.1.schema.json','schema id/path');
assert(SCHEMA['x-stage-aliases'].source==='FIELD','FIELD alias');
assert(SCHEMA['x-stage-aliases'].hold==='CARRY','CARRY alias');
assert(SCHEMA['x-stage-aliases'].turn==='OPERATE','OPERATE alias');
assert(SCHEMA['x-stage-aliases'].trace==='PROVE','PROVE alias');
assert(SCHEMA['x-stage-aliases'].return==='RETURN','RETURN alias');
assert(SCHEMA['x-leaf-count']===10,'schema leaf count');

const min=SUBMISSION.minimum_execution_projection;
assert(min?.schema==='field-crew-turn/v0.1','canonical schema name');
assert(Object.keys(min.shape||{}).join('>')==='source>hold>turn>trace>return','canonical stage order');
assert(Object.keys(min.shape.source||{}).join('|')==='object|owner','canonical FIELD shape');
assert(Object.keys(min.shape.hold||{}).join('|')==='delta','canonical CARRY shape');
assert(Object.keys(min.shape.turn||{}).join('|')==='move|release','canonical OPERATE shape');
assert(Object.keys(min.shape.trace||{}).join('|')==='status|result|evidence','canonical PROVE shape');
assert(Object.keys(min.shape.return||{}).join('|')==='gate|to','canonical RETURN shape');
assert(min.leaf_count===10,'canonical leaf count');
assert(min.invariants.some(x=>x.includes('source.object is immutable')),'same-object invariant');
assert(min.invariants.some(x=>x.includes('exactly one operation')),'one-turn invariant');
assert(min.invariants.some(x=>x.includes('no next field')&&x.includes('no actor field')),'no actor/NEXT authority surface');
assert(!JSON.stringify(min.shape).includes('actor')&&!JSON.stringify(min.shape).includes('next'),'minimum packet leaked actor/NEXT field');

console.log('FIELD/CARRY/OPERATE/PROVE/RETURN SELFTEST PASS · field-crew-turn/v0.1 · 10 leaves · one move · exact return · no actor/NEXT');
