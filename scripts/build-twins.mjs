#!/usr/bin/env node
/**
 * build-twins.mjs — THE TWINS / THE THIRD SURFACE
 *
 * Two independent recovery paths produced EXACTLY the same 893 conversations.
 * They also shared exactly the same blind spot: 13 group chats, 1,129 messages.
 *
 * Public page: counts, dates, structure. NO titles, NO content, NO member ids.
 * (The group chats involve a second person. Content stays local.)
 *
 * Input:  /tmp/sky/groupchat-manifest.json
 * Output: twins/index.html
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const man = JSON.parse(readFileSync('/tmp/sky/groupchat-manifest.json', 'utf8'));

const msgs = man.reduce((s, m) => s + m.messages, 0);
const withOthers = man.filter((m) => m.members > 1).length;
const solo = man.filter((m) => m.members === 1).length;

// verified facts from the cross-check
const F = {
  ours: 893, theirs: 893, onlyOurs: 0, onlyTheirs: 0,
  sqlite: 906, gap: 13,
  msgs, chars: 2583316, from: '2025-06-02', to: '2026-08-11',
  zipSha: '534837a4a8ebc0dc8645b30cd0e8c571444eb41f0a18f762fa7d7a3dfa1b007e',
  zipBytes: 5076259891, members: 3728,
  retrySha: '42df040d07f661b69c32a1a74e80903b835b68ecd5ec4faa5580113985f94a92',
  retryBytes: 1170210816,
};

const bar = (n, max) => Math.max(3, Math.round(n / max * 100));

const counts = man.map((m) => m.messages);
const maxN = Math.max(...counts);
const byMonth = {};
for (const m of man) { const k = String(m.created).slice(0, 7); byMonth[k] = (byMonth[k] || 0) + m.messages; }

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>THE TWINS — two recoveries, one blind spot</title>
<style>
  :root{--bg:#05070a;--ink:#e8ece9;--mut:#6b7780;--hot:#ed7447;--cool:#72bce7;--gold:#d5ad68;--green:#98d49b;--line:#1d262c}
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--bg);color:var(--ink);font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace}
  .wrap{max-width:1180px;margin:0 auto;padding:30px 20px 80px}
  header{border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:28px}
  h1{margin:0 0 8px;font-size:15px;font-weight:500;letter-spacing:.24em;color:var(--gold)}
  .sub{color:var(--mut);letter-spacing:.05em}.sub b{color:var(--ink);font-weight:500}
  h2{font-size:9px;letter-spacing:.26em;color:var(--mut);font-weight:500;margin:32px 0 14px;text-transform:uppercase}
  .twins{display:grid;grid-template-columns:1fr 54px 1fr;align-items:stretch;gap:0;border:1px solid var(--line);background:#000}
  .t{padding:18px}
  .t.a{border-right:1px solid var(--line)}
  .t.b{border-left:1px solid var(--line)}
  .t .who{font-size:9px;letter-spacing:.2em;color:var(--mut);text-transform:uppercase;margin-bottom:10px}
  .t.a .who{color:var(--cool)} .t.b .who{color:var(--gold)}
  .t .big{font-size:38px;color:var(--ink);letter-spacing:-.02em;line-height:1}
  .t .cap{color:var(--mut);font-size:9px;letter-spacing:.1em;margin-top:6px}
  .t .sha{color:var(--mut);font-size:8px;word-break:break-all;margin-top:12px;opacity:.75;line-height:1.5}
  .mid{display:flex;align-items:center;justify-content:center;background:#080b0e;border-left:1px solid var(--line);border-right:1px solid var(--line)}
  .eq{color:var(--green);font-size:22px}
  .verdict{border:1px solid #315837;background:#07100a;padding:14px 16px;margin-top:14px;color:var(--green);font-size:11px;letter-spacing:.05em}
  .verdict b{color:#c6f0c9}
  .trap{border:1px solid #5a3a3f;background:#100708;padding:16px 18px;margin-top:16px}
  .trap .h{color:var(--hot);font-size:11px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:8px}
  .trap .t{color:var(--ink);font-size:12px;line-height:1.7}
  .trap .t em{color:var(--gold);font-style:normal}
  .nums{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);margin-top:14px}
  .n{background:#000;padding:12px 14px}
  .n .k{color:var(--mut);font-size:8px;letter-spacing:.18em;text-transform:uppercase}
  .n .v{color:var(--ink);font-size:22px;letter-spacing:.02em;margin-top:4px}
  .n .v.hot{color:var(--hot)} .n .v.gold{color:var(--gold)}
  .n .s{color:var(--mut);font-size:9px;margin-top:3px}
  .rows{margin-top:8px}
  .row{display:grid;grid-template-columns:64px 1fr 52px;gap:10px;align-items:center;padding:2px 0}
  .row .k{color:var(--mut);font-size:9px;letter-spacing:.08em}
  .row .b{height:9px;background:#0d1216;border:1px solid var(--line)}
  .row .b i{display:block;height:100%;background:var(--cool)}
  .row .n2{text-align:right;color:var(--mut);font-size:9px}
  footer{margin-top:38px;padding-top:16px;border-top:1px solid var(--line);color:var(--mut);font-size:9px;letter-spacing:.08em}
  footer a{color:var(--cool);text-decoration:none}
  .redact{border:1px solid var(--line);background:#080b0e;padding:12px 15px;margin-top:16px;color:var(--mut);font-size:10px;line-height:1.7}
  .redact b{color:var(--gold)}
  @media(max-width:820px){.twins{grid-template-columns:1fr}.t.a,.t.b{border:0}
    .mid{border:0;padding:8px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}}
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>THE TWINS</h1>
  <div class="sub">two independent recoveries of the same export &nbsp;·&nbsp;
  <b>they agree perfectly</b> &nbsp;·&nbsp; <b>and share the same blind spot</b></div>
</header>

<h2>Two paths, same result</h2>
<div class="twins">
  <div class="t a">
    <div class="who">path one — hermes</div>
    <div class="big">${F.ours}</div>
    <div class="cap">conversations, extracted from the partial archive</div>
    <div class="sha">${F.retryBytes.toLocaleString()} bytes<br>sha256 ${F.retrySha.slice(0,32)}…</div>
  </div>
  <div class="mid"><div class="eq">≡</div></div>
  <div class="t b">
    <div class="who">path two — codex</div>
    <div class="big">${F.theirs}</div>
    <div class="cap">conversations, from the complete archive</div>
    <div class="sha">${F.zipBytes.toLocaleString()} bytes<br>sha256 ${F.zipSha.slice(0,32)}…</div>
  </div>
</div>
<div class="verdict"><b>IDENTICAL SET.</b> ${F.onlyOurs} present only in one · ${F.onlyTheirs} present only in the other · ${F.theirs} shared.
Two different archives, two different sizes, two different hashes — and the same ${F.theirs} conversations, id for id.</div>

<h2>The third surface</h2>
<div class="nums">
  <div class="n"><div class="k">group chats</div><div class="v gold">${man.length}</div><div class="s">in no JSON extraction</div></div>
  <div class="n"><div class="k">messages</div><div class="v hot">${F.msgs.toLocaleString()}</div><div class="s">recovered just now</div></div>
  <div class="n"><div class="k">characters</div><div class="v">${(F.chars/1e6).toFixed(2)}M</div><div class="s">content</div></div>
  <div class="n"><div class="k">span</div><div class="v" style="font-size:14px">${F.from}<br>${F.to}</div><div class="s">14 months</div></div>
  <div class="n"><div class="k">one person</div><div class="v">${solo}</div><div class="s">solo threads</div></div>
  <div class="n"><div class="k">with another</div><div class="v">${withOthers}</div><div class="s">shared threads</div></div>
</div>

<div class="rows">
  ${man.sort((a,b)=>b.messages-a.messages).map((m,i) =>
    `<div class="row"><span class="k">thread ${String(i+1).padStart(2,'0')}</span><span class="b"><i style="width:${bar(m.messages,maxN)}%"></i></span><span class="n2">${m.messages}</span></div>`
  ).join('\n  ')}
</div>

<h2>Why the two paths agreed</h2>
<div class="trap">
  <div class="h">the trap</div>
  <div class="t">
    Both extractions read <em>conversations-*.json</em>. Neither read <em>group_chats.json</em> —
    a separate member of the same archive, sitting right beside it.<br><br>
    They did not agree because either was complete. They agreed because they
    <em>read the same file</em>. Two methods sharing a blind spot will agree
    perfectly, and the agreement looks exactly like proof.
  </div>
</div>

<h2>What broke the tie</h2>
<div class="trap" style="border-color:#1f4a5e;background:#060d11">
  <div class="h" style="color:var(--cool)">the discrepancy</div>
  <div class="t">
    A third artifact — a forensic SQLite corpus — indexed <em>${F.sqlite}</em> conversations
    against the JSON exports' <em>${F.ours}</em>. That <em>${F.gap}</em>-conversation disagreement
    was the only signal that anything was missing. Every one of the ${F.gap} was
    <em>kind=group</em>.<br><br>
    The error was not the discovery. <em>The error was the map.</em>
  </div>
</div>

<div class="redact">
  <b>REDACTED BY DESIGN.</b> The ${man.length} group chats involve a second person, so this page
  publishes counts, dates and structure — never titles, never text, never member identifiers.
  The extracted content is held locally and is not in this repository.
</div>

<footer>
  THE TWINS · agreement is not completeness ·
  <a href="../sky/">the sky</a> · <a href="../handshake/">the handshake</a> ·
  <a href="../silences/">the silences</a> · <a href="../nexus/">field nexus</a> · <a href="../">field index</a>
</footer>
</div>
</body>
</html>`;

mkdirSync('twins', { recursive: true });
writeFileSync('twins/index.html', html);
console.log('wrote twins/index.html (' + (html.length / 1024).toFixed(1) + ' KB)');
console.log('group chats=' + man.length + ' msgs=' + msgs + ' solo=' + solo + ' shared=' + withOthers);