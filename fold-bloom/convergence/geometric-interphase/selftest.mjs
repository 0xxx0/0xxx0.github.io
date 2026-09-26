import assert from 'node:assert/strict';
import { PROJECTIONS, changeFocus, contract, makeHost, project, returnToHost, semanticTree } from './kernel.mjs';

const host = makeHost();
const ids = host.facets.map(f => f.id);
const equal = (a, b) => assert.deepEqual(a, b);

for (const view of PROJECTIONS) {
  const p = project(host, view);
  assert.equal(p.objectId, host.objectId);
  assert.equal(p.sourceId, host.source.id);
  equal(p.facets.map(f => f.id), ids);
  equal(p.focusIds, host.focusIds);
  assert.equal(p.authority, host.authority);
  assert.equal(p.residue.suppressedFacetIds.length, 0);
}

// Every aperture preserves a disjoint, exhaustive account of visible + residue.
for (let mask = 0; mask < (1 << ids.length); mask += 1) {
  const aperture = ids.filter((_, i) => mask & (1 << i));
  for (const view of PROJECTIONS) {
    const p = project(host, view, aperture);
    const visible = p.facets.map(f => f.id);
    const residue = p.residue.suppressedFacetIds;
    assert.equal(new Set([...visible, ...residue]).size, ids.length);
    equal([...visible, ...residue].sort(), [...ids].sort());
    assert.equal(visible.some(id => residue.includes(id)), false);
  }
}

// FOVEA remains an addressed facet; changing coordinates cannot change focus identity.
const multifocus = changeFocus(host, ['focus', 'seam']);
for (const view of PROJECTIONS) equal(project(multifocus, view).focusIds, ['focus', 'seam']);

// Fold/return restores caller context over the same host; it is not rollback.
const packet = contract(multifocus, 'RADIAL', ['focus', 'seam']);
const returned = returnToHost(packet, multifocus);
assert.strictEqual(returned.host, multifocus);
equal(returned.context, { projection: 'RADIAL', focusIds: ['focus', 'seam'], returnAddress: '/fold-bloom/' });
assert.throws(() => returnToHost(packet, { ...multifocus, objectId: 'other' }), /identity mismatch/);

// Hylomorphism unfolds typed parts then folds a summary; source authority remains out of geometry.
const tree = semanticTree(host);
assert.equal(tree.children.length, host.facets.length);
equal(tree.children.map(n => n.id), ids);
const keys = node => Object.keys(node).concat(node.children.flatMap(keys));
assert.equal(keys(tree).some(key => ['x', 'y', 'z', 'point'].includes(key)), false);

console.log(`PASS: ${PROJECTIONS.length} projections; ${1 << ids.length} apertures each; identity, multifocus, residue, authority, hylo, RETURN.`);
