#!/usr/bin/env node
// foundry/omnitools/pii-scan.mjs — REPO / PII PATTERN EXTRACTOR 0.1
//
// Scan a git repo's working tree and (optionally) its full history for emails,
// handles, secrets, keys, tokens, IPs, phone numbers and probable real names.
// Regex detectors + Shannon-entropy scoring. Zero dependencies, fully offline.
//
// USAGE
//   node pii-scan.mjs [target] [options]        target defaults to cwd
//   --history          also scan `git log -p --all` (every commit, deleted
//                      lines included — that is where dead secrets live)
//   --max-commits N    bound the history scan to the newest N commits
//   --json             machine-readable findings instead of the text report
//   --redact           mask matched values (first2…last2) in the output
//   --entropy N        Shannon threshold (bits/char) for generic secret
//                      candidates (default 4.5; `off` disables the sweep)
//   --no-tree          skip the working tree (history only)
//   --max-file BYTES   per-file size cap (default 2000000)
//   --fail-on SEV      exit 1 when findings at/above SEV exist
//                      (critical|high|medium|low|off — default off)
//
// EXIT  0 clean (or --fail-on off) · 1 findings at/above --fail-on · 2 usage
//
// DETECTORS  private-key aws-access-key github-token slack-token google-api-key
//            npm-token stripe-key jwt url-credentials bearer-header
//            email phone ipv4 handle real-name entropy-secret
// Pure-hex tokens (git shas, content hashes) are skipped by the entropy pass.

'use strict';
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SEV = { critical: 4, high: 3, medium: 2, low: 1 };
const sevOf = s => SEV[s] || 0;

function shannon(s) {
  const f = new Map();
  for (const c of s) f.set(c, (f.get(c) || 0) + 1);
  let h = 0;
  for (const n of f.values()) { const p = n / s.length; h -= p * Math.log2(p); }
  return h;
}

// digit-count post filter for phone matches (kills dates, versions, ids)
const digitCount = s => (s.match(/\d/g) || []).length;

const DETECTORS = [
  { id: 'private-key',      sev: 'critical', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g },
  { id: 'aws-access-key',   sev: 'critical', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { id: 'github-token',     sev: 'critical', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})\b/g },
  { id: 'slack-token',      sev: 'critical', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { id: 'stripe-key',       sev: 'critical', re: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/g },
  { id: 'google-api-key',   sev: 'high',     re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: 'npm-token',        sev: 'high',     re: /\bnpm_[A-Za-z0-9]{36}\b/g },
  { id: 'jwt',              sev: 'high',     re: /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\b/g },
  { id: 'url-credentials',  sev: 'high',     re: /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@'"]+:[^/\s:@'"]+@/gi },
  { id: 'bearer-header',    sev: 'high',     re: /\b(?:authorization|bearer)\s*[:=]\s*["']?(?:bearer\s+)?[A-Za-z0-9._~+/=-]{20,}/gi },
  { id: 'email',            sev: 'medium',   re: /\b[A-Z0-9._%+-]+@[A-Z0-9](?:[A-Z0-9.-]{0,251}[A-Z0-9])?\.[A-Z]{2,24}\b/gi },
  { id: 'phone',            sev: 'medium',   re: /\+\d[\d\s().-]{6,17}\d|\b\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b(?![\w.-])/g, post: m => digitCount(m) >= 8 && digitCount(m) <= 15 },
  { id: 'real-name',        sev: 'low',      re: /\b(?:signed-off-by|co-authored-by|author|maintainer|owner|contact)\s*[:=]\s*["']?([\p{Lu}][\p{L}]+(?:\s+[\p{Lu}][\p{L}]+){1,3})/gui, group: 1 },
  { id: 'handle',           sev: 'low',      re: /\b(?:github\.com|twitter\.com|x\.com|instagram\.com|linkedin\.com\/in|t\.me)\/([A-Za-z0-9][A-Za-z0-9-]{1,38})\b/gi, group: 1 },
];

const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g;
const ENTROPY_CANDIDATE_RE = /[A-Za-z0-9+/_=-]{20,}/g;
const HEX = /^(?:0x)?[0-9a-fA-F]+$/;

const SKIP_DIRS = new Set(['.git', 'node_modules', '.venv', 'venv', '.cache', 'dist', 'build']);
const SKIP_FILES = /\.(png|jpe?g|gif|webp|avif|ico|bmp|tiff?|mp[34]|m4a|mov|avi|mkv|wav|flac|ogg|woff2?|ttf|otf|eot|zip|tar|gz|bz2|xz|7z|rar|pdf|docx?|xlsx?|pptx?|class|jar|pyc|so|dylib|dll|exe|bin|wasm|mp3|ogg|sqlite|db)$/i;
const LOCKS = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock', 'poetry.lock', 'Cargo.lock', 'go.sum']);

const arg = (process.argv.slice(2));
const opts = { history: false, json: false, redact: false, entropy: 4.5, tree: true, maxFile: 2_000_000, failOn: 'off', maxCommits: 0, target: null };
for (let i = 0; i < arg.length; i++) {
  const a = arg[i];
  if (a === '--history') opts.history = true;
  else if (a === '--json') opts.json = true;
  else if (a === '--redact') opts.redact = true;
  else if (a === '--no-tree') opts.tree = false;
  else if (a === '--entropy') { const v = arg[++i]; opts.entropy = v === 'off' ? 0 : Number(v); }
  else if (a === '--max-file') opts.maxFile = Number(arg[++i]);
  else if (a === '--max-commits') opts.maxCommits = Number(arg[++i]);
  else if (a === '--fail-on') opts.failOn = arg[++i];
  else if (a === '-h' || a === '--help') {
    const head = readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//') || l.startsWith('#!')).map(l => l.replace(/^(\/\/ ?|#!)/, '')).join('\n');
    console.log(head); process.exit(0);
  }
  else if (a.startsWith('-')) { console.error('unknown flag: ' + a); process.exit(2); }
  else opts.target = a;
}
if (opts.failOn !== 'off' && !SEV[opts.failOn]) { console.error('--fail-on must be critical|high|medium|low|off'); process.exit(2); }

const target = resolveTarget(opts.target || '.');
function resolveTarget(p) { try { return statSync(p).isDirectory() ? p : join(p, '..'); } catch { return p; } }

const findings = [];
const scanned = { files: 0, bytes: 0, skipped: 0, commits: 0 };
const seen = new Set();

function record(detector, sev, value, location, line, entropy) {
  const key = detector + '|' + value + '|' + location + '|' + line;
  if (seen.has(key)) return;
  seen.add(key);
  findings.push({ detector, severity: sev, value, entropy: entropy ?? null, location, line: line ?? null });
}

function scanLine(ln, location, lineNo) {
  if (!ln || ln.startsWith('+++ ') || ln.startsWith('--- ') || ln.startsWith('diff --git') || ln.startsWith('index ') || ln.startsWith('\\')) return;
  for (const d of DETECTORS) {
    d.re.lastIndex = 0;
    let m;
    while ((m = d.re.exec(ln)) !== null) {
      const v = d.group ? (m[d.group] ?? m[0]) : m[0];
      if (d.post && !d.post(m[0])) continue;
      record(d.id, d.sev, v, location, lineNo);
    }
  }
  IPV4.lastIndex = 0;
  let m;
  while ((m = IPV4.exec(ln)) !== null) {
    const v = m[0];
    const priv = /^10\.|^192\.168\.|^127\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(v);
    record('ipv4', priv ? 'low' : 'medium', v, location, lineNo);
  }
  ENTROPY_CANDIDATE_RE.lastIndex = 0;
  if (opts.entropy > 0) while ((m = ENTROPY_CANDIDATE_RE.exec(ln)) !== null) {
    const v = m[0];
    if (HEX.test(v)) continue;                       // shas / content hashes
    if (!/[0-9]/.test(v) || !/[A-Za-z]/.test(v)) continue;
    const h = shannon(v);
    if (h >= opts.entropy) record('entropy-secret', 'medium', v, location, lineNo, Math.round(h * 100) / 100);
  }
}

function scanText(text, location) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) scanLine(lines[i], location, i + 1);
}

function walk(dir) {
  let ents;
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.git')) walk(p); continue; }
    if (!e.isFile()) continue;
    if (SKIP_FILES.test(e.name) || LOCKS.has(e.name)) { scanned.skipped++; continue; }
    let st, buf;
    try { st = statSync(p); if (st.size > opts.maxFile) { scanned.skipped++; continue; } buf = readFileSync(p); } catch { continue; }
    if (buf.includes(0)) { scanned.skipped++; continue; }   // binary
    scanned.files++; scanned.bytes += st.size;
    scanText(buf.toString('utf8'), relative(target, p) || e.name);
  }
}

function scanHistory() {
  return new Promise(res => {
    const args = ['-C', target, 'log', '-p', '--all', '--no-color', '--no-renames'];
    if (opts.maxCommits > 0) args.push('--max-count=' + opts.maxCommits);
    const git = spawn('git', args);
    let commit = 'HEAD', file = '(log)', buf = '', newNo = 0, oldNo = 0, inDiff = false;
    git.stdout.on('data', chunk => {
      buf += chunk.toString('utf8');
      const parts = buf.split('\n');
      buf = parts.pop();
      for (const ln of parts) {
        const c = /^commit ([0-9a-f]{40})/.exec(ln);
        if (c) { commit = c[1].slice(0, 8); scanned.commits++; file = '(log)'; inDiff = false; continue; }
        const f = /^\+\+\+ (?:b\/)?(.*)$/.exec(ln);
        if (f) { file = f[1] === '/dev/null' ? '(deleted)' : f[1]; continue; }
        const h = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(ln);
        if (h) { oldNo = Number(h[1]); newNo = Number(h[2]); inDiff = true; continue; }
        let no = null;
        if (inDiff) {
          if (ln.startsWith('+')) no = newNo++;
          else if (ln.startsWith('-')) no = oldNo++;
          else if (ln.startsWith(' ') || ln === '') { no = newNo++; oldNo++; }
          else inDiff = false;                    // back to log header / patch metadata
        }
        scanLine(ln, 'hist:' + commit + ':' + file, no);
      }
    });
    git.stderr.on('data', () => {});
    git.on('close', () => { if (buf) scanLine(buf, 'hist:' + commit + ':' + file, null); res(); });
    git.on('error', () => res());
  });
}

function mask(v) {
  if (!opts.redact) return v.length > 80 ? v.slice(0, 80) + '…' : v;
  return v.length <= 6 ? '***' : v.slice(0, 2) + '…' + v.slice(-2) + ' [' + v.length + 'ch]';
}

if (opts.tree) walk(target);
if (opts.history) await scanHistory();

findings.sort((a, b) => sevOf(b.severity) - sevOf(a.severity) || a.detector.localeCompare(b.detector) || (a.line ?? 0) - (b.line ?? 0));

const counts = {};
for (const f of findings) counts[f.detector] = (counts[f.detector] || 0) + 1;

if (opts.json) {
  console.log(JSON.stringify({ tool: 'pii-scan', version: '0.1', target, scanned, counts, findings: findings.map(f => ({ ...f, value: mask(f.value) })) }, null, 2));
} else {
  const scope = `tree:${scanned.files} files (${(scanned.bytes / 1024).toFixed(1)} kB${scanned.skipped ? ', ' + scanned.skipped + ' skipped' : ''})` + (opts.history ? ` · history:${scanned.commits} commits` : '');
  console.log(`pii-scan.mjs 0.1 — ${findings.length} finding(s) over ${scope}`);
  if (!findings.length) console.log('  clean.');
  let last = null;
  for (const f of findings) {
    const key = f.detector + '|' + f.severity;
    if (key !== last) {
      last = key;
      const n = findings.filter(x => x.detector === f.detector && x.severity === f.severity).length;
      console.log(`\n${f.severity.toUpperCase().padEnd(8)} ${f.detector}  ×${n}`);
    }
    const ent = f.entropy !== null ? `  H=${f.entropy}` : '';
    console.log(`  ${mask(f.value)}${ent}  @ ${f.location}:${f.line ?? '-'}`);
  }
  console.log('\ncounts ' + JSON.stringify(counts));
}

const worst = findings.reduce((a, f) => Math.max(a, sevOf(f.severity)), 0);
process.exit(opts.failOn !== 'off' && worst >= sevOf(opts.failOn) ? 1 : 0);
