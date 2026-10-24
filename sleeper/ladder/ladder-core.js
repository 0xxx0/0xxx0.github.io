// ladder-core.js — SLEEPER // LADDER, the four-distance resolution ladder core.
//
// One object at four resolutions: the painting (FAR) and its glyph city (NEAR /
// ENTERED) are the same field; the walked route recomposes the painting (EXITED)
// and returning reconstructs it exactly. Spec: recovery/sleeper/DESIGN_SPEC.md
// ("Make painting and city the same object at different resolutions") and the
// ONE RETURN contract in void-anchor/sleeper/README.md.
//
// Determinism law: no Math.random, no Date, no ambient time anywhere in this
// file. Painting identity = hash32(sha256 of the painting bytes); route seed =
// hash32(painting tag + the compressed U/D/L/R witness). One hash, one object.
// The hash ORIENTS (sign, dash phase, tone sign) inside a band measured from the
// painting itself; it never INVENTS a coordinate (DESIGN-INTENT "measured, not
// seeded"). A cell nobody walked is never touched — an empty route recomposes to
// the original bytes.
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
  const SOURCE_PATH = '/recovery/sleeper/site-source-2026-09-18/docs/ONE_RETURN_V2.md';
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
  // is never the sole carrier; the district index rides in the decode overlay).
  const DISTRICTS = 9;
  function districtOf(hue, sat) {
    if (hue < 0 || sat < 0.12) return 8;
    return clamp(Math.floor(hue / 45), 0, 7);
  }

  // ── parseSource — the city's matter is the canonical contract itself ───────
  // paragraph = district, sentence = building, word = room, character =
  // material, punctuation = rain / window / lamp (DESIGN_SPEC mapping).
  const PUNCT = { '.': 'window', ',': 'rain', ';': 'lamp', ':': 'lamp', '?': 'beacon', '!': 'beacon' };
  function parseSource(text) {
    const blocks = String(text).replace(/\r/g, '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    const units = [];
    const sentences = [];
    const counts = { paragraphs: 0, sentences: 0, words: 0, chars: 0 };
    blocks.forEach((block, p) => {
      counts.paragraphs++;
      const split = block.split(/(?<=[.!?})`])\s+/).filter((s) => s.trim());
      split.forEach((sentence, s) => {
        const si = counts.sentences;
        sentences.push({ text: sentence, p, s, si });
        counts.sentences++;
        const words = sentence.split(/\s+/).filter(Boolean);
        words.forEach((word, w) => {
          counts.words++;
          // leading / trailing punctuation becomes its own weather unit
          const lead = word.match(/^[^\w]+/), trail = word.match(/[^\w]+$/);
          const core = word.slice(lead ? lead[0].length : 0, trail ? word.length - trail[0].length : word.length);
          if (lead) for (const ch of lead[0]) { units.push({ ch, p, s, si, w, room: word, punct: PUNCT[ch] || null }); counts.chars++; }
          for (const ch of core) { units.push({ ch, p, s, si, w, room: word, punct: null }); counts.chars++; }
          if (trail) for (const ch of trail[0]) { units.push({ ch, p, s, si, w, room: word, punct: PUNCT[ch] || null }); counts.chars++; }
        });
      });
    });
    return { blocks, sentences, units, counts };
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
  // Cell n takes the n-th evenly-sampled unit of the source, so the WHOLE
  // contract is spread across the city in reading order: position on the grid
  // is a coordinate into the source (P5/P8 — position = meaning).
  //
  // Walls are the painting's strongest edges, but the cut is not guessed: the
  // ladder tries a deterministic ladder of quantiles and keeps the one that
  // OPENS THE LARGEST WALKABLE DISTRICT — a wall map that walls the player into
  // a closet is a picture of a city, not a city.
  const CUT_LADDER = [0.62, 0.70, 0.78, 0.86, 0.92];
  function buildField(rgba, w, h, text) {
    const parsed = parseSource(text);
    const cells = imageField(rgba, w, h);
    const edges = cells.map((c) => c.edge).sort((a, b) => a - b);
    const decorate = (cut) => {
      let walls = 0;
      for (let i = 0; i < CELLS; i++) {
        const c = cells[i];
        const unit = parsed.units[Math.floor(i * parsed.units.length / CELLS)] || { ch: ' ', p: 0, s: 0, w: 0, room: '', punct: null };
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
      source: { path: SOURCE_PATH, counts: parsed.counts, units: parsed.units.length },
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
    version: '0.1.0',
    COLS, ROWS, CELLS, SOURCE_PATH, PAINTING_ID, PAINTING_SHA256, DISTRICTS,
    CUT_LADDER,
    hash32, tag8, lumOf, hueOf, districtOf, parseSource, imageField, buildField,
    floodFill, routeString, routeSeed, step, walk, recompose, downscale64, mad64,
    changedPx, syntheticPainting, PUNCT,
  });
});
