/* maze.js — the text as a walkable ammonite.
 *
 * The chapter is laid on an Archimedean spiral whose arc length IS the text:
 * one world unit = one character. Nothing is placed by a hash; every coordinate
 * reduces to a measured field:
 *   radius      <- arc position s (reading order)
 *   stroke width<- sentence length in words
 *   gap         <- a section edge (a door in the wall)
 *   hue         <- only the live decision window (magenta), never at rest
 *
 * At rest the whole chapter is drawn as a spiral ribbon: the painting.
 * While reading the camera sits on the word, the tangent points right, and the
 * words resolve along the corridor. A section edge opens a fork in the corridor.
 *
 * Pure layout is exported separately so it can be tested without a DOM.
 */

export const STEP = 26;          // radial char-units gained per full turn
export const Z_READ = 10.2;      // px per character while reading
export const FONT_READ = 17;     // px, monospace advance = 0.6em = 10.2px

export function layout(tokens) {
  const n = tokens.length;
  const cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    const g = tokens[i].w || tokens[i].t || '';
    cum[i + 1] = cum[i] + Math.max(1, g.length) + 0.7;
  }
  const U = cum[n] || 1;
  const a = STEP / (2 * Math.PI);
  const theta = s => Math.sqrt(2 * Math.max(s, 1e-6) / a);
  const R = s => a * theta(s);

  const P = s => { const th = theta(s), r = R(s); return [r * Math.cos(th), r * Math.sin(th)]; };
  const T = s => {
    const th = theta(s), inv = 1 / (a * th);
    const dx = (a * Math.cos(th) - a * th * Math.sin(th)) * inv;
    const dy = (a * Math.sin(th) + a * th * Math.cos(th)) * inv;
    const m = Math.hypot(dx, dy) || 1;
    return [dx / m, dy / m];
  };

  // sentence spans (a sentence is a run of tokens ending in . ! ? …)
  const sentOf = new Int32Array(n), sentLen = new Int32Array(n);
  let sid = 0, start = 0;
  for (let i = 0; i < n; i++) {
    if (tokens[i].end) { for (let j = start; j <= i; j++) { sentOf[j] = sid; sentLen[j] = i - start + 1; } sid++; start = i + 1; }
  }
  for (let j = start; j < n; j++) { sentOf[j] = sid; sentLen[j] = Math.max(1, n - start); }

  return { n, U, a, cum, P, T, sentOf, sentLen,
    thetaOf: theta, rOf: R,
    // index of the token containing arc position s (last token with cum<=s)
    indexAt(s) {
      let lo = 0, hi = n - 1;
      if (s <= 0) return 0;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid - 1; }
      return lo;
    },
    maxR: R(U)
  };
}

/* screen projection: rigid frame at the camera, tangent -> +x */
export function camera(lay, camS, Z, W, H, cx, cy) {
  const [px, py] = lay.P(camS);
  const [tx, ty] = lay.T(camS);
  const nx = ty, ny = -tx;          // right normal, maps to screen up
  return {
    to(s) {
      const [x, y] = lay.P(s);
      const dx = x - px, dy = y - py;
      return [cx + (dx * tx + dy * ty) * Z, cy - (dx * nx + dy * ny) * Z];
    },
    toXY(x, y) {
      const dx = x - px, dy = y - py;
      return [cx + (dx * tx + dy * ty) * Z, cy - (dx * nx + dy * ny) * Z];
    },
    camS, Z
  };
}

const INK = (a) => 'rgba(231,227,234,' + a.toFixed(3) + ')';
const MAG = (a) => 'rgba(224,106,156,' + a.toFixed(3) + ')';

/* ---------- the painting: whole chapter, one scale, prerendered once ---------- */
export function paintChapter(lay, edges, W, H, dpr, tokens) {
  const Z = (0.47 * Math.min(W, H * 0.80)) / Math.max(1, lay.maxR);
  const cy = H * 0.47;
  const cam = camera(lay, lay.U * 0.5, Z, W, H, W * 0.5, cy);
  const c = document.createElement('canvas');
  c.width = Math.max(1, W * dpr); c.height = Math.max(1, H * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  g.lineCap = 'round';

  // the corridor: width is the sentence's own length
  const stepS = Math.max(2, lay.U / 24000);
  const door = new Uint8Array(Math.ceil(lay.U) + 4);
  for (const e of edges) { const s0 = Math.round(e.startS); for (let d = 0; d < 3; d++) door[s0 + d] = 1; }
  let prev = null;
  for (let s = 0; s <= lay.U; s += stepS) {
    const i = lay.indexAt(s);
    const w = Math.min(7.5, 0.9 + Math.sqrt(lay.sentLen[i] || 1) * 0.55);
    const [x, y] = cam.to(s);
    if (prev && !door[Math.round(s)]) {
      g.strokeStyle = INK(0.045);
      g.lineWidth = Math.max(0.5, w * Z);
      g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(x, y); g.stroke();
    }
    prev = [x, y];
  }

  // the words themselves, at the smallest size that still has letterforms:
  // this is what makes the painting a text and not a groove
  if (tokens) {
    g.textBaseline = 'middle';
    g.font = '4px ui-monospace, SFMono-Regular, Menlo, monospace';
    let lastPx = -99;
    for (let i = 0; i < tokens.length; i++) {
      const glyph = tokens[i].w || tokens[i].t || '';
      if (!glyph) continue;
      const s = lay.cum[i] + 0.35;
      const [x, y] = cam.to(s);
      if (Math.abs(x - lastPx) < 1.7) continue;    // don't overdraw below legibility
      lastPx = x;
      const near = Math.min(1, (lay.sentLen[i] || 1) / 18);
      g.fillStyle = INK(0.085 + 0.085 * near);
      g.fillText(glyph, x, y);
    }
  }

  // doors: a hairline across the corridor at every section edge
  for (const e of edges) {
    const [x, y] = cam.to(e.startS);
    const [tx, ty] = lay.T(e.startS);
    g.strokeStyle = INK(0.20); g.lineWidth = 0.7;
    g.beginPath(); g.moveTo(x - ty * 5, y - tx * 5); g.lineTo(x + ty * 5, y + tx * 5); g.stroke();
  }
  return { canvas: c, Z, W, H, cy };
}

/* ---------- the walk: corridor, words, fork ---------- */
export function drawWalk(ctx, S, lay, W, H, t, opts) {
  const gateOpen = !!(S.gate && S.gate.chosen === null);
  const zoomed = S.playing || gateOpen;
  const p = opts.zoom;                      // 0..1 eased by the caller
  const Z = Math.exp(Math.log(opts.zFit) * (1 - p) + Math.log(Z_READ) * p);
  const camS = lay.U * 0.5 * (1 - p) + S.posS * p;
  const cx = W * (0.5 * (1 - p) + 0.16 * p);
  const cy = H * (0.5 * (1 - p) + 0.53 * p);
  const cam = camera(lay, camS, Z, W, H, cx, cy);

  // corridor ribbon around the camera — width is the sentence's own length
  const span = Math.min(lay.U, (H * 0.62) / Z + 60);
  const stepS = Math.max(0.8, 1.6 / Math.max(0.001, p));
  ctx.lineCap = 'round';
  let prevL = null, prevR = null;
  for (let s = Math.max(0, camS - span); s <= Math.min(lay.U, camS + span); s += stepS) {
    const i = lay.indexAt(s);
    const half = (0.9 + Math.min(3.4, Math.sqrt(lay.sentLen[i] || 1) * 0.42)); // chars
    const [x, y] = lay.P(s);
    const [tx, ty] = lay.T(s);
    const nx = ty, ny = -tx;
    const L = cam.toXY(x + nx * half, y + ny * half);
    const R = cam.toXY(x - nx * half, y - ny * half);
    if (prevL) {
      const d = Math.abs(s - camS);
      const a = (0.9 - 0.25 * (1 - p)) * Math.max(0, 1 - d / span);
      ctx.strokeStyle = INK(0.07 + 0.13 * a);
      ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(prevL[0], prevL[1]); ctx.lineTo(L[0], L[1]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(prevR[0], prevR[1]); ctx.lineTo(R[0], R[1]); ctx.stroke();
    }
    prevL = L; prevR = R;
  }

  // words: only where they can be read; farther ones stay in the ribbon
  const reach = Math.min(150, (W * 1.1) / Z + 12);
  const i0 = lay.indexAt(Math.max(0, camS - reach * 1.4));
  const i1 = lay.indexAt(Math.min(lay.U, camS + reach * 1.4));
  ctx.textBaseline = 'middle';
  for (let i = i0; i <= i1; i++) {
    const tok = S.tokens[i]; if (!tok) continue;
    const s = lay.cum[i] + 0.35;
    const d = s - camS;
    const [x, y] = cam.to(s);
    const near = Math.max(0, 1 - Math.abs(d) / (reach * 1.25));
    if (near <= 0.02) continue;
    const glyph = tok.w || tok.t || '';
    if (!glyph) continue;
    const isNow = i === S.pos;
    if (!isNow && (x < 18 || y < 8 || y > H - 60)) continue;
    const fs = FONT_READ * (0.62 + 0.38 * Math.min(1, near * 1.6));
    ctx.font = (tok.h ? 'italic ' : '') + fs.toFixed(1) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    const tw = glyph.length * fs * 0.6;      // monospace advance; measureText in the hot loop costs frames
    if (!isNow && x + tw > W - 8) continue;
    const a = isNow ? 1 : 0.10 + 0.56 * near;
    ctx.fillStyle = isNow ? INK(1) : INK(a * 0.9);
    if (isNow) {
      ctx.save();
      ctx.shadowColor = 'rgba(231,227,234,.35)'; ctx.shadowBlur = 12;
      ctx.fillText(glyph, x, y);
      ctx.restore();
    } else {
      ctx.fillText(glyph, x, y);
    }
  }

  // the reading aperture at the word
  const [wx, wy] = cam.to(S.posS);
  if (!gateOpen) {
    ctx.strokeStyle = INK(0.16); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(wx, wy, 36, 23, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = INK(0.30); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(wx - 16, wy + 13); ctx.lineTo(wx + 16, wy + 13); ctx.stroke();
  }

  // the fork: the road splits into two lanes, each carrying its own opening
  if (gateOpen) {
    const [fx, fy] = cam.to(S.edgeStart);
    const laneX = W * 0.16;
    const laneW = W - laneX - 14;
    for (let k = 0; k < 2; k++) {
      const sgn = k === 0 ? -1 : 1;
      const aim = S.pointerSide === k;
      const ly = cy + sgn * Math.min(86, H * 0.105);
      // the lane itself
      ctx.strokeStyle = aim ? MAG(0.55) : INK(0.20);
      ctx.lineWidth = aim ? 1.2 : 0.7;
      ctx.beginPath(); ctx.moveTo(laneX, ly); ctx.lineTo(W - 10, ly); ctx.stroke();
      if (aim) {   // a heavier mouth: the aimed lane is not just a different hue
        ctx.lineWidth = 3; ctx.beginPath();
        ctx.moveTo(laneX - 3, ly); ctx.lineTo(laneX + 13, ly); ctx.stroke();
      }
      // the split: from the word to the lane mouth
      ctx.beginPath(); ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(wx + 22, wy + sgn * 8, laneX, ly);
      ctx.stroke();
      // the opening, written on the lane
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '12.5px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = aim ? INK(0.97) : INK(0.48);
      const words = (S.gate.g.options[k] || '').split(/\s+/).slice(0, 16);
      let line = '', lines = [];
      for (const w of words) {
        if (ctx.measureText(line + ' ' + w).width > laneW && line) { lines.push(line.trim()); line = w; }
        else line += ' ' + w;
      }
      if (line.trim()) lines.push(line.trim() + (words.length >= 16 ? '…' : ''));
      lines.slice(0, 2).forEach((ln, j) => ctx.fillText(ln, laneX + 8, ly + sgn * (7 + (1 - j) * 17)));
      (S.forkDbg = S.forkDbg || {})[k] = { laneX, ly, lines: lines.slice(0, 2), widths: lines.slice(0, 2).map(l => ctx.measureText(l).width), right: Math.max(...lines.slice(0, 2).map(l => laneX + 8 + ctx.measureText(l).width)) };
    }
    ctx.textAlign = 'left';
  }

  // window: the decision's own clock, the one earned hue
  if (gateOpen) {
    const rem = Math.max(0, Math.min(1, 1 - (performance.now() - S.gate.t0) / 12000));
    ctx.strokeStyle = MAG(0.25 + 0.35 * rem); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(wx, wy, 30 + 40 * rem, 20 + 26 * rem, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * rem); ctx.stroke();
  }

  // crossing pulse
  if (S.burst > 0) {
    const age = (t - S.burstAt) / 900;
    if (age >= 0 && age <= 1) {
      const life = Math.sin(Math.PI * age);
      ctx.strokeStyle = MAG(0.30 * life * S.burst); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(wx, wy, 20 + 90 * age * S.burst, 0, Math.PI * 2); ctx.stroke();
    } else if (age > 1) S.burst = 0;
  }
}

/* static haze — the song's texture, and it is the POV engine's witness:
   the specks are the optic flow of the reader's own movement, so they exist
   only while the text moves and their spread is the engine's depth field. */
export function drawHaze(ctx, W, H, t, playing, reduce, stars) {
  if (!playing || reduce || !stars) return;
  const beat = 0.5 + 0.5 * Math.sin((t / 1000) * (68 / 60) * Math.PI * 2);
  for (const p of stars) {
    const q = p.depth || 0;
    const x = W * (0.5 + (p.x || 0) * 0.52);
    const y = H * (0.55 + (p.y || 0) * 0.62);
    const len = 4 + 16 * q;
    ctx.strokeStyle = INK((0.04 + 0.10 * q) * (0.7 + 0.3 * beat));
    ctx.lineWidth = 0.5 + 0.5 * q;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();
  }
}

export function stats(lay) {
  return { tokens: lay.n, units: Math.round(lay.U), maxRadius: Math.round(lay.maxR), turns: +(lay.thetaOf(lay.U) / (2 * Math.PI)).toFixed(1) };
}
