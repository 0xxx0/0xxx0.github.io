/* ending.js — THE CALL ending engine (donor module, mahshroom → kage's host)
 * The honest house sort: names the FAILURE MODE, not the personality, and hands
 * ONE door to walk through tomorrow. No fail states (Unpacking rule).
 *
 * Integration (host: 20261006-the-call-mcvoid/index.html):
 *   <script src="ending.js"></script>   right before your closing script
 *   in finish(): replace the summary block with:
 *     document.querySelector('.after, #after').innerHTML = buildEnding(results, MATTERS);
 *
 * Data rules: results[i] = true | false | null (skipped); MATTERS is the host deck.
 * FACES set via window.GAME_FACE = 'floor' | 'crew' | 'both' (calibration result).
 */
(function () {
  var MODES = {
    completer: {
      id: 'completer', name: 'THE COMPLETER',
      buys: 'nothing gets dropped on your watch. People learn that when you say done, it is done.',
      costs: 'you pay for every edge in hours, and your drafts outnumber your strikes. (The infinite-scroll call.)',
      door: 'Ship the smallest complete version first. The polish is a second visit, never a condition of release.'
    },
    router: {
      id: 'router', name: 'THE GATE-ROUTER',
      buys: 'rules survive contact with you. Nothing leaks past a checkpoint because you found it annoying.',
      costs: 'you sometimes route around the wrong door, and energy goes into navigation instead of the work. (The fold-refusal call.)',
      door: 'When a gate refuses, report the refusal once — then pick the next lawful door. Routing is not winning.'
    },
    striker: {
      id: 'striker', name: 'THE STRIKE-MISSER',
      buys: 'high standards. What leaves your hands is rarely embarrassing.',
      costs: 'the cut waits for perfection and the moment passes. (Potential, not applied — the operator’s own words.)',
      door: 'One strike today at 80% and verified. Log what you cut — it is allowed to come back later.'
    },
    namefixer: {
      id: 'namefixer', name: 'THE NAME-FIXER',
      buys: 'truth in the record. Future-you can trust what past-you wrote.',
      costs: 'you correct mid-flight and pay in pace and face. (Four corrections for one wrong name.)',
      door: 'Batch corrections to one note at the end of the exchange. The record stays true; the flight stays smooth.'
    },
    underdoer: {
      id: 'underdoer', name: 'THE UNDER-DOER',
      buys: 'calm. You never make the room’s problem bigger than it is.',
      costs: 'some calls needed your weight and got your absence. ("For visibility" is not "no action".)',
      door: 'For every "FYI", reply with owner + date in writing. Then — and only then — move on.'
    },
    overdoer: {
      id: 'overdoer', name: 'THE OVER-DOER',
      buys: 'everyone feels carried. You are the person who shows up.',
      costs: 'the second mile nobody asked for steals from the first one that mattered. (Twelve suggestions when one move was wanted.)',
      door: 'Give one move and one supporting note. The other eleven live in the playbook, not the message.'
    },
    namer: {
      id: 'namer', name: 'THE GAP-NAMER',
      buys: 'trust. When you say you know, you know; when you don’t, the room can plan around it.',
      costs: 'you are sometimes the one saying "nobody knows" when the room wanted a guess. (The oil-town call.)',
      door: 'Name the gap AND the cheapest way to close it. Honesty plus one move beats honesty alone.'
    }
  };

  var CALL_TO_MODE = {
    // scenario-tag → mode (set per-card in the deck: card.mode = mode id)
  };

  function tally(matters, results) {
    var got = 0, expensive = 0, skipped = 0;
    var modeHits = {};
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      if (r === true) got++;
      else if (r === false) expensive++;
      else skipped++;
      var m = matters[i];
      if (m && m.mode && r === false) modeHits[m.mode] = (modeHits[m.mode] || 0) + 1;
    }
    return { got: got, expensive: expensive, skipped: skipped, modeHits: modeHits };
  }

  function pickMode(matters, results, t) {
    var best = null, bestN = 0;
    for (var k in t.modeHits) if (t.modeHits[k] > bestN) { best = k; bestN = t.modeHits[k]; }
    if (!best) best = (t.expensive <= t.got) ? 'namer' : 'striker'; // gentle default
    return MODES[best] || MODES.namer;
  }

  function buildEnding(results, matters) {
    var t = tally(matters || [], results);
    var m = pickMode(matters || [], results, t);
    var face = window.GAME_FACE || 'both';
    var pct = results.length ? Math.round(100 * t.got / results.length) : 0;
    return '' +
      '<div class="ending">' +
      '<div class="eyebrow">the honest sort · not your house — your habit</div>' +
      '<h2 class="emode">' + m.name + '</h2>' +
      '<div class="g"><span class="tag">buys</span> ' + m.buys + '</div>' +
      '<div class="g"><span class="tag">costs</span> ' + m.costs + '</div>' +
      '<div class="g"><span class="tag">your door</span> <b>' + m.door + '</b></div>' +
      '<div class="ev">Calls: <b>' + t.got + '</b> instinct-right · <b>' + t.expensive + '</b> expensive · ' +
      t.skipped + ' skipped. Face: ' + face + '. Score is shown once and then it is not the point.</div>' +
      '<div class="ev">Leave a note for the next player (kept on this device only, never sent): ' +
      '<input id="kw" maxlength="140" style="width:100%;font:inherit;padding:8px;margin-top:6px" ' +
      'placeholder="one thing you learned the expensive way"></div>' +
      '</div>';
  }

  window.CALL_ENDING = { buildEnding: buildEnding, MODES: MODES, tally: tally, pickMode: pickMode };
})();
