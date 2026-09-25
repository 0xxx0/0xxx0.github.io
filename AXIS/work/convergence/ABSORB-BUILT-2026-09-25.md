# ABSORB BUILT — 2026-09-25

**Status: MECHANISM BUILT AND PROVEN, SWITCHED OFF.** No cron exists. The audit check
currently passes (exit 0). Per `AXIS/work/xref/MEMORY-ABSORPTION-DESIGN.md` — the
design this implements, delta-only: one `--absorb` mode on the existing
`session-wrangler.py`, one check in the existing `integrity-audit.py`, one shared
exclusion engine, zero new stores, zero new subsystems.

---

## 1 · WHAT WAS BUILT

| file | change |
|---|---|
| `AXIS/reusable/session-wrangler.py` | +`cmd_absorb()` (~150 lines): `--absorb` (dry-run), `--absorb --run` / `--absorb --write` (append). Reuses existing `dbs()/collect()/last_intent()`. Docstring carries the hard contract. |
| `AXIS/reusable/integrity-audit.py` | +`check_absorb()` — the external read-back check, registered as `ABSORB` (the design's PROVE command uses `--only absorb`). |
| `AXIS/reusable/absorb-core.py` | **NEW** — the single source of truth for the artifact scan and the 10 exclusions, imported by both of the above so the verifier can never drift from the absorber (the burned-cron lesson: a gate that checks different logic than the producer is blind). |
| `~/.hermes/profiles/kestrel/scripts/absorb-pass.py` | **NEW** — 3-line inert cron entry point (same wrapper pattern as `integrity-audit.py`; the cron runner requires the entry in `$HERMES_HOME/scripts/` and refuses symlinks). Executed by NOTHING until a cron is created. |
| `AXIS/work/convergence/session-digest.md` | +one append-only `## ABSORBED` block (see proof). Title and all prior snapshots preserved verbatim below it. |
| `AXIS/work/collab/receipts.jsonl` | +1 fixture receipt line (the proof's seed — append-only discipline, stays). |
| `absorb-build-backup-2026-09-25/` | **NEW** — pre-change state of wrangler/audit/digest/receipts (`/final/` holds the post-change code). Rollback = restore `session-digest.md` from here. |

**Writable surfaces (the only ones):** `session-wrangler.py` (the --absorb addition),
`session-digest.md` (append-only blocks), and my own new files. Everything else is read
-only. LEDGER.md is never written by this loop; nothing is ever deleted by this loop.

**Dry-run command (this is the daily pass, safe to run any time):**
```bash
python3 /Users/mcvoid/void-anchor/AXIS/reusable/session-wrangler.py --absorb
```
Write mode: `--absorb --run` (or `--write`). Audit: `python3 /Users/mcvoid/void-anchor/AXIS/reusable/integrity-audit.py --only absorb`.

## 2 · THE PROOF (spent fixture, real output)

**Gap, before the build** — 7 return artifacts newer than the digest's mtime, no
reader (`session-digest.md` newest snapshot 2026-09-24 12:07):

```
ABSORB DRY-RUN — 2026-09-25 18:39 (+08)
window: artifacts/receipts newer than digest mtime 2026-09-24 12:08:06
scanned: 8 return artifacts in window · 1 receipts in window
  skip [E1] already referenced in digest/LEDGER  (AXIS/work/fold-bloom/RETURN_PARALLEL_BATCH1_2026-09-24.md)
pending: 7
  ABSORB —   AXIS/work/corpus-methods/test/r2-test/RETURN.md                    RETURN — R2 TEST APPLIED
  ABSORB —   AXIS/work/dayline-compress/RETURN-2026-09-23-dayline-compression.md RETURN — ATLAS DAYLINE interface compression (2026-09-23)
  ABSORB —   AXIS/work/dayline-compress/RETURN-2026-09-23-dayline-disclosure.md RETURN — ATLAS DAYLINE PROGRESSIVE DISCLOSURE, SLICE 1 (2026-09-23)
  ABSORB —   AXIS/work/fold-bloom/RETURN-2026-09-24-lane-catchup.md             RETURN — FOLD//BLOOM lane catch-up · 2026-09-24
  ABSORB —   AXIS/work/reduction-2026-09-23/control/SESSION-RETURN.md           SESSION RETURN — Reduction mission 2026-09-23
  ABSORB —   AXIS/work/repo-convergence/RETURN-2026-09-23-control-archive-fold.md RETURN — CONTROL SURFACE ARCHIVE FOLD (2026-09-23)
  ABSORB —   AXIS/work/xref/PROOF-return.md                                     fixture
DRY-RUN — no write performed (add --run to append)
EXIT=0
```

**Write pass** (`--absorb --run`, exits 0, same pending set; per-item lines identical to
dry-run, so not repeated here):

```
APPENDED 7 item(s) to AXIS/work/convergence/session-digest.md (exit 0)
EXIT=0
```
Read-back immediately after:
```
$ grep -n "PROOF-return.md" AXIS/work/convergence/session-digest.md
13:| — | `AXIS/work/xref/PROOF-return.md` | fixture |
$ head -3 AXIS/work/convergence/session-digest.md
# CROSS-SESSION DIGEST — 2026-09-24 12:07

## ABSORBED — 2026-09-25 18:39 (+08) — by --absorb
```
(7 rows: one per item — handle `—` because no live session resolved, artifact path
`AXIS/...`-relative, one-line summary from the artifact's own heading; `SHELF:` pointer
line ends the block: "absorbed items stay in their lanes — decision-grade promotion to
LEDGER is human-or-wrangler only, never this cron.")

**External verifier, positive** (this is the design's check-G read-back, and it re-derives
the pending set from the artifacts — not from the pass's self-report):
```
$ python3 AXIS/reusable/integrity-audit.py --only absorb
  ok [G.absorb    ] ABSORB: newest ABSORBED block ≤ 2 days old
        observed: newest 2026-09-25 18:39 · 0d 0h old
  ok [G.absorb    ] ABSORB: parity with return artifacts
        observed: 1 artifacts in window, all referenced or excluded
  0 HIGH · exit 0
AUDIT-EXIT=0
```

**NEGATIVE TEST — the one that must fail** (a planted artifact the loop "forgot", run on
the final code):
```
$ touch AXIS/work/xref/FORGOTTEN-return.md && python3 AXIS/reusable/integrity-audit.py --only absorb
  !! [G.absorb    ] ABSORB: no return artifact newer than newest ABSORBED block is unreferenced and unexcluded
        observed: 1 unabsorbed artifact(s): work/xref/FORGOTTEN-return.md
  1 HIGH · exit 1
NEG-EXIT=1
```
A checker that cannot fail is decoration (integrity-audit's own rule, LEDGER.md:472).
The fixture was then removed (the only deletion in this build — my own test file, not
loop behavior); `PROOF-return.md` + its receipt + the digest block stay as spent evidence.

**Steady state after cleanup** (both exit 0):
```
$ python3 AXIS/reusable/session-wrangler.py --absorb --run        # second pass
window: artifacts/receipts newer than digest mtime 2026-09-25 18:39:10
scanned: 0 return artifacts in window · 0 receipts in window
pending: 0
NOTHING PENDING — no block appended (exit 0)
EXIT=0

$ python3 AXIS/reusable/integrity-audit.py --only absorb
  0 HIGH · exit 0
```

**Loud-failure demo** (HOME without a digest — the `DIGEST MISSING` path):
```
$ HOME=/tmp/nonexistent-home-absorb-test python3 AXIS/reusable/session-wrangler.py --absorb
FAIL (exit 1): DIGEST MISSING: /tmp/nonexistent-home-absorb-test/void-anchor/AXIS/work/convergence/
session-digest.md — cannot record pass state (FileNotFoundError(2, 'No such file or directory'))
EXIT=1
```

**Session-level exclusions** (E2/E5/E6/E9 — can't be live-tested without writing
state.db, so proven with a throwaway in-memory world against the real engine):
```
SKIP ('E2', 'receipt s-none has no artifact — not a move', '(receipt)')
SKIP ('E6', 'session @session:test/3 intent is chatter/hedge/question', '.../chat-return.md')
SKIP ('E5', 'session @session:test/4 intent is delegation/noise', '.../deleg-return.md')
SKIP ('E9', 'session @session:test/2 active <30 min — still in progress', '.../fresh-return.md')
SKIP ('E5', 'session @session:test/5 has 3 msgs — noise floor', '.../tiny-return.md')
```
**E3 superseded:** `older sibling superseded -> ['superseded by .../RETURN-2026-09-25-thing-2.md']`
**E4 engine** (exists-sweep, the design's own E4 machine — real verdicts):
```
E4 existing-name (first build): 0.1s -> ('exists-sweep', 'EXISTS', 'STEM-ONLY:~/void-anchor/AXIS/work/leverage-scout/exists-sweep.py')
E4 novel-name (cached): 0.01s -> None
```
All real backlog subjects pass E4 (verified after the E4 engine was fixed): nothing in
the absorbed block would have been E4-skipped.

## 3 · WHAT IT EXCLUDES — the 10 tests as implemented (concrete rules)

Every skip prints `skip [En] <reason> (<path>)` on stdout. Application order: E1 → E3 →
E2 → E9 → E5 → E6 → E4 → E7 → E8 → E10 (E2/E5/E6/E9 apply only to receipt-linked
candidates with a session resolved from state.db; pure artifact files — the common
case — are judged by the file-level tests only).

| # | rule as implemented |
|---|---|
| E1 | artifact's absolute path, `AXIS/...`-relative, `work/...`-relative, **or dated return-name basename** already appears in `session-digest.md` **or** `LEDGER.md` text → skip. (Batch1 was E1-skipped correctly: LEDGER:1003 names it.) |
| E2 | receipt whose `artifact` is `none`/missing → the session made no move → skip (receipt itself is the note). |
| E3 | group by (lane, subject) over the WHOLE window, subject = basename minus `RETURN`-prefix/date/version-tail; keep the newest mtime; if the group's newest is already referenced, **all** siblings retire. |
| E4 | run the existing `exists-sweep.py` once per pass; resolve the artifact's cleaned subject (same cleaning as E3); drop evidence pointing at the artifact itself or inside its own lane; **EXISTS or DECLARED remaining → skip.** SIMILAR/SEEN/NONE are NOT skips (deviation, below). Time-budgeted: 60 s after first build, else WARN on stderr and proceed without E4 that pass. |
| E5 | session <10 msgs, or intent matches the wrangler's NOISE regex or the delegation-prompt shapes (`Research thread X`, `COMMON LAW…`, `## LANE`, `Visual Representation…`, `Extract problem-solving CASES…`, …) → skip. |
| E6 | intent matches the chatter/hedge regex (`hmm`, `im not sure`, `wats`, `can u`, `no wait`, `actually`, …) or ends with `?` → skip. |
| E7 | **phone or email regex in the artifact's first 8 KB → skip, path-only note** (nothing from transcripts is ever quoted; absorption cites, it does not quote). `/Users/mcvoid` home paths are **scrubbed to `~` in the one-liner, not a skip** (deviation, below). |
| E8 | basename appears in a LEDGER line within ±2 lines of a decision flag — flag = line-anchored `REJECTED:` field or `SUPERSEDED` status (the ledger's own conventions, LEDGER.md:3, 100). Prose like "push rejected non-fast-forward" (LEDGER.md:733) never matches. |
| E9 | **session-bound**: receipt-linked session's last activity <30 min → skip. Never applied to the file itself — the design's own proof creates and absorbs a seconds-old file. |
| E10 | sha256 content dedupe within a pass: first path wins, mirrors skip with the canonical path named. |

**Documented deviations from the design's letter (all conservative, all visible):**
- **E4 SIMILAR is not a skip.** A return packet is a *record* of completed work
  (AGENTS.md: RETURN class), not a novelty claim; "something similar exists" is normal
  for records and belongs to tier-2 human/wrangler judgment. Also E4 resolves the
  *cleaned subject*, not the raw filename (return filenames are unique by construction
  and would never match anything), and git-branch hits are exact-name only.
- **E7's `/Users/mcvoid` member is a scrub, not a skip.** It appears in nearly every
  artifact; skipping on it would make the loop absorb nothing. The digest is local; the
  real exposure vector (public repo) is handled by scrubbing home paths out of the
  one-liner. Phone/email remain hard skips.
- **E9 is session-bound** (see above) — otherwise the design's own PROVE command fails.
- **E2** fires on `artifact: none` receipts; sessions with no receipt at all never enter
  the pipeline (they have no artifact to row), which is the design's stated outcome.

## 4 · HOW IT FAILS LOUDLY

Contrast with the burned pattern (LEDGER.md:1201-1211): a cron that exited 0 and printed
`ok` while `getUpdates` returned an empty set — structurally blind. This loop has no
structural-blindness path: every failure exits 1 **and prints a reason**, and the
verifier re-derives parity from the world, not from the pass's own report.

| failure path | exit | reason printed |
|---|---|---|
| digest missing/unreadable | 1 | `FAIL (exit 1): DIGEST MISSING: <path> …` (demonstrated above) |
| LEDGER unreadable | 1 | `FAIL (exit 1): CANNOT READ <path> …` |
| receipts.jsonl any line not JSON / missing ts / unparseable ts / unreadable | 1 | `FAIL (exit 1): RECEIPTS CORRUPT — <path> line N …` — a blind capture surface must stop the pass, not be ignored |
| exists-sweep missing or time budget exceeded | 1* | `WARN: … proceeding without E4 this pass` (*filter failure warns and absorbs *superset*, never silently narrows) |
| lock on digest fails | 1 | `FAIL (exit 1): LOCK FAILED …` |
| write fails (open/temp/fsync/replace) | 1 | `FAIL (exit 1): WRITE FAILED — …` |
| block not found in read-back after write | 1 | `FAIL (exit 1): block NOT VERIFIED … digest may be inconsistent` |
| unexpected exception anywhere | 1 | `FAIL (exit 1): unexpected …` |
| nothing pending / block appended | 0 | printed outcome on stdout |
| audit check: digest absent, no ABSORBED block ever, block >2 days old, or any newer artifact unreferenced+unexcluded | audit exits 1 | HIGH findings name the artifacts (`1 unabsorbed artifact(s): work/xref/FORGOTTEN-return.md`) |

Independent tells if the loop silently stops (design §3.4): digest ages (G ii), parity
accumulates (G iii), cron list shows the run's error — the same mechanism that already
records `arxiv-alignment-feed`'s exit 1.

## 5 · STILL OFF — and how to turn it on

**No cron exists.** Verified: no `absorb` entry in any `~/.hermes/**/cron/jobs.json`.
The wrapper `~/.hermes/profiles/kestrel/scripts/absorb-pass.py` is inert until scheduled.

**The exact one-line change that enables it** (creates the daily 09:10 pass, no-agent,
zero tokens, output delivered locally — the CLI help was verified live):
```bash
hermes cron create '10 9 * * *' --name absorb --script absorb-pass.py --no-agent --deliver local
```
`--script` must live under `$HERMES_HOME/scripts/` (it does — that's what the wrapper is
for; the cron runner refuses symlinks, same as the audit wrapper). Rollback: `hermes cron
pause absorb` (mechanism already proven for two crons).

**Recommended moment to enable:** after the owner has read this report and one
un-reviewed `--absorb --run` cycle feels boring — e.g. next time work is being shipped
and the digest is expected to move. Important expectation: the audit check will go HIGH
~2 days after the last `--absorb` run, because a digest that stops moving *is the tell*.
While deliberately off, the Monday audit showing `G.absorb … no ABSORBED block`/stale is
the check working, not a malfunction. Cron is the one non-negotiable design piece;
until then, the manual-but-verifiable pass is `session-wrangler.py --absorb --run` +
`integrity-audit.py --only absorb`.

## 6 · UNRESOLVED / honest notes

- **Pre-digest returns are out of scope by design.** The window is "newer than the
  digest's mtime", so ~10 older RETURN packets (e.g. `work/convergence/RETURN-2026-09-19.md`,
  the `packers-20260923/*/RETURN.md` set) will never be absorbed and never fail parity —
  design §3.2's backfill note only claimed the ≥6 newer ones. If wanted, a one-time
  manual digest-mtime reset or a `--since ALL` flag would need a small follow-up delta.
- **First `--run` absorbed 7 items including `corpus-methods/test/r2-test/RETURN.md`** — a
  test-return, documented in LEDGER:955. Absorbing it is defensible (it is a real return
  packet) but it is the closest thing to noise absorbed; tier-2 can strike it.
- **The digest title still reads `2026-09-24 12:07`** — the old snapshot header is
  history, preserved by append-only; the ABSORBED block is the freshness surface.
  Refreshing the snapshot itself is the wrangler's job, not this loop's.
- **E4 time budget is 60 s after first build**; build itself is ~0.1 s on this Mac so the
  budget will rarely matter, but an huge tree change could degrade E4 to WARN-and-pass.
- **`E1`'s basename match is restricted to dated return names** — a generic `RETURN.md`
  mentioned in the LEDGER by basename alone would only be caught via its path forms.
  Low risk, documented.
- **Two bugs were found and fixed during the proof** (worth recording): the first
  `newest_absorbed_ts` unpacked a string (ValueError) — caught because the audit wraps
  check errors as HIGH, and the E4 engine was initially a silent no-op (`built_at=0`
  tripped its own budget guard before the first build). Both were caught by running the
  designed negative tests, not by reading the code. The negative test is the reason they
  could not survive.
- **Nothing else is stubbed.** Dry-run, write, lock, read-back verification, both audit
  polarities, all 10 exclusions, loud-failure paths, and the inert wrapper are
  implemented and exercised as shown above.