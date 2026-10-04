// Legacy pipe transport only. All decision mathematics belongs to DecisionBenchCore.
import '../../lib/constraint-surface.js';
import * as coreModule from '../../forward-field-proof/triangle/bench/decision-core.js';

const Core = coreModule.default || globalThis.DecisionBenchCore;
if (!Core) throw new Error('DecisionBenchCore is required.');
export const AXES = Object.freeze(['form', 'function', 'fortitude']);
const clean = value => String(value ?? '').trim();
const numeric = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
const exactPattern = new RegExp('^' + numeric + '$');
const rangePattern = new RegExp('^(' + numeric + ')\\s*(?:\\.\\.|–|—|-)\\s*(' + numeric + ')$');

export function parseScore(raw) {
  const text = clean(raw);
  if (!text || text === '?' || /^unknown$/i.test(text)) return {kind:'unknown',lo:null,hi:null,raw:text || '?'};
  const match = text.match(rangePattern);
  if (match) {
    const lo = Number(match[1]), hi = Number(match[2]);
    return Number.isFinite(lo) && Number.isFinite(hi) && lo <= hi
      ? {kind:'range',lo,hi,raw:text}
      : {kind:'invalid',lo:null,hi:null,raw:text};
  }
  if (exactPattern.test(text) && Number.isFinite(Number(text))) return {kind:'exact',lo:Number(text),hi:Number(text),raw:text};
  return {kind:'invalid',lo:null,hi:null,raw:text};
}

export function parseCandidates(text) {
  const errors = [], items = [];
  clean(text).split(/\r?\n/).forEach((line, index) => {
    const raw = line.trim();
    if (!raw || raw.startsWith('#')) return;
    const parts = raw.split('|').map(clean);
    if (parts.length !== 5) {
      errors.push({line:index + 1,error:'expected NAME | FORM | FUNCTION | FORTITUDE | note',raw}); return;
    }
    const [name, ...values] = parts;
    if (!name) { errors.push({line:index + 1,error:'name required',raw}); return; }
    const scores = Object.fromEntries(AXES.map((axis, i) => [axis, parseScore(values[i])]));
    const invalid = AXES.filter(axis => scores[axis].kind === 'invalid');
    if (invalid.length) { errors.push({line:index + 1,error:'invalid or reversed score: ' + invalid.join(', '),raw}); return; }
    items.push({id:'c' + (items.length + 1),name,scores,note:parts[4],source_line:index + 1});
  });
  return {items, errors};
}

export function normalizeMinima(minima = {}) {
  return Object.fromEntries(AXES.map(axis => {
    const value = minima[axis];
    if (value == null || clean(value) === '' || clean(value) === '?') return [axis, null];
    if (typeof value !== 'number' && typeof value !== 'string') throw new TypeError(axis + ': invalid minimum');
    const parsed = parseScore(value);
    if (parsed.kind !== 'exact') throw new TypeError(axis + ': minimum must be a finite number or blank');
    return [axis, parsed.lo];
  }));
}

function scoreValue(score, axis) {
  if (!score || !['unknown', 'exact', 'range'].includes(score.kind)) throw new TypeError(axis + ': invalid score');
  if (score.kind === 'unknown') return null;
  if (score.kind === 'exact' && score.lo !== score.hi) throw new TypeError(axis + ': malformed exact score');
  return score.kind === 'exact' ? score.lo : [score.lo, score.hi];
}
function model(candidates, minima = {}, label = 'Legacy FORM / FUNCTION / FORTITUDE') {
  const mins = normalizeMinima(minima);
  return Core.validate({schema:Core.schema,id:'omnitools-legacy',title:label,sample:false,
    context:'Legacy declared scores: all three axes prefer larger values. No physical measurement definitions were supplied. Define quantities and units before treating this as an engineering decision.',
    criteria:AXES.map(id => ({id,label:id.toUpperCase(),unit:'declared score',direction:'max',min:mins[id],max:null})),
    options:candidates.map(candidate => ({id:candidate.id,label:candidate.name,
      values:Object.fromEntries(AXES.map(axis => [axis, scoreValue(candidate.scores[axis], axis)])),
      evidence:candidate.note || '',next:''})),priority:null,selected:null});
}
const legacyState = {FEASIBLE:'VIABLE',UNCERTAIN:'POTENTIAL',BLOCKED:'REJECT'};
function feasibilityResult(row, mins, unknown) {
  return {state:legacyState[row.status],status:row.status,reasons:row.reasons,
    unknown,
    minima:mins};
}

export function feasibility(candidate, minima = {}) {
  const state = model([candidate], minima), evaluated = Core.evaluate(state);
  return feasibilityResult(evaluated.rows[0], normalizeMinima(minima), AXES.filter(axis => candidate.scores[axis].kind === 'unknown'));
}

export function guaranteedDominates(a, b) {
  const state = model([{...a,id:'A'}, {...b,id:'B'}]);
  return Core.evaluate(state).dominated.some(row => row.id === 'B' && row.by.includes('A'));
}

export function evaluateBench(candidates, minima = {}) {
  const state = model(candidates, minima), analysis = Core.evaluate(state), mins = normalizeMinima(minima);
  const byId = new Map(candidates.map(candidate => [candidate.id, candidate]));
  const rows = candidates.map(candidate => {
    const row = analysis.rows.find(item => item.id === candidate.id);
    const domination = analysis.dominated.find(item => item.id === candidate.id);
    const dominated_by = domination?.by || [];
    const disposition = row.status === 'BLOCKED' ? 'REJECT' : row.status === 'UNCERTAIN' ? 'UNRESOLVED' : dominated_by.length ? 'DOMINATED' : 'FRONT';
    return {...candidate,feasibility:feasibilityResult(row, mins, AXES.filter(axis => candidate.scores[axis].kind === 'unknown')),disposition,dominated_by,
      dominated_by_names:dominated_by.map(id => byId.get(id).name),
      missing_evidence:AXES.filter(axis => candidate.scores[axis].kind === 'unknown' || row.margins.some(margin => margin.criterionId === axis && margin.status === 'UNCERTAIN'))};
  });
  const counts = {FRONT:0,DOMINATED:0,REJECT:0,UNRESOLVED:0};
  rows.forEach(row => counts[row.disposition]++);
  return {schema:'omnitools-bench/v0.2',authority:'ADVISORY_ONLY',axes:[...AXES],minima:mins,counts,rows,
    state,analysis,laws:[
      'DecisionBenchCore owns feasibility and dominance; the legacy transport supplies declared larger-is-better scores only.',
      'Blank limits stay unset. Invalid or reversed input fails closed.',
      'Unknown or threshold-crossing evidence remains UNRESOLVED, separate from the verified frontier.',
      'No weighted winner is invented. No priority was supplied by legacy input.'
    ]};
}

export function parseAndEvaluate(text, minima = {}) {
  const parsed = parseCandidates(text);
  if (parsed.errors.length) throw new TypeError(parsed.errors.map(error => 'line ' + error.line + ': ' + error.error).join('; '));
  return {...parsed,evaluation:evaluateBench(parsed.items,minima)};
}

export function parseDecisionSource(text, label = 'Imported decision') {
  if (typeof text !== 'string' || !text.trim()) throw new TypeError('Decision source is empty.');
  const source = text.trim();
  if (/^[{\[]/.test(source)) {
    let value;
    try { value = JSON.parse(source); } catch (_) { throw new TypeError('Decision source is invalid JSON.'); }
    return Core.restore(value?.state || value);
  }
  const parsed = parseCandidates(text);
  if (parsed.errors.length) throw new TypeError(parsed.errors.map(error => 'line ' + error.line + ': ' + error.error).join('; '));
  if (!parsed.items.length) throw new TypeError('Decision source has no alternatives.');
  return model(parsed.items, {}, label);
}
