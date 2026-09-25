# CHATGPT / HUMAN HANDOFF

BRANCH: hermes/cross-session-convergence-20260925
PR: #— (draft, created with this branch — number recorded in a follow-up commit)
LAST VERIFIED MASTER: 012775db (2026-09-25 ~14:05 +08; master advances continuously — nexus board-refresh cron)
LAST UPDATE: 2026-09-25 ~14:05 +08

## STATE — what is actually true now

- Repo genuinely healthy and fast-moving: 250+ commits since 2026-09-24; PRs #208–#247 merged inside 48h; **#246 (worker-authority contraction) and #247 (daily generator → live authority) both landed during this pass**.
- `control/CURRENT.json` (2026-09-25) retains 11 heads; exactly two live fronts: **conversion** + **recovery-ingest**. No third front is warranted.
- The **2026-09-24 cross-session pass produced a full recovery RETURN that was never landed** (its write scope was recovery-only). This pass lands that judgment durably and establishes the standing rendezvous (this branch/PR).
- Hermes fleet: 9 profiles; ≈130 sessions in the live 3-day window; ≈56 enabled crons across profiles. Heavy desktop lanes: `kestrel` (repo + AXIS; live now) and `default` (this orchestrator); `operator` = ops-hub crons; kage/lam4000/mahshroom/thisjustthing = Telegram fleet.
- WORKER_BOOT staleness (the Sep-24 pass's top hygiene finding) is **CLOSED**: #246 replaced it with a compatibility pointer + `/llms.txt` machine entrypoint + transient JIT handoff (`scripts/emit-agent-transcript.mjs`).

## DELTA — what changed since the previous update

- **Landed by this pass (selected integration 1):** this convergence return + successor charter `control/prompts/HERMES_CROSS_SESSION_CONVERGENCE_2026-09-25.md` (body verbatim; body sha256 `a8ca5e431ab59aa1d2027789ac8e85bed6fa77cd4b6dff51973776b20276c4b8`).
- **Landed by this pass (selected integration 2):** `control/prompts/HERMES_LONG_HORIZON_WORKER_2026-09-24.md` + cold-start pointers — staged 2026-09-24 by `@session:default/20260924_110743_94161a`, verified then, blocked on consent; landing now as its own bounded PR.
- Absorbed by other live writers mid-pass: #246 worker-authority contraction; #247 daily-generator live authority.
- Preserved separations: Fold/Bloom lived gates; READFIELD phone gate; local machine items (below).

## NEEDS REVIEW — material judgment/questions only

1. **nexus board-refresh churn** — ~30-min auto-commits into master (hundreds/week). Keep the board as a live surface, but a cull policy is wanted (keep board; reduce commit cadence?).
2. **arxiv-alignment-feed failing daily** (HTTP 406; triage passes on the stale feed). Local kestrel cron — needs a UA/backoff fix or a pause decision.
3. **operator profile**: duplicated cron entries (Crew Pulse Check ×2, kobo-daily-publish ×2) + Crew Pulse Check erroring (`RuntimeError: Connection error`).
4. **Branch hygiene**: ~57 remote branches are not in master (mostly superseded iterations / closed PRs). A prune list can be prepared; no deletion without approval.
5. **kestrel-lane open residue** (grep-verified): no operator registry / `COMPRESS` in `fold-bloom/live/`; causal-witness scoring unserved; Suno "official API platform" line still unapplied in `FIELD_PULSE_2026-09-22.json`.

## ACTIVE INTEGRATIONS — maximum two

1. **THIS PR** — cross-session convergence return (closes the unlanded 2026-09-24 judgment; establishes the durable rendezvous).
2. **`control/long-horizon-worker-20260924`** — land the staged long-horizon worker master prompt + pointers (draft PR, opened alongside this one).

## WAITING — human/world/private dependencies only

- Fold/Bloom lived gates (the repo's own next executables): **one real LISTEN→REPLAY message to another human** · two real phones for SABER · sing once into VOICE · judge FEW vs MANY.
- READFIELD 0.8.4 lived phone gate; SET→LIVE phone ride (CURRENT queue).
- Local machine decisions: backup soft-spot close-out (10 stub files; receipts local) · `hermes-runtime` 1.4 GB donor archive · `gemma4:e4b` pull (ollama daemon currently down) · node0 plist repair-or-retire · swap/qwen3.8 load hygiene.
- PRIVATE_DEPENDENCY: local machine baseline items tracked locally (no repo payload). PRIVATE_RETURN_AVAILABLE: yes.

## NEXT — one bounded next move

Run ONE lived gate (human), or approve ONE local hygiene fix. Machine side: no new build until lived-gate evidence arrives.

---

# COVERAGE — sessions/goals/workers/branches/PRs inspected

- **Sessions:** 9 profile stores enumerated; ≈374 sessions since 2026-09-18; ≈130 in the live 3-day window (`AXIS/reusable/session-wrangler.py`); 15+ sessions read in depth this pass (all decision-relevant desktop sessions + tails of the big archive lanes).
- **Git:** ≈256 remote branches triaged (101 in-master ancestors / 96 PR-merged / 57 not-in-master, spot-verified by content); 2 worktrees; 2 local clones (`~/void-anchor` stale @ceb277e; `~/Projects/0xxx0.github.io` near-head with live non-Hermes WIP — left untouched).
- **PRs:** 234 lifetime at pass time (≈192 merged / 42 closed / 0–1 open mid-pass).
- **Crons:** 56 enabled jobs across 8 profiles (default 1 · kestrel 14 · operator 22 · archive 4 · mahshroom 5 · lam4000 8 · kage 1 · thisjustthing 1).
- **Kanban:** tasks live under `~/.hermes/kanban/boards/{convergence,ops-hub,code-interphase,glyphline,main,default}`; convergence = 1 blocked / 7 done; ops-hub = 3 blocked / 9 done / 6 ready (+1 archived); code-interphase done.
- **Local exports:** Sep-24 redacted export (74 MB, `~/.hermes/session-exports/`); this pass's working set: `~/.hermes/state/cross-session-convergence-20260925/` (branch triage, cron census, session census, authority extract).
- **Inaccessible:** none material. Kestrel fan-out sessions (cron audit, backup compare, lineage locate) were deliberately left alone — live.

# SESSION DISPOSITIONS — compact map

Matrix letters: A=absorb · B=transplant · C=already in current heads · D=park/waiting · E=compost/supersede · F=unknown

| item | lane | verified state | disposition |
|---|---|---|---|
| FIELD INDEX 0.8.1–0.8.3 (#221/#223/#232/#234) | repo | merged, root contracted | C |
| READFIELD 0.8.3/0.8.4 (#226/#242); branch `readfield-workflow-083` extra commits are receipts only | repo | merged; leftover superseded | C / E |
| Fold/Bloom family (#200/#211/#213/#216/#218/#220/#222/#225/#227–#230/#235/#236/#238/#240) | repo | merged; LIVE 0.13 / LISTEN 0.6 marks / REPLAY 0.2 / SABER 0.1 | C; lived gates D |
| APP ATLAS 0.2 (#244) · WITNESS (#241) · research sync (#237) · machine entrypoint (#245) | repo | merged | C |
| #246 worker-authority contraction · #247 daily generator | repo | merged mid-pass | C |
| ~57 not-in-master branches (Sep 19–25; incl. `proof/read-loci-*`, `fold-bloom-demo-source-architecture`, `field-machine-transcript-*` closed lines) | repo | samples content-verified as superseded iterations | E (prune-list candidate) |
| 42 closed PRs (Sep 18–25) | repo | closed, superseded by later merges | E |
| codex worktree `@8ca9b214` (June-era snapshot; 307 changed files vs current) | local | detached, not merged | E — retained as evidence, no merge path |
| second clone `~/Projects/0xxx0.github.io` + untracked `kernel/interphase-kernel.js` | local | active writer surface; INTERPHASE user-protected | B held (do not touch) |
| `@session:default/20260924_113522` (Sep-24 convergence pass) | session | full RETURN produced, never landed | A → landed by this pass |
| `@session:default/20260924_110743` (staged LH worker prompt) | session | staging complete; consent was the only blocker | A → delta 2 |
| `@session:default/20260924_120421` (H-QA-01 partial slice) | session | boot/layout clean; F1/F2 findings + RETURN local | B donor (nav microfix candidate) |
| `@session:default/20260924_115453` (wrangler) | session | tooling delivered (`session-wrangler.py`, digest, chatgpt-in bridge) | LIVE_UNIQUE tooling — CONTINUE use |
| `@session:kestrel/20260923_034953` (bootstrap, ACTIVE) | session | holds fleet/kanban/corpus state | LIVE_UNIQUE — CONTINUE (no replacement) |
| `@session:kestrel/20260923_105229` (collapse/interphase; BRIEF-2026-09-25) | session | INTERPHASE spikes absorbed via `lib/interphase-core.js`; residue named | B (registry/COMPRESS · causal witness · Suno line) |
| `@session:kestrel/20260925_124434` (comms ANA) | session | `AXIS/work/comms/ASKED-NEVER-ANSWERED.md` delivered | LIVE_UNIQUE local deliverable |
| kestrel fan-out (cron audit · backup compare · lineage locate) | session | in flight now | LEAVE ALONE — live |
| `@session:archive/20260921_234252` (repo survey) | session | manifest/inventory work landed; kernel extraction stopped by user | C + B parked |
| `@session:archive/20260921_233636` / `20260920_173052` | session | corpus/telegram archaeology, consumed by later indexing | E donor |
| operator / kage / lam4000 / mahshroom / thisjustthing (sessions + crons) | fleet | live bots & ops jobs | CONTINUE; operator dupe-cron finding |
| `meanname` profile | fleet | empty (0 sessions) | note — unused |
| kanban `t_2f37896f` (config migration) + ops-hub 3 blocked | board | blocked on desktop-idle / unassigned operator | D |

# INTEGRATED — already represented in current heads

Everything marked C above. Notably: SET→LIVE fusion, FIELD LAB 0.2 READ/LOCI convergence, LISTEN marks round-trip, REPLAY 0.2, INTERPHASE 0.2 + mapping laws, Lens real-use, Sleeper authority repair, ONE PRIMITIVE synthesis, hard-evolution P1–P3 proofs.

# UNINTEGRATED UNIQUE RESIDUE — genuinely still missing

1. kestrel visual-grammar residue: operator registry / `COMPRESS` absent from `fold-bloom/live/`; causal-witness scoring unserved; Suno correction line unapplied.
2. H-QA-01 (Sep-24) nav tap-target findings F1/F2 + local RETURN (`~/.hermes/state/fold-bloom-reentry/`); microfixes unapplied (F2 is a design judgment).
3. Archive-lane kernel extraction (`kernel/interphase-kernel.js`, second clone): **held** — INTERPHASE is user-protected and has other WIP.
4. codex worktree June snapshot: evidence only.
5. Sep-24 host-hygiene trio: WORKER_BOOT item closed by #246; sticky ones remain open (arxiv feed, `gemma4:e4b`, `hermes-runtime` archive).

# CONTRADICTIONS / DRIFT

1. `CURRENT.downstream` says "hermes: read-only … until explicit write authority", but Hermes-authored bounded PRs merged continuously (#208–#246) and this pass was explicitly authorized to land bounded branches/PRs. **Authority evolved; suggest a one-line `downstream` update on the next CURRENT touch (no CURRENT touch this pass).**
2. kestrel `NEXT.md` ("Hermes read-only; Codex writes") — same drift; superseded by practice.
3. Session-bootstrap surfaces stale: default-profile digest said "5 cron jobs / 3 populated boards" vs actual (1 job; boards as listed above).
4. wrangler 94→142 count bug: fixed at source (stderr warn); recorded as negative lesson.
5. `~/void-anchor` local master 187 behind origin — deliberate read-only checkout; writes go through fresh worktrees on new branches only.

# REUSABLE MECHANISMS / METHODS — evidence-backed candidates only

- `@session:<profile>/<id>` handle + `AXIS/reusable/session-wrangler.py` / `integrity-audit.py` — existing cross-session census + rot tools (reused this pass).
- `fb_reentry.py` deterministic re-entry packets (exit 0/10/2).
- **Stage-then-land**: byte-exact stage + RESUME + PR body; land when consent arrives (used for both integrations this pass).
- **Worker-authority contraction law** (#246): machine entry = stable pointers (`/llms.txt`) + transient JIT handoff; historical packets are non-runnable.
- Evidence classes + RETURN contract (ULTRA MASTER §18; `long-horizon-worker` skill).
- INTERPHASE host protocol (`lib/interphase-core.js` + hosts) — absorbed donor.

# NEGATIVE LESSONS — stop rediscovering

- `git add -A` with concurrent writers sweeps foreign WIP → use targeted paths.
- Silent exception swallowing in census tooling fabricates counts → warn, never return `[]` silently.
- Receipt-only churn is real (board refresh) — keep the surface, cull the cadence.
- Parallel enumerations duplicate each other (two census passes same day; two clones + a worktree) → one rendezvous + one wrangler.
- Approval timeouts while AFK are normal → stage exact artifacts; land on next consent.

# UNDERUSED EXISTING CAPABILITY

- `session-wrangler.py` / `integrity-audit.py` (built 09-24; just now being reused by two lanes).
- fb drift sentinel (default's only loop; change-gated, silent by design).
- `AXIS/library/` operator docs (CHEATSHEET / COLLAB-LOOPS / LOOPS / WORKFLOW / SYNC).
- `/llms.txt` machine entrypoint (#245/#246) — advertise to future workers.
- nexus board/map auto-refresh (verify human use).

# CURRENT WORLD/HUMAN GATES

See WAITING. These are the only true blockers; everything else is machine-executable.

# INTEGRATION CANDIDATES — post-pass, maximum two, NOT executed in this pass

1. fold-bloom nav tap-target microfix (lab/ink nav 11–23px tall on a 390px phone; test: undersized count → 0; collision-check against live fold-bloom lane first).
2. Suno correction one-liner in `control/confluence/FIELD_PULSE_2026-09-22.json` (pending exact replacement text from the kestrel lane).

# CROSS-SESSION ORIENTATION — first return (charter §22)

- COVERAGE: as above. CURRENT REALITY: master `012775db`; 0 open PRs at orientation (one appeared and merged as #247 mid-pass); active fronts = 2; heads = 11.
- SESSION MAP counts: LIVE/LIVE_UNIQUE 8 lanes · INTEGRATED (C) 6 groups · PARTIAL 2 · DONOR 4 · WAITING/D-blocked 3 · SUPERSEDED 5 · UNKNOWN 0.
- UNINTEGRATED UNIQUE WORK: the five residue items above.
- CONTRADICTIONS: the five drift items above.
- INTEGRATION OPPORTUNITIES (≤5): (1) this convergence landing (done) · (2) LH prompt landing (done as PR) · (3) nav microfix · (4) Suno line · (5) branch prune-list.
- HIGHEST-LEVERAGE ABSORPTION: reuse the existing wrangler tooling + this rendezvous instead of any new coordination layer; #246's law replaces the old "regenerate WORKER_BOOT" idea entirely.
- PROPOSED LIVE FRONTS (≤2): conversion + recovery-ingest (unchanged).
- GITHUB RENDEZVOUS: branch `hermes/cross-session-convergence-20260925`; draft PR (this); packet = this file; RETURN = `/returns/HERMES_CROSS_SESSION_RETURN_2026-09-25.json`.
- ONE NEXT: run ONE lived gate, or approve ONE local hygiene fix.
- STOP: no worker spawn (kestrel valid + active); no new architecture; do not touch live lanes or other PRs; no autonomous merge.

# RESTART PLAN — standing orchestration state

- **ONE orchestrator** (this default-profile session) owns: recovery · worker census · deduplication · integration routing · re-entry · bounded delegation · RETURN reconciliation. It does NOT own domain state, implementation, human authority, or master.
- **Workers (≤2):** (A) kestrel repo lanes — LIVE, CONTINUE (no replacement needed); (B) local machine maintenance (Hermes default, on-demand — the machine-executable items in NEEDS REVIEW).
- **New workers spawned this pass: NONE.** Kestrel remains valid and active; no old worker required replacement.
- Live fronts remain CURRENT's conversion + recovery-ingest. This pass adds no third front and removes none.

# FINAL CONVERGENCE RETURN (charter §23)

- **STATE:** CROSS-SESSION CONVERGENCE COMPLETE for the material field; no further recovery justified beyond the named residue; two clean fronts retained (conversion / recovery-ingest); old session authority retired into this rendezvous; durable GitHub rendezvous established; long-horizon execution resumes from CURRENT reality.
- **ABSORBED:** Sep-24 convergence RETURN (landed) · staged LH worker prompt (landed as PR) · wrangler tooling (in use).
- **INTEGRATED:** the C-labeled groups above.
- **SUPERSEDED / PARKED:** 57 not-in-master branches (prune-list candidate) · 42 closed PRs · codex June worktree (retained) · kernel residue (held).
- **DONORS PRESERVED:** H-QA-01 findings · kestrel visual-grammar residue · archive corpus work products.
- **NEGATIVE LESSONS:** listed above.
- **METHOD / SKILL CANDIDATES:** stage-then-land · worker-authority contraction law · wrangler handle protocol (already partly skill'd via `long-horizon-worker`).
- **GITHUB EVIDENCE:** this branch; commits; draft PR; CI (route-registration + public-surface-check run on PR).
- **PRIVATE RESIDUE:** local machine items tracked at `~/.hermes/state/cross-session-convergence-20260925/` and `AXIS/work/` (not in repo).
- **WAITING:** as listed.
- **NEW LIVE FRONTS (≤2):** conversion · recovery-ingest.
- **NEW WORKERS:** none; kestrel continues.
- **LONG-HORIZON RESTART:** orchestrator = this session; workers as above; re-entry via `/llms.txt` + CURRENT.
- **NEXT:** one lived gate, or one approved local fix.
- **STOP:** do not merge this PR autonomously; no new architecture; no re-archaeology; do not touch live lanes; no duplicate PRs.
