#!/usr/bin/env python3
"""build-calls.py — regenerate /calls/ from the LIVE decision queue.

WHY THIS EXISTS
---------------
/calls/ shipped (2026-10-18) as a one-shot static snapshot wired to the WRONG
source: `ops-hub/scripts/inbox.py`, whose queue is empty because the live ask
queue moved to the sovereign-node corpus. The page therefore read "inbox: empty"
while 21 real calls sat unanswered in calls.json — and it carried no answer
links at all, so the operator could see nothing and answer nothing from his
phone. One stale hand-baked page is the failure class; a regenerable projection
of the real queue is the fix.

SOURCE OF TRUTH (read-only)
  ~/sovereign-node/corpus/calls/calls.json     items[{id,title,context,options[{k,t,eff}],rec}]
  ~/sovereign-node/corpus/calls/answers.jsonl  append-only; last line per id wins

OUTPUT (both committed; the page is server-rendered so it needs zero JS —
no fetch, no .find, nothing to throw on a phone with a bad connection)
  calls/index.html  open calls first, each option a one-tap Telegram deep link
  calls/data.json   machine-readable projection for other surfaces

ANSWER WIRE (house precedent: answer = tap a link that sends one word to the
bot).  https://t.me/tathagatabot?start=call_<id>_<k>  opens the kestrel bot
chat and sends `start call_<id>_<k>` — the exact id, preserved, plus the
letter pick.  A later pick for the same id is a re-pick; the reader surface
marks it, never hides it.

py3.9-safe · stdlib only · run from the repo root:
  python3 scripts/build-calls.py
"""
from __future__ import annotations

import html
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CALLS_DIR = os.path.expanduser("~/sovereign-node/corpus/calls")
CALLS_JSON = os.path.join(CALLS_DIR, "calls.json")
ANSWERS = os.path.join(CALLS_DIR, "answers.jsonl")
OUT_HTML = os.path.join(REPO, "calls", "index.html")
OUT_JSON = os.path.join(REPO, "calls", "data.json")
BOT = "tathagatabot"  # @tathagatabot — the kestrel convergence bot (nexus board)

TZ = timezone(timedelta(hours=8))  # house stamps are canonical +08:00


def esc(s) -> str:
    return html.escape(str(s if s is not None else ""), quote=True)


def load_answers() -> dict:
    """id -> last recorded answer (a later line is a re-pick, not an error)."""
    out: dict = {}
    if not os.path.exists(ANSWERS):
        return out
    with open(ANSWERS, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                a = json.loads(line)
            except Exception:
                continue
            if isinstance(a, dict) and a.get("id"):
                out[str(a["id"])] = a
    return out


def tg_link(iid: str, k: str) -> str:
    # exact id preserved; pick rides as the final _ segment
    payload = "call_%s_%s" % (iid, k)
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", payload):
        # ids outside the deep-link charset still get a working tap: the bot
        # chat opens clean and the card shows the exact word to send.
        return "https://t.me/%s" % BOT
    return "https://t.me/%s?start=%s" % (BOT, payload)


def option_html(iid: str, o: dict, rec: str) -> str:
    k = str(o.get("k") or "")
    rec_badge = '<span class="rec">rec</span>' if k and k == rec else ""
    eff = o.get("eff")
    eff_html = '<span class="eff">&rarr; %s</span>' % esc(eff) if eff else ""
    return (
        '<a class="opt" href="%s" rel="noopener">'
        '<span class="k">%s</span><span class="t">%s%s</span>%s</a>'
        % (esc(tg_link(iid, k)), esc(k), esc(o.get("t") or ""), rec_badge, eff_html)
    )


def card_html(num: int, it: dict, ans: dict | None) -> str:
    iid = str(it.get("id") or "")
    title = str(it.get("title") or iid)
    ctx = str(it.get("context") or "")
    rec = str(it.get("rec") or "")
    opts = it.get("options") or []
    badge = '<span class="called">CALLED</span>' if ans else ""
    called_line = ""
    body_class = "call done" if ans else "call"
    if ans:
        note = ans.get("note")
        called_line = (
            '<div class="pickline">called: <b>%s</b> &mdash; %s &middot; %s%s</div>'
            % (
                esc(ans.get("pick")),
                esc(ans.get("pick_label") or ""),
                esc(str(ans.get("ts") or "")[:16]),
                ('<br><span class="mut">note:</span> ' + esc(note)) if note else "",
            )
        )
    opt_list = "".join(option_html(iid, o, rec) for o in opts)
    if ans:  # house precedent: a called item keeps its answers under "change"
        opts_block = (
            '<details class="change"><summary>change this call</summary>'
            '<div class="opts">%s</div></details>' % opt_list
        )
    else:
        opts_block = '<div class="opts">%s</div>' % opt_list
    return (
        '<section class="%s" id="%s">'
        '<div class="chead"><span class="cnum">%d</span><h2>%s</h2>%s</div>'
        '%s%s%s</section>'
        % (
            body_class,
            esc(iid),
            num,
            esc(title),
            badge,
            ('<p class="ctx">%s</p>' % esc(ctx)) if ctx else "",
            called_line,
            opts_block,
        )
    )


def main() -> int:
    if not os.path.exists(CALLS_JSON):
        print("build-calls: missing %s" % CALLS_JSON, file=sys.stderr)
        return 1
    with open(CALLS_JSON, "r", encoding="utf-8") as fh:
        doc = json.load(fh)
    items = doc.get("items") or []
    ans = load_answers()
    open_items = [it for it in items if str(it.get("id") or "") not in ans]
    called_items = [it for it in items if str(it.get("id") or "") in ans]

    now = datetime.now(TZ).replace(microsecond=0)
    stamp = now.isoformat()
    gen_date = now.strftime("%Y-%m-%d")

    open_cards = "".join(
        card_html(i + 1, it, None) for i, it in enumerate(open_items)
    )
    called_cards = "".join(
        card_html(len(open_items) + i + 1, it, ans[str(it.get("id") or "")])
        for i, it in enumerate(called_items)
    )

    if open_items:
        queue_block = (
            '<div class="count"><b>%d open</b> &middot; %d called &middot; '
            "generated %s</div>%s" % (len(open_items), len(called_items), esc(stamp), open_cards)
        )
    else:
        queue_block = (
            '<div class="empty"><strong>inbox: empty</strong> &mdash; nothing waiting '
            "on you.<br>generated %s &middot; %d called on record.</div>" % (esc(stamp), len(called_items))
        )

    called_section = ""
    if called_items:
        called_section = '<h2>called &mdash; on the record</h2>%s' % called_cards

    page = PAGE_TMPL % {
        "stamp": esc(stamp),
        "gendate": esc(gen_date),
        "queue": queue_block,
        "called": called_section,
        "open_n": str(len(open_items)),
    }
    os.makedirs(os.path.dirname(OUT_HTML), exist_ok=True)
    with open(OUT_HTML, "w", encoding="utf-8") as fh:
        fh.write(page)

    data = {
        "schema": "calls-web/v0.1",
        "generated_at": stamp,
        "source": "sovereign-node/corpus/calls/calls.json",
        "answers": "sovereign-node/corpus/calls/answers.jsonl",
        "answer_wire": "https://t.me/%s?start=call_<id>_<k>" % BOT,
        "open": [
            {"id": it.get("id"), "title": it.get("title"), "options": it.get("options") or []}
            for it in open_items
        ],
        "called": {
            str(it.get("id") or ""): ans[str(it.get("id") or "")]
            for it in called_items
        },
        "law": doc.get("law") or "",
    }
    with open(OUT_JSON, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)
        fh.write("\n")

    print(
        "build-calls: %d open / %d called -> calls/index.html + calls/data.json (%s)"
        % (len(open_items), len(called_items), stamp)
    )
    return 0


PAGE_TMPL = """<!doctype html>
<meta charset="utf-8">
<title>CALLS — the decision queue</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#fbfbfa">
<style>
  body { max-width: 40rem; margin: 0 auto; padding: 1.5rem 1.1rem 4rem;
         font: 16px/1.6 -apple-system, "SF Pro Text", system-ui, sans-serif;
         color: #1c1c1e; background: #fbfbfa; }
  h1 { font-size: 1.3rem; font-weight: 600; letter-spacing: -0.01em; margin: .5rem 0 .1rem; }
  .q { color: #6e6e73; font-size: .86rem; margin: 0 0 1rem; }
  .empty, .count { border: 1px solid #ececea; padding: 1rem 1.2rem; margin: 1rem 0;
           color: #6e6e73; font-size: .92rem; }
  .count b { color: #1c1c1e; }
  h2 { font-size: .78rem; text-transform: uppercase; letter-spacing: .08em;
       color: #6e6e73; font-weight: 600; margin: 2rem 0 .5rem; }
  .call { border: 1px solid #ececea; border-radius: 10px; padding: .9rem 1rem 1rem;
          margin: 0 0 .9rem; background: #fff; }
  .call.done { opacity: .8; background: #fbfbfa; }
  .chead { display: flex; align-items: baseline; gap: .55rem; flex-wrap: wrap; }
  .chead h2 { margin: 0; font-size: 1rem; letter-spacing: 0; text-transform: none;
              color: #1c1c1e; font-weight: 650; overflow-wrap: anywhere; }
  .cnum { color: #8e8e93; font: .8rem ui-monospace, Menlo, monospace; }
  .called { font-size: .68rem; color: #8a6d1a; border: 1px solid #e4d9b8;
            background: #f8f3e2; padding: .1rem .45rem; border-radius: 999px;
            letter-spacing: .05em; }
  .ctx { color: #48484a; font-size: .9rem; margin: .5rem 0 .8rem; line-height: 1.55;
         overflow-wrap: anywhere; word-break: break-word; }
  .opts { display: flex; flex-direction: column; gap: .5rem; }
  .opt { display: flex; flex-direction: column; gap: .1rem; min-height: 44px;
         justify-content: center; padding: .55rem .8rem; border: 1px solid #d8d8dc;
         border-radius: 10px; color: inherit; text-decoration: none; background: #fbfbfa;
         overflow-wrap: anywhere; }
  .opt:active { background: #efefec; }
  .opt .k { font: 700 .78rem ui-monospace, Menlo, monospace; color: #8a6d1a; }
  .opt .t { font-size: .95rem; }
  .opt .rec { font-size: .62rem; letter-spacing: .07em; text-transform: uppercase;
              color: #3d6b5c; border: 1px solid #cfe0d9; background: #eef5f2;
              border-radius: 999px; padding: 0 .4rem; margin-left: .4rem;
              vertical-align: .1em; }
  .opt .eff { color: #6e6e73; font-size: .8rem; }
  .pickline { font-size: .88rem; color: #48484a; background: #f4f4f2;
              border-radius: 8px; padding: .5rem .7rem; margin: .3rem 0 .6rem;
              overflow-wrap: anywhere; }
  .pickline b { font-family: ui-monospace, Menlo, monospace; }
  .mut { color: #8e8e93; }
  details.change { margin-top: .3rem; }
  details.change summary { font-size: .82rem; color: #6e6e73; padding: .45rem 0;
                           min-height: 44px; display: flex; align-items: center; }
  details.change .opts { margin-top: .3rem; }
  code { font: .86em ui-monospace, Menlo, monospace; background: #f1f1ef;
         padding: .1em .35em; border-radius: 3px; }
  a.plain { color: inherit; text-decoration: underline; text-underline-offset: 2px;
            text-decoration-color: #b8b8bd; }
  footer { color: #8e8e93; font-size: .8rem; margin-top: 2.5rem; }
</style>

<h1>CALLS</h1>
<p class="q">the decision queue &middot; everything that needs a human tap &middot; generated %(stamp)s</p>

%(queue)s

%(called)s

<h2>how an ask travels</h2>
<ul>
  <li>the fleet drops <strong>one line</strong> into a bot room &rarr; it lands here with an id</li>
  <li>you answer by <strong>tapping an option</strong> &mdash; it opens the bot chat with your pick, one word, one tap</li>
  <li>a later tap for the same call is a re-pick; the record keeps both</li>
  <li>the fold happens, the receipt is written, the item moves to <em>called</em></li>
</ul>

<h2>links</h2>
<ul>
  <li><a class="plain" href="/control/">/control/</a> — what matters now</li>
  <li><a class="plain" href="/">/</a> — the field index</li>
  <li><a class="plain" href="/dayline/">/dayline/</a> — the working surface</li>
  <li><a class="plain" href="/fovea/">/fovea/</a> — one lens, every surface</li>
</ul>

<footer>this page is a projection of the live queue &middot; regenerate:
<code>python3 scripts/build-calls.py</code> &middot; source
<code>sovereign-node/corpus/calls/calls.json</code> &middot; %(open_n)s open</footer>
"""

if __name__ == "__main__":
    sys.exit(main())
