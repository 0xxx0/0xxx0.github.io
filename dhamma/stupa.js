/* stupa.js — the text as Borobudur.
 *
 * A terminal-grid plan of nine terraces (six square, three round) with the dome
 * at the centre. The chapter's sections are assigned to terraces by their own
 * word counts, and the walker's angle on a terrace is the fraction of that
 * terrace already read. Reading order is circumambulation, clockwise from north,
 * ascending one terrace per section group. Nothing is decorative: terrace ← section
 * index, ring size ← terrace index, angle ← words read, dome ← the end.
 */

const INK = a => 'rgba(231,227,234,' + a.toFixed(3) + ')';
const MAG = a => 'rgba(224,106,156,' + a.toFixed(3) + ')';

export function planGrid(W, H) {
  const cw = 10, ch = 10;                      // square cells: a plan, not a chart
  const cols = Math.max(20, Math.floor((W - 8) / cw));
  const rows = Math.min(cols, Math.max(12, Math.floor((H * 0.34) / ch)));
  return { cw, ch, cols, rows, ox: (W - cols * cw) / 2, oy: 34 };
}

/* terrace assignment: sections -> nine rings, by word count, keeping order */
export function terraces(edges, totalWords) {
  const T = 9;
  const out = Array.from({ length: T }, () => []);
  if (!edges.length) return out;
  const per = totalWords / T;
  let t = 0;
  for (let i = 0; i < edges.length; i++) {
    const start = edges[i].start;
    // a section belongs to the terrace its midpoint falls in, monotone in reading order
    const want = Math.min(T - 1, Math.floor((start / Math.max(1, totalWords)) * T));
    t = Math.max(t, want);
    out[t].push(i);
  }
  // never leave a terrace empty if sections remain: fill forward
  for (let i = 0; i < T; i++) if (!out[i].length) {
    const donor = out.findIndex(a => a.length > 1);
    if (donor >= 0) out[i].push(out[donor].pop());
  }
  return out;
}

export function planCells(ctx, S, W, H, t, alpha) {
  const g = planGrid(W, H);
  const { cw, ch, cols, rows, ox, oy } = g;
  const cx = Math.floor(cols / 2), cy = Math.floor(rows / 2);
  const edges = S.edges || [];
  const total = Math.max(1, (S.tokens || []).length);
  const terr = terraces(edges, total);

  const cells = [];
  const put = (c, r, glyph, a, hue) => {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return;
    cells.push({ c, r, g: glyph, a, hue: !!hue });
  };

  // six square terraces, drawn as walls with corners (a plan, not a ruler)
  const R0 = Math.min(cx, cy) - 1;
  const half = [R0, R0 - 1, R0 - 2, R0 - 3, R0 - 4, R0 - 5];
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < half.length; i++) {
    const h = half[i]; if (h < 2) continue;
    const a = (0.24 + 0.035 * (half.length - i)) * alpha;
    for (let c = cx - h + 1; c <= cx + h - 1; c++) {
      put(c, cy - h, '─', a); put(c, cy + h, '─', a);
    }
    for (let r = cy - h + 1; r <= cy + h - 1; r++) {
      put(cx - h, r, '│', a); put(cx + h, r, '│', a);
    }
    put(cx - h, cy - h, '┌', a * 1.2); put(cx + h, cy - h, '┐', a * 1.2);
    put(cx - h, cy + h, '└', a * 1.2); put(cx + h, cy + h, '┘', a * 1.2);
    // the four ascents, one per terrace
    put(cx, cy - h, '╵', a * 2); put(cx, cy + h, '╷', a * 2);
    put(cx - h, cy, '╴', a * 2); put(cx + h, cy, '╶', a * 2);
  }

  // three round terraces: true rings, tested per cell so they read as circles
  const ringR = [R0 * 0.56, R0 * 0.42, R0 * 0.28];
  for (let i = 0; i < ringR.length; i++) {
    const R = ringR[i], a = (0.52 + 0.06 * i) * alpha;
    for (let dy = -Math.ceil(R) - 1; dy <= Math.ceil(R) + 1; dy++) {
      for (let dx = -Math.ceil(R) - 1; dx <= Math.ceil(R) + 1; dx++) {
        if (Math.abs(Math.hypot(dx, dy) - R) < 0.52) put(cx + dx, cy + dy, '·', a);
      }
    }
  }
  // the dome: a small ring and the bud
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
    if (Math.abs(dx) + Math.abs(dy) === 1) put(cx + dx, cy + dy, '·', 0.85 * alpha);
  for (let k = 0; k < 16; k++) {
    const th = (k / 16) * Math.PI * 2;
    put(Math.round(cx + Math.sin(th) * 2), Math.round(cy - Math.cos(th) * 2), '·', 0.70 * alpha);
  }
  put(cx, cy, '◉', 1.0 * alpha);
  put(cx, cy - 3, '╵', 0.55 * alpha); put(cx, cy - 4, '│', 0.45 * alpha); put(cx, cy - 5, '·', 0.35 * alpha);

  // which terrace the reader is on, and how far round it
  const live = Math.max(0, edges.filter(e => e.start <= S.pos).length - 1);
  const ti = terr.findIndex(arr => arr.includes(live));
  const T = terr.length;
  let angle = 0;
  if (ti >= 0 && terr[ti].length) {
    const first = terr[ti][0], last = terr[ti][terr[ti].length - 1];
    const a0 = edges[first] ? edges[first].start : 0;
    const a1 = edges[last] ? edges[last].start : total;
    angle = Math.max(0, Math.min(1, (S.pos - a0) / Math.max(1, a1 - a0)));
  }
  const ring = ti < 6 ? half[Math.min(5, ti)] : Math.round(round[Math.min(2, Math.max(0, ti - 6))] * (ti - 6 === 0 ? 1.55 : 1));
  // walker: clockwise from north on its terrace
  const th = angle * Math.PI * 2;
  const wx = cx + Math.round(Math.sin(th) * (ti < 6 ? ring : ring * 1.4));
  const wy = cy - Math.round(Math.cos(th) * (ti < 6 ? ring - 1 : ring * (0.85 - 0.1 * (ti - 6))));
  // trail behind the walker on this terrace, one dot per section already passed
  for (let k = 1; k <= 10; k++) {
    const a2 = (angle - k * 0.030) * Math.PI * 2;
    if (a2 < 0) break;
    const tx = cx + Math.round(Math.sin(a2) * (ti < 6 ? ring : ring * 1.4));
    const ty = cy - Math.round(Math.cos(a2) * (ti < 6 ? ring - 1 : ring * 0.85));
    put(tx, ty, '·', Math.max(0.06, 0.42 - k * 0.035) * alpha);
  }
  put(wx, wy, '▽', 1, true);

  return cells;
}

/* the reading surface: the sentence you are inside, at reading size, with the
   current word lit. This is the page — the plan above is only its map. */
export function drawText(ctx, S, W, H, t, alpha) {
  const g = planGrid(W, H);
  const top = g.oy + g.rows * g.ch + 26;
  const fs = 15, lh = 26, cw = fs * 0.60;
  const maxw = Math.floor((W - 36) / cw);
  const words = S.tokens || [];
  if (!words.length) return;

  // the paragraph this position belongs to, starting from its first sentence
  let i = Math.max(0, S.pos);
  while (i > 0 && !words[i - 1].end) i--;
  // never cross back out of this section: the page starts where the section starts
  let sec = 0;
  for (const e of (S.edges || [])) { if (e.start <= S.pos) sec = e.start; else break; }
  i = Math.max(i, sec);
  let j = i, best = i;
  while (j < words.length && j < i + 260) {
    if (words[j].w) best = j;
    if (words[j].end && j - i > 60) break;
    j++;
  }
  while (i < words.length && words[i].h) i++;

  const lines = [];
  let line = [];
  for (let k = i; k <= j && k < words.length; k++) {
    const w = words[k];
    if (w.h) continue;
    const glyph = w.w || '';
    if (!glyph) continue;
    if (/^[\(]?open$/i.test(glyph) || /^large$/i.test(glyph) || /^size[\)]?$/i.test(glyph)) continue;
    const cur = line.map(x => x.g).join(' ');
    if ((cur + ' ' + glyph).trim().length > maxw && line.length) { lines.push(line); line = []; }
    line.push({ g: glyph, now: k === S.pos });
  }
  if (line.length) lines.push(line);

  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = fs + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
  window.__textNow = lines.flat().filter(c => c.now).length;
  const maxLines = Math.max(3, Math.floor((H - top - 92) / lh));
  lines.slice(0, maxLines).forEach((ln, r) => {
    let x = 18;
    const y = top + r * lh;
    for (const cell of ln) {
      ctx.fillStyle = cell.now ? INK(1) : INK(0.42 * alpha);
      if (cell.now) { ctx.save(); ctx.shadowColor = 'rgba(231,227,234,.30)'; ctx.shadowBlur = 10; }
      ctx.fillText(cell.g, x, y);
      if (cell.now) {
        ctx.restore();
        ctx.strokeStyle = MAG(0.95); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x, y + 13); ctx.lineTo(x + ctx.measureText(cell.g).width, y + 13); ctx.stroke();
      }
      x += ctx.measureText(cell.g).width + cw * 0.55;
    }
  });
}

/* the fork, in the reading surface: two openings written on two rules */
export function drawFork(ctx, S, W, H, t) {
  const g = planGrid(W, H);
  const top = g.oy + g.rows * g.ch + 14;
  const cy0 = top + 28;
  const laneW = W - 36;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (let k = 0; k < 2; k++) {
    const sgn = k === 0 ? -1 : 1;
    const aim = S.pointerSide === k;
    const ly = cy0 + (k === 0 ? 0 : 128);
    ctx.strokeStyle = aim ? MAG(0.55) : INK(0.20);
    ctx.lineWidth = aim ? 1.3 : 0.7;
    ctx.beginPath(); ctx.moveTo(18, ly); ctx.lineTo(W - 18, ly); ctx.stroke();
    if (aim) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(15, ly); ctx.lineTo(31, ly); ctx.stroke(); }
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = aim ? INK(0.97) : INK(0.48);
    const words = (S.gate.g.options[k] || '').split(/\s+/).slice(0, 18);
    let line = '', lines = [];
    for (const w of words) {
      if (ctx.measureText(line + ' ' + w).width > laneW && line) { lines.push(line.trim()); line = w; }
      else line += ' ' + w;
    }
    if (line.trim()) lines.push(line.trim() + (words.length >= 18 ? '…' : ''));
    lines.slice(0, 2).forEach((ln, j) => ctx.fillText(ln, 22, ly + sgn * (8 + (1 - j) * 16)));
  }
}

export function drawStupa(ctx, S, W, H, t, alpha) {
  const g = planGrid(W, H);
  const cells = planCells(ctx, S, W, H, t, alpha);
  for (const k of cells) {
    ctx.fillStyle = k.hue ? MAG(k.a) : INK(k.a);
    ctx.fillText(k.g, g.ox + k.c * g.cw, g.oy + k.r * g.ch);
  }
  return cells;
}

export function stupaStats(S) {
  const edges = S.edges || [];
  const terr = terraces(edges, Math.max(1, (S.tokens || []).length));
  return { terraces: terr.length, filled: terr.filter(a => a.length).length,
           perTerrace: terr.map(a => a.length), sections: edges.length };
}
