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
    // the gate layer: eight factors, each addressed to its own paragraph. This
    // block is NOT city matter — it never enters `units` or `districts`, so a
    // city built with it is bit-identical to one built without it.
    const factors = Array.isArray(derived.factors) ? derived.factors : [];
    if (factors.length && factors.length !== GATES) bad('factors[] must hold ' + GATES + ' entries, got ' + factors.length);
    for (const f of factors) {
      if (!f || !f.key || !f.en || !f.pali || !f.act || !f.line) bad('factor ' + (f && f.i) + ' needs key/en/pali/act/line');
      if (ACT_KINDS[f.act] == null) bad('factor ' + f.key + ': unknown act "' + f.act + '"');
    }
    return {
      schema: SOURCE_SCHEMA, fingerprint: fp, sha256: sel.sha256,
      provenance: prov, selection: sel, counts: derived.counts || {}, districts,
      units, matter, factors,
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

  // ── the eight gates ARE the eight path factors ────────────────────────────
  // The order is the doctrine's own: MN 117 (Mahācattārīsaka Sutta), quoted by
  // the text at path-factors-of-wisdom.txt:29 (Ch. 16 ¶15) — right view, right
  // thought, right speech, right action, right livelihood, right effort, right
  // mindfulness, right concentration. Gate i asks factor i, and the factor's own
  // paragraph is what it asks with. There is no gate without a factor.
  const GATES = 8;
  // what each factor's act is, in the instrument's own grammar: an act the walk
  // can perform ('sight' = the rise, 'act' = a gesture named by the factor), or
  // a word from the text where no gesture can carry the factor.
  const ACT_KINDS = { see: 'sight', word: 'word', letgo: 'act', silence: 'act', walk: 'act', return: 'act', stay: 'act' };

  // ── breath: the walk's stake, measured in the city's own units ────────────
  // One breath for every sentence the city is made of, and one for every
  // paragraph you must cross: 50 + 28 = 78 on the shipped source. Same source,
  // same budget, in every process. Nothing refills it inside a walk.
  const BREATH_STEP = 1;
  const BREATH_FAIL = 3;                    // a wrong door, or a word said at the silence gate
  function breathBudget(counts) {
    const c = counts || {};
    return (Number(c.sentences) || 0) + (Number(c.districts) || 0);
  }
  function spendBreath(breath, cost) {
    return Math.max(0, (Number(breath) || 0) - (Number(cost) || 0));
  }

  function gateKind(factors, i) {
    const f = factors && factors[i];
    return (f && ACT_KINDS[f.act]) || 'word';
  }
  // a sight or act gate refuses the step until its act is done; a word gate
  // opens its card when you arrive and never blocks the walk
  function gateAdmits(kind, done) { return kind === 'word' ? true : !!done; }

  // Gates stand ON the city, never in its matter. The eight factors are a PATH,
  // so the gates are one road: the walk's own way out of the city that crosses
  // the most paragraphs, divided into eight stretches, one threshold each, in the
  // doctrine's order. The road is found in the distance field the walk already
  // computes; no factor text is read here, and the matter is never touched.
  function pathFrom(field, far, dist) {
    const path = [far];
    let n = far;
    while (n !== field.start.n && path.length < CELLS) {
      const c = field.cells[n], pos = { n, cx: c.cx, cy: c.cy, unit: c.unit };
      let prev = -1;
      for (const d of ['U', 'D', 'L', 'R']) {
        const nx = step(field, pos, d);
        if (nx && dist[nx.n] === dist[n] - 1) { prev = nx.n; break; }
      }
      if (prev < 0) break;
      path.push(prev); n = prev;
    }
    return path.reverse();
  }
  function roadPath(field, budget) {
    const dist = bfs(field);
    const limit = Math.floor(Math.max(8, Number(budget) * 0.75));
    let best = null;
    for (let n = 0; n < CELLS; n++) {
      if (!field.reach[n] || dist[n] <= 2 || dist[n] > limit) continue;
      const path = pathFrom(field, n, dist);
      let ds = 0;
      const seen = new Set();
      for (const k of path) { const p = field.cells[k].unit.p; if (!seen.has(p)) { seen.add(p); ds++; } }
      const better = !best || ds > best.ds || (ds === best.ds && dist[n] > best.len) ||
        (ds === best.ds && dist[n] === best.len && n < best.n);
      if (better) best = { n, ds, len: dist[n], path };
    }
    if (!best) return { dist, path: [field.start.n], districts: 0 };
    return { dist, path: best.path, districts: best.ds };
  }
  function placeFactors(field, factors, budget) {
    const k = (factors && factors.length) || GATES;
    const road = roadPath(field, budget);
    const { dist, path } = road;
    const span = Math.max(1, path.length - 1);
    // eight equal stretches of one road, in the doctrine's order: the walk meets
    // the factors at a steady pace, and the last threshold is the end of the road
    const gates = [], used = new Set();
    for (let i = 0; i < k; i++) {
      let at = Math.max(1, Math.min(path.length - 1, Math.round((i + 1) * span / k)));
      while (used.has(at) && at < path.length - 1) at++;
      used.add(at);
      const n = path[at], f = factors && factors[i];
      gates.push({ i, n, cx: n % COLS, cy: (n / COLS) | 0, p: field.cells[n].unit.p, dist: at, factor: f ? f.key : null });
    }
    return { gates, dist, horizon: span, band: path.length, districts: road.districts };
  }

  // What a gate says: the factor's own sentence, cited. When the gate happens to
  // stand in the very district whose paragraph is that sentence, the district's
  // own cited line is spoken instead — the room and the gate agree, so the gate
  // does not repeat the book twice.
  function factorLine(factors, districts, gateIndex, p) {
    const f = factors && factors[gateIndex];
    if (!f) return null;
    const d = districts && districts[p];
    const own = d && f.district != null && Number(f.district) === Number(p) && d.line ? d : null;
    return {
      i: gateIndex, key: f.key, en: f.en, pali: f.pali, act: f.act,
      line: own ? d.line : f.line,
      locator: own ? (d.locator || '') : (f.quoteLocator || f.locator || ''),
      items: f.items || null,
      quoted: own ? 'district' : 'factor',
    };
  }

  // A word gate's card: the text's own sentence with one word taken out and three
  // doors. The sentence is the factor's own paragraph — the gate cannot ask about
  // anything but its factor. Distractors are words of the SAME text (the city's
  // other districts), so the question can only be answered from what the book says.
  function factorCard(factors, districts, gateIndex, p, seedStr) {
    const f = factors && factors[gateIndex];
    if (!f || !f.cloze || !f.answer) return null;
    const line = f.cloze, answer = f.answer;
    const pool = [];
    for (const o of (districts || [])) {
      if (!o || !o.answer) continue;
      const w = o.answer;
      if (w.length < 4 || w.length > 18) continue;
      if (Math.abs(w.length - answer.length) > 3) continue;      // no size tells
      const wl = w.toLowerCase(), al = answer.toLowerCase();
      if (wl === al) continue;
      if (wl.indexOf(al) >= 0 || al.indexOf(wl) >= 0) continue;  // a form of the answer is not a distractor
      pool.push(w);
    }
    const seen = new Set([answer.toLowerCase()]);
    const uniq = pool.filter((w) => { const l = w.toLowerCase(); if (seen.has(l)) return false; seen.add(l); return true; });
    const seed = String(seedStr || '') + '|f' + gateIndex + '|p' + p;
    const opts = [answer];
    for (let i = 0; i < 2 && uniq.length; i++) {
      const idx = hash32(seed + '#' + i) % uniq.length;
      opts.push(uniq.splice(idx, 1)[0]);
    }
    const order = opts.map((w, i) => ({ w, k: hash32(seed + '@' + i) })).sort((a, b) => (a.k - b.k) || 0).map((x) => x.w);
    return {
      p, i: gateIndex, key: f.key, en: f.en, pali: f.pali, act: f.act,
      cloze: line, answer, options: order,
      heading: f.en + ' — the text’s own account',
      locator: f.quoteLocator || f.locator || '',
      quoted: 'factor',
    };
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
  // Gate 1 (right view) is not a question. It stands at the threshold of a
  // district and refuses the step until that district has been SEEN WHOLE: a
  // sustained hold lifts the view from the walked window to the whole field
  // until the district's own shape is legible. Only then is its line spoken.
  const SEEN_AT = 0.9;                                    // the hold is satisfied here
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

  // ── FPV: standing in the city, looking north ──────────────────────────────
  // The ENTERED distance draws the city plan: a window of cells, seen from
  // above. FPV draws the same field from inside it — one camera on the walker's
  // own cell, eye at `eye` cell-heights above the ground, looking north (up the
  // text's own reading order). The projection is the closed form of a ground
  // plane, so there is no loop to converge and nothing to tune per frame:
  //
  //   depth z cells ahead  ->  y = horizon + f * eye / z,  one cell wide = f / z
  //   lateral u cells      ->  x = w/2 + f * u / z
  //
  // Three laws fall out and the selftest asserts each: a cell's width falls
  // monotonically with depth (the rows recede toward the horizon), the horizon
  // is a fraction of the view (stable across resizes) and does not move with the
  // eye, and a straight street projects to a straight line that converges.
  // No clock, no random, no DOM: same field + same camera -> same pixels.
  const FPV = {
    // Eye height is the one number that decides how much city you see: the
    // nearest visible row sits at depth f*eye/(h-horizon), so a higher eye stands
    // you further back and buys legible rows (eye 1.2 -> ~10 rows over 3px, eye
    // 2.4 -> ~15). It is a real quantity (rooms tall), not a zoom.
    eye: 1.20,
    eyeHigh: 2.40,        // a sustained hold raises the eye line to here
    eyeLow: 0.50,         // and can lower it to here
    focal: 0.92,          // focal length as a fraction of view width
    horizon: 0.32,        // the city's far edge, as a fraction of view height
    maxDepth: 34,         // the whole 32-row field plus two cells of margin
  };
  function fpvLayout(w, h, eye) {
    const e = eye == null ? FPV.eye : Number(eye);
    return {
      w: Math.max(1, Number(w) || 1), h: Math.max(1, Number(h) || 1),
      f: Math.max(1, Number(w) || 1) * FPV.focal,
      horizon: Math.max(1, Number(h) || 1) * FPV.horizon,
      eye: Math.max(FPV.eyeLow, Math.min(FPV.eyeHigh, Number.isFinite(e) ? e : FPV.eye)),
    };
  }
  // depth (cells ahead of the eye) -> the screen row it lands on and the width
  // of one cell there. Both are strictly monotone in depth: that is the law.
  function fpvRow(lay, depth) {
    const d = Math.max(0.05, Number(depth) || 0.05);
    return { y: lay.horizon + lay.f * lay.eye / d, w: lay.f / d, depth: d };
  }
  // a ground point (grid coordinates, cell edges) -> screen, or null if behind
  function fpvPoint(lay, camX, camY, gx, gy) {
    const d = camY - gy;
    if (!(d > 0.05)) return null;
    const r = fpvRow(lay, d);
    return { x: lay.w / 2 + lay.f * (gx - camX) / d, y: r.y, w: r.w, depth: d };
  }
  // one cell as a ground quad: four corners, so the cell is a trapezoid whose
  // far edge is narrower than its near edge (a perspective floor, not a squash)
  function fpvQuad(lay, camX, camY, cx, cy) {
    const near = camY - (cy + 1), far = camY - cy;
    if (!(near > 0.05) || !(far > near)) return null;
    const x = (u, d) => lay.w / 2 + lay.f * u / d;
    const u0 = cx - camX, u1 = cx + 1 - camX;
    const yN = lay.horizon + lay.f * lay.eye / near;   // near edge (lower on screen)
    const yF = lay.horizon + lay.f * lay.eye / far;    // far edge (closer to the horizon)
    const xNL = x(u0, near), xNR = x(u1, near), xFL = x(u0, far), xFR = x(u1, far);
    return {
      near, far, yN, yF, xNL, xNR, xFL, xFR,
      cx: x((u0 + u1) / 2, (near + far) / 2), cy: (yN + yF) / 2,
      w: Math.abs(xNR - xNL), wFar: Math.abs(xFR - xFL), scale: lay.f / far,
    };
  }

  // ── the reading head: where "now" sits in a district's text order ─────────
  // A district is a contiguous run of cells [n0, n1] in reading order (the order
  // the matter was projected into the grid: left to right, row after row). So a
  // cell's ordinal in its district is measured, never assigned — the ring the
  // ladder draws at the walker is this number, and its seam is the point where
  // the reading stands now.
  function readingHead(field, n) {
    if (!field || !field.cells || !(n >= 0) || !field.cells[n]) return null;
    const c = field.cells[n], p = c.unit.p, d = field.districts && field.districts[p];
    if (!d) return null;
    const of = d.n1 - d.n0 + 1, i = n - d.n0 + 1;
    return { p, n, i, of, t: of > 0 ? i / of : 0, n0: d.n0, n1: d.n1, cx: c.cx, cy: c.cy };
  }

  // ── the wall's face ───────────────────────────────────────────────────────
  // A wall is made of the painting's own strong edges. Its FACE is the side that
  // meets something you could walk on; an interior wall has no face and needs no
  // mark, a wall on the city's rim has one. Drawing the faces is therefore
  // drawing the walkable boundary itself — what you see is what you can walk.
  const SIDES = [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]];
  function wallFaces(field, n) {
    const c = field && field.cells && field.cells[n];
    if (!c || !c.wall) return null;
    const out = {};
    for (const [k, dx, dy] of SIDES) {
      const x = c.cx + dx, y = c.cy + dy;
      const rim = x < 0 || y < 0 || x >= COLS || y >= ROWS;
      out[k] = rim ? true : !field.cells[y * COLS + x].wall;
    }
    return out;
  }
  // which steps out of this cell the city would accept (the refusal line names
  // them, so a boundary is never just "no")
  function openSides(field, pos, passable) {
    if (!field || !pos) return [];
    const ok = typeof passable === 'function' ? passable : () => true;
    const out = [];
    for (const [k, dx, dy] of SIDES) {
      const x = pos.cx + dx, y = pos.cy + dy;
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
      const c = field.cells[y * COLS + x];
      if (!c.wall && ok(c)) out.push(k);
    }
    return out;
  }

  // ── 0.6.0 · the wave: text as time ────────────────────────────────────────
  // Pure and total, no clock. The score is the sentence's own clause marks and
  // its own density; the same line plus the same pace gives the same score in
  // any process. A ride spends no breath.
  const WAVE_BASE = 320, WAVE_MIN = 260, WAVE_MAX = 420;
  const WAVE_CPW = 5.51, WAVE_CLOSE = 900, WAVE_LOOK = 3, WAVE_REWIND = 700;
  function waveOf(line) {
    const text = String(line == null ? '' : line).replace(/\s+/g, ' ').trim();
    if (!text) throw new Error('wave: empty line');
    const toks = text.split(' ');
    const n = toks.length;
    const chars = toks.reduce((a, t) => a + t.length, 0);
    const cpw = chars / n;
    const beat = Math.round(Math.min(WAVE_MAX, Math.max(WAVE_MIN,
      WAVE_BASE * Math.min(1.4, Math.max(0.8, cpw / WAVE_CPW)))));
    const marks = [];
    toks.forEach((t, i) => { if (/[,;:—–]$/.test(t)) marks.push(i); });
    const wordLens = toks.map((t) => t.length);
    const cum = []; let acc = 0;
    for (const len of wordLens) { cum.push(acc); acc += len; }
    const last = marks.length ? marks[marks.length - 1] : -1;
    // the final clause, but never earlier than three words before the end
    const from = Math.max(marks.length ? (last + 1) / n : 1, (n - WAVE_LOOK) / n);
    const crestAt = marks.map((i) => (i + 1) / n).concat([1]);
    // the rail is the sentence: a mark sits under the character that makes it,
    // and the window starts at the first character of its first word. Word
    // fractions stay above for time; these are the drawn positions.
    const tickChars = marks.map((i) => (cum[i] + wordLens[i]) / chars).concat([1]);
    const windowFrom = Math.min(1, from);
    const windowWord = Math.min(n - 1, Math.ceil(windowFrom * n));
    const windowCharFrom = cum[windowWord] / chars;
    return {
      line: text, words: n, chars, charsPerWord: +cpw.toFixed(2),
      beatMs: beat, endMs: n * beat, windowMs: WAVE_CLOSE,
      windowFrom, windowCharFrom, tickChars, cum, wordLens, crestAt, marks,
      digest: hash32('wave|' + text).toString(16).padStart(8, '0'),
    };
  }
  function rideNew() { return { t: 0, misses: 0, over: false, verdict: null }; }
  function rideAt(ride, plan, t) {
    const tt = Math.max(0, Number(t) || 0);
    const frac = plan.endMs > 0 ? Math.min(1, tt / plan.endMs) : 1;
    let phase = 'reading';
    if (tt >= plan.windowFrom * plan.endMs) phase = 'window';
    if (tt > plan.endMs + plan.windowMs) phase = 'after';
    const i = Math.min(plan.words - 1, Math.floor(frac * plan.words));
    const intra = Math.max(0, Math.min(1, frac * plan.words - i));
    const charFrac = plan.chars > 0 ? (plan.cum[i] + intra * plan.wordLens[i]) / plan.chars : 0;
    return { phase, t: tt, frac, charFrac, i };
  }
  function rideRelease(ride, plan, t) {
    const r = { t: ride.t, misses: ride.misses, over: ride.over, verdict: ride.verdict };
    if (r.over) return { ride: r, verdict: 'over', rewindToMs: null };
    const tt = Math.max(0, Number(t) || 0);
    if (tt < plan.windowFrom * plan.endMs) {
      const frac = Math.min(1, tt / plan.endMs);
      let start = 0;
      for (const c of plan.crestAt) { if (c <= frac) start = c; else break; }
      r.misses += 1; r.verdict = 'soft';
      if (r.misses >= 3) { r.over = true; r.verdict = 'lost'; }
      r.t = start * plan.endMs + WAVE_REWIND;
      return { ride: r, verdict: r.verdict, rewindToMs: r.t };
    }
    r.over = true;
    r.verdict = tt <= plan.endMs + plan.windowMs ? 'sharp' : 'blown';
    return { ride: r, verdict: r.verdict, rewindToMs: null };
  }
  function railOf(plan) {
    // the sentence drawn as time: clause ticks sit under their characters, and
    // the stretch where letting go is true starts at the first character of the
    // final clause. Pure, so the rail a proof sees is the rail the page draws.
    return { ticks: plan.tickChars.slice(), windowFrom: plan.windowCharFrom, end: 1,
      windowChars: Math.round((1 - plan.windowCharFrom) * plan.chars) };
  }
  function ridePace(plan, releaseMs) {
    const actual = (Number(releaseMs) || 0) / plan.words;
    const delta = Math.max(-40, Math.min(40, (actual - plan.beatMs) * 0.04));
    return Math.round(Math.min(WAVE_MAX, Math.max(WAVE_MIN, plan.beatMs + delta)));
  }

  function sealOf(district, all) {
    // A deterministic word-choice puzzle from the source projection itself:
    // the district's own cloze, its true answer, and two distractors drawn from
    // the other districts' answers. Same source -> same puzzle, no randomness.
    if (!district || !district.answer) return null;
    const pool = (all || [])
      .filter((x) => x && x.p !== district.p && x.answer && x.answer !== district.answer)
      .map((x) => x.answer);
    pool.sort((a, b) => (Math.abs(a.length - district.answer.length) - Math.abs(b.length - district.answer.length)) || a.localeCompare(b));
    const options = [district.answer];
    for (const w of pool) { if (options.length >= 3) break; if (!options.includes(w)) options.push(w); }
    while (options.length < 3) options.push('·');
    const shifted = options.slice(district.p % 3).concat(options.slice(0, district.p % 3));
    return { p: district.p, blank: district.cloze || district.line, answer: district.answer,
      options: shifted, correct: shifted.indexOf(district.answer), locator: district.locator || '' };
  }

  return Object.freeze({
    version: '0.10.0',
    COLS, ROWS, CELLS, SOURCE_PATH, SOURCE_SCHEMA, FINGERPRINT_PREFIX,
    PAINTING_ID, PAINTING_SHA256, DISTRICTS, GATES, LEDGER_GAP,
    CUT_LADDER, WEATHERS, SEEN_AT, BREATH_STEP, BREATH_FAIL, ACT_KINDS,
    hash32, tag8, lumOf, hueOf, districtOf, parseSource, splitSentences, firstSentence, projectCells, readDerived,
    sourceFingerprint, imageField, buildField,
    heaviestWeather, weatherOf, weatherFold, districtRuns, weatherChain, measureDistricts,
    gateKind, gateAdmits, riseMet, breathBudget, spendBreath, factorLine,
    floodFill, bfs, placeFactors, factorCard, emptyLedger, ledgerMark, ledgerRead, returnPrompt,
    routeString, routeSeed, step, walk, recompose, downscale64, mad64,
    waveOf, rideNew, rideAt, rideRelease, ridePace, railOf, WAVE_REWIND, sealOf,
    changedPx, syntheticPainting, PUNCT,
    FPV, fpvLayout, fpvRow, fpvPoint, fpvQuad, readingHead, wallFaces, openSides, SIDES,
  });
});
