#!/usr/bin/env node
// ring-game-smoke.mjs — does THE RING actually play?
//
// WHY this exists: every previous "game" in this repo passed a geometry selftest and was still
// not a game (P15). A selftest proves the parts; only a played run proves the loop: that a gate
// opens, that the answer is recoverable from the text on screen, that speed is the currency,
// that three wrong answers end the run, and that the ledger survives a reload.
//
// The harness never trusts the page's own claim about which candidate is correct. It reads the
// gate's real character offsets out of the page, slices them from the source it loaded itself,
// and asserts that slice is present among the candidates. A page that fakes a gate cannot pass.
//
// Usage: node tools/ring-game-smoke.mjs [--headed]

import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {browserBin} from './browser-bin.mjs';
const {chromium} = createRequire(import.meta.url)('playwright');

const root = process.cwd();

// A real 700-word source: deterministic, no external fetch, and long enough that plan() puts
// gates on it. Content is irrelevant to the mechanism; the offsets are what is under test.
const FIXTURE = (() => {
  const paras = [
    'Attention is not a spotlight but a settling. The eye does not seize a thing so much as come to rest on it, and the resting is what makes the thing legible. A reader who hurries across a page retains the shape of the page and not the sense of it.',
    'A gate is a question the world asks in the place where the answer is standing. If the question can be answered without the walk, the walk was decoration. If the walk cannot answer the question, the world is a puzzle box with the key painted on it.',
    'Speed is a poor master and an excellent servant. It measures how much of a text has passed through a reader, and it measures nothing about what stayed. A run that ends faster than it began has bought its speed with something, and the ledger should say what.',
    'The ring is a coordinate before it is an ornament. One revolution is one source; the angle is the position; the sweep is how much has been crossed. When an arc is drawn for any other reason it is a curve pretending to be a fact.',
    'A wrong answer costs more than a right answer earns, because the second is cheap to confirm and the first is expensive to discover. Tuning that ratio is the whole art of a difficulty curve; making it zero is the whole art of a demo.',
    'Memory is the only score that survives the tab closing. A best run is a claim about a person on a day, and a streak is a claim about a habit. Neither is worth recording unless the run that produced it is repeatable from the same source.',
    'What is lost must be nameable. A player who cannot say what they lost has not played a game; they have watched a number move. The instrument owes them a sentence in their own words, in the language of the thing they were doing.',
    'Colour is a claim about state, and a claim without a field is a lie with good production values. Every hue in a data surface should be able to answer where it came from, and the answer should be visible in the place the colour is drawn.'
  ];
  let out = '';
  for (let i = 0; i < 12; i++) out += paras[i % paras.length] + ' ';
  return out.trim();
})();

const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  const file = path.join(root, name, name.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader('Content-Type', ({'.html': 'text/html', '.js': 'application/javascript',
    '.mjs': 'application/javascript', '.css': 'text/css', '.json': 'application/json',
    '.svg': 'image/svg+xml'})[path.extname(file)] || 'text/plain');
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;

const browser = await chromium.launch({headless: !process.argv.includes('--headed'),
  executablePath: browserBin(), args: ['--no-sandbox', '--disable-dev-shm-usage']});
const results = [];

const boot = async (width, height) => {
  const context = await browser.newContext({viewport: {width, height}, hasTouch: width < 760});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*', (r) => r.request().url().startsWith(base) ? r.continue() : r.abort());
  await page.goto(base + '/rsvp/');
  await page.evaluate((text) => new Promise((done) => {
    const input = document.getElementById('file');
    const transfer = new DataTransfer();
    transfer.items.add(new File([text], 'fixture.txt', {type: 'text/plain'}));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', {bubbles: true}));
    const wait = () => window.RingApp && window.RingApp.state().source ? done() : setTimeout(wait, 60);
    wait();
  }), FIXTURE);
  await page.waitForFunction(() => document.getElementById('drawer').hidden);
  return {context, page, errors};
};

try {
  // ── the loop, at the size a phone actually is ─────────────────────────────
  {
    const {context, page, errors} = await boot(390, 844);
    assert.equal(await page.evaluate(() => window.RingApp.state().over), false, 'fresh page starts out over');

    const started = await page.evaluate(() => { window.RingApp.start(); return window.RingApp.state(); });
    assert.equal(started.running, true, 'run did not start');

    // Reach the first gate instantly; the real clock shares this same evaluation path.
    const gate = await page.evaluate(() => { window.RingApp.forceProgress(0.99); return window.RingApp.state().gate; });
    assert.ok(gate, 'no gate opened at 99% of the source');
    assert.ok(gate.gap && Number.isFinite(gate.gap.s) && Number.isFinite(gate.gap.e), 'gate has no real character gap');
    assert.equal(gate.candidates.length, 3, 'gate does not offer three candidates');

    // The harness answers from the SOURCE, not from the page's opinion.
    const truth = FIXTURE.slice(gate.gap.s, gate.gap.e);
    assert.ok(truth.length > 0, 'gate gap slices to nothing — the offset is fabricated');
    const correctIndex = gate.candidates.findIndex((c) => c === truth);
    assert.notEqual(correctIndex, -1, 'the word at the gate offsets is not among the candidates (' + JSON.stringify({truth, candidates: gate.candidates}) + ')');
    const wrongIndex = [0, 1, 2].find((i) => i !== correctIndex);

    const before = await page.evaluate(() => window.RingApp.state().wpm);
    const ok = await page.evaluate((i) => { window.RingApp.answer(i); return window.RingApp.state(); }, correctIndex);
    assert.equal(ok.correct, 1, 'a correct answer was not counted');
    assert.equal(ok.wpm, before + 20, 'a correct answer did not raise speed by 20 (' + before + ' -> ' + ok.wpm + ')');
    assert.equal(ok.over, false, 'a correct answer ended the run');

    // Three wrong answers must end the run — this is the stake.
    const staked = await page.evaluate((wrong) => {
      const app = window.RingApp;
      app.stop(); app.start();
      for (let i = 0; i < 3; i++) { app.forceProgress(0.99 - i * 0.02); if (app.state().gate) app.answer(wrong); }
      return app.state();
    }, wrongIndex);
    assert.equal(staked.over, true, 'three wrong answers did not end the run');
    assert.equal(staked.wrong, 3, 'wrong count is ' + staked.wrong + ', expected 3');

    // Colour law: nothing drawn may be undeclared (P14).
    const colours = await page.evaluate(() => ({
      drawn: window.RingApp.palette(),
      declared: (window.RingCore && window.RingCore.PALETTE || []).map((p) => p.key)
    }));
    assert.ok(colours.declared.length >= 7, 'palette declares ' + colours.declared.length + ' keys');
    const undeclared = colours.drawn.filter((k) => !colours.declared.includes(k));
    assert.deepEqual(undeclared, [], 'hues drawn with no palette entry: ' + undeclared.join(','));

    // P14(b): the coloured bits must be explainable IN PLACE. Every hue on the ring must
    // resolve to a row that names its field, and the key must not invent a hue that is not
    // drawn. This is the operator's actual ask, so it is asserted, not described.
    const key = await page.evaluate(() => {
      window.RingApp.showDecode();
      const d = window.RingApp.decode();
      const painted = window.RingApp.palette();
      const box = document.getElementById('decode');
      const visible = box && !box.hidden && box.getBoundingClientRect().width > 0;
      const dimmed = document.getElementById('stage').classList.contains('dim');
      const ringStillDrawn = document.getElementById('ring').getAttribute('stroke-dashoffset') !== '333.009';
      window.RingApp.hideDecode();
      return {rows: d.rows, painted, visible, dimmed, ringStillDrawn, closed: document.getElementById('decode').hidden};
    });
    assert.equal(key.visible, true, 'hold-to-decode showed nothing');
    assert.equal(key.dimmed, true, 'the field was not dimmed under the key');
    assert.equal(key.ringStillDrawn, true, 'the ring vanished instead of dimming — nothing to decode against');
    assert.equal(key.closed, true, 'decode did not close on release');
    assert.ok(key.rows.length >= 2, 'key has ' + key.rows.length + ' rows for ' + key.painted.length + ' drawn hues');
    const missing = key.painted.filter((k) => !key.rows.some((r) => r.key === k));
    assert.deepEqual(missing, [], 'hues drawn but not explained by the key: ' + missing.join(','));
    const fieldless = key.rows.filter((r) => !r.field || !r.hex);
    assert.deepEqual(fieldless, [], 'key rows with no field: ' + JSON.stringify(fieldless));
    const declaredHex = await page.evaluate(() => Object.fromEntries(window.RingCore.PALETTE.map((p) => [p.key, p.hex])));
    for (const row of key.rows) assert.equal(row.hex, declaredHex[row.key], 'key colour drifted from the palette for ' + row.key);

    // Ledger survives a reload (the reason to come back).
    const persisted = await page.evaluate(() => { window.RingApp.stop(); return window.RingApp.state().ledger; });
    assert.ok(persisted.runs >= 1, 'ledger did not record a run');
    await page.reload();
    await page.waitForFunction(() => window.RingApp && window.RingApp.state().ledger);
    const after = await page.evaluate(() => window.RingApp.state().ledger);
    assert.ok(after.runs >= persisted.runs, 'ledger lost runs across reload (' + after.runs + ' < ' + persisted.runs + ')');

    assert.deepEqual(errors, [], 'browser errors at 390: ' + errors.join(' | '));
    results.push({viewport: '390x844', gate: true, speed_economy: true, stake: true, palette: true, ledger: true});
    await context.close();
  }

  // ── the wrist: 180×180, the smallest real surface ─────────────────────────
  {
    const {context, page, errors} = await boot(180, 180);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 180, 'horizontal overflow at 180');
    for (const id of ['prev', 'play', 'next', 'show']) {
      const r = await page.locator('main #' + id).boundingBox();
      assert.ok(r && r.x >= 0 && r.y >= 0 && r.x + r.width <= 180.5 && r.y + r.height <= 180.5,
        'unreachable control at 180: ' + id);
    }
    const playable = await page.evaluate(() => {
      const app = window.RingApp;
      app.start(); app.forceProgress(0.99);
      const gate = app.state().gate;
      if (!gate) return {opened: false};
      const truthIndex = gate.candidates.findIndex((c) => app.state().source.slice(gate.gap.s, gate.gap.e) === c);
      const r = document.querySelector('main #play').getBoundingClientRect();
      return {opened: true, truthIndex, ring: r.width > 0};
    });
    assert.equal(playable.opened, true, 'no gate opens at 180 — the game does not exist on the wrist');
    assert.deepEqual(errors, [], 'browser errors at 180: ' + errors.join(' | '));
    results.push({viewport: '180x180', overflow: false, controls: 4, gate: true});
    await context.close();
  }

  console.log('RING GAME PASS ' + JSON.stringify(results));
} catch (error) {
  console.log('RING GAME FAIL ' + String(error && error.stack || error));
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
