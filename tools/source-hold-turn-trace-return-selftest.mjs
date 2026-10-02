import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync(new URL('../control/SOURCE_HOLD_TURN_TRACE_RETURN.json',import.meta.url),'utf8'));
const assert=(x,m)=>{if(!x)throw new Error(m)};
const ids=p.stages.map(x=>x.id);
assert(p.schema==='0xxx0/source-hold-turn-trace-return/v0.1','schema');
assert(ids.join('>')==='SOURCE>HOLD>TURN>TRACE>RETURN','stage order');
for(const s of p.stages){
  assert(Array.isArray(s.entry)&&s.entry.length,'entry '+s.id);
  assert(Array.isArray(s.required)&&s.required.length,'required '+s.id);
  assert(Array.isArray(s.exit)&&s.exit.length,'exit '+s.id);
  assert(Array.isArray(s.fail_closed)&&s.fail_closed.length,'fail_closed '+s.id);
  assert(s.example&&Object.keys(s.example).length,'example '+s.id);
}
assert(p.stages.find(x=>x.id==='HOLD').required.includes('moves_0_to_3'),'HOLD move bound');
assert(p.laws.some(x=>x.includes('exactly one bounded native move')),'one TURN law');
assert(p.laws.some(x=>x.includes('RELEASE/commit')),'explicit effect boundary');
assert(p.laws.some(x=>x.includes('RETURN never auto-authorizes NEXT')),'RETURN no NEXT authority');
assert(p.worker_rules.some(x=>x.includes('NO_LAWFUL_HIGH_VALUE_MOVE')),'worker stop rule');
console.log('SOURCE→HOLD→TURN→TRACE→RETURN SELFTEST PASS');
