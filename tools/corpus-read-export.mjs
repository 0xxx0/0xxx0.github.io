#!/usr/bin/env node
'use strict';
/**
 * CORPUS READ EXPORT — a local slice of the corpus as a FOLD//BLOOM read source.
 *
 * WHY THIS EXISTS
 *   FOLD//BLOOM LIVE already reads ANY local text file as an addressed source
 *   (READ / RIDE FILE → SENTENCE / PARAGRAPH / SECTION, stepped with ← / → and
 *   witnessed in read:// addresses). The corpus at
 *   ~/sovereign-node/corpus/corpus.db holds the operator's own words, but
 *   nothing turned a slice of the archive into a reading file. This tool is
 *   that connector — and it is the WHOLE connector: the reading route already
 *   exists in the instrument, so no application-code change is required for
 *   its output to work.
 *
 * LAW
 *   - corpus.db is opened READ-ONLY (node:sqlite {readOnly} + PRAGMA
 *     query_only, or the sqlite3 CLI with -readonly). This tool never writes
 *     to the archive.
 *   - Exactly ONE local .md file is written, where you ask (default:
 *     ~/Desktop). Writing inside a git repository that has a remote is
 *     refused, because corpus text must never be able to leave this machine
 *     by accident.
 *   - No network calls. No upload path.
 *
 * BACKENDS
 *   Reads through node:sqlite when the runtime provides it, else the sqlite3
 *   CLI (-readonly). CORPUS_READ_EXPORT_BACKEND=cli forces the CLI path.
 *
 * USAGE
 *   node tools/corpus-read-export.mjs --list [--days 30]
 *   node tools/corpus-read-export.mjs --cid <conversation-id> [--gen <export_gen>]
 *   node tools/corpus-read-export.mjs --search "exact text" [--convos 3]
 *   node tools/corpus-read-export.mjs --recent [--days 14] [--convos 6]
 *   common: [--limit 120] [--roles user,assistant] [--max-chars 6000]
 *           [--out path.md] [--db path/to/corpus.db]
 *
 * THE FIRST MOVE
 *   1. node tools/corpus-read-export.mjs --recent --days 7
 *   2. Open FOLD//BLOOM LIVE → OTHER STARTS → READ / RIDE FILE → pick the
 *      printed file. ← / → step one address; SECTION addresses name the
 *      conversations and speaker turns; RELEASE commits your FOLD / BLOOM verb.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

export const DEFAULT_DB = path.join(os.homedir(), 'sovereign-node', 'corpus', 'corpus.db');
export const LABELS = {user: 'YOU', assistant: 'GPT', tool: 'TOOL'};
const ROLE_ALIASES = {user: 'user', you: 'user', me: 'user', human: 'user', assistant: 'assistant', gpt: 'assistant', ai: 'assistant', machine: 'assistant', tool: 'tool'};

export function normalizeRole(value) {
  const role = ROLE_ALIASES[String(value ?? '').trim().toLowerCase()];
  if (!role) throw Error('unknown role: ' + value + ' (use user, assistant, tool)');
  return role;
}
export function labelFor(author) {
  return LABELS[String(author ?? '').toLowerCase()] || String(author ?? '?').toUpperCase();
}
export function readableTime(value) {
  const s = String(value ?? '');
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 16).replace('T', ' ') : '(undated)';
}
export function cleanText(raw = '', maxChars = 0) {
  let s = String(raw ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  s = s.replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();
  if (maxChars > 0 && s.length > maxChars) {
    s = s.slice(0, maxChars).trimEnd() + `\n\n[… truncated at ${maxChars} of ${String(raw).length} chars …]`;
  }
  return s;
}
export function buildReadDocument(convos, {label = 'CORPUS READ', stamp = new Date().toISOString(), maxChars = 0, roles = ['user', 'assistant']} = {}) {
  if (!Array.isArray(convos) || !convos.length) throw Error('EMPTY_EXPORT');
  const total = convos.reduce((n, c) => n + (c.messages?.length || 0), 0);
  if (!total) throw Error('EMPTY_EXPORT');
  const L = [];
  L.push('# ' + label, '');
  L.push('_local corpus export · ' + stamp + ' · corpus.db opened read-only · ' +
    convos.length + ' conversation(s) · ' + total + ' message(s) · roles ' + roles.join('+') +
    ' · SENTENCE / PARAGRAPH / SECTION map from this file\'s own text_', '');
  for (const c of convos) {
    L.push('## ' + String(c.title || '(untitled)').trim().slice(0, 120), '');
    L.push('`cid ' + c.cid + '` · gen ' + String(c.gen || '-') + ' · ' + c.messages.length + ' messages' + (c.span ? ' · ' + c.span : ''), '');
    c.messages.forEach((m, i) => {
      L.push(`### #${i + 1} · ${labelFor(m.author)} · ${readableTime(m.mtime)}`, '');
      L.push(cleanText(m.text, maxChars), '');
    });
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

function dateDaysAgo(days) {
  return new Date(Date.now() - Math.max(0, Number(days) || 0) * 86400000).toISOString().slice(0, 10);
}
function localStamp(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
function expandUser(p) {
  return String(p).replace(/^~(?=$|\/)/, os.homedir());
}

const SQL = {
  recentConvos: (days, limit) => [
    `SELECT cid, MAX(title) AS title, COUNT(*) AS n, SUM(author='user') AS you, MAX(mtime) AS t
       FROM messages WHERE origin='human' AND mtime >= ? AND mtime IS NOT NULL AND mtime <> ''
       GROUP BY cid ORDER BY t DESC LIMIT ?`,
    [dateDaysAgo(days), limit]],
  genPick: cid => [
    `SELECT export_gen, SUM(origin='human') AS h, COUNT(*) AS n
       FROM messages WHERE cid=? GROUP BY export_gen ORDER BY h DESC, n DESC LIMIT 1`,
    [cid]],
  convMessages: (cid, gen, roles, limit) => [
    `SELECT author, mtime, text FROM messages
       WHERE cid=? AND export_gen IS ? AND author IN (${roles.map(() => '?').join(',')})
       ORDER BY mtime ASC, rowid ASC LIMIT ?`,
    [cid, gen, ...roles, limit]],
  title: cid => ['SELECT title FROM messages WHERE cid=? AND title IS NOT NULL AND title <> \'\' LIMIT 1', [cid]],
  searchConvos: (q, limit) => [
    `SELECT m.cid AS cid, COUNT(*) AS hits, MAX(m.title) AS title, MAX(m.mtime) AS t
       FROM messages_fts f JOIN messages m ON m.rowid=f.rowid
      WHERE messages_fts MATCH ? GROUP BY m.cid ORDER BY hits DESC, t DESC LIMIT ?`,
    [q, limit]]
};

function fillParams(sql, params = []) {
  let i = 0;
  return sql.replace(/\?/g, () => {
    if (i >= params.length) throw Error('missing SQL param');
    const v = params[i++];
    if (v == null) return 'NULL';
    if (typeof v === 'number') return String(v);
    return `'${String(v).replace(/'/g, "''")}'`;
  });
}

export async function openCorpus(dbPath) {
  if (!fs.existsSync(dbPath)) throw Error(`corpus.db not found: ${dbPath} (use --db to point elsewhere)`);
  let DatabaseSync = null;
  const forceCli = String(process.env.CORPUS_READ_EXPORT_BACKEND || '').toLowerCase() === 'cli';
  if (!forceCli) {
    try { ({DatabaseSync} = await import('node:sqlite')); } catch (_) { /* fall back to CLI */ }
  }
  if (DatabaseSync) {
    let db = null;
    try { db = new DatabaseSync(dbPath, {readOnly: true}); }
    catch (_) { db = new DatabaseSync(dbPath); }
    try { db.exec('PRAGMA query_only = ON'); } catch (_) {}
    try { db.exec('PRAGMA busy_timeout = 4000'); } catch (_) {}
    return {
      backend: 'node:sqlite',
      all(sql, params = []) { return db.prepare(sql).all(...params); },
      close() { try { db.close(); } catch (_) {} }
    };
  }
  const probe = spawnSync('sqlite3', ['-version'], {encoding: 'utf8'});
  if (probe.error || probe.status !== 0) {
    throw Error('no sqlite backend available: node:sqlite is unavailable in this Node and the sqlite3 CLI was not found on PATH');
  }
  return {
    backend: 'sqlite3-cli',
    all(sql, params = []) {
      const run = spawnSync('sqlite3', ['-readonly', '-cmd', '.timeout 4000', '-json', dbPath, fillParams(sql, params)], {encoding: 'utf8', maxBuffer: 512 * 1024 * 1024});
      if (run.error) throw run.error;
      if (run.status !== 0) throw Error('sqlite3: ' + String(run.stderr || run.stdout || '').trim().slice(0, 400));
      const out = String(run.stdout || '').trim();
      return out ? JSON.parse(out) : [];
    },
    close() {}
  };
}

function parseArgs(argv) {
  const a = {mode: null, cid: null, search: null, days: null, convos: 6, limit: null, roles: ['user', 'assistant'], maxChars: 6000, out: null, db: DEFAULT_DB, gen: null, help: false};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = () => { i++; if (i >= argv.length) throw Error('missing value for ' + k); return argv[i]; };
    switch (k) {
      case '--list': a.mode = 'list'; break;
      case '--cid': a.mode = 'cid'; a.cid = next(); break;
      case '--search': a.mode = 'search'; a.search = next(); break;
      case '--recent': a.mode = 'recent'; break;
      case '--days': a.days = Number(next()); break;
      case '--convos': a.convos = Number(next()); break;
      case '--limit': a.limit = Number(next()); break;
      case '--roles': a.roles = String(next()).split(',').map(s => s.trim()).filter(Boolean); break;
      case '--max-chars': a.maxChars = Number(next()); break;
      case '--out': a.out = next(); break;
      case '--db': a.db = next(); break;
      case '--gen': a.gen = next(); break;
      case '--help': case '-h': a.help = true; break;
      default: throw Error('unknown flag: ' + k);
    }
  }
  return a;
}

function printHelp() {
  console.log(`CORPUS READ EXPORT — local corpus slice → FOLD//BLOOM read source (.md)

  node tools/corpus-read-export.mjs --list [--days 30]
  node tools/corpus-read-export.mjs --cid <conversation-id> [--gen <export_gen>]
  node tools/corpus-read-export.mjs --search "<fts text>" [--convos 3]
  node tools/corpus-read-export.mjs --recent [--days 14] [--convos 6]

  --limit N       max messages per conversation (default 400 for --cid, 120 otherwise)
  --roles         comma list of user,assistant,tool (default user,assistant)
  --max-chars N   per-message cap with a visible truncation marker; 0 = full text (default 6000)
  --out PATH      where the reading file goes (default ~/Desktop/FOLD-BLOOM-READ-<stamp>.md)
  --db PATH       corpus.db location (default ~/sovereign-node/corpus/corpus.db)

  The corpus is opened READ-ONLY. One local file out; no network path exists.)`);
}

function guardRepo(out) {
  let dir = path.dirname(path.resolve(out));
  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) {
      const r = spawnSync('git', ['-C', dir, 'remote'], {encoding: 'utf8'});
      const remotes = r.status === 0 ? String(r.stdout || '').trim() : '';
      if (remotes) {
        throw Error(`refusing to write inside a git repository with a remote (${dir}) — corpus text must never be able to leave this machine. Choose --out outside the repository.`);
      }
      console.log(`notice: output sits in a git work tree without a remote (${dir})`);
      return;
    }
    const up = path.dirname(dir);
    if (up === dir) return;
    dir = up;
  }
}

function writeExport(doc, outArg, stamp) {
  const out = expandUser(outArg || path.join(os.homedir(), 'Desktop', `FOLD-BLOOM-READ-${stamp}.md`));
  guardRepo(out);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, doc, 'utf8');
  const sha = crypto.createHash('sha256').update(doc, 'utf8').digest('hex');
  return {out, bytes: Buffer.byteLength(doc), sha};
}

export async function run(argv, {log = console.log} = {}) {
  const a = parseArgs(argv);
  if (a.help || !a.mode) { printHelp(); return {mode: 'help'}; }
  a.db = expandUser(a.db);
  const roles = a.roles.map(normalizeRole);
  const db = await openCorpus(a.db);
  try {
    if (a.mode === 'list') {
      const days = a.days ?? 30;
      const rows = db.all(...SQL.recentConvos(days, 40));
      if (!rows.length) { log(`no human messages in the last ${days} days`); return {mode: 'list', rows: 0}; }
      log(`RECENT CONVERSATIONS · last ${days} days · showing ${Math.min(rows.length, 20)}`);
      for (const r of rows.slice(0, 20)) {
        log('  ' + String(r.cid).padEnd(38) + String(r.n).padStart(5) + ' msgs · ' + String(r.you).padStart(4) + ' you · ' + String(r.t || '').slice(0, 10) + ' · ' + String(r.title || '(untitled)').slice(0, 64));
      }
      log('');
      log('EXPORT ONE:  node tools/corpus-read-export.mjs --cid <cid>');
      log('EXPORT RECENT:  node tools/corpus-read-export.mjs --recent --days 14');
      return {mode: 'list', rows: rows.length};
    }
    let convos = [];
    if (a.mode === 'cid') {
      const cid = String(a.cid || '').trim();
      if (!cid) throw Error('--cid needs a conversation id');
      convos = [{cid, title: null}];
    } else if (a.mode === 'search') {
      const q = String(a.search || '').trim();
      if (!q) throw Error('--search needs a query');
      const hits = db.all(...SQL.searchConvos(q, a.convos));
      if (!hits.length) { log('no conversations match ' + JSON.stringify(q)); return {mode: 'search', rows: 0}; }
      log(`search ${JSON.stringify(q)} → ${hits.length} conversation(s)`);
      convos = hits.map(r => ({cid: r.cid, title: r.title}));
    } else {
      const days = a.days ?? 14;
      const rows = db.all(...SQL.recentConvos(days, a.convos));
      if (!rows.length) { log(`no human messages in the last ${days} days`); return {mode: 'recent', rows: 0}; }
      convos = rows.map(r => ({cid: r.cid, title: r.title}));
    }
    const limit = a.limit ?? (a.mode === 'cid' ? 400 : 120);
    const picked = [];
    for (const c of convos) {
      const gen = a.gen ?? (db.all(...SQL.genPick(c.cid))[0]?.export_gen ?? null);
      const rows = db.all(...SQL.convMessages(c.cid, gen, roles, limit));
      const seen = new Set();
      const messages = [];
      for (const m of rows) {
        const key = String(m.author) + '\u0000' + String(m.mtime) + '\u0000' + String(m.text);
        if (seen.has(key)) continue;
        seen.add(key);
        messages.push({author: m.author, mtime: m.mtime, text: m.text});
      }
      if (!messages.length) continue;
      const title = String(c.title ?? db.all(...SQL.title(c.cid))[0]?.title ?? '').trim();
      const span = readableTime(messages[0].mtime) + ' → ' + readableTime(messages.at(-1).mtime);
      picked.push({cid: c.cid, title: title || '(untitled)', gen, messages, span, capped: rows.length >= limit});
    }
    if (!picked.length) throw Error('nothing to export — check the cid / gen / roles / days');
    const stamp = localStamp();
    const label = a.mode === 'search' ? `CORPUS READ · search "${a.search}"`
      : a.mode === 'cid' ? 'CORPUS READ · conversation'
      : `CORPUS READ · recent ${a.days ?? 14} days`;
    const doc = buildReadDocument(picked, {label, stamp: new Date().toISOString(), maxChars: a.maxChars, roles});
    const {out, bytes, sha} = writeExport(doc, a.out, stamp);
    const total = picked.reduce((n, c) => n + c.messages.length, 0);
    log('');
    log('EXPORTED');
    log('  file    ' + out + ' (' + bytes.toLocaleString() + ' B · sha256:' + sha + ')');
    for (const c of picked.slice(0, 8)) {
      log('  convo   ' + String(c.cid).slice(0, 20) + '… · gen ' + String(c.gen || '-') + ' · ' + c.messages.length + ' msgs · ' + c.span + (c.capped ? ' · CAPPED (--limit to raise)' : ''));
    }
    log('  source  ' + a.db + ' (read-only) · ' + picked.length + ' conversation(s) · ' + total + ' message(s) · roles ' + roles.join('+'));
    log('  NEXT    open FOLD//BLOOM LIVE → OTHER STARTS → READ / RIDE FILE → pick this file');
    log('  NOTE    the file holds private archive text and stays on this device; nothing was uploaded');
    return {mode: a.mode, out, bytes, sha, conversations: picked.length, messages: total};
  } finally {
    db.close();
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  run(process.argv.slice(2)).catch(error => {
    console.error('corpus-read-export: ' + String(error?.message || error));
    process.exit(1);
  });
}