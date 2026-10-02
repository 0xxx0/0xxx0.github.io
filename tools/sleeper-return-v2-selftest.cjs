const fs=require('fs');
const V=require('../lib/sleeper-return-v2.js');
const assert=(x,m)=>{if(!x)throw new Error(m)};
const receipt=JSON.parse(fs.readFileSync('returns/SLEEPER_HUMAN_RETURN_0C4VA6Q_2026-09-27.json','utf8'));
const a=receipt.artifact;
const r=V.validate(a);
assert(r.ok,'human return should validate: '+r.errors.join(' | '));
assert(r.derived.worldKey==='0C4VA6Q','world key derivation');
assert(r.derived.transferTool==='w8','TRANSFER tool derivation');
assert(r.derived.dominantOperator==='spiral','dominant operator derivation');
assert(r.derived.returnedSource==='DOORS. BECOME SOME WRONG. ARE MAPS ALL','returned source derivation');
assert(r.derived.witness==='始 · 未 · 时 · 已 · 空 · 示 · 末 · 来','witness order derivation');

const bad=(patch)=>{
  const x=JSON.parse(JSON.stringify(a));patch(x);
  const q=V.validate(x);assert(!q.ok,'tamper should reject');return q.errors.join(' | ');
};
assert(/world key/.test(bad(x=>x.worldKey='XXXXXXX')),'world key tamper');
assert(/token mismatch/.test(bad(x=>x.proofs[0].token='未')),'Gate token tamper');
assert(/method mismatch/.test(bad(x=>x.proofs.find(p=>p.gate==='TRANSFER').method='conch')),'TRANSFER method tamper');
assert(/returned source/.test(bad(x=>x.returnedSource='SAME')),'returned source tamper');
assert(/dominant operator/.test(bad(x=>x.dominantOperator='w8')),'dominant operator tamper');
assert(/cell witness/.test(bad(x=>x.cell.witness='未 · 始')),'witness tamper');
assert(/strictly increasing/.test(bad(x=>x.proofs[2].step=10)),'proof order tamper');
assert(/final steps/.test(bad(x=>x.measures.steps=100)),'measure bound tamper');
assert(/below proof-bearing uses/.test(bad(x=>x.operatorCounts.w8=1)),'operator proof-use count tamper');
assert(/TRANSFER occurred before/.test(bad(x=>{
  const ri=x.proofs.findIndex(p=>p.gate==='RETRIEVAL'),ti=x.proofs.findIndex(p=>p.gate==='TRANSFER');
  const r=x.proofs[ri],t=x.proofs[ti];
  x.proofs[ri]={...t,step:r.step,elapsedMs:r.elapsedMs};
  x.proofs[ti]={...r,step:t.step,elapsedMs:t.elapsedMs};
  x.cell.witness=x.proofs.map(p=>p.token).join(' · ');
})),'TRANSFER prerequisite tamper');
console.log('SLEEPER RETURN V2 SELFTEST PASS · WORLD',r.derived.worldKey,'· TRANSFER',r.derived.transferTool.toUpperCase(),'· DOMINANT',r.derived.dominantOperator.toUpperCase());
require('./sleeper-native-port-selftest.cjs');
