import assert from 'node:assert/strict';
import {createHost,makePhi,transcribe,splice,translate,commit,ExpressionTape} from './core.mjs';

const host=createHost({
  id:'FIELD',
  authority:'VIEW',
  source:{manifest:'/showcase-manifest.json'},
  nodes:[
    {id:'/a/',address:'/a/',channels:['identity','address','content','authority','evidence'],content:{title:'A',state:'ACTIVE'},authority:'VIEW',evidence:'r1',operations:['RENAME']},
    {id:'/b/',address:'/b/',channels:['identity','address','content','authority'],content:{title:'B',state:'HOLD'},authority:'VIEW',operations:[]}
  ],
  operations:{
    RENAME:(node,args)=>({...node,content:{...node.content,title:String(args.title)}})
  }
});

const canonicalBefore=host.read('/a/');
const phi0=makePhi(host,{created_at:'2026-09-25T00:00:00Z'});
assert.equal(phi0.host,'FIELD');
assert.equal(phi0.revision,0);
assert.equal('nodes' in phi0,false,'Φ must describe the host boundary, not copy canonical nodes');

const tx0=transcribe(host,phi0,{focus:'/a/',selection:['/b/'],channels:['identity','address','content','evidence'],context:{mode:'INSPECT'}});
assert.deepEqual(tx0.locus.selection,['/a/','/b/']);
assert.equal(tx0.records.length,2);
assert.equal(tx0.records[0].expressed.content.title,'A');
assert(tx0.residue.some(x=>x.id==='/b/'&&x.channel==='evidence'),'missing channel must become explicit residue');

const cut=splice(tx0,['identity','address']);
assert.equal(cut.records[0].expressed.content,undefined);
assert(cut.residue.some(x=>x.id==='/a/'&&x.channel==='content'&&x.reason==='SPLICED_OUT'));

const rev0=host.revision;
const glyph=translate(cut,{name:'GLYPH',channels:['identity','address']});
assert.equal(glyph.records.length,2);
assert.equal(host.revision,rev0,'translation may not mutate host');
assert.deepEqual(host.read('/a/'),canonicalBefore);

const unsupported=commit(host,tx0,{target:'/b/',operation:'RENAME',args:{title:'NO'}});
assert.equal(unsupported.ok,false);
assert.match(unsupported.reason,/SUPPORT=0/);

const ok=commit(host,tx0,{target:'/a/',operation:'RENAME',args:{title:'A2'}});
assert.equal(ok.ok,true);
assert.equal(host.revision,1);
assert.equal(host.read('/a/').content.title,'A2');

const stale=commit(host,tx0,{target:'/a/',operation:'RENAME',args:{title:'A3'}});
assert.deepEqual(stale,{ok:false,reason:'STALE_TRANSCRIPT'});

assert.throws(()=>transcribe(host,phi0,{focus:'/a/'}),/PHI_STALE/);
const phi1=makePhi(host,{created_at:'2026-09-25T00:01:00Z'});
const tx1=transcribe(host,phi1,{focus:'/a/',channels:['identity','address','content'],context:{mode:'OPERATE'}});
assert.equal(tx1.records[0].expressed.content.title,'A2');

const tape=new ExpressionTape();
tape.checkpoint(tx0,'BEFORE');
tape.checkpoint(tx1,'AFTER');
const rewind=tape.rewind();
assert.equal(rewind.label,'BEFORE');
assert.equal(rewind.transcript.records[0].expressed.content.title,'A');
assert.equal(host.revision,1,'rewind must not roll canonical host revision backward');
assert.equal(host.read('/a/').content.title,'A2','rewind restores expression context only');
const branch=tape.branch('WHAT-IF');
assert.equal(branch.transcript.id,tx0.id);
assert.equal(host.read('/a/').content.title,'A2');

console.log('SPIKE 005 / EXPRESSION TRANSCRIPT PASS');
console.log(JSON.stringify({laws:10,host_revision:host.revision,tape:tape.snapshot(),stale_write:'REFUSED',projection_mutation:'NONE'},null,2));
