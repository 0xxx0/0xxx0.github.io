import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync(new URL('../control/SOURCE_HOLD_TURN_TRACE_RETURN.json',import.meta.url),'utf8'));
const submission=JSON.parse(fs.readFileSync(new URL('../control/SUBMISSION_CONTRACT.json',import.meta.url),'utf8'));
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

const exactReturnFields=["result_status","source_object","host","turn_ref","before","after","observed_delta","evidence_refs","residue","unknowns","unresolved_gate","return_address","closed_at","next_authority"];
assert(p.return_schema&&Array.isArray(p.return_schema.required_fields),'return schema present');
assert(p.return_schema.required_fields.join('|')===exactReturnFields.join('|'),'exact RETURN fields');
assert(Array.isArray(p.coding_model_instruction)&&p.coding_model_instruction.length===5,'compact coding instruction');
assert(p.evidence_requirements.some(x=>x.includes('OBSERVED, DERIVED, or UNKNOWN')),'evidence classes');
assert(p.stop_conditions&&p.stop_conditions.NO_LAWFUL_HIGH_VALUE_MOVE,'stop conditions');
assert(p.worked_run&&p.worked_run.hold&&p.worked_run.trace,'worked run');
assert(p.worked_run.return.next_authority==='NONE','worked run next authority');
console.log('RETURN schema + coding-model block + worked run PASS');

const dc=p.return_schema?.downstream_consequence;
assert(p.return_schema.optional_fields?.includes('downstream_consequence'),'downstream consequence optional field');
assert(dc?.status_enum?.join('|')==='SHIPPED_ONLY|USED|PROPAGATED|COUNTERMEASURE|UNKNOWN','downstream consequence enum');
assert(dc.required_when_present.join('|')==='status|evidence_refs|observed_delta|unknowns','downstream consequence required shape');
assert(dc.laws.some(x=>x.includes('LIKE / KEEP / PRAISE / PAGE VIEW != USED')),'taste/view != use');
assert(dc.laws.some(x=>x.includes('second addressed context')),'propagation evidence law');
assert(dc.laws.some(x=>x.includes('no shared adoption store')),'no adoption authority');
assert(p.coding_model_instruction[4].includes('optional downstream_consequence'),'coding RETURN consequence instruction');
console.log('DOWNSTREAM CONSEQUENCE optional evidence block PASS');

const min=submission.minimum_execution_projection;
assert(min?.schema==='field-crew-turn/v0.1','minimum crew-turn schema');
assert(min.leaf_count===10,'minimum crew-turn leaf count');
assert(Object.keys(min.shape||{}).join('>')==='source>hold>turn>trace>return','minimum crew-turn stage order');
assert(Object.keys(min.shape.source||{}).join('|')==='object|owner','minimum SOURCE shape');
assert(Object.keys(min.shape.hold||{}).join('|')==='delta','minimum HOLD shape');
assert(Object.keys(min.shape.turn||{}).join('|')==='move|release','minimum TURN shape');
assert(Object.keys(min.shape.trace||{}).join('|')==='status|result|evidence','minimum TRACE shape');
assert(Object.keys(min.shape.return||{}).join('|')==='gate|to','minimum RETURN shape');
assert(min.invariants.some(x=>x.includes('source.object is immutable')),'same-object invariant');
assert(min.invariants.some(x=>x.includes('exactly one operation')),'one-turn invariant');
assert(min.invariants.some(x=>x.includes('no next field')&&x.includes('no actor field')),'no actor/NEXT authority surface');
assert(!JSON.stringify(min.shape).includes('actor')&&!JSON.stringify(min.shape).includes('next'),'minimum packet leaked actor/NEXT field');
assert(/full submission envelope/.test(min.intake_boundary)&&/minimum projection is sufficient/.test(min.intake_boundary),'intake→execution boundary');
console.log('MINIMUM CREW TURN PASS · one object + owner · one delta · one move · witnessed result · exact return');
