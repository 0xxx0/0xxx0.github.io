# HOUSE / HOME BASE / LOADOUT — game UX donor pass

Date: 2026-10-03  
Status: RESEARCH QUARRY / BOUNDED DONOR  
Recipient: `/house/` + ENV-0 / Reality Harness  
No new route, state authority, queue, dashboard, or actuation plane.

## Refined product direction

Treat HOUSE as a **diegetic home base over real state**, not a dashboard.

```
HOUSE = persistent spatial world / storage / service topology
ENV-0 = portable player loadout / coupling layer
HOUSEBUS = invisible runtime + actuation authority
FIELD = outer re-entry / cross-project navigation
RETURN = proof of what actually changed
```

Borrow game coherence without gamifying chores. No XP, streaks, quest spam, fake urgency, or invented state.

The key shift is:

> Rooms are not pages. Objects are not rows. The physical house is already the inventory and capability graph.

A HOUSE object has a home address, current address, containing slot/container, usable capability, current state, and evidence. A loadout is a temporary binding over those actual objects, never a second inventory.

---

## Donor 1 — Ultima Online housing

Official:
- https://uo.com/wiki/ultima-online-wiki/gameplay/houses-placing-a-house/house-ownership-4-managing-your-home/
- https://uo.com/wiki/ultima-online-wiki/gameplay/houses-placing-a-house/house-owning-2-building-a-custom-house/

Useful mechanics:
- the house itself is spatial storage;
- objects may be locked down in place or secured inside containers;
- access/security belongs to specific doors, containers and items;
- storage capacity is explicit;
- house customization uses a **Moving Crate** to stage displaced contents and restore valid placements after the structure changes.

Transfer:
- HOUSE inventory truth should remain **place-local**: item → container → surface/anchor → room;
- permissions belong to concrete objects/containers, not a global dashboard toggle;
- room redesign should have one explicit `STAGING / MOVING CRATE` state for displaced objects;
- after a design trial, valid homes may restore while unresolved objects remain RESIDUE rather than silently disappearing.

Do not transfer:
- decay timers or storage scarcity as artificial game pressure;
- fantasy command syntax.

---

## Donor 2 — Death Stranding

Official / strong source:
- https://www.kojimaproductions.jp/en/death-stranding-directors-cut-beginners-guide

Supporting references:
- https://deathstranding.fandom.com/wiki/Garage
- https://deathstranding.fandom.com/wiki/Customization

Useful mechanics:
- carried cargo has visible weight/balance consequences for movement;
- fabricated equipment is tied to facilities/materials;
- Private Lockers and garages are **local to place**, not magical global storage;
- backpack pouches/batteries create an embodied equipment topology;
- private rooms combine recovery, inspection, equipment, personal objects and departure preparation;
- PCCs turn carried inventory into deployable world capability.

Transfer:
- ENV-0 should be the **body ↔ loadout ↔ world** seam: capability has mass, volume, power, accessibility, contact and host/dock location where known;
- carrying and docking are first-class state transitions: `HOME → PACKED → CARRIED → DOCKED → USED → RETURNED / SERVICE`;
- room inventory remains locally addressed even if HOUSE offers global search;
- a capability cassette may leave the house and become world action, then come back with a receipt.

Strong correspondence:

```
Death Stranding: locker → body/backpack → route → deployed tool → return
ENV-0:          dock   → harness       → world → cassette/tool → RETURN
```

Do not transfer:
- burden as punishment;
- fake resource economies.

---

## Donor 3 — Monster Hunter item/equipment sets

Official:
- https://game.capcom.com/manual/MH4U/en/page-135.html

Useful mechanics:
- Item Sets restore a task-specific pouch quickly;
- Equipment Sets restore a role-specific equipment configuration;
- loadouts capture arrangement, not only membership;
- preparation remains distinct from permanent storage.

Transfer:
- HOUSE/ENV-0 `LOADOUT` should be a **named partial preparation pattern**, not a duplicate copy of objects;
- a loadout may specify required capability, preferred object, slot/dock and interaction layout;
- readiness is computed against actual current object state.

Recommended semantics:

```
READY      all required bindings satisfied
PARTIAL    some optional/preferred bindings absent
MISSING    required capability/object unavailable
SERVICE    required object exists but is charging/dirty/broken/unready
```

---

## Donor 4 — Warframe Orbiter

Official:
- https://www.warframe.com/en/news/orbiter-guide-ko

Useful mechanics:
- the Orbiter is a mobile base where loadout, Arsenal, crafting, navigation and maintenance are spatially embodied as stations;
- the same functions remain accessible through menus for speed;
- capability expands by adding Segments/rooms without replacing the base identity.

Transfer:
- HOUSE should use room/fixture **stations as spatial affordances**, while still permitting direct fast access;
- do not force a user to walk through a 3D house merely to reach a function;
- when a new real capability appears, attach it to an existing addressed station/object instead of adding another global panel.

Law:

> Diegetic location for comprehension; shortcut access for efficiency.

---

## Donor 5 — Escape from Tarkov hideout / stash

References:
- https://escapefromtarkov.fandom.com/wiki/Hideout
- community loadout discussions show the failure mode of presets that replace too much at once.

Useful mechanics:
- home base modules expose concrete service functions;
- stash geometry makes physical capacity legible;
- generator/fuel/repair state makes maintenance consequential;
- preset systems reduce repeated re-kitting friction.

Transfer:
- maintenance should appear on the **object/station that owns it**;
- avoid a generic chore list when the spatial locus is known;
- loadouts should be **partial overlays**, not destructive full snapshots.

Strong rule:

> LOADOUT = PATCH, NOT REPLACEMENT.

Unspecified slots remain untouched. This avoids the common preset failure where applying one kit destroys unrelated current state.

---

## Donor 6 — Resident Evil save room / item box

Reference:
- https://residentevil.fandom.com/wiki/Item_Box

Useful mechanics:
- inventory pressure is relieved at recognizable safe spatial checkpoints;
- item-box interaction, save/return and calm room identity are co-located;
- global retrieval reduces needless search once the user is at a trusted base node.

Transfer:
- HOUSE root should feel calm and stable by default;
- maintenance alerts should not overwhelm the base face;
- an addressed storage node can provide fast search/retrieval while preserving each object's real current/home address.

Do not transfer:
- artificial slot scarcity unless a real volume/weight/fit constraint exists.

---

# Converged HOUSE direction

## HOME BASE

The canonical `/house/` face should converge toward one playable home-base reading of the real house:

```
CURRENT LOCUS / ROOM
    ↓
visible fixtures + stored capabilities + active state
    ↓
1–3 local actions
PREP / MAINTAIN / RETURN
```

PLAN / SECTION / TRACE / CARE / EXPERT remain unequal projections/depth, not equal top-level products.

## ENV-0 = avatar equipment layer

ENV-0 is not another room model. It is the portable binding layer between BODY and HOUSE/WORLD.

Candidate dock grammar, grounded in recovered ENV-0:

```
BODY / HARNESS
CHAIR
TROLLEY
WALL / ROOM DOCK
TOOL / OBJECT DOCK
```

A cassette/capability may migrate across those hosts without losing identity.

## Inventory object

Minimum useful object state:

```json
{
  "id": "stable-object-id",
  "home_address": "house://room/anchor/container",
  "current_address": "house://... | env0://... | unknown",
  "container_or_dock": "stable-slot-id | null",
  "capabilities": ["named real capability"],
  "state": "READY | IN_USE | CHARGING | SERVICE | MISSING | UNKNOWN",
  "evidence": "source/ref/timestamp"
}
```

No inferred physical truth without evidence.

## Loadout object

```json
{
  "id": "named-kit",
  "intent": "human-authored purpose",
  "bindings": [
    {
      "slot": "HARNESS_DOCK_A",
      "requires": "capability",
      "preferred_object": "object-id",
      "mode": "REQUIRED | OPTIONAL",
      "apply": "FILL_IF_MISSING"
    }
  ]
}
```

The loadout references real objects. It does not clone or teleport them.

## Maintenance loop

```
OBSERVE
→ SERVICE NEEDED?
→ local action
→ verify changed state
→ RETURN
```

Maintenance belongs to the thing: litter box, feeder, fan, battery, tool, filter, sink, plant, ENV-0 cassette, etc. HOUSEBUS may supply runtime state; the object/locus remains the human-facing address.

## Room-reset / redesign loop

Transfer the UO Moving Crate idea:

```
ROOM BASELINE
→ STAGING (temporarily displaced objects)
→ CHANGE
→ RESTORE VALID HOMES
→ RESIDUE = objects with no valid home
→ RETURN
```

This maps directly onto existing HOUSE Design Trial and preserves physical reality instead of pretending undo is always possible.

---

# Cross-system convergence

- **SHOPPING**: a received/adopted object enters HOUSE as `UNPLACED / STAGING` until a real home address is observed.
- **FOUNDRY**: a fabricated artifact enters the same object inventory; its dock/home may be HOUSE or ENV-0.
- **BODY**: contributes reach/load/comfort/contact evidence; HOUSE selection is context only.
- **DAYLINE**: may schedule/hold one maintenance or preparation action by object reference; it does not own object truth.
- **HUMAN PORT**: may share a selected room/object/loadout projection without exporting private runtime state by default.
- **HOUSEBUS**: owns live entity/device truth and actuation; no public inventory/loadout view supersedes it.
- **FIELD**: re-enters the same addressed object and routes to HOUSE/ENV-0/SHOPPING/FOUNDRY as needed.
- **RETURN**: is where adoption, movement, maintenance and real-world consequence become durable evidence.

# Current recommendation

Do not add a new `INVENTORY` application.

Prototype one **HOME BASE / LOADOUT aperture inside `/house/`** over the existing selected spatial address:

1. `PREP` — inspect/apply one partial loadout against actual object state.
2. `MAINTAIN` — show only service deltas owned by objects at this locus.
3. `RETURN` — record moved/used/serviced objects and unresolved residue.

First proof should use an ordinary existing kit/cassette and one room. If this reduces search/reset/re-entry friction, deepen it. If not, keep the research as donor only.
