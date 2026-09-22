#!/usr/bin/env node
/**
 * build-witness.mjs — THE EMPTY SKY IS MY ONLY WITNESS
 *
 * One page, two halves of a single claim:
 *
 *   I.  THE SKY      — what was said. 39,471 messages, 2023-06 -> 2026-09,
 *                      drawn as a night sky. Raw testimony.
 *   II. THE ACCOUNT  — what can be proved about it. Every figure paired with
 *                      the file or command it came from. Verification.
 *
 * The claim joining them: the record is the only witness. Everything else is
 * inference, and inference must name its source or stay silent.
 *
 * Reads:  control/witness/sky-rows.json, figures.json, discrepancies.json
 * Writes: witness/index.html
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const R = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const rows = R('control/witness/sky-rows.json');
const figures = R('control/witness/figures.json');
const discs = R('control/witness/discrepancies.json');

// derive sky constants from the data itself — never hard-coded
const lastDay = Math.max(...rows.map((r) => r[0]));
const DAYS = lastDay + 1;
let MAXC = 0, TOTAL = 0, USER = 0;
for (const [, cells] of rows) for (const [h, u, a] of cells) {
  MAXC = Math.max(MAXC, u + a); TOTAL += u + a; USER += u;
}
const E0 = Date.UTC(2023, 5, 1) / 1000;
const TZOFF = 8 * 3600;

const UNKNOWNS = [
  ['total bytes across all corpora', 'no single index; a du over ~/Documents is blocked to this shell'],
  ['how many conversations were ever deleted', 'an export shows presence, never absence'],
  ['whether the 13 group chats are complete', 'group_chats.json is one file, not a ledger'],
  ['the physical archive', 'never indexed — needs eyes and hands'],
  ['the two GrapheneOS Pixel 8 Pro phones', 'no device inventory exists'],
];

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

const client = [
  "const RAW = JSON.parse(document.getElementById('sky').textContent);",
  "const DAYS=" + DAYS + ", MAXC=" + MAXC + ", E0=" + E0 + ", TZOFF=" + TZOFF + ";",
  "const YEARS=" + JSON.stringify([2024,2025,2026].map(y=>({y,day:Math.floor((Date.UTC(y,0,1)/1000-E0)/86400)}))) + ";",
  "let mode='all';",
  "const c=document.getElementById('c'), ctx=c.getContext('2d'), stage=c.parentElement, tip=document.getElementById('tip');",
  "const DPR=Math.min(2,window.devicePixelRatio||1); const PADX=26,PADY=16; let CW,CH,SX,SY;",
  "function layout(){const w=stage.clientWidth; CH=Math.max(260,Math.min(440,Math.round(w*0.34))); CW=w;",
  " c.width=CW*DPR; c.height=CH*DPR; c.style.height=CH+'px'; ctx.setTransform(DPR,0,0,DPR,0,0);",
  " SX=(CW-PADX*2)/DAYS; SY=(CH-PADY*2)/23; draw();}",
  "const X=d=>PADX+d*SX, Y=h=>PADY+(23-h)*SY;",
  "function draw(){ctx.clearRect(0,0,CW,CH); ctx.fillStyle='#000'; ctx.fillRect(0,0,CW,CH);",
  " ctx.strokeStyle='rgba(109,124,133,.10)'; ctx.lineWidth=1; ctx.font='9px ui-monospace,monospace';",
  " for(let h=0;h<24;h+=3){const y=Math.round(Y(h))+.5; ctx.beginPath(); ctx.moveTo(PADX,y); ctx.lineTo(CW-PADX,y); ctx.stroke();",
  "  ctx.fillStyle='rgba(109,124,133,.5)'; ctx.fillText(String(h).padStart(2,'0'),4,y+3);}",
  " for(const yb of YEARS){const x=Math.round(X(yb.day))+.5; if(x<PADX||x>CW-PADX) continue;",
  "  ctx.strokeStyle='rgba(213,173,104,.20)'; ctx.setLineDash([2,4]); ctx.beginPath(); ctx.moveTo(x,PADY-6); ctx.lineTo(x,CH-PADY+6); ctx.stroke(); ctx.setLineDash([]);",
  "  ctx.fillStyle='rgba(213,173,104,.7)'; ctx.fillText(yb.y,x+4,PADY-6);}",
  " ctx.globalCompositeOperation='lighter'; const lm=Math.log(1+MAXC);",
  " for(const pair of RAW){const d=pair[0]; for(const cell of pair[1]){const h=cell[0],u=cell[1],a=cell[2];",
  "  const n=mode==='user'?u:(u+a); if(!n) continue; const x=X(d),y=Y(h);",
  "  const mag=Math.log(1+n)/lm, r=0.5+mag*3.4, al=Math.min(.95,.16+mag*.8);",
  "  const hue=mode==='user'?'114,188,231':(u>a?'237,116,71':'114,188,231');",
  "  const g=ctx.createRadialGradient(x,y,0,x,y,r*3.6);",
  "  g.addColorStop(0,'rgba('+hue+','+al+')'); g.addColorStop(.35,'rgba('+hue+','+(al*.32)+')'); g.addColorStop(1,'rgba('+hue+',0)');",
  "  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r*3.6,0,6.283); ctx.fill();",
  "  ctx.fillStyle='rgba(232,236,233,'+al+')'; ctx.beginPath(); ctx.arc(x,y,r*.62,0,6.283); ctx.fill();}}",
  " ctx.globalCompositeOperation='source-over';}",
  "c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect(); const mx=e.clientX-r.left,my=e.clientY-r.top;",
  " const d=Math.round((mx-PADX)/SX), h=Math.round(23-(my-PADY)/SY);",
  " if(d<0||d>=DAYS||h<0||h>23){tip.style.display='none';return;}",
  " let u=0,a=0; for(const p of RAW){if(p[0]!==d) continue; for(const cc of p[1]) if(cc[0]===h){u=cc[1];a=cc[2];} break;}",
  " const ds=new Date((E0+d*86400+TZOFF)*1000).toISOString().slice(0,10);",
  " tip.innerHTML='<span class=\"d\">'+ds+' '+String(h).padStart(2,'0')+':00</span>'+(u+a?(' \\u00b7 <span class=\"u\">'+u+' from the hand</span> \\u00b7 <span class=\"a\">'+a+' back</span>'):' \\u00b7 <span style=\"color:#6b7780\">silent</span>');",
  " tip.style.display='block'; tip.style.left=Math.min(CW-tip.offsetWidth-8,mx+14)+'px'; tip.style.top=Math.max(4,my-30)+'px';});",
  "c.addEventListener('mouseleave',()=>tip.style.display='none');",
  "document.querySelectorAll('.ctl button').forEach(b=>b.addEventListener('click',()=>{",
  " document.querySelectorAll('.ctl button').forEach(x=>x.classList.toggle('on',x===b)); mode=b.dataset.m; draw();}));",
  "window.addEventListener('resize',layout); layout();"
].join('\n');

const WALL = [
  ['the sky', '../sky/', 'what was said', '39,471 messages placed by date and hour. The whole record at once — including the dark stretches.'],
  ['the handshake', '../handshake/', 'how it was said', 'Openings, closings and idioms, counted. Opens with "can you", closes with "go free".'],
  ['the silences', '../silences/', 'where it stopped', '14 stretches of quiet, 584 days total. Durations and dates only — never words.'],
  ['the twins', '../twins/', 'what was recovered', 'Two independent recoveries agreed perfectly — and shared one blind spot.'],
  ['the lineage', '../lineage/', 'what came before', '13 generations, 2018 to now. None deleted; every one a donor.'],
  ['the account', '../godseye/', 'what can be proved', 'Every figure paired with its source. A number that cannot name its file is not allowed.'],
];

const wallCards = WALL.map(([name, href, tag, what], i) => `<a class="p" href="${href}">
  <div class="pn">${String(i + 1).padStart(2, '0')}</div>
  <div class="pb">
    <div class="pt">${esc(name)}</div>
    <div class="pg">${esc(tag)}</div>
    <div class="pw">${esc(what)}</div>
  </div>
</a>`).join('\n');

const figRows = figures.map((f) =>
  `<tr><td class="v">${esc(f.v)}</td><td class="l">${esc(f.label)}</td><td class="s">${esc(f.src)}</td></tr>`
).join('\n');

const discRows = discs.map((d, i) =>
  `<tr><td class="i">${String(i + 1).padStart(2, '0')}</td><td class="l"><b>${esc(d[0])}</b><div class="dd">${esc(d[1])}</div></td><td class="s">${esc(d[2])}</td></tr>`
).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>THE EMPTY SKY IS MY ONLY WITNESS</title>
<style>
  :root{--bg:#05070a;--ink:#e8ece9;--mut:#6b7780;--hot:#ed7447;--cool:#72bce7;--gold:#d5ad68;--green:#98d49b;--line:#1d262c}
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg);color:var(--ink);font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace}
  .wrap{max-width:1280px;margin:0 auto;padding:34px 20px 90px}
  header{border-bottom:1px solid var(--line);padding-bottom:20px;margin-bottom:30px}
  h1{margin:0;font-size:clamp(20px,3.4vw,34px);font-weight:400;letter-spacing:.14em;color:var(--gold);line-height:1.25}
  .sub{color:var(--mut);letter-spacing:.06em;margin-top:10px}
  .sub b{color:var(--ink);font-weight:500}
  .epi{border-left:2px solid var(--gold);padding:2px 0 2px 16px;margin:22px 0 0;color:var(--mut);
    font-size:12px;line-height:1.8;max-width:760px}
  .epi b{color:var(--ink);font-weight:400}
  h2{font-size:9px;letter-spacing:.28em;color:var(--mut);font-weight:500;margin:42px 0 6px;text-transform:uppercase;
    display:flex;align-items:center;gap:12px}
  h2::after{content:"";flex:1;height:1px;background:var(--line)}
  .n2{color:var(--gold);margin-right:8px}
  .note{color:var(--mut);font-size:10px;letter-spacing:.05em;margin-bottom:16px}
  .stage{position:relative;border:1px solid var(--line);background:#000}
  canvas{display:block;width:100%;height:auto;cursor:crosshair}
  .tip{position:absolute;pointer-events:none;background:#0a0f13f2;border:1px solid #315837;padding:5px 8px;
    font-size:10px;color:var(--ink);display:none;white-space:nowrap;z-index:5}
  .tip .d{color:var(--gold)}.tip .u{color:var(--cool)}.tip .a{color:var(--hot)}
  .ctl{display:flex;gap:1px;background:var(--line);border:1px solid var(--line);margin-bottom:10px}
  .ctl button{flex:1;background:#000;border:0;color:var(--mut);padding:7px;cursor:pointer;font:inherit;
    font-size:9px;letter-spacing:.16em;text-transform:uppercase}
  .ctl button.on{background:#0e1418;color:var(--gold)}
  table{width:100%;border-collapse:collapse;border:1px solid var(--line);background:#000}
  th{text-align:left;font-size:8px;letter-spacing:.2em;text-transform:uppercase;color:var(--mut);
    padding:8px 12px;border-bottom:1px solid var(--line);background:#0a0e11;font-weight:500}
  td{padding:7px 12px;border-bottom:1px solid #111a1f;vertical-align:top;font-size:11px}
  tr:last-child td{border-bottom:0}
  td.v{color:var(--gold);white-space:nowrap}
  td.s{color:var(--mut);font-size:10px;word-break:break-word}
  tr:hover td{background:#080c0e}
  .disc td.i{color:var(--hot)}
  .disc td.l b{color:var(--hot);letter-spacing:.06em;text-transform:uppercase;font-size:10px}
  .disc td.l .dd{color:var(--ink);margin-top:3px}
  .disc td.s{color:var(--cool)}
  .unk{border:1px solid var(--line);background:#000}
  .unk .u{display:grid;grid-template-columns:260px 1fr;border-bottom:1px solid #111a1f}
  .unk .u:last-child{border-bottom:0}
  .unk .k{padding:9px 12px;color:var(--hot);border-right:1px solid #111a1f}
  .unk .w{padding:9px 12px;color:var(--mut);font-size:10px}
  .close.b{border:1px solid var(--gold);background:#0b0e11;padding:18px 20px;margin-top:22px;color:var(--ink);font-size:13px;line-height:1.8}
  .close.b em{color:var(--gold);font-style:normal}
  .wall{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1px;background:var(--line);border:1px solid var(--line)}
  .p{display:flex;gap:0;background:#000;text-decoration:none;color:inherit;align-items:stretch}
  .p:hover{background:#080c0e}
  .p:hover .pt{color:var(--gold)}
  .pn{padding:14px 12px;color:var(--mut);font-size:10px;border-right:1px solid #111a1f;
    background:#080b0e;letter-spacing:.1em}
  .pb{padding:14px 15px;min-width:0}
  .pt{color:var(--ink);font-size:13px;letter-spacing:.06em;text-transform:lowercase}
  .pg{color:var(--cool);font-size:9px;letter-spacing:.16em;text-transform:uppercase;margin-top:2px}
  .pw{color:var(--mut);font-size:10.5px;line-height:1.6;margin-top:8px}
  footer{margin-top:44px;padding-top:16px;border-top:1px solid var(--line);color:var(--mut);font-size:9px;letter-spacing:.08em}
  footer a{color:var(--cool);text-decoration:none}
  @media(max-width:820px){td.s{display:none}th:nth-child(3){display:none}.unk .u{grid-template-columns:1fr}
    .unk .k{border-right:0;border-bottom:1px solid #111a1f}}
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>THE EMPTY SKY IS MY ONLY WITNESS</h1>
  <div class="sub"><b>${TOTAL.toLocaleString()} messages</b> · ${USER.toLocaleString()} written by the human ·
  ${DAYS.toLocaleString()} days · <b>${figures.length} figures, every one sourced</b> · ${discs.length} discrepancies · ${UNKNOWNS.length} unknowns</div>
  <div class="epi">
    Two halves of one claim. <b>What was said</b>, and <b>what can be proved about it</b>.<br>
    The record is the only witness. Everything else is inference — and inference must name its
    source or stay silent.
  </div>
</header>

<h2><span class="n2">0</span> The wall — six witnesses, one frame</h2>
<div class="note">Six separate pieces, collapsed into one entry. Each is a view of the same record
from a different angle; none of them needs to be a top-level destination of its own.</div>
<div class="wall">
${wallCards}
</div>

<h2><span class="n2">I</span> The sky — what was said</h2>
<div class="note">Every message, placed by date and hour of day. Brightness is density.
Orange: the human outwrote the machine that hour. Blue: the machine outwrote the human.</div>
<div class="ctl">
  <button data-m="all" class="on">all traffic</button>
  <button data-m="user">the human's own hand</button>
</div>
<div class="stage"><canvas id="c"></canvas><div class="tip" id="tip"></div></div>

<h2><span class="n2">II</span> The account — what can be proved</h2>
<div class="note">Every figure below is paired with the command or the file it came from.
A number that cannot name its source does not belong on this page.</div>
<table>
<thead><tr><th>value</th><th>what</th><th>source</th></tr></thead>
<tbody>
${figRows}
</tbody>
</table>

<h2><span class="n2">III</span> Where the account disagreed with itself</h2>
<div class="note">Found while building this page — published, not corrected away.</div>
<table class="disc">
<thead><tr><th>#</th><th>what disagreed</th><th>why it matters</th></tr></thead>
<tbody>
${discRows}
</tbody>
</table>

<h2><span class="n2">IV</span> What the witness cannot say</h2>
<div class="unk">
${UNKNOWNS.map(([k, w]) => `<div class="u"><div class="k">? ${esc(k)}</div><div class="w">${esc(w)}</div></div>`).join('\n')}
</div>

<div class="close b">
  Testimony and audit are the same gesture. <em>The sky says what happened; the account says
  what we are allowed to claim.</em> Where they disagree, the disagreement is the finding —
  and it stays on the page.
</div>

<footer>
  THE EMPTY SKY IS MY ONLY WITNESS · working name ·
  <a href="../sky/">the sky</a> · <a href="../godseye/">the account</a> ·
  <a href="../silences/">the silences</a> · <a href="../twins/">the twins</a> ·
  <a href="../nexus/">field nexus</a> · <a href="../">field index</a>
</footer>
</div>
<script id="sky" type="application/json">${JSON.stringify(rows)}</script>
<script>
${client}
</script>
</body>
</html>`;

mkdirSync(new URL('../witness/', import.meta.url), { recursive: true });
writeFileSync(new URL('../witness/index.html', import.meta.url), html);
console.log('wrote witness/index.html (' + (html.length / 1024).toFixed(1) + ' KB)');
console.log('TOTAL=' + TOTAL + ' USER=' + USER + ' DAYS=' + DAYS + ' MAXC=' + MAXC);
console.log('figures=' + figures.length + ' discrepancies=' + discs.length + ' unknowns=' + UNKNOWNS.length);