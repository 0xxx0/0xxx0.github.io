// ladder-core.js — SLEEPER // LADDER, the four-distance resolution ladder core.
//
// One object at four resolutions: the painting (FAR) and its glyph city (NEAR /
// ENTERED) are the same field; the walked route recomposes the painting (EXITED)
// and returning reconstructs it exactly.
//
// THE CITY'S MATTER IS BUDDHADHAMMA. The text is P. A. Payutto's Buddhadhamma
// (free online edition, buddhadhamma.github.io), Section 7 "Path Factors":
// chapters 16, 17, 18. The full text stays LOCAL (void-anchor/sleeper/corpus/
// buddhadhamma/); what ships is a derived projection — a sampled matter stream,
// per-cell source coordinates, and one cited line per district. parseSource()
// below is the mapping that made it: paragraph = district, sentence = building,
// word = room, character = material, punctuation = rain / window / lamp / beacon.
//
// Determinism law: no Math.random, no Date, no ambient time anywhere in this
// file. Painting identity = hash32(sha256 of the painting bytes); source
// identity = hash32(prefix + sha256 of the selected text). One hash, one object.
// A hash ORIENTS inside a band measured from the data; it never INVENTS a
// coordinate (DESIGN-INTENT "measured, not seeded"). A cell nobody walked is
// never touched — an empty route recomposes to the original bytes.
//
// Dual-load, same shape as lib/moire-ambient.js: browser global
// `SleeperLadderCore` + CJS for the node selftest. Zero deps, no build.
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SleeperLadderCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  // The house hash: absorb, never duplicate (P6). In node require() resolves
  // relative to THIS file; in the browser the classic script already set the
  // global.
  const MA = (typeof module === 'object' && typeof module.exports === 'object' && root && !root.MoireAmbient)
    ? require('../../lib/moire-ambient.js')
    : root.MoireAmbient;
  if (!MA || typeof MA.hash32 !== 'function') throw new Error('ladder-core: lib/moire-ambient.js hash32 required');

  const hash32 = MA.hash32;

  // Grid: 96 x 32 is the painting's own 2172:724 = 2.999:1 aspect, so the field
  // and the painting share one coordinate frame.
  const COLS = 96, ROWS = 32, CELLS = COLS * ROWS;
  const SOURCE_PATH = '/sleeper/ladder/source-dhamma.json';
  const SOURCE_SCHEMA = 'sleeper/source-slice@1';
  const FINGERPRINT_PREFIX = 'buddhadhamma@1|';
  const PAINTING_ID = 'sleeper.borrowed-river/landscape.jpg';
  const PAINTING_SHA256 = '7b1e50ff74ffa2dec8d9b0733a6fa2b78364e7881c503f7602e2f043cb4ff428';

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const tag8 = (str) => ('00000000' + hash32(str).toString(16)).slice(-8);

  // ── luminance / hue (the painting's own measured fields) ───────────────────
  function lumOf(r, g, b) { return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }
  function hueOf(r, g, b) {
    const R = r / 255, G = g / 255, B = b / 255;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
    if (d === 0) return -1;                       // achromatic
    let h;
    if (mx === R) h = ((G - B) / d + 6) % 6;
    else if (mx === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    return h * 60;
  }
  // 8 hue bands + 8 = neutral. Colour carries DISTRICT identity only (P8: colour
  // is never the sole carrier; the district index rides in the decode strip).
  const DISTRICTS = 9;
  function districtOf(hue, sat) {
    if (hue < 0 || sat < 0.12) return 8;
    return clamp(Math.floor(hue / 45), 0, 7);
  }

  // ── parseSource — the mapping that built the city ─────────────────────────
  // paragraph = district, sentence = building, word = room, character =
  // material, punctuation = rain / window / lamp / beacon. Unchanged: this is
  // the SAME function the derivation ran over the book, and the selftest still
  // runs it over the local text to prove the shipped projection is its output.
  const PUNCT = { '.': 'window', ',': 'rain', ';': 'lamp', ':': 'lamp', '?': 'beacon', '!': 'beacon' };
  // A sentence ends at a terminator followed by a capital (or a quote and a
  // capital). The old splitter also broke on ")", which shredded every
  // parenthetical into its own building; the book is full of them, so the
  // boundary is the terminator, not the bracket.
  const SENTENCE_BREAK = /(?<=[.!?…])\s+(?=["'“‘(]?[\p{Lu}])/u;
  function splitSentences(block) {
    return String(block).split(SENTENCE_BREAK).map((s) => s.trim()).filter(Boolean);
  }
  function firstSentence(block) { const s = splitSentences(block); return s.length ? s[0] : ''; }
  function parseSource(text) {
    const blocks = String(text).replace(/\r/g, '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    const units = [];
    const sentences = [];
    const counts = { paragraphs: 0, sentences: 0, words: 0, chars: 0 };
    blocks.forEach((block, p) => {
      counts.paragraphs++;
      // A sentence ends at a terminator followed by a capital (or a quote and a
      // capital). The old splitter also broke on ")", which shredded every
      // parenthetical into its own building; the book is full of them, so the
      // boundary is the terminator, not the bracket.
      const split = splitSentences(block);
      split.forEach((sentence, s) => {
        const si = counts.sentences;
        sentences.push({ text: sentence, p, s, si });
        counts.sentences++;
        const words = sentence.split(/\s+/).filter(Boolean);
        words.forEach((word, w) => {
          counts.words++;
          // leading / trailing punctuation becomes its own weather unit.
          // Unicode-aware: \w is ASCII-only, and this text is full of ā ṭ ṇ —
          // a diacritic letter is matter, never weather.
          // lead and trail are measured on what is LEFT after the lead: a token
          // that is entirely punctuation ("—") would otherwise be emitted twice
          // and the character count would stop being the text's length.
          const lead = word.match(/^[^\p{L}\p{N}]+/u);
          const rest = lead ? word.slice(lead[0].length) : word;
          const trail = rest.match(/[^\p{L}\p{N}]+$/u);
          const core = trail ? rest.slice(0, rest.length - trail[0].length) : rest;
          if (lead) for (const ch of lead[0]) { units.push({ ch, p, s, si, w, room: word, punct: PUNCT[ch] || null }); counts.chars++; }
          for (const ch of core) { units.push({ ch, p, s, si, w, room: word, punct: null }); counts.chars++; }
          if (trail) for (const ch of trail[0]) { units.push({ ch, p, s, si, w, room: word, punct: PUNCT[ch] || null }); counts.chars++; }
        });
      });
    });
    return { blocks, sentences, units, counts };
  }

  // ── the projection: parsed text -> one unit per cell ──────────────────────
  // Cell n takes the n-th evenly-sampled unit, so the WHOLE selection is spread
  // across the city in reading order: a grid position is a coordinate into the
  // book (P5/P8 — position = meaning). This is the ONLY sampling rule; the
  // derivation and the selftest both call it, so the shipped projection cannot
  // drift from the mapping that made it.
  function projectCells(parsed, cells) {
    const n = cells || CELLS;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      out[i] = parsed.units[Math.floor(i * parsed.units.length / n)] || { ch: ' ', p: 0, s: 0, si: 0, w: 0, room: '', punct: null };
    }
    return out;
  }

  // ── the derived source (what the page fetches) ────────────────────────────
  // Schema sleeper/source-slice@1. Strict: a malformed slice is a GAP in the
  // world, never a silently thinner city.
  const B36 = 2;                                                 // 2 base36 digits per index
  function decodeIndex(series, i) { return parseInt(String(series).slice(i * B36, i * B36 + B36), 36) || 0; }
  function sourceFingerprint(sliceSha) { return tag8(FINGERPRINT_PREFIX + String(sliceSha)); }
  function readDerived(derived) {
    const bad = (m) => { throw new Error('source-slice: ' + m); };
    if (!derived || typeof derived !== 'object') bad('not an object');
    if (derived.schema !== SOURCE_SCHEMA) bad('schema ' + derived.schema + ' != ' + SOURCE_SCHEMA);
    const prov = derived.provenance || {}, sel = derived.selection || {};
    if (!prov.source_url || !prov.retrieved) bad('provenance needs source_url + retrieved');
    if (!sel.sha256) bad('selection.sha256 missing');
    const fp = sourceFingerprint(sel.sha256);
    if (derived.fingerprint !== fp) bad('fingerprint ' + derived.fingerprint + ' != ' + fp + ' (recomputed)');
    const matter = String(derived.matter || '');
    if (matter.length !== CELLS) bad('matter must be ' + CELLS + ' characters, got ' + matter.length);
    const cp = derived.cells && derived.cells.p, cs = derived.cells && derived.cells.s, cw = derived.cells && derived.cells.w;
    if (!cp || !cs || !cw || cp.length !== CELLS * B36 || cs.length !== CELLS * B36 || cw.length !== CELLS * B36) {
      bad('cells.p / cells.s / cells.w must each hold ' + (CELLS * B36) + ' base36 digits');
    }
    const districts = Array.isArray(derived.districts) ? derived.districts : bad('districts[] missing');
    const units = new Array(CELLS);
    for (let i = 0; i < CELLS; i++) {
      const ch = matter[i];
      units[i] = { ch, p: decodeIndex(cp, i), s: decodeIndex(cs, i), w: decodeIndex(cw, i), si: -1, room: '', punct: PUNCT[ch] || null };
    }
    // every cell must point at a real district, and every district must be drawn
    for (const u of units) if (!districts[u.p]) bad('cell points at missing district ' + u.p);
    const drawn = new Set(units.map((u) => u.p));
    if (drawn.size !== districts.length) bad('drawn districts ' + drawn.size + ' != districts ' + districts.length);
    return {
      schema: SOURCE_SCHEMA, fingerprint: fp, sha256: sel.sha256,
      provenance: prov, selection: sel, counts: derived.counts || {}, districts,
      units, matter,
    };
  }

  // ── imageField — luminance -> elevation, edges -> walls, hue -> district,
  //    fine texture -> window/rain density. Statistics per cell, never a
  //    stroke extrusion (the spec forbids crudely extruding brushwork).
  function imageField(rgba, w, h) {
    const cells = new Array(CELLS);
    for (let cy = 0; cy < ROWS; cy++) {
      const y0 = Math.floor(cy * h / ROWS), y1 = Math.max(y0 + 1, Math.floor((cy + 1) * h / ROWS));
      for (let cx = 0; cx < COLS; cx++) {
        const x0 = Math.floor(cx * w / COLS), x1 = Math.max(x0 + 1, Math.floor((cx + 1) * w / COLS));
        let n = 0, ls = 0, l2 = 0, rs = 0, gs = 0, bs = 0, es = 0;
        const L = new Float64Array((x1 - x0) * (y1 - y0));
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * w + x) * 4;
            const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
            const l = lumOf(r, g, b);
            L[(y - y0) * (x1 - x0) + (x - x0)] = l;
            ls += l; l2 += l * l; rs += r; gs += g; bs += b; n++;
          }
        }
        for (let y = 0; y < y1 - y0 - 1; y++) {
          for (let x = 0; x < x1 - x0 - 1; x++) {
            const i = y * (x1 - x0) + x;
            es += Math.abs(L[i + 1] - L[i]) + Math.abs(L[i + (x1 - x0)] - L[i]);
          }
        }
        const mean = ls / n;
        const r = rs / n, g = gs / n, b = bs / n;
        const sat = Math.max(r, g, b) === 0 ? 0 : (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b);
        const hue = hueOf(r, g, b);
        cells[cy * COLS + cx] = {
          lum: mean,
          tex: Math.sqrt(Math.max(0, l2 / n - mean * mean)),  // fine texture
          edge: (es / Math.max(1, n)) * 4,                      // edge energy
          rgb: [r, g, b],
          hue, sat,
          district: districtOf(hue, sat),
        };
      }
    }
    return cells;
  }

  // ── buildField — image field + text matter, one grid ──────────────────────
  // `source` is either a parsed projection ({units}) or raw text (the old arm,
  // kept so the mapping stays testable on its own).
  //
  // Walls are the painting's strongest edges, but the cut is not guessed: the
  // ladder tries a deterministic ladder of quantiles and keeps the one that
  // OPENS THE LARGEST WALKABLE DISTRICT — a wall map that walls the player into
  // a closet is a picture of a city, not a city.
  const CUT_LADDER = [0.62, 0.70, 0.78, 0.86, 0.92];
  function buildField(rgba, w, h, source) {
    const projection = typeof source === 'string' ? { units: parseSource(source).units, counts: parseSource(source).counts, districts: [] } : (source || {});
    const units = projection.units || [];
    const cells = imageField(rgba, w, h);
    const edges = cells.map((c) => c.edge).sort((a, b) => a - b);
    const decorate = (cut) => {
      let walls = 0;
      for (let i = 0; i < CELLS; i++) {
        const c = cells[i];
        const unit = units[Math.floor(i * units.length / CELLS)] || { ch: ' ', p: 0, s: 0, w: 0, room: '', punct: null };
        c.n = i; c.cx = i % COLS; c.cy = (i / COLS) | 0;
        c.wall = c.edge > cut;
        if (c.wall) walls++;
        c.unit = unit;
        c.material = unit.ch;
        c.weather = unit.punct;
      }
      return walls;
    };
    // Start = walkable cell nearest the painting's own centre (measured, not
    // authored), aspect-corrected to the 96:32 frame.
    const midx = (COLS - 1) / 2, midy = (ROWS - 1) / 2;
    const nearestWalkable = () => {
      let start = null, best = Infinity;
      for (const c of cells) {
        if (c.wall) continue;
        const d = (c.cx - midx) ** 2 + ((c.cy - midy) * 3) ** 2;
        if (d < best) { best = d; start = c; }
      }
      return start;
    };
    let chosen = null;
    for (const q of CUT_LADDER) {
      const cut = edges[Math.floor(edges.length * q)];
      const walls = decorate(cut);
      const start = nearestWalkable();
      if (!start) continue;
      const reach = floodFill(cells, start);
      let size = 0;
      for (let i = 0; i < CELLS; i++) if (reach[i]) size++;
      if (!chosen || size > chosen.size) chosen = { q, cut, walls, start, reach, size };
      if (chosen.size >= CELLS * 0.6) break;          // enough city, stop climbing
    }
    if (!chosen) { decorate(edges[edges.length - 1]); chosen = { q: CUT_LADDER[0], cut: edges[edges.length - 1], walls: 0, start: nearestWalkable(), reach: floodFill(cells, nearestWalkable()), size: 0 }; }
    decorate(chosen.cut);
    const measured = measureDistricts(cells);
    // The painting's own luminance range: the NEAR tone ladder is this stretch,
    // not an arbitrary curve, and it is the SAME stretch at every distance.
    let lmin = 1, lmax = 0;
    for (const c of cells) { if (c.lum < lmin) lmin = c.lum; if (c.lum > lmax) lmax = c.lum; }
    const drawn = {
      districts: new Set(), buildings: new Set(), rooms: new Set(),
      materials: new Set(), weather: { window: 0, rain: 0, lamp: 0, beacon: 0 },
    };
    let walkable = 0, reached = 0;
    for (const c of cells) {
      if (!c.wall) walkable++;
      if (chosen.reach[c.n]) reached++;
      drawn.districts.add(c.unit.p);
      drawn.buildings.add(c.unit.p + ':' + c.unit.s);
      drawn.rooms.add(c.unit.p + ':' + c.unit.s + ':' + c.unit.w);
      drawn.materials.add(c.material);
      if (c.weather) drawn.weather[c.weather]++;
    }
    return {
      cols: COLS, rows: ROWS, cells, cut: chosen.cut, cutQ: chosen.q, start: chosen.start,
      lum: { min: lmin, max: lmax },
      reach: chosen.reach, reachable: chosen.size,
      districts: measured.districts, edges: measured.edges, bands: measured.bands,
      source: {
        path: SOURCE_PATH,
        fingerprint: projection.fingerprint || null,
        sha256: projection.sha256 || null,
        provenance: projection.provenance || null,
        districts: projection.districts || [],
        counts: projection.counts || {},
        units: units.length,
      },
      drawn: {
        districts: drawn.districts.size, buildings: drawn.buildings.size,
        rooms: drawn.rooms.size, materials: drawn.materials.size, weather: drawn.weather,
      },
      walkable, reached,
    };
  }

  function floodFill(cells, start) {
    const seen = new Uint8Array(CELLS);
    if (!start || start.wall) return seen;
    const stack = [start.n];
    seen[start.n] = 1;
    while (stack.length) {
      const n = stack.pop();
      const cx = n % COLS, cy = (n / COLS) | 0;
      const nb = [];
      if (cx > 0) nb.push(n - 1);
      if (cx < COLS - 1) nb.push(n + 1);
      if (cy > 0) nb.push(n - COLS);
      if (cy < ROWS - 1) nb.push(n + COLS);
      for (const m of nb) if (!seen[m] && !cells[m].wall) { seen[m] = 1; stack.push(m); }
    }
    return seen;
  }

  // ── measured distance from the origin (the gate placement field) ──────────
  // Breadth-first over walkable cells. This is a REAL field of the city (steps
  // from where you start), so gate positions are measured, never authored.
  function bfs(field) {
    const dist = new Int32Array(CELLS).fill(-1);
    const q = new Int32Array(CELLS);
    let head = 0, tail = 0;
    const s = field.start.n;
    dist[s] = 0; q[tail++] = s;
    while (head < tail) {
      const n = q[head++];
      const cx = n % COLS, cy = (n / COLS) | 0;
      const nb = [];
      if (cx > 0) nb.push(n - 1);
      if (cx < COLS - 1) nb.push(n + 1);
      if (cy > 0) nb.push(n - COLS);
      if (cy < ROWS - 1) nb.push(n + COLS);
      for (const m of nb) {
        if (dist[m] !== -1 || field.cells[m].wall) continue;
        dist[m] = dist[n] + 1; q[tail++] = m;
      }
    }
    return dist;
  }

  // ── the eight gates ───────────────────────────────────────────────────────
  // The ONE RETURN contract's eight enacted gates, now learning checks. Gates
  // stand at the quantiles of the walk's own distance field, inside a horizon
  // a phone can actually walk (the 85th percentile of reachable distance, hard
  // cap 96 steps). Each gate prefers an unvisited district, so the eight gates
  // are eight different paragraphs of the book.
  const GATES = 8;
  const GATE_HORIZON_CAP = 96;
  function placeGates(field, count, usable) {
    const k = count || GATES;
    const dist = bfs(field);
    const okDistrict = typeof usable === 'function' ? usable : () => true;
    const reach = [];
    let worst = 0;
    for (let n = 0; n < CELLS; n++) if (dist[n] > 0 && field.reach[n]) { reach.push(n); if (dist[n] > worst) worst = dist[n]; }
    // horizon: the 85th percentile of reachable distance, capped
    reach.sort((a, b) => (dist[a] - dist[b]) || (a - b));
    const p85 = reach.length ? dist[reach[Math.max(0, Math.floor(reach.length * 0.85))]] : 0;
    const horizon = Math.max(k, Math.min(GATE_HORIZON_CAP, p85 || worst));
    const band = reach.filter((n) => dist[n] <= horizon);
    const used = new Set(), usedDistricts = new Set(), out = [];
    for (let i = 0; i < k && band.length; i++) {
      const target = Math.floor((i + 0.5) * band.length / k);       // measured quantile
      let pick = -1, fallback = -1;
      for (let step = 0; step < band.length; step++) {
        const n = band[(target + step) % band.length];
        if (used.has(n)) continue;
        const p = field.cells[n].unit.p;
        if (!okDistrict(p)) continue;                 // a gate needs a line it can ask
        if (fallback < 0) fallback = n;
        if (!usedDistricts.has(p)) { pick = n; break; }
      }
      if (pick < 0) pick = fallback >= 0 ? fallback : band[target];
      used.add(pick);
      usedDistricts.add(field.cells[pick].unit.p);
      out.push({ i, n: pick, cx: pick % COLS, cy: (pick / COLS) | 0, p: field.cells[pick].unit.p, dist: dist[pick] });
    }
    return { gates: out, dist, horizon, band: band.length };
  }

  // A gate's card: the district's own cited line with one word taken out, and
  // three doors. Distractors are words of the SAME text (other districts), so
  // the question can only be answered from what the book says.
  function gateCard(districts, gateIndex, p, seedStr) {
    const d = districts[p];
    if (!d || !d.cloze || !d.answer) return null;
    const pool = [];
    for (const o of districts) {
      if (!o || o.p === p || !o.answer) continue;
      const w = o.answer;
      if (w.length < 4 || w.length > 18) continue;
      // same neighbourhood of length: a distractor that cannot be spotted by size
      if (Math.abs(w.length - d.answer.length) > 3) continue;
      const wl = w.toLowerCase(), al = d.answer.toLowerCase();
      if (wl === al) continue;
      // a distractor that is a form of the answer ("definition" / "definitions")
      // is not a distractor: it makes the question unanswerable by reading
      if (wl.indexOf(al) >= 0 || al.indexOf(wl) >= 0) continue;
      pool.push(w);
    }
    const seen = new Set([d.answer.toLowerCase()]);
    const uniq = pool.filter((w) => { const l = w.toLowerCase(); if (seen.has(l)) return false; seen.add(l); return true; });
    const seed = String(seedStr || '') + '|g' + gateIndex + '|p' + p;
    const opts = [d.answer];
    for (let i = 0; i < 2 && uniq.length; i++) {
      const idx = hash32(seed + '#' + i) % uniq.length;
      opts.push(uniq.splice(idx, 1)[0]);
    }
    // order the doors by hash (the answer's position is not a pattern)
    const order = opts.map((w, i) => ({ w, k: hash32(seed + '@' + i) })).sort((a, b) => (a.k - b.k) || 0).map((x) => x.w);
    return { p, cloze: d.cloze, answer: d.answer, options: order, heading: d.heading, locator: d.locator };
  }

  // ── the return ledger (retention, clock-free) ─────────────────────────────
  // Spaced by WALKS, not by wall time: every district you read is stamped with
  // a monotonic ordinal. Coming back into it after `gap` other district visits
  // surfaces one line from it again. No Date, no timers: the ledger is a pure
  // function of the order you walked.
  const LEDGER_GAP = 5;
  function emptyLedger() { return { v: 1, seq: 0, seen: {}, order: [] }; }
  function ledgerMark(ledger, p, heading) {
    const L = ledger && ledger.seen ? ledger : emptyLedger();
    const seq = (L.seq || 0) + 1;
    const prev = L.seen[p];
    const seen = Object.assign({}, L.seen);
    seen[p] = { n: (prev ? prev.n : 0) + 1, at: seq, heading: heading || (prev && prev.heading) || '' };
    const order = (L.order || []).filter((x) => x !== p).concat([p]).slice(-24);
    return { v: 1, seq, seen, order };
  }
  function ledgerRead(ledger, p) { return !!(ledger && ledger.seen && ledger.seen[p]); }
  function returnPrompt(ledger, p, districts, gap) {
    const g = gap == null ? LEDGER_GAP : gap;
    if (!ledger || !ledger.seen || !ledger.seen[p]) return null;
    const rec = ledger.seen[p];
    const ago = (ledger.seq || 0) - (rec.at || 0);
    if (ago < g) return null;                                  // too soon: quiet
    const d = districts && districts[p];
    if (!d || !d.line) return null;
    return { p, ago, line: d.line, locator: d.locator, heading: d.heading, reads: rec.n };
  }

  // ── DISTRICT WEATHER: carried, not assigned ───────────────────────────────
  // The marks used to be a property of the cell (this character is a comma, so
  // this cell rains). They are now a property of the DISTRICT, and the district
  // is not free to be anything: its own text is its whole vocabulary.
  //
  // The law (one sentence): the weather you carry turns the wheel one notch, and
  // the district becomes the first weather its own text carries going round
  // window -> rain -> lamp -> beacon; a district whose text carries no weather
  // at all lets the carry pass through untouched. So the weather of the next
  // district is a pure function of the weather you carried out of the previous
  // one plus that district's own units — nothing is assigned, nothing is random,
  // and the same city is a different weather depending on how you got there.
  //
  // Why the wheel and not "the loudest mark wins": measured on the shipped
  // source, the loudest-mark rule collapses to one weather for 24 of the 28
  // districts (every district's body is dominated by window/rain), which is a
  // constant dressed as a mechanic. The wheel changes 24 times across a walk of
  // the city and flips on 10 of the 25 districts you can enter from either side
  // (receipt: AXIS/work/sleeper-doctrine-2026-10-25/weather-law.txt).
  const WEATHERS = ['window', 'rain', 'lamp', 'beacon'];
  function heaviestWeather(b) {
    let best = null, bv = 0;
    for (const w of WEATHERS) { const v = (b && b[w]) || 0; if (v > bv) { bv = v; best = w; } }
    return best;
  }
  function weatherOf(body, carry) {
    const b = body || {};
    const own = WEATHERS.filter((w) => (b[w] || 0) > 0);
    if (!own.length) return carry || null;                 // no weather in its text: the carry crosses
    if (!carry || WEATHERS.indexOf(carry) < 0) return heaviestWeather(b);
    const i = WEATHERS.indexOf(carry);
    for (let s = 1; s <= WEATHERS.length; s++) {
      const w = WEATHERS[(i + s) % WEATHERS.length];
      if ((b[w] || 0) > 0) return w;                        // the next weather it can hold
    }
    return heaviestWeather(b);
  }
  // A fold, so the state you carry out is exactly the state you brought in plus
  // the text you crossed. `bodies` may be the field's district records or plain
  // histograms; `seq` is the district ids you entered, in walk order.
  function weatherFold(bodies, seq) {
    let carry = null;
    const steps = [];
    for (const p of seq) {
      const rec = bodies && bodies[p];
      const b = rec && rec.body ? rec.body : (rec || {});
      const w = weatherOf(b, carry);
      steps.push({ p, carryIn: carry, weather: w });
      carry = w;
    }
    return { steps, carry };
  }
  // The district you are in, in the order you entered it: consecutive cells of
  // one district are one visit, so the chain is the walk's own district run.
  function districtRuns(field, moves) {
    const w = walk(field, moves);
    const seq = [];
    for (const n of w.path) {
      const p = field.cells[n].unit.p;
      if (!seq.length || seq[seq.length - 1] !== p) seq.push(p);
    }
    return seq;
  }
  function weatherChain(field, moves) { return weatherFold(field.districts, districtRuns(field, moves)); }

  // The district's SHAPE: every cell side that borders another district (or the
  // frame). One vocabulary for two facts — the sight gate traces it, and the
  // district's weather is written along it.
  function measureDistricts(cells) {
    const districts = [];
    for (let n = 0; n < CELLS; n++) {
      const c = cells[n], p = c.unit.p, x = c.cx, y = c.cy;
      let d = districts[p];
      if (!d) d = districts[p] = { p, cells: 0, n0: n, n1: n, x0: x, y0: y, x1: x, y1: y, body: { window: 0, rain: 0, lamp: 0, beacon: 0 } };
      d.cells++; d.n1 = n;
      if (x < d.x0) d.x0 = x;
      if (x > d.x1) d.x1 = x;
      if (y < d.y0) d.y0 = y;
      if (y > d.y1) d.y1 = y;
      if (c.unit.punct) d.body[c.unit.punct]++;
    }
    const edges = [];
    const push = (p, x0, y0, x1, y1) => { (edges[p] || (edges[p] = [])).push([x0, y0, x1, y1]); };
    const owner = (x, y) => (x < 0 || y < 0 || x >= COLS || y >= ROWS ? -1 : cells[y * COLS + x].unit.p);
    for (let n = 0; n < CELLS; n++) {
      const c = cells[n], p = c.unit.p, x = c.cx, y = c.cy;
      if (owner(x, y - 1) !== p) push(p, x, y, x + 1, y);
      if (owner(x, y + 1) !== p) push(p, x, y + 1, x + 1, y + 1);
      if (owner(x - 1, y) !== p) push(p, x, y, x, y + 1);
      if (owner(x + 1, y) !== p) push(p, x + 1, y, x + 1, y + 1);
    }
    // Horizontal boundary runs, merged: one district edge is one line, not one
    // line per cell, so a weather rhythm laid along it does not restart at every
    // room and turn into a dotted mess.
    const bands = [];
    for (const p of Object.keys(edges)) {
      const hs = edges[p].filter((s) => s[1] === s[3]).map((s) => ({ y: s[1], x0: s[0], x1: s[2] })).sort((a, b) => (a.y - b.y) || (a.x0 - b.x0));
      const runs = [];
      for (const s of hs) {
        const last = runs[runs.length - 1];
        if (last && last.y === s.y && s.x0 <= last.x1) last.x1 = Math.max(last.x1, s.x1);
        else runs.push({ y: s.y, x0: s.x0, x1: s.x1 });
      }
      bands[p] = runs;
    }
    return { districts, edges, bands };
  }

  // ── the sight gate: entry is admitted by an act, not by a word ────────────
  // The first gate is not a question. It stands at the threshold of a district
  // and refuses the step until that district has been SEEN WHOLE: a sustained
  // hold lifts the view from the walked window to the whole field until the
  // district's own shape is legible. Only then is its line spoken. The rest of
  // the gates still ask. One gate is the experiment; the law lives in the act.
  const SIGHT_GATES = 1;
  const SEEN_AT = 0.9;                                    // the hold is satisfied here
  function gateKind(i) { return i < SIGHT_GATES ? 'sight' : 'word'; }
  function gateAdmits(kind, seen) { return kind === 'sight' ? !!seen : true; }
  function riseMet(k) { return Number(k) >= SEEN_AT; }

  // ── the walk: compressed U/D/L/R witness (the ONE RETURN path signature) ──
  const DELTA = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  function routeString(moves) { return Array.isArray(moves) ? moves.join('') : String(moves || ''); }
  function routeSeed(tag, moves) { return hash32(tag + '|' + routeString(moves)); }
  function step(field, pos, dir) {
    const d = DELTA[dir];
    if (!d || !pos) return null;
    const x = pos.cx + d[0], y = pos.cy + d[1];
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
    const cell = field.cells[y * COLS + x];
    if (cell.wall) return null;                       // the city says no
    return cell;
  }
  // Replay a witness: the walked cells and their visit counts (a real count —
  // the only thing the recomposition is allowed to read).
  function walk(field, moves) {
    let pos = field.start;
    const visits = new Uint32Array(CELLS);
    visits[pos.n] = 1;
    const path = [pos.n];
    const applied = [];
    for (const dir of moves) {
      const next = step(field, pos, dir);
      if (!next) continue;                            // blocked steps never enter the witness
      pos = next;
      visits[pos.n]++;
      path.push(pos.n);
      applied.push(dir);
    }
    return { visits, path, applied, pos, origin: field.start };
  }

  // ── recompose — the route baked into the painting ─────────────────────────
  // Pure: (pixels, field, witness) -> pixels + the trace polyline in painting
  // coordinates. Visited tiles shift inside a band measured from their own
  // local texture; the hash only orients the sign and the dash phase. Unvisited
  // tiles are byte-identical, so an empty route IS the original painting.
  function recompose(rgba, w, h, field, moves) {
    const out = new Uint8ClampedArray(rgba);
    const moves2 = routeString(moves).split('').filter((d) => DELTA[d]);
    if (!moves2.length) return { rgba: out, trace: [], seed: routeSeed(tag8(PAINTING_ID + PAINTING_SHA256), moves2), visits: 0, tiles: 0 };
    const tag = tag8(PAINTING_ID + PAINTING_SHA256);
    const seed = routeSeed(tag, moves2);
    const walked = walk(field, moves2);
    const trace = walked.path.map((n) => {
      const cx = n % COLS, cy = (n / COLS) | 0;
      return { x: ((cx + 0.5) / COLS) * w, y: ((cy + 0.5) / ROWS) * h };
    });
    let visited = 0, tiles = 0;
    for (let n = 0; n < CELLS; n++) {
      const v = walked.visits[n];
      if (!v) continue;
      visited++;
      const c = field.cells[n];
      const x0 = Math.floor(c.cx * w / COLS), x1 = Math.max(x0 + 1, Math.floor((c.cx + 1) * w / COLS));
      const y0 = Math.floor(c.cy * h / ROWS), y1 = Math.max(y0 + 1, Math.floor((c.cy + 1) * h / ROWS));
      const band = 0.04 + 0.9 * c.tex;                         // measured band (local texture)
      const sign = (hash32(seed + '#' + n) & 1) ? 1 : -1;      // oriented, never invented
      const amp = sign * band * (v / (1 + v));                 // saturates with visits
      const k = clamp(1 + amp, 0.6, 1.4);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * 4;
          out[i] = clamp(rgba[i] * k, 0, 255);
          out[i + 1] = clamp(rgba[i + 1] * k, 0, 255);
          out[i + 2] = clamp(rgba[i + 2] * k, 0, 255);
          tiles++;
        }
      }
    }
    // The walk itself, laid in as hairline ink (the borrowed-river stroke, the
    // house line pixel rgb(79,87,96)). Width scales with the image so the line
    // survives the FAR view. Rasterised by hand so the SAME pixels come out in
    // node and in the browser — the recomposition is one function, not two
    // implementations. Nothing here is seeded: the polyline is the walked path.
    const lw = Math.max(3, Math.round(w / 300));
    const inkA = 0.72;
    for (let i = 1; i < trace.length; i++) {
      const a = trace[i - 1], b = trace[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.ceil(len / 0.5));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t;
        for (let dy = -Math.floor(lw / 2); dy <= Math.floor(lw / 2); dy++) {
          for (let dx = -Math.floor(lw / 2); dx <= Math.floor(lw / 2); dx++) {
            const X = Math.round(px) + dx, Y = Math.round(py) + dy;
            if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
            const j = (Y * w + X) * 4;
            out[j] = clamp(out[j] * (1 - inkA) + 79 * inkA, 0, 255);
            out[j + 1] = clamp(out[j + 1] * (1 - inkA) + 87 * inkA, 0, 255);
            out[j + 2] = clamp(out[j + 2] * (1 - inkA) + 96 * inkA, 0, 255);
          }
        }
      }
    }
    return { rgba: out, trace, seed, visited, tiles, tag, width: lw };
  }

  // ── measurement ───────────────────────────────────────────────────────────
  // FAR-at-rest similarity: box-downscale both images to 64x64 and report mean
  // absolute difference (0..255 per channel) plus a changed-pixel count.
  function downscale64(rgba, w, h) {
    const out = new Float64Array(64 * 64 * 3);
    for (let y = 0; y < 64; y++) {
      const y0 = Math.floor(y * h / 64), y1 = Math.max(y0 + 1, Math.floor((y + 1) * h / 64));
      for (let x = 0; x < 64; x++) {
        const x0 = Math.floor(x * w / 64), x1 = Math.max(x0 + 1, Math.floor((x + 1) * w / 64));
        let r = 0, g = 0, b = 0, n = 0;
        for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
          const i = (yy * w + xx) * 4;
          r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; n++;
        }
        const o = (y * 64 + x) * 3;
        out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n;
      }
    }
    return out;
  }
  function mad64(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
    return s / a.length;
  }
  function changedPx(a, b, thresh) {
    const t = thresh == null ? 2 : thresh;
    let n = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (Math.abs(a[i] - b[i]) > t || Math.abs(a[i + 1] - b[i + 1]) > t || Math.abs(a[i + 2] - b[i + 2]) > t) n++;
    }
    return n;
  }

  // Deterministic synthetic painting for the zero-fixture selftest: a real
  // image-like field (gradient sky, mountain band, river, brush texture) built
  // only from hash32 — the laws under test are pipeline laws, and a fixture
  // file would be a second truth surface.
  function syntheticPainting(w, h, seed) {
    const s = String(seed == null ? 'ladder' : seed);
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / w, v = y / h;
        let l = 0.86 - 0.42 * v;                                   // sky falls toward the ridge
        const ridge = 0.42 + 0.10 * Math.sin(u * 7.1) + 0.05 * Math.sin(u * 17.3 + 1.7);
        if (v > ridge) l = 0.30 + 0.12 * Math.sin(u * 23.0 + v * 11.0);
        const river = Math.abs(v - (0.78 + 0.05 * Math.sin(u * 5.3)));
        if (river < 0.06) l = 0.72 - river * 3;
        const h1 = hash32(s + ':' + x + ':' + y) % 1000 / 1000;
        l = clamp(l + (h1 - 0.5) * 0.06, 0, 1);
        const i = (y * w + x) * 4;
        rgba[i] = 255 * l * 0.96;
        rgba[i + 1] = 255 * l * 0.94;
        rgba[i + 2] = 255 * l * 0.88;
        rgba[i + 3] = 255;
      }
    }
    return rgba;
  }

  return Object.freeze({
    version: '0.3.0',
    COLS, ROWS, CELLS, SOURCE_PATH, SOURCE_SCHEMA, FINGERPRINT_PREFIX,
    PAINTING_ID, PAINTING_SHA256, DISTRICTS, GATES, GATE_HORIZON_CAP, LEDGER_GAP,
    CUT_LADDER, WEATHERS, SIGHT_GATES, SEEN_AT,
    hash32, tag8, lumOf, hueOf, districtOf, parseSource, splitSentences, firstSentence, projectCells, readDerived,
    sourceFingerprint, imageField, buildField,
    heaviestWeather, weatherOf, weatherFold, districtRuns, weatherChain, measureDistricts,
    gateKind, gateAdmits, riseMet,
    floodFill, bfs, placeGates, gateCard, emptyLedger, ledgerMark, ledgerRead, returnPrompt,
    routeString, routeSeed, step, walk, recompose, downscale64, mad64,
    changedPx, syntheticPainting, PUNCT,
  });
});
