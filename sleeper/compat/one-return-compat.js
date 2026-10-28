/* one-return-compat.js — the compatibility layer between the canonical v2 ONE RETURN
 * artifact and the old nine-gate donor (/sleeper/one-return/).
 *
 * WHY (call sleeper-donor, answer C, 2026-10-25): conformance measured that the donor runs
 * `one-return-nine-gate/reified-0.2` (9 positional gates, protocols RECALL|SUCCESSION) while
 * the canonical engine emits `sleeper.one-return` v2 (8 named gates: TRUTH · PROVENANCE ·
 * OPERATION · RETRIEVAL · TRANSFER · MEASURE · COMPRESSION · RESILIENCE). The donor's
 * importPacket refused every v2 artifact: "No compatible ONE RETURN or BY/GRID-PATH-2 state".
 *
 * WHAT THIS DOES — and refuses to do
 *   v2 → donor : PROJECTS the artifact into a valid nine-gate world. Gates 1..8 carry the
 *                canonical gate names and the artifact's tokens as their lines; gate 9 is
 *                SUCCESSION and carries the returnedSource. The projection is real play (the
 *                donor's own rules), but it is NOT the original run: the artifact's geometry
 *                was different, so the world is a re-instantiation, marked `compat.projection`.
 *   donor → v2 : RECONSTRUCTS a v2 artifact from a donor export. The donor's exportPacket
 *                omits the grid and gates, so proofs are rebuilt from the trace; every proof is
 *                tagged `evidence: 'trace' | 'synthesized'`. A synthesized proof is never
 *                presented as a recorded one.
 *   Neither direction invents a gate result. Missing evidence lowers fidelity, it does not
 *   fill itself in.
 *
 * DETERMINISTIC by construction: no Date, no Math.random. `--deterministic` (the default)
 * additionally pins the informational time fields the donor's own export leaves free.
 *
 * Usage (node):   node one-return-compat.js --selftest
 *                 node one-return-compat.js --to-donor v2.json out.json
 *                 node one-return-compat.js --to-v2 donor.json out.json
 * Usage (browser): <script src="/sleeper/compat/one-return-compat.js"></script>
 *                  OneReturnCompat.fromV2(artifactOrBundle) -> donor world packet | null
 *                  OneReturnCompat.toV2(donorPacket)          -> canonical v2 artifact
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.OneReturnCompat = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CANON_GATES = ['TRUTH', 'PROVENANCE', 'OPERATION', 'RETRIEVAL',
                     'TRANSFER', 'MEASURE', 'COMPRESSION', 'RESILIENCE'];
  var DONOR_N = 9;         // the donor's gate count
  var W = 39, H = 23;      // the donor's grid
  var EPOCH = '1970-01-01T00:00:00.000Z';

  /* ---------- deterministic hash (FNV-1a 32) ---------- */
  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }
  function rng(seedStr) {
    var s = fnv(seedStr) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  /* ---------- source handling ---------- */
  function sourceLines(src) {
    if (Array.isArray(src)) return src.map(String).filter(function (s) { return s.length; });
    var out = String(src == null ? '' : src).split(/\r?\n/).map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length; });
    if (!out.length) out = ['ONE RETURN'];
    return out;
  }

  /* ---------- v2 detection ---------- */
  function unwrapV2(x) {
    if (!x || typeof x !== 'object') return null;
    if (x.schema === 'sleeper.one-return' && x.version === 2) return x;
    if (x.artifact && x.artifact.schema === 'sleeper.one-return') return x.artifact;   // v3-native bundle
    if (x.schema === 'sleeper.one-return.bundle/v3-native' && x.artifact) return x.artifact;
    return null;
  }

  /* ---------- v2 -> donor world ---------- */
  function projectV2(artifact) {
    var a = unwrapV2(artifact);
    if (!a) return null;
    var key = a.worldKey || 'world';
    var lines = sourceLines(a.source);
    var tokens = (a.proofs || []).map(function (p) { return String(p.token != null ? p.token : ''); });
    var rand = rng(key + '|' + lines.join('\u0001'));

    // grid: open floor inside a wall border, deterministic scatter of wall noise from the source
    var grid = [];
    for (var y = 0; y < H; y++) {
      var row = [];
      for (var x = 0; x < W; x++) {
        var edge = (x === 0 || y === 0 || x === W - 1 || y === H - 1);
        row.push(edge ? '#' : (rand() < 0.18 ? '#' : ' '));
      }
      grid.push(row);
    }
    // start is always open (the donor starts at 1,1)
    grid[1][1] = ' ';

    // nine gate positions: deterministic, spread, never on a wall, never on the start
    var gates = [];
    var used = { '1,1': 1 };
    for (var i = 0; i < DONOR_N; i++) {
      var gx, gy, tries = 0;
      do {
        gx = 2 + Math.floor(rand() * (W - 4));
        gy = 2 + Math.floor(rand() * (H - 4));
        tries++;
      } while ((used[gx + ',' + gy] || grid[gy][gx] === '#') && tries < 500);
      used[gx + ',' + gy] = 1;
      grid[gy][gx] = String(i + 1);
      var canon = i < CANON_GATES.length ? CANON_GATES[i] : 'SUCCESSION';
      var line = i < CANON_GATES.length
        ? (tokens[i] || canon)
        : (a.returnedSource || 'RETURN TO ORIGIN');
      gates.push({
        id: i + 1, x: gx, y: gy, line: String(line).slice(0, 160),
        gate: canon,
        protocol: i % 2 ? 'SUCCESSION' : 'RECALL',
        status: i === 0 ? 'current' : 'locked',
        compat: true
      });
    }

    // exit: the open cell farthest (Manhattan) from the start, never a gate
    var exit = { x: W - 2, y: H - 2 }, best = -1;
    for (var yy = 1; yy < H - 1; yy++) {
      for (var xx = 1; xx < W - 1; xx++) {
        if (grid[yy][xx] !== ' ') continue;
        var d = Math.abs(xx - 1) + Math.abs(yy - 1);
        if (d > best) { best = d; exit = { x: xx, y: yy }; }
      }
    }
    grid[exit.y][exit.x] = 'E';

    var gateLines = gates.map(function (g) { return g.line; });
    return {
      schema: 'one-return/import-reified-0.2',
      at: EPOCH,
      compat: {
        from: 'sleeper.one-return/v2', projection: true, worldKey: key,
        proofs: (a.proofs || []).length, note: 're-instantiated geometry; gate lines carry the artifact tokens'
      },
      source: { seed: key, units: lines },
      rules: { adapter: 'compat-v2-projection', gateCount: DONOR_N, worldEpoch: 0 },
      state: { gate: 0, steps: 0, signal: 0, noise: 0, returns: 0 },
      upstream: {
        format: 'sleeper.one-return/v2', worldKey: key,
        returnedSource: a.returnedSource || null,
        dominantOperator: a.dominantOperator || null,
        pathSignature: a.pathSignature || null,
        proofs: (a.proofs || []).length,
        cell: a.cell || null, figure: a.figure || null,
        // fields the donor's own UI reads (it prints "UPSTREAM · <format> · <pack> · <address>")
        sourcePack: 'compat', pathId: 'projection', address: String(a.worldKey || '∅'),
        reading: (a.proofs || []).map(function (x) { return x.token; }).join(' · ') || null,
        method: 'compat-projection'
      },
      world: {
        schema: 'one-return-nine-gate/reified-0.2',
        seed: key,
        source: lines,
        adapter: 'compat-v2-projection',
        grid: grid.map(function (r) { return r.join(''); }),
        x: 1, y: 1,
        exit: exit,
        gates: gates,
        gateLines: gateLines,
        nextGate: 0, steps: 0, signal: 0, noise: 0, attempts: 0, correct: 0,
        visited: { '1,1': 1 }, trail: [], ghostTrail: [], events: [],
        returnLedger: [], returns: 0, worldEpoch: 0,
        upstream: {
          format: 'sleeper.one-return/v2', worldKey: key,
          returnedSource: a.returnedSource || null, proofs: (a.proofs || []).length,
          sourcePack: 'compat', pathId: 'projection', address: String(a.worldKey || '∅')
        },
        routeWitnesses: [], lastRouteWitness: null, compareBase: null,
        ghostMode: 'NONE', createdAt: EPOCH
      }
    };
  }

  /* ---------- donor -> v2 ---------- */
  function donorToV2(packet) {
    if (!packet || typeof packet !== 'object') throw new Error('compat: not an object');
    var w = packet.world || (packet.state && packet.state.world) || null;
    var isDonor = packet.schema === 'one-return/import-reified-0.2'
      || packet.schema === 'one-return-nine-gate/reified-0.2'
      || (w && w.schema === 'one-return-nine-gate/reified-0.2')
      || (packet.rules && packet.rules.gateCount === DONOR_N);
    if (!isDonor) throw new Error('compat: not a donor packet (' + (packet.schema || 'no schema') + ')');

    var src = (packet.source && packet.source.units) || (w && w.source) || [];
    var key = (packet.source && packet.source.seed) || (w && w.seed) || 'donor';
    var trace = Array.isArray(packet.trace) ? packet.trace : (w && w.events) || [];
    var state = packet.state || {};
    var gatesDone = Number(state.gate || (w && w.nextGate) || 0);
    var units = sourceLines(src);

    // proofs: prefer the trace, else synthesize from the source tokens — and SAY WHICH
    var byGate = {};
    trace.forEach(function (e) {
      if (!e || typeof e !== 'object') return;
      var g = e.gate != null ? Number(e.gate) : (e.data && e.data.gate != null ? Number(e.data.gate) : null);
      if (g != null && !isNaN(g)) byGate[g] = e;
    });
    var gateDefs = (w && w.gates) || [];
    var proofs = [];
    for (var i = 0; i < CANON_GATES.length; i++) {
      var gid = i + 1;
      var ev = byGate[gid];
      var gateLine = gateDefs[gid - 1] && gateDefs[gid - 1].line != null ? String(gateDefs[gid - 1].line) : null;
      proofs.push({
        gate: CANON_GATES[i],
        token: ev && ev.token != null ? String(ev.token) : (gateLine || units[i % units.length] || CANON_GATES[i]),
        evidence: ev ? 'trace' : 'synthesized',
        donorGate: gid,
        protocol: gid % 2 ? 'RECALL' : 'SUCCESSION',
        collected: gid <= gatesDone
      });
    }
    var ledger = packet.returnLedger || (w && w.returnLedger) || [];
    var upstream = packet.upstream || (w && w.upstream) || {};
    // the artifact's own return wins; then a ledger entry; never a guess from the source text
    var returnedSource = upstream.returnedSource
      || (ledger.length && (ledger[ledger.length - 1].returnedSource || ledger[ledger.length - 1].source))
      || null;
    var returnSourceClass = upstream.returnedSource ? 'artifact' : (returnedSource ? 'ledger' : 'absent');
    var instruction = 'Name the constraint that must survive the next change.';

    return {
      schema: 'sleeper.one-return',
      version: 2,
      worldKey: key,
      source: units.join('\n'),
      returnedSource: returnedSource,
      cell: {
        id: 'compat/' + ((() => { var h = fnv(key).toString(16); return h.slice(0, 8); })()),
        source: units[0] || '', provenance: 'donor nine-gate packet v0.2', witness: proofs.map(function (p) { return p.token; }).join(' · ')
      },
      figure: (w && w.figure) || 'compat',
      dominantOperator: 'w8',
      transferInstruction: instruction,
      pathSignature: (() => {
        var s = fnv(key + '|' + gatesDone + '|' + proofs.map(function (p) { return p.token; }).join('|')).toString(16);
        return ('00000000' + s).slice(-8);
      })(),
      operatorCounts: { conch: 0, keris: 0, w8: 0, spiral: 0 },
      proofs: proofs,
      measures: { steps: Number(state.steps != null ? state.steps : (w && w.steps) || 0), elapsedMs: 0 },
      compat: {
        from: packet.schema || 'one-return-nine-gate/reified-0.2',
        donorGateCount: DONOR_N, canonicalGateCount: CANON_GATES.length,
        synthesizedProofs: proofs.filter(function (p) { return p.evidence === 'synthesized'; }).length,
        returnedSourceEvidence: returnSourceClass,
        note: 'gate 9 (SUCCESSION) has no canonical counterpart; it is carried as returnedSource'
      }
    };
  }

  /* ---------- determinism ---------- */
  function stable(obj) {
    return JSON.parse(JSON.stringify(obj, function (k, v) {
      if (k === 'at' || k === 'createdAt' || k === 'elapsedMs' || k === 'generatedAt') return EPOCH;
      return v;
    }));
  }

  /* ---------- selftest ---------- */
  function selftest() {
    var R = [], ok = function (name, cond, detail) { R.push({ name: name, pass: !!cond, detail: detail === undefined ? '' : String(detail) }); };

    var fixture = {
      schema: 'sleeper.one-return', version: 2, worldKey: 'compat/selftest-city',
      source: 'the river carries what the city cannot hold\na constraint survives the change\nthe smallest cut opens the next action',
      returnedSource: 'the river carries what the city cannot hold',
      cell: { id: 'c1', source: 'the river carries what the city cannot hold', provenance: 'selftest', witness: 'w1' },
      figure: 'keris', dominantOperator: 'keris',
      transferInstruction: 'Make the smallest cut that changes the next possible action.',
      pathSignature: 'abcdef12',
      operatorCounts: { conch: 1, keris: 4, w8: 2, spiral: 1 },
      proofs: CANON_GATES.map(function (g, i) {
        return { gate: g, token: 'tok' + i, collected: true };
      }),
      measures: { steps: 42, elapsedMs: 1234 }
    };

    var proj = projectV2(fixture);
    ok('v2 projects to a donor packet', !!proj, proj ? proj.schema : 'null');
    ok('grid is 23 rows of 39 cols', proj.world.grid.length === H && proj.world.grid.every(function (r) { return r.length === W; }),
      proj.world.grid.length + 'x' + proj.world.grid[0].length);
    ok('nine gates placed', proj.world.gates.length === DONOR_N, proj.world.gates.length);
    ok('gates sit on open cells or their own digit',
      proj.world.gates.every(function (g) { var c = proj.world.grid[g.y][g.x]; return c === String(g.id) || c === ' '; }),
      'all on floor');
    ok('gate 1..8 carry canonical names in order',
      proj.world.gates.slice(0, 8).every(function (g, i) { return g.gate === CANON_GATES[i]; }),
      proj.world.gates.slice(0, 3).map(function (g) { return g.gate; }).join(','));
    ok('gate 9 is SUCCESSION and carries the returned source',
      proj.world.gates[8].gate === 'SUCCESSION' && /river/.test(proj.world.gates[8].line), proj.world.gates[8].line.slice(0, 40));
    ok('exit exists and is not a gate', (function () {
      var e = proj.world.exit, c = proj.world.grid[e.y][e.x];
      var onGate = proj.world.gates.some(function (g) { return g.x === e.x && g.y === e.y; });
      return c === 'E' && !onGate;
    })(), JSON.stringify(proj.world.exit));
    ok('upstream records the artifact', proj.upstream.worldKey === fixture.worldKey && proj.upstream.proofs === 8,
      proj.upstream.method);
    ok('projection is deterministic', JSON.stringify(projectV2(fixture)) === JSON.stringify(proj), 'byte-identical');
    ok('import shape satisfies the donor (world.grid + world.gates)', !!(proj.world && proj.world.grid && proj.world.gates), 'ok');

    var back = donorToV2(proj);
    ok('donor packet converts back to v2', back.schema === 'sleeper.one-return' && back.version === 2, back.schema);
    ok('eight canonical proofs reconstructed', back.proofs.length === 8, back.proofs.length);
    ok('proofs declare their evidence class', back.proofs.every(function (p) { return p.evidence === 'trace' || p.evidence === 'synthesized'; }),
      back.proofs.filter(function (p) { return p.evidence === 'synthesized'; }).length + ' synthesized');
    ok('worldKey survives the round trip', back.worldKey === fixture.worldKey, back.worldKey);
    ok('source text survives the round trip', back.source === fixture.source, back.source.slice(0, 30) + '…');
    ok('returnedSource is the artifact\'s own, not a guess', back.returnedSource === fixture.returnedSource,
      back.compat.returnedSourceEvidence + ': ' + String(back.returnedSource).slice(0, 34));
    ok('gate tokens survive the round trip', back.proofs.map(function (p) { return p.token; }).join(',') === 'tok0,tok1,tok2,tok3,tok4,tok5,tok6,tok7',
      back.proofs.map(function (p) { return p.token; }).join(',').slice(0, 40));
    ok('compat declares the 9 -> 8 reduction', back.compat.donorGateCount === 9 && back.compat.canonicalGateCount === 8,
      back.compat.note.slice(0, 40));
    ok('deterministic conversion (no clock leaks)',
      JSON.stringify(stable(donorToV2(proj))) === JSON.stringify(stable(donorToV2(proj))), 'byte-identical');
    ok('refuses a foreign schema', (function () { try { donorToV2({ schema: 'something/else' }); return false; } catch (e) { return /not a donor packet/.test(e.message); } })(), 'threw');
    ok('null for a non-v2 input', projectV2({ schema: 'nope' }) === null, 'null');

    return { pass: R.filter(function (r) { return r.pass; }).length, total: R.length, rows: R };
  }

  return {
    CANON_GATES: CANON_GATES.slice(), DONOR_N: DONOR_N,
    fromV2: projectV2, toV2: donorToV2, stable: stable, selftest: selftest,
    fnv: fnv, sourceLines: sourceLines
  };
}));

/* ---------- CLI (node only) ---------- */
if (typeof require === 'function' && typeof module !== 'undefined' && require.main === module) {
  var fs = require('fs');
  var api = module.exports;
  var argv = process.argv.slice(2);
  var mode = argv[0];
  if (mode === '--selftest') {
    var r = api.selftest();
    r.rows.forEach(function (x) { console.log((x.pass ? '  ok   ' : '  FAIL ') + x.name + (x.detail ? '  · ' + x.detail : '')); });
    console.log('\nPASS ' + r.pass + '/' + r.total);
    process.exit(r.pass === r.total ? 0 : 1);
  } else if ((mode === '--to-donor' || mode === '--to-v2') && argv[1] && argv[2]) {
    var input = JSON.parse(fs.readFileSync(argv[1], 'utf8'));
    var out = mode === '--to-donor' ? api.fromV2(input) : api.toV2(input);
    if (!out) { console.error('compat: no conversion produced'); process.exit(2); }
    fs.writeFileSync(argv[2], JSON.stringify(api.stable(out), null, 2) + '\n');
    console.log('wrote ' + argv[2]);
  } else {
    console.log('usage: node one-return-compat.js --selftest | --to-donor <in> <out> | --to-v2 <in> <out>');
    process.exit(2);
  }
}
