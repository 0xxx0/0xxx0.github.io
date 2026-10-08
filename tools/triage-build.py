#!/usr/bin/env python3
"""
triage-build — generate THE TRIAGE, a phone-first decision game, from one deck of truth.

READS   (nothing external — the deck is the source of truth, kept here, one card = one
         real artifact from the 2026-10-06 APAC-AI thread material, each with a source tag)
WRITES  <repo>/20261006-triage-mcvoid/index.html

RUN     python3 tools/triage-build.py            (from ~/Projects/0xxx0.github.io)
        python3 tools/triage-build.py --check    (dry run: print stats, write nothing)

WHY     The house pattern for a data page: one command, one source of truth, no
        hand-maintained numbers. Every card, every "so what", and the four-move scoring
        are computed here or they do not appear. Built on /tools/house-patterns.css
        (dark console variant) + the generator pattern of tools/linkfield-build.py.

THE GAME
        It is Monday morning. The queue floods in. Each card is a real thing that lands
        on an APAC AI-policy person at a big-tech firm in Singapore (non-engineer). You
        decide where it GOES — the material's own triage grammar:
            ACT      yours + live (a clock, a gate, a call only you make)
            DEFLECT  routine + known  -> hand back the answer, no human hour
            ROUTE    real but owned by someone named -> send it there
            WEATHER  noise in an urgent costume -> let it pass
        Scoring is the thread's thesis, not a quiz: judgment beats knowledge, and the one
        number is the deflection rate. Every card reveals the thread's "so what" either way.
"""
import json
import pathlib
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "20261006-triage-mcvoid" / "index.html"

# shortlink contract: DATE - TOPIC - CONTACT
PAGE = dict(
    date="2026-10-06",
    topic="triage",
    contact="mcvoid",
    expires="2026-11-05",          # 30-day expiry, matches the sibling pieces
)

# ── the deck — one card per real artifact; `move` is the material's own call ──────────
# move ∈ {ACT, DEFLECT, ROUTE, WEATHER};  so = the thread's "so what";  src = provenance
DECK = [
    dict(t="09:03", who="email · vendor", move="WEATHER",
         text="“Our AI agent will transform your compliance workflow.” Demo Thursday — just bring a sample matter.",
         so="A pitch isn’t a deliverable. The price of a demo is the sandbox diagram + the audit trail. No diagram, no real data, no call.",
         src="thread §D · cross-cut card 03"),
    dict(t="09:11", who="legal · #matter-apac", move="ACT",
         text="Korea’s AI Basic Act grace period ends ~Jan 2027. Someone has to start the high-impact classification.",
         so="A real deadline with a date beats vague dread. Dated claims — ~Jan 2027 is the clock. Start the classification now.",
         src="thread §B · Korea AI Basic Act"),
    dict(t="09:20", who="slack · #ops", move="ROUTE",
         text="“Does our legal hold cover Slack Connect + bot-posted messages?”",
         so="The one question, in writing, to IT. Hold (Enterprise) excludes Slack Connect — close that gap before it bites.",
         src="thread §E · DECODE · hold"),
    dict(t="09:28", who="harness", move="ACT",
         text="Your agent finished a client email and is waiting to send it outside the company.",
         so="External + state-changing = a mandatory human [Confirm/Abort] gate. Least-privilege tokens, egress allowlist. The gate is the point.",
         src="thread §D · the five moves #4"),
    dict(t="09:35", who="harness", move="ACT",
         text="Someone dropped a 60-page PDF into the agent. It came back with three cited cases.",
         so="Untrusted documents are prompt-injection surface. Never cite what you didn’t check — every output is a draft from a confident stranger.",
         src="thread §D · DECODE · hallucination"),
    dict(t="09:41", who="memo", move="DEFLECT",
         text="A memo uses “retention” to mean data retention and talent retention in one paragraph.",
         so="That’s a dialect, not a crisis. Decode the word and move on — two senses, two rooms, one confused memo.",
         src="DECODE · retention"),
    dict(t="09:50", who="dm", move="DEFLECT",
         text="“Should I take CS50? I want to finally understand AI.”",
         so="Known answer: skip the C. Ng’s AI for Everyone, or one local 2-day LegalTech course. Hand it back — don’t re-research it.",
         src="thread §A · the CS50 question"),
    dict(t="10:02", who="calendar", move="ACT",
         text="Australia’s ADM transparency rules commence 10 Dec 2026. Our privacy policy doesn’t disclose automated decisions.",
         so="Hard external deadline, ~65 days out. The disclosure is the deliverable — a “what must be true + a clock” item.",
         src="DECODE · the three clocks · thread §B"),
    dict(t="10:15", who="slack · #ops", move="ROUTE",
         text="Finance keeps hitting “Enterprise-only feature.” Which Slack tier are we actually on?",
         so="Feature gating is the whole game — EKM, Audit/Discovery, hold are tiered. IT owns the answer; don’t guess it.",
         src="DECODE · enterprise · grid"),
    dict(t="10:23", who="harness", move="ACT",
         text="The agent wants a new tool that can read every message in the workspace.",
         so="Permissions are the product. Scope it to search:read.public first, admin-approved client. Least-privilege, always.",
         src="DECODE · MCP · thread §D"),
    dict(t="10:31", who="dm", move="WEATHER",
         text="“I’m worried AI is going to take my job.”",
         so="When automation is free, the market raises the baseline. You get judged on taste, judgment, trust — not on this ping.",
         src="thread §C · 4HWW ↔ Muse (p36)"),
    dict(t="10:38", who="slack", move="ROUTE",
         text="A policy question is now at 47 replies and still climbing.",
         so="15-message rule: detail lives in threads, decisions live in the channel — jump to a huddle. Silence the thread; don’t read it.",
         src="thread §E · Slack as ops OS"),
    dict(t="10:45", who="alert", move="ACT",
         text="Customer data may have gone to the wrong recipient. PDPA breach suspected.",
         so="A 3-calendar-day breach clock. “What must be true / who owns it” emergency — this one you do NOT batch.",
         src="DECODE · PDPA · thread §B"),
    dict(t="10:52", who="slack", move="ROUTE",
         text="A “fun” AI summary of the whole team’s chat history is making the rounds.",
         so="Whose data, which consent basis? A records/PDPA question in disguise. Legal owns it, not the group chat.",
         src="DECODE · memory · training"),
]

MOVES = [
    ("ACT", "yours + live", "hot"),
    ("DEFLECT", "routine + known", "ok"),
    ("ROUTE", "someone named owns it", "acc"),
    ("WEATHER", "noise in costume", "mut"),
]


def build():
    deck_js = json.dumps(DECK, ensure_ascii=False, indent=0).replace("\n", "")
    moves_js = json.dumps([dict(m=m, k=k, c=c) for m, k, c in MOVES], ensure_ascii=False)
    total = len(DECK)
    n_act = sum(1 for d in DECK if d["move"] == "ACT")
    n_def = sum(1 for d in DECK if d["move"] == "DEFLECT")
    n_route = sum(1 for d in DECK if d["move"] == "ROUTE")
    n_weather = sum(1 for d in DECK if d["move"] == "WEATHER")

    doc = SHELL
    for k, v in {
        "%%DECK%%": deck_js,
        "%%MOVES%%": moves_js,
        "%%DATE%%": PAGE["date"],
        "%%CONTACT%%": PAGE["contact"],
        "%%EXPIRES%%": PAGE["expires"],
        "%%TOTAL%%": str(total),
        "%%NACT%%": str(n_act),
        "%%NDEF%%": str(n_def),
        "%%NROUTE%%": str(n_route),
        "%%NWEATHER%%": str(n_weather),
    }.items():
        doc = doc.replace(k, v)

    meta = dict(total=total, act=n_act, deflect=n_def, route=n_route, weather=n_weather,
                bytes=len(doc))
    return doc, meta


# ── the page shell (NOT an f-string: braces stay literal for CSS/JS) ─────────────────
SHELL = r"""<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>THE TRIAGE · %%DATE%% · %%CONTACT%%</title>
<link rel="stylesheet" href="/tools/house-patterns.css">
<style>
/* game skin — extends house-patterns tokens only; no second stylesheet, hard edges kept */
body.dark{background:var(--bg)}
.t-wrap{max-width:560px;margin:0 auto;padding:20px 16px 40px}
.t-eyebrow{font:700 10px/1 var(--font-sans);letter-spacing:.22em;text-transform:uppercase;color:var(--gold)}
.t-title{font:600 clamp(34px,11vw,58px)/0.9 var(--font-mono);letter-spacing:-.05em;text-transform:uppercase;margin:8px 0 0}
.t-title .thin{color:var(--mut);font-weight:400}
.t-deck{color:var(--mut);font-size:13.5px;line-height:1.55;margin:12px 0 0;max-width:44ch}
.t-deck b{color:var(--ink);font-weight:600}
.t-screen{display:none}
.t-screen.on{display:block}
.t-btn{display:block;width:100%;text-align:left;font:inherit;cursor:pointer;
 border:2px solid var(--ink);background:var(--panel);color:var(--ink);padding:15px 16px;
 letter-spacing:.12em;text-transform:uppercase;font-size:13px;font-weight:700}
.t-btn:hover{background:var(--ink);color:var(--bg)}
.t-btn.primary{background:var(--acc);border-color:var(--acc);color:#04121c;text-align:center;letter-spacing:.18em}
.t-btn.primary:hover{background:var(--ink);border-color:var(--ink);color:var(--bg)}
.t-legend{margin:20px 0 0;border-top:1px solid var(--rule);padding-top:14px}
.t-legend .lr{display:flex;gap:11px;align-items:baseline;padding:6px 0;font-size:13px}
.t-legend .lk{font:700 11px/1.4 var(--font-sans);letter-spacing:.13em;text-transform:uppercase;min-width:74px}
.t-legend .lk.act{color:var(--hot)}.t-legend .lk.def{color:var(--ok)}
.t-legend .lk.rou{color:var(--acc)}.t-legend .lk.wea{color:var(--mut)}
.t-legend .lv{color:var(--mut);line-height:1.45}
.t-mantra{margin:16px 0 0;padding:11px 13px;border-left:3px solid var(--gold);color:var(--mut);font-size:12.5px;line-height:1.55}
.t-mantra b{color:var(--gold);font-weight:600}

/* HUD */
.t-hud{display:flex;justify-content:space-between;align-items:center;gap:10px;
 border-bottom:2px solid var(--ink);padding-bottom:10px;margin-bottom:14px}
.t-hud .clock{font:600 22px/1 var(--font-mono);letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.t-hud .stat{text-align:right}
.t-hud .stat .n{font:600 18px/1 var(--font-mono);font-variant-numeric:tabular-nums}
.t-hud .stat .l{font:700 8.5px/1 var(--font-sans);letter-spacing:.14em;text-transform:uppercase;color:var(--mut);margin-top:3px}
.t-queue{height:5px;background:var(--panel);border:1px solid var(--rule);margin:0 0 16px;overflow:hidden}
.t-queue i{display:block;height:100%;background:var(--acc);width:100%;transition:width .35s ease}

/* the ping card */
.t-ping{border:2px solid var(--ink);background:var(--panel);padding:15px 16px 17px;margin:0 0 15px}
.t-ping .from{display:flex;gap:9px;align-items:baseline;margin-bottom:9px}
.t-ping .from .tm{color:var(--gold);font:600 12px/1 var(--font-mono);font-variant-numeric:tabular-nums}
.t-ping .from .who{color:var(--mut);font-size:10px;letter-spacing:.13em;text-transform:uppercase}
.t-ping .body{font:600 17.5px/1.42 var(--font-sans);letter-spacing:-.01em}

/* the four moves */
.t-moves{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.t-mv{cursor:pointer;font:inherit;text-align:left;border:2px solid var(--rule);
 background:var(--panel);color:var(--ink);padding:13px 12px;min-height:66px;
 display:flex;flex-direction:column;justify-content:center;gap:3px}
.t-mv:hover{border-color:var(--ink)}
.t-mv .ml{font:800 15px/1 var(--font-sans);letter-spacing:.06em;text-transform:uppercase}
.t-mv .mk{color:var(--mut);font-size:10.5px;letter-spacing:.02em;text-transform:none}
.t-mv.act{border-left:5px solid var(--hot)}.t-mv.act .ml{color:var(--hot)}
.t-mv.def{border-left:5px solid var(--ok)}.t-mv.def .ml{color:var(--ok)}
.t-mv.rou{border-left:5px solid var(--acc)}.t-mv.rou .ml{color:var(--acc)}
.t-mv.wea{border-left:5px solid var(--mut)}.t-mv.wea .ml{color:var(--mut)}
.t-moves.answered .t-mv{opacity:.4;cursor:default}
.t-moves.answered .t-mv.picked{opacity:1;border-color:var(--ink)}
.t-moves.answered .t-mv.truth{opacity:1;border-color:var(--ok);box-shadow:inset 0 0 0 1px var(--ok)}

/* feedback */
.t-fb{margin:14px 0 0;display:none}
.t-fb.on{display:block}
.t-fb .verdict{font:700 11px/1 var(--font-sans);letter-spacing:.14em;text-transform:uppercase;margin-bottom:8px}
.t-fb .verdict.hit{color:var(--ok)}
.t-fb .verdict.miss{color:var(--hot)}
.t-fb .so{font-size:14.5px;line-height:1.55}
.t-fb .so::before{content:"so what → ";font-weight:700;color:var(--gold)}
.t-fb .src{margin-top:9px;font-size:10px;letter-spacing:.06em;color:var(--mut);text-transform:uppercase}

/* end */
.t-numbers{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--rule);
 border:1px solid var(--rule);margin:6px 0 4px}
.t-numbers .cell{background:var(--bg);padding:14px 12px}
.t-numbers .cell .n{font:600 27px/1 var(--font-mono);letter-spacing:-.04em}
.t-numbers .cell .l{font:700 8.5px/1.3 var(--font-sans);letter-spacing:.12em;text-transform:uppercase;color:var(--mut);margin-top:6px}
.t-deflect{border:2px solid var(--acc);background:var(--actbg);padding:16px 17px;margin:18px 0}
.t-deflect .big{font:600 42px/1 var(--font-mono);letter-spacing:-.04em;color:var(--acc)}
.t-deflect .lab{font:700 10px/1 var(--font-sans);letter-spacing:.16em;text-transform:uppercase;color:var(--mut);margin-top:8px}
.t-deflect .tgt{margin-top:11px;font-size:12.5px;color:var(--mut);line-height:1.5}
.t-quiet{margin:22px 0 0;padding:22px 2px;border-top:1px solid var(--rule);text-align:center}
.t-quiet .q{font:400 16px/1.6 var(--font-mono);color:var(--mut)}
.t-quiet .q b{color:var(--ink);font-weight:400}
.t-punch{margin:20px 0 0;font:600 17px/1.5 var(--font-sans);letter-spacing:-.01em}
.t-punch span{background:var(--hl);color:#241c00;padding:0 4px}
.t-kit{margin:22px 0 0;border-top:1px solid var(--rule);padding-top:14px}
.t-kit .kh{font:700 9.5px/1 var(--font-sans);letter-spacing:.16em;text-transform:uppercase;color:var(--mut);margin-bottom:9px}
.t-kit a{display:inline-block;font-size:12.5px;margin:0 12px 7px 0;text-decoration:none;border-bottom:1px solid var(--rule);padding-bottom:1px}
.t-kit a:hover{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.foot{margin-top:30px}
@media(max-width:420px){ .t-moves{grid-template-columns:1fr} .t-mv{min-height:56px} }
@media(prefers-reduced-motion:reduce){ .t-queue i{transition:none} }
</style>

<div class="t-wrap">

<!-- ── INTRO ── -->
<section class="t-screen on" id="s-intro">
  <div class="t-eyebrow">an experience · %%DATE%% · phone-first</div>
  <h1 class="t-title">THE<br>TRIAGE<span class="thin">.</span></h1>
  <p class="t-deck">It’s Monday, 09:00, in the chair. The queue is already full and every
  item is dressed as urgent. <b>Decide where each thing goes.</b> Four moves. %%TOTAL%%
  real things that land on an APAC AI-policy person who has to not get fired.</p>

  <div class="t-legend">
    <div class="lr"><span class="lk act">ACT</span><span class="lv">yours and live — a clock, a gate, a call only you make.</span></div>
    <div class="lr"><span class="lk def">DEFLECT</span><span class="lv">routine and known — hand back the answer, spend no human hour.</span></div>
    <div class="lr"><span class="lk rou">ROUTE</span><span class="lv">real, but someone named owns it — send it there.</span></div>
    <div class="lr"><span class="lk wea">WEATHER</span><span class="lv">noise in an urgent costume — let it pass.</span></div>
  </div>

  <div class="t-mantra"><b>When overwhelmed, three questions.</b> What must be true?
  What’s the deadline? Who owns it? Everything else is weather.</div>

  <div style="margin:22px 0 0">
    <button class="t-btn primary" onclick="T.begin()">begin the shift ▸</button>
  </div>
</section>

<!-- ── PLAY ── -->
<section class="t-screen" id="s-play">
  <div class="t-hud">
    <div class="clock" id="hud-clock">09:00</div>
    <div class="stat"><div class="n" id="hud-left">%%TOTAL%%</div><div class="l">in queue</div></div>
    <div class="stat"><div class="n" id="hud-def">0%</div><div class="l">deflected</div></div>
    <div class="stat"><div class="n" id="hud-hit">0</div><div class="l">on the money</div></div>
  </div>
  <div class="t-queue"><i id="hud-queue"></i></div>

  <div class="t-ping">
    <div class="from"><span class="tm" id="c-time">09:03</span><span class="who" id="c-who">email · vendor</span></div>
    <div class="body" id="c-body">…</div>
  </div>

  <div class="t-moves" id="c-moves"></div>

  <div class="t-fb" id="c-fb">
    <div class="verdict" id="c-verdict"></div>
    <div class="so" id="c-so"></div>
    <div class="src" id="c-src"></div>
    <div style="margin:15px 0 0"><button class="t-btn primary" id="c-next" onclick="T.next()">next ▸</button></div>
  </div>
</section>

<!-- ── END ── -->
<section class="t-screen" id="s-end">
  <div class="t-eyebrow">11:00 · the queue is empty</div>
  <h1 class="t-title" style="font-size:clamp(30px,9vw,48px)">YOU<br>TRIAGED<span class="thin">.</span></h1>

  <div class="t-numbers">
    <div class="cell"><div class="n" id="e-hit">0</div><div class="l">on the money</div></div>
    <div class="cell"><div class="n" id="e-act">0</div><div class="l">you owned it</div></div>
    <div class="cell"><div class="n" id="e-wea">0</div><div class="l">weather passed</div></div>
  </div>

  <div class="t-deflect">
    <div class="big" id="e-deflect">0%</div>
    <div class="lab">your one number · deflection rate</div>
    <div class="tgt">What share of the flood got answered without a human hour. The thread’s
    target is <b>25–30%</b>. Anything you routed or acted on is the part that needed a name on it.</div>
  </div>

  <div class="t-punch">When automation is free, the market raises the baseline.
  You don’t get the hours back. <span>You get judged on taste, judgment, and trust.</span></div>

  <div class="t-quiet">
    <div class="q">Everything that needed a human got one.<br><b>Everything else was weather.</b></div>
    <div style="margin:18px 0 0"><button class="t-btn" onclick="T.reset()">↺ run the shift again</button></div>
  </div>

  <div class="t-kit">
    <div class="kh">the kit — go deeper on the same material</div>
    <a href="/20261006-ai-mode-thread-mcvoid/">the whole thread, answered</a>
    <a href="/20261006-decode-mangospree/">DECODE · the jargon dial</a>
    <a href="/20261006-the-cut-mcvoid/">THE CUT · the canon</a>
    <a href="/20261006-consultation-mcvoid/">the consultation</a>
    <a href="/20261006-cs50-or-not-mcvoid/">the CS50 card</a>
    <a href="/20261005-linkfield-mcvoid/">the link field</a>
  </div>

  <div class="foot">
    <b>Provenance</b> — a decision game built from the same 2026-10-06 material as the
    consultation: the 60-page Google AI-Mode thread on APAC AI policy for a non-engineer
    (Slack plan tiers · Korea AI Basic Act · Australia ADM · PDPA · the agent-harness
    incident record), plus the verified 2026 synthesis. Every card’s “so what” is the
    thread’s own call, tagged <code>[thread §x]</code> or <code>[DECODE]</code>, not
    generated here. <b>Not legal advice</b> — a way to feel the triage, not a memo.
    Nothing you tap is recorded or sent anywhere; it runs entirely in your browser.
    <br><br>Generated by <code>tools/triage-build.py</code> · %%DATE%% ·
    built on <a href="/20261006-patterns-mcvoid/">house-patterns.css</a> ·
    Page expires %%EXPIRES%% · <code>noindex</code> · contact <b>%%CONTACT%%</b>
  </div>
</section>

</div>

<script>
window.T = (function () {
  var DECK = %%DECK%%;
  var MOVES = %%MOVES%%;
  var i = 0, counts = {}, hit = 0, answered = 0;
  MOVES.forEach(function (m) { counts[m.m] = 0; });

  function el(id) { return document.getElementById(id); }
  function show(name) {
    ["s-intro", "s-play", "s-end"].forEach(function (s) {
      el(s).classList.toggle("on", s === name);
    });
    window.scrollTo(0, 0);
  }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]; }); }

  function renderMoves() {
    var wrap = el("c-moves");
    wrap.className = "t-moves";
    wrap.innerHTML = MOVES.map(function (m) {
      return '<button class="t-mv ' + m.c + '" data-mv="' + m.m + '">' +
             '<span class="ml">' + m.m + '</span>' +
             '<span class="mk">' + m.k + '</span></button>';
    }).join("");
    [].forEach.call(wrap.querySelectorAll(".t-mv"), function (b) {
      b.addEventListener("click", function () { answer(b.getAttribute("data-mv"), b); });
    });
  }

  function hud() {
    el("hud-left").textContent = (DECK.length - i);
    el("hud-hit").textContent = hit;
    var rate = answered ? Math.round((counts.DEFLECT / answered) * 100) : 0;
    el("hud-def").textContent = rate + "%";
    el("hud-queue").style.width = ((DECK.length - i) / DECK.length * 100) + "%";
  }

  function render() {
    var c = DECK[i];
    el("hud-clock").textContent = c.t;
    el("c-time").textContent = c.t;
    el("c-who").textContent = c.who;
    el("c-body").textContent = c.text;
    el("c-fb").classList.remove("on");
    renderMoves();
    hud();
  }

  function answer(mv, btn) {
    var c = DECK[i];
    counts[mv]++; answered++;
    var wrap = el("c-moves");
    wrap.classList.add("answered");
    [].forEach.call(wrap.querySelectorAll(".t-mv"), function (b) {
      b.classList.remove("picked", "truth");
      if (b.getAttribute("data-mv") === mv) b.classList.add("picked");
      if (b.getAttribute("data-mv") === c.move) b.classList.add("truth");
    });
    var isHit = (mv === c.move);
    if (isHit) hit++;
    var v = el("c-verdict");
    v.className = "verdict " + (isHit ? "hit" : "miss");
    v.textContent = isHit ? "✓ on the money — the thread calls this " + c.move
                          : "the thread routes this to " + c.move;
    el("c-so").textContent = c.so;
    el("c-src").textContent = "[" + c.src + "]";
    el("c-fb").classList.add("on");
    el("c-next").textContent = (i === DECK.length - 1) ? "close the shift ▸" : "next ▸";
    hud();
    el("c-fb").scrollIntoView({ block: "nearest" });
  }

  function next() {
    i++;
    if (i >= DECK.length) return end();
    render();
    window.scrollTo(0, 0);
  }

  function end() {
    el("e-hit").textContent = hit;
    el("e-act").textContent = counts.ACT;
    el("e-wea").textContent = counts.WEATHER;
    var rate = answered ? Math.round((counts.DEFLECT / answered) * 100) : 0;
    el("e-deflect").textContent = rate + "%";
    show("s-end");
  }

  function begin() { i = 0; hit = 0; answered = 0;
    MOVES.forEach(function (m) { counts[m.m] = 0; });
    render(); show("s-play"); }

  function reset() { show("s-intro"); }

  return { begin: begin, next: next, reset: reset };
})();
</script>
<noscript><div class="t-wrap"><p class="t-deck">THE TRIAGE is an interactive game and needs
JavaScript. The short version: <b>act on what’s live and yours, deflect the routine, route
what someone named owns, let the weather pass</b> — and measure one number, the deflection
rate.</p></div></noscript>
"""


if __name__ == "__main__":
    doc, meta = build()
    if "--check" in sys.argv:
        print(json.dumps(meta, indent=2, default=str))
        sys.exit(0)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(doc)
    print(json.dumps(meta, indent=2, default=str))
    print("wrote", OUT, OUT.stat().st_size, "bytes")
