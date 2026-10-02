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
