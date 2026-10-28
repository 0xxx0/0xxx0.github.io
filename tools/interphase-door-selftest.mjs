import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hashText} from '../lib/id.js';
import * as D from '../lib/interphase-door.mjs';
const origin='https://field.example';
const a='/control/INTERPHASE_MAPPING_CONTRACT.json',b='/control/INTERPHASE_SUCCESSOR.json';
const ar=readFileSync('.'+a,'utf8'),br=readFileSync('.'+b,'utf8'),ah=await hashText(ar),bh=await hashText(br);
function make(address,hash,raw){return D.endpoint({address,hash,raw,unit:{start:0,end:raw.length},scope:'ROOT'},origin)}
assert.ok(ah.startsWith('sha256:')&&bh.startsWith('sha256:'));
const ea=make(a,ah,ar),eb=make(b,bh,br);
assert.equal(D.address(a,origin),a);
assert.equal(D.address('https://evil.example/hijack.md',origin),'');
assert.equal(D.address('/fake.html',origin),'');
assert.equal(D.address('javascript:alert(1)',origin),'');
assert.equal(D.endpointOK({...ea,address:''},origin),false);
assert.equal(D.endpointOK({...ea,hash:'bad'},origin),false);
assert.equal(D.endpointOK({...ea,end:ar.length+1},origin),false);
assert.equal(D.endpointOK({...ea,address:'https://field.example'+a},origin),false);
assert.ok(D.check(ea,ar,ah,[{start:0,end:ar.length}],origin));
const changedHash=await hashText(ar+'edit');
assert.throws(()=>D.check(ea,ar+'edit',changedHash,[{start:0,end:ar.length}],origin),/revision\/quote drift/);
assert.throws(()=>D.check(ea,ar,ah,[{start:1,end:ar.length}],origin),/not a native/);
const d={type:'questions',from:ea,to:eb,authority:'INTERPRETATION_ONLY'};
assert.ok(D.linkOK(d,origin));
assert.equal(D.linkOK({...d,authority:'EFFECT'},origin),false);
assert.equal(D.linkOK({...d,type:'proves'},origin),false);
assert.equal(D.linkOK({...d,to:{...ea}},origin),false);
const frame={at:ea,label:'Test',attention:{scope:'ROOT',char:12,view:'plain',wpm:260,query:''},links:[],marks:[],frames:[],returnTo:'/'};
assert.ok(D.frameOK(frame,origin));
assert.equal(D.frameOK({...frame,at:{...ea,quote:'forged'}},origin),false);
assert.equal(D.frameOK({...frame,frames:[{hash:bh}]},origin),false);
const file='/control/confluence/FOLD_BLOOM_THREAD_INDEX_2026-09-25.md',md=readFileSync('.'+file,'utf8');
const position=md.indexOf('`/control/INTERPHASE_SUCCESSOR.json`');
assert.ok(position>=0,'real historical citation must exist');
const scope={start:Math.max(0,position-100),end:position+150};
assert.ok(D.citations(md,scope,file,origin).includes(b));
assert.deepEqual(D.citations('[successor](../INTERPHASE_SUCCESSOR.json)',{start:0,end:43},file,origin),[b]);
assert.deepEqual(D.citations('[outside](https://evil.example/outside.md)',{start:0,end:42},file,origin),[]);
assert.deepEqual(D.citations('plain reference /other.md',{start:0,end:25},a,origin),[]);

const declared=JSON.stringify({href:'/sleeper/',receipt:'/returns/SLEEPER_SYSTEM_FOLD_2026-09-27.json',
 latest_return:'/returns/SLEEPER_HUMAN_RETURN_0C4VA6Q_2026-09-27.json',
 contract:'/house/contract.json',field:{exit_paths:[
  {status:'AVAILABLE',via:'/control/INTERPHASE_SUCCESSOR.json'},
  {status:'PARKED',via:'/control/PARKED.json'}]}});
const refs=D.references(declared,{start:0,end:declared.length},'/showcase-manifest.json',origin);
assert.deepEqual(refs.map(r=>r.kind),['RECEIPT','RETURN','CONTRACT','EXIT']);
assert.ok(!refs.some(r=>r.path.includes('PARKED')));
assert.deepEqual(D.citations(declared,{start:0,end:declared.length},'/showcase-manifest.json',origin),refs.map(r=>r.path));
const remote=JSON.stringify({receipt:'https://evil.example/secret.json'});
assert.deepEqual(D.references(remote,{start:0,end:remote.length},a,origin),[]);
console.log('INTERPHASE DOOR CORE PASS · exact 2 canonical JSON revisions · source citation from historical Fold/Bloom · no effects or forged ranges');
