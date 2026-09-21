export const VERSION = 'FOLD_BLOOM_LIVE_0.1';
export const N = 12;
export const TYPE_COUNT = 3;
export const TYPE_NAMES = ['EMBER', 'WATER', 'MOSS'];

export const DEFAULT_TYPES = Object.freeze([0,1,0,2,1,0,1,2,0,2,1,2]);

export const wrap = (n, m=N) => ((n % m) + m) % m;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizedEdge(a, b) {
  return a < b ? [a, b] : [b, a];
}

function edgeKey(a, b) {
  const [x, y] = normalizedEdge(a, b);
  return `${x}:${y}`;
}

function nextTarget(seed, current, avoid=null) {
  const rng = mulberry32(seed ^ ((current + 1) * 0x9e3779b9));
  let t = Math.floor(rng() * TYPE_COUNT);
  if (avoid !== null && t === avoid) t = (t + 1 + Math.floor(rng() * (TYPE_COUNT - 1))) % TYPE_COUNT;
  return t;
}

export function createState(seed=(Date.now() >>> 0) || 1) {
  return {
    schema: VERSION,
    seed: seed >>> 0,
    seq: 0,
    rotation: 0,
    mode: 'RATCHET',
    targetType: nextTarget(seed, 0),
    cells: DEFAULT_TYPES.map((type, i) => ({ id: i, type, tier: 1, hits: 0 })),
    anchors: [null, null, null],
    creases: [],
    charge: 0,
    blooms: 0,
    folds: 0,
    cascades: 0,
    bestChain: 1,
    flow: 0,
    motif: [],
    history: [],
    scene: 'DEEP',
  };
}

export function cloneState(s) {
  return {
    ...s,
    cells: s.cells.map(c => ({ ...c })),
    anchors: [...s.anchors],
    creases: s.creases.map(e => [...e]),
    motif: s.motif.map(m => ({ ...m })),
    history: s.history.map(h => ({ ...h, path: [...h.path], edgeAdded: h.edgeAdded ? [...h.edgeAdded] : null })),
  };
}

export function gateCellIndex(s) {
  return wrap(-s.rotation, N);
}

export function gateCell(s) {
  return s.cells[gateCellIndex(s)];
}

export function isAligned(s) {
  return gateCell(s).type === s.targetType;
}

export function setMode(s, mode) {
  const n = cloneState(s);
  n.mode = mode === 'FLOW' ? 'FLOW' : 'RATCHET';
  if (n.mode === 'FLOW') n.charge = Math.min(n.charge, 1);
  return n;
}

export function setScene(s, scene) {
  const n = cloneState(s);
  n.scene = scene;
  return n;
}

export function rotateSteps(s, delta) {
  if (!Number.isFinite(delta) || !delta) return cloneState(s);
  const n = cloneState(s);
  const steps = Math.trunc(delta);
  n.rotation = wrap(n.rotation + steps, N);
  n.seq += Math.abs(steps);
  if (n.mode === 'RATCHET') {
    // Charge has a useful knee: quick gestures matter, long cranks do not explode.
    n.charge = clamp(n.charge + Math.abs(steps) * 0.18, 0, 1.75);
  } else {
    n.charge = clamp(n.charge * 0.72 + Math.min(0.55, Math.abs(steps) * 0.08), 0, 0.8);
  }
  return n;
}

function graphNeighbors(s, idx, type) {
  const out = [];
  const l = wrap(idx - 1), r = wrap(idx + 1);
  if (s.cells[l].type === type) out.push(l);
  if (s.cells[r].type === type) out.push(r);
  for (const [a, b] of s.creases) {
    if (a === idx && s.cells[b].type === type) out.push(b);
    else if (b === idx && s.cells[a].type === type) out.push(a);
  }
  return [...new Set(out)];
}

export function cascadePath(s, start, type) {
  const q = [start], seen = new Set([start]), path = [];
  while (q.length && path.length < 9) {
    const idx = q.shift();
    path.push(idx);
    for (const n of graphNeighbors(s, idx, type)) {
      if (!seen.has(n)) {
        seen.add(n);
        q.push(n);
      }
    }
  }
  return path;
}

function topologyVerb({edgeAdded, pathLength, repeatedSlot}) {
  // Preserve what physically happened. Performance resolution is separate.
  if (edgeAdded) return 'FOLD';
  if (pathLength >= 3) return 'SPLIT';
  if (repeatedSlot) return 'RETURN';
  return 'BLOOM';
}

export function canRelease(s) {
  return isAligned(s);
}

export function release(s) {
  if (!canRelease(s)) return { state: cloneState(s), event: null };
  const n = cloneState(s);
  const slot = gateCellIndex(n);
  const type = n.targetType;
  const previous = n.anchors[type];
  const repeatedSlot = previous === slot;
  let edgeAdded = null;

  if (previous !== null && previous !== slot) {
    const key = edgeKey(previous, slot);
    if (!n.creases.some(([a,b]) => edgeKey(a,b) === key)) {
      edgeAdded = normalizedEdge(previous, slot);
      n.creases.push(edgeAdded);
      // Keep graph legible and bounded: newest six authored creases survive.
      if (n.creases.length > 6) n.creases.shift();
      n.folds += 1;
    }
  }
  n.anchors[type] = slot;

  const path = cascadePath(n, slot, type);
  const chain = path.length;
  for (const idx of path) {
    n.cells[idx].hits += 1;
    n.cells[idx].tier = clamp(1 + Math.floor(n.cells[idx].hits / 2), 1, 4);
  }
  if (chain > 1) n.cascades += 1;
  n.bestChain = Math.max(n.bestChain, chain);
  n.blooms += 1;

  const power = clamp(0.72 + n.charge * 0.92 + (chain - 1) * 0.2 + (edgeAdded ? 0.25 : 0), 0.72, 3.2);
  const verb = topologyVerb({ edgeAdded, pathLength: chain, repeatedSlot });
  const cadence = n.charge >= 1.25 && verb !== 'RETURN' ? 'RETURN' : null;
  const span = edgeAdded ? Math.min(wrap(edgeAdded[1] - edgeAdded[0]), wrap(edgeAdded[0] - edgeAdded[1])) : 0;
  const degree = (slot + type * 2 + chain - 1) % 7;
  const event = {
    id: n.seq + 1,
    kind: 'RELEASE',
    verb,
    cadence,
    operations: [verb, ...(cadence ? [cadence] : [])],
    slot,
    type,
    typeName: TYPE_NAMES[type],
    path,
    chain,
    charge: Number(n.charge.toFixed(3)),
    power: Number(power.toFixed(3)),
    edgeAdded,
    span,
    degree,
    scene: n.scene,
  };

  n.seq += 1;
  n.flow += Math.round(10 * power * chain);
  n.motif.push({ degree, type, verb, chain, power: event.power, slot });
  n.motif = n.motif.slice(-8);
  n.history.push(event);
  n.history = n.history.slice(-48);
  n.charge = n.mode === 'RATCHET' ? 0.08 : 0;
  n.targetType = nextTarget(n.seed ^ n.seq ^ (slot << 8), n.seq, type);

  return { state: n, event };
}

export function snapshot(s) {
  return {
    schema: VERSION,
    seed: s.seed,
    seq: s.seq,
    rotation: s.rotation,
    mode: s.mode,
    targetType: s.targetType,
    cells: s.cells,
    anchors: s.anchors,
    creases: s.creases,
    charge: s.charge,
    blooms: s.blooms,
    folds: s.folds,
    cascades: s.cascades,
    bestChain: s.bestChain,
    flow: s.flow,
    motif: s.motif,
    history: s.history.slice(-24),
    scene: s.scene,
  };
}

export function restore(x) {
  if (!x || x.schema !== VERSION || !Array.isArray(x.cells) || x.cells.length !== N) return null;
  const s = createState(x.seed >>> 0);
  Object.assign(s, x);
  s.cells = x.cells.map(c => ({ ...c }));
  s.anchors = Array.isArray(x.anchors) ? [...x.anchors].slice(0, TYPE_COUNT) : [null,null,null];
  s.creases = Array.isArray(x.creases) ? x.creases.slice(-6).map(e => [wrap(e[0]), wrap(e[1])]) : [];
  s.motif = Array.isArray(x.motif) ? x.motif.slice(-8).map(m => ({ ...m })) : [];
  s.history = Array.isArray(x.history) ? x.history.slice(-48).map(h => ({ ...h, path: Array.isArray(h.path) ? [...h.path] : [] })) : [];
  s.rotation = wrap(Number(s.rotation) || 0);
  s.targetType = clamp(Math.trunc(s.targetType) || 0, 0, TYPE_COUNT - 1);
  s.charge = clamp(Number(s.charge) || 0, 0, 1.75);
  s.mode = s.mode === 'FLOW' ? 'FLOW' : 'RATCHET';
  return s;
}
