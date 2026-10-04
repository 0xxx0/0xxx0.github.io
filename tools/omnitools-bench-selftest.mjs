import assert from 'node:assert/strict';
import Core from '../forward-field-proof/triangle/bench/decision-core.js';
import {parseScore,parseCandidates,normalizeMinima,feasibility,guaranteedDominates,evaluateBench,parseAndEvaluate,parseDecisionSource} from '../foundry/omnitools/bench.mjs';

let passed = 0;
const test = (name, run) => { run(); passed++; console.log('PASS ' + name); };
const source = 'A | 80 | 90 | 85 | strong\nB | 70..82 | 88 | 70 | overlaps A\nC | ? | 92 | 90 | missing form\nD | 40 | 95 | 95 | fails floor\nE | 50 | 60 | 60 | weaker\nF | 45..65 | 70 | 70 | crosses floor';
const parsed = parseCandidates(source), minima = {form:50,function:50,fortitude:50};

test('strict legacy numeric parsing rejects reversed, coercive and infinite values', () => {
  assert.deepEqual(parseScore('60..80'), {kind:'range',lo:60,hi:80,raw:'60..80'});
  for (const value of ['80..60', '0x10', 'Infinity', 'NaN', '1e999', 'true', '1..2..3']) assert.equal(parseScore(value).kind, 'invalid');
  assert.equal(parseScore('-5..-2').lo, -5); assert.equal(parseScore('1e-2').lo, .01); assert.equal(parseScore('?').kind, 'unknown');
});
test('blank limits stay unset and malformed minima cannot fall back to zero', () => {
  assert.deepEqual(normalizeMinima(), {form:null,function:null,fortitude:null});
  assert.equal(normalizeMinima({form:''}).form, null);
  for (const value of ['banana','1..3',false,Infinity]) assert.throws(() => normalizeMinima({form:value}), TypeError);
  assert.equal(normalizeMinima({form:'50'}).form, 50);
});
test('compatibility projection separates unresolved values from verified frontier', () => {
  const output = evaluateBench(parsed.items, minima), row = name => output.rows.find(item => item.name === name);
  assert.equal(row('A').disposition, 'FRONT'); assert.equal(row('B').disposition, 'FRONT');
  assert.equal(row('C').disposition, 'UNRESOLVED'); assert.equal(row('F').disposition, 'UNRESOLVED');
  assert.equal(row('D').disposition, 'REJECT'); assert.equal(row('E').disposition, 'DOMINATED');
  assert.deepEqual(row('F').missing_evidence, ['form']); assert.deepEqual(row('C').missing_evidence, ['form']);
  assert.equal(output.counts.UNRESOLVED, 2); assert.equal(output.analysis.leader, null);
  assert.deepEqual(output.analysis, Core.evaluate(output.state));
});
test('old feasibility and dominance API delegates to the exact engine', () => {
  const [A,B,C,D,E] = parsed.items;
  assert.equal(feasibility(A,minima).state, 'VIABLE'); assert.equal(feasibility(C,minima).state, 'POTENTIAL');
  assert.equal(feasibility(D,minima).state, 'REJECT'); assert.equal(guaranteedDominates(A,B), false);
  assert.equal(guaranteedDominates(A,C), false); assert.equal(guaranteedDominates(A,E), true);
});
test('any malformed row rejects the entire imported model rather than dropping an alternative', () => {
  for (const invalid of ['B | 9..2 | 5 | 6 | reversed', 'B | 9 | 5', 'B | 9 | 5 | 6 | note | extra']) {
    assert.throws(() => parseDecisionSource('A | 1 | 2 | 3 | ok\n' + invalid), TypeError);
    assert.throws(() => parseAndEvaluate('A | 1 | 2 | 3 | ok\n' + invalid), TypeError);
  }
  assert.throws(() => parseDecisionSource('# comment only'), TypeError); assert.throws(() => parseDecisionSource(''), TypeError);
});
test('legacy source defines declared scores explicitly without invented physical units or thresholds', () => {
  const model = parseDecisionSource(source, 'Held rail alternatives');
  assert.equal(model.title, 'Held rail alternatives'); assert.equal(model.priority, null);
  assert.ok(model.criteria.every(criterion => criterion.unit === 'declared score' && criterion.direction === 'max' && criterion.min === null && criterion.max === null));
  assert.match(model.context, /No physical measurement definitions/);
});
test('generic numeric models and returns retain units, directions, intervals and source context', () => {
  const model = parseDecisionSource('A | 1 | 2 | 3 | source note');
  model.criteria[0] = {...model.criteria[0],label:'Width',unit:'cm',direction:'min',max:80};
  model.options[0].values.form = [60,70]; model.sample = true; model.context = 'Illustrative only';
  const direct = parseDecisionSource(JSON.stringify(model));
  assert.deepEqual(direct, model);
  assert.deepEqual(parseDecisionSource(JSON.stringify({schema:'decision-bench-return/v1',state:model,analysis:{fabricated:true}})), model);
  assert.throws(() => parseDecisionSource('{ invalid JSON'), TypeError);
  model.options[0].values.form = '70'; assert.throws(() => parseDecisionSource(JSON.stringify(model)), TypeError);
});
test('parser and adapter do not mutate supplied candidates and reject duplicate IDs', () => {
  const before = structuredClone(parsed.items); evaluateBench(parsed.items, minima); assert.deepEqual(parsed.items,before);
  const duplicate = structuredClone(parsed.items); duplicate[1].id = duplicate[0].id;
  assert.throws(() => evaluateBench(duplicate,minima), TypeError);
});
console.log('OMNITOOLS BENCH PASS · ' + passed + ' tests · shared numeric core, lossless generic import, strict legacy transport');
