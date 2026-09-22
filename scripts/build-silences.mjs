#!/usr/bin/env node
/**
 * build-silences.mjs — THE SILENCES
 *
 * Every quiet stretch in the record, with the last thing said before it
 * and the first thing said after. Typos preserved.
 *
 * Input:  /tmp/sky/usertexts.json
 * Output: silences/index.html
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const raw = JSON.parse(readFileSync('/tmp/sky/usertexts.json', 'utf8'));
const TZ_MS = 8 * 3600 * 1000;

const items = Object.values(raw).map(([t, txt]) => [t, txt]).sort((a, b) => a[0] - b[0]);

const clip = (s, n) => {
  s = String(s).replace(/https?:\/\/\S+/g, '[url]').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
};
const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const fmt = (t) => {
  const d = new Date(t * 1000 + TZ_MS);
  return d.toISOString().slice(0, 10) + ' ' + d.toISOString().slice(11, 16);
};
const hh = (t) => new Date(t * 1000 + TZ_MS).toISOString().slice(11, 16);
const dayTs = (s) => Date.parse(s + 'T00:00:00+08:00') / 1000;

// discover gaps >= 12 days from the actual record
const days = [...new Set(items.map(([t]) => new Date(t * 1000 + TZ_MS).toISOString().slice(0, 10)))].sort();
const gaps = [];
for (let i = 1; i < days.length; i++) {
  const a = Date.parse(days[i - 1] + 'T00:00:00+08:00') / 1000;
  const b = Date.parse(days[i] + 'T00:00:00+08:00') / 1000;
  const n = Math.round((b - a) / 86400);
  if (n >= 12) gaps.push({ a, b, n, from: days[i - 1], to: days[i] });
}
gaps.sort((x, y) => y.n - x.n);
const shown = gaps.slice(0, 10);

const cards = shown.map((g) => {
  const before = items.filter(([t]) => t < g.b).slice(-1)[0];
  const after = items.filter(([t]) => t >= g.b).slice(0, 1)[0];
  const loud = g.n >= 100 ? ' epic' : '';
  return `<article class="gap${loud}">
  <div class="hd">
    <div class="n">${g.n} days</div>
    <div class="r">${g.from} &nbsp;→&nbsp; ${g.to}</div>
  </div>
  <div class="body">
    <div class="side before">
      <div class="tag">last thing said</div>
      ${before ? `<div class="t">${fmt(before[0])} <span class="hr">${hh(before[0])}</span></div>
      <blockquote>${esc(clip(before[1], 340))}</blockquote>` : '<div class="t">—</div>'}
    </div>
    <div class="mid"><div class="arrow">&darr;</div><div class="quiet">${g.n} days<br>of quiet</div></div>
    <div class="side after">
      <div class="tag">first thing said</div>
      ${after ? `<div class="t">${fmt(after[0])} <span class="hr">${hh(after[0])}</span></div>
      <blockquote>${esc(clip(after[1], 340))}</blockquote>` : '<div class="t">—</div>'}
    </div>
  </div>
</article>`;
}).join('\n');

const total = gaps.reduce((s, g) => s + g.n, 0);
const afterMsg = shown[0] ? (items.find(([t]) => t >= shown[0].b) || [0, ''])[1] : '';
const afterMsg2 = shown[0] ? (items.filter(([t]) => t >= shown[0].b)[1] || [0, ''])[1] : '';
const leadQuote = clip(afterMsg + ' \u2014 ' + afterMsg2, 90);
const beforeMsg = shown[0] ? (items.filter(([t]) => t < shown[0].b).slice(-1)[0] || [0, ''])[1] : '';

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
  .hd{display:flex;justify-content:space-between;align-items:baseline;padding:12px 16px;
    border-bottom:1px solid var(--line);background:#0a0e11}
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
  blockquote{margin:0;font-size:12px;line-height:1.6;color:var(--ink);border-left:2px solid var(--line);padding-left:11px}
  .before blockquote{border-left-color:#1f4a5e}
  .after blockquote{border-left-color:#5e2f1f}
  .mid{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
    background:#05080a;border-left:1px solid var(--line);border-right:1px solid var(--line)}
  .arrow{color:var(--mut);font-size:15px}
  .quiet{font-size:8px;letter-spacing:.16em;color:var(--mut);text-align:center;text-transform:uppercase}
  @media(max-width:820px){.body{grid-template-columns:1fr}.side.before,.side.after{border:0}
    .before{border-bottom:1px solid var(--line)}.mid{flex-direction:row;padding:8px}}
  footer{margin-top:36px;padding-top:16px;border-top:1px solid var(--line);color:var(--mut);font-size:9px;letter-spacing:.08em}
  footer a{color:var(--cool);text-decoration:none}
  .lead{border:1px solid var(--gold);background:#0b0e11;padding:20px 22px;margin-bottom:26px}
  .lead .big{font-size:30px;color:var(--gold);letter-spacing:.06em}
  .lead .txt{color:var(--mut);font-size:10px;letter-spacing:.1em;margin-top:6px}
  .pair{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}
  .p .pt{font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:var(--mut);margin-bottom:6px}
  .p.before .pt{color:var(--cool)} .p.after .pt{color:var(--hot)}
  .p blockquote{margin:0;font-size:12px;border-left:2px solid var(--line);padding-left:11px}
  .p.before blockquote{border-left-color:#1f4a5e} .p.after blockquote{border-left-color:#5e2f1f}
  .caveat{color:var(--mut);font-size:9px;letter-spacing:.05em;margin-top:16px;opacity:.8}
  @media(max-width:820px){.pair{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>THE SILENCES</h1>
  <div class="sub"><b>${shown.length}</b> stretches of quiet · <b>${total} days</b> in total ·
  from ${items.length.toLocaleString()} messages · typos preserved</div>
</header>

<div class="lead">
  <div class="big">${shown[0].n} days</div>
  <div class="txt">the longest quiet &nbsp;·&nbsp; ${shown[0].from} → ${shown[0].to}</div>
  <div class="pair">
    <div class="p before"><div class="pt">left</div><blockquote>${esc(clip(beforeMsg, 150))}</blockquote></div>
    <div class="p after"><div class="pt">returned &mdash; the first two things said</div><blockquote>${esc(leadQuote)}</blockquote></div>
  </div>
  <div class="caveat">Some re-entry lines are fragments of dictated speech, recorded mid-conversation —
  they are shown exactly as they were captured, not tidied into a story.</div>
</div>

${cards}

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
console.log('wrote silences/index.html (' + (html.length / 1024).toFixed(1) + ' KB)');
console.log('gaps >= 12d: ' + gaps.length + ' | total quiet: ' + total + ' days');
for (const g of shown) console.log('  ' + String(g.n).padStart(3) + 'd  ' + g.from + ' -> ' + g.to);