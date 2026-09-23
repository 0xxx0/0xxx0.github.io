# BRIEF FOR AN EXTERNAL MODEL — collapse everything into one primitive

*Self-contained. Written 2026-09-23 to be handed to a model with no prior context.*

---

## THE CLAIM TO TEST

A single interface primitive can express **every** surface in a personal repository of ~130
HTML tools, and the repository can be collapsed into instances of it **without loss**.

The primitive is a **6-face addressable object** with **three projections of the same DOM**.

---

## WHAT ALREADY EXISTS (verified, not proposed)

### 1. The six faces — `foundry/room/room-core.js`

```js
const FACE_ORDER = ['F','R','B','L','U','D'];
const FACES = {
  F:{axis:'+Z', name:'PRESENT',   role:'OBJECT',     question:'What is here now?'},
  B:{axis:'-Z', name:'RETURN',    role:'PROVENANCE', question:'What brought this here, and how does it return?'},
  L:{axis:'-X', name:'INPUT',     role:'CONTEXT',    question:'What enters, constrains, or precedes this object?'},
  R:{axis:'+X', name:'OUTPUT',    role:'ACTION',     question:'What may leave, transform, or become reachable?'},
  U:{axis:'+Y', name:'INTENTION', role:'PURPOSE',    question:'What governs this instrument when presentation changes?'},
  D:{axis:'-Y', name:'GROUND',    role:'EVIDENCE',   question:'What is actually supported, checked, or still unresolved?'}
};
```

Each face declares what it **reads** from an object — e.g. `F` reads `['object','state','role']`,
`B` reads `['receipt','version',...]`, `D` reads `['evidence',...]`. The six faces are therefore
**typed field-selectors**, not metaphors.

### 2. The same six faces are the six regions of a standard application shell

This is the correspondence the author asserts, and it holds:

| face | shell region | what it carries |
|---|---|---|
| **U** INTENTION | **header** | what this is for; title, purpose, mode |
| **L** INPUT | **left panel / nav** | what enters, constrains, precedes |
| **F** PRESENT | **main** | the object itself, now |
| **R** OUTPUT | **right panel** | what may leave, transform, be reached |
| **D** GROUND | **footer** | status, evidence, what is verified |
| **B** RETURN | **the folded/back layer** | provenance — revealed by folding |

A "6 div panel thing you can fold 3-dimensionally" is **an ordinary app shell whose six regions
are semantic.** The cube is not a visual conceit; it is the shell, rotated.

### 3. The three projections are one object

- **6-D / folded** — the shell as a cube; regions fold into each other
- **2-D / radial** — the six faces placed at 60° intervals → **a regular hexagon**
  (a cube's six face-normals project to even angular intervals — this is why a cube
  "generates a regular polygon", mechanically, not by analogy)
- **1-D / linear** — the six faces stepped in sequence → **a horizontal reading line**

### 4. The fold is lossless — PROVEN

Tested on `foundry/room/space-core.js`:

```
before   : 7 nodes  bound,compile,compiler-room,intent,return,search,verify
fold     : ok · composite 'cassette-1' created · 3 children re-parented · child ids survive
dissolve : ok · 7 nodes · identical id set · every parent restored
missing  : (none)        added : (none)        LOSSLESS: true
```

**Mechanism, not magic:** `fold()` **re-parents existing nodes** and `dissolve()` **re-parents them
back**, removing only its own wrapper. **Nothing is copied, so there is no second representation
that can drift.** The project states this as law:

> *FOLD MUTATES STRUCTURE, NOT A SHADOW MODEL: contiguous sibling blocks are wrapped in a real
> DOM cassette; child ids survive.* — `foundry/room/release.json` v0.4

Guard rails verified: folding one node → `NEED_TWO_OR_MORE_NODES`; folding across parents →
`SELECTION_MUST_SHARE_PARENT`; dissolving a leaf → `NOT_COMPOSITE`.

### 5. Prior art in the same repository (2019–2020, recovered)

- **SINDERESIS** (`NotesforDraftofSINDERESIS.md`, 1701 lines, "formal / intention layer") — a
  **10-unit alphabet** mapping `S I N D E R E S I S` ↔ 10 calligraphy strokes
  (點橫豎提捺撇折鉤彎斜) ↔ 10 Greek letters (ψ δ ε φ γ η ι ξ κ λ). It defines `x <- y` as
  *"be x instead of y"*, and decomposes a token into components: **`Space, pace, ace, ce, e`**.
- **FUN.js** ("broad functional nucleus") — a structural `diff(a,b) -> {d,i,s,r}`
  (deletes, inserts, substitutions, recursion) with a matching `patch(obj, delta)`.
  **This is the lossless accounting layer.**
- **mvp.js** — role stated as **"INPUT→XFORM→FOCUS→OUTPUT contraction."**
- **KRAKEN** (2019) — "golden executable fossil."

---

## WHAT IS BEING ASKED OF YOU

### A. Formalise the primitive

Define it precisely enough to be implemented and tested. At minimum specify:

1. **The atom.** Is a surface an ordered 6-tuple of values — one per face? What are the types
   permitted per face? What is a *partial* atom (a surface that has, say, no provenance)?
2. **The projections.** Give the exact mapping between folded / radial / linear. Prove they are
   the same object, not three encodings.
3. **The composition rule.** When two atoms fold into one, what happens to each of the six faces
   of each? Is the result an atom? Is composition associative? Is there an identity atom?
4. **The losslessness condition.** State it as a theorem: *a fold/dissolve round-trip preserves
   X*. Define X exactly. (Coordinates and recomputed ports are known NOT to be preserved —
   see below — so X is not "everything".)
5. **The sequencing claim.** The author asserts that because the form *can be sequential*, a
   linear projection "slides out" and can be stepped through like a **cryptex** — rotating one
   ring at a time. Formalise the step function and say what is invariant across steps.

### B. Attempt the collapse

Given the atom, try to express **each** of these as instances of it, and be explicit where it fails:

| class | example surface |
|---|---|
| a document reader | an RSVP / speed-reading surface |
| a navigator | an index over ~130 routes |
| a composer | a code/text editor with structured seams |
| an audit | a validator reporting pass/fail per route |
| a media player | the project also has an audio-glyph radial instrument |
| a freeform drawing surface | a canvas tool |

**Report honestly which of these resist the atom.** A primitive that covers 4 of 6 with a clear
account of why the other 2 resist is more valuable than a claim of 6 of 6.

### C. State the strongest objection

Then answer it.

---

## KNOWN LIMITS — DO NOT OVERCLAIM

1. **Coordinates and ports are NOT preserved.** `fold()` recomputes geometry from the children's
   bounds and recomputes boundary ports. A round-trip does not restore original x/y/w/h.
2. **Only a 7-node seed model was tested.** Larger and cyclic models are untested.
3. **The six faces are proven sufficient to ADDRESS a surface. They are NOT yet shown sufficient
   to GENERATE one.** This is the load-bearing gap.
4. **A previous implementation of this exact idea was rejected on direct user evaluation** —
   *"SPACE SCALE 0.2 had useful typed fold/dock/run semantics but the generic canvas was rejected
   by direct user evaluation"* (`foundry/room/release.json`, corrections). The idea surviving is
   not evidence the execution will.
5. **The 2019 material is a personal formal system, not a specification.** Its structural claims
   are usable; much of the surrounding text is poetry and philosophy and proves nothing.

---

## WHAT A GOOD ANSWER LOOKS LIKE

- A formal definition of the atom and its three projections, with the equivalence stated as a
  property that can be tested.
- A fold/dissolve losslessness theorem with an explicit preservation set.
- An honest account of which existing surfaces do **not** fit, with the reason.
- The single strongest objection, and the answer to it.
- If the claim fails, say where — an INVALIDATED result with a precise reason is a success.
