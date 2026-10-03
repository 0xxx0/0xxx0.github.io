#!/usr/bin/env node
/**
 * check-toast-adoption.mjs — END 2 as a GATE, not a claim.
 *
 * MANDATE §IV END 2 says duplication count = 0. For most of 2026-10-03 that was
 * a sentence in a document. This makes it a check with an exit code.
 *
 * WHAT IT ASSERTS
 *   1. lib/dom.js still exports the shared helpers (toast/esc/download/$).
 *   2. Exactly N fold-bloom hosts define a LOCAL toast — and only those N.
 *      The floor is not a bug: two hosts ship divergent behaviour the shared
 *      helper deliberately does not carry.
 *   3. Every fold-bloom host that defines no local toast actually IMPORTS
 *      the shared one. A host with neither would render a ReferenceError.
 *
 * WHY THE FLOOR IS EXPLICIT
 *   ecology      — `go` class + good/bad colour. Different visual state.
 *   two-dial     — colour derived from colours(v) per message, 420ms timer.
 *                  lib/dom.js SCOPE forbids growing a colour channel.
 * Both are forks with a reason, which is not duplication. Changing this list
 * is a decision, not a fix — edit EXPECTED_LOCAL below and say why in the
 * commit body.
 *
 * Measured before writing (2026-10-03): 43 duplicated names across 27
 * consumers, but 0 functions byte-identical in 3+ files — so the real defect
 * was adoption, not extraction. lib/dom.js existed from 2026-09-26 with zero
 * callers rewired, because four of five hosts shipped STICKY toasts while the
 * shared helper auto-hid at 1400ms. ms:0 had to exist before adoption could.
 *
 * Usage: node scripts/check-toast-adoption.mjs [--root DIR] [--json]
 * Exit:  0 ok · 1 violation · 3 missing inputs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const ri = argv.indexOf('--root');
const ROOT = resolve(ri >= 0 ? argv[ri + 1] : process.cwd());

const LIB = join(ROOT, 'lib/dom.js');
const FOLD = join(ROOT, 'fold-bloom');

// The deliberate floor. Edit consciously.
// ecology was listed here by assumption and measured out on 2026-10-03:
// `grep -c toast fold-bloom/ecology/*.js` = 0 — it never calls one at all.
// The only genuine local implementation left in fold-bloom/ is two-dial's,
// whose colour comes from colours(v) per message (lib/dom.js SCOPE forbids
// growing a colour channel).
const EXPECTED_LOCAL = [
  'fold-bloom/two-dial/core2.js',
];

const REQUIRED_EXPORTS = ['toast', 'esc', 'download'];

const violations = [];
const info = [];

function die(code, msg) {
  if (asJson) console.log(JSON.stringify({ status: 'MISSING', root: ROOT, reason: msg }, null, 1));
  else console.log(`TOAST ADOPTION: MISSING — ${msg}`);
  process.exit(code);
}

if (!existsSync(LIB)) die(3, `lib/dom.js not found at ${LIB}`);
if (!existsSync(FOLD)) die(3, `fold-bloom/ not found at ${FOLD}`);

// ---- 1 · the shared helper still exports what callers import -------------
const libSrc = readFileSync(LIB, 'utf8');
for (const name of REQUIRED_EXPORTS) {
  const exported = new RegExp(`export\\s*(?:function|const|\\{[^}]*\\b${name}\\b)`).test(libSrc)
    || new RegExp(`\\b${name}\\s*(?:,|\\}|\\s*as\\s)`).test(
        (libSrc.match(/export\s*\{[^}]*\}/s) || [''])[0]);
  if (!exported) violations.push({
    rule: 'T1', path: 'lib/dom.js',
    why: `shared helper no longer exports \`${name}\` — every rewired caller now throws`,
  });
}

// ---- 2 · walk fold-bloom, classify each host -----------------------------
function walk(dir, out = []) {
  for (const ent of readdirSync(dir)) {
    const p = join(dir, ent);
    if (ent === 'node_modules' || ent === 'tests' || ent === 'test') continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|cjs)$/.test(ent)) out.push(p);
  }
  return out;
}

const files = walk(FOLD);
const definesLocal = [];
const importsShared = [];
const neither = [];

// A file that imports TOAST ITSELF from lib/dom.js has ADOPTED the shared
// helper — even when it then wraps it (`const toast=(t)=>_toast(t,{ms:0})` to
// keep sticky behaviour). A wrapper is an option, not a duplicate.
//
// Importing ANYTHING from lib/dom.js is NOT adoption. origin/master's
// fold-bloom/{live,listen}/app.js both do `import { $ } from '../../lib/dom.js'`
// while still defining their own toast — the first version of this gate read
// that import as adoption, reported PASS, and hid exactly the duplication it
// existed to catch. Caught by control case B (master-without-fix must FAIL).
const importsToastFromLib = (src) => {
  const m = src.match(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]*lib\/dom\.js['"]/s);
  if (!m) return false;
  return m[1].split(',').some((spec) => {
    const name = spec.trim().split(/\s+as\s+/)[0].trim();
    return name === 'toast';
  });
};

const definesImpl = (src) =>
  /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+toast\b/.test(src) ||
  /(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+toast\s*=\s*(?!_toast\b)/.test(src);

for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, '/');
  const src = readFileSync(f, 'utf8');
  // Importing toast from lib/dom.js is the adoption signal, and it is checked
  // FIRST on purpose: the rewired hosts alias it (`toast as _toast`) then wrap
  // it as `const toast=(t)=>_toast(t,{ms:0})` to keep sticky behaviour. That
  // wrapper matches every local-definition pattern, so testing definitions
  // first counts adoption as duplication — which is what made control case A
  // fail on the very branch that contains the fix.
  if (importsToastFromLib(src)) {
    importsShared.push(rel);
    continue; // wrapper or direct — either way it is not a duplicate
  }
  if (definesImpl(src)) {
    definesLocal.push(rel);
    continue;
  }
  if (/\btoast\s*\(/.test(src)) neither.push(rel);
}

const expected = [...EXPECTED_LOCAL].sort();
const actual = [...definesLocal].sort();

// extra local definitions beyond the documented floor
for (const f of actual) {
  if (!expected.includes(f)) violations.push({
    rule: 'T2', path: f,
    why: `defines a local toast but is not in the documented floor — either `
       + `adopt lib/dom.js or add it to EXPECTED_LOCAL with a reason`,
  });
}
// documented floor members that stopped defining one (someone adopted them: update the list)
for (const f of expected) {
  if (!actual.includes(f)) violations.push({
    rule: 'T3', path: f,
    why: `listed in EXPECTED_LOCAL but defines no local toast — the floor is `
       + `stale; remove it and record why in the commit body`,
  });
}
// hosts with neither an import nor a definition: they would throw at runtime.
// Scoped to the HOST, not the file: a host is a directory holding an
// index.html and its siblings share one module graph. two-dial defines
// toast in core2.js while core1/audio2/app-runtime merely call it —
// file-scoped checking reported six false ReferenceErrors that never happen.
const hostOf = (rel) => {
  const parts = rel.split('/');
  for (let i = parts.length - 1; i > 0; i--) {
    const dir = parts.slice(0, i).join('/');
    if (existsSync(join(ROOT, dir, 'index.html'))) return dir;
  }
  return parts.slice(0, -1).join('/');
};
const okHosts = new Set(
  [...importsShared, ...definesLocal].map(hostOf)
);
for (const f of neither) {
  const h = hostOf(f);
  if (okHosts.has(h)) {
    info.push({ key: 'shared-host-scope', value: `${f} borrows ${h}'s toast` });
    continue;
  }
  violations.push({
    rule: 'T4', path: h || f,
    why: `host calls toast() but no file in it imports lib/dom.js and none `
       + `defines one — ReferenceError the moment it fires`,
  });
}

info.push({ key: 'hosts_scanned', value: files.length });
info.push({ key: 'local_definitions', value: actual.length, detail: actual });
info.push({ key: 'importing_shared', value: importsShared.length, detail: importsShared });
info.push({ key: 'documented_floor', value: expected.length });

const status = violations.length === 0 ? 'PASS' : 'FAIL';

if (asJson) {
  console.log(JSON.stringify({
    status, root: ROOT,
    rule: 'MANDATE §IV END 2 — duplication count = 0, minus a documented floor',
    violations, info,
  }, null, 1));
} else {
  console.log('');
  for (const v of violations) console.log(`  ✗ ${v.rule}  ${v.path}\n      ${v.why}`);
  console.log('');
  console.log(
    `TOAST ADOPTION ${status} · ${files.length} hosts scanned · `
    + `${actual.length} local (floor ${expected.length}) · `
    + `${importsShared.length} importing lib/dom.js · ${violations.length} violation(s)`
  );
  if (actual.length) console.log(`  local: ${actual.join(', ')}`);
}
process.exit(status === 'PASS' ? 0 : 1);