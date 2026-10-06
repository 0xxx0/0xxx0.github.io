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
  const buttons = ['read', 'cube', 'grid', 'walk', 'radial']
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
  vm.runInContext(m[1] + '\n;globalThis.__t = {HEX, TRIGRAMS, render, renderState, renderHex, cast, tossLine, parseHash, fig, RC, radialOrder, radialLayout, radialHit, drawRadial};',
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

check('state lens: supplied endpoints derive changing lines without becoming a cast and preserve STEP order', () => {
  fx.history.calls.length = 0;
  t.renderState('010100', '011110', 'lab', '3,5');
  const html = out();
  assert.ok(html.includes('STATE LENS · SUPPLIED ENDPOINTS · NOT A CAST'), 'state-lens truth banner');
  assert.ok(html.includes('LAB STEP witness: L3 → L5'), 'supplied STEP order witness');
  assert.ok(html.includes('derived line values: 8 7 6 7 6 8'), 'endpoint-derived 6/7/8/9 values');
  assert.ok(html.includes('This is a structural lens over supplied state, not divination.'), 'non-cast boundary');
  assert.ok(html.includes('RETURN → FIELD LAB'), 'state lens exposes exact return path');
  assert.ok(html.includes('/fold-bloom/lab/?mode=DATA&amp;stateFrom=010100&amp;stateTo=011110&amp;stateOrder=3%2C5')||html.includes('/fold-bloom/lab/?mode=DATA&stateFrom=010100&stateTo=011110&stateOrder=3%2C5'), 'return path carries endpoints + STEP order');
  assert.equal(fx.els.get('castPanel').hidden, true, 'random cast controls hidden in supplied-state mode');
  assert.ok(html.includes('class="sect">Transform'), 'supplied TO state renders as transform');
  assert.equal(fx.history.calls.at(-1)[2], '#b=010100&to=011110&order=3%2C5&q=lab', 'state lens hash preserves endpoints + STEP order');
  assert.equal(fx.els.get('seedNote').textContent, 'STATE · 010100 → 011110', 'state witness note');
  fx.location.hash = '#b=010100&to=011110&order=5%2C3';
  const h = t.parseHash();
  assert.equal(h.b, '010100');
  assert.equal(h.to, '011110');
  assert.equal(h.order, '5,3');
});

check('ordinary cast rendering restores the cast controls after leaving state-lens mode', () => {
  t.render([7,7,7,7,7,7], '');
  assert.equal(fx.els.get('castPanel').hidden, false);
});

check('state lens rejects an invalid supplied order and falls back to the moving-line set', () => {
  fx.history.calls.length = 0;
  t.renderState('010100', '011110', '', '1,2');
  assert.ok(out().includes('LAB STEP witness: L3 → L5'), 'invalid order cannot invent non-moving lines');
  assert.equal(fx.history.calls.at(-1)[2], '#b=010100&to=011110&order=3%2C5');
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

/* ================= radial wheel (iching/index.html) ================= */
check('radial: 64 spokes in King Wen order, clockwise from the top (№1 at −90°)', () => {
  t.RC.order = 'kw';
  const L = t.radialLayout();
  assert.equal(L.n, 64);
  assert.equal(L.spokes.length, 64);
  assert.deepEqual(L.spokes.map(s => s.id), Array.from({ length: 64 }, (_, i) => i + 1));
  assert.ok(Math.abs(L.spokes[0].ang + Math.PI / 2) < 1e-9, 'spoke №1 must sit at the top');
  for (let i = 1; i < 64; i++)
    assert.ok(L.spokes[i].ang > L.spokes[i - 1].ang, `spoke №${i + 1} must be clockwise of №${i}`);
});

check('radial: binary ordering walks the same 64 by six-bit address', () => {
  t.RC.order = 'bin';
  const L = t.radialLayout();
  const expect = HEXES.slice()
    .sort((a, b) => parseInt(a.binary, 2) - parseInt(b.binary, 2)).map(h => h.id);
  assert.deepEqual(L.spokes.map(s => s.id), expect);
  assert.equal(L.spokes[0].id, byBin.get('000000').id, 'binary order must open on 000000');
  assert.equal(L.spokes[63].id, byBin.get('111111').id, 'binary order must close on 111111');
  t.RC.order = 'kw';
});

check('radial: bar ranks the judgment text; every mark stays on the canvas', () => {
  const L = t.radialLayout();
  const maxChars = Math.max(...L.spokes.map(s => s.chars));
  const maxBar = Math.max(...L.spokes.map(s => s.bar));
  for (const s of L.spokes.filter(s => s.chars === maxChars))
    assert.equal(s.bar, maxBar, `hex ${s.id} carries the longest judgment but not the longest bar`);
  for (const s of L.spokes) {
    assert.ok(s.bar >= 12 && s.bar <= 62, `hex ${s.id} bar ${s.bar}`);
    for (const p of [s.glyph, s.barIn, s.barOut, ...s.lines])
      assert.ok(p.x >= 0 && p.x <= 760 && p.y >= 0 && p.y <= 760, `hex ${s.id} mark off-canvas`);
  }
});

check('radial: six marks per spoke, bottom mark outermost, matching the binary', () => {
  const L = t.radialLayout();
  const dist = p => Math.hypot(p.x - L.cx, p.y - L.cy);
  for (const s of L.spokes) {
    assert.equal(s.lines.length, 6, `hex ${s.id} mark count`);
    for (let k = 1; k < 6; k++)
      assert.ok(dist(s.lines[k]) < dist(s.lines[k - 1]),
        `hex ${s.id} mark ${k} must sit inward of mark ${k - 1}`);
    assert.equal(s.lines.map(l => (l.yang ? '1' : '0')).join(''), byId.get(s.id).binary,
      `hex ${s.id} marks must read out as its binary`);
  }
});

check('radial: hit test resolves a point back to its spoke and rejects the centre', () => {
  const L = t.radialLayout();
  for (const i of [0, 17, 32, 63]) {
    const s = L.spokes[i];
    assert.equal(t.radialHit(L.cx + 300 * Math.cos(s.ang), L.cy + 300 * Math.sin(s.ang), L).id, s.id,
      `spoke ${i} hit test`);
  }
  assert.equal(t.radialHit(L.cx, L.cy, L), null, 'the centre must not resolve to a spoke');
});

check('radial: drawRadial runs headless and reads out the hovered then the held hexagram', () => {
  t.RC.hover = 43; t.RC.current = 1;
  t.drawRadial();
  assert.ok(fx.els.get('radialInfo').innerHTML.includes('夬'), 'hovered spoke reads out');
  t.RC.hover = null;
  t.drawRadial();
  assert.ok(fx.els.get('radialInfo').innerHTML.includes('乾'), 'held hexagram reads out');
});

const fails = checks.filter(([, e]) => e);
for (const [name, e] of checks)
  if (e) console.error('  FAIL', name, '—', String(e.message).split('\n')[0]);
console.log((fails.length ? 'ICHING CORE TEST FAIL' : 'ICHING CORE TEST PASS')
  + ` · ${checks.length - fails.length}/${checks.length} checks`
  + ' · 64-hexagram data laws + /iching/ cast/render/state logic'
  + (fails.length ? ` · ${fails.length} failed` : ''));
process.exitCode = fails.length ? 1 : 0;