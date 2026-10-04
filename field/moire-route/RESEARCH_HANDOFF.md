# FIELD / MOIRÉ HELD-OBJECT MISMATCH — RESEARCH HANDOFF

**Date:** 2026-10-02  
**Class:** EVIDENCE / representation instrument  
**Host:** FIELD INDEX → REFINE / PROVE  
**Authority:** VIEW / EVIDENCE ONLY

## Question

Can the earlier moiré donor stop operating on a synthetic graph and instead report representation mismatch for the exact FIELD object the operator has deliberately held?

## Source

The instrument now receives the FIELD focus by address:

```
/field/moire-route/?focus=<manifest route>&projection=<current FIELD projection>
```

FIELD root constructs that link from the actual held object. If no object is held, the instrument fails closed and returns to FIELD; it does not manufacture a fixture.

Truth sources:

- `/showcase-manifest.json`
- `/control/CURRENT.json`
- the exact `focus` route propagated from FIELD root

## Real route context

The old deterministic 6×6 route/spur fixture is removed from runtime.

The visible route is now the actual manifest lineage:

```
/ → parent → … → held route
```

Context branches are real manifest siblings/children only.

## Representation mismatch

Canonical FIELD route facts are grouped into the channels already used by `lib/interphase-field.js`:

```
identity
address
content
depth
authority
evidence
```

The instrument compares those actual facts with fields retained or derived by extant FIELD projections:

- FIELD / AXIAL
- FIELD / VISUAL MAP
- FIELD / STRUCTURE
- FIELD / EVOLVE
- FIELD / VERSIONS
- FIELD / RECENT
- FIELD / GLYPH

Mismatch has two parts:

### 1. hidden / derived channel residue

A fact present in manifest/CURRENT but not preserved by the selected representation remains interference residue.

Derived glyph facts are not treated as identical to preserved source facts.

### 2. coordinate displacement

The real manifest parent tree is the canonical address frame.

Each extant FIELD projection is modeled using the fields it actually orders by:
- AXIAL → state × operation/work-mode;
- VISUAL → manifest parent tree;
- STRUCTURE → route-address order;
- EVOLVE → evolution stage;
- VERSIONS → version;
- RECENT → route update time;
- GLYPH → kind × operation.

The held route and its lineage therefore occupy two lawful coordinate frames rather than a fabricated maze.

## Alignment law

`ALIGN COORDINATES` may compensate only the transformable coordinate displacement.

It may **not** erase hidden/derived channel residue.

So:

```
raw mismatch
= channel residue + coordinate displacement

aligned visible interference
= channel residue + compensated coordinate displacement
```

A representation that omits authority/evidence cannot be made truthful merely by visually aligning it.

## Runtime behavior

- HOLD a route on FIELD root.
- Enter **REFINE / PROVE → MOIRÉ ROUTE**.
- FIELD propagates `focus`, current projection, and active AXIAL tuple.
- Instrument resolves that exact route against current manifest/CURRENT.
- Moiré field shows canonical × projection interference.
- Coordinate panel shows the real manifest route context against the selected projection coordinates.
- Channel table names exact retained / derived / hidden fields.
- COPY REPORT emits `field-representation-mismatch/v0.2`.
- RETURN restores the same FIELD focus address.

## Falsifier

PARK this instrument if it cannot do at least one of:

1. expose a real channel loss that is not obvious in the compressed representation;
2. distinguish transformable coordinate drift from irreducible information loss;
3. help choose a more suitable representation for one held FIELD object.

Do not promote interference as decoration.

## Verification

Run:

```
node field/moire-route/selftest.mjs
```

The selftest reads the repository's actual `showcase-manifest.json` and `control/CURRENT.json`, selects a real deep manifest route, and verifies:

- runtime context contains only manifest route identities;
- synthetic grid IDs are absent;
- VISUAL shares canonical tree coordinates;
- GLYPH retains non-zero channel residue;
- full alignment cannot erase hidden-channel residue;
- no held address fails closed.

## Boundary

This is representation evidence, not correctness authority.

```
HELD OBJECT ≠ PROJECTION
PROJECTION MISMATCH ≠ OBJECT ERROR
ALIGNMENT ≠ RECOVERY OF HIDDEN INFORMATION
VIEW EVIDENCE ≠ CANONICAL STATE
```

---

## 2026-10-03 extension — PAINTING LAW ↔ PLAIN

Exact recovered donor: `/recovery/semantic-painting-v0.8/` — **POLY // Forward Field — Semantic Painting v0.8 · Atlas Dayline**, visibly `YOU’RE AWAKE // FORWARD FIELD`.

Transferable law:

```
underpainting = atmosphere only
live geometry = reach / time / uncertainty / trace / RETURN from state
```

The donor is not current Atlas Dayline planning authority. Its lineage forks:

```
Semantic Painting v0.8  [EXACT RECOVERED DONOR]
        ├──→ /atlas-dayline/              [CURRENT DESCENDANT / PLANNER]
        └──→ /field/moire-route/ trial    [VIEW-ONLY DONOR TRANSFER]
```

The same exact held FIELD object now appears as **A · PLAIN** and **B · PAINTING LAW**. Both share the same object identity, native manifest actions, witness and exact RETURN. Painting adds only fixed atmosphere plus geometry derived from current state/action/evidence.

Machine gate:

```
identity same
native actions same
witness same
exact RETURN same
authority = VIEW_ONLY
```

Browser-local human probes compare object identification, next lawful action retrieval and state/relationship perception. `COPY TRIAL RETURN` emits `field-representation-trial-return/v0.1`; it cannot update CURRENT, QUEUE, Dayline or the native object.

Promotion requires machine parity + human orientation benefit + no next-action regression. Otherwise REVISE once or PARK.

### R&D registry

`EXPERIMENTS.json` records representation hypotheses without turning them into GitHub-issue debt, CURRENT, QUEUE, priority, roadmap promises or route multiplication. Only one experiment may be ACTIVE. It currently holds 18 bounded candidates spanning PLAIN/PAINTING/MOIRÉ isolation and combination, opacity, state→geometry mapping, residue visibility, signal locality, reduced-motion/monochrome/phone parity, print witnesses, lineage/context, forecast-before-effect, Dayline RETURN, cross-host continuity, prior-state ghosts, semantic zoom and donor swapping.

### Five-phase circulation / Wu Xing mnemonic

Traditional Wood → Fire → Earth → Metal → Water generating order is borrowed as a **mnemonic only**, not a FIELD ontology or metaphysical claim:

```
木 WOOD   · GENERATE · donor / hypothesis
火 FIRE   · EXPOSE   · one controlled contrast
土 EARTH  · HOLD     · freeze object / authority / conditions
金 METAL  · CUT      · RETAIN / REVISE / PARK
水 WATER  · RETURN   · witness / lineage / residue → next WOOD
```

It creates no FIELD state or authority. Its useful property is operational: the cycle terminates in RETURN instead of feature accumulation.

Additional boundaries:

```
UNDERPAINTING ≠ STATE
VISUAL LAW ≠ NATIVE ACTION AUTHORITY
R&D REGISTRY ≠ BACKLOG / PRIORITY
MNEMONIC CYCLE ≠ FIELD ONTOLOGY
```

---

## 2026-10-04 extension — LIVE INTERFERENCE MARK

The mismatch instrument now propagates back onto the held FIELD object as a **small conditional property**, not a new panel, route, state or attention class.

### Trigger

For the exact held route, FIELD compares the current representation against available counterprojections using `pair.mjs`.

Automatic candidates remain ordinary FIELD views:

```
AXIAL_LATEST
VISUAL
STRUCTURE
RECENT
+ EVOLVE when evolution data exists
+ VERSIONS when version data exists
```

GLYPH remains an explicit deep comparison rather than an automatic live-mark candidate because it is intentionally lossy.

A mark appears only when the strongest available pair has total disagreement ≥ **0.24**.

Pair disagreement is not canonical error. It asks whether two lawful views of the same held object differ materially in what they retain or where they place its lineage.

### Pair law

For every real fact in the held object:

```
PRESERVED ↔ PRESERVED = 0
DERIVED   ↔ DERIVED   = 0
PRESERVED ↔ DERIVED   = 0.35
DERIVED   ↔ HIDDEN    = 0.70
PRESERVED ↔ HIDDEN    = 1.00
```

Then:

```
pair disagreement
= 0.68 × channel disagreement
+ 0.32 × coordinate disagreement
```

Coordinate disagreement uses the same real manifest lineage/context and the two actual projection coordinate functions.

### The mark itself is the signal

The tiny circular mark attached to the held glyph is not a generic warning icon.

Its two stripe fields encode the selected pair:

- angle separation grows with coordinate disagreement;
- stripe density grows with total disagreement;
- interference opacity grows with channel disagreement;
- border strengthens at high total disagreement;
- reduced-motion keeps the same state without rotation.

Below threshold there is no mark.

No held object means no mark.

### Open / RETURN

Activating the mark opens:

```
/field/moire-route/
  ?focus=<exact held route>
  &projection=<current projection>
  &compare=<counterprojection>
  &ax_*=<existing FIELD tuple>
```

The full instrument continues that exact pair. Its primary moiré field becomes representation × representation; the route-context canvas displays their coordinate-frame displacement. `ALIGN COORDINATES` can collapse coordinate mismatch but cannot erase pairwise channel disagreement.

`COPY REPORT` now emits `field-representation-mismatch/v0.3` with the pair report attached.

RETURN restores the same FIELD route address.

### Continuity

The held aperture rerenders during local orientation actions such as SEEN / UNDO SEEN. The live mark is reattached after such rerenders only when the same material pair still exists. No persistence bit is added.

### Boundary

```
INTERFERENCE MARK ≠ ALERT / PRIORITY
PAIR DISAGREEMENT ≠ CANONICAL ERROR
MOST DIFFERENT VIEW ≠ RECOMMENDED VIEW
ALIGNMENT ≠ INFORMATION RECOVERY
MARK CLICK ≠ EFFECT
```
