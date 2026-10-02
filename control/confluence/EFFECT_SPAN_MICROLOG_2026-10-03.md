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

## Adversarial check — HOUSE

HOUSE sharpens rather than falsifies the hypothesis.

Its design trial already separates `before → intervention → verify → after → decision`, and imported fit material remains evidence-only. Its runtime witness independently classifies snapshot freshness instead of treating historical state as live truth.

Therefore a physical effect cannot collapse into one generic receipt:

```text
COMMAND ACCEPTED ≠ PHYSICAL STATE OBSERVED ≠ INTENDED CONDITION VERIFIED
```

One effect span may accumulate multiple **unequal witnesses** bound to the same `span_id`. Each witness must state the narrow claim it can support. A command acknowledgement can support “host accepted command”; telemetry may support “device reported state”; a fresh sensor/human observation may support “physical condition observed”. None automatically promotes the others.

This yields an important refinement:

> Bind evidence to the released effect, but let the native reducer decide which claim that evidence is sufficient to establish.

Do not create a universal witness ladder. Different domains may require different witness classes, freshness limits, independence rules, or verification thresholds.

## First real experiment

Use the COMMS seam because it already has a concrete external boundary:

1. Build one exact outbound response from an addressed COMMS source.
2. Produce a `NO_SEND` candidate.
3. Explicitly release one exact destination + response digest.
4. Perform the send through the external provider.
5. Import a provider receipt tied to the exact release/source/response digest.
6. Produce `EVIDENCE_ONLY / SENT_CONFIRMED` RETURN.
7. Confirm native COMMS state remains unchanged until the human/native COMMS reducer chooses what that evidence means.
8. Only then test a second live effect seam where acceptance and observation diverge; HOUSE is the adversarial case.

## External cross-check — 2026-10-03

Cursory review of extant systems supports the decomposition, but no surveyed system should be copied wholesale.

### 1. Event identity / transport — CloudEvents

CloudEvents gives a deliberately small envelope: producer-scoped `source + id`, `type`, optional `subject`, `time`, schema and payload. It explicitly allows one occurrence to produce multiple events and uses repeated `source + id` for duplicate detection.

**Steal:** keep transport identity and domain payload separate. A witness event may have its own event identity while still linking to one effect span.  
**Do not steal:** event identity alone as causal proof. CloudEvents explicitly leaves richer correlation to extensions/application data.

Reference: https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md

### 2. Trace topology — OpenTelemetry

OpenTelemetry spans support **Links** to other span contexts, including spans in different traces. This is a better donor than strict parent/child nesting for unequal witnesses: a provider receipt, sensor observation and human observation can independently link to the same release without pretending one caused the other.

**Steal:** a DAG-like causal projection: `release ← link — witness`, potentially many witnesses per release.  
**Do not steal:** observability as verification. A trace says an operation was observed/instrumented, not that a domain claim is true.

Reference: https://opentelemetry.io/docs/specs/otel/trace/api/

### 3. Durable execution — Temporal / Restate / DBOS

These systems converge on journaling/checkpointing, replay and idempotency identities. Temporal recommends idempotent Activities because an Activity can be retried if completion was not recorded. Restate journals operations/results and can deduplicate invocations with idempotency keys. DBOS workflow IDs act as idempotency keys; DB transactions can be exactly-once while external steps remain retry-sensitive.

**Steal:** make retry semantics first-class on an effect release. Candidate vocabulary:

```text
NO_RETRY              external irreversible / ambiguous effect
SAME_RELEASE_SAFE     native operation is proven idempotent under the same key
OBSERVE_AGAIN         observation may repeat; effect may not
NEW_RELEASE_REQUIRED  retry would be a new effect and needs fresh authority
COMPENSATE            correction is a separately authorized REVERT
```

**Do not steal:** automatic retry as a default for world effects. Durable execution solves continuation; it does not establish that repeating an external effect is safe.

References:
- https://docs.temporal.io/activity-definition
- https://docs.restate.dev/foundations/key-concepts#durable-execution
- https://docs.dbos.dev/python/tutorials/workflow-tutorial

### 4. Bounded authority — OAuth RAR / Macaroons / Biscuit

OAuth Rich Authorization Requests encode fine-grained authorization details rather than only broad scopes. Macaroons attach contextual caveats. Biscuit is especially interesting: attenuation blocks can add restrictions but cannot extend authority.

**Steal:** RELEASE should be monotonically bounded: exact operation, exact target, exact payload digest, optional expiry/context. Delegation may narrow it; nothing downstream should silently widen it.  
**Do not steal:** a bearer token as proof that an effect happened. Authorization and evidence remain different planes.

References:
- https://www.rfc-editor.org/rfc/rfc9396.html
- https://research.google/pubs/macaroons-cookies-with-contextual-caveats-for-decentralized-authorization-in-the-cloud/
- https://doc.biscuitsec.org/reference/specifications

### 5. Claim-shaped evidence — in-toto / SLSA / Sigstore / SCITT

This is the closest external family to the witness side. in-toto/SLSA separate a statement's **subject** from its typed **predicate/claim**. Sigstore/Rekor provides append-only transparency for signed metadata. SCITT (RFC 9943) is even more explicit: a signed statement becomes transparent by attaching a registration receipt, but transparency does not make a dishonest issuer truthful. COSE Receipts (RFC 9942) distinguish proof types such as inclusion, consistency and freshness.

**Steal:** every witness should state *which claim type it can support*. A receipt proving registration/acceptance must not be interpreted as proof of downstream physical/result state. Optional cryptographic receipts can strengthen binding without changing the claim's semantics.  
**Do not steal:** supply-chain ontology or a mandatory global transparency service.

References:
- https://in-toto.io/docs/specs/
- https://slsa.dev/spec/v1.2/provenance
- https://docs.sigstore.dev/logging/overview/
- https://datatracker.ietf.org/doc/rfc9943/
- https://datatracker.ietf.org/doc/rfc9942/

### 6. Contemporary agent/tool protocols — MCP / A2A / agent tracing

MCP now exposes tool-behaviour annotations such as `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint`; importantly they are behavioural hints, not a security mechanism. MCP Tasks provides durable task handles, polling, cancellation and deferred results. A2A separates task lifecycle/status, messages and output artifacts and warns that messages are not a reliable mechanism for critical information. Modern agent SDK tracing records tool calls, handoffs and guardrails.

**Steal:** FORECAST metadata should expose read/write, destructive, idempotent and open-world characteristics before release. Keep task status separate from result evidence.  
**Do not steal:** `COMPLETED` as proof of domain success; or tool annotations as authorization.

References:
- https://ts.sdk.modelcontextprotocol.io/v2/api/%40modelcontextprotocol/server/server/mcp.html
- https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks
- https://a2a-protocol.org/dev/specification/
- https://openai.github.io/openai-agents-python/tracing/

## Cross-check synthesis

The strongest composition suggested by the survey is not a new orchestrator. It is a tiny junction of already-proven ideas:

```text
attenuated capability     → RELEASE authority
idempotency identity      → effect/retry identity
trace/link identity       → causal correlation
claim-typed attestation   → WITNESS semantics
native reducer            → consequence / residue / next move
```

Or, compressed:

```text
PROOF-CARRYING EFFECT SPAN
= bounded authority
+ exact effect identity
+ explicit retry semantics
+ claim-scoped unequal witnesses
+ native reconciliation
```

### Candidate shape — still non-binding

```text
span_id
release:
  source_id
  operation
  target_id
  payload_digest
  authority_digest
  retry_semantics
claims_expected[]:
  claim_type
  verifier_owner
  freshness_rule?      # domain-owned
witnesses[]:
  witness_id
  span_id
  claim_type
  issuer
  observed_at
  evidence_digest
  proof_ref?
```

Intentionally absent: a universal `success` field.

The native host may derive success, failure, residue, coverage or any domain state from the witnesses. The join itself should never do so.

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
