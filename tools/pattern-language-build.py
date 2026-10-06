#!/usr/bin/env python3
"""
pattern-language-build.py — A PATTERN LANGUAGE for the field.

Why: `tools/house-patterns.css` is 48KB of real, numbered house patterns (02 meta, 03 big,
04 card, 05 act, 06 warn, 07 moves, 08 table, 09 badge, 10 close, 11 foot, 12 filters).
It is a STYLESHEET. A stylesheet is not a pattern language.

Alexander, Ishikawa & Silverstein, *A Pattern Language* (1977): 253 patterns in a uniform
**Context / Problem / Forces / Solution** form, each carrying the *evidence for its validity*,
and — the part everyone forgets — patterns that NAME AND REFERENCE EACH OTHER. That network
is the language. Without it you have a parts catalogue.

The UI lineage the operator was remembering: Jenifer Tidwell, *Designing Interfaces* (2005) and
her MIT essay "The Case for HCI Design Patterns", which carried Alexander straight into
interface work; then Pattern Lab (Brad Frost, atomic design), UI Patterns, Pttrns, PatternTap.
("30 Seconds of Code" is a snippet library — a different animal. Named so nobody confuses them.)

This generator emits the language as ONE artful, human-legible page:
  - every pattern: number, NAME, context / problem / forces / solution
  - EVIDENCE: real shipped routes where the pattern is already in use (not invented)
  - LINKS: the pattern network (which patterns it needs / refines / is refined by)
  - a closing section that INDEXES the scattered lists (control/research, recovery, fcm)
    so they stop being invisible — an index, not a mass-move, because those paths are
    load-bearing for gates.

The patterns are transcribed from real artifacts: house-patterns.css, the FIELD HOUSE RULES
surface-discipline section, and things measured and shipped this week. Nothing is aspirational.

Run: python3 tools/pattern-language-build.py [--check] [--out DIR]
"""

from __future__ import annotations

import argparse
import datetime
import html
import os
import re
import sys

DATE = "2026-10-06"
OUTDIR = "20261007-patterns-lang-mcvoid"

# ── the language ────────────────────────────────────────────────────────────────
# (num, name, context, problem, forces, solution, evidence[], links[])
PATTERNS = [
    ("00", "THE ONE PAGE",
     "Someone has to understand a system they did not build, in one sitting.",
     "The truth is spread across 473 files, 170 routes and three roots. Any page that "
     "shows all of it shows none of it.",
     "Completeness pulls toward the index. Comprehension pulls toward one page. They do "
     "not meet in the middle — a half-index is the worst of both.",
     "Compose ONE page that answers the one question a human actually has. Everything else "
     "is reachable from it and is not rendered until asked for. The page is a reduction, "
     "never a digest.",
     ["/20261006-field-mcvoid/", "wiki/personal/START-HERE.md"],
     ["12 FILTERS", "03 THE PIVOT"]),

    ("01", "THE TITLE",
     "A page needs to say what it is before it says anything else.",
     "A page that opens with chrome makes the reader work out where they are.",
     "Branding wants a logo. Orientation wants words. Words win — a name is readable by "
     "a machine and a person at once.",
     "One big monospace title. No wordmark, no hero image. The title is the address of the "
     "object on the page.",
     ["every page in the field"],
     ["02 THE META STRIP"]),

    ("02", "THE META STRIP",
     "The reader needs to trust the page before they read it.",
     "Provenance lives in footnotes nobody reaches. The reader cannot tell a live page from "
     "a dead one.",
     "Burying provenance keeps the header clean and makes every claim unverifiable. "
     "Putting all of it up top makes the page a status report.",
     "ONE strip of facts directly under the title: what it is, when it moved, who it is for, "
     "how stale it is. State the AGE, never just the timestamp — a timestamp that reads "
     "\"now\" while being history is a lie by omission.",
     ["/", "/desk/"],
     ["06 THE STALE FLAG", "11 THE PROVENANCE FOOT"]),

    ("03", "THE PIVOT",
     "A page has one thing it wants you to understand.",
     "Dense pages open with context and bury the point on line 40.",
     "Context-first is how papers work. Point-first is how a person decides whether to keep "
     "reading. A page is not a paper.",
     "A lede that states the single claim, and a way to mark the exact pivot word. Then "
     "everything below is evidence for that sentence.",
     ["/20261006-picks-mcvoid/"],
     ["00 THE ONE PAGE", "04 THE CARD"]),

    ("04", "THE CARD",
     "A claim needs to be checkable without leaving the page.",
     "A bare claim in prose has no boundary — the reader cannot tell where the claim stops "
     "and the commentary starts.",
     "Boxes read as decoration unless they carry a verdict. A card that only frames is a "
     "rounded rectangle, and the house rules forbid that grammar.",
     "A self-contained claim with an inverted badge carrying the VERDICT (verified / "
     "candidate / failed). Hard edges. The badge is the only colour in the block.",
     ["/desk/", "/20261005-linkfield-mcvoid/"],
     ["09 THE BADGE", "06 THE STALE FLAG"]),

    ("05", "THE DO BLOCK",
     "The reader has understood and now has to act.",
     "Most pages end with more prose. The reader has to re-derive the instruction from the "
     "argument they just read.",
     "Repeating the argument is generous and useless. A bare command is terse and rude. "
     "The action needs the same dignity as the analysis.",
     "One block, phrased as the move: what to do, in the imperative, with the smallest "
     "possible scope. If there are many moves, they are ranked, not listed — see 07.",
     ["/contact/", "/port/"],
     ["07 THE MOVES"]),

    ("06", "THE STALE FLAG",
     "A projection prints a timestamp.",
     "A projection that prints a timestamp without its age is a state line that reads as "
     "\"now\" while being history. Measured: a route could read \"09-30 18:50\" while being "
     "days old, and nothing said so.",
     "Always showing age adds noise to every row. Never showing it makes the whole surface "
     "untrustworthy. The flag must never be out-specified by a surrounding rule.",
     "State the age beside the stamp, and past the clock's interval (2x the refresh cadence) "
     "mark it in the host's attention token. THE FLAG MUST BE UN-LOSABLE: one rule, "
     "`!important`, because 65 context rules will otherwise swallow it silently.",
     ["/ (52 flags live, measured 2026-10-06)"],
     ["02 THE META STRIP", "13 THE UN-LOSABLE RULE"]),

    ("07", "THE MOVES",
     "The reader wants to know what to do next, not what is true in general.",
     "A page that is entirely analysis hands the decision back to the reader.",
     "Ranked actions imply authority the writer may not have. A flat list implies they are "
     "equivalent when they are not.",
     "A ranked block of actions placed BEFORE the detail. Rank is a claim and must be "
     "defensible: the first move is the one that unblocks the others.",
     ["/20261006-picks-mcvoid/", "/desk/"],
     ["05 THE DO BLOCK"]),

    ("08", "THE TABLE",
     "Two or more things must be compared, or a correction must be shown.",
     "Comparison in prose forces the reader to hold both sides in their head. A correction "
     "buried in prose is read as an aside.",
     "Tables are dense and hostile on a phone. Prose is warm and imprecise. The house "
     "grammar prefers borders and typography over containers.",
     "A hard-edged table for comparison, and for corrections: what it said / what is true. "
     "Corrections are first-class content, not footnotes — a wrong number that stays wrong "
     "is worse than no number.",
     ["/20261006-canon-mcvoid/", "/desk/"],
     ["04 THE CARD", "11 THE PROVENANCE FOOT"]),

    ("09", "THE BADGE",
     "A card needs a verdict at a glance.",
     "Colour coding states invites a palette; every new state adds a colour and the page "
     "turns into a dashboard.",
     "Semantic colour is legible and grows without bound. Two tokens are stable and stop "
     "meaning anything.",
     "One INVERTED chip — solid background, knocked-out text. It carries a state word. "
     "The host's two tokens (`--hot`, `--ok`) are the only colours allowed to mean something; "
     "everything else is ink and muted ink.",
     ["/desk/", "/20261005-linkfield-mcvoid/"],
     ["04 THE CARD"]),

    ("10", "THE CLOSE",
     "The reader is finished and about to leave.",
     "Pages trail off. The reader is never told the argument concluded.",
     "A summary repeats. A call to action sells. Neither is what a page owes the reader at "
     "the end.",
     "ONE box before the foot. It restates the pivot in one sentence and stops. No summary, "
     "no \"thanks for reading\".",
     ["/20261006-field-mcvoid/"],
     ["03 THE PIVOT", "11 THE PROVENANCE FOOT"]),

    ("11", "THE PROVENANCE FOOT",
     "Every claim on the page came from somewhere.",
     "Sources live in files the reader cannot see. The page asserts without showing work.",
     "Full provenance is unreadable. No provenance is unfalsifiable.",
     "The foot names the artifacts, commits, PRs and measurements the page stands on, in "
     "the form a machine can check: SHA, path, date. If you cannot name it, the claim does "
     "not go on the page.",
     ["/recovery/", "wiki/artifacts/trophy-*.md"],
     ["08 THE TABLE"]),

    ("12", "THE FILTERS",
     "A page carries more rows than a person will read.",
     "A long list is honest and unusable. A short list is usable and dishonest.",
     "Pagination hides. Infinite scroll removes the sense of scale. Search alone presumes "
     "the reader knows the vocabulary.",
     "A sticky search field plus LANE CHIPS that name the states the rows can be in. The "
     "chips are derived from the data, not invented — if a lane has no rows it does not "
     "get a chip. Always show the total against the filtered count so the reader knows "
     "what they are not seeing.",
     ["/20261005-linkfield-mcvoid/", "/20261006-picks-mcvoid/"],
     ["00 THE ONE PAGE"]),

    ("13", "THE UN-LOSABLE RULE",
     "One visual property must never be wrong.",
     "CSS is a specificity contest. Every later rule that sets the same property wins "
     "silently. Measured 2026-10-06: a flag applied to 52 elements, the weight applied, "
     "the COLOUR never landed — 65 context rules could swallow it.",
     "`!important` is a code smell. A silently-broken invariant is a worse one. Patching "
     "each context is the actual bug, because the next context rule wins again.",
     "Declare the invariant ONCE, un-losable (`!important`), and write a CHECKER that "
     "asserts it landed — not that the class was applied. Class-present is not colour-landed.",
     ["/ (PR #929)", "scripts/check-stale-date.mjs"],
     ["06 THE STALE FLAG", "14 THE CHECKER"]),

    ("14", "THE CHECKER",
     "A rule has been written down.",
     "A rule nobody runs is a wish. Measured across this system: specified-but-never-"
     "scheduled is the single most expensive kind of debt — a script designed but not "
     "scheduled costs the same as one never written.",
     "Gates cost runs and slow everyone down. No gates means every rule is decorative.",
     "Every law gets a pass/fail checker with a real exit code, and it is run where the "
     "change happens. A checker that asserts an artifact EXISTS and never asserts it WORKS "
     "is the commonest failure — see 13.",
     ["tools/temp-pages.py --check", "tools/validate-public.mjs", "tools/fi-mutation-contract.py"],
     ["13 THE UN-LOSABLE RULE"]),

    ("15", "THE HOLDING PEN",
     "Someone ships a throwaway page with a date in its name.",
     "Dated pages accumulate forever. The index fills with dead objects and the field "
     "starts to look like a landfill.",
     "Deleting early destroys work still in use. Keeping forever destroys the index. A "
     "naming convention alone does not expire anything.",
     "A REGISTRY of temporary objects with an explicit expiry, an index page showing the "
     "countdowns, and a check that exits non-zero when a dated object is NOT registered — "
     "so the un-registered case is loud instead of invisible. Expired objects move to a "
     "holding pen, never a hard delete.",
     ["/temp/", "tools/temp-pages.py", "control/TEMP_PAGES.json"],
     ["14 THE CHECKER"]),

    ("16", "AREA IS EFFORT",
     "You want a map of where the work actually went.",
     "Treemaps are usually sized by file size or member count. That measures the shape of "
     "the tree, not the labour spent on it.",
     "Commit count is easy and lies — machine refreshes inflate it. File size is easy and "
     "lies — generated artifacts are huge. Effort has no direct metric.",
     "Size the rectangle by the count of SEMANTIC touches, with machine-refresh commits "
     "stripped. Hue is state, brightness is freshness, area is work landed. Say the encoding "
     "on the page; an unexplained colour is decoration.",
     ["/20261006-field-mcvoid/"],
     ["00 THE ONE PAGE", "17 THE PULSE"]),

    ("17", "THE PULSE",
     "You want to see how something is moving over time, not just its state now.",
     "A timeline of events is unreadable at 180 routes. A sparkline per row is 180 sparklines.",
     "Aggregate charts hide the outliers. Per-row charts do not fit.",
     "ONE lane per state, with each object plotted at its last semantic touch. You see "
     "clusters and gaps as shape. The absence of points IS the information.",
     ["/20261006-field-mcvoid/"],
     ["16 AREA IS EFFORT"]),

    ("18", "REDUCE, DON'T EXPAND",
     "A human needs to read a knowledge base built for machines.",
     "The natural response to \"I can't find anything\" is a better index. That is more "
     "surface, and the problem was never finding — it was being handed the wrong kind of "
     "page.",
     "A digest is generous and enormous. A reduction is small and omits. Omitting feels "
     "like losing information.",
     "Write the page a human would read, capped in size, and label the expansion as the "
     "expansion. Most of a machine knowledge base is WRITTEN FOR SEARCH, not for reading — "
     "that is usually the system working. The failure is handing a human one of those.",
     ["wiki/personal/ (3 pages, capped at 30)"],
     ["00 THE ONE PAGE"]),

    ("19", "COMMIT ON CHANGE",
     "A generator runs on a timer and commits the output.",
     "A refresh commit that only moves a clock makes the chronology unlistenable and "
     "trains everyone to ignore the log. Measured: 46 changed lines in a pure refresh, "
     "25 of them pure clock, 21 real state.",
     "A real-time page wants to always be current. The git record wants to mean something. "
     "They are the same file.",
     "Compare the generated output with its timestamps STRIPPED. If the non-clock content "
     "is identical, do not commit. Real state changes still land; the clock does not.",
     ["comms: / nexus: / convergence: / desk: refreshes"],
     ["14 THE CHECKER"]),

    ("20", "RECOVER BEFORE INVENTING",
     "You are about to build something.",
     "The new thing is satisfying and the existing thing is unglamorous. Building beside "
     "the existing thing is the default and it is how a field turns into a landfill.",
     "Existing artifacts are half-right, which makes them feel unusable. Reusing them "
     "means inheriting their compromises.",
     "Find the host first. Is this a DELTA to an existing head, a DONOR to one, or genuinely "
     "a missing function? Zero obvious host is an UNRESOLVED submission, not a new project. "
     "Build on the artifact even when the artifact is imperfect — see 21.",
     ["AGENTS.md (FIELD HOUSE RULES)"],
     ["15 THE HOLDING PEN"]),

    ("21", "THE PARTIAL ASSET",
     "The obvious host is 80% right and 20% wrong.",
     "Discarding it and starting clean is cleaner and loses the 80%. Keeping it means "
     "working around the 20%.",
     "Purity of the new design. Continuity with what already shipped and is already known.",
     "Take the 80% and fix the 20% IN PLACE. Measured this week: `house-patterns.css` was "
     "already numbered like a pattern language and nobody had written the language down — "
     "the fix was to transcribe it, not to author a new palette.",
     ["tools/house-patterns.css"],
     ["20 RECOVER BEFORE INVENTING", "13 THE UN-LOSABLE RULE"]),
]


def esc(s: str) -> str:
    return html.escape(str(s), quote=True)


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def build(outdir: str, check_only: bool = False) -> int:
    names = {n for _, n, *_ in PATTERNS}
    by_name = {n: (num, ctx, prob, forc, sol, ev, links) for num, n, ctx, prob, forc, sol, ev, links in PATTERNS}

    # Resolve links against several accepted forms, because the link TEXT is written for a
    # human ("12 THE FILTERS") while the pattern NAME is canonical ("THE FILTERS").
    # Normalising both sides is fine; silently accepting a name that matches NO pattern is not.
    def norm(s: str) -> str:
        s = re.sub(r"^\d{2}\s+", "", s.strip())
        return re.sub(r"^THE\s+", "", s.upper()).strip()

    lookup = {}
    for num, n, *_ in PATTERNS:
        for form in (n, f"{num} {n}", re.sub(r"^THE\s+", "", n)):
            lookup[norm(form)] = n

    # the network has to close: every LINK must resolve to a real pattern
    broken = []
    for num, n, *_rest in PATTERNS:
        for lk in _rest[-1]:
            if norm(lk) not in lookup:
                broken.append((n, lk))

    # every pattern must carry evidence and at least one link — a pattern with no
    # evidence is a wish, a pattern with no links is not in the language
    no_ev = [n for _, n, _, _, _, _, ev, _ in PATTERNS if not ev]
    no_link = [n for _, n, _, _, _, _, _, lk in PATTERNS if not lk]

    print(f"patterns: {len(PATTERNS)}")
    print(f"  network: {sum(len(l) for *_, l in PATTERNS)} links · broken {len(broken)}")
    for n, lk in broken:
        print(f"    BROKEN LINK  {n!r} -> {lk!r}")
    print(f"  with evidence: {len(PATTERNS) - len(no_ev)} / {len(PATTERNS)}")
    print(f"  with links   : {len(PATTERNS) - len(no_link)} / {len(PATTERNS)}")
    for n in no_ev:
        print(f"    NO EVIDENCE  {n!r}")
    for n in no_link:
        print(f"    NO LINKS     {n!r}")

    if broken or no_ev or no_link:
        print("\nPATTERN LANGUAGE INVALID")
        return 1
    if check_only:
        print("\nPATTERN LANGUAGE OK (check only)")
        return 0

    # ── the page ──
    lookup = {norm(n): n for _, n, *_ in PATTERNS}
    rows = []
    for num, n, ctx, prob, forc, sol, ev, links in PATTERNS:
        sid = slug(n)
        link_html = " ".join(
            '<a href="#{0}">{1}</a>'.format(slug(lookup[norm(l)]), esc(l))
            for l in links)
        ev_html = "".join(f"<li><code>{esc(e)}</code></li>" for e in ev)
        rows.append(f"""
<section class="pat" id="{esc(sid)}">
  <div class="patHead"><span class="patNum">{esc(num)}</span><h3>{esc(n)}</h3></div>
  <div class="patBody">
    <p class="fld"><span class="k">context</span><span class="v">{esc(ctx)}</span></p>
    <p class="fld"><span class="k">problem</span><span class="v">{esc(prob)}</span></p>
    <p class="fld forces"><span class="k">forces</span><span class="v">{esc(forc)}</span></p>
    <p class="fld sol"><span class="k">solution</span><span class="v">{esc(sol)}</span></p>
    <div class="fld"><span class="k">evidence</span><ul class="ev">{ev_html}</ul></div>
    <p class="fld links"><span class="k">links</span><span class="v">{link_html}</span></p>
  </div>
</section>""")

    doc = f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>A PATTERN LANGUAGE · {DATE}</title>
<link rel="stylesheet" href="../tools/house-patterns.css">
<style>
  body{{background:var(--bg);color:var(--ink);font-family:var(--font-body);margin:0}}
  .wrap{{max-width:var(--wrap,900px);margin:0 auto;padding:28px 18px 80px}}
  .lede{{font-size:1.15em;line-height:1.55;border-left:3px solid var(--hot);padding:2px 0 2px 16px;margin:18px 0 6px}}
  .lede b{{background:var(--hl);padding:0 3px}}
  .netnav{{display:flex;flex-wrap:wrap;gap:6px;margin:22px 0 30px}}
  .netnav a{{font:11px/1 var(--font-mono);border:1px solid var(--rule);padding:5px 8px;color:var(--mut);text-decoration:none}}
  .netnav a:hover{{border-color:var(--hot);color:var(--hot)}}
  .pat{{border:1px solid var(--rule);margin:0 0 16px;background:var(--panel)}}
  .patHead{{display:flex;align-items:baseline;gap:12px;padding:11px 14px;border-bottom:1px solid var(--rule)}}
  .patNum{{font:700 13px/1 var(--font-mono);color:var(--bg);background:var(--ink);padding:5px 8px}}
  .patHead h3{{margin:0;font:600 15px/1.2 var(--font-mono);letter-spacing:.06em;text-transform:uppercase}}
  .patBody{{padding:6px 14px 14px}}
  .fld{{display:grid;grid-template-columns:82px 1fr;gap:12px;margin:11px 0;font-size:.92em;line-height:1.6}}
  .fld .k{{font:10px/1.5 var(--font-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--mut);padding-top:3px}}
  .fld.forces .v{{color:var(--mut);font-style:italic}}
  .fld.sol .v{{color:var(--ink)}}
  .sol{{border-left:2px solid var(--hot);padding-left:12px;margin-left:-2px}}
  .ev{{margin:0;padding-left:16px}}
  .ev li{{margin:2px 0;font:11px/1.6 var(--font-mono);color:var(--mut)}}
  .ev code{{color:var(--ok);background:var(--codebg);padding:1px 4px}}
  .links .v a{{font:11px/1 var(--font-mono);border:1px solid var(--rule);padding:4px 7px;margin:0 5px 5px 0;display:inline-block;color:var(--mut);text-decoration:none}}
  .links .v a:hover{{border-color:var(--hot);color:var(--hot)}}
  .lists{{margin-top:46px;border-top:2px solid var(--ink);padding-top:18px}}
  .lists h2{{font:600 13px/1 var(--font-mono);letter-spacing:.14em;text-transform:uppercase;margin:0 0 14px}}
  table.ltbl{{width:100%;border-collapse:collapse;font-size:.86em}}
  .ltbl th{{text-align:left;font:10px/1 var(--font-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--mut);border-bottom:1px solid var(--rule);padding:8px 10px}}
  .ltbl td{{border-bottom:1px solid var(--rule);padding:9px 10px;vertical-align:top}}
  .ltbl td:first-child{{font-family:var(--font-mono);color:var(--hot);white-space:nowrap}}
  .ltbl td:nth-child(2){{color:var(--mut);text-align:right;font-family:var(--font-mono)}}
  .close{{margin-top:38px;border:1px solid var(--hot);padding:16px 18px;font-size:1.05em;line-height:1.6}}
  .foot{{margin-top:26px;font:10.5px/1.8 var(--font-mono);color:var(--mut)}}
  @media(max-width:640px){{.fld{{grid-template-columns:1fr;gap:2px}}.fld .k{{padding-top:0}}}}
</style></head>
<body><div class="wrap">

<h1 class="display">A PATTERN LANGUAGE</h1>
<p class="sub">{DATE} · for the field · {len(PATTERNS)} patterns · {sum(len(l) for *_, l in PATTERNS)} links</p>

<p class="lede">A stylesheet is not a pattern language. Alexander's 253 patterns worked because
they had names, forces, evidence, and — the part everyone forgets — they <b>referenced each
other</b>. This is that, transcribed from what this field already ships.</p>

<p class="sub">Christopher Alexander, Sara Ishikawa &amp; Murray Silverstein, <i>A Pattern Language</i> (1977):
uniform <b>Context / Problem / Forces / Solution</b>, each carrying the evidence for its validity,
explicitly "one possible pattern language" and written for readers to extend. The UI lineage the
operator was remembering is real: Jenifer Tidwell, <i>Designing Interfaces</i> (2005) and her MIT essay
"The Case for HCI Design Patterns" carried Alexander into interface work; then Pattern Lab
(atomic design), UI Patterns, Pttrns, PatternTap. <b>30 Seconds of Code</b> is a snippet library —
different animal, named here so nobody confuses them again.</p>

<nav class="netnav">{" ".join(f'<a href="#{slug(n)}">{esc(num)} {esc(n)}</a>' for num, n, *_ in PATTERNS)}</nav>

{''.join(rows)}

<section class="lists">
<h2>The scattered lists — indexed, not moved</h2>
<p class="sub">These paths are load-bearing for gates, so nothing is relocated. This is the
index that makes them findable; a mass-move would break the things that resolve them.</p>
<table class="ltbl">
<tr><th>where</th><th>size</th><th>what it is</th></tr>
<tr><td>control/research/</td><td>18 files</td><td>per-topic donor raids and state notes — the bulk of the "lists all over"</td></tr>
<tr><td>control/*.json</td><td>22 files</td><td>attention, queue, waiting, issues, policy index — machine authority</td></tr>
<tr><td>recovery/</td><td>12 dirs</td><td>source/donor memory — recovered specs and manifests, not current authority</td></tr>
<tr><td>fcm/ + fcm-*.json</td><td>4 files</td><td>front/cost/map kernel state</td></tr>
<tr><td>showcase-manifest.json</td><td>180 routes</td><td>FIELD INDEX — object identity, and now with true git-touch stamps</td></tr>
<tr><td>ops-hub/wiki/</td><td>473 files</td><td>the machine knowledge base — written for search; see REDUCE, DON'T EXPAND</td></tr>
</table>
</section>

<div class="close">A pattern is a hypothesis with evidence. If it has no evidence it is a wish;
if it has no links it is not in the language. {len(PATTERNS)} patterns, {sum(len(l) for *_, l in PATTERNS)} links,
every one of them pointing at something this field already shipped.</div>

<p class="foot">generated by <code>tools/pattern-language-build.py</code> · {DATE}<br>
transcribed from <code>tools/house-patterns.css</code> v0.3.0 (the numbered house sheet),
FIELD HOUSE RULES surface-discipline, and work measured and shipped 2026-10-06.<br>
sources: Alexander/Ishikawa/Silverstein 1977 · Tidwell 2005 + MIT "The Case for HCI Design Patterns" ·
Pattern Lab · UI Patterns · Pttrns · PatternTap</p>

</div></body></html>
"""
    os.makedirs(outdir, exist_ok=True)
    p = os.path.join(outdir, "index.html")
    with open(p, "w", encoding="utf-8") as f:
        f.write(doc)
    print(f"\nwrote {p} ({len(doc)} bytes)")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--out", default=OUTDIR)
    a = ap.parse_args()
    sys.exit(build(a.out, a.check))
