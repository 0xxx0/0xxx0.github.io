/* tower-core.js — RING TOWER maths. Ported from AXIS/work/ring-tower-2026-10-21
 * (lib/tower-core.js), extended for weighted arcs + the host's FieldAxes schema.
 *
 * LAW (recovered, 2026-10-21): radial <-> linear is the projection of ONE canonical
 * object. A ring IS a strip wrapped; unwrap returns the same items in the same order
 * (bijection held at every morph frame). Rotation is detent-stepped (combination lock).
 * Composition = the tuple of gate values -> one deterministic seed; the moiré identity
 * of that seed IS the composition glyph.
 *
 * HOUSE LAW: quiet by default, depth behind explicit reveal — every overlay layer at
 * rest alpha <= 0.12. Pad rgb(8,12,18), lines rgb(79,87,96), bone #eff2ef, accent
 * #fd956e. No blur, no gradients as decoration. Determinism: nothing here is random —
 * a hash may ORIENT a figure, never invent one (P2/P4); coordinates reduce to counts.
 *
 * Dual-load: global TowerCore + CommonJS (house style: classic <script> and node).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TowerCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TAU = Math.PI * 2;
  const QUIET_CAP = 0.12;   // per-layer alpha at rest — never exceeded
  const REVEAL_CAP = 0.34;  // per-layer alpha under explicit reveal (approach/dwell)
  const GATE_ANGLE = -Math.PI / 2; // the gate sits at the TOP of its ring, on the axis

  const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const clamp = (lo, v, hi) => Math.max(lo, Math.min(hi, v));

  // FNV-1a-32 — the house deterministic hash (interphase-glyph lineage).
  function hash32(str) {
    let h = 2166136261 >>> 0;
    for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }

  const wrap = (a, n) => ((a % n) + n) % n;

  // --- the wrap: strip index <-> ring slot -------------------------------
  // A strip of N items becomes a ring of N slots; item i sits at slot i.
  // rotation k (integer) names the item currently at the GATE.
  function stripToRing(i, count) {
    if (!(count > 0)) throw new Error('count must be > 0');
    return wrap(Math.round(i), count);
  }
  function ringToStrip(slot, count) {
    if (!(count > 0)) throw new Error('count must be > 0');
    return wrap(Math.round(slot), count);
  }
  function wrapRoundtrip(count) {
    if (!(count > 0)) return { ok: false, reason: 'count must be > 0' };
    const seen = new Set();
    for (let i = 0; i < count; i++) {
      const s = stripToRing(i, count);
      if (seen.has(s)) return { ok: false, reason: 'slot collision at ' + s };
      seen.add(s);
      if (ringToStrip(s, count) !== i) return { ok: false, reason: 'roundtrip broke at ' + i };
    }
    return { ok: true, count };
  }

  // --- detent rotation --------------------------------------------------
  function step(rotation, dir, count) {
    if (!(count > 0)) return 0;
    return wrap(Math.round(rotation) + (dir >= 0 ? 1 : -1), count);
  }
  function gateIndex(rotation, count) {
    if (!(count > 0)) return 0;
    return wrap(Math.round(rotation), count);
  }
  const settle = gateIndex;

  // --- weights: arc room per slot is a real field, never an equal sector --
  // A member may carry `support` (routes matching that axis value). Unknown -> 1.
  function weightOf(m) {
    if (m && typeof m === 'object') {
      const raw = m.support != null ? m.support : m.count;
      const w = Number(raw);
      if (Number.isFinite(w) && w > 0) return w;
    }
    return 1;
  }
  function weightsOf(members) { return (members || []).map(weightOf); }

  // cumulative arc table: start / span / mid as fractions of the full turn
  function arcs(weights) {
    const w = (weights && weights.length) ? weights.map(x => (Number.isFinite(x) && x > 0 ? x : 1)) : [1];
    const total = w.reduce((s, x) => s + x, 0) || 1;
    const out = [];
    let acc = 0;
    for (const x of w) {
      out.push({ start: acc / total, span: x / total, mid: (acc + x / 2) / total });
      acc += x;
    }
    return { arcs: out, total, n: w.length, uniform: out.every(a => Math.abs(a.span - 1 / out.length) < 1e-12) };
  }

  // The ring's angular offset that puts slot k at the gate. Rotation state is the
  // integer slot; the offset is derived, so turning is always one detent.
  function offsetFor(rotation, weights) {
    const A = arcs(weights);
    const k = gateIndex(rotation, A.n);
    return -TAU * A.arcs[k].mid;
  }

  // --- geometry: lerp between strip coords and ring coords --------------
  // t=0 -> the strip (x along a line at cy), t=1 -> the ring (ellipse).
  // Same index, same identity, both ends — the correspondence morph.
  function markPos(i, count, t, box) {
    const b = box || {};
    const cx = num(b.cx, 150), cy = num(b.cy, 0);
    const rx = num(b.rx, 110), ry = num(b.ry, 16), pad = num(b.pad, 12);
    const n = Math.max(1, Math.round(num(count, 1)));
    const sx = n > 1 ? (cx - rx + pad) + (2 * (rx - pad)) * (i / (n - 1)) : cx;
    const a = (i / n) * TAU + (b.phase != null ? b.phase : GATE_ANGLE);
    const gx = cx + Math.cos(a) * rx, gy = cy + Math.sin(a) * ry;
    const tt = clamp(0, num(t, 1), 1);
    return { x: sx + (gx - sx) * tt, y: cy + (gy - cy) * tt, angle: a, sx, sy: cy, gx, gy };
  }

  // Weighted version: slot i owns an arc proportional to its support; `offset`
  // rolls the ring under the gate (offsetFor() is the resting value).
  function markPosWeighted(i, weights, offset, t, box) {
    const b = box || {};
    const cx = num(b.cx, 150), cy = num(b.cy, 0);
    const rx = num(b.rx, 110), ry = num(b.ry, 16), pad = num(b.pad, 12);
    const A = arcs(weights);
    const n = A.n;
    const idx = clamp(0, Math.round(i), n - 1);
    const ang = GATE_ANGLE + TAU * A.arcs[idx].mid + num(offset, 0);
    const sx = n > 1 ? (cx - rx + pad) + (2 * (rx - pad)) * (idx / (n - 1)) : cx;
    const gx = cx + Math.cos(ang) * rx, gy = cy + Math.sin(ang) * ry;
    const tt = clamp(0, num(t, 1), 1);
    return { x: sx + (gx - sx) * tt, y: cy + (gy - cy) * tt, angle: ang, sx, sy: cy, gx, gy };
  }

  // --- the composition glyph --------------------------------------------
  // The tuple of gate values across the tower composes into ONE deterministic seed.
  // Composition is order-sensitive (f >>> g != g >>> f) — it IS the filter tuple.
  function compose(gateValues) {
    const parts = (gateValues || []).map(v => String(v));
    const seed = parts.join(' ▸ ');
    const tag = hash32(seed).toString(16).padStart(8, '0');
    return Object.freeze({ seed, tag, arity: parts.length, parts: Object.freeze(parts) });
  }

  // identity(seed) -> the gratings of one moiré. Every number here descends from the
  // seed hash (angle/spacing/phase) or from the house palette (ink/alpha). No clock,
  // no Math.random, no plate: gratings only, 1px lines.
  function identity(seed, opts) {
    const o = opts || {};
    const n = clamp(1, Math.round(num(o.layers, 4)), 8);
    const ink = o.ink || '79,87,96';
    const base = hash32(String(seed));
    const out = [];
    for (let i = 0; i < n; i++) {
      const h = hash32(base.toString(16) + ':' + i);
      const quiet = clamp(0.03, 0.05 + ((h >>> 11) % 8) / 100, QUIET_CAP);
      out.push(Object.freeze({
        i,
        angle: -38 + (h % 77),              // deg, near-parallel gratings
        pitch: 5 + ((h >>> 5) % 6),         // px between lines
        width: 1,                            // px line — hairline
        quiet,
        reveal: clamp(QUIET_CAP, quiet * 2.4, REVEAL_CAP),
        ink,
        value: h.toString(16).padStart(8, '0'),
      }));
    }
    return out;
  }

  // One CSS grating. Alpha is passed explicitly and clamped; a non-finite alpha
  // falls back to the layer's quiet value (defect found 2026-10-21: an emitter
  // that trusted its input wrote NaN% and the parser dropped the declaration whole).
  function grating(layer, alpha) {
    const L = layer || {};
    const a = clamp(0, num(alpha, num(L.quiet, QUIET_CAP)), REVEAL_CAP);
    const ang = num(L.angle, 0).toFixed(2);
    const pitch = Math.max(2, num(L.pitch, 6));
    const w = Math.max(0.5, num(L.width, 1));
    const ink = L.ink || '79,87,96';
    return 'repeating-linear-gradient(' + ang + 'deg,' +
      'rgba(' + ink + ',' + a.toFixed(3) + ') 0px,' +
      'rgba(' + ink + ',' + a.toFixed(3) + ') ' + w.toFixed(2) + 'px,' +
      'rgba(0,0,0,0) ' + w.toFixed(2) + 'px,' +
      'rgba(0,0,0,0) ' + pitch.toFixed(2) + 'px)';
  }

  // glyph(seed) -> one entry per layer with both alphas and both gradients.
  function glyph(seed, opts) {
    return identity(seed, opts).map(L => Object.freeze({
      value: L.value,
      angle: L.angle,
      pitch: L.pitch,
      quiet: L.quiet,
      reveal: L.reveal,
      at_rest: grating(L, L.quiet),
      at_reveal: grating(L, L.reveal),
    }));
  }

  // --- model: the host's strips -> families of members -------------------
  // ONE ring per axis. `values` are plain strings on the live host (hrefs for ROUTE,
  // tokens elsewhere); objects with {value,label,support} are accepted too so the
  // arc law keeps working the day support is exposed.
  function normalizeMember(v, axisKey, supports) {
    if (v == null) return null;
    if (typeof v === 'string' || typeof v === 'number') {
      const key = String(v);
      if (!key) return null;
      const sup = supports && supports[key] != null ? Number(supports[key]) : 1;
      return { key, label: key, kind: axisKey, support: (Number.isFinite(sup) && sup > 0 ? sup : 1) };
    }
    if (typeof v === 'object') {
      const key = String(v.key != null ? v.key : (v.value != null ? v.value : (v.href != null ? v.href : (v.label != null ? v.label : ''))));
      if (!key) return null;
      const label = String(v.label != null ? v.label : (v.title != null ? v.title : key));
      const supRaw = v.support != null ? v.support : v.count;
      const sup = Number(supRaw);
      return {
        key, label,
        kind: v.kind != null ? String(v.kind) : axisKey,
        support: (Number.isFinite(sup) && sup > 0 ? sup : 1),
        href: v.href != null ? String(v.href) : undefined,
      };
    }
    return null;
  }

  function normalizeAxes(raw, opts) {
    const o = opts || {};
    const list = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.axes) ? raw.axes : []);
    const families = [];
    for (const a of list) {
      if (!a || typeof a !== 'object') continue;
      const key = String(a.key != null ? a.key : ('axis' + families.length));
      const label = String(a.label != null ? a.label : key).toUpperCase();
      const values = Array.isArray(a.values) ? a.values : [];
      const supports = a.supports && typeof a.supports === 'object' ? a.supports : null;
      const seen = new Set();
      const members = [];
      for (const v of values) {
        const m = normalizeMember(v, key, supports);
        if (!m || seen.has(m.key)) continue;
        seen.add(m.key);
        members.push(m);
      }
      let selIndex = 0;
      if (a.selected != null) {
        const at = members.findIndex(m => m.key === String(a.selected));
        if (at >= 0) selIndex = at;
      } else if (Number.isFinite(Number(a.selectedIndex))) {
        selIndex = wrap(Math.round(Number(a.selectedIndex)), Math.max(1, members.length));
      }
      families.push(Object.freeze({
        key, label, members: Object.freeze(members), count: members.length, selected: selIndex,
      }));
    }
    return Object.freeze({
      source: o.source || 'field-axes',
      families: Object.freeze(families),
      totalMembers: families.reduce((s, f) => s + f.count, 0),
      totalFamilies: families.length,
      note: o.note || null,
    });
  }

  // Standalone-preview fallback ONLY: group manifest routes by their own `family`.
  // Live pages must use the host's FieldAxes() so the tower is the SAME index.
  function familiesFromManifest(json, opts) {
    const o = opts || {};
    const routes = (json && Array.isArray(json.routes)) ? json.routes : [];
    const excludeRoot = o.excludeRoot !== false; // host's `latest` drops "/"
    const map = new Map();
    const order = [];
    let skipped = 0;
    for (const r of routes) {
      if (!r || typeof r !== 'object' || !r.href) { skipped++; continue; }
      if (excludeRoot && r.href === '/') { skipped++; continue; }
      const fam = String(r.family == null ? '' : r.family).trim() || 'UNFILED';
      if (!map.has(fam)) { map.set(fam, { key: fam, label: fam, members: [] }); order.push(fam); }
      map.get(fam).members.push({
        key: String(r.href),
        label: String(r.title || r.href),
        kind: String(r.kind || 'route'),
        support: 1,
        href: String(r.href),
      });
    }
    const families = order.map(k => {
      const f = map.get(k);
      return Object.freeze({ key: f.key, label: f.label, members: Object.freeze(f.members), count: f.members.length, selected: 0 });
    }).sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label));
    return Object.freeze({
      source: o.source || 'manifest',
      families: Object.freeze(families),
      totalMembers: families.reduce((s, f) => s + f.count, 0),
      totalFamilies: families.length,
      skipped,
      note: o.note || null,
    });
  }

  function emptyModel(reason) {
    return Object.freeze({
      source: 'degraded',
      families: Object.freeze([]),
      totalMembers: 0,
      totalFamilies: 0,
      note: reason || 'no data',
    });
  }

  // --- tower assembly: rings + folded remainder (counts never hidden) ----
  function buildTower(model, opts) {
    const o = opts || {};
    const maxRings = clamp(1, Math.round(num(o.maxRings, 6)), 7);
    const fams = (model && model.families) ? model.families.slice() : [];
    const rings = fams.slice(0, maxRings).map((f, i) => Object.freeze({
      key: f.key,
      label: f.label,
      count: f.count,
      members: f.members,
      weights: weightsOf(f.members),
      order: i,
      selected: gateIndex(f.selected || 0, Math.max(1, f.count)),
    }));
    const rest = fams.slice(maxRings);
    let foldedMembers = 0;
    for (const f of rest) foldedMembers += f.count;
    return Object.freeze({
      source: model ? model.source : 'degraded',
      totalMembers: model ? model.totalMembers : 0,
      totalFamilies: model ? model.totalFamilies : 0,
      rings: Object.freeze(rings),
      folded: Object.freeze({ count: foldedMembers, families: rest.length }),
      drawnMembers: rings.reduce((s, r) => s + r.count, 0),
      maxRings,
    });
  }

  // --- layout: one vertical axis, radius ← slot count (sqrt, clamped) ----
  function towerLayout(rings, opts) {
    const o = opts || {};
    const cx = num(o.cx, 150);
    const gap = num(o.gap, 62);
    const ry = num(o.ry, 16);
    const pad = num(o.pad, 12);
    const topPad = num(o.topPad, 76);
    const rxMin = num(o.rxMin, 92);
    const rxMax = num(o.rxMax, 124);
    const list = rings || [];
    const n = Math.max(1, list.length);
    const maxCount = Math.max(1, ...list.map(r => (r && r.count) || 0));
    const boxes = list.map((r, i) => {
      const k = Math.sqrt(Math.max(0, (r && r.count) || 0) / maxCount);
      const rx = Math.round((rxMin + (rxMax - rxMin) * k) * 100) / 100;
      const cy = topPad + (n - 1 - i) * gap; // i=0 (ROUTE) at the bottom, sparsest on top
      return Object.freeze({ cx, cy, rx, ry, pad, index: i });
    });
    const bottom = topPad + (n - 1) * gap;
    return Object.freeze({
      w: num(o.w, 300),
      cx, gap, ry, pad,
      boxes: Object.freeze(boxes),
      height: bottom + ry + 26 + 15 + 12,  // rings + tag line + total line + margin
      bottom,
      axisTop: num(o.axisTop, 22),
    });
  }

  // --- shared selftest (node + in-page run the SAME arms) ----------------
  function selftest(model, opts) {
    const o = opts || {};
    const arms = [];
    const ok = (name, cond, detail) => arms.push({ name, ok: !!cond, detail: detail == null ? '' : String(detail) });
    const tower = buildTower(model, { maxRings: o.maxRings || 6 });

    // 1-2 wrap bijection over the real ring sizes + edge sizes
    const sizes = Array.from(new Set([1, 2, 3, 6, 7].concat(tower.rings.map(r => r.count)))).filter(n => n > 0).slice(0, 9);
    for (const n of sizes) {
      const r = wrapRoundtrip(n);
      ok('wrap bijection n=' + n, r.ok, r.reason || '');
    }

    // 3-4 detent rotation visits every slot exactly once, both directions
    {
      const n = Math.max(2, tower.rings[0] ? tower.rings[0].count : 17);
      let rot = 0; const seen = [];
      for (let k = 0; k < n; k++) { seen.push(gateIndex(rot, n)); rot = step(rot, 1, n); }
      ok('detent turn visits all ' + n + ' slots', new Set(seen).size === n, seen.length + ' steps');
      ok('detent turn returns to start', rot === 0, 'rot=' + rot);
      const back = []; rot = 5 % n;
      for (let k = 0; k < n; k++) { back.push(gateIndex(rot, n)); rot = step(rot, -1, n); }
      ok('reverse turn visits all slots', new Set(back).size === n);
    }

    // 5 gate sits at the top of its ring (the aperture), uniform + weighted
    {
      let good = true, detail = ''; const w = [1, 1, 1, 1, 1, 1];
      for (let r = 0; r < w.length; r++) {
        const gi = gateIndex(r, w.length);
        let bestY = 1e9, best = -1;
        for (let i = 0; i < w.length; i++) {
          const p = markPosWeighted(i, w, offsetFor(r, w), 1, { cx: 150, cy: 100, rx: 110, ry: 16 });
          if (p.y < bestY) { bestY = p.y; best = i; }
        }
        if (best !== gi) { good = false; detail = 'r=' + r + ' gate=' + gi + ' top=' + best; }
      }
      ok('gate is the top-most mark (uniform)', good, detail);
    }
    {
      const w = [3, 40, 2, 9, 1, 17, 5];
      let good = true, detail = '';
      for (let r = 0; r < w.length; r++) {
        const gi = gateIndex(r, w.length);
        let bestY = 1e9, best = -1;
        for (let i = 0; i < w.length; i++) {
          const p = markPosWeighted(i, w, offsetFor(r, w), 1, { cx: 150, cy: 100, rx: 110, ry: 16 });
          if (p.y < bestY) { bestY = p.y; best = i; }
        }
        if (best !== gi) { good = false; detail = 'r=' + r + ' gate=' + gi + ' top=' + best; }
      }
      ok('gate is the top-most mark (weighted arcs)', good, detail);
    }

    // 6 arc room is the support field, not an equal sector
    {
      const w = [1, 9, 1];
      const A = arcs(w);
      const ratio = A.arcs[1].span / A.arcs[0].span;
      ok('arc room ∝ support (9:1)', Math.abs(ratio - 9) < 1e-9, 'ratio=' + ratio.toFixed(6));
      ok('arc spans sum to one turn', Math.abs(A.arcs.reduce((s, a) => s + a.span, 0) - 1) < 1e-12);
    }

    // 7 correspondence morph holds 1:1 at every frame
    {
      let good = true, detail = '';
      const w = tower.rings.length ? tower.rings[0].weights.slice(0, 9) : [1, 1, 1];
      const n = Math.max(2, Math.min(9, w.length));
      const ww = w.slice(0, n);
      for (const t of [0, 0.33, 0.5, 0.77, 1]) {
        const seen = new Set();
        for (let i = 0; i < n; i++) {
          const p = markPosWeighted(i, ww, offsetFor(3 % n, ww), t, { cx: 150, cy: 100, rx: 110, ry: 16, pad: 14 });
          const key = p.x.toFixed(6) + ',' + p.y.toFixed(6);
          if (seen.has(key)) { good = false; detail = 'collision t=' + t + ' at ' + key; }
          seen.add(key);
        }
      }
      ok('morph holds 1:1 at every frame', good, detail);
    }

    // 8-9 composition: deterministic, order-sensitive, 8-hex
    {
      const a = compose(['/fold-bloom/', '/contact/', '/foundry/']);
      const b = compose(['/fold-bloom/', '/contact/', '/foundry/']);
      const c = compose(['/contact/', '/fold-bloom/', '/foundry/']);
      ok('compose deterministic', a.tag === b.tag, a.tag);
      ok('compose order-sensitive (f▸g ≠ g▸f)', a.tag !== c.tag, a.tag + ' vs ' + c.tag);
      ok('compose tag is 8-hex + arity', /^[0-9a-f]{8}$/.test(a.tag) && a.arity === 3, a.tag + '/' + a.arity);
    }

    // 10 counts reconcile: every member appears exactly once across rings+folded
    {
      const inRings = [];
      for (const r of tower.rings) for (const m of r.members) inRings.push(String(m.key));
      const all = [];
      for (const f of (model.families || [])) for (const m of f.members) all.push(String(m.key));
      const multisetOK = inRings.length === tower.drawnMembers &&
        tower.drawnMembers + tower.folded.count === (model.totalMembers || 0);
      // uniqueness is per ring (one slot per member); across rings the same token may
      // legitimately appear on two axes (e.g. "ANY" on STATE and OPERATION).
      const noDupInRings = tower.rings.every(r => new Set(r.members.map(m => String(m.key))).size === r.count);
      ok('rings + folded == total members', multisetOK,
        tower.drawnMembers + ' + ' + tower.folded.count + ' vs ' + (model.totalMembers || 0));
      ok('one slot per member, no duplicate inside a ring', noDupInRings, inRings.length + ' drawn');
      ok('families partition the model', all.length === (model.totalMembers || 0),
        all.length + ' members in ' + ((model.families || []).length) + ' families');
      ok('tower holds <= 7 rings (chunking law)', tower.rings.length <= 7, String(tower.rings.length));
    }

    // 11 quiet alpha cap + reveal budget (the moiré layers)
    {
      const layers = glyph(compose(tower.rings.map(r => (r.members[gateIndex(r.selected, Math.max(1, r.count))] || { key: r.key }).key)).seed);
      ok('quiet alpha <= 0.12 (every layer)', layers.every(L => L.quiet <= QUIET_CAP + 1e-12),
        JSON.stringify(layers.map(L => Number(L.quiet.toFixed(3)))));
      ok('reveal above quiet, below 0.34', layers.every(L => L.reveal > L.quiet && L.reveal <= REVEAL_CAP + 1e-12),
        JSON.stringify(layers.map(L => Number(L.reveal.toFixed(3)))));
      ok('grating emits no NaN', layers.every(L => !/NaN|undefined/.test(L.at_rest + L.at_reveal)));
      ok('grating alpha clamps a hostile alpha',
        (grating(layers[0], NaN).indexOf('NaN') === -1) && (grating(layers[0], 5).indexOf('rgba(79,87,96,0.340)') >= 0));
    }

    // 12 identity: deterministic, distinct on distinct seeds
    {
      const x = identity('gate tuple a'), y = identity('gate tuple a'), z = identity('gate tuple b');
      ok('identity deterministic', JSON.stringify(x) === JSON.stringify(y));
      ok('identity distinct on distinct seeds', x[0].value !== z[0].value, x[0].value + ' vs ' + z[0].value);
      ok('identity tag legible 8-hex', /^[0-9a-f]{8}$/.test(x[0].value), x[0].value);
    }

    // 13 layout: radius follows count, rings stack bottom-up, boxes stay in frame
    {
      const L = towerLayout(tower.rings.slice());
      // radius is a monotone function of the ring's own count, never of draw order
      let mono = true;
      for (let i = 0; i < tower.rings.length; i++) {
        for (let j = 0; j < tower.rings.length; j++) {
          if (tower.rings[i].count > tower.rings[j].count && L.boxes[i].rx < L.boxes[j].rx - 1e-9) mono = false;
        }
      }
      const inFrame = L.boxes.every(b => b.cx - b.rx >= 0 && b.cx + b.rx <= L.w && b.cy - b.ry > 0 && b.cy + b.ry < L.height);
      const stack = L.boxes.every((b, i) => i === 0 || b.cy < L.boxes[i - 1].cy);
      ok('radius ∝ slot count (never inverted)', mono, JSON.stringify(L.boxes.map(b => b.rx)));
      ok('rings stack bottom-up on one axis', stack, JSON.stringify(L.boxes.map(b => b.cy)));
      ok('every ring box stays inside the frame', inFrame, 'h=' + L.height);
    }

    return { pass: arms.filter(a => a.ok).length, fail: arms.filter(a => !a.ok).length, arms, tower };
  }

  return Object.freeze({
    VERSION: '1.1.0-tower-lane',
    TAU, QUIET_CAP, REVEAL_CAP, GATE_ANGLE,
    hash32, wrap, clamp,
    stripToRing, ringToStrip, wrapRoundtrip,
    step, gateIndex, settle,
    weightOf, weightsOf, arcs, offsetFor,
    markPos, markPosWeighted,
    compose, identity, grating, glyph,
    normalizeAxes, familiesFromManifest, emptyModel,
    buildTower, towerLayout,
    selftest,
  });
});
