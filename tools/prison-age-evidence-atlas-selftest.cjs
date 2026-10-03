const fs=require('fs');
const atlas=JSON.parse(fs.readFileSync('prison-age/evidence-atlas.json','utf8'));
const idx=JSON.parse(fs.readFileSync('prison-age/echo-index.json','utf8'));
const Ride=require('../prison-age/evidence-ride.js');
const assert=(x,m)=>{if(!x)throw Error(m)};

assert(atlas.schema==='prison-age.evidence-atlas/v0.1','schema');assert(atlas.authority==='EVIDENCE_ONLY','authority');assert(atlas.cards.length===32,'32 cards');
assert(new Set(atlas.cards.map(x=>x.n)).size===32,'unique numbers');assert(atlas.cards.every(x=>x.a?.address&&x.b?.address&&x.a.source_id!==x.b.source_id),'cross-source exact addresses');
for(const c of atlas.cards){const a=idx.entries.find(e=>e.source_id===c.a.source_id&&e.start===c.a.start&&e.end===c.a.end),b=idx.entries.find(e=>e.source_id===c.b.source_id&&e.start===c.b.start&&e.end===c.b.end);assert(a&&b,'card source entries');assert(a.text===c.a.text&&b.text===c.b.text,'exact fragment bytes');assert(c.shared.length||c.phrases.length,'evidence basis')}
assert(!atlas.cards.some(c=>/ENGINE|OPERATOR|TRACE ABSENCE|RECLAIM|PUBLISH|AUTHORSHIP/i.test(c.class+' '+c.a.text.slice(0,0))),'no generated engine labels');

const runtime=fs.readFileSync('prison-age/evidence-atlas.js','utf8');new Function(runtime);assert(runtime.includes("prison-age.evidence-route/v0.1")&&runtime.includes("authority:'EVIDENCE_ONLY'"),'typed evidence trail');assert(runtime.includes('RIDE TRAIL')&&runtime.includes('SHARE TRAIL'),'trail ride/share operations');

const p=Ride.build(atlas,[1,2,3],{returnAddress:'/prison-age/?atlas=evidence&trail=1,2,3&card=3'}),v=Ride.validate(atlas,p);
assert(v.ok,'evidence ride validates: '+v.errors.join(' | '));
assert(p.evidenceRoute.cards.length===3&&p.evidenceRoute.fragments.length===6,'three relations become six exact fragments');
const expected=atlas.cards.slice(0,3).flatMap(c=>[c.a.text,c.b.text]).join('\n\n');assert(p.source===expected,'montage contains exact fragments + blank separators only');
for(const f of p.evidenceRoute.fragments){const c=atlas.cards.find(x=>x.n===f.card),x=c[f.side.toLowerCase()];assert(p.source.slice(f.montage_start,f.montage_end)===x.text,'montage span exact');assert(f.source_address===x.address,'source address preserved')}
assert(p.sourceIdentity.authority==='PRISON_AGE_EVIDENCE_ROUTE','derived source authority');assert(p.evidenceRoute.authority==='EVIDENCE_ONLY','route evidence authority');assert(/^fnv1a32:[0-9a-f]{8}$/.test(p.evidenceRoute.source_hash),'exact montage hash');assert(p.sourceIdentity.hash===p.evidenceRoute.source_hash,'identity hash matches route');assert(JSON.stringify(p.sourceIdentity.evidenceRoute)===JSON.stringify(p.evidenceRoute),'route witness survives inside source identity');assert(/adds no connective prose/i.test(p.evidenceRoute.law),'no connective prose law');
assert(Ride.sharePath([1,2,3],{card:3})==='/prison-age/?atlas=evidence&trail=1%2C2%2C3&card=3','shareable trail path');
const tamper=JSON.parse(JSON.stringify(p));tamper.source+=' invented';assert(!Ride.validate(atlas,tamper).ok,'invented bytes reject');
const provenance=JSON.parse(JSON.stringify(p));provenance.evidenceRoute.fragments[0].source_address='source-echo://fake/0-1';assert(!Ride.validate(atlas,provenance).ok,'provenance tamper rejects');
const identity=JSON.parse(JSON.stringify(p));identity.sourceIdentity.evidenceRoute.fragments[0].source_address='source-echo://fake/0-1';assert(!Ride.validate(atlas,identity).ok,'identity route drift rejects');

console.log('PRISON AGE EVIDENCE ATLAS PASS · 32 exact relations · shareable exact-fragment LIVE route + source-identity provenance PASS');
