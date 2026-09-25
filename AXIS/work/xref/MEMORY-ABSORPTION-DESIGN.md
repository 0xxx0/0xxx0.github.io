# MEMORY ABSORPTION — DESIGN

**Status:** DESIGN ONLY — nothing in this file is built. Grounded in a live read of the
workspace on 2026-09-25. All claims tagged **OBSERVED** (measured this pass or cited to
path:line), **INFERRED** (reasoned from observed facts), **UNRESOLVED** (checked, answer
unknown).

**Verdict up front (the short answer):** the absorb *path* already exists end-to-end as
six unconnected pieces. Nothing connects them. The smallest loop that closes it is **one
deterministic pass added to the existing `session-wrangler.py`, fired by one no-agent cron,
verified by one new check in the existing `integrity-audit.py`** — no new profiles, boards,
frameworks, daemons, or stores. The missing piece was never a store; it is a *scheduled
reader with a read-back check*.

---

## 1. What the ACTUAL absorb path is today

### 1.1 Capture — automatic, working, not the problem

Every message from every session (interactive, subagent, cron) already lands durably in
that profile's `~/.hermes/profiles/*/state.db` (**OBSERVED** — `session-wrangler.py`
enumerates all 7+ profiles' DBs read-only, session-wrangler.py:25-42; kestrel's `state.db`
alone is 168.6 MB, LEDGER.md:1158). Raw recall works: cross-session FTS5 search confirmed
working with zero config (LEDGER.md:178-181), and the `session_search` tool reads the same
store across profiles via `profile=` (tool schema, OBSERVED). The raw layer is the one
surface that never loses anything.

### 1.2 Write conventions — results DO get written, to four places

Completed work physically lands in (all **OBSERVED**, live):

| surface | evidence | format |
|---|---|---|
| `AXIS/work/<lane>/RETURN-*.md` (or `FIRST-RETURN`, `SESSION-RETURN`) | 22 files across 14 lanes, e.g. `work/fold-bloom/RETURN_PARALLEL_BATCH1_2026-09-24.md`, `work/ultra-master/FIRST-RETURN-2026-09-23.md` | free-form packet per lane |
| `AXIS/work/collab/receipts.jsonl` | 4 seed receipts (receipts.jsonl:1-4), schema in collab/README.md:8-25 | one JSON line per pattern |
| `AXIS/LEDGER.md` | 60+ dated entries, each with DECISION/WHY/REJECTED/REVISIT-WHEN (+ EVIDENCE/ROLLBACK) | append-only, LEDGER.md:3-4 |
| `AXIS/NOW.md` | hand-appended session summaries | dated sections, NEWEST LAST (an anti-pattern, see §2) |

So "results evaporate" is not literal: they are written. The evaporation is in the
**next-hop**:

### 1.3 The read moment — who reads a completed result, and when

**OBSERVED — exactly two readers exist, and only one of them acts:**

1. **The spawning session, immediately after the child returns.** Every documented fan-out
   (ultra-master FOLLOW-UP, LEDGER.md:721-726; corpus-methods P2 fresh-reader verdicts,
   LEDGER.md:905-906; fold-bloom parallel batch, LEDGER.md:993-1017) was reconciled
   **inside the parent's transcript**. This is real absorption, but it is event-driven,
   one-shot, and dies with the transcript — the result never gets a place a *third* party
   can find.
2. **A future session, only if someone tells it to look.** The wrangler prompt instructs a
   session to run `session-wrangler.py --intent` + read the digest (WRANGLER-PROMPT.md:14-21);
   QUEUE §E says "any session that resumes should read this first" (QUEUE.md:288-291).
   Both are manual invocation of a human-pasted prompt (WRANGLER-PROMPT.md:1-4). Nothing
   schedules them.

**OBSERVED — the surfaces that should be read between sessions are not in any load path:**
- KERNEL's LOAD list is `KERNEL.md, NOW.md, BRIEF.md, STATE.md` (KERNEL.md:21-23); WORKING's
  ORIENT is `KERNEL, NOW, ESSENCE + the specific thing` (library/WORKING.md:44). **Neither
  names the digest or the LEDGER.**
- `session-digest.md` (the wrangler's output) is referenced only by `WRANGLER-PROMPT.md`
  and one LEDGER entry — **it is not in `ESSENCE.md`**, so a fresh session doing ORIENT can
  never see it (grep, OBSERVED; essence-index.py:14-23 lists 8 AXIS rows, no digest).
- `receipts.jsonl` — "**Nothing reads it yet, by design**" (work/collab/README.md:5-6); the
  planned weekly reader was deferred to "~2 weeks" of data (collab/README.md:32-36).
- `work/ideas/` — four idea-extraction subagents were dispatched 2026-09-25 to write one
  file each (LEDGER.md:1223-1228); the lane exists and is **empty** at inspection
  (OBSERVED, dir mtime 2026-09-25 13:26, 0 files — dispatch may still be running:
  UNRESOLVED).

**Live proof of the gap, measured this pass:** the digest's newest snapshot is
`2026-09-24 12:07` (session-digest.md:1). At least **six RETURN artifacts are newer than
it** and unreferenced, including `work/fold-bloom/RETURN_PARALLEL_BATCH1_2026-09-24.md`
(~15:46) and `work/repo-convergence/RETURN-2026-09-23-control-archive-fold.md`
(**OBSERVED**, `find -newer` this pass). Two full days of completed work with no reader.

### 1.4 Verdict

**The honest answer is: results are captured, not absorbed.** A completed task's result
lands in a lane file + optionally a receipt + optionally a ledger line; it is read back
either by the spawning session *in its own transcript* (then lost) or by a future session
*iff* a human pastes the wrangler prompt. There is **no moment when anything happens
automatically**. This is the same "reinforcement gap" already measured and written down:
the system has decay + retrieval and **no reward/read-back mechanism**
(library/WORKING.md:52: "A loop without a verifier is a timer"; COLLAB-LOOPS, archived at
`AXIS/archive/library-consolidated-2026-09-24/COLLAB-LOOPS.md`).

---

## 2. What already exists that could absorb it

| existing piece | could it serve? | what is missing |
|---|---|---|
| **`AXIS/LEDGER.md`** | YES — the decision-grade host. Format already fits absorbed results (EVIDENCE blocks, ROLLBACK lines, LEDGER.md:3-4, 123-135). | It is append-only *by discipline, not by mechanism* — nothing schedules appends; and it is outside the default load list (KERNEL.md:21-23), so it is read on demand only. **Missing: a trigger that decides what deserves a line.** |
| **`AXIS/NOW.md`** | PARTLY — it is the only *guaranteed-read* file (KERNEL.md:22, WORKING.md:44). | Hand-maintained and provably stale-prone: "NOW.md was 24h stale" (NOW.md:117) and its §Open decisions still lists six items from 2026-08-17 (NOW.md:17-25). Newest-last appends of session summaries bury state. **Missing: it should be a derived summary, not a log.** |
| **`AXIS/QUEUE.md`** | NO as host, YES as sink — it is the stated home for "blocked/next" and already receives `@gap` writes (QUEUE.md:4). Absorption candidates that need a human call belong here, only after absorption. | Nothing. Not a memory; do not make it one. |
| **`AXIS/reusable/session-wrangler.py`** | **YES — this is the host.** It already: enumerates every profile's sessions, hides cron noise, extracts last real user intent (noise-filtered, session-wrangler.py:28-30, 96-124), prints machine JSON (:192-206), and reads a session's tail (:170-184). | (a) No notion of "absorbed" — nothing records which sessions/artifacts have been digested; (b) it is deliberately READ-ONLY (session-wrangler.py:2) — no write mode; (c) it only runs when a session runs it — no schedule. **Missing: one `--absorb` mode + a trigger.** |
| **`session_search` (FTS5)** | YES as the retrieval half — proven (LEDGER.md:181); `profile=` crosses profiles. | It is a lens, not a store; it cannot cause anything to happen. Missing nothing itself — it is the *reader's* tool, needed by tier 2 (§3). |
| **`AXIS/ESSENCE.md` + `essence-index.py`** | YES — the "generated, never hand-tended" pattern already proven (LEDGER.md:295-299; essence-index.py:1-6, 87-89). | `session-digest.md` is not in its row list (essence-index.py:14-23). **Missing: one row + one regeneration.** |
| **`work/collab/receipts.jsonl` + README** | YES — the observation side of exactly this loop, pre-built; the reader was explicitly deferred to ~2 weeks (README:32-36). | The reader itself. |
| **`work/convergence/session-digest.md` + `library/WRANGLER-PROMPT.md`** | YES — the write-side contract already exists: append-only newest-at-top (WRANGLER-PROMPT.md:63), the "pass failed if prose but no handle anyone can act on" test (:112-118), never write into transcripts (:80). | Nothing runs it on a schedule; and the digest's own snapshots show whole-profile silent-drop bugs were only caught by re-running (session-digest.md:5). |
| **`integrity-audit.py` + its Monday 07:00 cron** | YES — the external verifier slot, already scheduled, no-agent, zero tokens, exits 1 on HIGH (QUEUE.md:303-305). | One new check (see §3). |
| **cron infra** | YES as trigger mechanism — and it demonstrably *records* failures: `arxiv-alignment-feed`'s exit-1 run is shown as "error: Script exited with code 1" in `hermes cron list` (OBSERVED, 2026-09-25 run). | Nothing. |
| **`work/leverage-scout/exists-sweep.py`** | YES as the exclusion-test machine — it already answers EXISTS/DECLARED/SIMILAR over 6 resolution legs (LEDGER.md:766-783). | Nothing. Use it in the filter (§4 E4). |
| **profile `MEMORY.md`** | NO as host — 2,150/2,200 chars, hard-capped (LEDGER.md:195, 116). It is the *always-loaded* surface, so its correct role is **one pointer line** to the digest, not content. | A pointer, when the loop exists. |

**Conclusion: nothing is missing except (a) a deterministic trigger that decides what
finished since last pass, (b) a write step, (c) an external freshness/parity verifier.**
That is the design below — three small deltas to existing hosts, zero new stores.

---

## 3. The smallest absorb loop — the ABSORB PASS v1

Real loop, four components, all named:

| component | what | where |
|---|---|---|
| **TRIGGER** | one cron, `absorb`, daily 09:10 (+08), **no-agent, zero tokens**, deliver local (same mechanism that already records `arxiv-alignment-feed` failures) | new cron entry — a cron is a trigger, not a system (library/WORKING.md:53); no new profile/board/daemon |
| **INPUT** | (1) all profiles' `state.db` via wrangler's existing `collect()` — sessions, non-cron, ≤7-day window, with last intent; (2) `find AXIS/work -iname 'RETURN*'` newer than the digest's mtime; (3) `receipts.jsonl` lines newer than the digest's mtime; (4) LEDGER + digest text for the dedupe grep | read-only everywhere |
| **TRANSFORM** | `session-wrangler.py --absorb` (delta to the existing tool): compute pending set — finished sessions and RETURN artifacts with a real artifact path, not yet referenced in the digest, passing the §4 exclusion tests. Zero LLM, zero tokens. State marker = **digest mtime** (digest is append-only newest-at-top, so its mtime is the monotonic "last pass" — no new state file) | delta §3.3 |
| **OUTPUT** | one append-only block at the top of `session-digest.md`: `## ABSORBED — <timestamp> (by --absorb)` + one table row per item `| @session:<profile>/<id> | artifact path | one line |` + `SHELF:` pointer line. Exit 0 if nothing pending or block appended; **exit 1 if pending items existed and the write failed** | existing file, existing append-only contract (WRANGLER-PROMPT.md:63) |
| **READER** | (a) the next wrangler session (WRANGLER-PROMPT step 0 reads the digest — now with an ABSORBED section to reconcile into Duplicates/Contradictions/Blocked/Next); (b) any fresh session via ESSENCE (one added row in essence-index.py → regenerated), which ORIENT reads (WORKING.md:44); (c) you, via ESSENCE/NOW. The wrangler (or you) promotes decision-grade items into LEDGER entries per the existing discipline — **the cron never writes LEDGER; decisions are not automatic** (matches the no-self-judging rule, LEDGER.md:47-56) | existing procedures |
| **VERIFIER (external)** | `integrity-audit.py` gains check **G — ABSORB**: (i) digest exists; (ii) newest `## ABSORBED` block ≤ 2 days old; (iii) **parity** — no RETURN-* artifact newer than the newest ABSORBED block is both unreferenced in the digest and unexcluded. Fails HIGH → exit 1 → Monday 07:00 no-agent cron already wired to report it (QUEUE.md:303). This is deliberately a **read-back check over the artifacts**, not the script's self-report — the verified lesson: an exit code only catches what the script was built to check (LEDGER.md:1201-1211) | delta to existing checker |

### 3.1 Two tiers, preserved

- **Tier 1 (machine, daily):** the above. It makes the *fact* that work finished durable and
  findable. This alone closes "results evaporate" — a third party can now enumerate
  everything finished since last pass without reading a transcript.
- **Tier 2 (one cheap LLM pass, only when invoked):** the existing WRANGLER prompt already
  specifies the digest's coordination sections and the "pass failed if no handle anyone can
  act on" test (WRANGLER-PROMPT.md:112-118). Tier 2's only new input is the ABSORBED block;
  its output is LEDGER lines for decision-grade items (with ROLLBACK), NOW.md state changes,
  `essence-index.py` regeneration. It is gated the way every write is gated today.

### 3.2 The deltas, exhaustively (all to existing hosts, all reversible)

1. `AXIS/reusable/session-wrangler.py` — add `--absorb [--run]` mode (~60 lines, reusing
   `dbs()`/`sessions()`/`collect()`/`last_intent()`). `--absorb` alone = dry-run listing of
   the pending set; `--run` appends the block. Rollback: delete the mode (file is
   single-copy in git-less AXIS — back it up first, per the backup discipline).
2. `hermes cron create absorb ...` — daily 09:10, script `session-wrangler.py --absorb
   --run`, no-agent. Rollback: `hermes cron pause <id>` (mechanism proven, 2 crons already
   paused this way, LEDGER.md:257-262).
3. `AXIS/reusable/integrity-audit.py` — add check G to the existing six (integrity-audit.py
   structure per LEDGER.md:466-470). Rollback: delete the function.
4. `AXIS/reusable/essence-index.py` — add `session-digest.md` row to ESSENCE (one line),
   regenerate `AXIS/ESSENCE.md` (the generator is the process, ESSENCE header). Rollback:
   revert the row.
5. One-time backfill: first `--run` absorbs the current backlog (≥6 RETURN artifacts newer
   than digest 2026-09-24 12:07). Same code path, no special case.

### 3.3 Why this is honest about his constraint

No new profiles, no new boards, no new frameworks, no daemon, no new store, no new
document type — the digest, the receipts, the LEDGER, ESSENCE, the audit and the cron
mechanism all predate this design. Four line-deltas on files that already exist, held
together by a verifier that already runs weekly. **This is the "hone, don't expand" answer.**
If even one cron is too many, the loop degrades to a manual-but-verifiable pass: run
`session-wrangler.py --absorb --run` + `integrity-audit.py --only absorb` at session start
— but then absorption again depends on a human, which is the failure being fixed; the cron
is the one non-negotiable piece.

### 3.4 Failure mode if it silently stops

Three independent tells; missing two requires two unrelated breakages:

1. **Digest ages** — no new ABSORBED blocks. Visible in one glance; flips check G(ii).
2. **Parity accumulates** — RETURN files pile up unreferenced. Flips check G(iii); the
   weekly Monday 07:00 audit exits 1 and the output is delivered to the local surface
   (mechanism proven: cron infra records exit-1 as an error, OBSERVED 2026-09-25).
3. **The cron itself** — hermes cron list shows last-run error or the job paused/died, the
   same way `arxiv-alignment-feed`'s exit 1 is recorded today (OBSERVED).

And the documented contract from the wrangler itself: "if a pass produces prose but no
change to the digest, no kanban entry, and no handle anyone can act on — the pass failed,
regardless of how good it read" (WRANGLER-PROMPT.md:112-115). The ABSORBED block fails
that test by construction: it is a change, with handles, and with a machine parity check
behind it.

---

## 4. What must NOT be absorbed

Concrete exclusion tests, each cheap and deterministic, applied in order by `--absorb` (T1)
and by the wrangler (T2):

| # | rule | test (all in one pass, ~no cost) |
|---|---|---|
| E1 | **Already absorbed** | handle or artifact path already present in digest/LEDGER → SKIP (grep the digest text; the artifacts are already findable). |
| E2 | **No receipt — not a move** | session has no RETURN*/receipt/artifact and no LEDGER entry → SKIP. "Conversation that ends in agreement is not a move" (WORKING.md:48); "an item either has a receipt or it is FAILED" (session-continuity-capsule skill). |
| E3 | **Superseded by mtime** | same lane + same subject with a newer artifact (e.g. `qa-harness2.mjs` vs `qa-harness.mjs`, `verify-methods.md` vs `methods.jsonl` — both real cases, LEDGER.md:1007-1009, 905-906) → absorb the newest only, note the older as superseded. |
| E4 | **Already exists as a mechanism** | run `exists-sweep.py` verdicts; EXISTS/DECLARED/SIMILAR on the claimed invention → SKIP, one-line note. The "does this exist" machine was built exactly for this (LEDGER.md:766-783); RECOVER BEFORE INVENTING (AGENTS.md). |
| E5 | **Noise & delegation templates** | <10 msgs, or intent matches the NOISE regex (session-wrangler.py:28-30), or cron-only sessions (excluded by default), or intent that IS a delegation prompt ("Research thread A…", "COMMON LAW — RECOVER BEFORE INVENTING…") → SKIP; absorb each *parent* once, never each worker (the parallel-batch pattern, LEDGER.md:993-1017). |
| E6 | **Chatter / hedges / forks** | intent is a question, a hedge ("im not sure"), a correction-late, or an open fork with no move (WORKING.md:24-32; the 21,128→5,183 authorship finding means most "user" content is other bots, LEDGER.md:1170-1173) → SKIP. |
| E7 | **PII, never promoted** | any text matching the 17-match PII class (`/Users/mcvoid` paths, phone, email — PII-EXPOSURE-2026-09-23.md, LEDGER.md:435-447) → SKIP and note only the artifact path. Nothing from raw transcripts is ever copied into digest/LEDGER verbatim (WRANGLER-PROMPT.md:80 — never write into another session's transcript; absorption cites, it does not quote). |
| E8 | **Rejected / superseded decisions** | LEDGER entries flagged REJECTED or SUPERSEDED-DONOR → never re-absorbed as new (the ledger's own flags, LEDGER.md:96-101). |
| E9 | **Not finished** | last activity < 30 min ago → SKIP (in progress, WORKING.md:64). |
| E10 | **Cross-profile mirrors** | same artifact/content mirrored across profiles (24.2% dup loss measured, LEDGER.md:1169-1171) → dedupe by artifact path/sha256, not by text. |

Every exclusion is a *skip with a reason on stdout*, not a silence — the exit-contract and
check G(iii) treat "everything skipped" as a successful pass but the reasons stay visible
locally so a wrong filter is noticeable rather than invisible.

---

## 5. PROVE it — one command

**The gap, proven today (already executed, OBSERVED):**

```bash
find AXIS/work -iname '*RETURN*' -newer AXIS/work/convergence/session-digest.md | wc -l   # → 6+
```

**The loop, proven post-build (one command, all four components + 2 independence checks):**

```bash
cd ~/void-anchor \
&& printf 'fixture\n' > AXIS/work/xref/PROOF-return.md \
&& echo '{"ts":"2026-09-25T12:00:00+08:00","session":"proof-probe","pattern":"seed","artifact":"AXIS/work/xref/PROOF-return.md","corrections":0,"converged":true}' >> AXIS/work/collab/receipts.jsonl \
&& python3 AXIS/reusable/session-wrangler.py --absorb --run \
&& grep -F "PROOF-return.md" AXIS/work/convergence/session-digest.md >/dev/null \
&& python3 AXIS/reusable/integrity-audit.py --only absorb \
&& echo LOOP-PROVEN
```

That exercises in one line: input (state.db + RETURN files + receipts) → transform
(`--absorb --run`) → write (digest block) → read-back (grep) → external verifier
(`integrity-audit --only absorb`).

**The negative test (proves the verifier can fail — the burned-cron lesson, LEDGER:1201-1211):**

```bash
touch AXIS/work/xref/FORGOTTEN-return.md && python3 AXIS/reusable/integrity-audit.py --only absorb; echo $?   # → 1, not 0
```

A checker that only passes is decoration (integrity-audit's own rule, LEDGER.md:472); a
loop whose stop is undetectable is the loop this owner was burned by. The negative test is
part of the proof, not an afterthought.

---

## Appendix — citation index

- KERNEL.md:3, :21-23, :34-35 · NOW.md:17-25, :117-118 · LEDGER.md:3-4, :47-56, :96-101,
  :123-135, :178-181, :195, :257-262, :295-299, :435-447, :466-470, :472, :488-508,
  :499-500, :721-726, :766-783, :807-825, :905-906, :993-1017, :1007-1009, :1158, :1169-1173,
  :1201-1211, :1223-1228 · library/WORKING.md:44, :48, :52-53, :64 · library/WRANGLER-PROMPT.md:1-4,
  :14-21, :63, :80, :112-118 · work/collab/README.md:5-6, :8-25, :32-36 ·
  work/collab/receipts.jsonl:1-4 · work/convergence/session-digest.md:1, :5, :195 ·
  AXIS/QUEUE.md:4, :288-291, :303-305 · AXIS/reusable/session-wrangler.py:2, :25-42, :28-30,
  :52-56, :96-124, :170-184, :192-206 · AXIS/reusable/essence-index.py:1-6, :14-23, :87-89 ·
  AGENTS.md: PRIMARY LAW / CONTRIBUTION CLASSES · skill `sessions` ·
  skill `session-continuity-capsule`.