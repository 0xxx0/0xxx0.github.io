/* DAWN CHORUS · lane 'dawn' — wake-brief core (classification + spoken script).
   House law: plain JS, no build step, no deps, no network, no randomness.
   One implementation, two load modes:
     classic  <script src="./dawn.core.js">  -> window.DawnCore
     CommonJS (selftest.mjs)                -> module.exports
   Determinism: every output is a pure function of the event fields
   (ts / lane / verb / object / status / needs_human / stalled_hours / say).
   Classification precedence is documented on bucketOf() and is the single
   rule the page and the selftest both score against. */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DawnCore = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var BUCKETS = ['changed', 'needs', 'stalled'];
  var LABELS = {
    changed: 'WHAT CHANGED',
    needs: 'WHAT NEEDS YOU',
    stalled: "WHAT'S STALLED"
  };
  var STALL_HOURS = 6;      /* an event this many hours behind is stalled */
  var STALL_MAX_HOURS = 24; /* gutter-bar width ceiling */
  var MIN_WORDS = 100;      /* spoken-script target band */
  var MAX_WORDS = 150;
  var TS_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?(?:Z|([+-]\d{2}):(\d{2}))?$/;

  /* Deterministic precedence — exactly one bucket, order of events irrelevant:
       1. needs_human === true  -> needs you  (operator flagged it)
       2. status === 'stalled'  -> stalled
       3. stalled_hours >= 6    -> stalled
       4. status === 'failed'   -> needs you  (a fresh failure wants the operator)
       5. otherwise             -> changed */
  function bucketOf(e) {
    if (e.needs_human === true) return 'needs';
    if (e.status === 'stalled') return 'stalled';
    if (Number(e.stalled_hours) >= STALL_HOURS) return 'stalled';
    if (e.status === 'failed') return 'needs';
    return 'changed';
  }

  /* Timestamps are parsed out of the literal string, never through Date(),
     so the rendered clock is identical in every timezone. */
  function tsParts(ts) {
    var m = TS_RE.exec(String(ts == null ? '' : ts));
    if (!m) return { date: '---- -- --', time: '--:--', off: '' };
    return {
      date: m[1] + '-' + m[2] + '-' + m[3],
      time: m[4] + ':' + m[5],
      off: m[6] ? m[6] : ''
    };
  }

  function metaOf(e) {
    var bits = ['STATUS ' + String(e.status).toUpperCase()];
    var h = Number(e.stalled_hours) || 0;
    if (e.needs_human === true) bits.push('NEEDS YOU');
    if (h > 0) bits.push((bucketOf(e) === 'stalled' ? 'STALLED ' : 'WAITING ') + h + 'H');
    if (e.extra) bits.push(String(e.extra).toUpperCase());
    return bits.join(' · ');
  }

  /* Gutter-bar width in px: 0 when there is nothing to wait for, else 4..22px.
     The bar length IS the stalled_hours datum. */
  function gutWidth(h) {
    h = Number(h) || 0;
    if (h <= 0) return 0;
    return Math.round(4 + Math.min(h, STALL_MAX_HOURS) / STALL_MAX_HOURS * 18);
  }

  function joinList(items) {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  }

  function phrase(row) {
    return row.say || row.object;
  }

  function listTail(rows, cap) {
    var items = rows.slice(0, cap).map(phrase);
    var rest = rows.length - items.length;
    if (rest > 0) items.push(rest + ' more');
    return items;
  }

  /* Plain-speech script for TTS: no shas, no lanes, no tooling words —
     counts and human phrases only. Deterministic from the buckets. */
  function spokenBrief(buckets, counts) {
    var s = [];
    s.push('Good morning. Here is your dawn brief.');
    s.push('While you slept, the fleet moved ' + counts.changed + ' things forward.');
    if (counts.changed > 0) {
      var main = joinList(buckets.changed.slice(0, 3).map(phrase));
      var rest = counts.changed - Math.min(3, counts.changed);
      s.push(
        counts.changed + (counts.changed === 1 ? ' change landed: ' : ' changes landed: ') +
        main + (rest > 0 ? ', with ' + rest + ' more behind them' : '') + '.'
      );
    }
    if (counts.needs > 0) {
      s.push(
        counts.needs + (counts.needs === 1 ? ' item is' : ' items are') +
        ' waiting for you: ' + joinList(listTail(buckets.needs, 3)) + '.'
      );
    }
    if (counts.stalled > 0) {
      s.push(
        counts.stalled + (counts.stalled === 1 ? ' thing has' : ' things have') +
        ' stalled: ' + joinList(listTail(buckets.stalled, 3)) + '.'
      );
    }
    if (counts.needs === 0) s.push('Nothing is waiting for you.');
    s.push('Nothing else needs a look before coffee.');
    s.push('That is the whole picture. Take your time.');
    return s.join(' ');
  }

  function wordCount(text) {
    var t = String(text == null ? '' : text).trim();
    return t === '' ? 0 : t.split(/\s+/).length;
  }

  function buildBrief(events) {
    var list = Array.isArray(events) ? events : [];
    var rows = [];
    var buckets = { changed: [], needs: [], stalled: [] };

    list.forEach(function (e, i) {
      var p = tsParts(e.ts);
      var b = bucketOf(e);
      var row = {
        id: e.id,
        index: i,
        bucket: b,
        stamp: p.time,
        date: p.date,
        off: p.off,
        lane: e.lane,
        verb: e.verb,
        object: e.object,
        status: e.status,
        needsHuman: e.needs_human === true,
        stalledHours: Number(e.stalled_hours) || 0,
        say: e.say || e.object,
        /* one line per event: timestamp · lane · verb · object */
        line: p.time + ' · ' + e.lane + ' · ' + e.verb + ' · ' + e.object,
        meta: metaOf(e),
        gut: gutWidth(e.stalled_hours)
      };
      rows.push(row);
      buckets[b].push(row);
    });

    var counts = {
      changed: buckets.changed.length,
      needs: buckets.needs.length,
      stalled: buckets.stalled.length,
      total: rows.length
    };
    var delta = counts.changed - counts.stalled;

    var stamps = list.map(function (e) { return String(e.ts); }).sort();
    var lo = tsParts(stamps[0]);
    var hi = tsParts(stamps[stamps.length - 1]);
    var span = {
      text: lo.date + ' ' + lo.time + ' → ' + hi.date + ' ' + hi.time,
      head: hi.date + ' ' + hi.time + (hi.off ? ' ' + hi.off : ''),
      short: hi.time + (hi.off ? ' ' + hi.off : ''),
      off: hi.off
    };

    var spoken = spokenBrief(buckets, counts);

    return Object.freeze({
      rows: rows,
      buckets: buckets,
      labels: LABELS,
      order: BUCKETS,
      counts: counts,
      delta: delta,
      deltaText: (delta >= 0 ? '+' + delta : String(delta)),
      span: span,
      spoken: spoken,
      words: wordCount(spoken)
    });
  }

  var api = {
    BUCKETS: BUCKETS,
    LABELS: LABELS,
    STALL_HOURS: STALL_HOURS,
    MIN_WORDS: MIN_WORDS,
    MAX_WORDS: MAX_WORDS,
    bucketOf: bucketOf,
    buildBrief: buildBrief,
    wordCount: wordCount
  };
  return typeof Object.freeze === 'function' ? Object.freeze(api) : api;
});
