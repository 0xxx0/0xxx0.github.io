/* data.js — inline sample corpus for the memory graph (lane 'memory').
   Static only: no fetch, no build. Exposed as browser global MG_DATA and
   as CommonJS exports so selftest.mjs can require() the exact same data.
   22 typed memory nodes, 29 typed relations. Every record carries provenance. */

var MG_DATA = (function () {
  'use strict';

  /* Type set + lane order = the journey (place → person → decision →
     artifact → project → lesson): where, who, what was chosen, what was
     made, what it became, what was learned. */

  var TYPES = [
    { id: 'place',    label: 'place',    glyph: 'triangle' },
    { id: 'person',   label: 'person',   glyph: 'circle' },
    { id: 'decision', label: 'decision', glyph: 'diamond' },
    { id: 'artifact', label: 'artifact', glyph: 'hexagon' },
    { id: 'project',  label: 'project',  glyph: 'square' },
    { id: 'lesson',   label: 'lesson',   glyph: 'plus' }
  ];

  var NODES = [
    /* ---- person ---- */
    { id: 'dad', type: 'person', title: 'dad', sub: 'NUH SG',
      record: 'ward 42-3, Kent Ridge. stroke 2026-03-08. asks about the field on every call.',
      prov: 'src: field/2026-04-08-nuh.txt:112', ts: '2026-04-08' },
    { id: 'mum', type: 'person', title: 'mum', sub: 'Tiong Bahru',
      record: 'keeps the sunday list. remembers everything, writes none of it down.',
      prov: 'src: chat/2026-05-17-mum.txt:31', ts: '2026-05-17' },
    { id: 'yu', type: 'person', title: 'yu', sub: 'sister · SG',
      record: 'reads the corpus before anyone else. flags drift in one line.',
      prov: 'src: chat/2026-08-02-yu.txt:9', ts: '2026-08-02' },
    { id: 'ong', type: 'person', title: 'ong', sub: 'mentor',
      record: 'local-first, 2019 lecture still cited. "own your bytes, own your bugs".',
      prov: 'src: notes/ong-2019-11-04.md:1', ts: '2019-11-04' },

    /* ---- decision ---- */
    { id: 'quiet-by-default', type: 'decision', title: 'quiet by default law', sub: 'dec 2026-01-19',
      record: 'interface rests at near-black. depth only behind explicit tap. no ambient motion.',
      prov: 'src: law/quiet-by-default.md §1', ts: '2026-01-19' },
    { id: 'sunday-call', type: 'decision', title: 'sunday call, no exceptions', sub: 'dec 2025-11-02',
      record: '19:00 SGT, both parents, logged whether or not anything gets said.',
      prov: 'src: law/sunday-call.md §2', ts: '2025-11-02' },
    { id: 'local-first', type: 'decision', title: 'local-first over cloud', sub: 'dec 2024-06-14',
      record: 'corpus stays on this disk. services are caches, never sources.',
      prov: 'src: law/local-first.md §1', ts: '2024-06-14' },
    { id: 'no-ship-late', type: 'decision', title: 'no auto-ship after 23:00', sub: 'dec 2026-07-14',
      record: 'incident 07-14: a completion claim shipped unverified. ships gate on daylight.',
      prov: 'src: law/no-ship-late.md §1', ts: '2026-07-14' },

    /* ---- artifact ---- */
    { id: 'fovea-lens', type: 'artifact', title: 'fovea-lens', sub: 'b94df3ef',
      record: 'attention lens over the corpus. 41 rules, 3 rejects kept as negatives.',
      prov: 'sha256:b94df3ef · build/2026-09-30', ts: '2026-09-30' },
    { id: 'field-notes-01', type: 'artifact', title: 'field-notes 01', sub: '41 pages',
      record: 'paper notebook, void-deck scans. superseded for search, kept for the hand.',
      prov: 'src: scan/field-notes-01.pdf p.12', ts: '2026-06-21' },
    { id: 'corpus-v3', type: 'artifact', title: 'corpus v3', sub: '12,884 threads',
      record: 'typed JSONL, per-message provenance. the source NotebookLM eats.',
      prov: 'sha256:7c1e0a42 · corpus/v3.jsonl', ts: '2026-10-12' },
    { id: 'tape-07', type: 'artifact', title: 'tape 07', sub: '44:12',
      record: 'sunday call recording, 2026-05-31. transcript folded into corpus-v3.',
      prov: 'sha256:0d91f6aa · media/tape-07.m4a', ts: '2026-05-31' },

    /* ---- project ---- */
    { id: 'the-field', type: 'project', title: 'the field', sub: 'one instrument',
      record: 'one instrument per site. 10 lanes running 2026-10-19 overnight.',
      prov: 'src: AXIS/work/epic10-2026-10-19/README.md', ts: '2026-10-19' },
    { id: 'memory-graph', type: 'project', title: 'memory graph', sub: 'lane · memory',
      record: 'this instrument: deterministic lanes, hash placement, bloom on tap.',
      prov: 'src: epic10-2026-10-19/memory/index.html', ts: '2026-10-19' },
    { id: 'corpus-distill', type: 'project', title: 'corpus → notebooklm', sub: 'goal · L1',
      record: 'past AI chats → typed corpus → NotebookLM-ready knowledge. top long-horizon goal.',
      prov: 'src: goals/long-horizon.md L1', ts: '2026-10-08' },

    /* ---- place ---- */
    { id: 'sg', type: 'place', title: 'SG', sub: '1.3521N 103.8198E',
      record: 'home coords. UTC+8, no DST. anchor for every local timestamp.',
      prov: 'src: geo/sg.json', ts: '2026-01-01' },
    { id: 'nuh', type: 'place', title: 'NUH', sub: 'Kent Ridge',
      record: 'visitor lift B, ward 42-3. parking level 2, entrance from Lower Kent Ridge.',
      prov: 'src: field/2026-04-08-nuh.txt:7', ts: '2026-04-08' },
    { id: 'void-deck', type: 'place', title: 'void deck', sub: '03:00',
      record: 'the fieldwork hour. one bench, one lamp, one instrument.',
      prov: 'src: field/2026-09-11.txt:44', ts: '2026-09-11' },

    /* ---- lesson ---- */
    { id: 'never-fabricate', type: 'lesson', title: 'never fabricate completion', sub: 'lesson',
      record: 'a green check without a run is a lie. report the blocker instead.',
      prov: 'src: post/incident-2026-07-14.md §2', ts: '2026-07-14' },
    { id: 'measure-first', type: 'lesson', title: 'measure before you claim', sub: 'lesson',
      record: 'run it, paste the real output, then write the sentence.',
      prov: 'src: post/incident-2026-07-14.md §3', ts: '2026-07-15' },
    { id: 'quiet-ui', type: 'lesson', title: 'quiet by default', sub: 'lesson',
      record: 'rest state near-silent; every pixel must carry a datum, reveal only on tap.',
      prov: 'src: law/quiet-by-default.md §2', ts: '2026-01-19' },
    { id: 'provenance-or-silence', type: 'lesson', title: 'provenance or silence', sub: 'lesson',
      record: 'no source line, no claim. tighter than never-fabricate: it names the cure.',
      prov: 'src: law/provenance.md §1', ts: '2026-10-02' }
  ];

  /* Typed relations. Label set is closed: WANTS, CAUSED, LIVES_AT,
     PROVES, SUPERSEDES, CARES_FOR. src --LABEL--> dst reads as a sentence. */
  var LABELS = ['WANTS', 'CAUSED', 'LIVES_AT', 'PROVES', 'SUPERSEDES', 'CARES_FOR'];

  var E = function (id, src, label, dst) { return { id: id, src: src, label: label, dst: dst }; };

  var EDGES = [
    E('e01', 'dad',      'LIVES_AT',   'nuh'),
    E('e02', 'mum',      'LIVES_AT',   'sg'),
    E('e03', 'yu',       'LIVES_AT',   'sg'),
    E('e04', 'ong',      'LIVES_AT',   'sg'),
    E('e05', 'dad',      'CARES_FOR',  'mum'),
    E('e06', 'yu',       'CARES_FOR',  'dad'),
    E('e07', 'mum',      'CARES_FOR',  'yu'),
    E('e08', 'dad',      'WANTS',      'sunday-call'),
    E('e09', 'mum',      'WANTS',      'sunday-call'),
    E('e10', 'ong',      'WANTS',      'the-field'),
    E('e11', 'yu',       'WANTS',      'corpus-distill'),
    E('e12', 'dad',      'CAUSED',     'quiet-by-default'),
    E('e13', 'ong',      'CAUSED',     'local-first'),
    E('e14', 'quiet-by-default', 'CAUSED', 'quiet-ui'),
    E('e15', 'never-fabricate',  'CAUSED', 'no-ship-late'),
    E('e16', 'local-first',      'CAUSED', 'corpus-v3'),
    E('e17', 'corpus-v3',        'CAUSED', 'corpus-distill'),
    E('e18', 'the-field',        'CAUSED', 'memory-graph'),
    E('e19', 'fovea-lens',       'PROVES', 'measure-first'),
    E('e20', 'fovea-lens',       'PROVES', 'never-fabricate'),
    E('e21', 'field-notes-01',   'PROVES', 'quiet-by-default'),
    E('e22', 'corpus-v3',        'PROVES', 'the-field'),
    E('e23', 'memory-graph',     'PROVES', 'quiet-ui'),
    E('e24', 'tape-07',          'PROVES', 'sunday-call'),
    E('e25', 'corpus-v3',        'SUPERSEDES', 'tape-07'),
    E('e26', 'memory-graph',     'SUPERSEDES', 'field-notes-01'),
    E('e27', 'provenance-or-silence', 'SUPERSEDES', 'never-fabricate'),
    E('e28', 'void-deck',        'LIVES_AT', 'sg'),
    E('e29', 'nuh',              'LIVES_AT', 'sg')
  ];

  return { TYPES: TYPES, LABELS: LABELS, NODES: NODES, EDGES: EDGES };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = MG_DATA;
