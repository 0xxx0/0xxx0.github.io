# ATLAS DAYLINE / LIVE CONVERGENCE — 2026-09-25

Status: implementation candidate + research/coordination packet. This is not a second authority.

## OBJECT

Turn Atlas Dayline Branch I from an isolated local planner into the human-visible execution membrane between the large FIELD and one actual day.

Preserve:

- Branch I local-first DayState.
- ATLAS ↔ PLAIN ablation.
- preview ≠ canonical state.
- RUN ≤ 3.
- interruption/resume.
- RETURN / replay / export / capsule.
- CURRENT and manifest remain repository authority.

Add only the missing seam:

FIELD (read-only) → explicit promotion → local Dayline action → lived evidence → COPY FEEDBACK → bounded repo/chat/agent continuation.

## IMPLEMENTED PROOF A — FIELD → DAYLINE

Opt-in URL: `/atlas-dayline/?live=1`.

LIVE reads `/control/CURRENT.json` with `cache:no-store`. It exposes ACTIVE fronts as candidates, never as automatic tasks. ADD copies one candidate into local DayState as `sourceClass=IMPORTED` with exact source reference, CURRENT date and provenance.

Human-use gates remain visible but are never auto-promoted. OPEN reaches the owning route.

Default `/atlas-dayline/` remains Branch I behavior.

## IMPLEMENTED PROOF B — DAYLINE → FEEDBACK

LIVE adds one-line CAPTURE and COPY FEEDBACK.

Feedback schema: `atlas-dayline-feedback/v0.1`.

It contains only the current Dayline focus/route, projection, focused task metadata, last RETURN, bounded recent evidence and recent events. It does not write to CURRENT, GitHub, Calendar, chat, or any agent. The user explicitly copies it out.

This is the intended in/out bridge for this stage: visible, inspectable, reversible.

## WHY THIS SHAPE

The existing engine already carries most of the difficult interaction work: scenario preview, route robustness, interruption resume, bounded RUN, ablation, RETURN and replay. Another planner would duplicate capability.

The missing capability is lawful I/O.

Recent research is donor evidence, not authority:

- He, Demartini & Gadiraju, CHI 2025, “Plan-Then-Execute”, DOI 10.1145/3706598.3713218 — visible planning/execution structure matters for trust and team performance.
- Chen et al., CHI 2025, “Need Help? Designing Proactive AI Assistants for Programming”, DOI 10.1145/3706598.3714002 — proactive assistance benefits from a shared workspace and careful timing/design.
- Zheng et al., NATURAL PLAN, arXiv:2406.04520 — realistic calendar/meeting planning remains difficult even with full tool context.
- Li et al., PEARL / CalConflictBench, arXiv:2601.11957 — long-horizon preference-sensitive calendar conflict resolution remains error-prone; persistent preference memory can help but should not silently decide for the user.
- Chen et al., Psychiatry Research 2015, DOI 10.1016/j.psychres.2015.01.011 — implementation intentions improve prospective-memory performance; Dayline should bind work to cues/contexts rather than merely store items.
- interruption review PMID 21946236 and Bahnsen et al., CHI 2024 DOI 10.1145/3613904.3642666 — resumption cues reduce reconstruction cost after interruption.

## MULTIPRONG PROGRAM

### LANE 1 — LIVED USE / PRODUCT

Run real work through LIVE for several episodes.

Measure only:

1. time from opening Dayline to first committed action;
2. number of FIELD candidates inspected before one is added;
3. whether RUN stays ≤3 without manual cleanup;
4. resume latency after interruption;
5. whether RETURN contains enough evidence to decide the next move;
6. whether COPY FEEDBACK is actually usable in ChatGPT/Codex/Hermes without re-explaining the day.

Promotion gate: retain LIVE only if it reduces re-entry/control hunting or turns at least one FIELD front into a world consequence.

### LANE 2 — CALENDAR / TIME ADAPTER

Do not embed OAuth or create a second calendar store.

Research/implement a bounded adapter only after LIVE proves useful:

`calendar events → immutable anchors → Dayline`

and, separately, only with explicit user action:

`Dayline selected commitment → proposed calendar mutation → preview → commit → receipt`.

The adapter must preserve provider event identity and distinguish plan from actual outcome.

### LANE 3 — LONG HORIZON

Do not stretch one-day DayState into a giant backlog.

The long horizon should compile into the day:

`FIELD objects / commitments / dependencies → candidate horizon projection → explicit selection → today's DayState`.

Experiment with DAY / WEEK / LATER only as unequal projections over stable identities. No duplicate task authority.

### LANE 4 — RESEARCH / COUNTEREXAMPLES

Attack the instrument, not merely enrich it.

Questions:

- Does spatial ATLAS beat PLAIN on real re-entry/action, or only feel richer?
- Does proactive surfacing help, or create attentional noise?
- Which source classes deserve Dayline promotion?
- Are time windows more useful than context/event cues for this user?
- When should the system deliberately show nothing?
- What evidence justifies automating calendar mutation?
- Which preferences are stable enough to remember, and which must stay episode-local?
- Can one RETURN packet support reliable replanning without reopening the whole collaboration archive?

## OTHER-SESSION / CODEX PACKET

Recover first:

- `/AGENTS.md`
- `/llms.txt`
- `/control/CURRENT.json`
- `/showcase-manifest.json`
- `/atlas-dayline/`
- this packet

Then choose exactly one bounded lane.

Required output:

`DELTA → FILES → TEST → OBSERVED RESULT → RESIDUE → RETURN`

Do not:

- create a new planner core;
- create a second CURRENT/queue;
- auto-import WAITING;
- auto-write Calendar/GitHub;
- add a generic agent/session bus;
- replace Atlas Dayline identity;
- infer that research evidence proves usability.

## COORDINATION NOTE / RED FLAG

At master commit `3d87f711c1dcac3945e16ece3807718e9f8d83e9`, `/nexus/board.html` reports several “active” Hermes branches whose Latest field is actually `fatal: ambiguous argument ...`. Treat those rows as coordination telemetry failure, not evidence that the listed branches are healthy. Repair the board generator separately; do not make Atlas depend on it.

## STOP CONDITION

Stop architecture work after this bridge.

Next evidence must come from either:

- actual LIVE use;
- a bounded calendar-anchor adapter;
- a concrete counterexample that breaks identity / explicit promotion / RETURN.

Anything else returns to HOLD.
