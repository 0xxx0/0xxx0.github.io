#!/usr/bin/env node
// tools/ship-check.mjs — run the CI gate list locally BEFORE pushing.
//
// Purpose: compose the repository's existing validators into one pre-ship
//   command. A human or agent runs this before `git push` and sees exactly
//   the gates CI will run, without duplicating or reimplementing any of them.
// Deps:   node >= 18 (spawn only; no packages, no build step — house law).
// Invoke: node tools/ship-check.mjs [--fast] [--json] [--only <regex>]
//                                    [--timeout <seconds>] [--self-test]
//
// Gate authority: the `run:` steps of every .github/workflows/*.yml that
// gates `push` to `master` (parsed at runtime — a new CI step automatically
// becomes a ship-check gate). `uses:` steps and side-effecting commands
// (gh issue/release, git push, deploy) are never executed locally.
//
//   --fast     skip slow gates (browser / real-loop smokes) — see SLOW_RE
//   --json     machine-readable output on stdout (human lines go to stderr)
//   --only X   run only gates whose name matches /X/i (iterating on one gate)
//   --timeout  per-gate timeout in seconds (default 300)
//   --self-test: parse sanity + referenced-script existence check
//
// Verdict (always the final line on stdout in human mode):
//   SHIP CHECK: PASS (n/n gates)   exit 0
//   SHIP CHECK: FAIL (k/n failed)  exit 1
//
// Advisory gates (CI runs them `|| true`, "informational, never fails") are
// executed and reported but do not count toward the verdict.
//
// Self-verification: this script was proven able to fail — a deliberately
// broken showcase-manifest.json route made it exit 1 naming the route
// registration gate; restoring the fixture returned exit 0. Evidence:
//   ~/void-anchor/AXIS/work/house-build-20260927/lane-shipcheck-REPORT.md
//
// ## Stop conditions
// - Do not add gates by hand here; edit the workflow YAML — that is the
//   single authority this script reads.
// - If a gate is red locally but green in CI (or vice versa), report the
//   divergence; do not tune this runner to hide it.

import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Gates matching this are the slow class (browser / real-loop smokes) and are
// skipped under --fast. Deterministic by command text, not by measured time.
const SLOW_RE = /smoke/i;

// Commands that must never run locally even if a workflow grows one.
const SIDE_EFFECT_RE = /\bgh\s+(issue|release|workflow|pr)\b|\bgit\s+push\b|\bcurl\b[^\n]*\s-X\s+POST\b|\bdeploy\b/i;

const DEFAULT_TIMEOUT_S = 300;
const TAIL_LINES = 8;
const OUT_CAP = 200_000;

// ---------------------------------------------------------------------------
// minimal YAML-subset reader for the workflow files (block scalars, nested
// key: value, sequences of step maps). Not a general YAML parser on purpose:
// no dependencies, and the workflow shape it accepts is checked by --self-test.
// ---------------------------------------------------------------------------

function indentOf(line) {
  const m = line.match(/^ */);
  return m ? m[0].length : 0;
}

function unquote(v) {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

// Split a file into top-level sections: {key, start, end} (line indexes).
function section(lines, key) {
  const start = lines.findIndex((l) => l === `${key}:` || l.startsWith(`${key}:`));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^[A-Za-z"']/.test(lines[i]) && indentOf(lines[i]) === 0) { end = i; break; }
  }
  return { start, end };
}

function workflowGatesPushMaster(text) {
  const lines = text.split('\n');
  const on = section(lines, 'on');
  if (!on) return false;
  const sub = lines.slice(on.start + 1, on.end);
  const pushIdx = sub.findIndex((l) => /^  push:/.test(l));
  if (pushIdx === -1) return false; // e.g. schedule / pull_request only
  // collect the push: block (lines indented deeper than the push key)
  let block = '';
  for (let i = pushIdx + 1; i < sub.length; i++) {
    const l = sub[i];
    if (l.trim() === '') continue;
    if (indentOf(l) <= 2) break;
    block += l + '\n';
  }
  if (!/branches:/.test(block)) return true; // push with no branch filter
  const m = block.match(/branches:\s*\[([^\]]*)\]/);
  if (m) return m[1].split(',').map((s) => unquote(s)).includes('master');
  return /^\s*-\s*master\s*$/m.test(block);
}

// Parse every `steps:` list in the file into gate objects.
function parseWorkflow(text, file) {
  const lines = text.split('\n');
  const gates = [];

  // workflow-level env (rare) — top `env:` section
  const wfEnv = parseEnvSection(lines, section(lines, 'env'));

  const stepsIdx = lines.findIndex((l) => /^(\s*)steps:\s*$/.test(l));
  if (stepsIdx === -1) return { gates, env: wfEnv };
  const base = indentOf(lines[stepsIdx]);
  const itemIndent = base + 2;

  // slice out step items
  const items = [];
  let cur = null;
  for (let i = stepsIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === '') { if (cur) cur.push(l); continue; }
    const ind = indentOf(l);
    if (ind === itemIndent && /^\s*-\s+/.test(l)) {
      if (cur) items.push(cur);
      cur = [l];
    } else if (cur && ind > itemIndent) {
      cur.push(l);
    } else {
      if (cur) { items.push(cur); cur = null; }
      if (ind <= base) break; // left the steps list
    }
  }
  if (cur) items.push(cur);

  // job-level env: the `env:` sibling of `steps:`
  const jobEnv = {};
  for (let i = stepsIdx - 1; i >= 0; i--) {
    const l = lines[i];
    if (l.trim() === '') continue;
    if (indentOf(l) < base) break;
    const m = l.match(/^(\s*)env:\s*$/);
    if (m && indentOf(l) === base) {
      const sub = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === '') continue;
        if (indentOf(lines[j]) <= base) break;
        sub.push(lines[j]);
      }
      Object.assign(jobEnv, parseEnvLines(sub));
      break;
    }
    if (indentOf(l) === base) break;
  }

  for (const item of items) {
    const headIndent = indentOf(item[0]);
    const keyIndent = headIndent + 2;
    const fields = { env: {} };
    for (let i = 0; i < item.length; i++) {
      const l = item[i];
      if (l.trim() === '') continue;
      const ind = indentOf(l);
      if (i === 0) {
        // first line: `- name: ...` or `- uses: ...`
        const m = l.match(/^\s*-\s+([A-Za-z-]+):\s*(.*)$/);
        if (!m) break;
        fields[m[1]] = unquote(m[2]);
        continue;
      }
      if (ind !== keyIndent) continue;
      const m = l.trim().match(/^([A-Za-z-]+):\s*(.*)$/);
      if (!m) continue;
      const [, key, rest] = m;
      if (key === 'run') {
        if (rest === '|' || rest === '>' || rest === '' || rest === '|-' || rest === '>-') {
          // block scalar: dedent following deeper lines
          const block = [];
          for (let j = i + 1; j < item.length; j++) {
            const bl = item[j];
            if (bl.trim() === '') { block.push(''); continue; }
            if (indentOf(bl) <= keyIndent) break;
            block.push(bl);
            i = j;
          }
          const nonEmpty = block.filter((b) => b.trim() !== '');
          const dedent = nonEmpty.length ? Math.min(...nonEmpty.map(indentOf)) : 0;
          fields.run = block.map((b) => (b.trim() === '' ? '' : b.slice(dedent))).join('\n').trimEnd();
        } else {
          fields.run = unquote(rest);
        }
      } else if (key === 'env') {
        if (rest === '' ) {
          const sub = [];
          for (let j = i + 1; j < item.length; j++) {
            if (item[j].trim() === '') continue;
            if (indentOf(item[j]) <= keyIndent) break;
            sub.push(item[j]);
            i = j;
          }
          fields.env = parseEnvLines(sub);
        }
      } else {
        fields[key] = unquote(rest);
      }
    }
    if (!fields.run) continue; // `uses:` step — nothing to run locally
    if (SIDE_EFFECT_RE.test(fields.run)) continue; // never execute side effects
    const lastLine = fields.run.trim().split('\n').filter((s) => s.trim() !== '').pop() ?? '';
    gates.push({
      name: fields.name || lastLine.slice(0, 60),
      file,
      command: fields.run,
      cwd: fields['working-directory'] || '',
      env: fields.env || {},
      advisory: /\|\|\s*true\s*$/.test(lastLine),
      slow: SLOW_RE.test(fields.run),
    });
  }
  return { gates, env: wfEnv };
}

function parseEnvSection(lines, sec) {
  if (!sec) return {};
  return parseEnvLines(lines.slice(sec.start + 1, sec.end));
}

function parseEnvLines(sub) {
  const env = {};
  for (const l of sub) {
    const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (m) env[m[1]] = unquote(m[2]);
  }
  return env;
}

// ---------------------------------------------------------------------------
// gate discovery + validator cross-check
// ---------------------------------------------------------------------------

function discoverGates() {
  const wfDir = path.join(ROOT, '.github', 'workflows');
  const files = readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f)).sort();
  // named authority first, then the rest alphabetically
  files.sort((a, b) => (a === 'public-surface-check.yml' ? -1 : b === 'public-surface-check.yml' ? 1 : a.localeCompare(b)));
  const gates = [];
  const used = [];
  const skippedWfs = [];
  for (const f of files) {
    const text = readFileSync(path.join(wfDir, f), 'utf8');
    if (!workflowGatesPushMaster(text)) { skippedWfs.push(f); continue; }
    const { gates: g, env } = parseWorkflow(text, f);
    for (const gate of g) { gate.env = { ...env, ...gate.env }; gate.workflow = f; gates.push(gate); }
    used.push(f);
  }
  return { gates, workflows: used, skippedWfs };
}

// Discover repo validators (root + tools/) and report any that CI does not gate.
function uncoveredValidators(gates) {
  const scriptRe = /(?:node|bash|sh|python3?)\s+(?:--\S+\s+)*([^\s'"]+\.(?:mjs|cjs|js|py|sh))/g;
  const gated = new Set(['tools/ship-check.mjs']);
  for (const g of gates) {
    for (const cmd of g.command.split('\n')) {
      for (const m of cmd.matchAll(scriptRe)) {
        const p = m[1].replace(/^\.\//, '');
        gated.add(p);
        gated.add(path.basename(p));
      }
    }
    // `node --test a.mjs b.mjs …` file lists
    for (const m of g.command.matchAll(/--test((?:\s+\S+\.(?:mjs|cjs|js))+)/g)) {
      for (const f of m[1].trim().split(/\s+/)) {
        gated.add(f.replace(/^\.\//, ''));
        gated.add(path.basename(f));
      }
    }
  }
  const found = [];
  for (const dir of ['.', 'tools']) {
    const abs = path.join(ROOT, dir);
    for (const f of readdirSync(abs)) {
      if (!/\.mjs$/.test(f)) continue;
      const full = path.join(abs, f);
      if (!statSync(full).isFile()) continue;
      const rel = dir === '.' ? f : `${dir}/${f}`;
      if (!gated.has(rel) && !gated.has(f)) found.push(rel);
    }
  }
  return found.sort();
}

// ---------------------------------------------------------------------------
// runner
// ---------------------------------------------------------------------------

function runGate(gate, timeoutS) {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    const child = spawn('/bin/bash', ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', gate.command], {
      cwd: path.join(ROOT, gate.cwd || ''),
      env: { ...process.env, ...gate.env },
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    const cap = (chunk) => {
      out += chunk;
      if (out.length > OUT_CAP) out = `[...output truncated...]\n` + out.slice(-OUT_CAP);
    };
    child.stdout.on('data', (d) => cap(d.toString()));
    child.stderr.on('data', (d) => cap(d.toString()));
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch {} }
    }, timeoutS * 1000);
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ exit_code: 127, wall_ms: 0, output: String(err), timeout: false });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const wall_ms = Number((process.hrtime.bigint() - started) / 1_000_000n);
      resolve({ exit_code: timedOut ? 124 : (code ?? 1), wall_ms, output: out, timeout: timedOut });
    });
  });
}

function tailLines(s, n = TAIL_LINES) {
  const ls = s.replace(/\s+$/, '').split('\n');
  return ls.slice(-n);
}

function fmtSec(ms) { return `${(ms / 1000).toFixed(1)}s`; }

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};

const asJson = flag('--json');
const fast = flag('--fast');
const only = opt('--only', '');
const timeoutS = Number(opt('--timeout', DEFAULT_TIMEOUT_S));
const log = (s) => { if (asJson) process.stderr.write(s + '\n'); else process.stdout.write(s + '\n'); };

if (flag('--self-test')) {
  // parse sanity: the subset parser must see the real gate population and
  // every script a gate references must exist on disk.
  const { gates, workflows } = discoverGates();
  let ok = true;
  const problems = [];
  if (gates.length < 30) { ok = false; problems.push(`parsed only ${gates.length} gates (expected >= 30)`); }
  if (!workflows.includes('public-surface-check.yml')) { ok = false; problems.push('public-surface-check.yml not selected as gate authority'); }
  const named = ['validate-public.mjs', 'browser-smoke.mjs', 'iching-core.test.mjs', 'nexus-surface.test.mjs', 'check-route-registration.mjs'];
  const all = gates.map((g) => g.command).join('\n');
  for (const n of named) if (!all.includes(n)) { ok = false; problems.push(`named validator not in gate list: ${n}`); }
  for (const g of gates) {
    for (const m of g.command.matchAll(/(?:node|bash|sh|python3?)\s+(?:--\S+\s+)*([^\s'"]+\.(?:mjs|cjs|js|py|sh))/g)) {
      const p = m[1].replace(/^\.\//, '');
      if (!existsSync(path.join(ROOT, g.cwd || '', p))) { ok = false; problems.push(`gate "${g.name}" references missing script: ${p}`); }
    }
  }
  for (const p of ['SHIP CHECK: PASS (n/n gates)', 'SHIP CHECK: FAIL (k/n failed)']) { /* format contract */ }
  log(ok ? `ship-check self-test: PASS (${gates.length} gates parsed from ${workflows.length} workflows)`
         : `ship-check self-test: FAIL\n - ${problems.join('\n - ')}`);
  process.exit(ok ? 0 : 1);
}

const { gates, workflows, skippedWfs } = discoverGates();
const uncovered = uncoveredValidators(gates);

let selected = gates;
if (only) selected = selected.filter((g) => new RegExp(only, 'i').test(g.name));
if (fast) {
  // --fast marks slow gates skipped but still lists them
  selected = selected;
}

const results = [];
let failed = 0, passed = 0, skipped = 0, advisoryCount = 0;

log(`ship-check · gates parsed from ${workflows.map((w) => `.github/workflows/${w}`).join(', ')}`);
if (skippedWfs.length) log(`(not gating push-to-master, skipped: ${skippedWfs.join(', ')})`);
log('');

for (const gate of selected) {
  const tag = `${gate.workflow.replace(/\.yml$/, '')} · ${gate.name}`;
  if (fast && gate.slow) {
    skipped++;
    results.push({ name: gate.name, workflow: gate.workflow, skipped: 'slow (--fast)', slow: true, ok: null });
    log(`[SKIP] ${tag} (slow, --fast)`);
    continue;
  }
  if (gate.advisory) advisoryCount++;
  const r = await runGate(gate, timeoutS);
  const ok = r.exit_code === 0;
  const entry = {
    name: gate.name,
    workflow: gate.workflow,
    command: gate.command,
    advisory: gate.advisory,
    slow: gate.slow,
    exit_code: r.exit_code,
    wall_ms: r.wall_ms,
    ok,
    timeout: r.timeout,
  };
  if (!ok) entry.tail = tailLines(r.output);
  results.push(entry);
  if (gate.advisory) {
    log(`[${ok ? 'ADV-OK' : 'ADV-RED'}] ${tag} (${fmtSec(r.wall_ms)}, exit ${r.exit_code}${r.timeout ? ' TIMEOUT' : ''}) [advisory, not counted]`);
    if (!ok) for (const l of entry.tail) log(`       | ${l}`);
  } else if (ok) {
    passed++;
    log(`[PASS] ${tag} (${fmtSec(r.wall_ms)})`);
  } else {
    failed++;
    log(`[FAIL] ${tag} (${fmtSec(r.wall_ms)}, exit ${r.exit_code}${r.timeout ? ' TIMEOUT' : ''})`);
    log(`       ── last ${entry.tail.length} lines ──`);
    for (const l of entry.tail) log(`       | ${l}`);
  }
}

const total = passed + failed;
const okAll = failed === 0 && total > 0;
const verdictLine = okAll ? `SHIP CHECK: PASS (${passed}/${total} gates)` : `SHIP CHECK: FAIL (${failed}/${total} failed)`;

if (uncovered.length) {
  log('');
  log(`discovered validators NOT in the CI gate list (not run — CI is the authority): ${uncovered.join(', ')}`);
}

const report = {
  schema: '0xxx0/ship-check/v0.1',
  generated: new Date().toISOString(),
  root: ROOT,
  mode: { fast, only: only || null, timeout_s: timeoutS },
  workflows,
  workflows_skipped: skippedWfs,
  gates: results,
  discovered_unvalidated: uncovered,
  verdict: { ok: okAll, line: verdictLine, passed, failed, total, advisory: advisoryCount, skipped_slow: skipped },
};

if (asJson) process.stdout.write(JSON.stringify(report, null, 2) + '\n');
else { log(''); log(verdictLine); }
process.exit(okAll ? 0 : 1);