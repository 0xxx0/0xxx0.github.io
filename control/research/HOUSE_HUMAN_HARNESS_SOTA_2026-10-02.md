# HOUSE / HUMAN HARNESS — SOTA transfer atlas

Date: 2026-10-02  
Status: **RESEARCH QUARRY → BOUNDED TRANSFERS**  
Recipient: `/house/`  
Machine index: `/house/reality-stack.json`

## Refined claim

ENV-0 is usefully read as a **human capability harness**, but not as an agent harness in disguise.

The shared pattern is:

```
FOCUSED ACTOR
→ CONTEXT
→ BOUNDED CAPABILITY / TOOLS
→ WORLD-OR-HOST ACTION
→ FEEDBACK / WITNESS
→ RETURN
```

Human and agent remain unequal.

Human coupling includes embodiment, fatigue, comfort, proprioception, reach, physical risk, social context and tacit skill.

Agent coupling includes context representation, explicit tool availability, permission envelopes, host-native actions, machine-readable results and bounded write authority.

The reusable abstraction is therefore **coupling + evidence**, not actor identity.

---

## 1. Dynamicland / Realtalk

Official:
- https://dynamicland.org/2024/FAQ/
- https://dynamicland.org/2024/Intro/

Relevant mechanism:
- computation takes place in the real world rather than primarily behind a screen;
- physical objects may carry behavior and relate directly;
- the environment supplies sensing/illumination while objects remain understandable in place;
- simple local objects can recombine into richer situations;
- visible material and program structure reduce hidden interface machinery.

Transfer into HOUSE:
- selected HOUSE addresses should feel like **places with computational capability**, not rows in a dashboard;
- physical marks, tools, fixtures and ordinary matter may become bounded computational participants;
- HOUSE should prefer local contextual apertures over global control panels;
- no requirement that every useful physical thing become a smart device.

Reject:
- camera-everywhere as a goal;
- copying Realtalk's implementation assumptions;
- treating physical recognition as authority.

---

## 2. Ink & Switch — Habitat / PlayBook / Programmable Ink

Official:
- https://www.inkandswitch.com/project/habitat/
- https://www.inkandswitch.com/project/playbook/
- https://www.inkandswitch.com/ink/

Relevant mechanism:
- one environment can support several unequal computational models;
- no single programming representation is appropriate for every problem;
- small materials with distinct interaction physics can compose into richer work;
- direct manipulation and programmable behavior can coexist.

Transfer:
- PLAN, TRACE, DESIGN, runtime state and physical marks should remain unequal lenses over one HOUSE locus;
- HOUSE does not need one universal editor;
- interaction physics may change with the selected reality layer without changing identity.

Reject:
- a generic programmable canvas as HOUSE's primary face;
- node-wire theatre where ordinary direct manipulation is cheaper.

---

## 3. Potluck / Embark — gradual enrichment

Official:
- https://www.inkandswitch.com/potluck/
- https://www.inkandswitch.com/project/embark/

Relevant mechanism:
- informal material remains useful before it becomes formally structured;
- structure and computation accrue only when an operation needs them;
- richer views can grow around existing content rather than forcing migration into an app schema.

Transfer:
- an unmeasured HOUSE locus is still useful;
- a handwritten observation can precede a typed state;
- one measured passage can be added without surveying the whole house;
- an object earns richer schema only when an operation needs it.

Reject:
- completeness-first digital-twin modelling.

---

## 4. Patchwork — alternatives and visual differences

Official:
- https://www.inkandswitch.com/project/patchwork/
- https://www.inkandswitch.com/patchwork/notebook/2024-version-control/10/

Relevant mechanism:
- lightweight branches make alternative changes safe to explore;
- visual domains need domain-specific differences, not generic text diffs;
- floorplan branching has already been used as an experimental target.

Transfer:
- HOUSE design trials are physical branches:
  `BEFORE → CHANGE → AFTER → ADOPT | REVISE | REVERT | HOLD`;
- future compare should juxtapose two real/proposed spatial states by visible consequence;
- branch semantics are useful only after one actual design trial exists.

Reject:
- Git vocabulary as the human interface;
- claiming rollback for irreversible construction.

---

## 5. Ambsheets — possibility fields

Official:
- https://www.inkandswitch.com/project/ambsheets/live25/

Relevant mechanism:
- multiple possibilities can coexist without destructive serial toggling;
- filters narrow a possibility space;
- values retain provenance to the scenarios that produced them.

Transfer:
- future HOUSE design comparison may hold several candidate placements/clearances/configurations simultaneously;
- constraints can remove impossible candidates without selecting a winner;
- provenance must follow each candidate.

Promotion gate:
- only after two real design trials make serial comparison costly.

---

## 6. Apple RoomPlan — capture as projection

Official:
- https://developer.apple.com/documentation/roomplan

Relevant mechanism:
- guided sensor capture can identify walls, openings and recognized room objects;
- captured room state can be modified and exported.

Transfer:
- future phone/LiDAR capture is a candidate **measurement projection** into HOUSE;
- imported geometry must retain capture provenance, confidence and reconciliation against existing addresses.

Reject:
- RoomPlan output replacing HOUSE identity or becoming automatically authoritative.

---

## 7. Home Assistant — physical area hierarchy

Official:
- https://www.home-assistant.io/docs/organizing/areas/
- https://www.home-assistant.io/docs/organizing/floors/

Relevant mechanism:
- Areas represent physical rooms/spaces;
- devices/entities are grouped into those areas;
- Floors group Areas and can themselves be runtime targets;
- current HA UI work increasingly begins from real entities/areas rather than card types.

Transfer:
- HOUSE addresses should map explicitly to HA Areas where a real mapping exists;
- runtime operations stay HA/HOUSEBUS-native;
- the HOUSE interface can organize by place without copying HA's dashboard model.

Reject:
- assuming HOUSE room IDs and HA area IDs are already equal.

---

## 8. Matter semantic tags

Official:
- https://csa-iot.org/wp-content/uploads/2023/10/Matter-1.2-Standard-Namespace-Specification.pdf

Relevant mechanism:
- interoperable semantic namespaces exist for location, direction, position, level and closures.

Transfer:
- use standards as adapter vocabulary where useful;
- preserve HOUSE stable identity separately from semantic tags.

Reject:
- semantic tags as canonical identity.

---

## 9. OpenUSD — layered composition

Official:
- https://openusd.org/22.08/glossary.html

Relevant mechanism:
- scene composition combines layers through explicit arcs;
- overrides and variants can change a stage without flattening all contributors into one file.

Transfer:
- measured geometry, recovered donor topology, proposed design states and runtime annotations should remain separate composable layers;
- a projection may resolve them into one view while provenance survives.

Reject:
- adopting USD itself before a real interchange need exists.

---

## 10. Eclipse Ditto — digital twin responsibility split

Official:
- https://eclipse.dev/ditto/architecture-overview.html

Relevant mechanism:
- twin state, policy, search, gateway and connectivity are separate responsibilities.

Transfer:
- validates the existing HOUSE refusal to merge geometry/state/policy/connectivity/actuation into one object;
- HOUSEBUS/HA remains runtime authority while public HOUSE can remain a read-only contextual projection.

Reject:
- microservice architecture for a single dwelling merely to resemble industrial digital twins.

---

## Interface synthesis

The strongest combined interface is not a dashboard and not a 3D digital twin.

It is one selected locus shown inside three simultaneous structures:

### A. Nested physical reality

```
BODY
  ⊂ HARNESS
    ⊂ OBJECT / TOOL FIELD
      ⊂ ROOM
        ⊂ HOUSE
          ⊂ NETWORK / RUNTIME ENVIRONMENT
```

### B. Time

```
BEFORE
  ↓
NOW / TURN
  ↓
AFTER
```

### C. Evidence

```
SOURCE / OBSERVE
→ ACT
→ WITNESS
→ RETURN
```

AGENT and PEOPLE are transverse relations. They touch the stack but are not spatial containment layers.

This produces the new `REALITY ◎` aperture in HOUSE.

---

## Human ↔ agent harness correspondence

### Human

```
BODY
→ context
→ wearable / carried / environmental harness
→ tools / affordances
→ physical action
→ sensation / observation
→ RETURN
```

### Agent

```
MODEL
→ context
→ tool / permission harness
→ host-native operation
→ tool result / witness
→ RETURN
```

Shared:
- bounded coupling;
- capability exposure;
- constraints;
- feedback;
- explicit continuation/return.

Unequal:
- embodiment;
- risk;
- tacit skill;
- latency;
- fatigue;
- consent;
- physical irreversibility;
- social consequence.

Therefore:

> **HARNESS is a useful cross-actor design primitive; ACTOR is not a universal interchangeable role.**

---

## Current recipient-side implementation

- `/house/reality-stack.json` — machine-readable internal + extant-project index.
- `/house/reality-harness.js` — contextual concentric reality aperture.
- `/house/runtime-witness.js` — recomputes public snapshot freshness at read time.
- `/house/design-engine.js` — progressive one-locus physical design loop.

No new route, ontology, global state store or actuation plane was introduced.

