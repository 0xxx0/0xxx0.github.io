# SPIKE 001 — ONE OBJECT, MANY PROJECTIONS

## THE QUESTION

> Can one object survive radically different perceptual arrangements without losing
> identity, address, focus, provenance, or action history?

Asked because FOVEA was proposed as a *projection kernel* rather than a feature, and the
load-bearing unknown is whether identity really is projection-independent.

## THE TEST

12 canonical nodes. Four projections — **LINE · RING · ROOM · GLYPH**. One shared state
(`projection`, `focusedId`, `trail`) held OUTSIDE every projection.

The identity glyph is derived from the node **id alone**.

**Why a hash is legitimate here, and was not before.** An earlier build used a hash to invent
the *radii of a figure that claimed to measure something*, and was rightly called decoration.
This is a different job. The requirement is only: *same id → identical mark, forever; different
ids → distinguishable.* That is what a hash is for. **The glyph is an identity, not a
measurement** — it encodes nothing about the object except which object it is. Every other
property appears as an overlay and never alters the base shape.

## RESULTS

| # | invariant | result | evidence |
|---|---|---|---|
| 1 | identity survives every projection | **PASS** | `invariance.identical === true` after cycling LINE→RING→ROOM→GLYPH→LINE |
| 2 | same id → same glyph, different id → different | **PASS** | `glyph('water') == glyph('water')` true; `!= glyph('compost')` true |
| 3 | focus survives a projection switch | **PASS** | focused `mudra` stayed `mudra` across RING and ROOM; exactly one node at FOVEA level |
| 4 | RETURN restores the exact prior tuple | **PASS** | at `GLYPH`/`bear` → RETURN → `ROOM`/`bear` |
| 5 | a typed token manifests immediately | **PASS** | 12 → 13 nodes; typed node present at FOVEA; glyph drawn same frame |

Rendered: 13 glyph groups in one SVG, each a polygon derived from its id.

### The invariance string, verbatim

```
before: water:TERM:code|bear:TERM:code|mudra:TERM:readfield|fix:TERM:code|
        compost:TERM:material|threshold:PASSAGE:readfield|ring:MEASURE:audio|
        cassette:ROUTE:git|fovea:MEASURE:readfield|return:TASK:git|...
after : (identical)
```

## VERDICT: VALIDATED

**The core claim holds.** Identity, address, focus and provenance survived four radically
different perceptual arrangements, and RETURN restored the exact prior tuple. Nothing was
lost in a transition, because nothing about the object belonged to the projection.

`FOVEA is not the radial thing; FOVEA is the law by which one thing remains itself while the
human changes how it is seen.` — that law held under test.

## WHAT THIS DOES **NOT** PROVE — read this before believing anything

1. **This is one model with four renderers, NOT one DOM folded.** The stronger claim elsewhere
   in the repo (ROOM v0.4: *"structural DOM = program"*, fold mutates real DOM and child ids
   survive) is **not demonstrated here**. This spike proves *model → projection* invariance.
   It does not prove *DOM-as-program* reflexivity. Those are two different claims and only the
   weaker one was tested.
2. **12 nodes, not 130.** No scale test. A ring of 130 glyphs is untested.
3. **The ROOM projection is crude.** Face `B` (RETURN) is drawn overlapping `F` to gesture at
   the fold rather than actually folding. It is a sketch of the projection, not the projection.
4. **No real source adapter.** All nodes are hand-seeded. The claim that READFIELD / MATERIAL /
   AUDIO each become an adapter is untested.
5. **Aesthetics were not judged.** The spike exists to fail or pass on the invariant, not to
   look good. It is deliberately unstyled beyond legibility.
6. **The criterion was identity survival — it was not** "is this pleasant to use", "does this
   help a human read faster", or "should this ship". Those remain open.

## IF THIS WERE PURSUED

- Plug in **one real source** next — READFIELD looks cleanest — and re-run the same invariants.
- Then scale: does `identical === true` still hold at 130 nodes across all four projections?
- Then and only then fight about how it looks.

## RUN IT

```
python3 -m http.server 8099 --bind 127.0.0.1
# then http://127.0.0.1:8099/spikes/001-canonical-projection/
```

`window.SPIKE` exposes `state()`, `nodes()`, `setProjection()`, `focus()`, `doReturn()`,
`addToken()`, `glyph()` and `invariance()` so the invariants can be checked without reading
the screen.
