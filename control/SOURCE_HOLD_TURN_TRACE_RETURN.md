# SOURCE → HOLD → TURN → TRACE → RETURN

**Default bounded execution protocol.**  
Human shorthand: **What exactly? → Hold one thing → Make one bounded move → Prove what changed → Write what came back.**

Use this for coding, repo work, design, research, planning, and world-facing tasks whenever the work can be reduced to **one addressed object + one bounded move**.

> **Critical compatibility rule:** in the shared INTERPHASE action grammar, **TURN is not permission to dispatch an EFFECT**. If the selected native operation has EFFECT authority, TURN must cross an explicit **host-native RELEASE / commit gate**. The protocol never manufactures that authority.

| Stage | Entry condition | Do | Exit condition | Concrete example |
|---|---|---|---|---|
| **SOURCE** | A request/signal/object exists; exact canonical focus is not fixed, or a prior RETURN requires replan. | Resolve authoritative owner + exact address/version/ref. Separate source fact from derived interpretation. | One exact object/focus + owner + recoverable source ref. If unresolved: **STOP_UNKNOWN**. | “System map is stale” → primary source is `/nexus/map.html` at current blob SHA; CURRENT + manifest are supporting sources. |
| **HOLD** | SOURCE resolved; intended read/inspection is lawful. | Freeze object, focus, objective, constraints, RETURN address, stop rule; expose **≤3 native moves**. | Same object can be recovered after interruption; moves + authority boundary + return address are explicit. | Hold system-map object; objective = current architecture; moves = edit / verify / return; stop if root/manifest authority disagrees. |
| **TURN** | HOLD valid; one supported native move selected; constraints satisfied. | Preview consequence/reversibility; execute **one** bounded native move. EFFECT ⇒ explicit native **RELEASE/commit** first. | One attempt yields changed artifact/result ref/explicit failure. No second move begins. | Patch the existing map/navigation/manifest as one bounded change set. Do not start another redesign under inherited authority. |
| **TRACE** | TURN attempted. | Machine verification first: syntax, invariants/tests, replay/fixtures, browser/responsive/route/diff checks as applicable. Mark PASS/FAIL/INDETERMINATE. | Every material claim has evidence or is explicitly UNKNOWN; forecast ≠ observation. | Parse HTML/SVG; assert all requested nodes; re-read committed link + manifest. If no browser run exists, live render = **INDETERMINATE**, not PASS. |
| **RETURN** | TRACE exists, including failures/unknowns. | Record before→after, evidence, residue/lesson, unknowns; release authority; set **next = NONE**. | Durable receipt/evidence exists; loop is resumable; no implied next action. | Write `/returns/SYSTEM_MAP_CONVERGENCE_2026-10-02.json`; stop. Further work must begin again at SOURCE. |

## 20-second use

1. **SOURCE** — point to the exact thing.
2. **HOLD** — name what stays fixed and the ≤3 lawful moves.
3. **TURN** — do one bounded move; EFFECT needs native RELEASE.
4. **TRACE** — prove what actually changed; mark unknowns honestly.
5. **RETURN** — leave durable delta + evidence + residue; **stop and replan**.

If any stage cannot meet its exit condition: **STOP and name the missing condition. Do not invent substitute work merely to stay busy.**

## Coding / agent packet

Use this exact skeleton when handing work to Codex, Hermes, another coding model, or a future agent:

```yaml
SOURCE:
  object_id:
  owner:
  address_or_ref:
  source_refs: []
  facts: []
  unknowns: []

HOLD:
  focus:
  objective:
  constraints: []
  moves: []          # max 3, native operations
  return_address:
  stop_rule:

TURN:
  selected_native_move:
  authority: VIEW | NAVIGATION | EDIT | EFFECT | OFFER
  effect_boundary: NONE | HOST_NATIVE_RELEASE
  expected_consequence:
  reversibility:

TRACE:
  checks: []
  status: PASS | FAIL | INDETERMINATE
  evidence_refs: []
  unknowns: []

RETURN:
  before:
  after:
  delta:
  residue:
  evidence_refs: []
  unknowns: []
  next: NONE
```

### Agent rules

- **Route / projection / score / chat / branch ≠ authority.**
- **One loop = one addressed object/focus + one bounded move.**
- **≤3 moves visible while held.**
- **EFFECT requires native RELEASE/commit.**
- **TRACE is evidence, never permission.**
- **Synthetic/CI proof cannot stand in for human/device/world proof.**
- **Receipt-only work is not progress unless it resolves a live ambiguity/gate.**
- **RETURN ends authority. Any second move starts a fresh SOURCE/HOLD.**
- If the valuable frontier is human/world-gated, do at most **one directly-related preparation**, RETURN it, then STOP with the exact gate.

Machine-readable contract: [SOURCE_HOLD_TURN_TRACE_RETURN.json](./SOURCE_HOLD_TURN_TRACE_RETURN.json)

Related authority: [CURRENT.json](./CURRENT.json) · [FIELD INDEX contract](./FIELD_INDEX_CONTRACT.json) · [INTERPHASE mapping](./INTERPHASE_MAPPING_CONTRACT.json)
