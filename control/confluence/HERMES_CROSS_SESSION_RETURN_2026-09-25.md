# HERMES CROSS-SESSION CENSUS RETURN — 2026-09-25

## Evidence class

**REPORTED / LOCAL HERMES CENSUS.** The counts and local-runtime findings below were produced by a Hermes cross-session pass against local session stores, crons, branches and worktrees. They are useful evidence, but they are **not repository authority** and were not independently re-measured by this PR.

Current repository authority remains:

`/llms.txt → AGENTS.md → CURRENT / QUEUE / manifest / WAITING`.

## What survived the convergence pass

The pass reported:

- 9 Hermes profiles enumerated;
- 374 sessions since 2026-09-18, with ~130 in its three-day live window;
- 56 enabled cron jobs across the enumerated profiles;
- 256 remote branches triaged, including 57 then not in master;
- 15+ sessions read in depth.

Those numbers are retained as a dated census, not as permanent current state.

## Already absorbed elsewhere

The pass identified worker-state drift as a major problem. That function has since been resolved more strongly by:

- **#246** — stale `WORKER_BOOT` snapshot retired; `/llms.txt` + transient JIT handoff own machine re-entry;
- **#247** — disposable Hermes daily prompts now begin from live authority and understand WAITING v0.2;
- **#248** — App Atlas 0.2 projection synchronized.

No additional cross-session “master charter” is needed to own those functions.

## Unique residue worth retaining

These were reported by the local pass and remain useful only as **triggers for verification**, not automatic work:

1. Fold/Bloom phone nav tap targets may be undersized on a 390px viewport.
2. Local `arxiv-alignment-feed` reportedly fails with HTTP 406.
3. Operator profile reportedly contains duplicated cron entries and a Crew Pulse connection failure.
4. ~57 remote branches were then not in master; a prune candidate list may be prepared, but branch deletion is a separate authority boundary.
5. Kestrel reported unintegrated Fold/Bloom residue: operator-registry/COMPRESS, causal-witness scoring and one Suno correction.
6. A second local clone / INTERPHASE kernel extraction was explicitly held; do not merge it by resemblance.

Every item above must be re-verified at its owning surface before mutation.

## Mechanism-extractor test on the proposed “long-horizon worker”

**Instances**

- #246 worker-authority contraction.
- #247 daily live-authority generator.
- This cross-session census/reconciliation pass.

**Invariant**

`LIVE AUTHORITY → bounded selection → exact evidence → one reversible move → VERIFY → RETURN → REPLAN`

with historical/session material treated as donor evidence rather than current state.

**Non-example**

A dated, multi-hundred-line master prompt installed as a new cold-start authority.

**Failure mode**

Context expansion and duplicate sovereignty: the worker starts from copied doctrine rather than the current owners.

**Second-context test**

The invariant survived both repository worker boot (#246) and generated daily context (#247) without requiring a new state store.

**Disposition**

**PARKED / NO NEW SKILL.** The invariant is already represented more compactly by AGENTS, `/llms.txt`, HERMES_QUEUE, the JIT transcript and existing method skills. PR #250 is therefore donor history, not a current boot surface.

## Current use

This file is a **dated evidence packet**. It does not establish NOW, queue priority, permission, or worker ownership.

The strongest machine-executable residue from the pass is the Fold/Bloom phone navigation claim because it can be checked against the current runtime without human/private state. That claim should either produce one bounded usability fix or be rejected.

## RETURN

- **STATE:** cross-session evidence preserved without a new charter.
- **DELTA:** unique local census/residue retained; stale authority proposal removed.
- **EVIDENCE:** this packet + machine JSON + PR #249 history.
- **RESIDUE:** six verification triggers above.
- **ONE NEXT:** verify one current product-facing residue, preferably the Fold/Bloom phone nav target claim.
- **STOP:** no standing rendezvous, master prompt, new scheduler, or ambient archaeology is created here.
