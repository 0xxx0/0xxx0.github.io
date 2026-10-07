#!/usr/bin/env node
/* PALETTE + STATUS SPINE PROBE (donor brief §2 moves 1+2)
 *
 * Drives a real headless Chrome over the DevTools protocol at 390px and asserts
 * the two moves on the shipped line, not on a paraphrase of it:
 *   · Ctrl/⌘K opens the palette, ↑↓/↵ still navigate, alias rows execute the
 *     omnibar's REAL action (field-omnibar event), exact paths beat aliases
 *   · empty query = held object, then USE order, capped (no fold violation)
 *   · :reset clears the bounded localStorage learning
 *   · the status spine sits INSIDE the URLbar line, counts match
 *     /nexus/board.html and its own `generated … UTC` stamp rides along
 *   · document scrollWidth never exceeds the 390px viewport
 *
 * Run:  node tools/palette-spine-probe.mjs [repo-root] [width] [height]
 *       (default: cwd, 390x844 — the phone the fold was proven on)
 * Exit 0 only when every check passes; the JSON blob is the receipt.
 *
 * Not a CI gate: it needs a browser and ~90s, and a NEW blocking gate binds
 * every writer in this shared repo. The durable, always-run assertions live in
 * tools/field-urlbar-selftest.mjs (wired into .github/workflows/field-urlbar.yml);
 * this probe is the evidence run behind them, re-runnable by anyone.
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';

const ROOT = path.resolve(process.argv[2] || process.cwd());
const WIDTH = Number(process.argv[3] || 390);
const HEIGHT = Number(process.argv[4] || 844);
const {browserBin} = await import(path.join(ROOT, 'tools/browser-bin.mjs'));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.csv': 'text/csv'
};

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  if (process.env.PROBE_LOG) console.error('[req]', req.url);
  let p = path.join(ROOT, rel);
  if (rel.endsWith('/')) p = path.join(p, 'index.html');
  if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404, {'content-type': 'text/plain'}); res.end('not found ' + rel); return; }
    res.writeHead(200, {'content-type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store'});
    res.end(buf);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const ORIGIN = 'http://127.0.0.1:' + PORT;

const freePort = () => new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const CDP = await freePort();
const UDD = fs.mkdtempSync(path.join(os.tmpdir(), 'palette-probe-'));
const bin = browserBin();
const chrome = spawn(bin, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  '--hide-scrollbars', '--no-first-run', '--disable-extensions',
  '--user-data-dir=' + UDD, '--remote-debugging-port=' + CDP, '--remote-debugging-address=127.0.0.1',
  '--window-size=' + Math.max(500, WIDTH) + ',' + HEIGHT,
  'about:blank'
], {stdio: ['ignore', 'ignore', 'pipe']});
let chromeErr = '';
chrome.stderr.on('data', d => { chromeErr += d; });
const cleanup = () => { try { chrome.kill('SIGKILL'); } catch {} try { server.close(); } catch {} try { fs.rmSync(UDD, {recursive: true, force: true}); } catch {} };

const sleep = ms => new Promise(r => setTimeout(r, ms));

let ws = null, msgId = 0;
const pending = new Map();
const exceptions = [];
const badResponses = [];
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++msgId; pending.set(id, {resolve, reject});
  ws.send(JSON.stringify({id, method, params}));
});
const ev = async expression => {
  const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
  if (r.exceptionDetails) throw new Error('evaluate: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result?.value;
};
const key = (type, opts) => send('Input.dispatchKeyEvent', {type, ...opts});
const press = async k => { await key('keyDown', {key: k, windowsVirtualKeyCode: k === 'Enter' ? 13 : 0, nativeVirtualKeyCode: k === 'Enter' ? 13 : 0}); await key('keyUp', {key: k, windowsVirtualKeyCode: k === 'Enter' ? 13 : 0, nativeVirtualKeyCode: k === 'Enter' ? 13: 0}); };

async function connect() {
  let target = null;
  for (let i = 0; i < 80 && !target; i++) {
    try { target = (await fetch('http://127.0.0.1:' + CDP + '/json/list').then(r => r.json())).find(t => t.type === 'page'); } catch { /* not up */ }
    if (!target) await sleep(250);
  }
  if (!target) throw Error('no CDP target · chrome stderr: ' + chromeErr.slice(-600));
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.method + ': ' + JSON.stringify(m.error))) : p.resolve(m.result); return; }
    if (m.method === 'Runtime.exceptionThrown') exceptions.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0, 300));
    if (m.method === 'Log.entryAdded' && m.params.entry?.level === 'error') exceptions.push('[log] ' + String(m.params.entry.text).slice(0, 300));
    if (m.method === 'Network.responseReceived') { const r = m.params.response; if (r && r.status >= 400) badResponses.push({url: r.url, status: r.status}); }
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', {width: WIDTH, height: HEIGHT, deviceScaleFactor: 3, mobile: WIDTH < 800});
}

const checks = [];
const check = (name, ok, data) => { checks.push({name, ok: !!ok, data}); return !!ok; };
const readRows = () => ev(`[...document.querySelectorAll('#fieldUrlPanel .fieldUrlRow')].map(r=>({i:r.dataset.index,cmd:r.dataset.command||null,href:r.dataset.href||null,text:(r.textContent||'').replace(/\\s+/g,' ').trim().slice(0,70)}))`);
const setQuery = v => ev(`(()=>{const i=document.getElementById('fieldUrlInput');i.value=${JSON.stringify(v)};i.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
const typeText = async t => { for (const ch of t) { await key('char', {text: ch, key: ch}); await sleep(70); } await sleep(300); };

try {
  await connect();
  await send('Page.navigate', {url: ORIGIN + '/'});
  let ready = false;
  for (let i = 0; i < 120 && !ready; i++) {
    try { ready = await ev(`!!(window.FieldURLBar && document.getElementById('fieldUrlPanel') && document.getElementById('fieldUrlInput'))`); } catch { /* context not ready */ }
    if (!ready) await sleep(250);
  }
  check('line mounted (FieldURLBar + panel + input)', ready);
  if (!ready) {
    let diag = null;
    try { diag = await ev(`({url:location.href,path:location.pathname,ready:document.readyState,fieldOmnibar:document.documentElement.dataset.fieldOmnibar||null,barBooted:!!window.__fieldURLBarBooted,FieldURLBar:typeof window.FieldURLBar,FieldOmnibar:typeof window.FieldOmnibar,FieldLensHost:typeof window.FieldLensHost,hasPanel:!!document.getElementById('fieldUrlPanel'),hasInput:!!document.getElementById('fieldUrlInput'),scripts:[...document.scripts].map(s=>s.src.split('/').pop()).slice(0,40)})`); } catch (e) { diag = String(e); }
    checks[checks.length - 1].data = diag;
  }
  await sleep(2500);

  const rect = await ev(`(()=>{const g=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}};const f=document.querySelector('.fieldUrlFrame');return{inner:innerWidth,client:document.documentElement.clientWidth,scroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),frame:g('.fieldUrlFrame'),frameScroll:f?{sw:f.scrollWidth,cw:f.clientWidth,sh:f.scrollHeight,ch:f.clientHeight}:null,proto:g('.fieldUrlProto'),glyph:g('#fieldUrlGlyph'),input:g('#fieldUrlInput'),spine:g('#fieldUrlSpine'),mode:g('#fieldUrlMode'),keys:g('#fieldOmnibarKeys'),keysBtns:document.querySelectorAll('#fieldOmnibarKeys button').length,fieldPalette:typeof window.FieldPalette,omnibar:document.documentElement.dataset.fieldOmnibar}})()`);
  check('no horizontal overflow at ' + WIDTH + 'px', rect && rect.scroll <= rect.client + 1, rect);
  check('frame is one line (no vertical overflow)', rect && rect.frameScroll && rect.frameScroll.sh <= rect.frameScroll.ch + 1, rect?.frameScroll);

  // ---- open the palette with Ctrl/⌘K ----------------------------------
  await key('keyDown', {key: 'k', code: 'KeyK', modifiers: 4, text: 'k'});
  await key('keyUp', {key: 'k', code: 'KeyK', modifiers: 4});
  await sleep(500);
  const opened = await ev(`({active:document.activeElement&&document.activeElement.id,panelHidden:document.getElementById('fieldUrlPanel').hidden,expanded:document.getElementById('fieldUrlInput').getAttribute('aria-expanded')})`);
  check('Ctrl/⌘K opens the palette on the URLbar input', opened?.active === 'fieldUrlInput' && opened?.panelHidden === false, opened);

  // ---- 1. alias-first ranking -----------------------------------------
  await typeText('h');
  let rows = await readRows();
  check("alias 'h' ranks above every fuzzy match (row 0 = ROOT)", rows?.[0]?.cmd === 'root' || /ROOT/.test(rows?.[0]?.text || ''), rows?.slice(0, 3));

  await ev(`window.__ev=null;window.addEventListener('field-omnibar',e=>{window.__ev=e.detail},{once:true});true`);
  await setQuery('');
  await typeText('w');
  rows = await readRows();
  check("alias 'w' ranks at row 0 (▽ WORK)", rows?.[0]?.cmd === 'work' || /WORK/.test(rows?.[0]?.text || ''), rows?.slice(0, 3));
  await press('Enter');
  await sleep(800);
  const afterEnter = await ev(`({ev:window.__ev||null,status:(document.querySelector('[data-omni-status]')||{}).textContent||'',mode:document.getElementById('fieldUrlBar').dataset.mode})`);
  check("Enter on alias 'w' executes the real WORK action (omnibar event)", afterEnter?.ev?.command === 'work', afterEnter);

  // ---- 2. exact typed address beats an alias ---------------------------
  await ev(`(document.getElementById('fieldUrlInput').focus(),true)`);
  await setQuery('');
  await typeText('/nexus/');
  rows = await readRows();
  check("exact typed path '/nexus/' is row 0 (alias never outranks an address)", rows?.[0]?.href === '/nexus/', rows?.slice(0, 3));

  // ---- 3. reset discoverable in the ':' list ---------------------------
  await setQuery('');
  await typeText(':');
  rows = await readRows();
  const resetRow = (rows || []).find(r => r.cmd === 'reset');
  check('reset affordance visible in the palette ( :reset row )', !!resetRow, rows?.map(r => r.cmd || r.href).slice(0, 14));

  // ---- 4. recents-first empty state ------------------------------------
  const store = () => ev(`window.FieldPalette?window.FieldPalette.store():null`);
  await ev(`(window.FieldPalette&&window.FieldPalette.reset(),true)`);
  await sleep(200);
  const empty0 = await readRows();
  // use surface A (a non-head, alphabetically late route) through the shipped path
  await setQuery('');
  await typeText('/nexus/');
  rows = await readRows();
  const targetA = rows?.[0]?.href;
  check('typed query resolves surface A', targetA === '/nexus/', rows?.slice(0, 2));
  await press('Enter');
  await sleep(800);
  // use surface B
  await ev(`(document.getElementById('fieldUrlInput').focus(),true)`);
  await setQuery('');
  await typeText('house');
  rows = await readRows();
  const target = rows?.[0]?.href;
  check('typed query resolves surface B', !!target && /house/.test(target), rows?.slice(0, 2));
  await press('Enter');
  await sleep(900);
  const focusNow = await ev(`(window.__fieldAct&&window.__fieldAct.focusHref)?window.__fieldAct.focusHref():null`);
  const st = await store();
  check('using a surface records it in the bounded recents store (≤8)',
    !!(st && Array.isArray(st.recents) && st.recents.includes(target) && st.recents.includes(targetA) && st.recents.length <= 8),
    {store: st, targetA, target, focusNow});
  // clear the query -> empty state must lead with held object, then usage order
  await ev(`(document.getElementById('fieldUrlInput').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})),true)`);
  await sleep(500);
  rows = await readRows();
  check('empty query leads with the held object', !!target && rows?.[0]?.href === target, {target, rows: rows?.slice(0, 6)});
  check('empty query then lists surfaces in USE order (A right behind B)',
    !!targetA && rows?.[1]?.href === targetA, {want: [target, targetA], got: rows?.slice(0, 4).map(r => r.href)});
  check('empty-query list is capped (≤6 rows)', (rows?.length || 0) >= 1 && rows.length <= 6, {count: rows?.length, before: empty0?.length});

  // ---- 5. reset clears learned state -----------------------------------
  await setQuery('');
  await typeText(':reset');
  await press('Enter');
  await sleep(600);
  const afterReset = await store();
  check(':reset clears learned ranking + recents',
    !!(afterReset && (!afterReset.recents || afterReset.recents.length === 0) && (!afterReset.use || Object.keys(afterReset.use).length === 0)), afterReset);

  // ---- 6. status spine --------------------------------------------------
  const spine = await ev(`(()=>{const s=document.getElementById('fieldUrlSpine');if(!s)return null;const r=s.getBoundingClientRect();const f=document.querySelector('.fieldUrlFrame').getBoundingClientRect();return{text:(s.textContent||'').replace(/\\s+/g,' ').trim(),title:s.title||'',aria:s.getAttribute('aria-label')||'',href:s.getAttribute('href'),inside:r.left>=f.left-1&&r.right<=f.right+1&&r.top>=f.top-1&&r.bottom<=f.bottom+1,rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},oneLine:r.height<=f.height+1}})()`);
  check('status spine renders inline inside the URLbar line', !!(spine && spine.inside && spine.oneLine), spine);
  const board = await fetch(ORIGIN + '/nexus/board.html', {cache: 'no-store'}).then(r => r.text());
  const bOpen = Number((/(\d+) open · \d+ done · hermes kanban/.exec(board) || [])[1]);
  const bBlocked = Number((/<h3>BLOCKED<b>(\d+)<\/b>/.exec(board) || [])[1] || 0);
  const bRunning = Number((/<h3>RUNNING<b>(\d+)<\/b>/.exec(board) || [])[1] || 0);
  const bStamp = (/generated (\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC)/.exec(board) || [])[1];
  const spineFull = ((spine?.text || '') + ' ' + (spine?.title || '') + ' ' + (spine?.aria || '')).replace(/\s+/g, ' ');
  check('spine counts match the board data source',
    !!spine && [bOpen, bBlocked, bRunning].every(n => spineFull.includes(String(n))),
    {spine, board: {open: bOpen, blocked: bBlocked, running: bRunning, stamp: bStamp}});
  check('spine carries a stamped as-of marker (no silent staleness)',
    !!spine && /\d{2}:\d{2}/.test(spineFull), {text: spine?.text, title: spine?.title, boardStamp: bStamp});
  check('spine deep-links to the board', spine?.href === '/nexus/board.html', spine?.href);

  // ---- 7. grammar at rest (ESR) ----------------------------------------
  const hints = await ev(`(()=>{const i=document.getElementById('fieldUrlInput');if(!i)return{missing:true,href:location.href,ready:document.readyState};i.focus();return{href:location.href,placeholder:i.getAttribute('placeholder'),mode:document.getElementById('fieldUrlBar').dataset.mode,aria:i.getAttribute('aria-label'),help:!!document.querySelector('#fieldUrlPanel .fieldUrlStatus')}})()`);
  check('line + palette show their own grammar at rest', !!hints?.placeholder && !!hints?.mode && hints?.help, hints);

  const finalLayout = await ev(`(()=>{const f=document.querySelector('.fieldUrlFrame');const ie=document.getElementById('fieldUrlInput');if(!f||!ie)return{missing:true,href:location.href};const i=ie.getBoundingClientRect();const s=document.getElementById('fieldUrlSpine');const k=document.getElementById('fieldOmnibarKeys');return{href:location.href,scroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),client:document.documentElement.clientWidth,inputW:Math.round(i.width),spineW:s?Math.round(s.getBoundingClientRect().width):null,keysW:k?Math.round(k.getBoundingClientRect().width):null,frameSW:f.scrollWidth,frameCW:f.clientWidth}})()`);
  check('input still usable at ' + WIDTH + 'px (≥60px)', finalLayout?.inputW >= 60, finalLayout);
  const jsErrors = exceptions.filter(e => !/Failed to load resource/.test(e));
  const badRequired = badResponses.filter(r => !/favicon\.ico(\?|$)/.test(r.url));
  check('no JS exceptions, no failed required resource',
    jsErrors.length === 0 && badRequired.length === 0, {jsErrors, badResponses: badResponses.slice(0, 6)});

  const failed = checks.filter(c => !c.ok);
  console.log(JSON.stringify({viewport: WIDTH + 'x' + HEIGHT, pass: checks.length - failed.length, fail: failed.length, checks}, null, 1));
  process.exitCode = failed.length ? 1 : 0;
} catch (e) {
  console.log(JSON.stringify({fatal: String(e && e.stack || e), checks, exceptions, chromeErr: chromeErr.slice(-800)}, null, 1));
  process.exitCode = 2;
} finally {
  try { ws && ws.close(); } catch {}
  cleanup();
}
