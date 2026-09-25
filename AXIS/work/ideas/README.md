# Idea extraction — rescued, and what it found

*2026-09-25. Four agents mined the ChatGPT archives for mcvoid's own design ideas. They were
killed mid-flight (~13:30) before writing their deliverable. Their working state survived in
`/tmp` and was rescued here. This file is the synthesis step they never reached.*

## What was rescued

| | |
|---|---|
| `_rescued-20260925/kestrel_mine/all_user.tsv` | **1.9 MB** — every user message mined across Hermes sessions |
| `_rescued-20260925/kestrel_mine/sessions/` | **97 session files** |
| `_rescued-20260925/ideas_work/candidates.tsv` | **4,494 candidates** — `src, cid, mid, ts, title, len, why, snippet` |
| `_rescued-20260925/ideas_work/{index_archives,select_candidates}.py` | their pipeline, re-runnable |

**This is the absorb problem in one incident.** Real work sat in `/tmp` — unscheduled, unverified,
and one reboot from gone. Nothing in the system noticed, because nothing looks. The rescue was
manual and lucky.

## Scope of the mine

```
candidates   4,494  across 576 distinct conversations · 2,400 distinct messages · 600 conv ids
sources      sept18 2,721 · june12 1,750 · db 12 · db-group 11   (two ChatGPT exports + corpus.db)
span         2025-05-08  ->  2026-09-18
```

## Their selection logic — the `why` codes

Worth reading, because it is a *description of what he actually does*, written by an agent that
had just read 4,494 of his messages:

```
delight            1,096   ← the single largest category by far
system               480
design               456
sort_pile            298
principle            253
fix_break            232
together             194   ·  see_it 180  ·  long 179  ·  join 165
get_back             133   ·  collapse_converge 130
state_of_self         99   ·  what_i_want 84  ·  remember 84
smaller               76   ·  rule 70  ·  choice 69  ·  build 51
truth 34 · by_hand 34 · dont_lose 33 · note_to_self 17 · understand 13
law_like 11 · axiom 8 · must_never 2 · system_should 1
```

**`delight` outweighing `system` 2.3-to-1 is the finding.** The largest category in his own
archive is not architecture, not rules, not fixes — it's delight. `must_never` appears twice in
4,494 messages; `delight` appears 1,096 times. Any model of how he works that leads with
constraint has the proportions wrong.

`sort_pile` (298) and `get_back` (133) are the other tell: a large fraction of what he writes is
about *recovering* and *ordering* things that already exist — not creating new ones. That is
consistent with everything measured today.

## Themes (matched against his own vocabulary)

```
system / architecture   784        ← rules, schemas, contracts, laws
field / interface       643        ← surfaces, panels, layout, readfield
making / physical       619        ← make, print, material, fabric, furniture
glyph / visual system   542        ← glyph, diagram, icon, typography, chart
meaning / self          502        ← meaning, identity, purpose, dharma
memory / context        474
loop / agent / autom.   197        ← the smallest, despite being today's focus
```

**Caveat, stated plainly:** theme matching was substring-based over title+snippet and it
over-fires — `making/physical` matched e.g. *"Post Nut Clarity Lament"* on a stray token. Treat
the ordering as indicative, not as a measurement. The `why` codes above are the agents' own
judgement and are more reliable than this table.

## The densest threads — what he actually spent time on

```
203  Reignite Jason's Power
128  Recursive Fables and Slothcakes
 80  Spy Art and Strategy
 79  Die before you die
 74  Imago Dei Exploration
 72  ΔGlyph Protocol Refinement          ← glyph, again
 72  Spiral Symbolism Literary Analysis
 64  Branch · Child of Storms Draft
 58  三十六计应用探讨   (Thirty-Six Stratagems)
 58  Exploring Monscopia Meaning
 55  JavaScript Code Assistance
 53  志与诚的探讨       (will & sincerity)
 48  心旷神怡解析
 48  Document absorption summary
```

**Read as a list, this is one thing.** Symbolic systems (I Ching scale-free navigation, 36
stratagems, spiral symbolism, imago dei, syneresis/daimon/nous), glyph-protocol design,
labyrinthine font generation, and practical JavaScript. Not a scatter — the same
symbol-system-into-instrument question, approached from the mythic end and the code end.

That is the third independent confirmation today of "it's all one thing":
1. the 185 machine styles collapsing to ~14 real families,
2. the 65-doc glyph/log-polar/memory-palace cluster inside an old 66 GB dump,
3. this — 576 conversations whose densest threads are symbolic systems and glyph protocols.

## What is NOT done

- **The candidates are selected, not yet synthesised into typed ideas.** 4,494 raw rows; the
  next step is grouping them into named ideas with verbatim quotes, and that needs judgement
  per cluster, not a bulk pass.
- **`/tmp/ideas_work/cache/`** holds more intermediate state not yet inspected.
- **Two `ts` values are raw epochs** rather than ISO — a small bug in their selector, harmless.
- **The other two extraction agents (Telegram, repo documents) wrote nothing at all** — their
  scopes are still unmined.

## The reusable lesson

A fan-out's output is only as durable as where it lands. These agents did 20 minutes of real
mining, wrote their staging to `/tmp`, and died one step from the finish. **Any extraction
pipeline should write its intermediate state into the repo from the first call, not to `/tmp`** —
cheap to do, and it converts a total loss into a resumable pass.
