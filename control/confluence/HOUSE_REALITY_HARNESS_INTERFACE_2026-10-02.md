# HOUSE 0.9 — REALITY HARNESS interface

Date: 2026-10-02  
Status: **IMPLEMENTED CANDIDATE / CI + LIVED USE REQUIRED**  
Canonical route: `/house/`

## One line

**Hold one real HOUSE locus constant while moving attention across the reality layers that actually matter to action.**

This is a user-interface evolution, not a new HOUSE subsystem.

---

## 0. HOUSEBUS witness: exact boundary

I audited every connected GitHub repository available to this executor:

- `0xxx0/0xxx0.github.io`
- `0xxx0/0`
- `0xxx0/gods-eye-view`
- `0xxx0/handover`

The private HOUSEBUS `scripts/project-public.py` normalizer and current Home Assistant runtime source are not present in these connected repositories.

Therefore I cannot truthfully regenerate `/house/state.json` from current runtime evidence here.

What is now fixed on our side:

- `/house/runtime-witness.js` recomputes snapshot freshness from `generated_at` at **read time**;
- a Sep-20 file carrying historical `source_age_class: FRESH` can no longer display that as if it describes Oct-2 freshness;
- source age and runtime health are explicitly named **at generation**;
- BODY handoff can carry `snapshot_freshness` separately.

Actual bytes still require:

`current HA/HOUSEBUS source → private whitelist normalizer → generated public projection → commit`.

Do not fabricate freshness.

---

## 1. Interface correction

0.8 put a physical design loop into HOUSE, but the UI still behaved too much like:

`floorplan + nav tabs + sidebar forms`.

0.9 changes the human model.

### Current center

One selected physical address remains the center.

### Nested physical reality

```
BODY
  ⊂ HARNESS / ENV-0
    ⊂ OBJECT / TOOL
      ⊂ ROOM
        ⊂ HOUSE
          ⊂ NETWORK / RUNTIME ENVIRONMENT
```

### Orthogonal time

```
BEFORE
  ↓
NOW / TURN
  ↓
AFTER
```

### Orthogonal evidence

```
SOURCE / OBSERVE
→ ACTION
→ WITNESS
→ RETURN
```

### Transverse participants

- PEOPLE
- AGENT
- TIME
- RETURN

These are intentionally not rendered as physical containment.

The new `REALITY ◎` aperture therefore makes the existing HOUSE locus feel like a coordinate intersection, not a dashboard selection.

---

## 2. ENV-0 reinterpretation

The recovered ENV-0 family already contains:

`BODY → GARMENT → HARNESS → SUIT → FURNITURE → ROOM → HOUSE`.

That is stronger than I previously gave it credit for.

The useful reading is:

> a harness is a bounded coupling surface that lets an actor carry capability into an environment while preserving constraints and feedback.

This creates a real analogy with agent harnesses.

### Human harness

```
BODY
→ context
→ carried / worn / environmental interface
→ tool / affordance
→ world action
→ sensation / observation
→ RETURN
```

### Agent harness

```
MODEL
→ context
→ tool / permission envelope
→ host-native action
→ tool result / witness
→ RETURN
```

The abstraction survives.

The actor equivalence does not.

Human embodiment, fatigue, tacit skill, comfort, social consequence and physical irreversibility are not model context-window variables.

Agent tool permission, host authority and machine-readable action surfaces are not human affordances.

So the current label is deliberately:

**ANALOGY / NOT IDENTITY**.

---

## 3. SOTA transfer

Research packet:

`/control/research/HOUSE_HUMAN_HARNESS_SOTA_2026-10-02.md`

Current useful donors:

- Dynamicland / Realtalk — environment-first computation; visible physical computational objects.
- Ink & Switch Habitat / PlayBook — several unequal computational materials inside one environment.
- Potluck / Embark — gradual enrichment instead of completeness-first schema.
- Patchwork — lightweight alternatives and domain-specific visual differences; includes floorplan-versioning experiments.
- Ambsheets — concurrent possibility spaces and filters.
- Apple RoomPlan — guided physical capture as a source projection.
- Home Assistant Areas/Floors — physical locations as runtime targets.
- Matter semantic tags — reusable adapter vocabulary for location/direction/position.
- OpenUSD — compositional layers and variants without flattening provenance.
- Eclipse Ditto — state/policy/connectivity responsibility separation.

No donor is authority.

No donor justifies a technology migration by itself.

---

## 4. Implemented interface mechanics

### REALITY ◎

File:
- `/house/reality-harness.js`

Data:
- `/house/reality-stack.json`

Behavior:
- opens over the existing stage;
- selected HOUSE address stays in the center;
- concentric rings express physical containment;
- vertical line expresses time;
- horizontal line expresses evidence;
- AGENT / PEOPLE / TIME / RETURN remain satellites;
- clicking a layer exposes ≤3 immediate re-entry routes;
- deep machine index retains the larger project quarry;
- current DESIGN and runtime-witness status can project into the relevant layer.

No layer click changes canonical HOUSE state.

### DESIGN

`/house/design-engine.js` no longer renders the whole design receipt as one long form.

Visible sequence:

`BEFORE · INTENT · CHANGE · VERIFY · AFTER · DECIDE · RETURN`.

Only the current step occupies the working aperture.

Core return schema remains unchanged.

### WITNESS

`/house/runtime-witness.js` separates:

- snapshot freshness **now**;
- source freshness **at generation**;
- runtime health **at generation**.

This is a truth repair, not a runtime refresh.

---

## 5. Project index

`/house/reality-stack.json` now preserves a many-to-many index across:

- BODY
- HARNESS
- OBJECT
- ROOM
- HOUSE
- RUNTIME
- TIME
- PEOPLE
- AGENT
- EXPERIENCE
- EVIDENCE

The visible interface deliberately renders only nearest useful routes.

This is the rule:

> **deep index; shallow presentation.**

Do not turn the deep index into a mega-menu.

---

## 6. Honest assessment

### What is now distinctive

The best part of HOUSE is no longer its floorplan rendering.

It is becoming an interface where:

- one real thing remains centered;
- physical containment, time and evidence are simultaneous coordinates;
- different projects become reachable because of their relation to the held locus;
- digital/runtime/agent context is visibly adjacent to physical reality without being allowed to overwrite it.

This is materially closer to our years of spatial-interface / recursive-composition / focus-context work than a normal smart-home or CAD UI.

### What is still conventional

- PLAN itself is still SVG polygons.
- selected-address inspection remains sidebar-like.
- physical object addresses are sparse.
- no real sensor/vision capture presently modifies the model.
- no true spatial diff exists between two design trials.
- REALITY ◎ still requires an explicit button; it is not yet naturally inferred from interaction.
- mobile feel is unverified until browser CI and lived use.

### Biggest danger

Turning every intellectual connection into another visible control.

The new layer index must reduce navigation cost, not showcase how much we have indexed.

### Biggest opportunity

Let the house become the primary index.

Eventually:

`touch / scan / mark / stand at / select real locus → relevant computation appears there`.

The page should increasingly become a temporary projection of the house rather than the house becoming content inside a page.

---

## 7. Next moves

### P0 — merge / verify

- deterministic witness-aging test;
- reality-stack structural test;
- existing HOUSE design-core test;
- critical browser smoke;
- release/CURRENT/manifest coherence.

### P1 — one lived interface run

Use one actual room friction.

Do not test the interface abstractly.

Open the room → REALITY ◎ only when a neighboring layer is genuinely useful → perform one DESIGN trial → RETURN.

Observe:
- did REALITY reduce route hunting?
- did a layer reveal a useful adjacent capability?
- did the ring become decorative tax?
- did the progressive DESIGN flow reduce overload?

### P1 — actual runtime witness refresh

Requires the private HOUSEBUS generator/runtime source.

Once available:
1. generate;
2. inspect redaction;
3. update public witness;
4. confirm read-time freshness becomes CURRENT;
5. allow it to decay automatically afterward.

### P2 — alternatives / spatial diff

Only if two real design alternatives exist.

Candidate mechanism:
- preserve one address + intent;
- branch two proposed configurations;
- show only physical/property differences;
- carry evidence/provenance per branch;
- compare after-world observations when physically tried.

Patchwork / Ambsheets are quarry, not requirements.

### P2 — capture adapter

Only if manual geometry becomes the blocker.

RoomPlan / photogrammetry import should produce:
- proposed geometry layer;
- source/capture metadata;
- confidence;
- reconciliation against current HOUSE IDs.

Never overwrite by scan.

### P2 — physical harness proof

Reopen ENV-0 only against a named friction:
- carrying tools/context;
- tool-home / body-home relation;
- reversible panel/cassette;
- interaction tile;
- work surface;
- sensor node.

One bounded physical return before any wearable/system expansion.

### P3 — human/agent harness experiment

Use the **same real task** and compare:

Human:
`context → tools → act → observe → return`

Agent:
`context → tools/permissions → propose/operate within bounds → witness → return`

Measure where the analogy breaks.

That breakage is likely more informative than proving the analogy.

---

## Stop conditions

Do not add:

- another HOUSE route;
- a second global ontology;
- a generic node graph;
- a full digital twin platform;
- real-time presence inference merely because sensors exist;
- a 3D scene as default;
- a layer in REALITY ◎ with no useful re-entry operation;
- an agent action merely because it can be represented;
- another visual donor without a recipient-side operation.

## Compression

```
HOUSE 0.9
= one locus
× nested physical reality
× time
× evidence
+ bounded human/agent/people relations
→ action
→ consequence
→ RETURN
```

**The interface should disappear into the relationship between body, thing, place, time and consequence.**
