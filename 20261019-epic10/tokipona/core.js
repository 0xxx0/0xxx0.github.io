/* toki pona field — core.
   One source of truth: index.html renders from it, selftest.mjs evals it.
   Classic script (no modules, no build): exposes globalThis.TP.
   Every function here is pure: phrase = f(state, depth, lane). */
(function (root) {
  'use strict';

  /* nimi pu — official vocabulary (pu, 2017 edition + particle kin/pi;
     ale/ali counted as one word, listed in both spellings). */
  var PU = [
    'a', 'akesi', 'ala', 'alasa', 'ale', 'ali', 'anpa', 'ante', 'anu', 'awen',
    'e', 'en', 'esun', 'ijo', 'ike', 'ilo', 'insa', 'jaki', 'jan', 'jo',
    'kala', 'kalama', 'kama', 'kasi', 'ken', 'kepeken', 'kili', 'kiwen', 'ko', 'kon',
    'kule', 'kulupu', 'kuta', 'kin', 'la', 'lape', 'laso', 'lawa', 'lete', 'lili', 'li',
    'linja', 'lipu', 'loje', 'luka', 'lukin', 'lupa', 'ma', 'mama', 'mani', 'meli', 'mi',
    'mije', 'moku', 'moli', 'monsi', 'mu', 'mun', 'musi', 'mute', 'nanpa', 'nasa', 'nasin',
    'nena', 'ni', 'nimi', 'noka', 'o', 'olin', 'ona', 'open', 'pakala', 'pali',
    'palisa', 'pan', 'pi', 'pilin', 'pimeja', 'pini', 'pipi', 'poka', 'poki', 'pona',
    'pu', 'sama', 'seli', 'selo', 'seme', 'sewi', 'sijelo', 'sike', 'sina', 'sinpin',
    'sitelen', 'sona', 'soweli', 'suli', 'suno', 'supa', 'suwi', 'tan', 'taso', 'tawa',
    'telo', 'tenpo', 'toki', 'tomo', 'tu', 'unpa', 'uta', 'walo', 'wan', 'waso',
    'wawa', 'weka', 'wile'
  ];
  var VOCAB = {};
  PU.forEach(function (w) { VOCAB[w] = true; });
  function inVocab(w) { return VOCAB[String(w).toLowerCase()] === true; }

  /* THE DICTIONARY — the instrument. field value -> { tp word, en gloss,
     tag (micro-label), lp (Luka Pona orientation hint) }. */
  var DICT = {
    state: {
      active:   { tp: 'pali',  en: 'is working',      tag: 'working', lp: 'two flat hands move back and forth, working' },
      stalled:  { tp: 'awen',  en: 'is stuck',        tag: 'stuck',   lp: 'one fist holds the other still — staying' },
      done:     { tp: 'pini',  en: 'is finished',     tag: 'done',    lp: 'fingertips close into a fist — ending' },
      draft:    { tp: 'wile',  en: 'is still wanted', tag: 'wanted',  lp: 'clawed hand pulls toward the chest — wanting' },
      archived: { tp: 'weka',  en: 'has gone away',   tag: 'away',    lp: 'flat hand sweeps out and away from the body' }
    },
    depth: {
      small: { tp: 'lili', en: 'small', tag: 'small', lp: 'thumb and finger close a little' },
      large: { tp: 'suli', en: 'big',   tag: 'big',   lp: 'arms open wide, holding something large' }
    },
    lane: {
      chat:  { tp: 'toki',  en: 'the talk',       tag: 'talk',       lp: 'hand leaves the mouth and moves out' },
      git:   { tp: 'ante',  en: 'the change log', tag: 'change log', lp: 'flat hands swap places — changing' },
      local: { tp: 'tomo',  en: 'this machine',   tag: 'this machine', lp: 'fingertips meet, forming a roof' },
      web:   { tp: 'kon',   en: 'the net air',    tag: 'net air',    lp: 'wiggling fingers rise through the air' }
    }
  };

  /* Fixed order = deterministic iteration, no locale dependence. */
  var ORDER = {
    state: ['active', 'stalled', 'done', 'draft', 'archived'],
    depth: ['small', 'large'],
    lane:  ['chat', 'git', 'local', 'web']
  };

  /* Composition rule, shown on the page verbatim. */
  var RULE = 'phrase = STATE + " li " + DEPTH + ". " + LANE + " li " + STATE + "."';

  /* The field: 10 sample objects. */
  var OBJECTS = [
    { id: 'fovea-lens',    name: 'fovea lens',          state: 'active',   depth: 'large', lane: 'local' },
    { id: 'the-call',      name: 'the-call decision game', state: 'draft', depth: 'small', lane: 'web'   },
    { id: 'dad-health',    name: 'dad health record',   state: 'active',   depth: 'small', lane: 'local' },
    { id: 'euc-ride-logs', name: 'EUC ride logs',       state: 'stalled',  depth: 'large', lane: 'chat'  },
    { id: 'the-corpus',    name: 'the corpus',          state: 'active',   depth: 'large', lane: 'git'   },
    { id: 'dawn-brief',    name: 'dawn brief',          state: 'done',     depth: 'small', lane: 'chat'  },
    { id: 'luka-pona',     name: 'luka pona drills',    state: 'draft',    depth: 'small', lane: 'chat'  },
    { id: 'skills-lane',   name: 'hermes skills lane',  state: 'archived', depth: 'large', lane: 'git'   },
    { id: 'mem0-cleanup',  name: 'mem0 cleanup',        state: 'stalled',  depth: 'small', lane: 'web'   },
    { id: 'site-fleet',    name: 'publish-site fleet',  state: 'done',     depth: 'large', lane: 'web'   }
  ];

  function words(o) {
    return { s: DICT.state[o.state].tp, d: DICT.depth[o.depth].tp, l: DICT.lane[o.lane].tp };
  }

  /* phrase = pure function of {state, depth, lane}. */
  function composePhrase(o) {
    var w = words(o);
    return w.s + ' li ' + w.d + '. ' + w.l + ' li ' + w.s + '.';
  }

  /* Same phrase, tokenized with provenance, for derivation display.
     from: 'state' | 'depth' | 'lane' | null (grammar punctuation). */
  function tokens(o) {
    var w = words(o);
    return [
      { t: w.s, from: 'state' }, { t: 'li', from: null }, { t: w.d, from: 'depth' }, { t: '.', from: null },
      { t: w.l, from: 'lane' }, { t: 'li', from: null }, { t: w.s, from: 'state' }, { t: '.', from: null }
    ];
  }

  /* plain-English gloss beneath the phrase. */
  function gloss(o) {
    var st = DICT.state[o.state], dp = DICT.depth[o.depth], ln = DICT.lane[o.lane];
    return 'the work ' + st.en + ' (' + dp.en + ' scope); ' + ln.en + ' ' + st.en + '.';
  }

  /* derivation chain: which field produced which word. */
  function chain(o) {
    return [
      { field: 'state', value: o.state, word: DICT.state[o.state].tp },
      { field: 'depth', value: o.depth, word: DICT.depth[o.depth].tp },
      { field: 'lane',  value: o.lane,  word: DICT.lane[o.lane].tp  }
    ];
  }

  /* pu numerals for counts — no digits in toki pona output. */
  function numWord(n) {
    if (n === 0) return 'ala';
    if (n === 1) return 'wan';
    if (n === 2) return 'tu';
    return 'mute';
  }

  /* one-sentence toki pona summary of the whole field. */
  function composeSummary(objs) {
    var counts = {};
    ORDER.state.forEach(function (k) { counts[k] = 0; });
    objs.forEach(function (o) { counts[o.state] += 1; });
    var parts = ORDER.state.filter(function (k) { return counts[k] > 0; })
      .map(function (k) { return DICT.state[k].tp + ' ' + numWord(counts[k]); });
    var tp = 'ken la, kulupu ni li ' + parts.join(', li ') + '.';
    var en = 'field: ' + ORDER.state.filter(function (k) { return counts[k] > 0; })
      .map(function (k) { return counts[k] + ' ' + DICT.state[k].tag; }).join(', ') + '.';
    return { tp: tp, en: en, counts: counts };
  }

  /* GLYPH — every layer of the mark encodes a real datum:
     size <- depth, geometry <- lane, terminus marker <- state. */
  function glyph(o) {
    var size = o.depth === 'large' ? 30 : 18;
    var geo = {
      chat:  { kind: 'line', x1: 4,  y1: 20, x2: 20, y2: 4,  mx: 20, my: 4  },
      git:   { kind: 'line', x1: 4,  y1: 12, x2: 20, y2: 12, mx: 20, my: 12 },
      local: { kind: 'line', x1: 12, y1: 20, x2: 12, y2: 4,  mx: 12, my: 4  },
      web:   { kind: 'circle', cx: 12, cy: 12, r: 8, mx: 12, my: 4 }
    }[o.lane];
    var marker = { active: 'dot', stalled: 'ring', done: 'cross', draft: 'square', archived: 'ring' }[o.state];
    var dash = o.state === 'archived' ? '1 3' : null;
    var g = { size: size, marker: marker, dash: dash };
    for (var k in geo) g[k] = geo[k];
    return g;
  }

  root.TP = {
    PU: PU, VOCAB: VOCAB, inVocab: inVocab,
    DICT: DICT, ORDER: ORDER, RULE: RULE, OBJECTS: OBJECTS,
    words: words, composePhrase: composePhrase, tokens: tokens,
    gloss: gloss, chain: chain, numWord: numWord,
    composeSummary: composeSummary, glyph: glyph
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
