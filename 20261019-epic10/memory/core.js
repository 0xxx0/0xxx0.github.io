/* core.js — pure, deterministic, force-free graph logic.
   NO Math.random, NO physics, NO timers: a node's position is a pure
   function of its id (FNV-1a hash) plus a readable manual arrangement —
   type lanes top→bottom (journey order), hash-spread x inside the lane,
   then a deterministic push-apart pass so nothing overlaps.
   Runs in the browser (window.MG_CORE) and under node (require). */

var MG_CORE = (function () {
  'use strict';

  /* logical coordinate space: phone-first 390 wide; renderer scales. */
  var LOGICAL_W = 390;
  var PAD = 18;          /* lane inset, logical px */
  var TOP = 34;          /* first lane offset (leaves room for stage rule) */
  var LANE_H = 92;       /* lane pitch */
  var NODE_R = 7;        /* glyph radius */
  var MIN_GAP = 44;      /* min centre-to-centre distance inside a lane */

  /* journey lane order: where → who → what was chosen → what was made →
     what it became → what was learned */
  var TYPE_ORDER = ['place', 'person', 'decision', 'artifact', 'project', 'lesson'];

  /* FNV-1a 32-bit + avalanche. Same id ⇒ same uint32, forever. */
  function hash32(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h ^= h >>> 15; h = Math.imul(h, 2246822507) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }

  function hash01(str) { return hash32(str) / 4294967296; }

  /* per-node hash — the identity that drives x, y-jitter, arc and label */
  function nodeHash(id) { return hash32('n:' + id); }

  function laneIndex(type) {
    var i = TYPE_ORDER.indexOf(type);
    return i < 0 ? 0 : i;
  }

  /* ---- layout ----------------------------------------------------------
     Input order never matters: lane members are sorted by (rawX, id)
     before any arithmetic, so the same set of ids always yields the
     same coordinates and the same signature. */
  function layout(nodes) {
    var byLane = {};
    for (var i = 0; i < nodes.length; i++) {
      var l = laneIndex(nodes[i].type);
      (byLane[l] = byLane[l] || []).push(nodes[i]);
    }
    var usable = LOGICAL_W - 2 * PAD - 2 * NODE_R;
    var minX = PAD + NODE_R;
    var maxX = LOGICAL_W - PAD - NODE_R;
    var pos = {};

    Object.keys(byLane).forEach(function (key) {
      var lane = parseInt(key, 10);
      var arr = byLane[key].map(function (n) {
        return {
          id: n.id,
          x: PAD + NODE_R + hash01('x:' + n.id) * usable,
          yOff: (hash01('y:' + n.id) - 0.5) * (LANE_H * 0.36)
        };
      });
      arr.sort(function (a, b) {
        if (a.x !== b.x) return a.x - b.x;
        return a.id < b.id ? -1 : 1;
      });

      /* forward push (min gap) */
      for (var i = 1; i < arr.length; i++) {
        if (arr[i].x - arr[i - 1].x < MIN_GAP) arr[i].x = arr[i - 1].x + MIN_GAP;
      }
      /* backward clamp if the lane overflowed the right edge */
      var over = arr.length ? arr[arr.length - 1].x - maxX : 0;
      if (over > 0) {
        for (var j = arr.length - 1; j >= 0; j--) {
          arr[j].x = Math.min(arr[j].x, maxX - (arr.length - 1 - j) * MIN_GAP);
        }
        /* deterministic fallback: even spread (never triggers at 390px/≤4 per lane) */
        if (arr[0].x < minX) {
          var span = maxX - minX, n = arr.length;
          for (var m = 0; m < n; m++) arr[m].x = minX + (n === 1 ? span / 2 : span * m / (n - 1));
        }
      }

      var cy = TOP + lane * LANE_H + LANE_H / 2;
      arr.forEach(function (a) {
        pos[a.id] = {
          x: Math.round(a.x * 100) / 100,
          y: Math.round((cy + a.yOff) * 100) / 100,
          lane: lane,
          h: nodeHash(a.id)
        };
      });
    });
    return pos;
  }

  /* stable hex fingerprint of a whole layout: same ids ⇒ same signature */
  function layoutSignature(nodes) {
    var pos = layout(nodes);
    var parts = Object.keys(pos).sort().map(function (id) {
      return id + ':' + pos[id].x + ':' + pos[id].y;
    });
    return hash32(parts.join('|')).toString(16).padStart(8, '0');
  }

  /* ---- graph queries --------------------------------------------------- */
  function neighbourhood(edges, id) {
    var incident = [], seen = {}, neighbours = [];
    seen[id] = true;
    for (var i = 0; i < edges.length; i++) {
      var e = edges[i];
      if (e.src !== id && e.dst !== id) continue;
      incident.push(e.id);
      var other = e.src === id ? e.dst : e.src;
      if (!seen[other]) { seen[other] = true; neighbours.push(other); }
    }
    return { id: id, nodes: Object.keys(seen), neighbours: neighbours, edges: incident, deg: incident.length };
  }

  function degrees(edges, nodeIds) {
    var d = {};
    (nodeIds || []).forEach(function (id) { d[id] = 0; });
    for (var i = 0; i < edges.length; i++) {
      d[edges[i].src] = (d[edges[i].src] || 0) + 1;
      d[edges[i].dst] = (d[edges[i].dst] || 0) + 1;
    }
    return d;
  }

  return {
    LOGICAL_W: LOGICAL_W, PAD: PAD, TOP: TOP, LANE_H: LANE_H,
    NODE_R: NODE_R, MIN_GAP: MIN_GAP,
    TYPE_ORDER: TYPE_ORDER,
    hash32: hash32, hash01: hash01, nodeHash: nodeHash,
    laneIndex: laneIndex, layout: layout, layoutSignature: layoutSignature,
    neighbourhood: neighbourhood, degrees: degrees
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = MG_CORE;
