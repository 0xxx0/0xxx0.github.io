#!/usr/bin/env node
/**
 * build-sky.mjs — THE SKY
 *
 * Every message ever exchanged with the machine, plotted as a star:
 *   x = date (2023-06-01 → )   y = hour of day   brightness = density
 *
 * Input:  /tmp/sky/msgs.json  ({id: [create_time, role, title]})
 * Output: sky/index.html      (standalone, self-contained)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';


const msgs = JSON.parse(readFileSync('/tmp/sky/msgs.json', 'utf8'));

const TZ_OFFSET_MIN = 8 * 60;                      // the human is in +08
const E0 = Date.UTC(2023, 5, 1) / 1000;            // 2023-06-01 UTC
const DAY = 86400;

const cells = new Map();
let maxCell = 0;
const monthTotals = new Map();
const dayTotals = new Map();

for (const [t, role] of Object.values(msgs)) {
  const day = Math.floor((t + TZ_OFFSET_MIN * 60 - E0) / DAY);
  if (day < 0 || day > 1300) continue;
  const h = new Date((t + TZ_OFFSET_MIN * 60) * 1000).getUTCHours();
  const key = day * 24 + h;
  const cur = cells.get(key) || [0, 0];
  cur[role === 'user' ? 0 : 1] += 1;
  cells.set(key, cur);
  maxCell = Math.max(maxCell, cur[0] + cur[1]);
  const dt = new Date((t + TZ_OFFSET_MIN * 60) * 1000);
  const mk = dt.getUTCFullYear() + '-' + String(dt.getUTCMonth() + 1).padStart(2, '0');
  monthTotals.set(mk, (monthTotals.get(mk) || 0) + 1);
  dayTotals.set(day, (dayTotals.get(day) || 0) + 1);
}

const lastDay = Math.max(...[...cells.keys()].map((k) => Math.floor(k / 24)));
const totalDays = lastDay + 1;
let totalMsgs = 0, totalUser = 0;
for (const c of cells.values()) { totalMsgs += c[0] + c[1]; totalUser += c[0]; }

const rows = [];
for (let d = 0; d < totalDays; d++) {
  const row = [];
  for (let h = 0; h < 24; h++) {
    const c = cells.get(d * 24 + h);
    if (c) row.push([h, c[0], c[1]]);
  }
  if (row.length) rows.push([d, row]);
}
const blob = JSON.stringify(rows);

const active = [...dayTotals.keys()].sort((a, b) => a - b);
const silences = [];
let prev = active[0];
for (const d of active.slice(1)) {
  if (d - prev >= 12) silences.push([prev, d, d - prev]);
  prev = d;
}
silences.sort((a, b) => b[2] - a[2]);

const fmt = (day) => {
  const d = new Date((E0 + day * DAY + TZ_OFFSET_MIN * 60) * 1000);
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
};

const months = [...monthTotals.entries()].sort();
const monthMax = Math.max(...monthTotals.values());
const years = [2024, 2025, 2026].map((y) => ({ y, day: Math.floor((Date.UTC(y, 0, 1) / 1000 - E0) / DAY) }));

const silenceList = [];
const seenDays = new Set();
for (const [a, b, n] of silences) {
  if (seenDays.has(n)) continue;
  seenDays.add(n);
  silenceList.push({ from: fmt(a), to: fmt(b), days: n });
  if (silenceList.length >= 8) break;
}

// ---- client script (kept separate to avoid nested-template issues) --------
const CLIENT = [
  "const RAW = JSON.parse(document.getElementById('data').textContent);",
  "const DAYS = " + totalDays + ", MAXC = " + maxCell + ", E0 = " + E0 + ", TZOFF = " + (TZ_OFFSET_MIN * 60) + ";",
  "const YEARS = " + JSON.stringify(years) + ";",
  "const SILENCES = " + JSON.stringify(silenceList) + ";",
  "const MT = " + JSON.stringify(months) + ";",
  "const MM = " + monthMax + ";",
  "let mode = 'all';",
  "const canvas = document.getElementById('c');",
  "const ctx = canvas.getContext('2d');",
  "const tip = document.getElementById('tip');",
  "const stage = canvas.parentElement;",
  "const DPR = Math.min(2, window.devicePixelRatio || 1);",
  "const HOURS = 24, PADX = 26, PADY = 16;",
  "let CW, CH, SX, SY;",
  "function layout(){",
  "  const w = stage.clientWidth;",
  "  CH = Math.max(300, Math.min(520, Math.round(w * 0.38)));",
  "  CW = w;",
  "  canvas.width = CW * DPR; canvas.height = CH * DPR;",
  "  canvas.style.height = CH + 'px';",
  "  ctx.setTransform(DPR,0,0,DPR,0,0);",
  "  SX = (CW - PADX*2) / DAYS;",
  "  SY = (CH - PADY*2) / (HOURS - 1);",
  "  draw();",
  "}",
  "const D2X = d => PADX + d * SX;",
  "const H2Y = h => PADY + (23 - h) * SY;",
  "function draw(){",
  "  ctx.clearRect(0,0,CW,CH);",
  "  ctx.fillStyle = '#000'; ctx.fillRect(0,0,CW,CH);",
  "  ctx.strokeStyle = 'rgba(109,124,133,.10)'; ctx.lineWidth = 1;",
  "  ctx.font = '9px ui-monospace,monospace';",
  "  for (let h = 0; h < 24; h += 3){",
  "    const y = Math.round(H2Y(h)) + .5;",
  "    ctx.beginPath(); ctx.moveTo(PADX, y); ctx.lineTo(CW-PADX, y); ctx.stroke();",
  "    ctx.fillStyle = 'rgba(109,124,133,.55)';",
  "    ctx.fillText(String(h).padStart(2,'0'), 4, y + 3);",
  "  }",
  "  for (const yb of YEARS){",
  "    const x = Math.round(D2X(yb.day)) + .5;",
  "    if (x < PADX || x > CW-PADX) continue;",
  "    ctx.strokeStyle = 'rgba(213,173,104,.20)'; ctx.setLineDash([2,4]);",
  "    ctx.beginPath(); ctx.moveTo(x, PADY-6); ctx.lineTo(x, CH-PADY+6); ctx.stroke();",
  "    ctx.setLineDash([]);",
  "    ctx.fillStyle = 'rgba(213,173,104,.7)';",
  "    ctx.fillText(yb.y, x + 4, PADY - 6);",
  "  }",
  "  ctx.globalCompositeOperation = 'lighter';",
  "  const logMax = Math.log(1 + MAXC);",
  "  for (const pair of RAW){",
  "    const d = pair[0], row = pair[1];",
  "    for (const cell of row){",
  "      const h = cell[0], u = cell[1], a = cell[2];",
  "      const n = mode === 'user' ? u : (u + a);",
  "      if (!n) continue;",
  "      const x = D2X(d), y = H2Y(h);",
  "      const mag = Math.log(1 + n) / logMax;",
  "      const r = 0.5 + mag * 3.4;",
  "      const alpha = Math.min(.95, .16 + mag * .8);",
  "      const hue = mode === 'user' ? '114,188,231' : (u > a ? '237,116,71' : '114,188,231');",
  "      const g = ctx.createRadialGradient(x,y,0,x,y,r*3.6);",
  "      g.addColorStop(0, 'rgba(' + hue + ',' + alpha + ')');",
  "      g.addColorStop(.35, 'rgba(' + hue + ',' + (alpha*.32) + ')');",
  "      g.addColorStop(1, 'rgba(' + hue + ',0)');",
  "      ctx.fillStyle = g;",
  "      ctx.beginPath(); ctx.arc(x, y, r*3.6, 0, 6.283); ctx.fill();",
  "      ctx.fillStyle = 'rgba(232,236,233,' + alpha + ')';",
  "      ctx.beginPath(); ctx.arc(x, y, r*.62, 0, 6.283); ctx.fill();",
  "    }",
  "  }",
  "  ctx.globalCompositeOperation = 'source-over';",
  "}",
  "canvas.addEventListener('mousemove', e => {",
  "  const r = canvas.getBoundingClientRect();",
  "  const mx = e.clientX - r.left, my = e.clientY - r.top;",
  "  const d = Math.round((mx - PADX) / SX);",
  "  const h = Math.round(23 - (my - PADY) / SY);",
  "  if (d < 0 || d >= DAYS || h < 0 || h > 23){ tip.style.display='none'; return; }",
  "  let u = 0, a = 0;",
  "  for (const pair of RAW){",
  "    if (pair[0] !== d) continue;",
  "    for (const cell of pair[1]) if (cell[0] === h){ u = cell[1]; a = cell[2]; }",
  "    break;",
  "  }",
  "  const ds = new Date((E0 + d*86400 + TZOFF) * 1000).toISOString().slice(0,10);",
  "  tip.innerHTML = '<span class=\"d\">' + ds + ' ' + String(h).padStart(2,'0') + ':00</span>' +",
  "    ((u+a) ? (' · <span class=\"u\">' + u + ' from the hand</span> · <span class=\"a\">' + a + ' back</span>')",
  "           : ' · <span style=\"color:#6b7780\">silent</span>');",
  "  tip.style.display = 'block';",
  "  tip.style.left = Math.min(CW - tip.offsetWidth - 8, mx + 14) + 'px';",
  "  tip.style.top  = Math.max(4, my - 30) + 'px';",
  "});",
  "canvas.addEventListener('mouseleave', () => tip.style.display = 'none');",
  "document.querySelectorAll('.ctl button').forEach(b => b.addEventListener('click', () => {",
  "  document.querySelectorAll('.ctl button').forEach(x => x.classList.toggle('on', x === b));",
  "  mode = b.dataset.m; draw();",
  "}));",
  "document.getElementById('strip').innerHTML = MT.map(kv =>",
  "  '<div class=\"m\" style=\"height:' + Math.max(2, Math.round(kv[1]/MM*60)) + 'px\" title=\"' + kv[0] + ': ' + kv[1].toLocaleString() + '\"></div>'",
  ").join('');",
  "document.getElementById('gaps').innerHTML = SILENCES.map(s =>",
  "  '<div class=\"gap\"><div class=\"n\">' + s.days + ' days</div><div class=\"r\">' + s.from + ' &rarr; ' + s.to + '</div></div>'",
  ").join('') || '<div class=\"gap\"><div class=\"r\">none</div></div>';",
  "document.getElementById('hrlab').textContent = 'local time (+08)';",
  "window.addEventListener('resize', layout);",
  "layout();"
].join('\n');

const html = `<!DOCTYPE html>
<html lang="en" class="dark doc doc-sky">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>THE SKY — ${totalMsgs.toLocaleString()} messages</title>
<link rel="stylesheet" href="/tools/house-patterns.css">
</head>
<body>
<div class="wrap">
<header>
  <h1>THE SKY</h1>
  <div class="sub"><b>${totalMsgs.toLocaleString()} messages</b> · ${totalUser.toLocaleString()} written by the human ·
  ${totalDays.toLocaleString()} days · <b>${fmt(0)} &rarr; ${fmt(lastDay)}</b></div>
</header>

<div class="ctl">
  <button data-m="all" class="on">all traffic</button>
  <button data-m="user">the human's own hand</button>
</div>

<section>
  <div class="stage">
    <canvas id="c"></canvas>
    <div class="tip" id="tip"></div>
  </div>
  <div class="lab"><span>hour &uarr;</span><span id="hrlab"></span></div>
</section>

<section>
  <h2>By month</h2>
  <div class="strip" id="strip"></div>
  <div class="mlab"><span>${months[0][0]}</span><span>${months[months.length - 1][0]}</span></div>
</section>

<section>
  <h2>The silences — where it went quiet</h2>
  <div class="gaps" id="gaps"></div>
</section>

<footer>
  THE SKY · built from 903 conversations · this corpus only ·
  <a href="../nexus/">field nexus</a> · <a href="../">field index</a>
</footer>
</div>
<script id="data" type="application/json">${blob}</script>
<script>
${CLIENT}
</script>
</body>
</html>`;

mkdirSync('sky', { recursive: true });
writeFileSync('sky/index.html', html);
console.log('wrote sky/index.html (' + (html.length / 1024).toFixed(1) + ' KB)');
console.log('days=' + totalDays + ' msgs=' + totalMsgs + ' user=' + totalUser + ' maxCell=' + maxCell);
console.log('silences: ' + JSON.stringify(silenceList));