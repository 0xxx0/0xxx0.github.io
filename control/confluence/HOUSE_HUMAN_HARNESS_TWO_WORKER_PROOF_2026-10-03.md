# HOUSE · ENV-0 HUMAN HARNESS × CREW SEAM TWO-WORKER PROOF

Date: 2026-10-03  
Status: **IMPLEMENTED PROOF HARNESS / REAL SECOND-WORKER RETURN STILL REQUIRED**

## One line

**Keep one HOUSE locus stable; let the human change coupling and world state; let crew workers carry only the minimum operational frame needed to continue; require fresh reality before promotion.**

---

## 1. Why these are one problem

ENV-0 is useful when treated as the human-side execution harness rather than a wearable-product concept.

CREW SEAM is useful when another worker can inherit that execution state without inheriting the whole conversation.

The joint problem is therefore:

```text
WHERE AM I COUPLED?
BODY → HARNESS → OBJECT → ROOM → HOUSE → NETWORK

WHAT PHASE IS THE TASK IN?
UNBOUND → ORIENTED → EQUIPPED → ENGAGED → ACTED → WITNESSED → RETURNED

WHO MUST DO THE NEXT IRREDUCIBLE THING?
NONE | PING | CHOOSE | WORLD_RETURN

WHO ACTUALLY HAS EFFECT AUTHORITY?
NONE | HUMAN_PHYSICAL | HOST_NATIVE | HA_HOUSEBUS_PRIVATE
```

Reality layer, task phase, human gate and effect authority are four separate dimensions.

Collapsing them is dangerous:
- selecting HARNESS does not authorize tools;
- a `NONE` human gate does not authorize effects;
- `KEEP` does not mean execute;
- reaching `ACTED` in interface state does not prove a physical change occurred;
- HOUSE ownership widens the permanent-work horizon but does not certify permanent work.

---

## 2. Concrete HOUSE interface model

Machine model:

- `/house/human-harness.json`
- `/house/human-harness.js`

### Layers

| Layer | Interface name | Operation |
|---|---|---|
| BODY | YOU / BODY | fresh embodied/world observation |
| HARNESS | LOADOUT / HARNESS | context + capability + tools + feedback coupling |
| OBJECT | TOUCH / OBJECT | exact thing/contact/operation |
| ROOM | HERE / ROOM | exact spatial address + local constraints |
| HOUSE | HOME / HOUSE | dwelling topology, permanence and residue |
| NETWORK | RUNTIME / NETWORK | sensors/services/agents under native permissions |

These remain aligned to the existing `REALITY ◎` containment model.

### Phase rail

```text
UNBOUND
  ↓ bind exact locus
ORIENTED
  ↓ identify relevant capability/loadout
EQUIPPED
  ↓ identify exact target + verification
ENGAGED
  ↓ human/native host performs bounded effect
ACTED
  ↓ fresh world/native evidence
WITNESSED
  ↓ decision + residue + evidence
RETURNED
  ↘ continue/reframe/park
```

### Recommended visible aperture

Do not add another page.

Within the existing HARNESS / CREW areas, the eventual host projection should show only:

```text
LOCUS       living_dining
PHASE       EQUIPPED
GATE        HUMAN NONE
AUTHORITY   NONE

LOADOUT / HARNESS
[known capability 1]
[known capability 2]

NEXT
CHECK ...
PROPOSE ...

missing / residue ...
```

The deep six-layer model remains available through `REALITY ◎`; the working aperture shows only active layer + phase + gate + ≤3 moves.

### Runtime hooks defined by the module

When the module is host-loaded:

- `window.HouseHumanHarness.snapshot()`
- `window.HouseHumanHarness.transition(event)`
- `window.HouseHumanHarness.makeCrewHandoff()`
- `house:harness-state`
- `house:harness-transition`

Inputs already correspond to HOUSE-native events:

- `house:selection`
- `house:design-state`
- `house:crew-frame`
- `house:runtime-witness`

**Current proof branch deliberately does not force another canonical-root script dependency merely to claim integration.** The core and machine model are ready; visible host wiring should occur only after the two-worker proof demonstrates that the state actually reduces coordination cost.

---

## 3. Human gate is not authority

### NONE

Crew may inspect, research, check, draft, navigate or propose.

No human interruption.

No effect authority.

### PING

One lightweight acknowledgement or readiness signal changes continuation.

Prefer one bit.

### CHOOSE

Preference, framing, adoption, irreversible direction or a meaningful trade-off belongs to the human.

### WORLD_RETURN

A fresh physical/subjective/native-host observation is missing.

The worker may specify **what to observe**.

The worker may not synthesize the observation.

---

## 4. Two-worker proof

Machine protocol:

- `/house/two-worker-proof.json`
- `/house/two-worker-proof.js`

### Worker A — CONTEXT HOLDER

Worker A has the current HOUSE/Crew/Harness context.

It emits one bounded packet and does **not** pre-solve Worker B's task.

A→B schema:

`house-crew-handoff/v0.1`

Required shape:

```json
{
  "schema": "house-crew-handoff/v0.1",
  "handoff_id": "...",
  "authority": "OFFER_ONLY",
  "subject": {
    "house_address": "living_dining",
    "label": "Living / Dining",
    "harness_phase": "EQUIPPED",
    "active_layer": "HARNESS"
  },
  "task": {
    "intent": "...",
    "stage": "change",
    "desired_output": "..."
  },
  "constraints": ["..."],
  "capabilities": ["..."],
  "evidence": [],
  "human_gate": {"class": "NONE", "reason": "..."},
  "allowed_moves": ["CHECK", "PROPOSE"],
  "next": [],
  "witness_needed": "...",
  "source_refs": ["/house/human-harness.json", "..."],
  "return_schema": "house-crew-return/v0.1",
  "privacy": "BOUNDED_OPERATIONAL_STATE_ONLY / NO_TRANSCRIPT"
}
```

Limits:
- constraints ≤5;
- allowed moves ≤3;
- next ≤3;
- source refs ≤8;
- no conversation/messages/raw-context/token/credentials fields;
- no whole-state fingerprint.

### Worker B — SUCCESSOR / CRITIC

Worker B starts with **no prior conversation context**.

It receives:
1. exactly one bounded packet;
2. only the native sources named by that packet.

Worker B must read back the frame before its result can count.

B→A schema:

`house-crew-return/v0.1`

```json
{
  "schema": "house-crew-return/v0.1",
  "handoff_id": "...",
  "worker_id": "worker-b",
  "authority": "OFFER_ONLY",
  "readback": {
    "house_address": "living_dining",
    "intent": "...",
    "constraints_seen": ["..."]
  },
  "move": "CHECK",
  "result": "...",
  "sources": ["..."],
  "assumptions": ["..."],
  "missing": ["..."],
  "questions": [],
  "human_gate_hit": "",
  "proposed_next": ["..."]
}
```

If B needs a passage width that is not in evidence, correct output is:

```text
missing = [passage width]
human_gate_hit = WORLD_RETURN
```

not a guessed dimension.

### Human / Worker-A feedback

`house-crew-feedback/v0.1`

- `KEEP` — keep active coordination context; never execute.
- `PARK` — retain as residue/later possibility.
- `WRONG_FRAME` — repair the packet before continuing; requires changed-field delta.

---

## 5. Treatment and control

### Treatment — BOUNDED_PACKET

Worker B gets the handoff + exact source refs only.

### Control — BROAD_NATIVE_CONTEXT

A fresh Worker B instance gets:
- same task label;
- HOUSE contract;
- reality stack;
- crew card;
- current HOUSE confluence/handoff notes.

Do **not** commit or transmit a private conversation transcript merely to create a control. The proof is whether the bounded packet beats broad native-context search/rebrief cost while preserving correctness.

---

## 6. Success metrics

### Hard per-handoff

Must all hold:

- schema valid;
- exact HOUSE address fidelity;
- intent fidelity;
- constraint readback coverage = 1.0;
- authority violations = 0;
- avoidable rebriefs = 0;
- unsupported physical claims = 0;
- human-gate fidelity = true;
- proposed next ≤3.

### Operational

Record externally:

- time to first valid return;
- packet bytes;
- source refs actually used;
- explicit assumptions count;
- explicit missing-evidence count;
- human feedback verdict;
- number of feedback deltas needed.

### Promotion after three real handoffs

Require:

1. 3/3 valid handoff + return;
2. 3/3 exact locus + intent readback;
3. zero authority violations;
4. zero avoidable rebriefs for packet-known fields;
5. zero silently invented physical facts;
6. ≥2/3 immediately `KEEP`, or usable after exactly one `WRONG_FRAME` delta;
7. every genuinely missing world fact becomes `WORLD_RETURN`.

The packet wins only if correctness is preserved while coordination/search cost falls.

---

## 7. Seeded failures

The proof explicitly covers:

- wrong locus;
- mismatched handoff id;
- avoidable rebrief;
- invented physical measurement/consequence;
- effect attempt under `OFFER_ONLY`;
- transcript/context dump;
- missing exact locus or intent;
- >3 moves;
- schema drift;
- `KEEP` interpreted as permission;
- hidden material assumption;
- duplicate work despite named owner/native source;
- `WRONG_FRAME` ignored;
- private context leakage;
- stale witness described as current.

---

## 8. First real task

The protocol includes a low-risk fixture:

**Intent:** reduce tool-return friction at one selected work locus without degrading circulation.

Worker B is asked only to CHECK/PROPOSE reversible tool-home/placement possibilities.

Known constraints:
- keep passage clear;
- reversible before drilling/permanent fabrication.

Unknown physical measurements remain unknown.

This is useful because the task crosses ENV-0 layers naturally:

```text
BODY      reach / retrieval effort
HARNESS   carried / mounted tool set
OBJECT    tool home / clamp / rail
ROOM      passage + work locus
HOUSE     durable adoption / maintenance
NETWORK   optional future inventory/witness, not required
```

---

## 9. Smallest implementation shipped by this candidate

- Human Harness machine model.
- Human Harness pure state/transition core.
- Two-worker packet/return/feedback core.
- Real proof protocol + failure corpus.
- Deterministic self-tests.
- Dedicated pull-request CI.
- Crew Card discovery links.

No:
- new route;
- agent platform;
- transcript store;
- background worker;
- new actuation surface;
- release/version promotion before a real B→A return.

---

## 10. Next empirical move

Use a genuinely independent Worker B context.

Do not explain the project conversationally first.

Send only the generated packet and sources.

If the packet fails, **repair the packet model** before adding more prose/context.

That is the actual CREW SEAM test.
