# RESULTS BACK — the collapse investigation, first falsification run

*Self-contained. Hand back to the session that issued the collapse prompt. 2026-09-23.*

---

## WHAT WAS RUN

Your protocol was followed in order: recover → extract → **falsify before building**. Two
spikes were built. The first was flawed and the second was written specifically to break it.

**Both are live:**
- `/spikes/001-canonical-projection/` — the homogeneous run
- `/spikes/002-heterogeneous-collapse/` — the falsification run

---

## FINDING 0 — SPIKE 001 WAS A FALSE POSITIVE, AND YOUR BRIEF CAUGHT IT

Spike 001 used **twelve like-typed tokens** (`water, bear, mudra, …`). All five invariants
passed. **That proves nothing** — a homogeneous fixture survives any projection, because there
is nothing in it for a projection to fail on.

This is the trap named in your brief (*"include deliberately awkward types"*). It is recorded
here because **the failure mode is silent**: it looks exactly like success.

---

## FINDING 1 — THE MODEL LAYER SURVIVES HETEROGENEOUS NODES (8/8)

Fixture: `token · paragraph · image · number · boolean · enum · free-text · relation · action ·
timed · nested · evidence`, through `LINE → RING → SIX-PANEL → ROOM → GLYPH`.

| invariant | result |
|---|---|
| projection does not mutate canonical source | **PASS** — state byte-identical after expressing every node in every projection |
| identity survives every projection | **PASS** |
| focus survives a projection change | **PASS** |
| timed object retains time | **PASS** |
| nested object retains hierarchy | **PASS** |
| operations keep permission/safety boundary | **PASS** |
| RETURN restores the exact prior address | **PASS** — restored projection+focus and reverted a mark added while away |
| provenance stays inspectable | **PASS** |

**Verdict: VALIDATED.** *Identity, address, focus and provenance are projection-independent* —
and this now holds against awkward types, not just uniform ones.

---

## FINDING 2 — THE PROJECTION LAYER DOES NOT (51/60)

**9 of 60 node-projection pairs are inexpressible. Every projection declares at least one.**

| projection | failures | cannot express | because it is |
|---|---|---|---|
| **GLYPH** | **3** | free-text, action, evidence | recognition of identity |
| **LINE** | 2 | image, nested | ordinal + textual |
| **RING** | 2 | paragraph, nested | compact ordinal |
| **SIX-PANEL** | 1 | image | flat, text-slotted |
| **ROOM** | 1 | timed | flat, spatial |

**Verdict: INVALIDATED as stated.** *"Everything is just a projection"* is false. A projection
is a **policy over some dimensions** and each one is blind to at least one.

### The residue is structured, not random

| projection | blind to |
|---|---|
| **GLYPH** (recognition) | **content**, **authority**, **claim+source** |
| **LINE / RING** (ordinal) | **depth**, **raster**, **long content** |
| **SIX-PANEL / ROOM** (spatial) | **raster**, **clock** |

---

## FINDING 3 — THE FOUR IRREDUCIBLE PRIMITIVES

The residue identifies exactly four things that must be **first-class in the grammar**, not
derived from a shape:

1. **CONTENT** — more than identity. A glyph is *recognised*; a paragraph is *read*.
2. **AUTHORITY** — an executable action must never be visually indistinguishable from an inert token.
3. **DEPTH** — hierarchy needs a second axis; every ordinal projection flattens it.
4. **TIME** — a clock is not a face; spatial projections have nowhere to put `t0`/`t1`.

### ⚑ These four independently reproduce four columns of your own primitive matrix

Your matrix listed `CLOCK`, `COMMIT`, `MULTI-SELECT`, `TRANSFORM` as the columns that did not
obviously collapse. **The residue agrees from an independent direction** — derived from
behavioural failure rather than from reading the columns. That agreement is the strongest
evidence produced so far, and it is evidence *for your hypothesis*, not against it: the
primitive set is close, and these four are the ones it is still missing.

---

## FINDING 4 — THE REPO ALREADY HAS A RESIDUE SLOT, AND IT IS ALWAYS EMPTY

`foundry/room/room-core.js` → `makeReturn()` emits the crossing record:

```js
{ object_id, event_ids,
  before:  {route, face},
  after:   {route, face, orientation},
  delta:   [{op:'PROJECT', projection:'INTERPHASE_ROOM', face, axis}],
  evidence:[{source, status:'attested'}],
  residue: [],                                  // ← ALWAYS EMPTY
  next_routes, interphase }
```

Schema `0xxx0/interphase/v0.1`. **INTERPHASE is already a fold/transition record, and it already
reserves a place for what did not survive the crossing — but nothing populates it.**

**This is a direct coupling:** spike 002 *produces* residue; INTERPHASE *has the field for it*.
The two were built independently and meet exactly. That is worth more than either alone.

---

## A HARNESS BUG, RECORDED

First run reported `focus survives a projection change → FAIL`. It was the **test**, not the
claim: one test set a focus that the next one counted, so two nodes appeared at FOVEA. Fixed
with explicit isolation before every invariant.

**A suite that leaks state manufactures failures — and could equally hide one.** Worth assuming
any future green run has been checked for this.

---

## HONEST LIMITS

1. `canExpress()` is a **judgement written by hand**, not yet an observation. Nothing is rendered
   for the heterogeneous nodes — the declared failures have not been *seen*, only *declared*.
2. 12 types, one instance each. No scale test.
3. The stronger claim (`structural DOM = program`; the six regions as one folded DOM) remains
   **untested**. This run tests *model → projection*, not *DOM-as-program*.
4. The six faces were given **application semantics** (PRESENT/RETURN/INPUT/OUTPUT/INTENTION/
   GROUND) by the existing code. Your brief suggests starting from topological names
   (NORTH/WEST/FRONT/EAST/SOUTH/BACK) and keeping roles rebindable. That has not been done, and
   the current naming may be one dashboard layout encoded as metaphysics.

---

## NEXT, SMALLEST FIRST

1. **Render** the heterogeneous fixture in each projection so the declared failures become
   *observed* ones. This is the step that turns `canExpress()` from an opinion into a measurement.
2. **Give CONTENT / AUTHORITY / DEPTH / TIME explicit representation** and re-run. Whatever still
   fails is genuinely irreducible.
3. **Populate INTERPHASE's `residue`** from the spike's output and let the crossing record carry
   what did not survive — so a fold reports its own loss instead of silently discarding it.
4. Then the scale test (≈130 real nodes).

## THE ONE-LINE SUMMARY

*The same thing survives every fold — but no single fold can show everything. The collapse is
real at the model and false at the projection, and the four things the projections cannot carry
are the four primitives the grammar is still missing.*
