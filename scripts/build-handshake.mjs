#!/usr/bin/env node
/**
 * build-handshake.mjs — THE HANDSHAKE
 *
 * How the human addresses a machine, measured across 11,369 messages.
 * Openings, closings, idioms, and the signature.
 *
 * Input:  /tmp/sky/usertexts.json
 * Output: handshake/index.html
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const raw = JSON.parse(readFileSync('/tmp/sky/usertexts.json', 'utf8'));
const vals = Object.values(raw).map((v) => v[1]);

const clean = (t) => t
  .replace(/https?:\/\/\S+/g, ' ')
  .replace(/\S*\.(com|org|net|io|ai|co)\S*/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const cleaned = vals.map(clean).filter(Boolean);
const totalChars = cleaned.reduce((s, t) => s + t.length, 0);
const avgChars = Math.round(totalChars / cleaned.length);

const tok = (t) => t.match(/[a-zA-Z']+/g) || [];

const first1 = new Map(), first2 = new Map(), last1 = new Map(), last2 = new Map();
const allWords = new Map();
const lens = [];
for (const t of cleaned) {
  const w = tok(t);
  lens.push(w.length);
  if (w.length >= 2) {
    const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);
    bump(first1, w[0].toLowerCase());
    bump(first2, (w[0] + ' ' + w[1]).toLowerCase());
    bump(last1, w[w.length - 1].toLowerCase());
    bump(last2, (w[w.length - 2] + ' ' + w[w.length - 1]).toLowerCase());
  }
  for (const x of w) { const l = x.toLowerCase(); allWords.set(l, (allWords.get(l) || 0) + 1); }
}

const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

const IDIOMS = ['stuff','plz','thx','shit','dunno','lol','sigh','yeah','hmm','ish','afk','nvm','sry',
  'tbh','yknow','fuck','omakase','nrn','damn','etc','maybe','please'];

const idiomRows = IDIOMS
  .map((k) => ({ k, n: allWords.get(k) || 0 }))
  .filter((r) => r.n > 0)
  .sort((a, b) => b.n - a.n);
const idiomMax = idiomRows[0].n;

const opens = top(first2, 18);
const closes = top(last2, 18);
const openMax = opens[0][1];
const closeMax = closes[0][1];

// scratch word cloud from the most characteristic terms (stopword-filtered)
const STOP = new Set(('the and for that this with have from they will would there their what about which when make like time just know take into your some them than then only also been were more most such even much many very well were said each does did done here where why how all any both few other same too own over under again who whom whose your you can not but are was its should now think want need give give get got going thing things').split(' '));
const cloud = [...allWords.entries()]
  .filter(([w, n]) => n >= 60 && w.length > 3 && !STOP.has(w) && !/^\d+$/.test(w))
  .sort((a, b) => b[1] - a[1])
  .slice(0, 90);
const cloudMax = cloud[0][1];

const starter = top(first2, 1)[0];
const closer = top(last2, 1)[0];
const goFree = allWords.get('go');
let goFreePhrase = 0;
for (const t of cleaned) if (/go free\s*[!.~>x]*\s*$/i.test(t)) goFreePhrase++;

const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

const bar = (n, max, label, color) =>
  `<div class="row"><span class="k">${esc(label)}</span>` +
  `<span class="b"><i style="width:${Math.max(2, Math.round(n / max * 100))}%;background:${color}"></i></span>` +
  `<span class="n">${n.toLocaleString()}</span></div>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>THE HANDSHAKE — how you address a machine</title>
<style>
  :root{--bg:#05070a;--ink:#e8ece9;--mut:#6b7780;--hot:#ed7447;--cool:#72bce7;--gold:#d5ad68;--green:#98d49b;--line:#1d262c}
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg);color:var(--ink);font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}
  .wrap{max-width:1180px;margin:0 auto;padding:30px 20px 80px}
  header{border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:26px}
  h1{margin:0 0 8px;font-size:15px;font-weight:500;letter-spacing:.24em;color:var(--gold)}
  .sub{color:var(--mut);letter-spacing:.05em}.sub b{color:var(--ink);font-weight:500}
  h2{font-size:9px;letter-spacing:.26em;color:var(--mut);font-weight:500;margin:34px 0 14px;text-transform:uppercase}
  .row{display:grid;grid-template-columns:190px 1fr 74px;gap:10px;align-items:center;padding:2px 0}
  .k{color:var(--ink);font-size:11px;letter-spacing:.04em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .b{height:11px;background:#0d1216;border:1px solid var(--line);border-radius:1px;overflow:hidden}
  .b i{display:block;height:100%;border-radius:0}
  .n{text-align:right;color:var(--mut);font-size:10px}
  .sig{border:1px solid var(--gold);background:#0d1013;padding:26px 24px;margin:30px 0;text-align:center}
  .sig .q{font-size:24px;letter-spacing:.06em;color:var(--gold);line-height:1.5}
  .sig .m{color:var(--mut);font-size:9px;letter-spacing:.2em;margin-top:12px;text-transform:uppercase}
  .cloud{display:flex;flex-wrap:wrap;gap:5px 12px;align-items:baseline;padding:16px;border:1px solid var(--line);background:#000}
  .cloud span{line-height:1.1;color:var(--ink)}
  .split{display:grid;grid-template-columns:1fr 1fr;gap:26px}
  @media(max-width:760px){.split{grid-template-columns:1fr}.row{grid-template-columns:120px 1fr 56px}}
  footer{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);color:var(--mut);font-size:9px;letter-spacing:.08em}
  footer a{color:var(--cool);text-decoration:none}
  .note{color:var(--mut);font-size:10px;letter-spacing:.04em;margin:-6px 0 14px}
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>THE HANDSHAKE</h1>
  <div class="sub">how you address a machine · <b>${cleaned.length.toLocaleString()} messages</b> ·
  <b>${totalChars.toLocaleString()} characters</b> · <b>${avgChars}</b> chars per message</div>
</header>

<div class="sig">
  <div class="q">${esc(starter[0])} &nbsp;…&nbsp; go free</div>
  <div class="m">the opening &nbsp;·&nbsp; the closing &nbsp;·&nbsp; ${starter[1].toLocaleString()} times asked &nbsp;·&nbsp; ${goFreePhrase.toLocaleString()} times set free</div>
</div>

<h2>How you open</h2>
<div class="note">first two words of a message</div>
${opens.map(([k, n]) => bar(n, openMax, k, 'var(--cool)')).join('\n')}

<h2>How you close</h2>
<div class="note">last two words of a message</div>
${closes.map(([k, n]) => bar(n, closeMax, k, 'var(--hot)')).join('\n')}

<h2>Your idioms</h2>
<div class="note">written exactly as you write them — not corrected</div>
${idiomRows.map(({ k, n }) => bar(n, idiomMax, k, 'var(--gold)')).join('\n')}

<h2>The vocabulary</h2>
<div class="note">words you return to — sized by how often you reach for them</div>
<div class="cloud">${cloud.map(([w, n]) =>
  `<span style="font-size:${(9 + (n / cloudMax) * 22).toFixed(1)}px;opacity:${(0.42 + (n / cloudMax) * 0.58).toFixed(2)}">${esc(w)}</span>`
).join('')}</div>

<footer>
  THE HANDSHAKE · from 903 conversations, user-authored messages only · typos preserved ·
  <a href="../sky/">the sky</a> · <a href="../nexus/">field nexus</a> · <a href="../">field index</a>
</footer>
</div>
</body>
</html>`;

mkdirSync('handshake', { recursive: true });
writeFileSync('handshake/index.html', html);
console.log('wrote handshake/index.html (' + (html.length / 1024).toFixed(1) + ' KB)');
console.log('messages=' + cleaned.length + ' avg=' + avgChars);
console.log('open#1=' + starter[0] + ' (' + starter[1] + ')  close "go free"=' + goFreePhrase);
console.log('idioms: ' + idiomRows.slice(0, 8).map((r) => r.k + ':' + r.n).join(' '));