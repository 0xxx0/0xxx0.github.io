# SOURCE → HOLD → TURN → TRACE → RETURN

Status: OPERATIONAL PROTOCOL 0.1  
Updated: 2026-10-02T20:06:00+08:00  
Role: bounded execution grammar over existing host-owned state. **Not** a new ontology, queue, planner, store, router, or effect authority.

## The rule

```
SOURCE → HOLD → TURN → TRACE → RETURN
```

Use it when work should produce **one bounded real delta** instead of another layer of planning.

The protocol compresses the existing FIELD / INTERPHASE laws:

- SOURCE identifies the exact thing and its owner.
- HOLD freezes one focus and exposes at most three lawful native moves.
- TURN selects and performs exactly one bounded native move.
- TRACE records what actually happened, including failure or uncertainty.
- RETURN closes the move with evidence, residue, and an exact re-entry address.

**TURN may cross a native RELEASE/commit boundary, but only explicitly.**  
The shared protocol never manufactures host support, permission, or effect authority.

---

## One-page operational table

| Stage | Entry condition | Do | Exit condition | Fail closed when | Concrete example from this repo |
|---|---|---|---|---|---|
| **SOURCE** | There is a request, observation, artifact, route, file, message, device event, or world fact worth acting on. | Resolve the exact object: owner, stable address/id, provenance, current state source, and return address. | One exact source object is named; owner and provenance are known; ambiguity that would change the action is either resolved or explicitly marked UNKNOWN. | No trustworthy owner/address/provenance exists, or two candidate objects would lead to different actions. Do not guess; CAPTURE/UNRESOLVED instead. | The architecture turn began from the actual stale `/nexus/map.html`, current `/control/CURRENT.json`, and `/showcase-manifest.json` — not from a remembered diagram. |
| **HOLD** | SOURCE is exact enough to act on. | Hold **one** object/focus. State the desired delta. Expose only 1–3 host-supported moves, their authority, target, reversibility, and commit boundary. No mutation yet. | One focus is stable, one move can be selected deliberately, and exact RETURN is known. | The task silently expands into several objects, the move owner is unclear, or the next action requires invented authority. | Held object: `/nexus/map.html`. Desired delta: make the map truthful/current and reachable without enlarging the FIELD primary surface. Moves were bounded to map update, latent root link, manifest/receipt alignment. |
| **TURN** | HOLD names one selected lawful move and its native owner. | Execute **one bounded move** through the native host. Preview first where available. If it mutates/effects reality, cross RELEASE/commit explicitly. Do not begin a second move because the first “went well.” | Native operation returns one of: changed, unchanged, failed, blocked, or unknown. Scope touched is known. | Preconditions fail, authority is missing, target moved, verification assumptions changed, or the move would require an unbounded migration. Stop; do not improvise a substitute project. | Updated the existing map in place, exposed it under FIELD footer MORE, aligned its manifest record, and wrote one RETURN receipt. No new dashboard or central store was created. |
| **TRACE** | TURN has returned or stopped. | Observe consequence. Separate **observed** from **derived/inferred**. Record touched objects, before→after delta, checks, evidence refs, unknowns, and any irreversible boundary crossed. | There is enough witness to say what changed and what remains unproved. Unknowns are explicit. | Evidence is only intention, prose, screenshot, or model belief for a behavior claim. Mark UNPROVED/UNKNOWN instead of promoting. | Re-fetched committed files; checked map contains all required nodes, root links to it, manifest resolves it, and receipt exists. CI had no attached run yet, so live-render/CI proof remained unclaimed. |
| **RETURN** | TRACE exists, even if the TURN failed or was a no-op. | Emit the smallest durable closure: result status, observed delta, evidence refs, residue/lesson, unresolved gate, exact return/re-entry address. Then release the focus. | Another person/model can resume without reconstructing intent, authority, evidence, or next gate. Attention may now be replanned. | Closure omits evidence/unknowns, rewrites source truth, auto-promotes a next task, or treats a receipt as proof beyond what was observed. | `/returns/SYSTEM_MAP_CONVERGENCE_2026-10-02.json` records before/after/evidence/residue; the map returns to FIELD at `/`. |

---

## Minimal working packet

A human or coding worker should be able to operate from this:

```text
SOURCE
object: <stable id/address>
owner: <native authority>
provenance: <where this truth came from>

HOLD
focus: <one exact thing>
desired_delta: <observable before → after>
moves:
  1. <native move> [VIEW/NAVIGATION/EDIT/EFFECT/OFFER]
  2. <optional>
  3. <optional>
return_to: <exact address>

TURN
selected_move: <one move only>
commit_boundary: <NONE | NAVIGATION | RECEIVER_ACCEPTS | HOST_NATIVE | ...>
reversibility: <exact undo/return or HOST_DEFINED>

TRACE
status: <CHANGED | UNCHANGED | FAILED | BLOCKED | UNKNOWN>
observed_delta: <what actually changed>
evidence: [<refs/checks>]
unknowns: [<things not proved>]

RETURN
residue: <code/artifact/measurement/lesson/options unlocked>
unresolved_gate: <none or exact gate>
return_to: <exact re-entry address>
```

## Human fast path

For ordinary use, this is enough:

1. **SOURCE — what exact thing am I touching?**
2. **HOLD — what one change am I trying to make?**
3. **TURN — do one lawful move.**
4. **TRACE — what actually happened?**
5. **RETURN — keep the evidence/lesson and release it.**

If step 1 or 2 cannot fit in one short sentence, do not execute yet.

## Coding-model / worker instructions

1. Boot with `/AGENTS.md` and `/llms.txt`; recover only the selected object's needed depth.
2. Do **not** start from “what can I build?” Start from SOURCE and host ownership.
3. HOLD exactly one object. Candidate moves must be **≤3** and native-host-supported.
4. Before mutation, state the selected TURN, authority class, target, and reversibility.
5. Execute one bounded TURN. For EFFECT/mutation, use the native commit path; shared verbs never dispatch effects.
6. TRACE with machine checks first: static invariants, pure tests, replay/synthetic fixtures, browser/public-route checks where applicable.
7. Distinguish:
   - **OBSERVED:** directly measured/read from authoritative result.
   - **DERIVED:** deterministic interpretation from observed state.
   - **UNKNOWN:** not actually tested / human-device-world gated.
8. RETURN even on failure/no-op. A failed TURN may still return a useful blocker, falsifier, or residue.
9. After RETURN, **re-read CURRENT before taking another consequential move**. No second move inherits authority.
10. If no lawful high-value move exists, stop with `NO_LAWFUL_HIGH_VALUE_MOVE`. Do not forage for substitute work.

### Repository verification default

For code changes, prefer:

```sh
node tools/ship-check.mjs --fast
```

Then run the smallest feature-specific selftest. Do not claim CI, browser, device, human, or world proof unless it actually ran.

## Copy/paste block for coding models

```text
SOURCE → HOLD → TURN → TRACE → RETURN

SOURCE
- Resolve exactly one object + native owner + provenance + before-state + desired delta + return address.
- STOP UNRESOLVED_SOURCE if ambiguity would change the action.

HOLD
- Freeze one focus.
- Expose ≤3 host-supported moves; select exactly one.
- Predeclare acceptance checks, commit boundary, reversibility, and RETURN address.
- STOP WAITING_HUMAN_WORLD if the next material claim requires irreducible human/device/world evidence.

TURN
- Execute exactly one native operation.
- EFFECT requires explicit host-native RELEASE/commit.
- Never start a second “while here” improvement.

TRACE
- Run machine-verifiable checks first.
- Label material claims OBSERVED / DERIVED / UNKNOWN.
- Outcome is PASS / FAIL / INDETERMINATE; missing evidence never becomes PASS.
- Preserve TRACE_FAIL / TRACE_INDETERMINATE instead of upgrading the claim.

RETURN — ALWAYS, including failure/no-op
result_status: CHANGED | UNCHANGED | FAILED | BLOCKED | UNKNOWN
source_object: <stable id/address>
host: <native authority>
turn_ref: <commit/effect/result id>
before: <relevant pre-turn state>
after: <observed post-turn state or null + unknown>
observed_delta: <observed, not intended, difference>
evidence_refs: [<exact refs>]
residue: <reusable artifact/measurement/lesson/options>
unknowns: [<unproved claims>]
unresolved_gate: <null | exact remaining gate>
return_address: <exact re-entry address>
closed_at: <timestamp>
next_authority: NONE

STOP: UNRESOLVED_SOURCE | WAITING_HUMAN_WORLD | TURN_UNSUPPORTED | TURN_REJECTED |
      TRACE_FAIL | TRACE_INDETERMINATE | NO_LAWFUL_HIGH_VALUE_MOVE | RETURN_COMPLETE

After RETURN: release focus; re-read CURRENT before any consequential next move.
```

## Complete worked repository run

This is a real bounded protocol refinement, not a hypothetical.

**SOURCE**

```text
object_id: 0xxx0/source-hold-turn-trace-return/v0.1
owner: 0xxx0/0xxx0.github.io protocol package
before refs:
  control/SOURCE_HOLD_TURN_TRACE_RETURN.md
    blob 2195bab0119f302c8e3ad2c0f8cc773cc21bb004
  control/SOURCE_HOLD_TURN_TRACE_RETURN.json
    blob b7de20ed85ce8cbe1a6d44c7b05f6661c0a31671
  tools/source-hold-turn-trace-return-selftest.mjs
    blob bb91f5aabba6b6c306c7c65639a83c69ae1ef65a
desired_delta:
  exact RETURN fields + one copyable coding-model block + a worked run
return_to:
  /control/SOURCE_HOLD_TURN_TRACE_RETURN.md
```

**HOLD**

```text
focus: existing protocol package only
candidate moves:
  1. extend machine contract
  2. mirror exact instructions in human docs
  3. tighten existing selftest
selected TURN:
  one Git commit touching only those three facets
acceptance:
  JSON parses
  stage order unchanged
  exact 14-field RETURN schema present
  compact block has ≤3 HOLD, one TURN, tri-state evidence, stop conditions, NEXT=NONE
  selftest asserts additions
  commit diff touches only declared files
reversibility:
  git revert <TURN commit>
```

**TURN**

Commit the three declared facets as one Git mutation. No FIELD, Dayline, queue, route, host operation or authority changes.

**TRACE**

Re-fetch the files from master, parse the JSON, run the contract assertions, inspect the TURN commit diff, and distinguish local/static proof from any CI/browser/device evidence that did not actually run.

**RETURN**

Closure is written at:

`/returns/SOURCE_HOLD_TURN_TRACE_RETURN_WORKED_RUN_2026-10-02.json`

The receipt carries the actual TURN commit SHA, before/after refs, checks, unknowns, re-entry address, and `next_authority: NONE`.

## Non-equivalences

These stay distinct:

```
SOURCE ≠ SEARCH RESULT
HOLD ≠ LOCK / COMMIT
TURN ≠ EFFECT
TURN(EFFECT) requires explicit RELEASE/commit
TRACE ≠ PROOF unless evidence supports the claim
RETURN ≠ BACK
RETURN ≠ UNDO
RETURN ≠ NEXT
RECEIPT ≠ SUCCESS
UNKNOWN ≠ FAIL
```

## Stop conditions

Stop before TURN when:

- source identity is ambiguous in a consequence-changing way;
- host/authority is unclear;
- exact RETURN is missing;
- more than three “next” moves are required just to understand the action;
- the proposed change creates a parallel store/router/dashboard/core without a demonstrated missing function;
- the move depends on a human/device/world property that cannot be simulated and no bounded preparation directly improves that gate.

Stop after RETURN. Replan from current truth.
