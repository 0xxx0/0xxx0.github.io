#!/usr/bin/env node
'use strict';
/* mark-tag-selftest — the route-identity tag that keeps two colliding marks apart.
 *
 * WHY THIS EXISTS (2026-10-01): the operator circled the first two tiles of a FIELD INDEX
 * mark grid on his phone. Different routes, byte-identical glyph, byte-identical label:
 * kind · operation · state is not route-unique, so /fold-bloom/ and /port/ both read
 * "中 · 行 · ACTIVE · HEAD". On a touch surface where "tap mark -> hold", a visually
 * identical neighbour means a tap can hold the wrong object. Nothing was duplicated in the
 * data; the grammar carried no route segment.
 *
 * What it guards, in order:
 *   1. field-glyph.js tag is OPT-IN — without opt.tag the label and the whole <svg> stay
 *      byte-identical to what shipped before, so no existing mark moves.
 *   2. with tags, the two members of a collision group differ in BOTH the aria-label (what
 *      the repro counts) and the visible <tt> mnemonic (what the operator reads).
 *   3. the shipped index.html tag computation, extracted from index.html itself rather than
 *      re-implemented here, tags exactly the colliding routes and nobody else.
 *   4. on the real data the grids draw, (label + tag) is unique per route — the acceptance
 *      measured on the live page is 0 collision groups.
 *
 * Run: node tools/mark-tag-selftest.mjs   (exit 0 = pass)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const labelOf = svg => (svg.match(/aria-label="([^"]*)"/) || [])[1];

/* 1 + 2 — field-glyph.js in a stub window. */
const glyphCtx = { };
glyphCtx.window = glyphCtx;
vm.createContext(glyphCtx);
vm.runInContext(read('field-glyph.js'), glyphCtx);
const G = glyphCtx.FieldGlyph;
assert.ok(G && typeof G.svg === 'function' && typeof G.mnemonic === 'function', 'FieldGlyph API missing');

const fb = { href: '/fold-bloom/', kind: 'hub', operation: 'PLAN', state: 'ACTIVE' };
const pt = { href: '/port/', kind: 'hub', operation: 'PLAN', state: 'ACTIVE' };
const head = { size: 27, head: true };

// Without a tag the two routes are indistinguishable — this is the defect, stated as a test.
assert.equal(labelOf(G.svg(fb, head)), '中 · 行 · ACTIVE · HEAD');
assert.equal(labelOf(G.svg(fb, head)), labelOf(G.svg(pt, head)));
assert.equal(G.svg(fb, head), G.svg(pt, head), 'untagged glyph bytes must stay identical');
assert.equal(G.mnemonic(fb), '中行');

// With tags both halves separate.
assert.equal(labelOf(G.svg(fb, { ...head, tag: 'FB' })), '中 · 行 · ACTIVE · HEAD · FB');
assert.notEqual(labelOf(G.svg(fb, { ...head, tag: 'FB' })), labelOf(G.svg(pt, { ...head, tag: 'P' })));
assert.equal(G.mnemonic(fb, { tag: 'FB' }), '中行·FB');
assert.notEqual(G.mnemonic(fb, { tag: 'FB' }), G.mnemonic(pt, { tag: 'P' }));
assert.ok(G.mnemonic(fb, { tag: 'FB' }).length <= 6, 'tagged mnemonic must still fit a 48px tile');

/* 3 — the host's own tag computation, sliced out of index.html. */
const html = read('index.html');
const start = html.indexOf('let markTags=new Map;');
const end = html.indexOf('function routeGlyph');
assert.ok(start > 0 && end > start, 'mark-tag block not found in index.html — guard moved?');
const hostCtx = { };
hostCtx.window = hostCtx;
hostCtx.FieldGlyph = G;
hostCtx.nowSet = new Set();
hostCtx.headSet = new Set();
vm.createContext(hostCtx);
vm.runInContext(html.slice(start, end) + '\nthis.__tag={computeMarkTags,markBaseLabel,markTagCode,markTag};', hostCtx);
const { computeMarkTags, markTagCode } = hostCtx.__tag;
assert.equal(typeof computeMarkTags, 'function');

hostCtx.headSet = new Set(['/fold-bloom/', '/port/']);
const fixtures = [
  fb, pt,
  { href: '/continuity/', kind: 'workbench', state: 'ACTIVE' },
  { href: '/dayline/', kind: 'workbench', state: 'ACTIVE' },
  { href: '/house/', kind: 'root', operation: 'ADDRESS', state: 'CANDIDATE' }
];
const tags = computeMarkTags(fixtures);
assert.equal(tags.size, 4, 'only the four colliding routes are tagged');
assert.ok(!tags.has('/house/'), 'a route with no collision must keep its label untouched');
assert.notEqual(tags.get('/fold-bloom/'), tags.get('/port/'));
assert.notEqual(tags.get('/continuity/'), tags.get('/dayline/'));
assert.equal(markTagCode('/fold-bloom/'), 'FB');
assert.equal(markTagCode('/port/'), 'P');

// Initials that collide inside one group separate by sorted-href index, deterministically.
const twin = computeMarkTags([{ href: '/a-b/', kind: 'system' }, { href: '/a/b/', kind: 'system' }]);
assert.notEqual(twin.get('/a-b/'), twin.get('/a/b/'), 'same-initial routes must not share a tag');
assert.deepEqual([...computeMarkTags(fixtures)], [...tags], 'tag computation must be deterministic');

/* 4 — the real data the live page draws: 0 collision groups after tagging.
   The universe mirrors index.html's boot call exactly: headRenderables() (manifest routes plus
   the head fallbacks) + portItems() (exit paths whose status is not AVAILABLE, because those
   never become tiles). The operator's acceptance is measured over .glyphBlock, i.e. these two
   grids and nothing else. */
const manifest = JSON.parse(read('showcase-manifest.json'));
const current = JSON.parse(read('control/CURRENT.json'));
const routes = (manifest.routes || []).filter(r => r.href !== '/');
const routeMap = new Map(routes.map(r => [r.href, r]));
const nowHref = f => {
  const ev = (f.evidence || []).find(x => routeMap.has(x));
  if (ev) return ev;
  const m = String(f.center || '').match(/\/[A-Za-z0-9._/-]*\//);
  return m && routeMap.has(m[0]) ? m[0] : '/control/';
};
const heads = (current.current_heads || []).map(h =>
  routeMap.get(h.route) || { href: h.route, title: h.head, state: h.state, kind: 'artifact' });
// portBucket returns AVAILABLE only for status AVAILABLE; every other status lands in a drawn
// bucket, so this is what portItems() keeps.
const drawnPorts = routes.filter(r => (r.field?.exit_paths || [])
  .some(e => String(e.status || 'OPEN') !== 'AVAILABLE'));
hostCtx.headSet = new Set((current.current_heads || []).map(h => h.route));
hostCtx.nowSet = new Set((current.active_fronts || []).slice(0, 3).map(nowHref));

const grid = [...new Map([...heads, ...drawnPorts].map(r => [r.href, r])).values()];
const realTags = computeMarkTags(grid);
const labelOfRoute = r => hostCtx.__tag.markBaseLabel(r) + '\u0000' + (realTags.get(r.href) || '');
const seen = new Map();
for (const r of grid) {
  const key = labelOfRoute(r);
  assert.ok(!seen.has(key) || seen.get(key) === r.href,
    'collision survives tagging: ' + seen.get(key) + ' vs ' + r.href + ' -> ' + key.replace('\u0000', ' + '));
  seen.set(key, r.href);
}
// The two groups the operator's screenshot produced: if they still collide today, tagging must
// separate them; if the data has moved on, there is nothing to repair.
for (const [a, b] of [['/fold-bloom/', '/port/'], ['/continuity/', '/dayline/']]) {
  const ra = grid.find(r => r.href === a), rb = grid.find(r => r.href === b);
  if (!ra || !rb) continue;
  if (hostCtx.__tag.markBaseLabel(ra) === hostCtx.__tag.markBaseLabel(rb)) {
    assert.ok(realTags.has(a) && realTags.has(b), 'unrepaired collision group: ' + a + ' + ' + b);
    assert.notEqual(realTags.get(a), realTags.get(b), 'still identical after tagging: ' + a + ' + ' + b);
  }
}
// The feed rail recomputes over its own slice; prove the function stays unique at the largest
// slice it can be handed (ALL over every indexed route).
const feedPool = routes.filter(r => r.index?.updated_at);
const feedTags = computeMarkTags(feedPool);
const feedSeen = new Map();
for (const r of feedPool) {
  const key = hostCtx.__tag.markBaseLabel(r) + '\u0000' + (feedTags.get(r.href) || '');
  assert.ok(!feedSeen.has(key) || feedSeen.get(key) === r.href, 'feed-rail collision: ' + key);
  feedSeen.set(key, r.href);
}

console.log('MARK TAG SELFTEST PASS — grid ' + grid.length + ' routes / ' + realTags.size +
  ' tagged / 0 collisions; feed pool ' + feedPool.length + ' routes / ' + feedTags.size +
  ' tagged / 0 collisions; untagged glyph bytes unchanged.');
