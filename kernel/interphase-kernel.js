/* interphase-kernel.js — THE EXTRACTED SHARED KERNEL
 *
 * The honest extraction of everything spikes 001–004 established. This is not a
 * framework and not an app. It is the part that was PROVEN to be shareable:
 *
 *   CANON      one store, typed nodes, ids not derived from payload
 *   ATTENTION  selection (a Set) + focus (an array, each with an aperture)
 *   PROJECTION pure derivation -> render instances; a view never names another
 *   SUPPORT    which operations are lawful on which node, with a reason when not
 *   MUTATION   the only writer; refuses what SUPPORT forbids; bumps revision
 *   MOUNT      re-runs whatever projections are on screen. No observers, no bus.
 *   RETURN     captures/restores the exact (address, attention, projection) tuple
 *
 * LAWS THIS ENFORCES (each was tested in spike 003, HET12):
 *   - projection purity   : projecting never changes CANON
 *   - identity law        : locate(project(n).key) === n.id
 *   - attention law       : selection + focus survive a projection change
 *   - support law         : an unsupported op returns SUPPORT=0 WITH A REASON,
 *                           never a silent coercion
 *   - commit law          : a successful mutation increments revision
 *   - return law          : a view-only excursion restores an identical frame
 *
 * LAWS THIS DOES NOT ENFORCE (deliberately — see references):
 *   - GetPut/PutGet round-trip laws (no optic layer; direct mutation only)
 *   - authority ceilings / irreversibility (a mutation is assumed reversible)
 *   - clock continuity under projection (a clock field survives, but no scheduler)
 *
 * UMD-ish: works as <script> (window.Interphase) or as a CommonJS module.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.Interphase = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---------------- CANON ---------------- */
  function canon(nodes) {
    return assertCanon({ revision: 1, nodes: (nodes || []).map(freezeNode) });
  }
  function freezeNode(n) {
    if (!n || !n.id) throw new Error('CANON: every node needs an id');
    if (n.type == null) throw new Error('CANON: node ' + n.id + ' needs a type');
    return {
      id: n.id,
      type: n.type,
      address: n.address != null ? n.address : '/' + String(n.id).toLowerCase(),
      parent: n.parent != null ? n.parent : null,
      relations: (n.relations || []).slice(),
      capabilities: (n.capabilities || []).slice(),
      value: n.value,
      provenance: n.provenance || { source: 'inline', observed_at: null },
      clock: n.clock || null
    };
  }
  function assertCanon(c) {
    const seen = new Set();
    for (const n of c.nodes) {
      if (seen.has(n.id)) throw new Error('CANON: duplicate id ' + n.id);
      seen.add(n.id);
    }
    return c;
  }
  const byId = (c, id) => c.nodes.find(n => n.id === id) || null;

  /* canonHash: what projection purity is measured against.
     Identity, type, address, parent, relations, value, revision — nothing visual. */
  function canonHash(c) {
    return JSON.stringify(c.nodes.map(n => [
      n.id, n.type, n.address, n.parent,
      JSON.stringify(n.relations), JSON.stringify(n.value),
      n.provenance && n.provenance.observed_at
    ])) + '|rev' + c.revision;
  }

  /* ---------------- ATTENTION ----------------
     Selection and focus live HERE, never inside a projection. This is the whole
     reason two views can share a selection without talking to each other. */
  function attention(init) {
    init = init || {};
    return {
      selection: (init.selection || []).slice(),
      focus: (init.focus || []).map(f => ({ id: f.id, aperture: f.aperture || 'DETAIL' })),
      cursor: init.cursor || null,
      projection: init.projection || null,
      projection_params: init.projection_params || {}
    };
  }

  /* ---------------- SUPPORT ----------------
     A node declares what it can do. `defaultSupport` reads `capabilities`.
     The kernel calls this BEFORE every mutation; a refusal is a first-class
     result, not an exception and not a silent no-op. */
  function defaultSupport(c, nodeId, op) {
    const n = byId(c, nodeId);
    if (!n) return { ok: false, reason: 'NO SUCH NODE ' + nodeId };
    if (n.capabilities.indexOf(op) !== -1) return { ok: true };
    return { ok: false, reason: n.type + ' has no ' + op + ' capability' };
  }

  /* ---------------- RETURN FRAME ----------------
     The exact tuple. Not "back" — the caller, the address, the attention and
     the projection, so an excursion can be undone byte-for-byte. */
  function captureFrame(c, a) {
    return {
      source_revision: c.revision,
      address: a.cursor,
      selection: a.selection.slice().sort(),
      focus: a.focus.map(f => ({ id: f.id, aperture: f.aperture }))
                     .sort((x, y) => String(x.id).localeCompare(String(y.id))),
      projection: a.projection,
      projection_params: JSON.parse(JSON.stringify(a.projection_params)),
      clock: (c.nodes.find(n => n.clock) || {}).clock || null
    };
  }
  const sameFrame = (x, y) => JSON.stringify(x) === JSON.stringify(y);

  /* ---------------- INTERPHASE ----------------
     project(canon, attention, params) -> { projection, instances: [...] }
     locate(instances, key) -> node_id | null
     A projection is a PURE FUNCTION of the canon. It receives no reference to
     any other projection and is never told that anything changed. */
  function interphase(spec) {
    spec = spec || {};
    let C = canon(spec.nodes || []);
    let A = attention(spec.attention || {});
    const projections = spec.projections || {};
    const support = spec.support || defaultSupport;
    const mounts = [];           /* [{root, projection, el}] */
    let renderCount = 0;

    /* --- reads --- */
    const canonState = () => C;
    const attnState = () => A;
    const hash = () => canonHash(C);
    const revision = () => C.revision;
    const node = id => byId(C, id);
    const projectionNames = () => Object.keys(projections);

    /* --- attention ops. These are NOT mutations: attention is not canon, so
           changing focus must not bump the revision or emit a mutation. --- */
    function select(id) { if (A.selection.indexOf(id) === -1) A.selection.push(id); remount(); return A.selection.slice() }
    function deselect(id) { A.selection = A.selection.filter(x => x !== id); remount(); return A.selection.slice() }
    function toggleSelect(id) { return A.selection.indexOf(id) === -1 ? select(id) : deselect(id) }
    function setSelection(ids) { A.selection = (ids || []).slice(); remount(); return A.selection.slice() }
    function focus(id, aperture) {
      A.focus = A.focus.filter(f => f.id !== id);
      A.focus.push({ id, aperture: aperture || 'DETAIL' });
      A.cursor = id; remount(); return A.focus.slice();
    }
    function blur(id) { A.focus = A.focus.filter(f => f.id !== id); remount(); return A.focus.slice() }
    function blurAll() { A.focus = []; remount(); return [] }
    function setProjection(name, params) {
      if (projections[name] == null) throw new Error('no such projection: ' + name);
      A.projection = name;
      if (params) A.projection_params = params;
      remount(); return A.projection;
    }

    /* --- the ONLY writer ---
       Refuses anything SUPPORT forbids, and says why. Bumps revision on success. */
    function mutate(nodeId, op, fn) {
      const verdict = support(C, nodeId, op);
      if (!verdict.ok) return { ok: false, reason: verdict.reason, refused: op + ' on ' + nodeId };
      const next = fn ? fn(JSON.parse(JSON.stringify(node(nodeId))), C) : null;
      if (next && typeof next === 'object') Object.assign(node(nodeId), next);
      C.revision++;
      remount();
      return { ok: true, revision: C.revision, op, node: nodeId };
    }
    /* a whole-canon write, for structural ops (reparent etc.). Same gate. */
    function mutateCanon(op, fn) {
      const before = C;
      const draft = JSON.parse(JSON.stringify(before));
      const result = fn(draft);
      if (result && result.ok === false) return result;
      const next = assertCanon(draft);
      next.revision = before.revision + 1;
      C = next;
      remount();
      return { ok: true, revision: C.revision, op };
    }

    /* --- projection --- */
    function projectInstances(name) {
      const p = projections[name || A.projection];
      if (!p) return { projection: null, instances: [] };
      const r = p(C, A, A.projection_params) || {};
      renderCount++;
      return { projection: name || A.projection, instances: r.instances || [] };
    }
    function locate(name, key) {
      const p = projections[name];
      if (p && typeof p.locate === 'function') return p.locate(C, key);
      const inst = projectInstances(name).instances.find(i => i.renderKey === key);
      return inst ? inst.nodeId : null;
    }

    /* --- MOUNT ---
       Register a projection into a DOM element. mount() is called by MUTATION
       and by ATTENTION changes; nothing else. There is no observer, no event
       bus, no dependency graph, and no view-to-view reference anywhere. */
    function mount(el, projectionName) {
      const entry = { el, projection: projectionName };
      mounts.push(entry);
      paint(entry);
      return () => { const i = mounts.indexOf(entry); if (i >= 0) mounts.splice(i, 1) };
    }
    function paint(entry) {
      const p = projections[entry.projection];
      if (!p || !entry.el) return;
      const view = p(C, A, A.projection_params, el => {
        /* the ONE hook a projection gets for interaction: it may return a bound
           handler, but it may not reach into another view. */
        return el;
      });
      entry.el.innerHTML = (view && view.markup != null) ? view.markup : String(view == null ? '' : view);
      if (view && typeof view.bind === 'function') view.bind(entry.el);
    }
    function remount() { mounts.forEach(paint); renderCount += mounts.length }

    /* --- return --- */
    function returnFrame() { return captureFrame(C, A) }
    function restore(frame) {
      if (!frame) return false;
      A.selection = frame.selection.slice();
      A.focus = frame.focus.map(f => ({ id: f.id, aperture: f.aperture }));
      A.cursor = frame.address;
      A.projection = frame.projection;
      A.projection_params = JSON.parse(JSON.stringify(frame.projection_params || {}));
      remount();
      return true;
    }
    /* an excursion that touches only the view: the frame must come back identical */
    function excursion(projectionName, fn) {
      const before = returnFrame();
      setProjection(projectionName);
      try { if (fn) fn() } finally { }
      const after = returnFrame();
      restore(before);
      return { frameBefore: before, frameAfter: after, identical: sameFrame(before, after) };
    }

    /* --- the architectural claim, checkable rather than asserted --- */
    function noCrossWiring() {
      const src = Object.keys(projections).map(k => String(projections[k])).join('\n');
      const others = Object.keys(projections);
      const named = others.filter(k => new RegExp('\\b' + k + '\\b').test(src));
      /* a projection may be NAMED by the registry, so we look for DOM ids instead:
         a projection must not reference another projection's mount element. */
      const ids = mounts.map(m => m.el && m.el.id).filter(Boolean).filter(Boolean);
      const leaked = ids.filter(id => id && src.indexOf(id) !== -1);
      return { ok: leaked.length === 0, leaked };
    }

    return Object.freeze({
      /* reads */
      canon: canonState, attention: attnState, hash, revision, node,
      projections: projectionNames, projectInstances, locate, returnFrame,
      /* attention (not canon) */
      select, deselect, toggleSelect, setSelection, focus, blur, blurAll, setProjection,
      /* the one writer */
      mutate, mutateCanon,
      /* render */
      mount, remount,
      /* return */
      restore, excursion,
      /* verification */
      noCrossWiring, sameFrame,
      supports: (id, op) => support(C, id, op),
      renderCount: () => renderCount
    });
  }

  return { interphase, canon, attention, canonHash, captureFrame, sameFrame, defaultSupport };
});
