#!/usr/bin/env node
/**
 * gate-suite.mjs — one command, one verdict.
 *
 * The house has ~15 check scripts and no entry point. Each has to be remembered,
 * found, and run by hand — so the loop exists but is not usable. This runs them and
 * prints ONE empirical verdict line. Exit code IS the verdict: 0 all green, 1 any red.
 *
 * Not a registry. Not a dashboard. Not a new architecture. It is the loop made runnable.
 *
 * Usage:  node scripts/gate-suite.mjs            run every gate
 *         node scripts/gate-suite.mjs --json     machine-readable
 *         node scripts/gate-suite.mjs --quick    skip the long selftests
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const quick = argv.includes('--quick');
const ROOT = resolve(argv.includes('--root') ? argv[argv.indexOf('--root') + 1] : process.cwd());

// Gate order: identity first (does anything exist at all), then correspondence,
// then the public surface, then the interphase runtime, then the deeper selftests.
const GATES = [
  { id: 'route-registration', cmd: 'node', args: ['scripts/check-route-registration.mjs'] },
  { id: 'toast-adoption', cmd: 'node', args: ['scripts/check-toast-adoption.mjs'] },  // END 2 as a gate
  { id: 'interphase-registry', cmd: 'node', args: ['scripts/check-interphase.mjs'] },
  { id: 'public-surface', cmd: 'node', args: ['tools/validate-public.mjs'] },
  { id: 'interphase-runtime', cmd: 'node', args: ['tools/interphase-selftest.cjs'] },
  { id: 'interphase-composition', cmd: 'node', args: ['tools/interphase-composition-selftest.cjs'] },
  { id: 'interphase-lenses', cmd: 'node', args: ['tools/interphase-lenses-selftest.cjs'] },
  { id: 'interphase-mapping', cmd: 'node', args: ['tools/interphase-mapping-selftest.cjs'] },
  { id: 'interphase-ring', cmd: 'node', args: ['tools/interphase-ring-selftest.cjs'] },
  { id: 'interphase-successor', cmd: 'node', args: ['tools/interphase-successor-selftest.cjs'] },
  { id: 'interphase-selftest-suite', cmd: 'python3', args: ['tools/check-interphase-selftest.py'] },
  { id: 'current-heads', cmd: 'node', args: ['scripts/check-current-heads.mjs'] },
  { id: 'human-gate-discipline', cmd: 'node', args: ['scripts/check-human-gate-discipline.mjs'] },
  { id: 'reality-gaps', cmd: 'node', args: ['scripts/check-reality-gaps.mjs'] },
];
const QUICK_SKIP = new Set(['interphase-selftest-suite']);

const results = [];
for (const g of GATES) {
  if (quick && QUICK_SKIP.has(g.id)) {
    results.push({ id: g.id, status: 'SKIP', ms: 0, note: '--quick' });
    continue;
  }
  const target = join(ROOT, g.args[0]);
  if (!existsSync(target)) {
    results.push({ id: g.id, status: 'MISSING', ms: 0, note: `not found: ${g.args[0]}` });
    continue;
  }
  const t0 = Date.now();
  const r = spawnSync(g.cmd, g.args, { cwd: ROOT, encoding: 'utf8', timeout: 240_000 });
  const ms = Date.now() - t0;
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  results.push({
    id: g.id,
    status: r.status === 0 ? 'PASS' : 'FAIL',
    exit: r.status,
    ms,
    tail: out.split('\n').slice(-3).join(' · ').slice(0, 300),
    note: out.split('\n').filter((l) => /violation|FAIL|error/i.test(l)).slice(0, 2).join(' | ').slice(0, 300),
  });
}

const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
const other = results.filter((r) => !['PASS', 'FAIL'].includes(r.status)).length;
const clean = fail === 0;

const report = {
  status: clean ? 'GREEN' : 'RED',
  root: ROOT,
  run_at: new Date().toISOString(),
  gates: results.length,
  pass, fail, other,
  results,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 1));
} else {
  console.log('');
  for (const r of results) {
    const mark = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '·';
    const why = r.status === 'FAIL' ? `  ${r.note || r.tail}` : '';
    console.log(`  ${mark} ${r.id.padEnd(24)} ${r.status.padEnd(8)} ${String(r.ms).padStart(6)}ms${why}`);
  }
  console.log('');
  console.log(`GATE SUITE ${clean ? 'GREEN' : 'RED'} · ${pass} pass · ${fail} fail · ${other} other`);
}
process.exit(clean ? 0 : 1);
