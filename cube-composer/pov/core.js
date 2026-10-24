/* POV MOD core — navigation + glyph layer over CubeComposerCore's algebra.
 *
 * ABSORB LAW (P6): the wall algebra lives ONLY in ../cube-composer/core.js.
 * This module never re-implements a transform. It adds exactly three things:
 *
 *   1. ROOMS   — five rooms = the five LEVELS (same phrase → same rooms).
 *   2. THE NET — the map you hold: five cells of a plus-shaped fold net
 *                (centre + four arms). Solving a room lights its square;
 *                the composed glyph IS the net of rooms you have opened.
 *   3. THE DELTA — which tiles the chain changed (colour is the change:
 *                a tile is lit only where the composed wall differs from the
 *                start; a REJECT leaves a named ghost, because what is
 *                removed is part of the state).
 *
 * DOM-free + deterministic: no Math.random, no clocks. Works in the browser
 * (window.PovCore) and node (module.exports) — same law both sides (P6).
 */
(function (root, factory) {
  'use strict';
  var api = factory(root && root.CubeComposerCore);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PovCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (CC) {
  'use strict';
  if (!CC) throw new Error('POV_CORE_REQUIRES_CUBE_COMPOSER_CORE');

  // ---- the net (the map you hold) ----------------------------------------
  // A plus of five cells — the flat cross net of five rooms, folded.
  // Position IS meaning: centre = the room you start in; arms in reading
  // order north, east, south, west.
  var NET = [
    { cell: [0, 0], arm: 'centre' },
    { cell: [0, -1], arm: 'north' },
    { cell: [1, 0], arm: 'east' },
    { cell: [0, 1], arm: 'south' },
    { cell: [-1, 0], arm: 'west' }
  ];

  var ROOMS = CC.LEVELS.map(function (lv, i) {
    var cell = (NET[i] || NET[0]).cell;
    return {
      index: i,
      id: lv.id,
      title: lv.title,
      hint: lv.hint,
      start: lv.start,
      target: lv.target,
      shelf: lv.shelf,
      slots: lv.slots,
      solution: lv.solution,
      tag: CC.levelTag(lv),
      cell: cell.slice(),
      arm: (NET[i] || NET[0]).arm
    };
  });

  function roomAt(x, y) {
    for (var i = 0; i < ROOMS.length; i++) {
      if (ROOMS[i].cell[0] === x && ROOMS[i].cell[1] === y) return ROOMS[i];
    }
    return null;
  }

  // ---- the delta (colour is the change) ----------------------------------
  // Walk both walls cell by cell; report where the composed wall differs from
  // the start wall. 'changed' = a cube recoloured/added at that position;
  // 'ghost'  = a cube the chain removed (REJECT) — the gap is kept visible.
  function wallDiff(start, wall) {
    var changed = [], ghosts = [];
    var stacks = Math.max(start.length, wall.length);
    for (var s = 0; s < stacks; s++) {
      var a = start[s] || [], b = wall[s] || [];
      var heights = Math.max(a.length, b.length);
      for (var h = 0; h < heights; h++) {
        var was = h < a.length ? a[h] : null;
        var now = h < b.length ? b[h] : null;
        if (was === now) continue;
        if (now === null) ghosts.push(s + ':' + h);
        else changed.push(s + ':' + h);
      }
    }
    return { changed: changed, ghosts: ghosts };
  }

  // ---- decode (every drawn mark names its record field) -------------------
  // The id grammar is the record field: 'map:Y:R' | 'reject:R' | 'stack:B' |
  // 'reverse' | 'flip'. The overlay shows the field verbatim plus what it does.
  function decodeFn(id) {
    var label = CC.fnLabel(id), what = 'unknown function';
    var m;
    if ((m = /^map:([A-Z]):([A-Z])$/.exec(id))) what = 'every ' + m[1] + ' cube becomes ' + m[2];
    else if ((m = /^reject:([A-Z])$/.exec(id))) what = 'every ' + m[1] + ' cube is removed; the gap stays';
    else if ((m = /^stack:([A-Z])$/.exec(id))) what = 'a ' + m[1] + ' cube is stacked on every column';
    else if (id === 'reverse') what = 'each column flips bottom↔top';
    else if (id === 'flip') what = 'the wall mirrors left↔right';
    return { id: id, label: label, what: what, field: 'chain slot · ' + id, known: CC.hasFn(id) };
  }

  // ---- solving -----------------------------------------------------------
  function solveCheck(lv, chain) {
    try {
      return CC.wallEq(CC.run(lv.start, chain), lv.target);
    } catch (e) {
      return false;
    }
  }

  // The chain's derived identity: the wall hash after each step (P2 — same
  // chain → same tags; a derived number carries its own derivation chain).
  function chainTags(lv, chain) {
    var out = [], wall = CC.clone(lv.start);
    out.push(CC.fnv1a(JSON.stringify(wall)));
    for (var i = 0; i < chain.length; i++) {
      wall = CC.run(wall, [chain[i]]);
      out.push(CC.fnv1a(JSON.stringify(wall)));
    }
    return out;
  }

  return {
    NET: NET, ROOMS: ROOMS,
    roomAt: roomAt,
    wallDiff: wallDiff,
    decodeFn: decodeFn,
    solveCheck: solveCheck,
    chainTags: chainTags
  };
});
