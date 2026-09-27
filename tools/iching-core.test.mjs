#!/usr/bin/env node
'use strict';
/* ICHING head test — the /iching/ surface had no runnable check of any kind.
   Asserts the 64-hexagram data laws of iching/hexagrams.json against the
   rules the data itself claims (meta.principles: King Wen sequence; binaries
   bottom-to-top, lower trigram = low 3 bits; nuclear = lines 2-5;
   changing_to = single-line flip result), and exercises the actual inline
   script of iching/index.html (cast / render / address-state) inside a vm
   with a stub DOM — the same fixture technique as
   tools/interphase-glyph-conformance.test.mjs. Node stdlib only.
   Run: node tools/iching-core.test.mjs */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const plain = x => JSON.parse(JSON.stringify(x));

const DATA = JSON.parse(read('iching/hexagrams.json'));
const HEXES = DATA.hexagrams;
const byId = new Map(HEXES.map(h => [h.id, h]));
const byBin = new Map(HEXES.map(h => [h.binary, h]));

/* ---- fixture: run the real inline script of iching/index.html headless ---- */
function fixture() {
  const els = new Map();
  const ctx2d = {
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {},
    lineTo() {}, stroke() {}, arc() {}, fill() {}, fillText() {},
    measureText: s => ({ width: String(s).length * 10 }),
  };
  const el = id => {
    if (!els.has(id)) els.set(id, {
      id, innerHTML: '', textContent: '', value: '', hidden: false,
      style: {}, dataset: {}, classList: { toggle() {}, add() {}, remove() {} },
      width: 760, height: 560,
      addEventListener() {}, scrollIntoView() {}, setPointerCapture() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 760, height: 560 }),
      getContext: () => ctx2d,
    });
    return els.get(id);
  };
  const buttons = ['read', 'cube', 'grid', 'walk']
    .map(v => ({ dataset: { view: v }, classList: { toggle() {} }, addEventListener() {} }));
  const history = { calls: [], replaceState(...a) { this.calls.push(a); } };
  const location = { hash: '', href: '' };
  const context = {
    console, URL, URLSearchParams, setTimeout, clearTimeout,
    fetch: async () => ({ json: async () => plain(DATA) }),
    requestAnimationFrame() {},
    navigator: { clipboard: { writeText: async () => {} } },
    history, location,
    document: {
      getElementById: el,
      querySelectorAll: sel => (sel === 'nav.views button' ? buttons : []),
      createElement: () => el('__created__'),
    },
    addEventListener() {},
  };
  context.window = context;
  vm.createContext(context);
  const html = read('iching/index.html');
  const m = html.match(/<script>([\s\S]*)<\/script>/);
  if (!m) throw new Error('iching/index.html: inline <script> block not found');
  vm.runInContext(m[1] + '\n;globalThis.__t = {HEX, TRIGRAMS, render, renderHex, cast, tossLine, parseHash, fig};',
    context, { filename: 'iching/index.html' });
  return { t: context.__t, els, history, location };
}

const checks = [];
const check = (name, fn) => {
  try { fn(); checks.push([name, null]); }
  catch (e) { checks.push([name, e]); }
};
const fixtureReady = fixture();

/* ================= data laws (iching/hexagrams.json) ================= */
check('data: meta + exactly 64 hexagrams (meta.counts.hexagrams = 64)', () => {
  assert.equal(HEXES.length, 64);
  assert.equal(DATA.meta.counts.hexagrams, 64);
});

check('data: ids are exactly King Wen 1..64 with exact prev/next chain', () => {
  assert.deepEqual([...byId.keys()].sort((a, b) => a - b),
    Array.from({ length: 64 }, (_, i) => i + 1));
  for (const h of HEXES) {
    assert.equal(h.sequence.prev, h.id === 1 ? null : h.id - 1, `hex ${h.id} prev`);
    assert.equal(h.sequence.next, h.id === 64 ? null : h.id + 1, `hex ${h.id} next`);
  }
});

check('data: binaries are a bijection over all 64 six-bit strings', () => {
  for (const h of HEXES) assert.match(h.binary, /^[01]{6}$/, `hex ${h.id} binary`);
  assert.equal(byBin.size, 64);
  for (let i = 0; i < 64; i++)
    assert.ok(byBin.has(i.toString(2).padStart(6, '0')), `binary gap at ${i}`);
});

check('data: unicode symbols follow the U+4DC0 King Wen ordering', () => {
  for (const h of HEXES)
    assert.equal(h.unicode.codePointAt(0), 0x4DC0 + h.id - 1, `hex ${h.id} unicode`);
});

check('data: trigram pairs match the page TRIGRAMS table (low 3 / high 3 bits)', () => {
  const tri = fixtureReady.t.TRIGRAMS;
  for (const h of HEXES) {
    const lo = tri[h.binary.slice(0, 3)], up = tri[h.binary.slice(3, 6)];
    assert.equal(h.trigrams.lower.zh, lo.zh, `hex ${h.id} lower zh`);
    assert.equal(h.trigrams.lower.en, lo.en, `hex ${h.id} lower en`);
    assert.equal(h.trigrams.upper.zh, up.zh, `hex ${h.id} upper zh`);
    assert.equal(h.trigrams.upper.en, up.en, `hex ${h.id} upper en`);
  }
});

check('data: nuclear 互卦 = lines 2–5 projection for all 64', () => {
  for (const h of HEXES) {
    const b = h.binary;
    const nucBin = b[1] + b[2] + b[3] + b[2] + b[3] + b[4];
    const target = byBin.get(nucBin);
    assert.ok(target, `hex ${h.id}: nuclear binary ${nucBin} missing`);
    assert.equal(h.nuclear_id, target.id, `hex ${h.id} nuclear_id`);
  }
});

check('data: changing_to = single-line flip result for all 64×6 lines', () => {
  for (const h of HEXES) {
    const lines = new Map(h.lines.map(l => [l.position, l]));
    for (let p = 1; p <= 6; p++) {
      const l = lines.get(p);
      assert.ok(l, `hex ${h.id} missing line ${p}`);
      const chars = h.binary.split('');
      chars[p - 1] = chars[p - 1] === '1' ? '0' : '1';
      assert.equal(l.changing_to, byBin.get(chars.join('')).id, `hex ${h.id} line ${p} changing_to`);
    }
  }
});

check('data: line sets are positions 1–6, plus 用九/用六 only on hex 1 and 2', () => {
  for (const h of HEXES) {
    const positions = h.lines.map(l => l.position);
    assert.deepEqual(positions.slice(0, 6), [1, 2, 3, 4, 5, 6], `hex ${h.id} positions`);
    if (positions.length === 7) {
      assert.ok(h.id === 1 || h.id === 2, `hex ${h.id} has an unsanctioned 7th line`);
      assert.equal(h.lines[6].changing_to, null, `hex ${h.id} line 7 changing_to`);
    } else assert.equal(positions.length, 6, `hex ${h.id} line count`);
  }
  assert.equal(HEXES.filter(h => h.lines.length === 7).map(h => h.id).join(), '1,2');
  assert.equal(byId.get(1).lines[6].name_zh, '用九');
  assert.equal(byId.get(2).lines[6].name_zh, '用六');
});

check('data: judgment / image / names / line text present for all 64', () => {
  for (const h of HEXES) {
    for (const k of ['name_zh', 'name_en', 'judgment_zh', 'image_zh'])
      assert.ok(String(h[k] || '').trim(), `hex ${h.id} ${k} empty`);
    for (const l of h.lines)
      assert.ok(String(l.zh || '').trim(), `hex ${h.id} line ${l.position} zh empty`);
  }
});

/* ================= page state logic (iching/index.html) ================= */
await new Promise(r => setTimeout(r, 25)); // let the page's async load() settle
const fx = fixtureReady;
const t = fx.t;

check('page: inline script boots and load() builds 64 hexagrams + indexes', () => {
  assert.equal(t.HEX.list.length, 64);
  assert.equal(Object.keys(t.HEX.byBin).length, 64);
  assert.equal(Object.keys(t.HEX.byId).length, 64);
});

check('page cast law: tossLine ∈ 6..9 and cast() returns six tosses', () => {
  for (let i = 0; i < 300; i++) {
    const v = t.tossLine();
    assert.ok(v >= 6 && v <= 9 && Number.isInteger(v), `tossLine → ${v}`);
  }
  for (let i = 0; i < 20; i++) {
    const vals = t.cast();
    assert.equal(vals.length, 6, 'cast length');
    for (const v of vals) assert.ok(v >= 6 && v <= 9, `cast → ${v}`);
  }
});

const out = () => fx.els.get('out').innerHTML;
const section = (from, to) => {
  const html = out();
  const i = from ? html.indexOf(from) : 0;
  assert.ok(i >= 0, `section "${from}" not found`);
  const j = to ? html.indexOf(to, i + from.length) : html.length;
  assert.ok(j > i, `section end "${to}" not found`);
  return html.slice(i, j);
};

check('render 777777: primary 乾 №1, changing lines: none, no Transform panel', () => {
  t.render([7, 7, 7, 7, 7, 7], '');
  const head = section('', 'class="sect">Judgment');
  assert.ok(head.includes('The Creative'), 'primary name');
  assert.ok(head.includes('· № 1'), 'primary №');
  assert.ok(head.includes('changing lines: none'), 'changing summary');
  assert.ok(!out().includes('class="sect">Transform'), 'Transform panel must be absent');
});

check('render 999999: primary 乾 transforms to 坤 №2, lines 1–6 all changing', () => {
  t.render([9, 9, 9, 9, 9, 9], 'why');
  const head = section('', 'class="sect">Judgment');
  assert.ok(head.includes('your question:'), 'question echo');
  assert.ok(head.includes('<b>why</b>'), 'question text');
  assert.ok(head.includes('The Creative'), 'primary name');
  assert.ok(head.includes('changing lines: line 1, line 2, line 3, line 4, line 5, line 6'),
    'changing summary');
  const tr = section('class="sect">Transform', 'class="sect">Nuclear');
  assert.ok(tr.includes('坤 <span class="py" style="font-size:13px">№ 2</span>'), 'transform 坤 №2');
  assert.ok(tr.includes('open full №2 →'), 'transform deep link');
  assert.equal((out().match(/>9→</g) || []).length, 6, 'six 9→ change tags');
});

check('render 666666: primary 坤 №2 transforms to 乾 №1', () => {
  t.render([6, 6, 6, 6, 6, 6], '');
  const head = section('', 'class="sect">Judgment');
  assert.ok(head.includes('The Receptive'), 'primary name');
  assert.ok(head.includes('· № 2'), 'primary №');
  const tr = section('class="sect">Transform', 'class="sect">Nuclear');
  assert.ok(tr.includes('乾 <span class="py" style="font-size:13px">№ 1</span>'), 'transform 乾 №1');
  assert.ok(tr.includes('open full №1 →'), 'transform deep link');
  assert.equal((out().match(/>6→</g) || []).length, 6, 'six 6→ change tags');
});

check('renderHex(63): 既濟 with nuclear 未濟 №64 and sequence № 63 of 64', () => {
  t.renderHex(63, '');
  assert.ok(section('', 'class="sect">Judgment').includes('既濟'), 'primary zh name');
  const nuc = section('class="sect">Nuclear', 'class="sect">Sequence');
  assert.ok(nuc.includes('未濟 <span class="py" style="font-size:13px">№ 64</span>'), 'nuclear panel');
  assert.ok(out().includes('№ 63 of 64'), 'sequence position');
});

check('line 7 用九 renders only where the data carries it (hex 1 yes, hex 5 no)', () => {
  t.renderHex(1, '');
  assert.ok(out().includes('用九'), 'hex 1 must render 用九');
  t.renderHex(5, '');
  assert.ok(!out().includes('用九'), 'hex 5 must not render 用九');
  assert.ok(!out().includes('line 7'), 'hex 5 must not render a 7th line');
});

check('cast address state: render writes #c=…&q=… and parseHash round-trips it', () => {
  fx.history.calls.length = 0;
  t.render([7, 8, 7, 8, 7, 8], 'ask');
  assert.equal(fx.history.calls.at(-1)[2], '#c=787878&q=ask', 'shareable hash');
  assert.equal(fx.els.get('seedNote').textContent, '#787878', 'seed note');
  fx.location.hash = '#c=678978&q=hi';
  const h = t.parseHash();
  assert.equal(h.c, '678978', 'parseHash c');
  assert.equal(h.q, 'hi', 'parseHash q');
  assert.equal(h.h, null, 'parseHash h');
});

const fails = checks.filter(([, e]) => e);
for (const [name, e] of checks)
  if (e) console.error('  FAIL', name, '—', String(e.message).split('\n')[0]);
console.log((fails.length ? 'ICHING CORE TEST FAIL' : 'ICHING CORE TEST PASS')
  + ` · ${checks.length - fails.length}/${checks.length} checks`
  + ' · 64-hexagram data laws + /iching/ cast/render/state logic'
  + (fails.length ? ` · ${fails.length} failed` : ''));
process.exitCode = fails.length ? 1 : 0;