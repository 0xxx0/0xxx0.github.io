const fs=require('fs');const atlas=JSON.parse(fs.readFileSync('prison-age/evidence-atlas.json','utf8'));const idx=JSON.parse(fs.readFileSync('prison-age/echo-index.json','utf8'));const assert=(x,m)=>{if(!x)throw Error(m)};
assert(atlas.schema==='prison-age.evidence-atlas/v0.1','schema');assert(atlas.authority==='EVIDENCE_ONLY','authority');assert(atlas.cards.length===32,'32 cards');
assert(new Set(atlas.cards.map(x=>x.n)).size===32,'unique numbers');assert(atlas.cards.every(x=>x.a?.address&&x.b?.address&&x.a.source_id!==x.b.source_id),'cross-source exact addresses');
const entries=new Map(idx.entries.map(e=>[e.id,e]));for(const c of atlas.cards){const a=idx.entries.find(e=>e.source_id===c.a.source_id&&e.start===c.a.start&&e.end===c.a.end),b=idx.entries.find(e=>e.source_id===c.b.source_id&&e.start===c.b.start&&e.end===c.b.end);assert(a&&b,'card source entries');assert(a.text===c.a.text&&b.text===c.b.text,'exact fragment bytes');assert(c.shared.length||c.phrases.length,'evidence basis')}
assert(!atlas.cards.some(c=>/ENGINE|OPERATOR|TRACE ABSENCE|RECLAIM|PUBLISH|AUTHORSHIP/i.test(c.class+' '+c.a.text.slice(0,0))),'no generated engine labels');
const runtime=fs.readFileSync('prison-age/evidence-atlas.js','utf8');new Function(runtime);assert(runtime.includes("prison-age.evidence-route/v0.1")&&runtime.includes("authority:'EVIDENCE_ONLY'"),'typed evidence trail');
console.log('PRISON AGE EVIDENCE ATLAS PASS · 32 exact relations · authority EVIDENCE_ONLY');
require('./prison-age-passage-selftest.cjs');
