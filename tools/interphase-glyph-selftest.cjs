const assert=require('node:assert/strict');
const G=require('../lib/interphase-glyph.js');

const audio={
  id:'sha256:'+'a'.repeat(64),kind:'audio-source',label:'track',
  address:{sourceHash:'a'.repeat(64),time:12},
  channels:['identity','address','content','time','authority','evidence'],
  operations:[{id:'MAP',authority:'VIEW'},{id:'FOLD',authority:'EDIT'}],
  clock:{type:'PLAYBACK',current:12,duration:60},
  value:{
    glyph:{schema:'fold-bloom-audio-glyph/v0.1',sourceHash:'a'.repeat(64),rotation:0,bpm:120,sectionCount:3,radial:Array.from({length:24},(_,i)=>.4+i/100),chroma:Array.from({length:12},(_,i)=>i/11)},
    pins:[{address:8},{address:21}],
    transport:{time:12,duration:60},
    sections:[{t:0},{t:20},{t:40},{t:60}]
  }
};
const m=G.model(audio,{projection:'RIDE',residue:[{channel:'raster'}]});
assert.equal(m.schema,'interphase-glyph/v0.1');
assert.equal(m.domainGlyph.schema,'fold-bloom-audio-glyph/v0.1');
assert.equal(m.time.current,12);
assert.equal(m.operations[1].authority,'EDIT');
assert.equal(m.residue.length,1);
const svg=G.svg(m,{size:320});
for(const token of ['data-interphase-glyph="interphase-glyph/v0.1"','class="focusSpine"','class="cursor"','class="pin"','class="op edit"','class="residue"'])assert.ok(svg.includes(token),token);

const form={
  id:'dom:https://example.test/::form>input:nth-of-type(1)',kind:'input',label:'Email',
  address:{selector:'form>input:nth-of-type(1)',url:'https://example.test/'},
  channels:['identity','address','content','authority'],capabilities:['read','edit'],
  operations:[],authority:'EDIT',value:{value:'a@example.test'}
};
const a=G.model(form,{projection:'GLYPH'});
assert.equal(a.time,null);
assert.equal(a.depth,null);
assert.ok(a.channels.includes('authority'));
assert.equal(G.svg(a).includes('class="cursor"'),false);

const action={...form,id:'dom:submit',kind:'action',label:'Submit',operations:[{id:'ACT',authority:'EFFECT'}],authority:'EFFECT'};
assert.ok(G.svg(action).includes('class="op effect"'));

const again=G.model(audio,{projection:'RIDE'});
assert.equal(again.seed,m.seed);
console.log('INTERPHASE GLYPH SELFTEST PASS');