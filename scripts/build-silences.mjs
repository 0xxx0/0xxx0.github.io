#!/usr/bin/env node
/**
 * build-silences.mjs — THE SILENCES
 *
 * PUBLIC output is REDACTED BY DESIGN: durations, dates and hours only.
 * No verbatim message text is ever written to the repo — the source quotes
 * contain home address, vehicle, health and work detail.
 *
 * The full-text version is written ONLY to a private local path.
 *
 * Input:  /tmp/sky/usertexts.json
 * Output: silences/index.html                       (public, redacted)
 *         ~/void-anchor/_private-review/silences-full.html  (local only)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';

const raw = JSON.parse(readFileSync('/tmp/sky/usertexts.json', 'utf8'));
const TZ_MS = 8 * 3600 * 1000;

const items = Object.values(raw).map(([t, txt]) => [t, txt]).sort((a, b) => a[0] - b[0]);

const clean = (s) => String(s).replace(/https?:\/\/\S+/g, '[url]').replace(/\s+/g, ' ').trim();
const clip = (s, n) => { s = clean(s); return s.length > n ? s.slice(0, n) + '…' : s; };
const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const dateOf = (t) => new Date(t * 1000 + TZ_MS).toISOString().slice(0, 10);
const hhmm = (t) => new Date(t * 1000 + TZ_MS).toISOString().slice(11, 16);
const fmt = (t) => dateOf(t) + ' ' + hhmm(t);

// ---- discover gaps >= 12 days --------------------------------------------
const days = [...new Set(items.map(([t]) => dateOf(t)))].sort();
const gaps = [];
for (let i = 1; i < days.length; i++) {
  const a = Date.parse(days[i - 1] + 'T00:00:00+08:00') / 1000;
  const b = Date.parse(days[i] + 'T00:00:00+08:00') / 1000;
  const n = Math.round((b - a) / 86400);
  if (n >= 12) gaps.push({ a, b, n, from: days[i - 1], to: days[i] });
}
gaps.sort((x, y) => y.n - x.n);
const shown = gaps.slice(0, 10);
const total = gaps.reduce((s, g) => s + g.n, 0);

const beforeOf = (g) => items.filter(([t]) => t < g.b).slice(-1)[0] || null;
const afterOf = (g) => items.filter(([t]) => t >= g.b)[0] || null;

// ---- PUBLIC: redacted. describe, never quote. ----------------------------
const describe = (txt) => {
  const s = clean(txt);
  const n = s.length;
  const q = /\?/.test(s);
  const shouty = /!/.test(s);
  if (n < 12) return `a ${n}-character fragment`;
  if (n < 60) return `a short ${q ? 'question' : 'line'} (${n} chars)`;
  if (n < 300) return `a ${q ? 'question' : 'message'} of ${n} characters`;
  return `a long ${q ? 'multipart question' : 'message'} of ${n} characters`;
};

const postersOf = (t) => {
  const h = parseInt(hhmm(t).slice(0, 2), 10);
  if (h >= 0 && h < 5) return 'deep night';
  if (h < 8) return 'pre-dawn';
  if (h < 12) return 'morning';
  if (h < 14) return 'midday';
  if (h < 18) return 'afternoon';
  if (h < 22) return 'evening';
  return 'late';
};

const pubCards = shown.map((g) => {
  const b = beforeOf(g), a = afterOf(g);
  const loud = g.n >= 100 ? ' epic' : '';
  return `<article class="gap${loud}">
  <div class="hd"><div class="n">${g.n} days</div><div class="r">${g.from} &nbsp;→&nbsp; ${g.to}</div></div>
  <div class="body">
    <div class="side before">
      <div class="tag">the record stops</div>
      ${b ? `<div class="t">${fmt(b[0])} <span class="hr">${postersOf(b[0])}</span></div>
      <div class="d">${esc(describe(b[1]))}</div>` : '<div class="t">—</div>'}
    </div>
    <div class="mid"><div class="arrow">&darr;</div><div class="quiet">${g.n} days<br>of quiet</div></div>
    <div class="side after">
      <div class="tag">the record resumes</div>
      ${a ? `<div class="t">${fmt(a[0])} <span class="hr">${postersOf(a[0])}</span></div>
      <div class="d">${esc(describe(a[1]))}</div>` : '<div class="t">—</div>'}
    </div>
  </div>
</article>`;
}).join('\n');

const within = (from, to, lo, hi) => {
  const f = parseInt(from.slice(0, 4)), t = parseInt(to.slice(0, 4));
  return f >= lo && t <= hi;
};
const byYear = {};
for (const g of shown) {
  const y = g.from.slice(0, 4);
  byYear[y] = (byYear[y] || 0) + g.n;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>THE SILENCES</title>
<style>
  :root{--bg:#05070a;--ink:#e8ece9;--mut:#6b7780;--hot:#ed7447;--cool:#72bce7;--gold:#d5ad68;--line:#1d262c}
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg);color:var(--ink);font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace}
  .wrap{max-width:1180px;margin:0 auto;padding:30px 20px 80px}
  header{border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:30px}
  h1{margin:0 0 8px;font-size:15px;font-weight:500;letter-spacing:.24em;color:var(--gold)}
  .sub{color:var(--mut);letter-spacing:.05em}.sub b{color:var(--ink);font-weight:500}
  .gap{border:1px solid var(--line);background:#000;margin-bottom:14px;border-radius:2px;overflow:hidden}
  .gap.epic{border-color:#3a2c1e;background:linear-gradient(180deg,#0a0806,#000)}
  .gap.epic .n{color:var(--gold)}
  .hd{display:flex;justify-content:space-between;align-items:baseline;padding:12px 16px;border-bottom:1px solid var(--line);background:#0a0e11}
  .n{font-size:19px;letter-spacing:.09em;color:var(--hot)}
  .r{color:var(--mut);font-size:10px;letter-spacing:.1em}
  .body{display:grid;grid-template-columns:1fr 118px 1fr;align-items:stretch}
  .side{padding:16px}
  .side.before{border-right:1px solid var(--line)}
  .side.after{border-left:1px solid var(--line)}
  .tag{font-size:8px;letter-spacing:.22em;text-transform:uppercase;color:var(--mut);margin-bottom:8px}
  .before .tag{color:var(--cool)} .after .tag{color:var(--hot)}
  .t{font-size:9px;color:var(--mut);letter-spacing:.08em;margin-bottom:7px}
  .hr{color:var(--gold)}
  .d{font-size:12px;color:var(--ink);border-left:2px solid var(--line);padding-left:11px}
  .before .d{border-left-color:#1f4a5e} .after .d{border-left-color:#5e2f1f}
  .mid{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:#05080a;border-left:1px solid var(--line);border-right:1px solid var(--line)}
  .arrow{color:var(--mut);font-size:15px}
  .quiet{font-size:8px;letter-spacing:.16em;color:var(--mut);text-align:center;text-transform:uppercase}
  @media(max-width:820px){.body{grid-template-columns:1fr}.side.before,.side.after{border:0}
    .before{border-bottom:1px solid var(--line)}.mid{flex-direction:row;padding:8px}}
  footer{margin-top:36px;padding-top:16px;border-top:1px solid var(--line);color:var(--mut);font-size:9px;letter-spacing:.08em}
  footer a{color:var(--cool);text-decoration:none}
  .lead{border:1px solid var(--gold);background:#0b0e11;padding:20px 22px;margin-bottom:26px}
  .lead .big{font-size:30px;color:var(--gold);letter-spacing:.06em}
  .lead .txt{color:var(--mut);font-size:10px;letter-spacing:.1em;margin-top:6px}
  .redact{border:1px solid var(--line);background:#080b0e;padding:14px 16px;margin-bottom:26px;color:var(--mut);font-size:10px;letter-spacing:.05em}
  .redact b{color:var(--gold)}
  .years{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);margin-bottom:26px}
  .yr{background:#000;padding:10px 12px}
  .yr .k{color:var(--mut);font-size:9px;letter-spacing:.16em}
  .yr .v{color:var(--ink);font-size:18px;letter-spacing:.05em}
  .yr .v em{color:var(--mut);font-size:9px;font-style:normal;letter-spacing:.1em}
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>THE SILENCES</h1>
  <div class="sub"><b>${shown.length}</b> stretches of quiet · <b>${total} days</b> in total ·
  measured from ${items.length.toLocaleString()} messages</div>
</header>

<div class="lead">
  <div class="big">${shown[0].n} days</div>
  <div class="txt">the longest quiet &nbsp;·&nbsp; ${shown[0].from} → ${shown[0].to} &nbsp;·&nbsp;
  the record stops in the ${postersOf(beforeOf(shown[0])[0])} and resumes in the ${postersOf(afterOf(shown[0])[0])}</div>
</div>

<div class="years">
  ${Object.entries(byYear).map(([y, n]) => `<div class="yr"><div class="k">${y}</div><div class="v">${n} <em>days quiet</em></div></div>`).join('')}
</div>

<div class="redact">
  <b>REDACTED BY DESIGN.</b> This page names durations, dates and hours — never words.
  The source messages contain personal detail (address, vehicle, health, work), so the
  verbatim text is deliberately withheld from publication. A full-text copy is kept
  locally and is not in this repository.
</div>

${pubCards}

<footer>
  THE SILENCES · the record goes quiet, it does not stop ·
  <a href="../sky/">the sky</a> · <a href="../handshake/">the handshake</a> ·
  <a href="../nexus/">field nexus</a> · <a href="../">field index</a>
</footer>
</div>
</body>
</html>`;

mkdirSync('silences', { recursive: true });
writeFileSync('silences/index.html', html);
console.log('wrote silences/index.html (' + (html.length / 1024).toFixed(1) + ' KB) — REDACTED');

// ---- PRIVATE: full text, local only, never committed ---------------------
const privCards = shown.map((g) => {
  const b = beforeOf(g), a = afterOf(g);
  return `<article class="gap">
  <div class="hd"><div class="n">${g.n} days</div><div class="r">${g.from} → ${g.to}</div></div>
  <div class="body">
    <div class="side before"><div class="tag">last thing said</div>
      ${b ? `<div class="t">${fmt(b[0])}</div><blockquote>${esc(clip(b[1], 900))}</blockquote>` : ''}</div>
    <div class="side after"><div class="tag">first thing said</div>
      ${a ? `<div class="t">${fmt(a[0])}</div><blockquote>${esc(clip(a[1], 900))}</blockquote>` : ''}</div>
  </div>
</article>`;
}).join('\n');

const privDir = homedir() + '/void-anchor/_private-review';
if (existsSync(homedir() + '/void-anchor')) {
  mkdirSync(privDir, { recursive: true });
  writeFileSync(privDir + '/silences-full.html',
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>THE SILENCES — private full text</title>
<style>body{background:#05070a;color:#e8ece9;font:12px/1.6 ui-monospace,Menlo,monospace;max-width:1000px;margin:0 auto;padding:30px 20px}
h1{color:#d5ad68;font-size:14px;letter-spacing:.2em}.gap{border:1px solid #1d262c;background:#000;margin-bottom:14px;padding:0}
.hd{display:flex;justify-content:space-between;padding:10px 14px;background:#0a0e11;border-bottom:1px solid #1d262c}
.n{color:#ed7447;font-size:17px}.r{color:#6b7780;font-size:10px}
.body{display:grid;grid-template-columns:1fr 1fr;gap:0}
.side{padding:14px}.before{border-right:1px solid #1d262c}
.tag{font-size:8px;letter-spacing:.2em;color:#6b7780;text-transform:uppercase;margin-bottom:6px}
.t{color:#6b7780;font-size:9px;margin-bottom:6px}blockquote{margin:0;border-left:2px solid #1f4a5e;padding-left:10px}
.warn{color:#ed7447;border:1px solid #5a3a3f;padding:12px;margin-bottom:20px;font-size:11px}</style></head><body>
<h1>THE SILENCES — PRIVATE FULL TEXT</h1>
<div class="warn">LOCAL ONLY · NOT IN THE REPOSITORY · contains personal detail — do not publish or share.</div>
${privCards}</body></html>`);
  console.log('wrote ~/void-anchor/_private-review/silences-full.html — PRIVATE, local only');
}

console.log('gaps >= 12d: ' + gaps.length + ' | total quiet: ' + total + ' days');
console.log('quiet by year: ' + JSON.stringify(byYear));