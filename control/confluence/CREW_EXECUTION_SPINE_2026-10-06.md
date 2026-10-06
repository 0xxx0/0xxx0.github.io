# CREW EXECUTION SPINE — 2026-10-06

Status: **COMPILED FROM CURRENT MASTER / NO NEW AUTHORITY**  
Purpose: one recoverable map from ordinary human intent to the existing executable crew seam. This note adds no queue, planner, memory, actor authority, NEXT authority, route, or state store.

## WHERE THIS IS

The system is already implemented. The canonical pieces are:

- worker/authority law — `/AGENTS.md`
- machine front door — `/llms.txt`
- bounded execution law — `/control/SOURCE_HOLD_TURN_TRACE_RETURN.json`
- human/worker operating notes — `/control/SOURCE_HOLD_TURN_TRACE_RETURN.md`
- contributor envelope + minimum 10-leaf projection — `/control/SUBMISSION_CONTRACT.json`
- stateless crew compiler — `/lib/field-crew-handoff.mjs`
- single broad machine entrypoint — `node scripts/emit-agent-transcript.mjs`
- exact-object staging helper — `node tools/field-stage-handoff.mjs`
- contract proof — `node tools/source-hold-turn-trace-return-selftest.mjs`
- machine/crew surface proof — `node tools/field-machine-reducer-selftest.mjs`
- exact-object staging proof — `node tools/field-stage-handoff.mjs --selftest`

`/control/WORKER_BOOT.json` is compatibility history, not live crew state.

## ONE LAW

```text
SOURCE → HOLD → TURN → TRACE → RETURN
```

Crew members do **not** synchronize internal state. They synchronize one addressed object, one bounded intended delta, at most three lawful move offers, evidence pointers, and exact RETURN.

The useful identity law is:

```text
same object > shared internal state
```

Human, ChatGPT, Codex, Hermes, or a future worker may differ internally. Continuity survives if the addressed object, native owner, move boundary, evidence, unresolved gate, and RETURN survive.

## SMALLEST EXECUTABLE PACKET

Once the object + native owner are known, use the existing `field-crew-turn/v0.1` projection:

```text
source  { object, owner }
hold    { delta }
turn    { move, release }
trace   { status, result, evidence[] }
return  { gate, to }
```

Ten leaf fields. No `actor`. No `next`.

Invariants:

1. `source.object` is immutable end-to-end. A different object requires a fresh SOURCE.
2. `source.owner` is native authority, never the current crew identity.
3. `hold.delta` names one observable change/question; it is not priority.
4. `turn.move` is exactly one operation. A second operation requires RETURN then a fresh HOLD.
5. `turn.release = NONE` unless the native host exposes the exact commit/RELEASE boundary.
6. `trace.status` is `CHANGED | UNCHANGED | FAILED | BLOCKED | UNKNOWN`; evidence supports behavioral claims.
7. `return.gate` preserves an unresolved human/device/world/policy/evidence boundary without occupying NOW.
8. RETURN closes authority. No next move inherits permission.

Human shorthand already defined by the submission contract:

```text
@<object> [owner:<owner>] Δ <delta> → <move> / release:<boundary> → <status>: <result> [evidence] ↩ <to> [gate:<gate|null>]
```

## USE IT NOW

### A. Human says what they want

The human does not maintain FIELD schema. The worker owns translation:

```text
natural language
→ recover exact object + owner
→ choose L0 DIRECT / L1 COMPILE / L2 DEEP
→ continue lawful non-effect work
→ interrupt only at a real PING / CHOOSE / WORLD_RETURN
→ TRACE
→ exact RETURN
```

Do not ask the human to restate information recoverable from native sources.

### B. Exact object is already known

One command resolves the existing route/head, derives at most three manifest-declared OFFER moves, carries the CURRENT human gate, and emits the canonical crew handoff:

```sh
node tools/field-stage-handoff.mjs --source /docs/
```

Structured:

```sh
node tools/field-stage-handoff.mjs --source /docs/ --json
```

Deliberately select one offered move:

```sh
node tools/field-stage-handoff.mjs --source /docs/ --select <move-id> --json
```

Unknown/ambiguous objects fail closed. Selection never grants EFFECT authority.

### C. Source/object is unresolved or provenance/classification matters

Use `/control/SUBMISSION_CONTRACT.json`, then compile it through the canonical machine entrypoint:

```sh
node scripts/emit-agent-transcript.mjs --handoff <submission.json>
node scripts/emit-agent-transcript.mjs --handoff <submission.json> --json
```

The result is transient `field-crew-handoff/v0.1`, authority `NONE / TRANSIENT HANDOFF ONLY`.

### D. Crew mate needs current orientation before choosing an object

```sh
node scripts/emit-agent-transcript.mjs --crystal --json
```

CRYSTAL is a compressed read, not a task store. Stored packets do not self-authorize NOW.

## HUMAN GATE

The crew compiler normalizes interruption need to:

- `NONE` — continue otherwise-lawful work; do not interrupt just because a stage exists.
- `PING` — one lightweight acknowledgement materially chooses continuation.
- `CHOOSE` — preference/framing/adoption/decision belongs to the human; return bounded options.
- `WORLD_RETURN` — fresh physical/subjective/external-world evidence must come from human/world.
- `UNSPECIFIED` — continue only default non-effect work; resolve the gate before any human/world/EFFECT claim.

Unsatisfied `PING | CHOOSE | WORLD_RETURN` yields `HUMAN_REQUIRED`. Marking one satisfied requires an evidence ref. Human-gate satisfaction changes coordination readiness only; it does not grant EFFECT, NOW, priority, merge, commit, or release authority.

## CREW HANDOFF STATE MACHINE

The existing compiler emits only these useful states:

```text
SOURCE_REQUIRED  object unresolved
HOLD_REQUIRED    object resolved; no moves declared
HOLD_READY       1–3 moves declared; none selected
HUMAN_REQUIRED   real interruption gate blocks continuation
TURN_READY       one move selected; native RELEASE may still be required
```

Hard failures already enforced:

- >3 moves
- selected TURN while object unresolved
- selected move not declared
- EFFECT with no native commit/RELEASE boundary
- satisfied human gate with no evidence ref

## WHAT TRAVELS BETWEEN CREW MATES

Preserve:

```text
intent
addressed object
native owner
bounded move offers
selected move, if explicit
evidence refs
human/world gate
exact return address
observed TRACE/RETURN
```

Do not preserve/require:

```text
hidden chain of thought
private model memory
tool internals
crew identity as authority
ambient project context
an operator-maintained task database
```

The deterministic `crew:<fnv64>` handle correlates the same handoff object. It is not a session/task authority or persistent memory.

## CURRENT MACHINE SURFACE

`node scripts/emit-agent-transcript.mjs --help --json` is the discoverable machine contract. Its current modes are:

```text
transcript
transcript-json
crystal
packet-reduce
contribution-converge
crew-handoff
```

Contribution convergence remains separate from execution. `MERGE` is advisory and requires caller-attested passing verification, exact head, current ancestry (`compare(master,candidate_head).behind_by === 0`), and mergeability. Native GitHub/host authority remains native.

## COMPILED PROOF MAP

Existing proof surfaces:

- `tools/source-hold-turn-trace-return-selftest.mjs` — stage order, RETURN schema, fail-closed behavior.
- `tools/field-machine-reducer-selftest.mjs` — machine modes, egress, contribution reducer, crew handoff, deterministic handle, unresolved/move-bound failures.
- `tools/field-stage-handoff.mjs --selftest` — exact object resolution, ≤3 OFFER moves, human gate semantics, selected-move boundary, unresolved/EFFECT failures.
- `tools/house-crew-seam-selftest.mjs` and `tools/house-two-worker-proof-selftest.mjs` — real-host crew seam evidence in HOUSE.
- `tools/ship-check.mjs` — pre-push CI gate list.

This compilation does not claim those tests ran in this note's creation unless separately witnessed by a RETURN/CI receipt.

## HOOK FOR OTHER CREW

When adding a new human/agent/worker integration:

1. **Do not create a new crew dialect.** Resolve to `/control/SUBMISSION_CONTRACT.json`.
2. If object+owner are already known, prefer the 10-leaf `field-crew-turn/v0.1` projection.
3. If not, emit the full submission envelope and compile through `field-crew-handoff/v0.1`.
4. Keep 0–3 offered moves; exactly one TURN.
5. Put irreversible/effect permission at the native RELEASE boundary, never in crew identity.
6. TRACE exact evidence; UNKNOWN is valid.
7. RETURN closes authority; re-read current truth before a consequential successor.
8. Add a host-specific adapter only when a real host cannot already express the move/gate/return through this seam.

### Successor empirical test

The next useful general proof is **relay without reconstruction**:

```text
crew A resolves one object → emits handoff
crew B consumes same object/handle → performs/observes one lawful TURN → RETURN
crew C re-enters from RETURN → must re-read current truth before any second move
```

Pass if object identity, native owner, human gate, evidence, and exact RETURN survive while hidden internal state is absent; fail if any crew identity gains authority, if a second move inherits authority, or if handoff requires a new persistent queue/memory store.

HOUSE already has a two-worker proof; extend this only where another real host provides genuinely different evidence.

## STOP

Do not add:

- crew dashboard
- actor registry
- shared hidden-memory layer
- parallel task queue
- `next` authority in the minimum packet
- automatic human interruption at every stage
- inferred EFFECT permission
- another source of NOW

If coordination prose becomes longer than the work it enables, reduce again.
