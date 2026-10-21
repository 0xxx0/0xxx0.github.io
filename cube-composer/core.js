/* core.js — CUBE COMPOSER v0 composition engine (microlib, zero deps).
 *
 * The named mechanic (Cube Composer, David Peter / sharkdp, MIT): a wall of
 * colored cube-stacks is the state; the player composes visual functions
 * left-to-right (f >>> g >>> h) that map the start wall to the target wall.
 * Pure function composition over Wall = [stack], stack = [cube] (bottom→top).
 *
 * DOM-free + deterministic: no Math.random, no clocks. FNV-1a-32 level tags.
 * Works in the browser (window.CubeComposerCore) and node (module.exports) —
 * same law both sides, per house microlib rule (P6).
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CubeComposerCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---- wall algebra -------------------------------------------------------
  // wall: array of stacks (left→right); stack: array of cubes (bottom→top).

  function clone(wall) { return wall.map(function (s) { return s.slice(); }); }

  function mapC(a, b) {
    return function (wall) {
      return wall.map(function (s) { return s.map(function (c) { return c === a ? b : c; }); });
    };
  }
  function reverse(wall) { return wall.map(function (s) { return s.slice().reverse(); }); }
  function reject(a) {
    return function (wall) {
      return wall.map(function (s) { return s.filter(function (c) { return c !== a; }); })
        .filter(function (s) { return s.length > 0; });
    };
  }
  function stack(a) {
    return function (wall) { return wall.map(function (s) { return s.concat([a]); }); };
  }
  function flip(wall) { return wall.slice().reverse(); }

  // ---- function catalog (the shelf) --------------------------------------
  // id grammar: 'map:Y:R' | 'reject:R' | 'stack:B' | 'reverse' | 'flip'.
  // Label is the decode: every tile names what it DOES on sight (P8).

  var FNS = {
    'map:Y:R': { label: 'MAP Y→R', apply: mapC('Y', 'R') },
    'map:R:B': { label: 'MAP R→B', apply: mapC('R', 'B') },
    'map:B:G': { label: 'MAP B→G', apply: mapC('B', 'G') },
    'map:R:Y': { label: 'MAP R→Y', apply: mapC('R', 'Y') },
    'reverse': { label: 'REVERSE', apply: reverse },
    'reject:R': { label: 'REJECT R', apply: reject('R') },
    'reject:Y': { label: 'REJECT Y', apply: reject('Y') },
    'stack:B': { label: 'STACK B', apply: stack('B') },
    'flip': { label: 'FLIP', apply: flip }
  };

  function fnLabel(id) { return (FNS[id] || {}).label || String(id); }
  function hasFn(id) { return Object.prototype.hasOwnProperty.call(FNS, id); }

  // compose left→right: run(w,[f,g,h]) = h(g(f(w)))  (i.e. f >>> g >>> h)
  function run(wall, chain) {
    return chain.reduce(function (w, id) {
      if (!hasFn(id)) throw new Error('CUBE_COMPOSER_UNKNOWN_FN:' + id);
      return FNS[id].apply(w);
    }, clone(wall));
  }

  function wallEq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // ---- levels (hardcoded; same phrase → same rooms) -----------------------

  var LEVELS = [
    {
      id: 'L1', title: 'ONE CHANGE',
      hint: 'one function is enough',
      start: [['Y', 'R'], ['B', 'Y'], ['Y', 'G']],
      target: [['R', 'R'], ['B', 'R'], ['R', 'G']],
      shelf: ['map:Y:R', 'map:R:B', 'reverse'],
      slots: 2,
      solution: ['map:Y:R']
    },
    {
      id: 'L2', title: 'TWO CHANGES',
      hint: 'the first change feeds the second',
      start: [['Y', 'B'], ['G', 'Y']],
      target: [['R', 'G'], ['G', 'R']],
      shelf: ['map:Y:R', 'map:B:G', 'map:R:Y', 'flip'],
      slots: 3,
      solution: ['map:Y:R', 'map:B:G']
    },
    {
      id: 'L3', title: 'ORDER MATTERS',
      hint: 'same two changes, wrong order → R B / B R',
      start: [['Y', 'R'], ['R', 'Y']],
      target: [['B', 'B'], ['B', 'B']],
      shelf: ['map:Y:R', 'map:R:B', 'map:B:G', 'reverse'],
      slots: 3,
      solution: ['map:Y:R', 'map:R:B']
    },
    {
      id: 'L4', title: 'REJECT',
      hint: 'what is removed is part of the state',
      start: [['Y', 'R'], ['R', 'Y'], ['B', 'B']],
      target: [['Y'], ['Y'], ['B', 'B']],
      shelf: ['reject:R', 'reject:Y', 'map:R:Y', 'reverse'],
      slots: 2,
      solution: ['reject:R']
    },
    {
      id: 'L5', title: 'THE CHAIN',
      hint: 'three moves, one wall',
      start: [['Y', 'B'], ['G', 'Y'], ['R']],
      target: [['G'], ['G'], ['R']],
      shelf: ['map:B:G', 'reverse', 'reject:Y', 'stack:B', 'flip'],
      slots: 4,
      solution: ['map:B:G', 'reverse', 'reject:Y']
    }
  ];

  function level(id) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i];
    return null;
  }

  // ---- deterministic identity (P2) ---------------------------------------

  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  function levelTag(lv) {
    return fnv1a(JSON.stringify({ start: lv.start, target: lv.target, solution: lv.solution }));
  }

  return {
    clone: clone, FNS: FNS, fnLabel: fnLabel, hasFn: hasFn,
    run: run, wallEq: wallEq,
    LEVELS: LEVELS, level: level, levelTag: levelTag, fnv1a: fnv1a
  };
});
