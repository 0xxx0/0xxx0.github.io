# SPIKE 002 — CAN THE COLLAPSE SURVIVE HETEROGENEOUS NODES?

## WHY THIS EXISTS

Spike 001 used twelve **like-typed** tokens and passed every invariant. **That proves nothing.**
A homogeneous fixture survives anything. This run uses the twelve deliberately awkward types
the collapse protocol specifies, and reports every failure rather than rounding it off.

## THE FIXTURE

`token · paragraph · image · number · boolean · enum · free-text · relation · action · timed · nested · evidence`

Through `LINE → RING → SIX-PANEL → ROOM → GLYPH`.

## RESULT 1 — THE MODEL LAYER SURVIVES

**8 / 8 behavioural invariants PASS.**

| invariant | result |
|---|---|
| no source mutation during projection | **PASS** — canonical state byte-identical after expressing every node in every projection |
| identity survives every projection | **PASS** — 12 nodes identical through LINE→RING→SIX-PANEL→ROOM→GLYPH→LINE |
| focus survives a projection change | **PASS** — focus held, exactly one node at FOVEA |
| timed object retains time | **PASS** |
| nested object retains hierarchy | **PASS** |
| operations keep permission/safety boundary | **PASS** |
| RETURN restores the exact prior address | **PASS** — restored projection + focus and reverted a mark added while away |
| provenance stays inspectable | **PASS** |

**So the claim "identity, address, focus and provenance are projection-independent" holds
against heterogeneous types.** That part is not in doubt any more.

## RESULT 2 — THE PROJECTION LAYER DOES NOT

**51 / 60 node-projection pairs are expressible. 9 fail.** Every projection declares at least
one thing it cannot express:

| projection | failures | what it cannot express |
|---|---|---|
| **GLYPH** | **3** | free-text, action, evidence |
| **LINE** | 2 | image, nested |
| **RING** | 2 | paragraph, nested |
| **SIX-PANEL** | 1 | image |
| **ROOM** | 1 | timed |

### The residue is structured, not random

The failures cluster into **classes**, and the classes differ per projection — which is the
finding:

| projection | is a … | and therefore cannot carry |
|---|---|---|
| **GLYPH** | recognition of identity | **content** (free-text), **authority** (action), **claim+source** (evidence) |
| **LINE / RING** | ordinal + compact | **depth** (nested), **raster** (image), **long content** (paragraph) |
| **SIX-PANEL / ROOM** | flat spatial | **raster**, **clock** |

## VERDICT: PARTIAL — and the partial is the useful part

- **Collapse at the MODEL layer: VALIDATED.** One object does survive every projection without
  losing identity, address, focus, provenance or return. Spray 001's result holds under
  heterogeneous types.
- **Collapse at the PROJECTION layer: INVALIDATED.** No projection is universal. **"Everything
  is just a projection" is false as stated** — a projection is a *policy over some dimensions*
  and each one is blind to at least one.

### The irreducible primitives the residue identifies

Four things no projection in this set can currently express, which must therefore be
first-class in the grammar rather than derived from a shape:

1. **CONTENT** — more than identity. A glyph is recognition; a paragraph is not recognisable, it is read.
2. **AUTHORITY** — an executable action must never become visually indistinguishable from an inert token.
3. **DEPTH** — hierarchy needs a second axis; every ordinal projection flattens it.
4. **TIME** — a clock is not a face. A spatial projection has no place to put `t0`/`t1`.

**Note these four are exactly the columns in the brief's own primitive matrix that did not
collapse** (`CLOCK`, `COMMIT`, `MULTI-SELECT`, `TRANSFORM`). The residue agrees with the
hypothesis from an independent direction, which is the best evidence in this spike.

## A HARNESS BUG WORTH RECORDING

The first run reported `focus survives a projection change → FAIL`. That was **my test, not the
claim**: `testReturn` sets a focus, and the next `run()` counted it, so two nodes appeared at
FOVEA. Fixed by resetting focus/selection/marks before every invariant.

**A test suite that leaks state will manufacture failures and, worse, could hide one.** The
isolation step is now explicit in the source.

## WHAT THIS DOES NOT PROVE

1. `canExpress()` is a **declaration**, not a measurement — it encodes my judgement of what
   each projection can carry. It is falsifiable but it is not yet falsified by rendering.
2. **Projections are not implemented here** — no glyph, ring or panel is drawn for the
   heterogeneous nodes. Spike 001 drew them for uniform nodes only.
3. Still a **small fixture**. 12 types, one instance each.
4. The stronger claim (`structural DOM = program`) remains **untested**.

## NEXT, SMALLEST FIRST

1. **Render** the heterogeneous fixture in each projection and confirm the declared failures
   are real — i.e. turn `canExpress()` from a judgement into an observation.
2. Give **CONTENT / AUTHORITY / DEPTH / TIME** an explicit representation in the grammar and
   re-run; the residue should shrink. Whatever still fails is irreducible.
3. Only then attempt the scale test (130 real nodes).

## RUN IT

```
python3 -m http.server 8099 --bind 127.0.0.1
# http://127.0.0.1:8099/spikes/002-heterogeneous-collapse/
```

`window.SPIKE2` exposes `run()`, `summarise()`, `projectionsDeclaringFailures()`,
`typesDeclaringFailures()`.
