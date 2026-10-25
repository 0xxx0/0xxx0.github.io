#!/usr/bin/env node
// derive-source.mjs — Buddhadhamma (local corpus) -> stage/source-dhamma.json.
//
// PROVENANCE -> SELECTION -> MAPPING -> PROJECTION -> FINGERPRINT.
//
//   raw HTML (fetched, LOCAL ONLY: void-anchor/sleeper/corpus/buddhadhamma/)
//     └─ text/<page>.txt                one paragraph per line, blank-line separated
//          └─ selection                 the opening window of each page (--window, 9)
//               └─ SLEEPER core parseSource   paragraph=district, sentence=building,
//                                             word=room, character=material,
//                                             punctuation=rain/window/lamp/beacon
//                    └─ projectCells          3072 cells, reading order
//                         └─ source-dhamma.json    matter + per-cell coordinates +
//                                                  one cited line per district
//
// The book's text NEVER enters the public repo: this emits a sampled projection
// (3072 characters of matter), index coordinates into the real structure, and
// one quoted line per district with its locator. Regenerating from the same
// corpus + window reproduces the file byte for byte (proven in the selftest).
//
//   node sleeper/ladder/derive-source.mjs                      # writes the repo file
//   node sleeper/ladder/derive-source.mjs --window 8 --out /tmp/other.json
//
// Exit 0 = written. Exit 2 = corpus missing (the local half of the chain is
// absent; nothing is invented).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const require = createRequire(import.meta.url);
const CORE = require('./ladder-core.js');
const HERE = dirname(fileURLToPath(import.meta.url));

export const CORPUS_DEFAULT = process.env.BUDDHADHAMMA_CORPUS || join(homedir(), 'void-anchor', 'sleeper', 'corpus', 'buddhadhamma');

export const PAGES = [
  { slug: 'path-factors', chapter: 'Section 7', title: 'Section 7: Path Factors' },
  { slug: 'path-factors-of-wisdom', chapter: 'Ch. 16', title: 'Path Factors of Wisdom' },
  { slug: 'path-factors-of-virtuous-conduct', chapter: 'Ch. 17', title: 'Path Factors of Virtuous Conduct' },
  { slug: 'path-factors-of-concentration', chapter: 'Ch. 18', title: 'Path Factors of Concentration' },
];

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// A paragraph is matter if it is prose: long enough to carry a sentence, and
// not a figure caption ("(Open large size)") or a bare citation.
function matterParagraph(text) {
  const t = String(text || '').trim();
  if (t.length < 40) return false;
  if (/^\(/.test(t)) return false;                       // figure caption
  if ((t.match(/\S+/g) || []).length < 6) return false;
  const letters = (t.match(/\p{L}/gu) || []).length;
  if (letters / t.length < 0.55) return false;           // citation / numeric table ("DN 22 / D ii 311; …")
  // Diacritic density separates prose from the source's own Pali recension
  // block (measured: Pali 0.139, prose <= 0.048). The Pali is the same line in
  // another language; the city carries the translation once, not twice.
  const marks = (t.match(/[\u00C0-\u024F\u1E00-\u1EFF]/g) || []).length;
  if (marks / Math.max(1, letters) > 0.08) return false;
  return /[.!?…]["'”’)]?$/.test(t) || t.length > 90;
}

// The cited line: the district's first sentence, clipped at a word boundary.
// <= 92 characters so one paragraph is quoted per district and no more.
export function citeLine(sentence, max) {
  const lim = max || 92;
  const t = String(sentence || '').replace(/\s+/g, ' ').trim();
  if (t.length <= lim) return t;
  const cut = t.slice(0, lim - 1);
  const at = cut.lastIndexOf(' ');
  return (at > lim * 0.55 ? cut.slice(0, at) : cut).replace(/[,;:.\s]+$/, '') + '…';
}

// One word out of the line: the longest content word of >= 6 characters that is
// not the first or last token (a blank you can only fill from the sentence).
export function blankWord(line) {
  const toks = String(line || '').split(/\s+/).filter(Boolean);
  // Unicode-aware: "majjhimā-paṭipadā" is a word, not a word plus punctuation.
  // (\w is ASCII-only and would strip the last "ā" into the blank.)
  const bare = (w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  const cands = [];
  toks.forEach((tok, i) => {
    const w = bare(tok);
    if (w.length < 4) return;
    if (!/^[\p{L}][\p{L}'’-]*$/u.test(w)) return;
    const edge = i === 0 || i === toks.length - 1;
    cands.push({ w, i, len: w.length, edge });
  });
  if (!cands.length) return null;
  const inner = cands.filter((c) => !c.edge && c.len >= 6);
  const pool = inner.length ? inner : cands;
  pool.sort((a, b) => (b.len - a.len) || (a.i - b.i));
  const pick = pool[0];
  if (pick.len < 4) return null;
  // the blank replaces the word, not its punctuation: "(____ veramaṇī)."
  return { word: pick.w, index: pick.i, cloze: toks.map((t, i) => (i === pick.i ? t.replace(pick.w, '____') : t)).join(' ') };
}

export function selectText(corpus, window) {
  const W = window || 9;
  const pages = [], selected = [], districts = [], lineKeys = new Set();
  for (const spec of PAGES) {
    const txtPath = join(corpus, 'text', spec.slug + '.txt');
    if (!existsSync(txtPath)) throw new Error('corpus missing ' + txtPath);
    const paras = readFileSync(txtPath, 'utf8').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    const headsPath = join(corpus, 'heads', spec.slug + '.json');
    const heads = existsSync(headsPath) ? JSON.parse(readFileSync(headsPath, 'utf8')) : [];
    const headsAt = (i) => {
      let h = spec.title;
      for (const x of heads) { if (x.paragraph <= i && x.level >= 2) h = x.text; }
      return h;
    };
    let taken = 0;
    for (let i = 0; i < paras.length && taken < W; i++) {
      if (!matterParagraph(paras[i])) continue;
      // one district, one line: a paragraph whose opening repeats one already
      // in the selection is not a second district (the four right-effort
      // paragraphs are near-identical; a walk should not meet the same line
      // twice and think it has learned two things).
      const key = citeLine(CORE.firstSentence(paras[i]), 64).toLowerCase();
      if (lineKeys.has(key)) continue;
      lineKeys.add(key);
      taken++;
      const p = selected.length;
      selected.push(paras[i]);
      districts.push({
        p, chapter: spec.chapter, page: spec.title, slug: spec.slug,
        para: i, heading: headsAt(i), locator: spec.chapter + ' · ¶' + (i + 1),
      });
    }
    pages.push({
      slug: spec.slug, chapter: spec.chapter, title: spec.title,
      source_url: 'https://buddhadhamma.github.io/' + spec.slug + '.html',
      raw_bytes: existsSync(join(corpus, 'raw', spec.slug + '.html')) ? statSync(join(corpus, 'raw', spec.slug + '.html')).size : null,
      raw_sha256: existsSync(join(corpus, 'raw', spec.slug + '.html')) ? sha256(readFileSync(join(corpus, 'raw', spec.slug + '.html'))) : null,
      text_bytes: statSync(txtPath).size,
      paragraphs: paras.length,
      selected: taken,
      chars: paras.reduce((n, s) => n + s.length, 0),
    });
  }
  return { pages, selected, districts, window: W };
}

const B36 = 2;
const enc = (v) => Math.max(0, Math.min(1295, v | 0)).toString(36).padStart(B36, '0');

export function derive(opts) {
  const o = opts || {};
  const corpus = o.corpus || CORPUS_DEFAULT;
  const retrieved = o.retrieved || '2026-10-25';
  const sel = selectText(corpus, o.window || 9);
  const sliceText = sel.selected.join('\n\n') + '\n';
  const sliceSha = sha256(Buffer.from(sliceText, 'utf8'));
  const parsed = CORE.parseSource(sliceText);                    // the SAME mapping
  const units = CORE.projectCells(parsed, CORE.CELLS);

  const sentenceOf = (p) => parsed.sentences.filter((s) => s.p === p);
  const districts = sel.districts.map((d) => {
    const ss = sentenceOf(d.p);
    const words = ss.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0);
    const line = citeLine(ss.length ? ss[0].text : '');
    const blank = blankWord(line);
    return Object.assign({}, d, {
      sentences: ss.length, words, chars: sel.selected[d.p].length, line,
      answer: blank ? blank.word : '', cloze: blank ? blank.cloze : '',
    });
  });

  const provenance = {
    title: 'Buddhadhamma: The Laws of Nature and Their Benefits to Life',
    author: 'P. A. Payutto (Bhikkhu P. A. Payutto)',
    translator: 'Robin Moore',
    edition: 'free online edition · buddhadhamma.github.io · site last updated 2026-10-12',
    source_url: 'https://buddhadhamma.github.io/',
    pages: sel.pages.map((p) => p.source_url),
    retrieved,
    rights: '© Buddhadhamma Foundation 2021 · free to download from buddhadhamma.github.io · distribution and commercial rights reserved. This file carries a sampled projection and one cited line per district, not the text.',
    local_corpus: 'void-anchor/sleeper/corpus/buddhadhamma/ (raw HTML + extracted text stay local; never served)',
  };

  const counts = {
    pages: sel.pages.length,
    districts: districts.length,
    sentences: parsed.counts.sentences,
    words: parsed.counts.words,
    chars: parsed.counts.chars,
    cells: CORE.CELLS,
    chars_per_cell: +(parsed.counts.chars / CORE.CELLS).toFixed(3),
    corpus: sel.pages.reduce((n, p) => n + p.paragraphs, 0),
    corpus_chars: sel.pages.reduce((n, p) => n + p.chars, 0),
  };

  const derived = {
    schema: CORE.SOURCE_SCHEMA,
    fingerprint: CORE.sourceFingerprint(sliceSha),
    provenance,
    selection: {
      rule: 'opening window: the first ' + sel.window + ' prose paragraphs (>=40 chars, >=6 words) of each page, in reading order',
      window: sel.window,
      pages: sel.pages.map((p) => ({ slug: p.slug, chapter: p.chapter, selected: p.selected, paragraphs: p.paragraphs, text_bytes: p.text_bytes, raw_bytes: p.raw_bytes, raw_sha256: p.raw_sha256 })),
      sha256: sliceSha,
      bytes: Buffer.byteLength(sliceText, 'utf8'),
      chars: parsed.counts.chars,
      districts: districts.length,
    },
    counts,
    matter: units.map((u) => u.ch).join(''),
    cells: {
      p: units.map((u) => enc(u.p)).join(''),
      s: units.map((u) => enc(u.s)).join(''),
      w: units.map((u) => enc(u.w)).join(''),
    },
    districts: districts.map((d) => ({
      p: d.p, chapter: d.chapter, page: d.page, slug: d.slug, para: d.para,
      heading: d.heading, locator: d.locator,
      sentences: d.sentences, words: d.words, chars: d.chars,
      line: d.line, answer: d.answer, cloze: d.cloze,
    })),
  };
  return { derived, sliceText, parsed, sel };
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const out = arg('--out', join(HERE, 'source-dhamma.json'));
  const window = Number(arg('--window', '9'));
  const corpus = arg('--corpus', CORPUS_DEFAULT);
  if (!existsSync(join(corpus, 'text'))) {
    console.error('corpus missing: ' + corpus + ' — fetch the pages first (see extract.py); refusing to invent a source.');
    process.exit(2);
  }
  const { derived, parsed } = derive({ corpus, window });
  writeFileSync(out, JSON.stringify(derived, null, 1) + '\n');
  const kb = (statSync(out).size / 1024).toFixed(1);
  console.log('wrote   ' + out + '  (' + kb + ' KB)');
  console.log('source  ' + derived.provenance.source_url + ' · retrieved ' + derived.provenance.retrieved);
  console.log('select  ' + derived.selection.districts + ' districts / ' + parsed.counts.chars + ' chars from ' + derived.counts.corpus + ' corpus paragraphs (' + derived.counts.corpus_chars + ' chars)');
  console.log('matter  ' + derived.matter.length + ' cells · ' + parsed.counts.sentences + ' buildings · ' + parsed.counts.words + ' rooms');
  console.log('finger  ' + derived.fingerprint + '  (= hash32("' + CORE.FINGERPRINT_PREFIX + '" + sha256(selection).slice(0,12) + "…"))');
  console.log('sha256  ' + derived.selection.sha256);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
