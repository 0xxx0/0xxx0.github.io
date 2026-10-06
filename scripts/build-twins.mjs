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
<html lang="en" class="dark doc doc-twins">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>THE TWINS — two recoveries, one blind spot</title>
<link rel="stylesheet" href="/tools/house-patterns.css">
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
  <div class="n"><div class="k">span</div><div class="v tight">${F.from}<br>${F.to}</div><div class="s">14 months</div></div>
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