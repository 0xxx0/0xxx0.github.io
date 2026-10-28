/* THE RING — core engine (v1.0.0)
 *
 * One run reads a source as one revolution: the ring is the coordinate, and the
 * gaps it asks about are cut from text the reader has already crossed.
 *
 * This file is the whole deterministic surface. No DOM, no timers, no I/O, no
 * sampling, no wall clock. Everything a run can ask is a pure function of
 * (text, sourceHash, opts), so the same chapter asks the same questions on any
 * machine, in any year. The renderer is not allowed to decide anything — it may
 * only draw what plan() derived.
 */
(function (g) {
  'use strict';

  const VERSION = '1.0.0';

  const SPEED = Object.freeze({
    start: 240,
    stepUp: 20,
    stepDown: 40,
    floor: 120,
    ceil: 900,
    wrongLimit: 3
  });

  const PLAN_DEFAULTS = Object.freeze({ gates: 6, minWords: 240, seed: 0 });

  // The prompt strip has to hold enough sentence that the gap's neighbours still
  // mean something: shorter and there is no context to test, longer and the strip
  // becomes a paragraph the reader has to hunt through.
  const LINE_MIN = 60;
  const LINE_MAX = 220;

  // Below this a chapter cannot contain a question worth asking, so the run is
  // truncated rather than asking about a handful of words.
  const MIN_CHAPTER_WORDS = 12;

  const MAX_ANSWER = 32;      // code units; longer than this is a sentence, not a word
  const CJK_WORD_MAX = 6;     // CJK is written without spaces, so a long "token" is a run
  const PREFERRED_LATIN = 4;  // a gap on "not" tests nothing; prefer a content word
  const MAX_GATE_TRIES = 24;  // bounded: a 100k-word book must still plan in milliseconds

  // Distractor length bands, tried in order — plausible first, merely available last.
  const LEN_BANDS = [4, 10, Infinity];

  const TERM = new Set(['.', '!', '?', '…', '。', '！', '？', '；', '\n']);
  const CLOSE = new Set(['"', "'", '”', '’', '»', ')', ']', '}', '」', '』', '》', '〉', '】']);

  // One definition of "CJK" for the whole file: the script class decides which
  // words may stand in for which, so it must not be spelled twice differently.
  const CJK_CLASS = '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}';
  const RE_LETTER = /[\p{L}\p{N}]/u;
  const RE_LATIN = /\p{Script=Latin}/u;
  const RE_CJK = new RegExp('[' + CJK_CLASS + ']', 'u');
  const RE_CJK_PAIR_SOURCE = '[' + CJK_CLASS + ']{2}';

  /* ---------------------------------------------------------------- text ---- */

  function isWs(ch) {
    const c = ch.charCodeAt(0);
    if (c === 32 || (c >= 9 && c <= 13)) return true;
    if (c === 0xa0 || c === 0x1680 || c === 0x2028 || c === 0x2029) return true;
    if (c === 0x202f || c === 0x205f || c === 0x3000 || c === 0xfeff) return true;
    return c >= 0x2000 && c <= 0x200a;
  }

  // Offsets are UTF-16 code units because that is what String.prototype.slice
  // speaks: every token must be recoverable with text.slice(t.s, t.e), including
  // when the token contains emoji or astral CJK.
  function words(text) {
    const src = typeof text === 'string' ? text : '';
    const out = [];
    let i = 0;
    while (i < src.length) {
      while (i < src.length && isWs(src[i])) i++;
      const s = i;
      while (i < src.length && !isWs(src[i])) i++;
      if (i > s) out.push({ s: s, e: i, t: src.slice(s, i) });
    }
    return out;
  }

  /* --------------------------------------------------------------- hashing -- */

  // FNV-1a over code units, not code points, so the hash lives in the same
  // coordinate system as the offsets it is used to shuffle.
  function hash32(str) {
    const s = typeof str === 'string' ? str : (str == null ? '' : String(str));
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // A finaliser that makes two nearby seeds diverge immediately; without it seeds
  // differing by one would pick neighbouring words in the same chapter.
  function mix32(parts) {
    let h = 0x9e3779b9;
    for (let i = 0; i < parts.length; i++) {
      h = (h ^ (parts[i] >>> 0)) >>> 0;
      h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
      h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
      h = (h ^ (h >>> 16)) >>> 0;
    }
    return h >>> 0;
  }

  function rngFrom(seed) {
    let a = seed >>> 0;
    return function next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
      t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
      return (t ^ (t >>> 14)) >>> 0;
    };
  }

  function unit(next) {
    return next() / 4294967296; // [0,1) without ever touching a global source
  }

  function draw(list, next) {
    const i = Math.floor(unit(next) * list.length);
    return list.splice(i, 1)[0];
  }

  function shuffle(list, next) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(unit(next) * (i + 1));
      const tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  /* --------------------------------------------------------------- tokens --- */

  function scriptOf(t) {
    const cjk = RE_CJK.test(t);
    const latin = RE_LATIN.test(t);
    if (cjk && latin) return 'mixed'; // a mixed token would make candidates bilingual
    if (cjk) return 'cjk';
    if (latin) return 'latin';
    return 'other';                   // emoji, bare numbers, punctuation
  }

  // A token is a word plus its punctuation; the question is about the word. Cutting
  // the span to the letters keeps "all." from being asked as a word ending in a
  // full stop, which no reader would ever write into a gap.
  function coreWord(t) {
    let s = 0;
    let e = t.length;
    while (s < e && !RE_LETTER.test(t[s])) s++;
    while (e > s && !RE_LETTER.test(t[e - 1])) e--;
    const w = t.slice(s, e);
    const sc = scriptOf(w);
    if (sc === 'cjk') {
      if (w.length < 2) return null;
    } else if (sc === 'latin') {
      if (w.length < 3 || w.length > MAX_ANSWER) return null;
    } else {
      return null;
    }
    return { s: s, e: e, t: w, sc: sc };
  }

  function cjkPairsIn(s) {
    const out = [];
    const re = new RegExp(RE_CJK_PAIR_SOURCE, 'gu');
    let m;
    while ((m = re.exec(s)) !== null) out.push({ s: m.index, e: m.index + m[0].length });
    return out;
  }

  // In a script written without spaces a whitespace token is a whole clause, so the
  // gap has to be a two-character slice of it; the slice is taken on a code-point
  // boundary so an astral character is never cut in half.
  function gapFor(tok, core, next) {
    const base = tok.s + core.s;
    if (core.sc !== 'cjk' || core.t.length <= CJK_WORD_MAX) {
      return { s: base, e: base + core.t.length };
    }
    const pairs = cjkPairsIn(core.t);
    if (!pairs.length) return { s: base, e: base + core.t.length };
    const p = pairs[Math.floor(unit(next) * pairs.length)];
    return { s: base + p.s, e: base + p.e };
  }

  function vocabulary(toks) {
    const seen = new Map();
    const out = [];
    for (let i = 0; i < toks.length; i++) {
      const core = coreWord(toks[i].t);
      if (!core) continue;
      const lc = core.t.toLowerCase();
      if (seen.has(lc)) continue;
      seen.set(lc, 1);
      out.push({ t: core.t, lc: lc, n: core.t.length, sc: core.sc });
    }
    return out;
  }

  // Every two-character CJK slice in the source, built only when a clipped gap
  // actually needs stand-ins of the same shape.
  function cjkPairs(ctx) {
    if (ctx.pairs) return ctx.pairs;
    const seen = new Map();
    for (let i = 0; i < ctx.toks.length; i++) {
      const tok = ctx.toks[i];
      const core = coreWord(tok.t);
      if (!core || core.sc !== 'cjk') continue;
      const pairs = cjkPairsIn(core.t);
      for (let j = 0; j < pairs.length; j++) {
        const base = tok.s + core.s;
        const t = ctx.text.slice(base + pairs[j].s, base + pairs[j].e);
        if (t.length < 2 || seen.has(t)) continue;
        seen.set(t, { t: t, lc: t, n: t.length, sc: 'cjk' });
      }
    }
    ctx.pairs = Array.from(seen.values());
    return ctx.pairs;
  }

  /* ------------------------------------------------------------ distractors - */

  function related(a, b) {
    const x = a.toLowerCase();
    const y = b.toLowerCase();
    if (x === y) return true;
    // A stem visible inside the other word is the answer, not a question: nobody
    // has to have read the passage to see that "read" lives inside "reading".
    if (x.indexOf(y) >= 0 || y.indexOf(x) >= 0) return true;
    return x.length >= 3 && y.length >= 3 && x.slice(0, 3) === y.slice(0, 3);
  }

  // Candidates come from the source's own vocabulary. An outside word list would
  // need a network call, and a word the text never uses would be guessable by not
  // belonging to it.
  function pickCandidates(pool, answer, script, next) {
    const al = answer.toLowerCase();
    for (let b = 0; b < LEN_BANDS.length; b++) {
      const tol = LEN_BANDS[b];
      const usable = [];
      for (let i = 0; i < pool.length; i++) {
        const v = pool[i];
        if (v.sc !== script) continue;
        if (Math.abs(v.n - al.length) > tol) continue;
        if (related(al, v.lc)) continue;
        usable.push(v.t);
      }
      if (usable.length >= 2) return [draw(usable, next), draw(usable, next)];
    }
    return null;
  }

  /* ------------------------------------------------------------- the line --- */

  function skipWs(text, s, cap) {
    while (s < cap && isWs(text[s])) s++;
    return s;
  }

  function trimEnd(text, e, floor) {
    while (e > floor && isWs(text[e - 1])) e--;
    return e;
  }

  function sentenceStart(text, from) {
    let i = from;
    while (i > 0 && !TERM.has(text[i - 1])) i--;
    while (i < from && (isWs(text[i]) || CLOSE.has(text[i]))) i++;
    return i;
  }

  function sentenceEnd(text, from) {
    let i = from;
    while (i < text.length && !TERM.has(text[i])) i++;
    if (i < text.length) i++;
    while (i < text.length && CLOSE.has(text[i])) i++;
    return i;
  }

  function prevSentenceStart(text, at) {
    let i = at;
    while (i > 0 && isWs(text[i - 1])) i--;
    if (i === 0) return -1;
    const ps = sentenceStart(text, i - 1);
    return ps < at ? ps : -1;
  }

  // The line is the sentence around the gap, grown one sentence at a time until it
  // is long enough to re-read. Abbreviations ("e.g. ") cut sentences short, which is
  // exactly why the growth step exists instead of a fixed slice of the source.
  function lineBounds(text, gs, ge) {
    const len = text.length;
    let s = sentenceStart(text, gs);
    let e = trimEnd(text, sentenceEnd(text, ge), gs);

    for (let guard = 0; guard < 8 && e - s < LINE_MIN; guard++) {
      let j = e;
      while (j < len && isWs(text[j])) j++;
      if (j < len) {
        const grown = trimEnd(text, sentenceEnd(text, j), s);
        if (grown - s <= LINE_MAX && grown > e) {
          e = grown;
          continue;
        }
      }
      const ps = prevSentenceStart(text, s);
      if (ps < 0 || e - ps > LINE_MAX) break;
      s = skipWs(text, ps, gs);
    }

    if (e - s > LINE_MAX) {
      // Too long to hold in one fixation: centre the strip on the gap, then snap
      // inward to whitespace so the line never starts or ends mid-word.
      const room = Math.max(0, LINE_MAX - (ge - gs));
      let left = Math.min(gs - s, Math.floor(room / 2));
      let right = Math.min(e - ge, room - left);
      const spare = room - left - right;
      if (spare > 0) {
        const moreRight = Math.min(spare, e - ge - right);
        right += moreRight;
        left += Math.min(spare - moreRight, gs - s - left);
      }
      s = gs - left;
      e = ge + right;
      while (s < gs && s > 0 && !isWs(text[s])) s++;
      while (e > ge && e < len && !isWs(text[e])) e--;
      const head = text.charCodeAt(s);
      const tail = text.charCodeAt(e - 1);
      if (head >= 0xdc00 && head <= 0xdfff) s++;
      if (tail >= 0xd800 && tail <= 0xdbff) e--;
    }

    s = skipWs(text, s, gs);
    e = trimEnd(text, e, ge);
    return s <= gs && e >= ge && e > s ? { s: s, e: e } : null;
  }

  /* ---------------------------------------------------------------- plan ---- */

  function intOr(v, dflt) {
    return typeof v === 'number' && isFinite(v) ? Math.floor(v) : dflt;
  }

  function buildGate(ctx, k, n, seed) {
    // Each gate draws from its own stream seeded by (run seed, chapter index), so
    // raising the gate count extends a run instead of reshuffling the questions
    // already in it.
    const next = rngFrom(mix32([seed, (k + 1) * 0x9e3779b1, 0x51ed270b]));
    const chapterFrom = k / n;

    // The clock stops in the back half of the chapter. The passage being asked
    // about has to be behind the reader, never under the question.
    const at = (k + 0.35 + 0.5 * unit(next)) / n;

    const toks = ctx.toks;
    const first = Math.floor((k * toks.length) / n);
    const last = Math.floor(((k + 1) * toks.length) / n);
    const crossed = Math.floor(at * toks.length);
    const hi = Math.min(crossed, last);
    const span = hi - first;
    if (span < 1) return null;

    const stride = Math.max(1, Math.floor(span / MAX_GATE_TRIES));
    const offset = Math.floor(unit(next) * span);

    // Two passes over the same bounded scan: a content word if the chapter has one,
    // any answerable word if it does not. A gate is worth more than a preference.
    for (let pass = 0; pass < 2; pass++) {
      for (let a = 0; a < MAX_GATE_TRIES; a++) {
        const p = first + ((offset + a * stride) % span);
        const tok = toks[p];
        const core = coreWord(tok.t);
        if (!core) continue;
        if (pass === 0 && core.sc === 'latin' && core.t.length < PREFERRED_LATIN) continue;

        const gap = gapFor(tok, core, next);
        const answer = ctx.text.slice(gap.s, gap.e);
        const clipped = gap.e - gap.s !== core.t.length;
        const pool = clipped ? cjkPairs(ctx) : ctx.vocab;
        const pair = pickCandidates(pool, answer, core.sc, next);
        if (!pair) continue;
        const line = lineBounds(ctx.text, gap.s, gap.e);
        if (!line) continue;

        return {
          at: at,
          gap: gap,
          answer: answer,
          candidates: shuffle([answer, pair[0], pair[1]], next),
          line: line,
          chapterFrom: chapterFrom
        };
      }
    }
    return null;
  }

  function plan(text, sourceHash, opts) {
    const src = typeof text === 'string' ? text : (text == null ? '' : String(text));
    const o = opts || {};
    const gateCount = intOr(o.gates, PLAN_DEFAULTS.gates);
    const minWords = intOr(o.minWords, PLAN_DEFAULTS.minWords);
    const toks = words(src);

    // The seed folds the caller's hash AND the text itself: a stale hash may change
    // which questions get asked, but it can never make two different texts share a
    // run. opts.gates is deliberately not mixed in — see buildGate.
    const seed = mix32([hash32(sourceHash), hash32(src), intOr(o.seed, PLAN_DEFAULTS.seed) >>> 0]);
    const out = { words: toks.length, length: src.length, seed: seed, gates: [] };
    if (gateCount < 1 || toks.length < minWords) return out;

    const n = Math.min(gateCount, Math.floor(toks.length / MIN_CHAPTER_WORDS));
    if (n < 1) return out;

    const ctx = { text: src, toks: toks, vocab: vocabulary(toks), pairs: null };
    for (let k = 0; k < n; k++) {
      const gate = buildGate(ctx, k, n, seed);
      if (gate) out.gates.push(gate);
    }
    return out;
  }

  /* ----------------------------------------------------------------- run ---- */

  function clampSpeed(v) {
    return Math.max(SPEED.floor, Math.min(SPEED.ceil, v));
  }

  function newRun(planArg, opts) {
    const p = planArg && typeof planArg === 'object'
      ? planArg
      : { words: 0, length: 0, seed: 0, gates: [] };
    const o = opts || {};
    const wpm = clampSpeed(intOr(o.wpm, SPEED.start));
    return {
      plan: p,
      i: 0,
      wpm: wpm,
      startWpm: wpm,
      correct: 0,
      wrong: 0,
      over: false,
      ended: null,
      opened: null,
      marks: [],
      wordsRead: 0
    };
  }

  function openGate(run, progress) {
    if (!run || !run.plan) return null;
    const gates = run.plan.gates || [];
    const total = run.plan.words || 0;
    const p = typeof progress === 'number' && isFinite(progress)
      ? Math.max(0, Math.min(1, progress))
      : 0;

    // Reading position only ever advances, and it is the `words` term of the score,
    // so it is derived here rather than left for the renderer to remember.
    const reached = Math.min(total, Math.floor(p * total));
    if (reached > run.wordsRead) run.wordsRead = reached;

    if (run.over) return null;
    if (run.opened !== null && run.opened !== undefined) return gates[run.opened] || null;

    // Gates are answered in order, so the first unanswered gate is simply the one
    // after the marks already paid for.
    const idx = run.marks.length;
    if (idx >= gates.length) {
      if (p >= 1 && !run.ended) {
        run.ended = 'complete';
        run.wordsRead = total;
      }
      return null;
    }
    if (gates[idx].at > p) return null;

    run.opened = idx;
    run.i = idx;
    return gates[idx];
  }

  function answer(run, candidateIndex) {
    if (!run || !run.plan) return { ok: false, run: run };
    const gates = run.plan.gates || [];
    if (run.over || run.opened === null || run.opened === undefined) return { ok: false, run: run };

    const gate = gates[run.opened];
    if (!gate) return { ok: false, run: run };

    // A tap that hit no sector is not a wrong answer: the run may not be charged
    // for the player missing the ring.
    const idx = intOr(candidateIndex, -1);
    if (idx < 0 || idx >= gate.candidates.length) return { ok: false, run: run };

    const ok = gate.candidates[idx] === gate.answer;
    if (ok) {
      run.wpm = Math.min(SPEED.ceil, run.wpm + SPEED.stepUp);
      run.correct += 1;
    } else {
      run.wpm = Math.max(SPEED.floor, run.wpm - SPEED.stepDown);
      run.wrong += 1;
      if (run.wrong >= SPEED.wrongLimit) {
        run.over = true;
        run.ended = 'wrongLimit';
      }
    }

    run.marks.push({ at: gate.at, ok: ok });
    run.opened = null;
    run.i = run.marks.length;

    // A run that ends owes the reader the words they actually crossed, not the
    // fraction the renderer happened to report last frame.
    const read = Math.floor(gate.at * (run.plan.words || 0));
    if (read > run.wordsRead) run.wordsRead = read;
    return { ok: ok, run: run };
  }

  function score(run) {
    const r = run || {};
    const p = r.plan || {};
    const gates = (p.gates || []).length;
    const correct = r.correct || 0;
    const wrong = r.wrong || 0;
    const wordCount = Math.max(0, r.wordsRead || 0);
    const wpm = r.wpm || 0;
    const startWpm = r.startWpm || SPEED.start;
    const accuracy = correct / Math.max(1, correct + wrong);
    const raw = wordCount * accuracy * (wpm / startWpm);
    // uint, and saturating rather than wrapping: a 32-bit overflow would turn a
    // record run into a small number.
    const value = Math.min(0xffffffff, Math.max(0, Math.round(raw)));
    return {
      words: wordCount,
      gates: gates,
      correct: correct,
      wrong: wrong,
      wpm: wpm,
      accuracy: accuracy,
      score: value
    };
  }

  /* -------------------------------------------------------------- colour ---- */

  // Every hue the renderer may draw, and the field it carries. A colour that
  // cannot state its field gets deleted, not restyled — so this table is the whole
  // legal palette, and the decode overlay reads its words from here.
  const PALETTE = Object.freeze([
    Object.freeze({
      key: 'ground',
      hex: '#080c12',
      field: 'ground: the pad the instrument sits on',
      when: 'always',
      derivation: 'house palette P1 — rgb(8,12,18)'
    }),
    Object.freeze({
      key: 'structure',
      hex: '#4f5760',
      field: 'structure: ring hairline, sector edges, rules',
      when: 'always',
      derivation: 'house palette P1 — rgb(79,87,96)'
    }),
    Object.freeze({
      key: 'word',
      hex: '#eff2ef',
      field: 'the word itself — the text, unmarked',
      when: 'always',
      derivation: 'house palette — bone #eff2ef'
    }),
    Object.freeze({
      key: 'ask',
      hex: '#fd956e',
      field: 'the ask: a gate is open and a question is live',
      when: 'only while a gate is unanswered',
      derivation: 'house accent #fd956e'
    }),
    Object.freeze({
      key: 'paid',
      hex: '#d09439',
      field: 'cost already paid: a gate answered wrong this run',
      when: 'from the wrong answer to the end of the run',
      derivation: 'hue 36° at 62% saturation, 52% lightness — amber, 18° off the accent so a cost can never be read as a live ask'
    }),
    Object.freeze({
      key: 'read',
      hex: '#617789',
      field: 'arc already crossed this run',
      when: 'while a run is live, behind the word',
      derivation: 'hue 208° at 17% saturation, 46% lightness — the one cool hue, because what is behind you is not urgent'
    }),
    Object.freeze({
      key: 'gate',
      hex: '#6f4639',
      field: 'the gate ahead: where the text will ask, before it asks',
      when: 'while a run is live, at gate angles not yet reached',
      derivation: 'the accent mixed 42% into the ground — the same hue as the ask, quieter, because it is a promise and not yet a question'
    })
  ]);

  const PALETTE_BY_KEY = new Map(PALETTE.map(function (e) { return [e.key, e]; }));

  function decode(keys) {
    const list = typeof keys === 'string' ? [keys] : (Array.isArray(keys) ? keys : []);
    const seen = new Set();
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const e = PALETTE_BY_KEY.get(list[i]);
      // An undeclared key is dropped rather than invented: the overlay must not be
      // able to name a hue the palette does not carry.
      if (!e || seen.has(e.key)) continue;
      seen.add(e.key);
      out.push({ key: e.key, hex: e.hex, field: e.field, when: e.when });
    }
    return out;
  }

  /* ----------------------------------------------------------------- api ---- */

  const API = {
    VERSION: VERSION,
    words: words,
    hash32: hash32,
    plan: plan,
    newRun: newRun,
    openGate: openGate,
    answer: answer,
    score: score,
    SPEED: SPEED,
    PALETTE: PALETTE,
    decode: decode
  };

  g.RingCore = API;
})(typeof globalThis === 'object' ? globalThis : this);
