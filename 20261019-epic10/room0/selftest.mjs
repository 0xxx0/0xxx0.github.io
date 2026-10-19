#!/usr/bin/env node
/* room0/selftest.mjs — node, no deps. Asserts the room's three required laws
   plus house-law guards against index.html. Prints PASS/FAIL per check. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const HTML = join(HERE, 'index.html');
const src = readFileSync(HTML, 'utf8');

const FACES = ['OBJECT', 'ADDRESS', 'STATE', 'TRANSFORM', 'PROVE', 'RETURN'];
const SHIP = 'b94df3ef';
const SVG_NS = 'http://www.w3.org/2000/svg';

/* FNV-1a 32 — independent re-implementation of the page's glyph hash */
function fnv1a32(str) {
  const b = new TextEncoder().encode(str);
  let h = 0x811c9dc5;
  for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
const hex8 = n => ('00000000' + n.toString(16)).slice(-8);

const checks = [];
const check = (n, ok, detail) => checks.push({ n, ok: !!ok, detail });

/* 1 — six walls exist in the DOM source, exactly the six reading keys */
const faceKeys = [...src.matchAll(/<section\b[^>]*\bdata-face="([A-Z]+)"/g)].map(m => m[1]);
check('6 FACES IN DOM SOURCE',
  faceKeys.length === 6 && FACES.every(k => faceKeys.includes(k)) &&
  faceKeys.filter(k => FACES.includes(k)).length === 6,
  `found=${faceKeys.length} [${faceKeys.join(',')}]`);

/* 2 — each wall carries a real reading */
const readings = [...src.matchAll(/<div class="rd">([\s\S]*?)<\/div>/g)].map(m => m[1].trim());
check('6 READINGS PRESENT',
  readings.length === 6 && readings.every(r => r.length > 10),
  `readings=${readings.length} minlen=${Math.min(...readings.map(r => r.length))}`);

/* 3 — deterministic glyph hash: declared tag == hash of the held object canon */
const canon = (src.match(/data-canon="([^"]+)"/) || [])[1];
const decl = ((src.match(/data-glyph-tag="([0-9a-f]{8})"/) || [])[1] || '').toLowerCase();
const calc = canon ? hex8(fnv1a32(canon)) : '(no canon)';
check('DETERMINISTIC GLYPH HASH', !!canon && calc === decl,
  `canon="${canon}" declared=${decl} fnv1a32=${calc}`);

/* 4 — the declaration is load-bearing: the page reads both attributes itself */
check('GLYPH DECLARATION IS LOAD-BEARING',
  src.includes("getAttribute('data-canon')") && src.includes("getAttribute('data-glyph-tag')"),
  'page reads data-canon + data-glyph-tag at boot');

/* 5 — reduced motion: CSS media path */
check('REDUCED-MOTION MEDIA PATH (CSS)',
  /@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(src),
  '@media (prefers-reduced-motion: reduce) present');

/* 6 — reduced motion: JS media path */
check('REDUCED-MOTION MEDIA PATH (JS)',
  src.includes("matchMedia('(prefers-reduced-motion: reduce)')"),
  'matchMedia(...) read at boot + change listener');

/* 7 — determinism guard */
check('NO RANDOMNESS', !src.includes('Math.random'), 'source carries no PRNG call');

/* 8 — house law: static only, no external fetch/resource */
const urls = [...src.matchAll(/https?:\/\/[^\s"'`)<>]+/g)].map(m => m[0]);
const stray = urls.filter(u => u !== SVG_NS);
const loads = /\bfetch\s*\(/.test(src) || /@import/.test(src) ||
  /\b(?:src|href)\s*=\s*["'](?:https?:)?\/\//.test(src);
check('NO EXTERNAL RESOURCE OR FETCH', stray.length === 0 && !loads,
  `urls=[${[...new Set(urls)].join(' ')}] fetch/import=${loads}`);

/* 9 — the ship receipt rides in the STATE reading */
const state = readings.find(r => /b94df3ef/.test(r)) || '';
check('STATE SHIP RECEIPT ' + SHIP, state.includes(SHIP) && state.includes('2026-10-19'),
  `STATE="${state}"`);

/* verdict */
let pass = 0;
for (let i = 0; i < checks.length; i++) {
  const c = checks[i];
  if (c.ok) pass++;
  console.log(`${c.ok ? 'PASS' : 'FAIL'} ${i + 1}/${checks.length} · ${c.n} · ${c.detail}`);
}
const ok = pass === checks.length;
console.log(`${ok ? 'PASS' : 'FAIL'} ${pass}/${checks.length} · ROOM-0 SELFTEST`);
if (!ok) process.exitCode = 1;
