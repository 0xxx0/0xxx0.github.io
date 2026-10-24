// hilbert-core.mjs — append-only Hilbert-curve spatial layout microlib for the field instrument.
//
// ABSOLUTE LAW #1 — POSITION PRESERVATION: nothing may ever move under the user; one RETURN
//   always restores exactly where you were. This module makes the law STRUCTURAL: objects own
//   Hilbert-curve cells and their {x,y,w,h} is frozen forever. Adds take only FREE cells in
//   curve order; deletes leave TOMBSTONE gaps (reserved forever, never compacted); the grid
//   order n is frozen for the life of a layout.
//
// Properties: pure functions (no DOM), deterministic (no source of randomness in this file),
//   zero dependencies, no build step. Curve: standard iterative xy2d/d2xy (Bourke/Wikipedia
//   form). Errors are Errors prefixed 'hilbert-core: '.
//
// Item shape returned by layout()/append():
//   { key, d, x, y, w, h, cells, dead, n }
//     d     — first curve index of the block's contiguous run of cells
//     x,y   — bounding-box origin of the run's cells (for cells===1 this IS the cell)
//     w,h   — bounding-box size (for cells===1: w===h===1, exact cell, no overlap ever)
//     cells — reserved cell count (run length along the curve; 1 in simple mode)
//     dead  — tombstone flag; cells stay RESERVED and the position is kept exactly
//     n     — grid order the geometry was computed under (frozen; makes append self-describing)
//   The contract fields {key,d,x,y,w,h} plus cells/dead/n, which are what make the invariant
//   recoverable from the item stream alone.

export const DEFAULT_N = 6; // default grid order: 64x64 = 4096 cells
export const MAX_ORDER = 15; // orders are bit-safe to 15 (grid 32768^2, 4^15 cells)

const PREFIX = 'hilbert-core: ';

function fail(message) {
  throw new Error(PREFIX + message);
}

function checkOrder(n) {
  if (!Number.isInteger(n) || n < 0 || n > MAX_ORDER) {
    fail(`grid order n must be an integer in [0, ${MAX_ORDER}] (got ${String(n)})`);
  }
  return n;
}

// ------------------------------------------------------------------ curve ----

// Standard iterative d -> (x, y): walk the index bits low to high, rotating each quadrant.
export function hilbertXY(n, d) {
  checkOrder(n);
  if (!Number.isInteger(d) || d < 0 || d >= 4 ** n) {
    fail(`hilbertXY: d=${String(d)} outside [0, ${4 ** n}) for order ${n}`);
  }
  const side = 1 << n;
  let t = d;
  let x = 0;
  let y = 0;
  for (let s = 1; s < side; s *= 2) {
    const rx = 1 & (t >>> 1);
    const ry = 1 & (t ^ rx);
    if (ry === 0) {
      if (rx === 1) {
        x = s - 1 - x;
        y = s - 1 - y;
      }
      const swap = x;
      x = y;
      y = swap;
    }
    x += s * rx;
    y += s * ry;
    t = t >>> 2;
  }
  return [x, y];
}

// Standard iterative (x, y) -> d: walk the coordinate bits high to low.
export function hilbertD(n, x, y) {
  checkOrder(n);
  const side = 1 << n;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= side || y >= side) {
    fail(`hilbertD: (${String(x)}, ${String(y)}) outside grid [0, ${side}) for order ${n}`);
  }
  let d = 0;
  let px = x;
  let py = y;
  for (let s = side / 2; s >= 1; s /= 2) {
    const rx = (px & s) > 0 ? 1 : 0;
    const ry = (py & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) {
      if (rx === 1) {
        px = s - 1 - px;
        py = s - 1 - py;
      }
      const swap = px;
      px = py;
      py = swap;
    }
  }
  return d;
}

// -------------------------------------------------------------- allocator ----

// Sorted, disjoint reserved intervals [start, end); overlapping reservations are refused.
function intervalsOf(items) {
  const intervals = items.map((item) => [item.d, item.d + item.cells]);
  intervals.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < intervals.length; i += 1) {
    if (intervals[i][0] < intervals[i - 1][1]) {
      fail(`reserved cells overlap: [${intervals[i - 1][0]}, ${intervals[i - 1][1]}) and [${intervals[i][0]}, ${intervals[i][1]})`);
    }
  }
  return intervals;
}

// First position >= from holding `length` consecutive free cells; -1 if none exist.
function allocBlock(runs, from, length, capacity) {
  let pos = from;
  for (const [start, end] of runs) {
    if (end <= pos) continue;
    if (start - pos >= length) break; // fits in the gap opening at pos
    pos = end; // occupied here; jump past the reserved block
  }
  return pos + length <= capacity ? pos : -1;
}

// ---------------------------------------------------------------- geometry ----

function makeItem(key, d, n, cells, dead) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let c = d; c < d + cells; c += 1) {
    const [x, y] = hilbertXY(n, c);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return {
    key,
    d,
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
    cells,
    dead: Boolean(dead),
    n,
  };
}

// --------------------------------------------------------------- structure ----

function weightToCells(weight) {
  if (weight === undefined || weight === null) return 1;
  if (typeof weight !== 'number' || !Number.isFinite(weight) || weight <= 0) {
    fail(`weight must be a finite number > 0 (got ${String(weight)})`);
  }
  return Math.max(1, Math.round(weight)); // whole cells, half-up, minimum 1
}

function normalizeEntries(input, label) {
  if (!Array.isArray(input)) fail(`${label} must be an array`);
  return input.map((entry) => {
    if (typeof entry === 'string') return { key: entry, weight: 1 }; // tolerate bare keys
    if (typeof entry === 'object' && entry !== null && typeof entry.key === 'string' && entry.key !== '') {
      return { key: entry.key, weight: entry.weight };
    }
    return fail(`${label}: every entry must be a key string or {key, weight}`);
  });
}

// Structural checks: identity and types before anything derived.
function checkItems(items) {
  if (!Array.isArray(items)) fail('items must be an array of {key,d,x,y,w,h,cells,dead,n}');
  const keys = new Set();
  let order = null;
  for (const item of items) {
    if (typeof item !== 'object' || item === null) fail('every item must be an object');
    if (typeof item.key !== 'string' || item.key === '') fail('every item needs a non-empty string key');
    if (keys.has(item.key)) fail(`duplicate key '${item.key}'`);
    keys.add(item.key);
    checkOrder(item.n);
    if (order === null) order = item.n;
    else if (item.n !== order) fail(`mixed grid orders ${order} and ${item.n} in one layout`);
    for (const field of ['d', 'x', 'y', 'w', 'h', 'cells']) {
      if (!Number.isInteger(item[field])) fail(`item '${item.key}': ${field} must be an integer (got ${String(item[field])})`);
    }
    if (item.d < 0) fail(`item '${item.key}': d must be >= 0`);
    if (item.cells < 1) fail(`item '${item.key}': cells must be >= 1`);
    if (item.x < 0 || item.y < 0 || item.w < 1 || item.h < 1) fail(`item '${item.key}': bad geometry bounds`);
  }
  return order; // grid order of the stream, or null when empty
}

// Does every stored {x,y,w,h} equal the bounding box of its cell run on order n?
// This is what makes append refuse ANY input that could let a position move.
function matchesGeometry(items, n) {
  const capacity = 4 ** n;
  for (const item of items) {
    if (item.d < 0 || item.d + item.cells > capacity) return false;
    const fresh = makeItem(item.key, item.d, n, item.cells, item.dead);
    if (fresh.x !== item.x || fresh.y !== item.y || fresh.w !== item.w || fresh.h !== item.h) return false;
  }
  return true;
}

function inferN(items, requested) {
  if (requested !== undefined && requested !== null) {
    checkOrder(requested);
    if (items.length > 0 && items[0].n !== requested) {
      fail(`opts.n=${requested} disagrees with the layout's frozen grid order ${items[0].n} — appending under another order would move positions (law #1)`);
    }
    return requested;
  }
  return items.length > 0 ? items[0].n : DEFAULT_N; // checkItems enforced uniformity
}

// Public validator: identity/types, disjoint reservations, capacity, and exact curve geometry.
// append() runs it on every call — the invariant core with teeth.
export function verifyLayout(items, opts) {
  const structural = checkItems(items);
  const n = inferN(items, opts && opts.n);
  if (structural !== null && structural !== n) {
    fail(`opts.n=${n} disagrees with the layout's frozen grid order ${structural}`);
  }
  const capacity = 4 ** n;
  for (const item of items) {
    if (item.d + item.cells > capacity) {
      fail(`item '${item.key}' at d=${item.d}+${item.cells} exceeds grid capacity ${capacity} (order ${n})`);
    }
  }
  intervalsOf(items); // throws on overlapping reservations
  if (!matchesGeometry(items, n)) {
    fail(`stored geometry does not match curve order ${n} — appending here would move positions (law #1)`);
  }
  return true;
}

// ----------------------------------------------------------------- layout ----

// Layout an ordered list of {key, weight} onto a fresh grid: block i owns the cells
// [sum of prior lengths, + its own length) along the curve. weight 1 -> 1 cell (simple
// mode); heavier keys own longer contiguous runs (weighted treemap-style). opts.n
// freezes the grid order (default DEFAULT_N -> 4096 cells).
export function layout(assignments, opts) {
  const entries = normalizeEntries(assignments, 'assignments');
  const n = inferN([], opts && opts.n);
  const capacity = 4 ** n;
  const items = [];
  let pos = 0; // fresh grid: free cells are the whole curve, so blocks land back-to-back
  for (const entry of entries) {
    if (items.some((item) => item.key === entry.key)) fail(`duplicate key '${entry.key}'`);
    const length = weightToCells(entry.weight);
    if (pos + length > capacity) {
      fail(`grid full: order ${n} holds ${capacity} cells; '${entry.key}' needs ${length} more`);
    }
    items.push(makeItem(entry.key, pos, n, length, false));
    pos += length;
  }
  verifyLayout(items, { n });
  return items;
}

// THE INVARIANT CORE: add newKeys (key strings or {key,weight}) taking only FREE cells,
// searching from BEYOND every existing reservation — including tombstones. Every
// previously placed key keeps an IDENTICAL {x,y,w,h}; verifyLayout() proves it before
// a single cell is handed out.
export function append(existing, newKeys, opts) {
  checkItems(existing);
  const n = inferN(existing, opts && opts.n);
  verifyLayout(existing, opts);
  const capacity = 4 ** n;
  const runs = intervalsOf(existing);
  let frontier = runs.length > 0 ? runs[runs.length - 1][1] : 0; // never below any reservation
  const placed = new Set(existing.map((item) => item.key));
  const additions = [];
  for (const entry of normalizeEntries(newKeys, 'newKeys')) {
    if (placed.has(entry.key)) fail(`append: key '${entry.key}' is already placed — append is append-only`);
    placed.add(entry.key);
    const length = weightToCells(entry.weight);
    const d = allocBlock(runs, frontier, length, capacity);
    if (d < 0) fail(`grid full: order ${n} holds ${capacity} cells; '${entry.key}' needs ${length}`);
    frontier = d + length; // allocation is monotone along the curve
    additions.push(makeItem(entry.key, d, n, length, false));
  }
  return existing.concat(additions);
}

// ----------------------------------------------------------------- delete ----

function tombstoneItems(items, key) {
  checkItems(items);
  let found = false;
  const out = items.map((item) => {
    if (item.key !== key) return item; // untouched items keep their exact object identity
    found = true;
    return item.dead ? item : { ...item, dead: true }; // position, d, cells, n all preserved
  });
  if (!found) fail(`tombstone: key '${key}' is not placed`);
  return out;
}

// Tombstone: dead-but-kept. The cell stays RESERVED forever (append never reuses it) and
// the item keeps its exact position — a renderer draws dead===true items as gap marks.
// tombstone(items, key) applies; tombstone(key) returns the same transform curried.
export function tombstone(existing, key) {
  if (key === undefined) {
    if (typeof existing !== 'string' || existing === '') fail('tombstone(key): key must be a non-empty string');
    const target = existing;
    return (items) => tombstoneItems(items, target);
  }
  return tombstoneItems(existing, key);
}

// --------------------------------------------------------------- signature ----

function fnv1a32(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

// Geometry hash for regression pins: canonical (sorted by d, then key), covers every
// field a renderer can see, so a tombstone flip or any reflow changes the signature.
export function layoutSignature(items) {
  checkItems(items);
  const canonical = items
    .slice()
    .sort((a, b) => a.d - b.d || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((item) => `${item.key}|${item.n}|${item.d}|${item.x}|${item.y}|${item.w}|${item.h}|${item.cells}|${item.dead ? 1 : 0}`)
    .join('\n');
  return `fnv1a:${fnv1a32(canonical).toString(16).padStart(8, '0')}`;
}
