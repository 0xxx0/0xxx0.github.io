# HOUSE / SPATIAL DESIGN ENGINE — convergence + AAR

Date: 2026-10-02  
Status: **IMPLEMENTED CANDIDATE / CI + PHYSICAL RETURN REQUIRED**  
Canonical human surface: `/house/`

## One line

**HOUSE becomes useful when one real addressed zone can move from observed condition → intended improvement → bounded intervention → verification → observed consequence → decision → RETURN without creating another dashboard, ontology, or control plane.**

## Audit: what is already strong

The current HOUSE head has converged substantially:

- one canonical human entry at `/house/`;
- one spatial substrate projected through PLAN / RCP / SURFACE / SECTION / 3D / FIELD / TRACE / CARE / ATLAS;
- stable room/surface/anchor identities across projections;
- explicit local calibration rather than false dimensional certainty;
- Home Assistant / HOUSEBUS retains private device truth, permissions and actuation;
- Shopping fit remains an evidence-only dimensional screen;
- BODY and Dayline handoffs are context-only;
- Telegram Mini App emits semantic intent only and keeps runtime credentials/server details private;
- TRACE and CARE preserve local/manual fallback and RETURN discipline.

This is no longer primarily an architecture problem.

## Audit: current defects

### 1. Conversion gap

The spatial surface exposes many lawful readings but previously lacked one compact loop for **changing the real house and learning from the consequence**.

The result was a risk of projection-rich / consequence-poor use: useful inspection, weak design iteration.

### 2. Public runtime witness is stale

`/house/state.json` is generated from a 2026-09-20 source snapshot. The canonical UI correctly labels it as a snapshot, but it must not be read as current Home Assistant truth.

Do not hand-edit it to look fresher. Refresh through the private HOUSEBUS normalizer or leave it explicitly stale.

### 3. Geometry truth is still bounded

The current spatial model is recovered/reconstructed donor geometry. Metric XY calibration, vertical measurements, and the donor/current-instance conflict remain unresolved.

Therefore:
- plan topology is useful for addressing and rough reasoning;
- local measurements may inform a trial;
- no structural, egress, load, services, or code claim follows from the model.

### 4. UI depth exceeds the number of real-world closure loops

Nine projections are defensible because they preserve one object, but every added projection now has to pay rent by improving a real operation. New visual modes are low priority.

### 5. Maintainability

`house/index.html` remains a large single-file host. The new design trial mechanism is deliberately factored into `house/design-engine.js` rather than increasing the monolith.

Do not refactor the whole host unless a concrete defect or repeated edit cost justifies it.

### 6. Verification asymmetry

The main public-surface CI is broad and healthy, but HOUSE does not currently have a dedicated screenshot/golden lane in `visual-regression.yml`. This is acceptable for the new design core because its semantics are self-tested, but future layout-heavy HOUSE changes should either add a small browser assertion or a bounded visual target.

## Implemented delta: DESIGN TRIAL 0.1

A design trial is attached to the **currently selected HOUSE address**. It is not a new route and not canonical geometry.

Local sequence:

```
ADDRESS
→ BEFORE        observed condition
→ INTENT        what should become easier
→ CHANGE        smallest useful intervention
→ CONSTRAINTS   what must remain true
→ VERIFY        discriminating observation/test
→ AFTER         observed consequence
→ DECISION      ADOPT | REVISE | REVERT | HOLD
→ RESIDUE
→ RETURN
```

Storage: browser-local `house.design.trials.v01`.

Return schema: `house-design-return/v0.1`.

Optional evidence: a current `house-shopping-fit-return/v0.1` may be attached. It remains evidence-only; dimensional fit never becomes purchase, installation, structural, utility, or safety authority.

RETURN fails closed until BEFORE, INTENT, CHANGE, VERIFY, AFTER and DECISION are all present.

## Ownership changes the horizon, not the truth law

Because the dwelling is owned, the legitimate intervention horizon is wider than a temporary/rental fit-out: permanent carpentry, penetrations, built-ins, routing, surface changes and infrastructure upgrades may eventually be worth modelling.

But ownership does **not** collapse the proof boundary.

For irreversible or safety-relevant work, the progression should remain:

```
reversible proxy
→ measure / observe
→ compare
→ exact permanent proposal
→ independent structural/services/code evidence where relevant
→ execute
→ after-state
→ RETURN
```

Reversible-first is therefore a search strategy, not a tenancy constraint.

## Smallest useful next proofs

### P0 — one real zone RETURN

Use issue #8 as the world gate.

Pick one current friction in one selected address. Record:
- BEFORE;
- INTENT;
- one reversible CHANGE;
- VERIFY;
- AFTER;
- ADOPT/REVISE/REVERT/HOLD.

The first useful fixture should require no new architecture and preferably no purchase.

### P1 — refresh runtime projection correctly

Refresh `house/state.json` only through HOUSEBUS's whitelist normalizer. Prove timestamp/source age and preserve the public/private boundary.

### P1 — geometry calibration

Resolve the current physical-instance plan/orientation and capture:
- one verified XY reference;
- one ceiling height;
- one doorway/critical passage envelope.

Do not attempt full-survey completeness before one design task needs it.

### P2 — address objects, not only rooms

Promote objects/anchors only when they participate in an operation:
- trolley;
- litter/feeder stations;
- work surface;
- partition/cassette/rail;
- tool home;
- fan/light/device.

An object earns canonical addressability by being moved, constrained, measured, actuated, maintained or returned.

### P2 — compare alternatives

Only after real trials accumulate, add a bounded compare operation:

`trial A ↔ trial B → same intent + same verification measure → observed delta`.

Avoid generic CAD/version-control theatre.

### P3 — physical marks

Reopen HOUSE MARKS only when a trial exposes a real re-entry/orientation/state ambiguity. Test one removable Interface Tile before any marking system expansion.

## Stop conditions

Do not add:
- another HOUSE route;
- another global state store;
- another geometry authority;
- simulated precision;
- sensor inference before the addressed operation exists;
- permanent-build approval semantics;
- a universal node graph;
- a visual projection without a named operation and RETURN.

## Successor map

Primary files:
- `/house/index.html` — canonical host / selected address
- `/house/design-engine.js` — local design-trial mechanism
- `/tools/house-design-selftest.mjs` — semantic/boundary proof
- `/house/contract.json` — authority + transport contract
- `/house/spatial/model.json` — reconstructed spatial substrate
- `/house/spatial-state.json` — lineage / truth boundary
- `/house/state.json` — stale-safe public runtime witness
- `/house/confluence.json` — layer ownership
- `/control/confluence/HOUSE_MARKS.md` — parked physical interface donor
- `/control/confluence/HOUSE_FRONTIER.md` — parked robotics/XR donor

## Assessment

**The system is coherent enough. The house is not yet measured enough.**

Further conceptual convergence has sharply diminishing returns until the next bounded physical delta closes. The most valuable evolution is now to make the house itself emit evidence back into the model.

