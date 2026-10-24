#!/usr/bin/env node
// capture-core.mjs — pure capture core for the 0xxx0 capture rail.
//
// Purpose: mint(input) -> object record (W3C Web Annotation shaped):
//   {id, url, title, ts, quote?, sha256_of_extract, extractor, minted_by}
//   id = sha256(url + '|' + ts) hex   <- canonical concatenation, documented, deterministic
// extract(html) -> {title, text, by:'jsonld'|'og'|'readability'|'raw'}
//
// Deps: node:crypto (stdlib only). No build, zero third-party deps.
// Determinism: this file never reads a clock and never uses Math.random — ts
// arrives with the input, so same input => same id, byte for byte.
// Run: node capture-core.mjs   (prints the limits table; no side effects otherwise)
// Verify: node selftest.mjs
//
// Validation law (documented, deliberate):
//   - caller-supplied STORED fields (url, title, quote, ts, enums) are REJECTED
//     with a named field (error.field) when malformed or over bound;
//   - EXTRACTION inputs/outputs (html, text, derived title) are TRUNCATED to
//     their bounds instead of rejected, so a capture is never lost to a weird page.
// Stop conditions: never normalize/rewrite the url (it is the identity datum);
// never delete or reorder anything here — this module only computes.

import { createHash } from 'node:crypto';

export const LIMITS = Object.freeze({
  url: 2048,           // stored, strict (reject)
  title: 512,          // stored, strict when supplied by caller; derived titles truncate
  quoteExact: 4000,    // stored quote.exact, strict
  quoteEdge: 512,      // stored quote.prefix/suffix, strict
  tsLen: 64,           // stored ts-as-string, strict
  html: 2000000,       // extraction input, truncated (never rejected)
  text: 500000,        // extraction input, truncated (never rejected)
  minReadability: 140  // chars of main text before a container qualifies as main text
});

export const EXTRACTORS = Object.freeze(['jsonld', 'og', 'readability', 'raw']);
export const MINTERS = Object.freeze(['bookmarklet', 'share', 'telegram']);

export class CaptureInputError extends Error {
  constructor(field, message) {
    super(field + ': ' + message);
    this.name = 'CaptureInputError';
    this.field = field;
  }
}

export function sha256(s) {
  return createHash('sha256').update(String(s), 'utf8').digest('hex');
}

// id = sha256(url|ts) — url joined to ts with '|', hex. url is literal, never normalized.
export function mintId(url, ts) {
  return sha256(String(url) + '|' + String(ts));
}

// ---------------------------------------------------------------- validators

const HTTP_RE = /^https?:\/\/[^\s]+$/i;
const HEX64_RE = /^[0-9a-f]{64}$/;

function typeName(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function checkUrl(v) {
  if (v === undefined || v === null) throw new CaptureInputError('url', 'required string');
  if (typeof v !== 'string') throw new CaptureInputError('url', 'must be a string, got ' + typeName(v));
  if (v.length > LIMITS.url) throw new CaptureInputError('url', 'length ' + v.length + ' exceeds bound ' + LIMITS.url);
  if (v.trim() !== v) throw new CaptureInputError('url', 'must not have surrounding whitespace');
  if (!HTTP_RE.test(v)) throw new CaptureInputError('url', 'must be an absolute http(s) URL');
  let u;
  try { u = new URL(v); } catch { throw new CaptureInputError('url', 'unparseable URL'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new CaptureInputError('url', 'scheme ' + u.protocol + ' rejected (http/https only)');
  }
  if (!u.hostname) throw new CaptureInputError('url', 'missing host');
  return v;
}

function checkTitle(v) {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') throw new CaptureInputError('title', 'must be a string, got ' + typeName(v));
  const t = v.replace(/^\s+|\s+$/g, '');
  if (t.length > LIMITS.title) throw new CaptureInputError('title', 'length ' + t.length + ' exceeds bound ' + LIMITS.title);
  return t;
}

function checkTs(v) {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new CaptureInputError('ts', 'must be a finite number (epoch ms) or a bounded string');
    if (v < 0) throw new CaptureInputError('ts', 'must not be negative');
    return v;
  }
  if (typeof v === 'string') {
    if (v.length === 0) throw new CaptureInputError('ts', 'must not be empty');
    if (v.length > LIMITS.tsLen) throw new CaptureInputError('ts', 'length exceeds bound ' + LIMITS.tsLen);
    return v;
  }
  throw new CaptureInputError('ts', v === undefined || v === null
    ? 'required (epoch ms number or bounded string)'
    : 'must be a number or string, got ' + typeName(v));
}

function checkQuote(q) {
  if (q === undefined || q === null) return undefined;
  if (typeof q !== 'object' || Array.isArray(q)) throw new CaptureInputError('quote', 'must be an object {prefix?,exact,suffix?}, got ' + typeName(q));
  const exact = q.exact;
  if (exact === undefined || exact === null) throw new CaptureInputError('quote.exact', 'required string');
  if (typeof exact !== 'string') throw new CaptureInputError('quote.exact', 'must be a string, got ' + typeName(exact));
  if (exact.length === 0) throw new CaptureInputError('quote.exact', 'must not be empty');
  if (exact.length > LIMITS.quoteExact) throw new CaptureInputError('quote.exact', 'length ' + exact.length + ' exceeds bound ' + LIMITS.quoteExact);
  const out = { exact };
  for (const key of ['prefix', 'suffix']) {
    const v = q[key];
    if (v === undefined || v === null) continue;
    if (typeof v !== 'string') throw new CaptureInputError('quote.' + key, 'must be a string, got ' + typeName(v));
    if (v.length > LIMITS.quoteEdge) throw new CaptureInputError('quote.' + key, 'length ' + v.length + ' exceeds bound ' + LIMITS.quoteEdge);
    if (v !== '') out[key] = v;
  }
  const rec = {};
  if (out.prefix !== undefined) rec.prefix = out.prefix;
  rec.exact = out.exact;
  if (out.suffix !== undefined) rec.suffix = out.suffix;
  return rec;
}

function checkEnum(v, allowed, field, optional) {
  if (v === undefined || v === null) {
    if (optional) return undefined;
    throw new CaptureInputError(field, 'required, one of ' + allowed.join('|'));
  }
  if (typeof v !== 'string' || allowed.indexOf(v) === -1) {
    throw new CaptureInputError(field, 'must be one of ' + allowed.join('|') + ', got ' + JSON.stringify(v));
  }
  return v;
}

// ------------------------------------------------------------ text plumbing

const NAMED_ENTITIES = Object.freeze({
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '',
  mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
  lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201c', rdquo: '\u201d',
  copy: '\u00a9', trade: '\u2122', middot: '\u00b7', bull: '\u2022'
});

function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, body) => {
    if (body.charAt(0) === '#') {
      const code = (body.charAt(1) === 'x' || body.charAt(1) === 'X')
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return m;
      if (code >= 0xd800 && code <= 0xdfff) return m;
      if (code < 32 && code !== 9 && code !== 10) return ' ';
      return String.fromCodePoint(code);
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named === undefined ? m : named;
  });
}

// normalizeText: deterministic line-preserving cleanup (control chars out,
// per-line whitespace collapsed, empty lines dropped).
export function normalizeText(s) {
  let t = String(s).replace(/\r\n?/g, '\n');
  t = t.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  t = t.replace(/\u00a0/g, ' ');
  const lines = t.split('\n')
    .map((l) => l.replace(/[\u200b\u2000-\u200a\u3000]/g, ' ').replace(/[ \t\f\v]+/g, ' ').replace(/^\s+|\s+$/g, ''))
    .filter((l) => l !== '');
  return lines.join('\n');
}

// flat: normalizeText with newlines collapsed (titles, one-line metadata).
function flat(s) {
  return normalizeText(s).split('\n').join(' ');
}

// textOf: strip script/style/comments, turn block tags into newlines, strip
// remaining tags, decode entities, normalize. Used for every text stage.
function textOf(fragment) {
  let s = String(fragment);
  s = s.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '\n');
  s = s.replace(/<!--[\s\S]*?-->/g, '\n');
  s = s.replace(/<\/?(p|div|section|article|main|nav|header|footer|aside|blockquote|pre|figure|figcaption|ul|ol|li|dl|dt|dd|table|thead|tbody|tr|td|th|h1|h2|h3|h4|h5|h6|address|hr|form|button|select|label|br)\b[^>]*>/gi, '\n');
  s = s.replace(/<[^>]*>/g, '');
  return normalizeText(decodeEntities(s));
}

function titleTag(html) {
  const m = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!m) return '';
  return flat(decodeEntities(m[1]));
}

function parseAttrs(s) {
  const out = {};
  const re = /([a-zA-Z_:][-\w:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(s))) {
    const key = m[1].toLowerCase();
    const val = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5] !== undefined ? m[5] : '';
    if (!(key in out)) out[key] = val; // first occurrence wins, document order
  }
  return out;
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

// ---------------------------------------------------------- extract chain

function collectJsonldNodes(d, out, depth) {
  if (depth > 6 || out.length > 500) return;
  if (Array.isArray(d)) { for (const x of d) collectJsonldNodes(x, out, depth + 1); return; }
  if (d && typeof d === 'object') {
    out.push(d);
    if (d['@graph']) collectJsonldNodes(d['@graph'], out, depth + 1);
  }
}

// Stage 1: <script type="application/ld+json"> headline (then name).
// headline is preferred over name across all nodes (article title field wins
// over an org/site name that may appear earlier in the graph).
function jsonldStage(html) {
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const nodes = [];
  let m;
  while ((m = re.exec(html))) {
    if (!/(^|\s)type\s*=\s*["']application\/ld\+json["']/i.test(m[1])) continue;
    let data;
    try { data = JSON.parse(m[2].replace(/^\ufeff/, '').trim()); } catch { continue; } // malformed JSON-LD: skip, next stage
    collectJsonldNodes(data, nodes, 0);
  }
  if (!nodes.length) return null;
  for (const key of ['headline', 'name']) {
    for (const n of nodes) {
      const v = n[key];
      if (typeof v !== 'string' || !v.trim()) continue;
      let text = '';
      for (const tk of ['articleBody', 'description']) {
        const tv = n[tk];
        if (typeof tv === 'string' && tv.trim()) { text = normalizeText(decodeEntities(tv)); break; }
      }
      return { title: flat(decodeEntities(v)), text, by: 'jsonld' };
    }
  }
  return null;
}

// Stage 2: og:title / twitter:title, text from og:|twitter:|meta description.
// Wins if it produced a title OR a description (spec groups them as one stage).
function ogStage(html) {
  const metas = {};
  const re = /<meta\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(html))) {
    const a = parseAttrs(m[1]);
    const key = (a.property || a.name || a.itemprop || '').toLowerCase();
    if (!key || (key in metas) || typeof a.content !== 'string') continue;
    metas[key] = a.content;
  }
  const title = metas['og:title'] || metas['twitter:title'] || '';
  const desc = metas['og:description'] || metas['twitter:description'] || metas['description'] || '';
  const t = title ? flat(decodeEntities(title)) : '';
  const d = desc ? normalizeText(decodeEntities(desc)) : '';
  if (!t && !d) return null;
  return { title: t, text: d, by: 'og' };
}

// Stage 3: Readability-like main text — strip boilerplate, scan container
// spans with a tag stack, score each span by (chars + 40*commas) with link
// density penalty and a small depth bonus; earliest span wins ties.
const CONTAINERS = new Set(['article', 'main', 'section', 'div', 'td', 'th', 'li', 'ul', 'ol', 'table', 'figure', 'blockquote', 'pre', 'dd', 'dl', 'body']);

function spanScore(clean, span) {
  const raw = textOf(clean.slice(span.start, span.end));
  const chars = raw.replace(/\s+/g, '').length;
  if (chars < LIMITS.minReadability) return 0;
  const commas = (raw.match(/,/g) || []).length;
  const slice = clean.slice(span.start, span.end);
  let linkChars = 0;
  const aRe = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let am;
  while ((am = aRe.exec(slice))) linkChars += textOf(am[1]).replace(/\s+/g, '').length;
  const density = linkChars / Math.max(1, chars);
  return (chars + 40 * commas) * (1 - Math.min(density, 0.95)) + 8 * Math.min(span.depth, 6);
}

function readabilityStage(html) {
  const bodyM = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const scope = bodyM ? bodyM[1] : html;
  let clean = scope
    .replace(/<(script|style|noscript|svg|canvas|iframe)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '\n')
    .replace(/<!--[\s\S]*?-->/g, '\n');
  for (const t of ['nav', 'header', 'footer', 'form', 'aside', 'button', 'select']) {
    clean = clean.replace(new RegExp('<' + t + '\\b[^>]*>[\\s\\S]*?<\\/' + t + '\\s*>', 'gi'), '\n');
  }
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)(\s[^<>]*?)?(\/?)>/g;
  const stack = [];
  const spans = [];
  let m;
  while ((m = tagRe.exec(clean))) {
    const closing = m[1] === '/';
    const name = m[2].toLowerCase();
    const selfClose = m[4] === '/' || VOID_TAGS.has(name);
    if (!closing && !selfClose) {
      if (CONTAINERS.has(name)) {
        if (stack.length >= 96) stack.shift(); // depth bound, deterministic
        stack.push({ name, start: m.index, depth: stack.length });
      }
    } else if (closing) {
      let idx = -1;
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].name === name) { idx = i; break; }
      if (idx >= 0) {
        const open = stack[idx];
        if (spans.length < 4000) spans.push({ start: open.start, end: m.index, depth: open.depth });
        stack.length = idx; // close this one and everything above it
      }
    }
  }
  let best = null;
  let bestScore = 0;
  for (const s of spans) {
    const score = spanScore(clean, s);
    if (score > bestScore) { bestScore = score; best = s; } // strictly greater: earliest wins ties
  }
  if (best) return { title: titleTag(html), text: textOf(clean.slice(best.start, best.end)), by: 'readability' };
  // fallback: the whole scope counts as one block if it clears the floor
  const whole = textOf(clean);
  const chars = whole.replace(/\s+/g, '').length;
  if (chars >= LIMITS.minReadability) {
    let linkChars = 0;
    const aRe = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
    let am;
    while ((am = aRe.exec(clean))) linkChars += textOf(am[1]).replace(/\s+/g, '').length;
    if (linkChars / Math.max(1, chars) < 0.6) return { title: titleTag(html), text: whole, by: 'readability' };
  }
  return null;
}

// Stage 4 (else): raw — title tag text + whole-document text with scripts,
// styles and comments removed. This is the stage a garbage page lands on.
export function extract(html) {
  if (typeof html !== 'string') throw new CaptureInputError('html', 'must be a string, got ' + typeName(html));
  if (html.length > LIMITS.html) html = html.slice(0, LIMITS.html); // truncation, never rejection
  const j = jsonldStage(html);
  if (j) return j;
  const o = ogStage(html);
  if (o) return o;
  const r = readabilityStage(html);
  if (r) return r;
  return { title: titleTag(html), text: textOf(html), by: 'raw' };
}

// -------------------------------------------------------------------- mint

export function mint(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new CaptureInputError('input', 'must be a plain object, got ' + typeName(input));
  }
  const url = checkUrl(input.url);
  const title = checkTitle(input.title);
  const ts = checkTs(input.ts);
  const quote = checkQuote(input.quote);
  const hint = checkEnum(input.extractor_hint, EXTRACTORS, 'extractor_hint', true);
  const mintedBy = checkEnum(input.minted_by, MINTERS, 'minted_by', true) || 'bookmarklet';
  if (input.html !== undefined && input.html !== null && typeof input.html !== 'string') {
    throw new CaptureInputError('html', 'must be a string, got ' + typeName(input.html));
  }
  if (input.text !== undefined && input.text !== null && typeof input.text !== 'string') {
    throw new CaptureInputError('text', 'must be a string, got ' + typeName(input.text));
  }

  let text = '';
  let extractor = hint || 'raw';
  let recordTitle = title;
  if (input.html !== undefined && input.html !== null) {
    const ex = extract(input.html); // always succeeds: garbage -> by 'raw'
    text = ex.text;
    extractor = ex.by;
    if (!recordTitle) recordTitle = ex.title.slice(0, LIMITS.title); // derived titles truncate
  } else if (input.text !== undefined && input.text !== null) {
    text = input.text.length > LIMITS.text ? input.text.slice(0, LIMITS.text) : input.text;
  }

  const record = { id: mintId(url, ts), url, title: recordTitle, ts };
  if (quote) record.quote = quote;
  record.sha256_of_extract = sha256(text);
  record.extractor = extractor;
  record.minted_by = mintedBy;
  return record;
}

// validateRecord: full integrity check for a stored/minted record — including
// re-deriving id from sha256(url|ts) so a tampered line is rejected loudly.
export function validateRecord(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new CaptureInputError('record', 'must be a plain object, got ' + typeName(o));
  const url = checkUrl(o.url);
  let title = '';
  if (o.title !== undefined && o.title !== null) {
    if (typeof o.title !== 'string') throw new CaptureInputError('title', 'must be a string, got ' + typeName(o.title));
    if (o.title.length > LIMITS.title) throw new CaptureInputError('title', 'length exceeds bound ' + LIMITS.title);
    title = o.title;
  }
  const ts = checkTs(o.ts);
  const quote = checkQuote(o.quote);
  const extractor = checkEnum(o.extractor, EXTRACTORS, 'extractor', false);
  const mintedBy = checkEnum(o.minted_by, MINTERS, 'minted_by', false);
  if (typeof o.id !== 'string' || !HEX64_RE.test(o.id)) throw new CaptureInputError('id', 'must be a 64-hex sha256');
  const expected = mintId(url, ts);
  if (o.id !== expected) throw new CaptureInputError('id', 'does not match sha256(url|ts), expected ' + expected);
  if (typeof o.sha256_of_extract !== 'string' || !HEX64_RE.test(o.sha256_of_extract)) {
    throw new CaptureInputError('sha256_of_extract', 'must be a 64-hex sha256');
  }
  const rec = { id: o.id, url, title, ts };
  if (quote) rec.quote = quote;
  rec.sha256_of_extract = o.sha256_of_extract;
  rec.extractor = extractor;
  rec.minted_by = mintedBy;
  return rec;
}

// CLI: print the contract (limits + enums + id formula) as JSON.
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
const isMain = (() => {
  try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; } catch { return false; }
})();
if (isMain) {
  console.log(JSON.stringify({
    schema: '0xxx0/capture-core-limits/v1',
    id_formula: 'sha256(url + "|" + ts) hex',
    limits: LIMITS,
    extractors: EXTRACTORS,
    minters: MINTERS
  }, null, 2));
}
