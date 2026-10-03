import assert from 'node:assert/strict';
import {parseScore,parseCandidates,feasibility,guaranteedDominates,evaluateBench} from '../foundry/omnitools/bench.mjs';

assert.deepEqual(parseScore('?').kind,'unknown');
assert.deepEqual(parseScore('70').lo,70);
assert.deepEqual(parseScore('60..80'),{kind:'range',lo:60,hi:80,raw:'60..80'});

const parsed=parseCandidates(`
A | 80 | 90 | 85 | proven strong
B | 70..82 | 88 | 70 | overlaps A on form
C | ? | 92 | 90 | missing form
D | 40 | 95 | 95 | fails form floor
E | 50 | 60 | 60 | safely weaker
`);
assert.equal(parsed.errors.length,0);
assert.equal(parsed.items.length,5);

const mins={form:50,function:50,fortitude:50};
const [A,B,C,D,E]=parsed.items;
assert.equal(feasibility(A,mins).state,'VIABLE');
assert.equal(feasibility(C,mins).state,'POTENTIAL');
assert.equal(feasibility(D,mins).state,'REJECT');
assert.equal(guaranteedDominates(A,B),false,'overlapping range must survive');
assert.equal(guaranteedDominates(A,C),false,'unknown evidence cannot be dominated');
assert.equal(guaranteedDominates(A,E),true,'strict guaranteed superiority should dominate');

const result=evaluateBench(parsed.items,mins);
const row=name=>result.rows.find(r=>r.name===name);
assert.equal(row('A').disposition,'FRONT');
assert.equal(row('B').disposition,'FRONT');
assert.equal(row('C').disposition,'FRONT');
assert.equal(row('D').disposition,'REJECT');
assert.equal(row('E').disposition,'DOMINATED');
assert.deepEqual(row('C').missing_evidence,['form']);
assert.ok(row('E').dominated_by_names.includes('A'));
assert.equal(result.authority,'ADVISORY_ONLY');
assert.match(result.laws.join(' '),/no weighted winner/i);

console.log('OMNITOOLS BENCH PASS · hard limits + unknowns + conservative dominance');
