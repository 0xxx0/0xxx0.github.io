#!/usr/bin/env node
/**
 * build-encrypted-digests.mjs — encrypted /digests/ generator (PLAN-2026-10-06 §1).
 *
 * WHAT IT DOES
 *   Compiles the two local digest streams exactly the way the archive reader's
 *   /digests route does (sources canonical on disk, newest first, at most 14 files
 *   per stream), encrypts the compiled payload with AES-256-GCM under a key derived
 *   from a passphrase by PBKDF2-SHA256, and writes ONE self-contained
 *   digests/index.html whose public bytes are ciphertext + static code only.
 *   The browser derives the same key with WebCrypto and decrypts + renders
 *   client-side. Same primitive both ends (Node WebCrypto-compatible crypto.subtle
 *   here, browser WebCrypto there) — no build step, no dependencies, no packages.
 *
 * USAGE
 *   node tools/build-encrypted-digests.mjs                              # build
 *   node tools/build-encrypted-digests.mjs --verify                     # decrypt what was built, compare to source
 *   node tools/build-encrypted-digests.mjs --passphrase-file <p> --out <path>   # variant builds (tests only)
 *
 * SECRET LAW
 *   The passphrase lives ONLY at
 *       ~/.hermes/profiles/kestrel/secrets/digests-passphrase   (chmod 600)
 *   This script never prints it, never embeds it and never writes it anywhere else.
 *   Rotation = replace that file and rebuild; git history keeps old ciphertext.
 *
 * HONEST CAVEAT (say it wherever the page is handed over)
 *   The ciphertext is PUBLIC and offline-brute-forceable. Passphrase strength IS
 *   the security. The page is noindexed and robots.txt disallows the whole site,
 *   but noindex is etiquette, not secrecy.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOME = os.homedir();
const SECRETS = path.join(HOME, '.hermes', 'profiles', 'kestrel', 'secrets', 'digests-passphrase');
const ITER = 600000;               // PBKDF2-SHA256 (OWASP 2023 floor), native on both ends
const MAX_PER_STREAM = 14;         // the archive reader's own cap
const TZ = 'Asia/Singapore';       // house offset is +08:00

const STREAMS = [
  {
    id: 'walls',
    title: 'Message walls — raw room chatter (msg-digest, 09:00 daily)',
    source: 'cron/output/0245d64aa52a · msg-digest',
    dir: path.join(HOME, '.hermes/profiles/kestrel/cron/output/0245d64aa52a'),
    pattern: /^.*\.md$/,
    render: 'pre',
  },
  {
    id: 'days',
    title: 'Day digests — what moved (day-digest, 18:45 daily)',
    source: 'AXIS/work/day-digest · day-digest',
    dir: path.join(HOME, 'void-anchor/AXIS/work/day-digest'),
    pattern: /^DIGEST-.*\.md$/,
    render: 'md',
  },
];

const argv = process.argv.slice(2);
const flag = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt; };
const VERIFY = argv.includes('--verify');
const PASS_FILE = path.resolve(flag('--passphrase-file', SECRETS));
const OUT = path.resolve(ROOT, flag('--out', 'digests/index.html'));

// ---------------------------------------------------------------------------
// compile — the archive reader's /digests route, re-derived from disk
// ---------------------------------------------------------------------------
function parts(ms) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date(ms));
  return p.reduce((a, x) => (a[x.type] = x.value, a), {});
}
const stamp = (ms) => { const p = parts(ms); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+08:00`; };
const clock = (ms) => { const p = parts(ms); return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`; };

function compile() {
  return STREAMS.map((s) => {
    if (!existsSync(s.dir)) throw new Error(`source dir missing: ${s.dir}`);
    const files = readdirSync(s.dir)
      .filter((n) => s.pattern.test(n))
      .map((n) => path.join(s.dir, n))
      .filter((f) => { try { return statSync(f).isFile(); } catch { return false; } })
      .sort()                     // same order as the reader: sorted(reverse=True)
      .reverse()
      .slice(0, MAX_PER_STREAM);
    const items = files.map((f) => {
      const text = readFileSync(f, 'utf8');
      return {
        name: path.basename(f),
        bytes: Buffer.byteLength(text, 'utf8'),
        mtime: clock(statSync(f).mtimeMs),
        text,
      };
    });
    return {
      id: s.id,
      title: s.title,
      source: s.source,
      render: s.render,
      items,
      bytes: items.reduce((n, it) => n + it.bytes, 0),
    };
  });
}

// ---------------------------------------------------------------------------
// crypto — AES-256-GCM under PBKDF2-SHA256(passphrase, salt)
// ---------------------------------------------------------------------------
function aadString(iter) { return `0xxx0/digests/v1|PBKDF2-SHA256|${iter}|AES-256-GCM`; }

function readPassphrase(file) {
  if (!existsSync(file)) throw new Error(`passphrase file missing: ${file}`);
  const raw = readFileSync(file, 'utf8');
  const pass = raw.replace(/\s+$/, '');
  if (pass.length < 16) throw new Error('passphrase file holds fewer than 16 characters — refusing');
  return pass;
}

function encryptEnvelope(payload, pass) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const aad = aadString(ITER);
  const key = crypto.pbkdf2Sync(pass, salt, ITER, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const ct = Buffer.concat([body, cipher.getAuthTag()]);   // WebCrypto expects tag appended
  return {
    schema: '0xxx0/encrypted-digests/v1',
    built_at: stamp(Date.now()),
    meta: {
      streams: payload.streams.map((s) => ({ id: s.id, title: s.title, files: s.items.length, bytes: s.bytes })),
      plaintext_bytes: payload.streams.reduce((n, s) => n + s.bytes, 0),
    },
    crypto: {
      kdf: 'PBKDF2-SHA256', iter: ITER, alg: 'AES-256-GCM',
      salt: salt.toString('base64'), iv: iv.toString('base64'),
      aad, ct: ct.toString('base64'),
    },
  };
}

// ---------------------------------------------------------------------------
// page — ONE self-contained HTML: ciphertext + static code, noindex
// ---------------------------------------------------------------------------
function renderHtml(env) {
  const envelope = JSON.stringify(env);
  if (/[\u2028\u2029]/.test(envelope)) throw new Error('envelope carries a JS-illegal line separator');
  const meta = env.meta;
  const chips = meta.streams.map((s, i) => `<a class="chip" href="#dg${i}">${s.title}</a>`).join('');
  return String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="referrer" content="no-referrer">
<title>Digests — encrypted</title>
<style>
:root{color-scheme:dark;--fg:#e8e6e1;--dim:#8f8b83;--bg:#0d0d0c;--line:#2a2a27;--hi:#f2f0ea;--bad:#e06c5a}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--fg);font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif}
.wrap{max-width:52rem;margin:0 auto;padding:2rem 1.1rem 4rem}
header{border-bottom:2px solid var(--line);padding-bottom:1rem;margin-bottom:1.25rem}
h1{font-size:1.5rem;letter-spacing:.02em;margin:0 0 .35rem;text-transform:uppercase}
.sub{color:var(--dim);font-size:.86rem;margin:0}
code,kbd{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85em}
.rule{border:1px solid var(--line);padding:.7rem .85rem;margin:1rem 0;color:var(--dim);font-size:.84rem}
.rule b{color:var(--fg)}
form{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin:1.25rem 0 .5rem}
label{font-size:.8rem;color:var(--dim);text-transform:uppercase;letter-spacing:.08em}
input[type=password]{flex:1 1 16rem;min-width:0;background:#000;color:var(--fg);border:1px solid var(--line);padding:.6rem .7rem;font:14px ui-monospace,Menlo,monospace}
input[type=password]:focus{outline:2px solid var(--dim);outline-offset:-1px}
button{background:var(--hi);color:#111;border:1px solid var(--hi);padding:.6rem 1.1rem;font:600 13px/1 ui-sans-serif,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.1em;cursor:pointer}
button.ghost{background:transparent;color:var(--fg);border-color:var(--line)}
button:disabled{opacity:.5;cursor:wait}
.err{color:var(--bad);font-size:.9rem;border:1px solid var(--bad);padding:.55rem .7rem;margin:.75rem 0}
.chips{display:flex;flex-wrap:wrap;gap:.4rem;margin:1rem 0}
.chip{border:1px solid var(--line);padding:.3rem .55rem;font-size:.78rem;color:var(--fg);text-decoration:none}
.chip:hover{border-color:var(--dim)}
h2{font-size:1.05rem;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--line);padding-bottom:.3rem;margin:2rem 0 .4rem}
.src{color:var(--dim);font-size:.8rem;margin:0 0 .8rem}
details{border:1px solid var(--line);margin:.5rem 0;padding:.5rem .7rem}
summary{cursor:pointer;font-size:.88rem;color:var(--hi)}
summary::marker{color:var(--dim)}
.meta{color:var(--dim);font-weight:400}
pre{white-space:pre-wrap;word-break:break-word;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;margin:.6rem 0 0;color:#d9d6cf}
.prose{font-size:.95rem}
.prose h1,.prose h2,.prose h3{font-size:1rem;border-bottom:1px solid var(--line);padding-bottom:.2rem}
.prose ul{padding-left:1.2rem}
.prose li{margin:.2rem 0}
.prose a{color:var(--hi)}
.prose blockquote{border-left:3px solid var(--line);margin:.5rem 0;padding:.1rem .8rem;color:var(--dim)}
.prose hr{border:0;border-top:1px solid var(--line);margin:1rem 0}
footer{border-top:1px solid var(--line);margin-top:2.5rem;padding-top:1rem;color:var(--dim);font-size:.8rem}
footer a{color:var(--fg)}
.hide{display:none}
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>Digests — encrypted</h1>
  <p class="sub" id="headmeta">2 streams · ${meta.streams.reduce((n, s) => n + s.files, 0)} files · ${meta.plaintext_bytes.toLocaleString('en-US')} bytes compiled ${env.built_at} · AES-256-GCM · PBKDF2-SHA256 × ${env.crypto.iter}</p>
</header>

<div class="rule">
  <b>Public bytes = ciphertext + static code.</b> Nothing here decrypts without the passphrase:
  key derivation (PBKDF2-SHA256, ${env.crypto.iter.toLocaleString('en-US')} iterations) and AES-256-GCM both run in this page, in your browser.
  The source files stay canonical on disk; this page only reads them.
  <br><br>
  Honest caveat: the ciphertext is public and offline-brute-forceable — <b>passphrase strength is the security</b>.
  Rebuilt copies stay in git history, so rotating means a new passphrase (old blobs stay old).
  This route is noindexed and the site robots.txt disallows everything; noindex is etiquette, not secrecy.
</div>

<form id="gate" autocomplete="off">
  <label for="pp">passphrase</label>
  <input id="pp" type="password" spellcheck="false" autocapitalize="off" autocorrect="off">
  <button type="submit" id="go">unlock</button>
</form>
<p class="err hide" id="err" role="alert"></p>

<div id="toc" class="chips hide">${chips}</div>
<div id="out"></div>

<footer>
  <button class="ghost" id="lock" type="button" hidden>lock</button>
  <p>Decrypts locally — no network call carries the passphrase. <a href="/">FIELD INDEX</a> · noindex · route <code>/digests/</code></p>
</footer>
</div>

<script id="dg-envelope">const DG = ${envelope};</script>
<script id="dg-engine">
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var HEAD0 = $('headmeta').textContent;   /* restored by the lock action */

  function bytes(s) {
    var bin = atob(s), a = new Uint8Array(bin.length), i;
    for (i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }

  async function unlock(pass) {
    var c = DG.crypto, base;
    base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    var key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: bytes(c.salt), iterations: c.iter, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    var pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes(c.iv), additionalData: new TextEncoder().encode(c.aad), tagLength: 128 },
      key, bytes(c.ct));
    return new TextDecoder().decode(pt);
  }

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* inline md over ALREADY-ESCAPED text — nothing raw ever reaches innerHTML */
  function inline(s) {
    var t = s;
    t = t.replace(/\x60([^\x60]+)\x60/g, function (m, c) { return '<code>' + c + '</code>'; });
    t = t.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|#)[^)\s]+)\)/g, function (m, txt, url) {
      return '<a href="' + url + '">' + txt + '</a>';
    });
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    return t;
  }

  /* small markdown subset: headings, lists, quotes, hr, code spans, links, emphasis */
  function mdToHtml(src) {
    var lines = String(src).split(/\r?\n/).map(esc), out = [], para = [], list = null, i, line;
    function flushP() { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } }
    function flushL() { if (list) { out.push('<' + list.tag + '>' + list.items.join('') + '</' + list.tag + '>'); list = null; } }
    function flush() { flushP(); flushL(); }
    for (i = 0; i < lines.length; i++) {
      line = lines[i];
      if (!line.trim()) { flush(); continue; }
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) { flush(); out.push('<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'); continue; }
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flush(); out.push('<hr>'); continue; }
      var li = line.match(/^\s*[-*]\s+(.*)$/);
      if (li) { flushP(); if (!list || list.tag !== 'ul') { flushL(); list = { tag: 'ul', items: [] }; } list.items.push('<li>' + inline(li[1]) + '</li>'); continue; }
      var ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ol) { flushP(); if (!list || list.tag !== 'ol') { flushL(); list = { tag: 'ol', items: [] }; } list.items.push('<li>' + inline(ol[1]) + '</li>'); continue; }
      var bq = line.match(/^&gt;\s?(.*)$/);
      if (bq) { flush(); out.push('<blockquote>' + inline(bq[1]) + '</blockquote>'); continue; }
      flushL(); para.push(line);
    }
    flush();
    return out.join('\n');
  }

  function render(payload) {
    var toc = $('toc'), out = $('out'), html = [], i, j, s, it;
    for (i = 0; i < payload.streams.length; i++) {
      s = payload.streams[i];
      html.push('<h2 id="dg' + i + '">' + esc(s.title) + '</h2>');
      html.push('<p class="src">' + esc(s.source) + ' · ' + s.items.length + ' file(s) · newest first</p>');
      if (!s.items.length) html.push('<p class="src">none yet.</p>');
      for (j = 0; j < s.items.length; j++) {
        it = s.items[j];
        html.push('<details open><summary>' + esc(it.name) + ' <span class="meta">· ' +
          it.bytes.toLocaleString('en-US') + ' B · ' + esc(it.mtime) + '</span></summary>');
        if (s.render === 'md') html.push('<div class="prose">' + mdToHtml(it.text) + '</div>');
        else html.push('<pre></pre>');           /* textContent — no HTML path at all */
        html.push('</details>');
      }
    }
    out.innerHTML = html.join('\n');
    var pres = out.querySelectorAll('pre'), k = 0;
    for (i = 0; i < payload.streams.length; i++) {
      for (j = 0; j < payload.streams[i].items.length; j++) {
        if (payload.streams[i].render !== 'md') { pres[k].textContent = payload.streams[i].items[j].text; k++; }
      }
    }
    toc.classList.remove('hide');
    $('lock').hidden = false;
    $('gate').classList.add('hide');
    $('headmeta').textContent = 'unlocked · ' + payload.streams.length + ' streams · ' +
      DG.meta.streams.reduce(function (n, x) { return n + x.files; }, 0) + ' files · ' +
      DG.meta.plaintext_bytes.toLocaleString('en-US') + ' bytes · decrypted in this tab';
  }

  $('gate').addEventListener('submit', function (e) {
    e.preventDefault();
    var pass = $('pp').value, err = $('err'), go = $('go');
    err.classList.add('hide');
    if (!pass) { err.textContent = 'Enter the passphrase.'; err.classList.remove('hide'); return; }
    go.disabled = true; go.textContent = 'deriving…';
    unlock(pass).then(function (text) {
      var payload = JSON.parse(text);
      render(payload);
      $('pp').value = '';
    }).catch(function () {
      err.textContent = 'Wrong passphrase — or the ciphertext was altered (GCM tag failed). The page source holds no key: only the passphrase decrypts.';
      err.classList.remove('hide');
      $('pp').select();
    }).then(function () {
      go.disabled = false; go.textContent = 'unlock';
    });
  });

  $('lock').addEventListener('click', function () {
    $('out').innerHTML = '';
    $('toc').classList.add('hide');
    $('lock').hidden = true;
    $('gate').classList.remove('hide');
    $('pp').value = '';
    $('headmeta').textContent = HEAD0;
    $('pp').focus();
  });
})();
</script>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// verify — decrypt the built page with the real passphrase, compare to source
// ---------------------------------------------------------------------------
function verify() {
  if (!existsSync(OUT)) throw new Error(`nothing to verify: ${OUT} does not exist`);
  const html = readFileSync(OUT, 'utf8');
  const m = html.match(/const DG = (\{[^\n]*\});/);
  if (!m) throw new Error('envelope not found in the built page');
  const env = JSON.parse(m[1]);

  // every inline script must parse — same probe tools/validate-public.mjs runs
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((x) => x[1]);
  scripts.forEach((body, i) => { if (body.trim()) new Function(body); });

  const pass = readPassphrase(PASS_FILE);
  const c = env.crypto;
  const key = crypto.pbkdf2Sync(pass, Buffer.from(c.salt, 'base64'), c.iter, 32, 'sha256');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(c.iv, 'base64'));
  d.setAAD(Buffer.from(c.aad, 'utf8'));
  d.setAuthTag(Buffer.from(c.ct, 'base64').subarray(-16));
  const payload = JSON.parse(Buffer.concat([d.update(Buffer.from(c.ct, 'base64').subarray(0, -16)), d.final()]).toString('utf8'));

  // byte-compare against a fresh compile of the canonical sources
  const fresh = compile();
  const problems = [];
  if (payload.streams.length !== fresh.length) problems.push('stream count');
  fresh.forEach((s, i) => {
    const got = payload.streams[i];
    if (!got) { problems.push(`missing stream ${s.id}`); return; }
    if (got.items.length !== s.items.length) problems.push(`${s.id}: file count ${got.items.length} != ${s.items.length}`);
    s.items.forEach((it, j) => {
      const g = got.items[j];
      if (!g || g.name !== it.name) { problems.push(`${s.id}[${j}] name`); return; }
      if (g.text !== it.text) problems.push(`${s.id}[${j}] ${it.name}: plaintext differs from source`);
    });
  });
  if (c.iter !== ITER) problems.push('iteration count drifted');
  if (c.aad !== aadString(c.iter)) problems.push('aad drifted');

  const files = payload.streams.reduce((n, s) => n + s.items.length, 0);
  const bytes = payload.streams.reduce((n, s) => n + s.bytes, 0);
  if (problems.length) throw new Error('VERIFY FAIL: ' + problems.join('; '));
  console.log(`VERIFY PASS  ${path.relative(ROOT, OUT)}`);
  console.log(`  decrypt ok (AES-256-GCM, PBKDF2-SHA256 x${c.iter}) · ${scripts.filter((s) => s.trim()).length} inline scripts parse`);
  payload.streams.forEach((s) => console.log(`  ${s.id}: ${s.items.length} file(s), ${s.bytes} B — byte-identical to source`));
  console.log(`  total ${files} files, ${bytes} B plaintext, page ${(statSync(OUT).size)} B`);
}

// ---------------------------------------------------------------------------
function build() {
  const pass = readPassphrase(PASS_FILE);
  const payload = { schema: '0xxx0/encrypted-digests/payload-v1', streams: compile() };
  const env = encryptEnvelope(payload, pass);
  const html = renderHtml(env);
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, html);
  const files = payload.streams.reduce((n, s) => n + s.items.length, 0);
  const bytes = payload.streams.reduce((n, s) => n + s.bytes, 0);
  console.log(`BUILT  ${path.relative(ROOT, OUT)}`);
  payload.streams.forEach((s) => console.log(`  ${s.id}: ${s.items.length} file(s), ${s.bytes} B`));
  console.log(`  ${files} files · ${bytes} B plaintext -> ${(statSync(OUT).size)} B page (ciphertext + static code)`);
  console.log(`  ${env.crypto.alg} · ${env.crypto.kdf} x${env.crypto.iter} · salt 16B · iv 12B`);
}

try {
  if (VERIFY) verify(); else build();
} catch (e) {
  console.error(String(e && e.message || e));
  process.exit(1);
}
