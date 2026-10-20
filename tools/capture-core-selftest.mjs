#!/usr/bin/env node
// selftest.mjs — capture rail selftest: mint determinism, extract chain stages,
// named-field rejections, ingest dedupe/append-only, bookmarklet syntax+size.
// Run: node selftest.mjs   (exit 0 = all PASS, 1 = any FAIL)
// No fixtures survive: the tmp inbox/store it builds are removed at the end.

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { mint, extract, validateRecord, sha256, mintId, LIMITS, CaptureInputError } from '../lib/capture-core.mjs';
import { runIngest } from './capture-ingest.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const lines = [];
const ok = (name, cond, detail) => lines.push({ status: cond ? 'PASS' : 'FAIL', name, detail: detail || '' });

// ------------------------------------------------------------ HTML fixtures
const F_JSONLD = '<!doctype html><html><head><title>Page One</title>' +
  '<meta property="og:title" content="OG One"><meta name="description" content="desc one">' +
  '<script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle","headline":"JSONLD Headline Wins","articleBody":"Body from jsonld stage."}</script>' +
  '</head><body><article><p>Enough paragraph text here that readability would win if it were consulted: more than one hundred forty characters, with commas, plenty of them, to prove the scoring path.</p></article></body></html>';

const F_OG = '<!doctype html><html><head><title>T2</title>' +
  '<meta property="og:title" content="OG Title Two"><meta property="og:description" content="OG desc two">' +
  '</head><body><article><p>First substantial paragraph of the piece, long enough to clear the one hundred forty character floor, it carries commas, clauses, and a real sentence structure to score.</p>' +
  '<p>Second paragraph continues the thought with more prose, more clauses, and yet more commas to lift the paragraph score.</p></article></body></html>';

const F_ART = '<!doctype html><html><head><title>Article Page Title</title></head><body>' +
  '<nav><a href="/a">Home</a><a href="/b">About</a></nav>' +
  '<article><p>First substantial paragraph of the piece, long enough to clear the one hundred forty character floor, it carries commas, clauses, and a real sentence structure to score.</p>' +
  '<p>Second paragraph continues the thought with more prose, more clauses, and yet more commas to lift the paragraph score.</p></article>' +
  '<footer>footer junk</footer></body></html>';

const F_GARBAGE = '<html><head><title>Junk Page ???</title></head><body>lo;?? +++ <p>x</p> ++ ++ </body></html>';

// ------------------------------------------------------- 1 mint determinism
const base = { url: 'https://example.com/a?x=1', title: 'T', ts: 1760000000000,
  quote: { prefix: 'pre ', exact: 'the exact words', suffix: ' post' } };
const r1 = mint(base);
const r2 = mint(base);
ok('mint determinism: same input -> same id, byte-identical record',
  r1.id === r2.id && JSON.stringify(r1) === JSON.stringify(r2), 'id=' + r1.id);
ok('id = sha256(url|ts) hex, 64 chars',
  /^[0-9a-f]{64}$/.test(r1.id) && r1.id === mintId(base.url, base.ts) && r1.id === sha256(base.url + '|' + base.ts),
  'id=' + r1.id);
ok('id changes when ts changes (same url)',
  mint({ ...base, ts: base.ts + 1 }).id !== r1.id);
ok('id changes when url changes (same ts)',
  mint({ ...base, url: 'https://example.com/b' }).id !== r1.id);
ok('record carries every schema field in order',
  JSON.stringify(Object.keys(r1)) === JSON.stringify(['id', 'url', 'title', 'ts', 'quote', 'sha256_of_extract', 'extractor', 'minted_by']),
  Object.keys(r1).join(','));
ok('quote round-trips prefix/exact/suffix as a TextQuoteSelector',
  r1.quote.prefix === 'pre ' && r1.quote.exact === 'the exact words' && r1.quote.suffix === ' post');
ok('sha256_of_extract is the sha256 of the extract text',
  r1.sha256_of_extract === sha256('') && /^[0-9a-f]{64}$/.test(r1.sha256_of_extract));

// -------------------------------------------------- 2 extract chain (4 stages)
const e1 = extract(F_JSONLD);
ok('extract stage 1: JSON-LD present -> by jsonld (headline beats og+readability)',
  e1.by === 'jsonld' && e1.title === 'JSONLD Headline Wins' && e1.text === 'Body from jsonld stage.',
  'by=' + e1.by + ' title=' + JSON.stringify(e1.title));
const e2 = extract(F_OG);
ok('extract stage 2: og only -> by og (og:title/meta desc beat readability)',
  e2.by === 'og' && e2.title === 'OG Title Two' && e2.text === 'OG desc two',
  'by=' + e2.by + ' title=' + JSON.stringify(e2.title));
const e3 = extract(F_ART);
ok('extract stage 3: article only -> by readability, main text recovered',
  e3.by === 'readability' && e3.text.indexOf('Second paragraph continues') >= 0 && e3.title === 'Article Page Title',
  'by=' + e3.by + ' title=' + JSON.stringify(e3.title));
const e4 = extract(F_GARBAGE);
ok('extract stage 4: garbage -> by raw, title-tag text',
  e4.by === 'raw' && e4.title === 'Junk Page ???' && e4.text.indexOf('lo;??') >= 0,
  'by=' + e4.by + ' text=' + JSON.stringify(e4.text));
const rg = mint({ url: 'https://garbage.example/x', ts: 5, html: F_GARBAGE });
ok('garbage html STILL mints: extractor raw, id + sha256_of_extract 64-hex',
  rg.extractor === 'raw' && /^[0-9a-f]{64}$/.test(rg.id) && rg.sha256_of_extract === sha256(e4.text),
  'id=' + rg.id.slice(0, 16) + ' by=' + rg.extractor);
const rn = mint({ url: 'https://none.example/', ts: 7 });
ok('no html/text at all still mints: extractor raw, hash of empty extract, title empty',
  rn.extractor === 'raw' && rn.sha256_of_extract === sha256('') && rn.title === '',
  'id=' + rn.id.slice(0, 16));
ok('derived title from html truncates to bound instead of rejecting',
  mint({ url: 'https://longtitle.example/', ts: 8, html: '<title>' + 'z'.repeat(LIMITS.title + 50) + '</title>' }).title.length === LIMITS.title);

// --------------------------------------------- 3 malformed input, named field
const BAD = [
  ['url javascript: scheme', { url: 'javascript:alert(1)', ts: 1 }, 'url'],
  ['url ftp scheme', { url: 'ftp://example.com/f', ts: 1 }, 'url'],
  ['url relative path', { url: '/relative/path', ts: 1 }, 'url'],
  ['url whitespace inside', { url: 'https://example.com/a b', ts: 1 }, 'url'],
  ['url over bound', { url: 'https://example.com/' + 'a'.repeat(LIMITS.url), ts: 1 }, 'url'],
  ['missing ts', { url: 'https://example.com/' }, 'ts'],
  ['ts NaN', { url: 'https://example.com/', ts: NaN }, 'ts'],
  ['ts empty string', { url: 'https://example.com/', ts: '' }, 'ts'],
  ['title not a string', { url: 'https://example.com/', ts: 1, title: 12 }, 'title'],
  ['title over bound', { url: 'https://example.com/', ts: 1, title: 'x'.repeat(LIMITS.title + 1) }, 'title'],
  ['quote without exact', { url: 'https://example.com/', ts: 1, quote: { prefix: 'p' } }, 'quote.exact'],
  ['quote.exact not a string', { url: 'https://example.com/', ts: 1, quote: { exact: 7 } }, 'quote.exact'],
  ['quote.exact over bound', { url: 'https://example.com/', ts: 1, quote: { exact: 'q'.repeat(LIMITS.quoteExact + 1) } }, 'quote.exact'],
  ['quote.prefix over bound', { url: 'https://example.com/', ts: 1, quote: { exact: 'q', prefix: 'p'.repeat(LIMITS.quoteEdge + 1) } }, 'quote.prefix'],
  ['extractor_hint outside enum', { url: 'https://example.com/', ts: 1, extractor_hint: 'magic' }, 'extractor_hint'],
  ['minted_by outside enum', { url: 'https://example.com/', ts: 1, minted_by: 'bot' }, 'minted_by'],
  ['html not a string', { url: 'https://example.com/', ts: 1, html: 42 }, 'html'],
  ['input not an object', 'not-an-object', 'input']
];
for (const [name, input, want] of BAD) {
  let got = null;
  try { mint(input); } catch (e) {
    got = e instanceof CaptureInputError ? e.field : 'threw ' + (e && e.name);
  }
  ok('reject ' + name + ' -> field=' + want, got === want, got === want ? '' : 'got field=' + got);
}

// ------------------------------------------------- 4 validateRecord integrity
let tampered = null;
try { validateRecord({ ...r1, id: 'f'.repeat(64) }); } catch (e) { tampered = e.field; }
ok('validateRecord re-derives id from sha256(url|ts): tampered id rejected field=id',
  tampered === 'id', 'got=' + tampered);
let badkey = null;
try { validateRecord({ ...r1, extractor: 'weird' }); } catch (e) { badkey = e.field; }
ok('validateRecord rejects extractor outside enum with named field',
  badkey === 'extractor', 'got=' + badkey);
ok('validateRecord accepts an unmodified minted record',
  JSON.stringify(validateRecord(r1)) === JSON.stringify(r1));

// --------------------------------------------------------- 5 ingest (JSONL)
const T = join(here, 'selftest-tmp');
rmSync(T, { recursive: true, force: true });
mkdirSync(T, { recursive: true });
const store = join(T, 'field-objects.jsonl');
const inbox = join(T, 'inbox.jsonl');
const A = mint({ url: 'https://a.example/one', title: 'A', ts: 1 });
const B = mint({ url: 'https://b.example/two', title: 'B', ts: 2 });
const seed = JSON.stringify(A) + '\n' + JSON.stringify(B) + '\n';
writeFileSync(store, seed);
const payloadC = { url: 'https://c.example/three', title: 'C', ts: 3,
  quote: { prefix: 'see ', exact: 'the captured selection', suffix: ' of it' } };
writeFileSync(inbox, [
  JSON.stringify(A),                                                    // line 1: dup of store
  JSON.stringify(payloadC),                                             // line 2: new payload (no id)
  JSON.stringify(payloadC),                                             // line 3: intra-batch dup
  '{bad json',                                                          // line 4: unparsable
  JSON.stringify({ url: 'javascript:alert(1)', ts: 4 }),                // line 5: bad url
  JSON.stringify({ url: 'https://d.example/four', ts: 4, html: F_GARBAGE }) // line 6: new via html
].join('\n') + '\n');

const out1 = [];
const run1 = runIngest(inbox, store, (m) => out1.push(m));
const after1 = readFileSync(store, 'utf8');
ok('ingest: appends new marks, dedupes store+batch, reports rejects',
  run1.added === 2 && run1.dup === 2 && run1.rejected.length === 2 && run1.storeTotal === 4,
  'added=' + run1.added + ' dup=' + run1.dup + ' rejected=' + run1.rejected.length + ' store=' + run1.storeTotal);
ok('ingest: pre-existing store lines byte-identical (nothing deleted or rewritten)',
  after1.startsWith(seed) && after1.split('\n').filter(Boolean).length === 4,
  'store lines=' + after1.split('\n').filter(Boolean).length);
ok('ingest: prints the new marks that would appear (#3, #4)',
  out1.some((l) => l.indexOf('NEW mark #3 ') === 0) && out1.some((l) => l.indexOf('NEW mark #4 ') === 0),
  out1.filter((l) => l.indexOf('NEW mark') === 0).join(' | ').slice(0, 150));
ok('ingest: rejected lines are reported with line number + named field',
  out1.some((l) => l.indexOf('REJECT line 4 field=json') === 0) &&
  out1.some((l) => l.indexOf('REJECT line 5 field=url') === 0),
  out1.filter((l) => l.indexOf('REJECT') === 0).join(' | ').slice(0, 150));
ok('ingest: new mark record is a valid record (validateRecord passes)',
  after1.split('\n').filter(Boolean).slice(2).every((l) => { try { validateRecord(JSON.parse(l)); return true; } catch { return false; } }));
const out2 = [];
const run2 = runIngest(inbox, store, (m) => out2.push(m));
const after2 = readFileSync(store, 'utf8');
ok('ingest rerun: idempotent (adds 0), store byte-identical after second pass',
  run2.added === 0 && run2.dup === 4 && after2 === after1,
  'added=' + run2.added + ' dup=' + run2.dup);
rmSync(T, { recursive: true, force: true });
ok('selftest leaves no residue (tmp inbox/store removed)', !existsSync(T));

// ------------------------------------------------------- 6 bookmarklet checks
const bmRaw = readFileSync(join(here, '..', 'lib', 'bookmarklet.js'), 'utf8');
const bm = bmRaw.replace(/\r?\n$/, '');
ok('bookmarklet: is a javascript: URL', bm.indexOf('javascript:') === 0);
ok('bookmarklet: length <= 2000 chars', bm.length <= 2000, 'length=' + bm.length);
ok('bookmarklet: one line (no CR/LF in source)', !/[\r\n]/.test(bm));
ok('bookmarklet: URL-safe — no # fragment, no % escapes', bm.indexOf('#') === -1 && bm.indexOf('%') === -1);
let parseErr = '';
try { new vm.Script(bm); } catch (e) { parseErr = String(e && e.message); }
ok('bookmarklet: syntax parses (node --check equivalent via vm.Script)', parseErr === '', parseErr);
ok('bookmarklet: endpoint placeholder + POST + clipboard fallback + always-on overlay',
  bm.indexOf('https://example.invalid/capture') >= 0 &&
  bm.indexOf("method:'POST'") >= 0 &&
  bm.indexOf("execCommand('copy')") >= 0 &&
  bm.indexOf('capture: ') >= 0 &&
  bm.indexOf('fetch(') >= 0 &&
  bm.indexOf('Date.now()') >= 0);

// ------------------------------------------------------------------- report
const pass = lines.filter((l) => l.status === 'PASS').length;
const total = lines.length;
console.log('CAPTURE RAIL SELFTEST — mint / extract chain / ingest / bookmarklet\n');
for (const l of lines) console.log(l.status + '  ' + l.name + (l.detail ? '  [' + l.detail + ']' : ''));
console.log('\n' + (pass === total ? 'SELFTEST PASS ' : 'SELFTEST FAIL ') + pass + '/' + total);
process.exit(pass === total ? 0 : 1);
