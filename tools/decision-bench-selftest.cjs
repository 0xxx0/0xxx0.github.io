'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const core = require('../forward-field-proof/triangle/bench/decision-core.js');
const triangle = require('../forward-field-proof/triangle/bench/triangle-view.js');
const criteria = [
  { id: 'time', label: 'Setup', unit: 'min', direction: 'min', min: null, max: 60 },
  { id: 'tasks', label: 'Tasks', unit: 'tasks', direction: 'max', min: null, max: null },
  { id: 'undo', label: 'Undo', unit: 'min', direction: 'min', min: null, max: null }
];
function state(values, priority = 'time') {
  return { id: 'fixture', title: 'Synthetic decision fixture', criteria: structuredClone(criteria), options: values.map((value, i) => ({ id: String.fromCharCode(65 + i), label: String.fromCharCode(65 + i), values: { time: value[0], tasks: value[1], undo: value[2] }, evidence: 'Synthetic test values', next: '' })), priority, selected: null };
}
let count = 0;
function test(label, callback) { callback(); count++; process.stdout.write('PASS ' + label + '\n'); }
test('mandatory failure overrides superior soft criteria', () => {
  const result = core.evaluate(state([[[61, 70], 100, 0], [50, 1, 5]]));
  assert.equal(result.rows[0].status, 'BLOCKED'); assert.deepEqual(result.feasible, ['B']); assert.equal(result.leader, 'B');
});
test('straddling bounds and unknown values remain uncertain', () => {
  const result = core.evaluate(state([[[50, 70], 1, 5], [null, 1, 5], [45, null, 2]]));
  assert.deepEqual(result.rows.map(row => row.status), ['UNCERTAIN', 'UNCERTAIN', 'UNCERTAIN']);
  assert.deepEqual(result.feasible, []); assert.ok(result.measurements.length >= 3);
  assert.deepEqual(result.relaxations, [{ optionId: 'A', criterionId: 'time', bound: 'max', from: 60, to: 70 }]);
});
test('Pareto elimination preserves genuine tradeoffs', () => {
  const input = state([[3, 4, 5], [2, 4, 5], [4, 5, 5]], null);
  input.criteria.forEach(criterion => { criterion.direction = 'max'; criterion.max = null; });
  const result = core.evaluate(input);
  assert.deepEqual(result.frontier, ['C']); assert.deepEqual(result.dominated.find(row => row.id === 'B').by, ['A', 'C']);
  input.options[2].values.tasks = 3;
  assert.deepEqual(core.evaluate(input).frontier, ['A', 'C']);
});
test('interval overlap never fabricates dominance or a priority winner', () => {
  const result = core.evaluate(state([[[2, 4], 4, 5], [3, 4, 5]]));
  assert.deepEqual(result.frontier, ['A', 'B']); assert.equal(result.leader, null);
  assert.deepEqual(result.priorityContenders, ['A', 'B']); assert.ok(result.measurements.some(reason => reason.includes('overlapping')));
});
test('threshold sensitivity and validated roundtrip preserve ranges and evidence', () => {
  const input = state([[[50, 70], 4, 5]]); input.selected = 'A'; input.sample = true; input.context = 'Synthetic values, not personal measurements';
  assert.equal(core.evaluate(input).rows[0].status, 'UNCERTAIN');
  input.criteria[0].max = 70; assert.equal(core.evaluate(input).rows[0].status, 'FEASIBLE');
  input.criteria[0].max = 49; assert.equal(core.evaluate(input).rows[0].status, 'BLOCKED');
  assert.deepEqual(core.restore(core.serialize(input)), core.validate(input));
});
test('zero survivors and exact ties have no winner', () => {
  const none = core.evaluate(state([[70, 4, 5], [80, 5, 1]]));
  assert.deepEqual(none.frontier, []); assert.equal(none.leader, null);
  const ties = core.evaluate(state([[50, 4, 5], [50, 4, 5]]));
  assert.deepEqual(ties.frontier, ['A', 'B']); assert.equal(ties.leader, null); assert.deepEqual(ties.dominated, []);
  assert.equal(core.evaluate(state([])).leader, null);
});
test('lower bounds, both bounds and blocked precedence are independent of direction', () => {
  const input = state([[10, [2, 4], null], [10, [4, 5], 5], [10, [0, 1], null]]);
  input.criteria[1].min = 3; input.criteria[1].max = 5;
  const result = core.evaluate(input);
  assert.deepEqual(result.rows.map(row => row.status), ['UNCERTAIN', 'FEASIBLE', 'BLOCKED']);
  assert.deepEqual(result.relaxations.map(row => row.to), [2, 0]);
  assert.equal(result.rows[1].margins.find(row => row.criterionId === 'tasks' && row.bound === 'min').margin, 1);
});
test('strict separated priority ranges select only from the feasible frontier', () => {
  const result = core.evaluate(state([[[10, 20], 1, 10], [[25, 30], 3, 5], [[0, 5], null, 0]]));
  assert.deepEqual(result.frontier, ['A', 'B']); assert.equal(result.leader, 'A'); assert.deepEqual(result.priorityContenders, ['A']);
});
test('evaluation and validation never mutate caller state or alias arrays', () => {
  const input = state([[[10, 20], 1, 10]]); const original = structuredClone(input);
  const normalized = core.validate(input); core.evaluate(input); assert.deepEqual(input, original);
  normalized.options[0].values.time[0] = 99; assert.deepEqual(input, original);
});
test('malformed imports, numeric strings, nonfinite values and invalid references reject', () => {
  const mutations = [
    x => { x.options[0].values.time = '30'; }, x => { x.options[0].values.time = NaN; },
    x => { x.options[0].values.time = Infinity; }, x => { x.options[0].values.time = [4, 2]; },
    x => { x.options[0].values.time = [1, 2, 3]; }, x => { x.options[0].values.time = [1, '2']; },
    x => { x.criteria[0].max = '60'; }, x => { x.criteria[0].direction = 'up'; },
    x => { x.criteria[0].min = 70; }, x => { x.criteria[1].id = 'time'; },
    x => { x.options[1].id = 'A'; }, x => { x.options[0].id = ' A'; },
    x => { x.criteria[0].id = '__proto__'; }, x => { x.priority = 'missing'; },
    x => { x.selected = 'missing'; }, x => { x.schema = 'decision-bench/v99'; },
    x => { x.options[0].values.extra = 1; }, x => { x.criteria = []; },
    x => { x.options[0].evidence = 5; }, x => { x.sample = 'yes'; }, x => { x.context = 5; },
    x => { x.options = Array.from({ length: 41 }, (_, i) => ({ ...x.options[0], id: 'o' + i })); }
  ];
  for (const mutate of mutations) { const input = state([[30, 1, 5], [40, 2, 4]]); mutate(input); assert.throws(() => core.restore(input), TypeError); }
  for (const value of ['{', '[]', 'null', '"oops"']) assert.throws(() => core.restore(value), TypeError);
});
test('1–8 criteria supported; missing values preserved as null and units kept as labels', () => {
  const input = state([[10, 1, 5]]); input.criteria = [input.criteria[0]]; delete input.options[0].values.tasks; delete input.options[0].values.undo;
  assert.equal(core.evaluate(input).rows[0].status, 'FEASIBLE');
  delete input.options[0].values.time; assert.equal(core.validate(input).options[0].values.time, null);
  assert.equal(core.evaluate(input).rows[0].status, 'UNCERTAIN');
  input.criteria[0].unit = 'user-defined unit'; assert.equal(core.restore(core.serialize(input)).criteria[0].unit, 'user-defined unit');
  const eight = state([[10, 1, 5]]); eight.criteria = Array.from({ length: 8 }, (_, i) => ({ ...criteria[0], id: 'c' + i }));
  eight.priority = 'c0'; eight.options[0].values = Object.fromEntries(eight.criteria.map(criterion => [criterion.id, 10]));
  assert.deepEqual(core.evaluate(eight).feasible, ['A']);
  input.criteria = Array.from({ length: 9 }, (_, i) => ({ ...criteria[0], id: 'c' + i })); assert.throws(() => core.validate(input), TypeError);
});
test('browser UMD uses the same shared constraint adapter', () => {
  const context = vm.createContext({});
  for (const filename of ['lib/constraint-surface.js', 'forward-field-proof/triangle/bench/decision-core.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', filename), 'utf8'), context);
  const output = context.DecisionBenchCore.evaluate(state([[30, 1, 5]]));
  assert.equal(output.leader, 'A'); assert.deepEqual(Array.from(output.feasible), ['A']);
});
test('simplex projection round-trips through the recovered Bench 0.1 geometry', () => {
  const cases = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1 / 3, 1 / 3, 1 / 3], [0.2, 0.3, 0.5], [0.97, 0.02, 0.01]];
  for (const weights of cases) {
    const back = triangle.pointWeights(triangle.baryPoint(weights));
    back.forEach((value, i) => assert.ok(Math.abs(value - weights[i]) < 1e-6, 'round-trip ' + weights + ' -> ' + back));
  }
  const outside = triangle.pointWeights({ x: 0, y: 0 });
  assert.ok(Math.abs(outside.reduce((a, b) => a + b, 0) - 1) < 1e-9, 'outside point must stay normalised');
  assert.ok(outside.every(value => value >= 0), 'outside point must stay inside the simplex');
});
test('triangle projection plots entered options, keeps unknowns out, marks the frontier and escapes labels', () => {
  const input = state([[10, 2, 5], [20, 4, null], [30, 6, 1]]);
  input.criteria.forEach(criterion => { criterion.direction = 'max'; criterion.min = null; criterion.max = null; });
  input.options[0].label = 'A<b & "q">';
  const result = core.evaluate(input);
  assert.deepEqual(result.feasible, ['A', 'C']);
  const view = triangle.project(core.validate(input), result);
  assert.equal(view.points.length, 2, 'unknown measure must not be plotted');
  assert.equal(view.excluded, 1);
  for (const point of view.points) {
    assert.ok(Math.abs(point.weights.reduce((a, b) => a + b, 0) - 1) < 1e-9, 'weights must sum to 1');
    assert.ok(point.x >= triangle.B.x - 1 && point.x <= triangle.C.x + 1 && point.y >= triangle.A.y - 1 && point.y <= triangle.C.y + 1, 'point inside simplex');
    assert.equal(point.frontier, result.frontier.indexOf(point.id) !== -1, 'frontier flag must come from the constraint core');
  }
  const markup = triangle.markup(core.validate(input), result);
  assert.ok(markup.startsWith('<svg') && markup.includes('</svg>') && markup.includes('TABLE IS CANONICAL'));
  assert.ok(markup.includes('A&lt;b &amp; &quot;q&quot;'), 'labels must be escaped');
  assert.ok(!/<script/i.test(markup), 'projection must not introduce script');
});
process.stdout.write('Decision bench: ' + count + ' tests passed.\n');
