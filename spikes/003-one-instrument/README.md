# SPIKE 003 — ONE INSTRUMENT / FLOWER-KEY ROUND TRIP

## Question

Can the existing convergence claim be made concrete without creating another sovereign application?

This spike extends the earlier projection work into one runnable instrument using the heterogeneous fixture and the residue discovered by SPIKE 002.

The target is deliberately bounded:

`CANONICAL FIELD → LINE / FLOWER-KEY / RADIAL / ROOM / GLYPH → RETURN`

## What is new here

1. One heterogeneous canonical fixture.
2. One mutable workspace state outside every projection.
3. One persistent six-panel DOM used by both **FLOWER-KEY** and **ROOM**.
4. Explicit first-class residue primitives: **CONTENT / AUTHORITY / DEPTH / TIME**.
5. Exact state fingerprints across projection cycles.
6. Exact RETURN checkpoints.
7. A headless self-test plus an in-page DOM identity check.

The six panels are offices, not ontology:

`SOURCE · FRAME · FOCUS · OPERATE · WITNESS · RETURN`

FLOWER-KEY arranges those same DOM nodes around FOCUS. ROOM only changes their CSS geometry into six cube faces. It does not recreate the panels or own state.

## Results

Run:

```bash
node spikes/003-one-instrument/selftest.mjs
```

Expected:

```text
PASS
11 / 11 state invariants
9 declared projection residues
CONTENT · AUTHORITY · DEPTH · TIME explicit
```

The browser adds a twelfth check:

`same_six_panel_dom_flower_room`

This compares the actual panel element identities before and after FLOWER-KEY → ROOM. The same six elements must survive.

## What the proof means

The model-level collapse continues to hold.

Projection universality still does not.

The instrument therefore follows this rule:

> A projection may suppress a dimension, but it may not own or erase that dimension.

The explicit residue remains:

| projection | residue |
|---|---|
| LINE | image, nested depth |
| RADIAL | paragraph, nested depth |
| FLOWER-KEY | image raster |
| ROOM | external clock |
| GLYPH | free text, action authority, evidence claim+source |

Those nine failures are surfaced in the UI rather than concealed.

## Safe operator

The page exposes `SAFE ANNOTATE`.

It writes only a session mark. No external execution, send, purchase, file mutation, or remote commit authority is present.

Authority state is visible separately and survives projection changes.

## API

`window.SPIKE3` exposes:

```text
state()
fixture()
setProjection(name)
focus(id)
doReturn()
run()
domInvariant()
panelRefs()
```

## Run locally

```bash
python3 -m http.server 8099 --bind 127.0.0.1
# http://127.0.0.1:8099/spikes/003-one-instrument/
```

## Stop condition

Do not migrate production heads because this page passes.

This spike earns only the next step: use the deletion map to identify shells that may be demoted, then migrate one real adapter at a time while preserving each host's unique residue.
