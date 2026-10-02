#!/usr/bin/env node
// foundry/omnitools/html-munge.mjs — HTML → DATA MUNGER 0.1
//
// Turn scraped (or local) HTML into plain text, markdown, link lists, table
// rows or page meta. Regex-based, zero dependencies, no DOM. Offline when the
// input is a file or stdin.
//
// USAGE
//   node html-munge.mjs <file|url|-> [--mode text|md|links|tables|meta|json]
//   --mode text    visible text, blocks separated by newlines (default)
//   --mode md      lightweight markdown: # headings, [text](href), - lists
//   --mode links   NDJSON {text,href} per unique link
//   --mode tables  JSON [{header:[],rows:[[]]}] per <table>
//   --mode meta    JSON {title,description,canonical,og,h1}
//   --mode json    everything above in one JSON object
//
// EXAMPLES
//   node html-munge.mjs page.html --mode links
//   curl -s https://example.com | node html-munge.mjs - --mode md
//   node html-munge.mjs https://example.com --mode tables > tables.json

'use strict';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
let input = null, mode = 'text';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--mode') mode = args[++i];
  else if (args[i] === '-h' || args[i] === '--help') {
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//') || l.startsWith('#!')).map(l => l.replace(/^(\/\/ ?|#!)/, '')).join('\n'));
    process.exit(0);
  } else if (args[i] === '-' || !args[i].startsWith('-')) input = args[i];
}
if (!['text', 'md', 'links', 'tables', 'meta', 'json'].includes(mode)) { console.error('bad --mode'); process.exit(2); }
if (!input) { console.error('html-munge.mjs <file|url|-> [--mode …]'); process.exit(2); }

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', copy: '©' };
const dec = s => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
const stripTags = s => dec(s.replace(/<[^>]*>/g, '')).replace(/[ \t\u00a0]+/g, ' ').trim();
const BLOCK = /<\/?(?:p|div|section|article|header|footer|nav|main|aside|h[1-6]|ul|ol|li|table|tr|pre|blockquote|figure|figcaption|form|br|hr|td|th)\b[^>]*>/gi;

function clean(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|template|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, m => m); // keep head; meta mode needs it
}

function toText(html) {
  return clean(html)
    .replace(BLOCK, '\n')
    .replace(/<[^>]*>/g, '')
    .split('\n').map(l => dec(l).replace(/[ \t\u00a0]+/g, ' ').trim())
    .filter((l, i, a) => l !== '' || (i && a[i - 1] !== '')).join('\n').trim();
}

function toMd(html) {
  let h = clean(html);
  h = h.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, t) => '\n' + '#'.repeat(Number(n)) + ' ' + stripTags(t) + '\n');
  h = h.replace(/<(?:b|strong)\b[^>]*>([\s\S]*?)<\/(?:b|strong)>/gi, '**$1**');
  h = h.replace(/<(?:i|em)\b[^>]*>([\s\S]*?)<\/(?:i|em)>/gi, '*$1*');
  h = h.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  h = h.replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, t) => '[' + stripTags(t) + '](' + href + ')');
  h = h.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
  h = h.replace(/<hr\b[^>]*>/gi, '\n---\n');
  h = h.replace(BLOCK, '\n').replace(/<[^>]*>/g, '');
  return h.split('\n').map(l => dec(l).replace(/[ \t\u00a0]+/g, ' ').trim())
    .filter((l, i, a) => l !== '' || (i && a[i - 1] !== '')).join('\n').trim();
}

function links(html) {
  const out = [], seen = new Set();
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1], text = stripTags(m[2]);
    const key = href + '|' + text;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text, href });
  }
  return out;
}

function tables(html) {
  const out = [];
  const tre = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let t;
  while ((t = tre.exec(html)) !== null) {
    const body = t[1], rows = [];
    const rre = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let r;
    while ((r = rre.exec(body)) !== null) {
      const cells = [];
      const cre = /<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi;
      let c;
      while ((c = cre.exec(r[1])) !== null) cells.push(stripTags(c[1]));
      if (cells.length) rows.push(cells);
    }
    if (rows.length) out.push({ header: rows[0], rows: rows.slice(1) });
  }
  return out;
}

function meta(html) {
  const get = re => { const m = re.exec(html); return m ? stripTags(m[1] ?? m[2] ?? '') : null; };
  const og = {};
  for (const m of html.matchAll(/<meta\s[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']*)["']/gi)) og[m[1]] = dec(m[2]);
  for (const m of html.matchAll(/<meta\s[^>]*content=["']([^"']*)["'][^>]*property=["']og:([^"']+)["']/gi)) og[m[2]] = dec(m[1]);
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => stripTags(m[1]));
  return {
    title: get(/<title\b[^>]*>([\s\S]*?)<\/title>/i),
    description: get(/<meta\s[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ?? get(/<meta\s[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i),
    canonical: get(/<link\s[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ?? get(/<link\s[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i),
    og, h1,
  };
}

async function load() {
  if (input === '-' || input === '') return readFileSync(0, 'utf8');
  if (/^https?:\/\//i.test(input)) {
    const r = await fetch(input, { headers: { 'user-agent': 'html-munge/0.1' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  }
  return readFileSync(input, 'utf8');
}

try {
  const html = await load();
  if (mode === 'text') console.log(toText(html));
  else if (mode === 'md') console.log(toMd(html));
  else if (mode === 'links') for (const l of links(html)) console.log(JSON.stringify(l));
  else if (mode === 'tables') console.log(JSON.stringify(tables(html), null, 2));
  else if (mode === 'meta') console.log(JSON.stringify(meta(html), null, 2));
  else console.log(JSON.stringify({ title: meta(html).title, meta: meta(html), text: toText(html), md: toMd(html), links: links(html), tables: tables(html) }, null, 2));
} catch (e) {
  console.error('html-munge: ' + e.message);
  process.exit(1);
}
