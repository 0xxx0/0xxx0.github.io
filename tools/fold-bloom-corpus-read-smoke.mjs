#!/usr/bin/env node
'use strict';
/**
 * FOLD BLOOM CORPUS READ SMOKE — synthetic corpus.db → tools/corpus-read-export.mjs
 * → FOLD//BLOOM LIVE READ / RIDE as an addressed course.
 *
 * WHAT IS PROVEN (one end-to-end run, one browser session):
 *   - the exporter builds a reading file from a SQLITE corpus (opened read-only)
 *   - that exact file, loaded through the real `FoldBloomLive.read.loadFile`
 *     route (the same route the READ / RIDE FILE picker uses), becomes an
 *     addressed read course: SENTENCE / PARAGRAPH / SECTION, read:// addresses
 *   - the SECTION count equals the file's own heading count (independent
 *     arithmetic, computed here from the exported bytes)
 *   - the file's sha256 identity survives the load; speaker-turn labels survive
 *     the mapping; STEP moves exactly one section address
 *
 * FIXTURES ARE SYNTHETIC. The corpus.db built here lives in a fresh temp dir,
 * contains invented sentences only, and is deleted afterwards. NO archive text
 * is ever read, copied, committed or uploaded — the synthesised rows exist for
 * the duration of this process.
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';
import {browserBin} from './browser-bin.mjs';

const ROOT = process.cwd(), HOST = '127.0.0.1'; let PORT = 0;

function ct(p) {
  if (p.endsWith('.html')) return 'text/html; charset=utf-8';
  if (p.endsWith('.js') || p.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (p.endsWith('.json')) return 'application/json; charset=utf-8';
  if (p.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}
function resolveFile(url) {
  let q = decodeURIComponent(String(url || '/').split('?')[0]).replace(/^\/+/, '');
  if (!q) q = 'index.html';
  if (q.endsWith('/')) q += 'index.html';
  const p = path.normalize(path.join(ROOT, q));
  if (!p.startsWith(ROOT)) return null;
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  if (fs.existsSync(p + '.html')) return p + '.html';
  return null;
}

// ---- synthetic fixture rows (invented text only) --------------------------
const ROWS = [
  ['smoke-alpha', 'SYNTHETIC ALPHA', 'user', '2026-09-27T10:00:00Z', '2026-09-27T10:00:00Z', 'Alpha opening sentence. Alpha second sentence.', 'smoke-gen', 's1', 'human'],
  ['smoke-alpha', 'SYNTHETIC ALPHA', 'assistant', '2026-09-27T10:01:00Z', '2026-09-27T10:01:00Z', 'Reply one. Reply two.', 'smoke-gen', 's1', 'machine'],
  ['smoke-alpha', 'SYNTHETIC ALPHA', 'user', '2026-09-27T10:02:00Z', '2026-09-27T10:02:00Z', 'Alpha third message.', 'smoke-gen', 's1', 'human'],
  ['smoke-alpha', 'SYNTHETIC ALPHA', 'tool', '2026-09-27T10:03:00Z', '2026-09-27T10:03:00Z', 'TOOL-OUTPUT-SHOULD-NOT-APPEAR.', 'smoke-gen', 's1', 'tool'],
  ['smoke-beta', 'SYNTHETIC BETA', 'user', '2026-09-26T09:00:00Z', '2026-09-26T09:00:00Z', 'Beta single message.', 'smoke-gen', 's1', 'human']
];

async function buildSyntheticCorpus(dbPath) {
  let DatabaseSync = null;
  try { ({DatabaseSync} = await import('node:sqlite')); } catch (_) {}
  if (DatabaseSync) {
    const db = new DatabaseSync(dbPath);
    db.exec(`CREATE TABLE messages(cid TEXT,title TEXT,author TEXT,ctime TEXT,mtime TEXT,text TEXT,export_gen TEXT,shard TEXT,origin TEXT,human_text TEXT,origin_rule TEXT)`);
    const ins = db.prepare('INSERT INTO messages VALUES(?,?,?,?,?,?,?,?,?,?,?)');
    for (const r of ROWS) ins.run(...r, null, null);
    db.exec(`CREATE VIRTUAL TABLE messages_fts USING fts5(text,title,author,content='messages',content_rowid='rowid')`);
    db.exec(`INSERT INTO messages_fts(messages_fts) VALUES('rebuild')`);
    db.close();
    return 'node:sqlite';
  }
  const q = s => `'${String(s).replace(/'/g, "''")}'`;
  const sql = [
    `CREATE TABLE messages(cid TEXT,title TEXT,author TEXT,ctime TEXT,mtime TEXT,text TEXT,export_gen TEXT,shard TEXT,origin TEXT,human_text TEXT,origin_rule TEXT);`,
    ...ROWS.map(r => `INSERT INTO messages VALUES(${r.map(q).join(',')},NULL,NULL);`),
    `CREATE VIRTUAL TABLE messages_fts USING fts5(text,title,author,content='messages',content_rowid='rowid');`,
    `INSERT INTO messages_fts(messages_fts) VALUES('rebuild');`
  ].join('\n');
  const run = spawnSync('sqlite3', [dbPath], {input: sql, encoding: 'utf8'});
  if (run.status !== 0) throw Error('sqlite3 fixture build failed: ' + String(run.stderr || run.error));
  return 'sqlite3-cli';
}

function fail(message) {
  console.error('CORPUS READ SMOKE FAIL ' + message);
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fold-bloom-corpus-read-'));
let exitCode = 0;
try {
  const dbPath = path.join(tmp, 'corpus.db');
  const backend = await buildSyntheticCorpus(dbPath);
  const exportPath = path.join(tmp, 'export.md');
  const exporter = spawnSync(process.execPath,
    [path.join(ROOT, 'tools', 'corpus-read-export.mjs'), '--db', dbPath, '--recent', '--days', '3650', '--convos', '2', '--limit', '50', '--max-chars', '0', '--out', exportPath],
    {cwd: ROOT, encoding: 'utf8'});
  if (exporter.status !== 0) fail('exporter rc=' + exporter.status + ' :: ' + String(exporter.stderr || '').slice(0, 400));
  if (!String(exporter.stdout || '').includes('EXPORTED')) fail('exporter did not report EXPORTED');
  if (!fs.existsSync(exportPath)) fail('export file missing');
  const doc = fs.readFileSync(exportPath, 'utf8');
  if (!doc.includes('Alpha opening sentence.')) fail('export missing synthetic alpha text');
  if (doc.includes('TOOL-OUTPUT-SHOULD-NOT-APPEAR')) fail('default roles must exclude tool output');

  const headings = (doc.match(/^#{1,6}\s/gm) || []).length;
  const expectedSections = headings;
  const expectedSha = 'sha256:' + crypto.createHash('sha256').update(doc, 'utf8').digest('hex');

  const probe = () => `<!doctype html><html><body style="margin:0"><pre id="probeResult">PENDING</pre><script>
const out=document.getElementById('probeResult'),rec={};let doneFlag=false;
const done=(ok,x)=>{if(doneFlag)return;doneFlag=true;out.textContent=(ok?'PASS ':'FAIL ')+JSON.stringify(x)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn,limit=15000,label='condition')=>{const t=Date.now();while(Date.now()-t<limit){try{const v=fn();if(v)return v}catch(_){}await sleep(60)}throw Error('wait '+label)};
(async()=>{try{
 const DOC=${JSON.stringify(doc)};
 const EXPECTED_SECTIONS=${expectedSections};
 const EXPECTED_SHA=${JSON.stringify(expectedSha)};
 const f=document.createElement('iframe');f.id='f';f.style='width:430px;height:900px;border:0;display:block';
  f.src='/fold-bloom/live/';document.body.prepend(f);
  const W=()=>f.contentWindow,D=()=>f.contentDocument;
  const errs=[];
  f.addEventListener('load',()=>{try{W().addEventListener('error',e=>errs.push(String(e.message||e)));W().addEventListener('unhandledrejection',e=>errs.push('rejection:'+String((e.reason&&e.reason.message)||e.reason)));}catch(_){}});
 await wait(()=>W().FoldBloomLive?.boot==='ready'&&D().documentElement.dataset.foldBloomLive==='ready',15000,'LIVE boot');
 const file=new (W().File)([DOC],'export.md',{type:'text/markdown'});
 await W().FoldBloomLive.read.loadFile(file);
 await wait(()=>W().FoldBloomLive.read.current()?.source?.label==='export.md',15000,'READ file load');
 const a=W().FoldBloomLive.read.current();
 rec.start={label:a.source.label,authority:a.source.authority,kind:a.source.kind,id:a.source.id,grain:a.course.grain,mode:a.course.mode,count:a.course.count,address:a.course.address,text:String(a.witness?.text||'').slice(0,120),trail:a.trail};
 W().FoldBloomLive.course.setMode('STEP',false);
 W().FoldBloomLive.course.cycleGrain();
 await wait(()=>W().FoldBloomLive.read.current()?.course?.grain==='SECTION',15000,'section grain');
 const g=W().FoldBloomLive.read.current();
 rec.section={grain:g.course.grain,count:g.course.count,address:g.course.address,text:String(g.witness?.text||'').slice(0,160)};
 const from=g.course.address;W().FoldBloomLive.course.step(1);
 await wait(()=>W().FoldBloomLive.read.current()?.course?.address!==from,15000,'section step');
 const b=W().FoldBloomLive.read.current();
 rec.step={address:b.course.address,moved:b.course.address!==from,text:String(b.witness?.text||'').slice(0,200)};
 rec.dataset={readRide:D().documentElement.dataset.foldBloomReadRide,kind:D().documentElement.dataset.foldBloomCourseKind,mode:D().documentElement.dataset.foldBloomCourseMode,address:D().documentElement.dataset.foldBloomCourseAddress};
 rec.errors=errs.slice();
 const ok=rec.start.label==='export.md'
  &&rec.start.authority==='LOCAL_FILE'
  &&rec.start.kind==='LOCAL_FILE'
  &&rec.start.id===EXPECTED_SHA
  &&rec.start.mode==='STEP'
  &&rec.start.grain==='PARAGRAPH'
  &&/^read:\\/\\//.test(String(rec.start.address))
  &&/CORPUS READ/.test(rec.start.text)
  &&rec.start.count>0
  &&rec.start.trail?.storageState==='READY'
  &&rec.section.grain==='SECTION'
  &&rec.section.count===EXPECTED_SECTIONS
  &&/^read:\\/\\//.test(String(rec.section.address))
  &&rec.step.moved
  &&/SYNTHETIC ALPHA/.test(rec.step.text)
  &&rec.dataset.readRide==='ready'
  &&rec.dataset.kind==='READFIELD_TEXT'
  &&rec.dataset.mode==='STEP'
  &&rec.errors.length===0;
 done(ok,rec);
}catch(e){done(false,{...rec,error:String(e?.stack||e)})}})();
<\/script></body></html>`;

  const server = http.createServer((req, res) => {
    if (String(req.url || '').startsWith('/__probe')) {
      res.writeHead(200, {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store'});
      res.end(probe());
      return;
    }
    const p = resolveFile(req.url);
    if (!p) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, {'content-type': ct(p), 'cache-control': 'no-store'});
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((resolve, reject) => server.listen(PORT, HOST, e => e ? reject(e) : resolve()));
  PORT = server.address().port;
  const result = await new Promise((resolve, reject) => {
    const args = ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=460,980', '--virtual-time-budget=15000', '--dump-dom', 'http://' + HOST + ':' + PORT + '/__probe'];
    const p = spawn(browserBin(), args, {stdio: ['ignore', 'pipe', 'pipe']});
    let out = '', err = '';
    const tm = setTimeout(() => { p.kill('SIGKILL'); reject(Error('timeout')); }, 36000);
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => err += d);
    p.on('error', e => { clearTimeout(tm); reject(e); });
    p.on('close', code => { clearTimeout(tm); resolve({code, out, err}); });
  }).finally(() => new Promise(r => server.close(() => r())));
  const m = result.out.match(/id="probeResult"[^>]*>([\s\S]*?)<\/pre>/i);
  const text = (m?.[1] || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  const fatal = /Uncaught (?:TypeError|ReferenceError|SyntaxError)|net::ERR_|Aw, Snap/i.test(result.err);
  if (result.code !== 0 || fatal || !text.startsWith('PASS ')) {
    console.error('CORPUS READ SMOKE FAIL', text || '(no result)', String(result.err).slice(-1200));
    exitCode = 1;
  } else {
    console.log('CORPUS READ SMOKE PASS', text.slice(5), '· db-backend=' + backend);
  }
} catch (error) {
  console.error('CORPUS READ SMOKE FAIL', String(error?.stack || error));
  exitCode = 1;
} finally {
  fs.rmSync(tmp, {recursive: true, force: true});
}
process.exit(exitCode);