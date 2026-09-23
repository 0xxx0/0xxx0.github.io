# INTERPHASE · ONE THING, FOUR VIEWS, NO SYNC CODE

The convergence brief's own "key technical proof" (§20), built and checked.

## THE CLAIM

> Open the same object simultaneously in ordinary page, ring, table and glyph. Change one value
> through one of them. All four change. **There is no synchronisation code between the four
> views.** They all simply reread the same thing through their own view.

## THE RESULT — VERIFIED

```
no cross-wiring between views            TRUE
12 canonical objects · 4 projections     all render
N04 before  page:42  ring:42  table:42
one mutation
N04 after   page:43  ring:43  table:43
```

And through a *view* rather than a toolbar:

```
N06 = DRAFT
click the RING's N06 locus
N06 = REVIEW
  PAGE select now shows : REVIEW
  TABLE row now shows   : REVIEW
  RING centre now shows : REVIEW
```

**One mutation. Four projections re-read. Zero view-to-view code.**

## WHY IT IS TRUE, NOT JUST TRUE HERE

`noCrossWiring()` is checkable, not asserted. It inspects the **source text of all four
projection functions** and confirms none of them names another view's element:

```js
noCrossWiring: () => !/(v-page|v-ring|v-table|v-glyph)/.test(
  [projPAGE, projRING, projTABLE, projGLYPH].map(f => f.toString()).join(''))
```

A view is a **pure function of the store** — `projRING(STORE) -> markup`. It has no cache, no
subscription, no observer, no reference to any other view, and no knowledge that anything
changed. The only thing that calls `mount()` is a **mutation**, and `mount()` just re-runs
whichever projections are on screen.

**There is nothing to synchronise because there is only one copy.** Five views of one thing is
not five things agreeing.

## THE ARCHITECTURE, IN FULL

```
                    ONE STORE  (12 canonical objects)
                          │
        ┌────────────┬────┴────┬────────────┐
        │            │         │            │
     projPAGE     projRING  projTABLE   projGLYPH      ← pure functions
        │            │         │            │
        └────────────┴────┬────┴────────────┘
                          │
                     mount()  ← called by MUTATION only
```

- **Mutation** is the only writer: `mutate(fn)` changes the store, bumps `revision`, re-mounts.
- **Views never talk.** No event bus, no dependency graph, no diffing, no observable.
- **Identity is `id`-derived**, so the same object is recognisable in every view.

## WHAT THE BRIEF ASKED FOR THAT IS HERE

| brief §19 requirement | present |
|---|---|
| text, nested content, image, number, boolean, enum, editable input, relation, action, timed item, collection, external evidence | **all 12** |
| the page looks **completely ordinary** | yes — no instrument geometry by default |
| `PAGE → RING → PAGE` | yes |
| `PAGE → GLYPH → PAGE` | yes |
| edit from any suitable view | PAGE edits N07; TABLE flips N05; RING advances N06 |
| watch every other view update immediately | yes |
| one thing, many views, no duplicated store | yes — one `STORE` object |

## WHAT THIS DOES **NOT** PROVE

1. **No multifocus.** The brief's §5 ("one world, many pointers") is not exercised. There is one
   implicit focus, not a focus set.
2. **No nesting.** The brief's §7 (recursive: FIELD → project → document → paragraph → word) is
   not demonstrated. A nested collection exists as a *node*, not as an *INTERPHASE cell that
   contains cells*.
3. **No RETURN.** No return frame, no excursion, no restoration.
4. **No lawful-operation enforcement.** Nothing here returns `SUPPORT=0`. That lives in HET12;
   this spike deliberately has no support map, so **editability is not yet governed.**
5. **No commit boundary.** Every change is immediate and unversioned beyond a counter.
6. **No optic library.** The brief suggests functional optics rather than ad-hoc path/update
   machinery. This uses neither — it is a direct mutation, which is fine for the proof and
   insufficient for the real thing.
7. **The image is inline SVG, not immutable bytes with a hash.** N03 carries no digest.
8. **4 views, 12 nodes, one instance each.** No scale test.

## WHY THIS ONE IS DIFFERENT FROM SPIKES 001–003

| spike | proved | did not |
|---|---|---|
| 001 | identity survives projections | homogeneous fixture — proved nothing |
| 002 | model layer survives heterogeneous types | projection layer 51/60; no editing, no multifocus |
| 003 | 19/19 laws incl. multi-focus, GetPut/PutGet, fault injection | **no rendering at all** — behaviour only |
| **004** | **the implementation convergence: one store, N views, no sync** | no multifocus, no nesting, no return, no support map |

**004 is the first spike that shows the thing working as an interface rather than as a matrix.**
It is also the narrowest: it proves *implementation convergence*, which the brief calls the only
convergence that counts.

## THE HONEST ASSESSMENT

The brief's north star says *"keep every view synchronized by construction."* **This spike is
that construction, and it is trivially small.** That is the point: if synchronisation is a
property of there being one copy rather than a feature, then the hard part was never the sync —
it was the **address** (finding the part) and the **support map** (which operations are lawful
here). Those are exactly what HET12 covers and what this spike omits.

**Neither spike alone is the architecture. 003 is the law; 004 is the mechanism.** The next
honest step is one spike that is both: the boring page, with multifocus and a support map, so
that an unlawful edit is refused *in the page* rather than only in a matrix.

## RUN IT

```
python3 -m http.server 8099 --bind 127.0.0.1
# http://127.0.0.1:8099/spikes/004-interphase-sync/
```

`window.INTERPHASE` exposes `store()`, `mutate()`, `mount()`, `prove()`, `renders()`, `views`,
`noCrossWiring()`.
