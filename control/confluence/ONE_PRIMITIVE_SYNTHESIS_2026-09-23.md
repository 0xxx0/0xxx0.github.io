# THE ONE PRIMITIVE — synthesis of the POLY/FURNISHER + ROOM + SINDERESIS lineage

Read from the code, 2026-09-23. Sources named for every claim.

## THE FINDING

The thing described as "a key shaped radial sorta thing... 6 div panel thing u can fold
3dimensionally and this sort of radial thing (regular polygon, glyphs beneath)" is not one
invention plus a metaphor. **It is one object seen at three projections, and all three
already exist in this repo.**

| projection | form | where it lives | state |
|---|---|---|---|
| **3-D, folded** | 6-face cube | `foundry/room/room-core.js` — `FACES = {F,R,B,L,U,D}` | v0.4 CANDIDATE |
| **2-D, radial** | regular polygon (hexagon) | the recovered radial generator | fossil / partial |
| **1-D, linear** | the reading line | `recovery/rsvp/` · READFIELD | LIVE 0.8 |

**6 faces at 60° in a plane IS a regular hexagon** — but that is a **chosen chart, not a
geometric consequence of the cube.**

> ⚠️ **CORRECTION 2026-09-23 (external review, verified).** An earlier version of this document
> claimed "a cube's six face-normals, projected, sit at even angular intervals. That is the
> mechanical reason a cube *generates* a regular polygon." **That is false and it has been
> checked.**
>
> A cube has **three opposed pairs along orthogonal axes**. Projected onto any plane the
> normals collapse to **4 distinct directions at 90°, with 2 collapsing to the origin** —
> verified on XY, XZ and YZ. A regular hexagon is **6 directions at 60°**. The projection of
> cube normals is never that.
>
> **What is actually true:** a six-facet canon can *carry* several compatible charts —
>
> ```
> SIX-FACET CANON
>    ├─ radial 6-sector chart   (chosen: 6 at 60°)
>    ├─ cube / net chart        (chosen: adjacency + hinge + orientation metadata)
>    └─ linear six-panel chart  (chosen: six named slots in a row)
> ```
>
> The radial chart is a **deliberate arrangement of six identities**, not a shadow of the cube.
> It is still a valid projection — it is simply not *derived* from the cube, and it needs its
> own adjacency and orientation metadata rather than inheriting it.
>
> **Why this correction matters beyond the arithmetic:** the original claim smuggled a chart in
> as a law, which would have made the cube look canonical when it is one carrier among several.
> A number that cannot name its source file is not allowed on a page; the same rule applies to a
> geometry that cannot name its derivation.

## THE SIX ARE SEMANTIC, NOT DECORATIVE

From `foundry/room/room-core.js`, verbatim:

| face | axis | name | role | the question it answers |
|---|---|---|---|---|
| **F** | +Z | PRESENT | OBJECT | *What is here now?* |
| **B** | −Z | RETURN | PROVENANCE | *What brought this here, and how does it return?* |
| **L** | −X | INPUT | CONTEXT | *What enters, constrains, or precedes this object?* |
| **R** | +X | OUTPUT | ACTION | *What may leave, transform, or become reachable?* |
| **U** | +Y | INTENTION | PURPOSE | *What governs this instrument when presentation changes?* |
| **D** | −Y | GROUND | EVIDENCE | *What is actually supported, checked, or still unresolved?* |

**These six questions are sufficient to address any surface in this repo.** Every route in
`showcase-manifest.json` already carries, in existing fields: title/state/role (F), receipt/
version/parent (B), accepts/inputs (L), emits/outputs (R), question/purpose (U), evidence/
status (D). **The cube is not a new vocabulary laid over the field — it is the field's own
fields, arranged so a human can hold six of them at once.**

## WHY THE FOLD IS LOSSLESS — the law is already written

`foundry/room/release.json` v0.4 states the reason, and it is the answer to
"can u actually fold things and reduce artifacts losslessly":

> **FOLD MUTATES STRUCTURE, NOT A SHADOW MODEL**: contiguous sibling blocks are wrapped in a
> real DOM cassette; child ids survive.
>
> **CASSETTE CLOSED/OPEN = ABSTRACTION VISIBILITY**: one object may be read as a block or
> its implementation.
>
> **RETURN PRESERVES STRUCTURAL DOM + TRACE + BINDING.**

**Loslessness is structural, not aspirational.** There is no second representation that can
drift from the first, because the folded form *is* the unfolded form — one DOM, wrapped.
This is the same reason `space-core.js` can expose `fold(input, ids, opts)` and `dissolve()`
as inverses: nothing is copied, so nothing can be lost.

The supporting evidence is `recovery/poly-furnisher/evidence/FUN.js`, whose nucleus is a
structural `diff(a,b) -> {d,i,s,r}` (deletes, inserts, substitutions, recursion) with a
matching `patch(obj, delta)`. **That is the accounting layer: fold, diff, patch, dissolve.**

## PRIOR ART THE HUMAN NAMED, IN CODE

- **SINDERESIS** (`recovery/poly-furnisher/evidence/NotesforDraftofSINDERESIS.md`, 2019,
  1701 lines, 50 KB, role: *"formal / intention layer"*) — a **10-unit alphabet**:
  the letters `S I N D E R E S I S` ↔ 10 calligraphy strokes (點橫豎提捺撇折鉤彎斜) ↔
  10 Greek letters (ψ δ ε φ γ η ι ξ κ λ). Under `## Upaya` it declares `x <- y` = *"be x
  instead of y"*, and under composite symbols it **decomposes a word into its components:
  `Space, pace, ace, ce, e`**.
  **This is the token→polygon generator.** A token decomposes into strokes; strokes carry
  angles; angles name vertices.
- **INPUT → XFORM → FOCUS → OUTPUT** — named verbatim as the role of
  `recovery/poly-furnisher/evidence/mvp.js`. That is the same cycle the ROOM's L/R faces
  and the fovea's `foveate → ring` chain each describe in their own vocabulary.
- **KRAKEN browser organism** (2019) — role: *"golden executable fossil"*.
- **IMPT xducers/matrix/lenses proto-kernel** (2020) — *"closest integrated proto-kernel
  before formal cleanup"*.

**The lineage is 2019 → 2020 → 2026, and it is the same idea each time.**
This is the third appearance of a pattern already documented for the conversation corpus
and the git history: leave a trace, go quiet, return to the same place.

## WHAT THIS MEANS FOR THE FOVEA LENS

The cursor lens is **not the instrument.** It is one delivery mechanism for the six faces —
a pointer-local readout. It "does nothing of value" because it carries one face (F, PRESENT)
and ignores the other five that are already addressable.

**The instrument is the projection switch:**

```
        ┌─ 3-D ─┐          FOLD          ┌─ 2-D ─┐         SWEEP        ┌─ 1-D ─┐
        │  ROOM │  ◄──────────────►      │ HEXA- │  ◄──────────────►    │ RSVP  │
        │ 6 divs│      dissolve          │  GON  │     linearise        │ line  │
        └───────┘                        └───────┘                      └───────┘
             one DOM. Three projections. Nothing copied. Nothing to lose.
```

- **typing** → tokens decompose → each names a vertex → the polygon redraws (immediate feedback)
- **folding** → the same DOM wraps/unwraps; the hexagon becomes the cube in place
- **sweeping** → the hexagon linearises into the reading line

**All three are one object. That is the universalisable instrument.** The glyph beneath each
vertex is the face's witness, not a decoration — same glyph language as `field-glyph.js`.

## NEXT ACTIONS, RANKED

1. **Write the projection contract first** (`control/PROJECTION_CONTRACT.json`) — declare the
   six faces as the single source, and state that cube / polygon / line are three views of
   it. No new vocabulary: the fields already exist on every route.
2. **Prove the fold is lossless with a test, not a claim** — fold a subtree, dissolve it,
   diff the DOM ids before and after using `FUN.js`'s own `diff`. Publish the result as a
   receipt. This is the claim that most needs evidence.
3. **Build the token→polygon generator as a standalone instrument**, separately from the
   lens, using SINDERESIS's decomposition. Type → polygon. Preview it before wiring it.
4. **Register the six faces as an atlas** — this is the "inventory of self-contained things"
   the human asked for: one entry per face, each self-describing, generated not hand-written.
5. **Only then** return to the cursor lens and let it carry all six faces rather than one.

## THE DISSENT I OWE

- The 2019 material is a **personal formal system**, not a specification. Much of
  SINDERESIS is poetry, pain and philosophy interleaved with its definitions. I am treating
  the *structural* claims (`[s,p,a,c,e]`, the 10-unit alphabet, `x <- y`) as prior art and
  leaving the rest as its author's voice. **It is not evidence of anything by itself.**
- **"Nothing beyond or outside these need exist"** is the strongest claim in the brief and
  the one I would not assert yet. The six faces are sufficient to *address* a surface; they
  are not yet shown sufficient to *generate* one. That gap is what action 1 and 2 would test.
- The room's own release notes record that **a previous attempt at this was rejected by
  direct user evaluation** (SPACE SCALE 0.2's generic canvas). The same idea failing on
  execution once already is the strongest reason to preview before building.
