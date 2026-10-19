#!/usr/bin/env node
/* selftest for L10 THE FOLD — node, no deps.  run: node selftest.mjs */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'index.html'), 'utf8');

let nPass = 0, nFail = 0;
const rows = [];
function check(label, ok, detail) {
  if (ok) { nPass++; rows.push('PASS  ' + label); }
  else    { nFail++; rows.push('FAIL  ' + label + (detail ? '  -- ' + detail : '')); }
}
function block(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b);
  return (i < 0 || j < 0 || j <= i) ? null : src.slice(i + a.length, j);
}

const TEN = ['oracle','room0','dawn','attention','tokipona','breath','ride','lyric','memory','fold'];

/* --- 1. blocks extract and evaluate (same code the page runs) --- */
const specSrc = block('/*SPEC:BEGIN*/', '/*SPEC:END*/');
const manSrc  = block('/*MANIFEST:BEGIN*/', '/*MANIFEST:END*/');
check('spec block present', !!specSrc);
check('manifest block present', !!manSrc);

let SPEC = null, MANIFEST = null;
try {
  SPEC = new Function(specSrc + '\nreturn {foldHash:foldHash, foldSpec:foldSpec, REST:FOLD_REST_ALPHA, BLOOM:FOLD_BLOOM_ALPHA};')();
} catch (e) { check('spec block evaluates', false, String(e)); }
try {
  MANIFEST = new Function(manSrc + '\nreturn MANIFEST;')();
} catch (e) { check('manifest block evaluates', false, String(e)); }

/* --- 2. stamps deterministic from names, distinct per name --- */
if (SPEC) {
  let det = true, detWhere = '';
  for (const n of TEN) {
    const a = JSON.stringify(SPEC.foldSpec(n));
    const b = JSON.stringify(SPEC.foldSpec(n));
    if (a !== b) { det = false; detWhere = n; break; }
  }
  check('stamps deterministic (same name -> identical spec)', det, detWhere);

  const sigs = TEN.map(n => JSON.stringify(SPEC.foldSpec(n)));
  check('stamps distinct (10 names -> 10 specs)', new Set(sigs).size === TEN.length);

  let finite = true, bad = '';
  for (const n of TEN) for (const [k, v] of Object.entries(SPEC.foldSpec(n))) {
    if (typeof v !== 'number' || !Number.isFinite(v)) { finite = false; bad = n + '.' + k; break; }
  }
  check('spec values all finite numbers', finite, bad);

  const restVals = Object.values(SPEC.REST);
  check('rest alphas all <= 0.12 (house law)', restVals.length > 0 && restVals.every(v => v > 0 && v <= 0.12), JSON.stringify(SPEC.REST));
  check('bloom alphas deeper than rest', Object.values(SPEC.BLOOM).every(v => v > 0.12));
  check('stamps derived from name hash in page (foldSpec used)', /foldSpec\(/.test(src.replace(specSrc, '')));
}

/* --- 3. manifest: exactly 10 entries, the ten names --- */
if (Array.isArray(MANIFEST)) {
  check('manifest has exactly 10 entries', MANIFEST.length === 10, 'got ' + MANIFEST.length);
  check('manifest ids are the ten instruments (set + order)',
        MANIFEST.length === 10 && MANIFEST.every((m, i) => m.id === TEN[i]),
        MANIFEST.map(m => m.id).join(','));
  check('manifest unique ids', new Set(MANIFEST.map(m => m.id)).size === 10);
  check('manifest fields typed (cjk string, desc string, built boolean)',
        MANIFEST.every(m => typeof m.cjk === 'string' && m.cjk.length > 0 &&
                            typeof m.desc === 'string' && m.desc.length > 0 &&
                            typeof m.built === 'boolean'));
  check('manifest declares a status for every lane', TEN.every(n => MANIFEST.some(m => m.id === n)));
}

/* --- 4. layout: fits 390px, one screen, no scroll (CSS constraint in source) --- */
check('CSS has phone-first 390px constraint', /max-width:\s*390px/.test(src));
check('CSS forbids scroll (overflow:hidden)', /overflow:\s*hidden/.test(src));
check('CSS pins to one screen (100dvh)', /height:\s*100dvh/.test(src));
check('CSS grid holds ten stamps (2 cols x 5 rows)', /grid-template-columns:\s*1fr\s+1fr/.test(src) && /grid-template-rows:\s*repeat\(5/.test(src));
check('CSS bloats rows only inside the screen (minmax(0,1fr))', /repeat\(5,\s*minmax\(0,\s*1fr\)\)/.test(src));

/* --- 5. fetch-graceful: declared at rest, live flip only over http --- */
check('probe guards on location.protocol', src.includes('location.protocol'));
check('file:// stays declared', src.includes("location.protocol === 'file:'"));
check('probe guards typeof fetch', src.includes("typeof fetch !== 'function'"));
check('probe wraps fetch in try/catch', /try\s*\{[^}]*fetch\(/s.test(src));
check('probe tries sibling paths ./ and ../', src.includes("'./' + s.m.id + '/index.html'") && src.includes("'../' + s.m.id + '/index.html'"));
check('probe uses HEAD-like GET, no-store', src.includes("method:'GET'") && src.includes("cache:'no-store'"));
check('header totals line built N/10', src.includes("'built ' + built + '/10"));

/* --- 6. house law --- */
check('no Math.random anywhere', !src.includes('Math.random'));
check('pad color rgb(8,12,18)', src.includes('rgb(8,12,18)'));
check('ink color rgb(79,87,96)', src.includes('rgb(79,87,96)'));
check('reduced-motion honoured (depth without motion)', src.includes('prefers-reduced-motion'));
check('CJK welcome present (摺 目 一目了然)', src.includes('摺') && src.includes('目') && src.includes('一目了然'));
check('system fonts only (no webfont/@font-face)', !/@font-face/.test(src) && !/\.(woff2?|ttf|otf)\b/.test(src) && !/fonts\.googleapis|fonts.gstatic/.test(src));

/* --- 7. self-contained: no external fetches, no build step --- */
check('no external URLs (http/https)', !/https?:\/\//.test(src.replace(/<!--[\s\S]*?-->/g, '')));
check('no external script/link/import', !/<script[^>]+src=/.test(src) && !/<link[^>]+href=/.test(src) && !/@import/.test(src));
check('no npm/build artefacts referenced', !/\brequire\(|import\s+['"]/.test(src));

for (const r of rows) console.log(r);
console.log('');
console.log(nFail === 0 ? 'ALL PASS  ' + nPass + '/' + (nPass + nFail) : 'FAIL  ' + nFail + ' failed, ' + nPass + ' passed');
process.exit(nFail === 0 ? 0 : 1);
