(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../../../lib/constraint-surface.js'));
  } else {
    root.DecisionBenchCore = factory(root.ConstraintSurfaceCore);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (constraints) {
  'use strict';
  const SCHEMA = 'decision-bench/v1';
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function fail(message) { throw new TypeError(message); }
  function identifier(value, where) {
    if (typeof value !== 'string' || !value.trim() || value !== value.trim() ||
        ['__proto__', 'prototype', 'constructor'].includes(value)) fail(where + ': invalid id');
    return value;
  }
  function text(value, where, fallback) {
    if (value == null && fallback !== undefined) return fallback;
    if (typeof value !== 'string') fail(where + ': expected text');
    return value;
  }
  function number(value, where) {
    if (typeof value !== 'number' || !Number.isFinite(value)) fail(where + ': expected a finite number');
    return value;
  }
  function bound(value, where) { return value == null ? null : number(value, where); }
  function interval(value, where) {
    if (value == null) return null;
    if (!Array.isArray(value)) { number(value, where); return value; }
    if (value.length !== 2) fail(where + ': expected [low, high]');
    const lo = number(value[0], where), hi = number(value[1], where);
    if (lo > hi) fail(where + ': reversed interval');
    return [lo, hi];
  }
  function range(value) { return Array.isArray(value) ? value : [value, value]; }
  function validate(state) {
    if (!object(state)) fail('Decision: expected an object');
    if (state.schema != null && state.schema !== SCHEMA) fail('Decision: unsupported schema');
    if (!Array.isArray(state.criteria) || state.criteria.length < 1 || state.criteria.length > 8) {
      fail('Decision: expected 1–8 criteria');
    }
    if (!Array.isArray(state.options) || state.options.length > 40) fail('Decision: expected at most 40 options');
    if (state.sample != null && typeof state.sample !== 'boolean') fail('Decision: sample must be boolean');
    const criterionIds = new Set(), optionIds = new Set();
    const criteria = state.criteria.map((criterion, index) => {
      const where = 'Criterion ' + (index + 1);
      if (!object(criterion)) fail(where + ': expected an object');
      const id = identifier(criterion.id, where);
      if (criterionIds.has(id)) fail(where + ': duplicate id');
      criterionIds.add(id);
      if (!['min', 'max'].includes(criterion.direction)) fail(where + ': direction must be min or max');
      const min = bound(criterion.min, where + ' minimum'), max = bound(criterion.max, where + ' maximum');
      if (min !== null && max !== null && min > max) fail(where + ': conflicting bounds');
      return { id, label: text(criterion.label, where + ' label'), unit: text(criterion.unit, where + ' unit', ''), direction: criterion.direction, min, max };
    });
    const options = state.options.map((option, index) => {
      const where = 'Option ' + (index + 1);
      if (!object(option) || !object(option.values)) fail(where + ': expected an object with values');
      const id = identifier(option.id, where);
      if (optionIds.has(id)) fail(where + ': duplicate id');
      optionIds.add(id);
      for (const key of Object.keys(option.values)) if (!criterionIds.has(key)) fail(where + ': unknown criterion ' + key);
      const values = {};
      for (const criterion of criteria) values[criterion.id] = interval(own(option.values, criterion.id) ? option.values[criterion.id] : null, where + ' / ' + criterion.label);
      return { id, label: text(option.label, where + ' label'), values, evidence: text(option.evidence, where + ' evidence', ''), next: text(option.next, where + ' next action', '') };
    });
    const priority = state.priority == null ? null : identifier(state.priority, 'Priority');
    const selected = state.selected == null ? null : identifier(state.selected, 'Selection');
    if (priority !== null && !criterionIds.has(priority)) fail('Priority: unknown criterion');
    if (selected !== null && !optionIds.has(selected)) fail('Selection: unknown option');
    return { schema: SCHEMA, id: identifier(state.id, 'Decision'), title: text(state.title, 'Decision title'), sample: state.sample === true, context: text(state.context, 'Decision context', ''), criteria, options, priority, selected };
  }
  function benefit(option, criterion) {
    const [lo, hi] = range(option.values[criterion.id]);
    return criterion.direction === 'max' ? [lo, hi] : [-hi, -lo];
  }
  function dominates(a, b, criteria) {
    let strict = false;
    for (const criterion of criteria) {
      const worstA = benefit(a, criterion)[0], bestB = benefit(b, criterion)[1];
      if (worstA < bestB) return false;
      if (worstA > bestB) strict = true;
    }
    return strict;
  }
  function evaluate(input) {
    const state = validate(input);
    if (!constraints || typeof constraints.survivors !== 'function') fail('ConstraintSurfaceCore is required');
    const measurements = [], relaxations = [];
    const rows = state.options.map(option => {
      const reasons = [], margins = [];
      let blocked = false, uncertain = false;
      for (const criterion of state.criteria) {
        const value = option.values[criterion.id], unit = criterion.unit ? ' ' + criterion.unit : '';
        if (value === null) {
          uncertain = true;
          const reason = option.label + ': measure ' + criterion.label + unit + '; value is unknown.';
          reasons.push(reason); measurements.push(reason);
          continue;
        }
        const [lo, hi] = range(value);
        for (const edge of ['min', 'max']) {
          const limit = criterion[edge];
          if (limit === null) continue;
          const worst = edge === 'min' ? lo : hi, best = edge === 'min' ? hi : lo;
          const satisfied = edge === 'min' ? worst >= limit : worst <= limit;
          const violates = edge === 'min' ? best < limit : best > limit;
          const status = satisfied ? 'FEASIBLE' : violates ? 'BLOCKED' : 'UNCERTAIN';
          const difference = edge === 'min' ? worst - limit : limit - worst;
          margins.push({ criterionId: criterion.id, bound: edge, limit, worst, best, margin: Number.isFinite(difference) ? difference : null, status });
          if (satisfied) continue;
          blocked = blocked || violates; uncertain = uncertain || !violates;
          const sign = edge === 'min' ? '≥' : '≤';
          const reason = option.label + ': ' + criterion.label + ' [' + lo + ', ' + hi + ']' + unit + (violates ? ' violates ' : ' may violate ') + sign + ' ' + limit + unit + '.';
          reasons.push(reason);
          if (!violates) measurements.push(reason + ' Measure before treating this option as feasible.');
          relaxations.push({ optionId: option.id, criterionId: criterion.id, bound: edge, from: limit, to: worst });
        }
      }
      return { id: option.id, status: blocked ? 'BLOCKED' : uncertain ? 'UNCERTAIN' : 'FEASIBLE', reasons, margins };
    });
    // Numeric predicates adapt the shared constraint core; no separate survivor authority.
    const feasible = constraints.survivors(rows, [], {}, null, row => row.status === 'FEASIBLE').map(row => row.id);
    const options = state.options.filter(option => feasible.includes(option.id));
    const dominated = [];
    for (const option of options) {
      const superior = options.filter(other => other.id !== option.id && dominates(other, option, state.criteria));
      if (superior.length) dominated.push({ id: option.id, by: superior.map(other => other.id) });
    }
    const discarded = new Set(dominated.map(row => row.id));
    const frontierOptions = options.filter(option => !discarded.has(option.id));
    const frontier = frontierOptions.map(option => option.id);
    let leader = null, priorityContenders = [...frontier];
    if (state.priority !== null && frontier.length) {
      const criterion = state.criteria.find(item => item.id === state.priority);
      priorityContenders = frontierOptions.filter(option => !frontierOptions.some(other => other.id !== option.id && benefit(other, criterion)[0] > benefit(option, criterion)[1])).map(option => option.id);
      const leaders = frontierOptions.filter(option => frontierOptions.every(other => other.id === option.id || benefit(option, criterion)[0] > benefit(other, criterion)[1]));
      if (leaders.length === 1) leader = leaders[0].id;
      if (leader === null && priorityContenders.length > 1 && frontierOptions.some(option => { const [lo, hi] = range(option.values[criterion.id]); return lo !== hi && priorityContenders.includes(option.id); })) {
        measurements.push('Measure ' + criterion.label + (criterion.unit ? ' (' + criterion.unit + ')' : '') + ' for ' + frontierOptions.filter(option => priorityContenders.includes(option.id)).map(option => option.label).join(', ') + '; overlapping ranges prevent a guaranteed priority winner.');
      }
    }
    return { rows, feasible, frontier, dominated, leader, priorityContenders, measurements, relaxations };
  }
  function serialize(state) { return JSON.stringify(validate(state), null, 2); }
  function restore(value) {
    if (typeof value !== 'string') return validate(value);
    let parsed;
    try { parsed = JSON.parse(value); } catch (_) { fail('Decision: invalid JSON'); }
    return validate(parsed);
  }
  return Object.freeze({ schema: SCHEMA, version: '1', validate, evaluate, serialize, restore });
});
