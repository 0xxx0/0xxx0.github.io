# EFFECT SPAN — microlog / non-binding hypothesis

**Status:** HYPOTHESIS · NON-BINDING · DELETE IF UNPROVEN  
**Date:** 2026-10-03  
**Purpose:** record one cross-surface correspondence without creating a new framework, route, queue, authority layer, or ontology.

## Observation

Several independently built parts of the repo now converge on the same world-effect geometry:

1. `lib/interphase-carrier.js` forecasts a move before effect: authority, side effect, dispatch owner, source mutation, reversibility.
2. `control/INTERACTION_SEMANTICS.json` requires explicit authority + durable evidence for irreversible world actions and distinguishes `UNDO`, `REWIND`, `REVERT`, and `RETURN`.
3. `lib/field-convergence-adapter.js` keeps outward handoff `PROPOSAL_ONLY`; its return envelope is `EVIDENCE_ONLY` and ends in `NONE_UNTIL_REPLAN`.
4. `fold-bloom/two-dial/core1.js` already carries a causal receipt shaped as `before / operation / actor / driver / delta / after / provenance` into proof and RETURN.
5. `lib/field-egress-reducer.mjs` does not trust returned material blindly; it reduces it to `DELTA`, `RESIDUE`, or `NOOP`.
6. COMMS transport work in PR #828 independently enforces `NO_SEND candidate → explicit HUMAN_RELEASE → exact provider receipt → EVIDENCE_ONLY RETURN`.

These are unequal native implementations. Do **not** make them share dispatch authority or a universal state model.

## Candidate invariant

A world-changing move is better treated as a bounded **effect span** than as an action button:

```text
FORECAST → RELEASE → EFFECT → WITNESS → REDUCE
   HOLD      TURN       —       TRACE      RETURN
```

The only potentially shared datum is a causal join between the pre-effect proposal/release and the post-effect witness/return.

## Minimal laws

1. **No world effect without an admissible return shape.** Before an irreversible effect is released, the caller should know what evidence could later prove, disprove, or leave it indeterminate.
2. **Authority is not inferred from evidence.** A RETURN can inform a native reducer; it cannot mint forward authority.
3. **Authority widening is explicit.** `VIEW/INSPECT/PROPOSE/NO_SEND` may become effect authority only at an explicit release gate owned by the relevant human/native host.
4. **One release addresses one exact effect.** Payload, target, operation, and relevant source identity are bound; retries, edits, forwarding, or sibling effects require new authority.
5. **Witnesses are causal, not merely current-state snapshots.** Prefer evidence that can answer: what was before, what operation occurred, who/what drove it, what changed, what followed, and where the evidence came from.
6. **Native reconciliation remains native.** The receiving surface decides `DELTA / RESIDUE / NOOP`, `COVERED / DEFERRED / OPEN`, or its own equivalent.
7. **Residue survives.** Missing, conflicting, stale, or weak evidence remains residue; it is not coerced into success.
8. **Irreversible correction is a new effect.** Use `REVERT`/compensation linked to the original release. Never label an external irreversible correction as `UNDO`.

## What this is not

- not a global event bus
- not a workflow engine
- not a shared dispatcher
- not a universal domain schema
- not an autonomous retry queue
- not a new public route
- not permission for FIELD/INTERPHASE to own native effects

## Smallest useful join

If a live consumer eventually needs it, test a content-addressed span identity such as:

```text
span_id = hash(source_identity + operation + target_identity + payload_digest + release_identity)
```

A later witness may reference that `span_id` plus its own evidence digest. The join proves *which released effect the evidence is about*; it does not prove the effect succeeded.

A native reducer still evaluates the witness.

## First real experiment

Use the COMMS seam because it already has a concrete external boundary:

1. Build one exact outbound response from an addressed COMMS source.
2. Produce a `NO_SEND` candidate.
3. Explicitly release one exact destination + response digest.
4. Perform the send through the external provider.
5. Import a provider receipt tied to the exact release/source/response digest.
6. Produce `EVIDENCE_ONLY / SENT_CONFIRMED` RETURN.
7. Confirm native COMMS state remains unchanged until the human/native COMMS reducer chooses what that evidence means.
8. Only then ask whether the same causal-join helper cleanly serves a second live effect seam (HOUSE is the likely adversarial case because physical state can diverge after command acknowledgement).

## Promotion gate

Promote any shared helper only if all are true:

- at least **two live consumers** need the same join;
- each retains native authority and reconciliation;
- the helper can be specified with stable I/O and no hidden globals;
- tests prove mismatched/stale/replayed witnesses cannot attach to the wrong release;
- extraction deletes more duplicated ambiguity/code than it adds;
- one concrete failure mode becomes easier to diagnose because of it.

Otherwise keep the implementations local.

## Delete gate

Delete this microlog if the next concrete world-effect seam requires materially different authority/evidence semantics, or if a causal join does not improve diagnosis, reversal, or return.

## Working compression

```text
HOLD addresses possibility.
RELEASE grants one bounded effect.
TRACE witnesses what actually happened.
RETURN carries evidence, not authority.
REVERT is a new move when reality cannot be undone.
```

The desired convergence is therefore not **one system that does everything**. It is **many native effectors that can prove exactly what crossed each boundary and return without lying about authority**.
