# SLEEPER // LADDER — instrument spec (v0.4.0)

**One painting, four distances, and the city is made of Buddhadhamma.**

The thesis is unchanged from 0.1.0 (`recovery/sleeper/DESIGN_SPEC.md`): *make
painting and city the same object at different resolutions.* 0.2.0 gave the city
its matter and its gates. 0.3.0 makes the city **conditional**: the weather you
meet is the weather you brought, and the first gate is not a question but an act
of attention. Both are mechanics, not quotations — the doctrine is in what the
walker has to do, and no doctrine word appears on the page. 0.4.0 answers the
first real walk: the boundary is drawn, the same field can be stood in, and the
walk now carries a reading head — see §"The first walk" below.

| distance | what exists on screen |
|---|---|
| FAR | `borrowed-river/landscape.jpg` whole, hairline frame, eight unlit lamps scratched on the frame, the distance notch, one hairline title row |
| NEAR | the WHOLE 96×32 frame in the painting's own box, at character resolution: luminance → cell tone, the painting's own edges → walls (carrying the book's characters), hue → district tint; one hold opens a 9×9 loupe |
| ENTERED | a walkable window of that field; swipe or arrow keys step; tap or hold decodes a cell; ONE district band (the district you stand in) is outlined in hairline and its weather is stitched along that boundary; the sight gate stands at its threshold, broken-ringed until seen; the frame's eight lamps say how many gates are lit |
| RISE | (a held state inside ENTERED, not a fifth distance) holding the sight gate's ring lifts the view from the walked window to the whole field: the rooms dissolve, the field resolves, and one district's outline comes up with its weather — the district seen whole |
| EXITED | the route recomposed into the painting (walked tiles shift inside a band measured from their own texture, the walked path lies in hairline ink); the foot line carries the instrument's own numbers |

## Data pipeline

```
landscape.jpg (2172x724, sha256 7b1e50ff…)
  └─ canvas getImageData ──> rgba[2172*724]
        └─ imageField: 96x32 cells (the painting's own 3:1 frame)
             lum  = mean luminance          -> cell tone + elevation ramp over the
                                               PAINTING'S own range (pad -> line)
             edge = mean |∇lum|             -> wall (top quantile that OPENS the
                                               largest walkable district; ladder
                                               [0.62,0.70,0.78,0.86,0.92])
             hue/sat -> district 0..7 + neutral
             tex  = sd(lum)                 -> recomposition band width

buddhadhamma.github.io  (fetched ONCE, LOCAL ONLY)
  └─ void-anchor/sleeper/corpus/buddhadhamma/   raw/*.html · text/*.txt · heads/*.json
       │                                        (never served, never committed)
       ├─ extract.py      HTML -> one paragraph per line + heading anchors
       │
       └─ derive-source.mjs   PROVENANCE -> SELECTION -> MAPPING -> PROJECTION
            │                 selection: the first 9 prose paragraphs of each page
            │                 (>=40 chars, >=6 words, not a caption, not a citation,
            │                  not the Pali recension block, not a duplicate line)
            │                 28 districts / 6,925 characters of 2,502 corpus paragraphs
            │
            ├─ ladder-core.parseSource   ¶=district  sentence=building  word=room
            │                            character=material
            │                            punctuation -> . window  , rain  ; : lamp  ? ! beacon
            ├─ ladder-core.projectCells  cell n <- unit floor(n·U/3072), reading order
            └─ sleeper/ladder/source-dhamma.json   WHAT SHIPS (37 KB)
                   provenance · selection (sha256 of the selected text) · counts
                   matter (3072 chars, one per cell)
                   cells  (p / s / w per cell, base36 — coordinates into the structure)
                   districts (one cited line <=92 chars + the word its word-gates ask for)

measureDistricts: cells -> 28 bodies (punctuation counts) + 4,678 boundary sides
weatherFold:      district run of the walk -> the carried weather chain
walk (U/D/L/R witness) -> hash32(paintingTag + '|' + witness) -> recompose
```

Drawn counts are asserted against the source's own counts at render time (28
districts = 28 districts, 50 buildings = 50 sentences, 1,217 of 1,257 rooms —
0.2.0's release note said 1,228, which was stale; the drawn count is 1,217 and the
selftest prints it every run). The slice is fetched from the artifact; if it fails
to validate the page prints the gap in the world's own strip and refuses to build
a city out of nothing.

**The book's text is not republished.** The public artifact carries a sampled
projection (3,072 characters of matter), index coordinates into the real
structure, and one short cited line per district with its locator. The raw pages
and the extracted text stay in `void-anchor/sleeper/corpus/buddhadhamma/`. The
foot of the page names the source, the edition and the retrieval date, read live
from the shipped file.

## Weather: carried, not assigned (v0.3.0)

The four marks used to be a property of the cell — a comma landed here, so this
cell rained. At phone size that was invisible: **83 marks in 3,072 cells**, and
nothing to read. Weather is now a district state with a law:

1. **A body.** Each district's weather body is the punctuation its *own* cells
   carry: 31 windows / 40 rain / 11 lamps / 1 beacon across the city, and 17 of
   the 28 districts carry more than one.
2. **A wheel.** The four marks stand in the mapping's own order —
   `window → rain → lamp → beacon`.
3. **The law.** The weather you carry out of the previous district turns the
   wheel one notch, and the district you enter becomes **the first weather its own
   text carries going round from there**. A district whose text carries no
   weather at all (¶23) lets the carry pass through untouched. The first district
   of a walk rules by its own heaviest mark, because nothing was carried in.

So the next district's weather is a pure function of (the weather carried out of
the previous district, that district's own units). Nothing is assigned, nothing is
random, no clock is read. Walk it and the city changes underfoot: measured on the
shipped source, a straight walk down the city changes weather 24 times in 28
districts, and **10 of the 24 inner districts are a different weather depending on
which side you enter from** (¶10 via ¶9 is rain; via ¶11 it is window).

*Why the wheel, and not "the loudest mark wins":* the loudest-mark rule — and
"your weather persists wherever the district can hold it" — both collapse to a
single weather for 24 of the 28 districts, because every district's body is
dominated by window/rain. A constant dressed as a mechanic is worse than no
mechanic; the wheel is the smallest rule that keeps both terms (your carry and the
district's own text) load-bearing on every step. Receipt:
`AXIS/work/sleeper-doctrine-2026-10-25/weather-law.txt`.

**How it is drawn.** The district you stand in is one band: every side of its own
cells that borders another district, as a hairline, with the weather stitched along
the horizontal runs — ticks for rain, slits for window, crosses for lamp, rings for
beacon. The rhythm is at most one mark per cell in a room and finer in the
overview. Cross a boundary and the band moves with you, so the thing that changes
underfoot is the thing you carried.

## The sight gate: entry is admitted by an act (v0.3.0)

The first gate is **samma-ditthi** — right view — and it is not a quiz. It stands
as a threshold on the walk, drawn as a **broken ring**; while the district behind
it has not been seen whole, the step into it is refused. The refusal is silent
(no prompt, no score, no words): the ring flares once and the step does not
happen. The act that opens it is attention — press the ring and hold: the view
lifts out of the walked window toward the whole 96×32 field, everything but that
district dims, and the district's own outline (its real boundary, stepped where
its text steps) draws itself until the shape is legible. Hold is satisfied at
`SEEN_AT = 0.9` of the lift; let go early and the district settles back unopened.

Only then does the gate light, and only then is its cited line spoken — the first
sentence of the district it guards, in exactly the voice every district uses when
you step into it. (Accessibility: a keyboard cannot hold, so one press of
Enter/Space while standing next to an unseen sight gate begins the same sustained
look; reduced motion gets the same act in three still steps instead of a sweep.)

Gates 2–8 still ask one word of the district's own line. One gate is the
experiment; the law lives in the act.

## The first walk (v0.4.0)

The operator walked 0.3.0 and said: *"its pretty dope. Please continue!"* — with
four asks. They are answered here in the order they arrived, each with the
measurement that decided it.

### 1. "I can't move up beyond a certain margin"

**Diagnosis: the clamp is the wall map, not a canvas or district bound — and the
defect was that the wall was drawn as floor.**

Measured on the shipped painting (cut = the 0.78 quantile of cell edge energy,
`edge > 0.2015`):

| fact | before (0.3.0) |
|---|---|
| wall cells | 675 of 3,072 (22.0 %) |
| wall cells drawn as walls | **0** (a 0.18 fill and the same glyph channel as open ground) |
| reachable from the spawn | 2,364 cells, bbox x 0..95, **y 0..31** — the whole frame |
| the walk north from (47,15) | 15 → 14 → 13, refused at (47,12) (`edge 0.212`) |
| open sides at the spawn | **N, S only** (the spawn sits in a one-cell-wide shaft) |
| rows of the city visible north of the walker | 9 (window rows 6..14 of 32) |

So: the vertical extent was never clamped — every row of the field is reachable
(selftest arm: reach bbox rows 0..31). What was accidental was that the first
thing a walker tries, north, is a ridge three cells up, and nothing on screen
said so. Two things changed, both presentation, both derived from the field:

* **a wall wears its face.** `wallFaces()` strokes every side of a wall cell that
  meets walkable ground — 672 strokes; the 3 fully enclosed cells stay quiet, so
  the mark IS the walkable boundary and not a texture.
* **a refusal is a place.** The refused step marks that shared edge in white
  (one hairline, in place, cleared on the next accepted step), and the foot line
  names the sides still open, from `openSides()` — the same function the walk
  uses: `wall — the painting's edge says no · open south, west`.

The eye (below) makes the same wall a block whose height is the cell's measured
edge energy, so the ridge is a range you can see the shape of. Nothing about the
walk's geometry changed: the route is the route, and the gates are where the
distance field puts them.

### 2. The eye — a first-person view of the same field

One toggle, no button. Closed-form ground-plane projection in
`ladder-core.js` (`FPV`, `fpvLayout`, `fpvRow`, `fpvPoint`, `fpvQuad`):

```
depth z cells ahead   ->  y = horizon + f*eye/z      one cell wide = f/z
lateral u cells       ->  x = w/2 + f*u/z
horizon = 0.32 * view height      f = 0.92 * view width
eye 1.20 cells at rest, 0.50 low, 2.40 fully raised
```

A cell is drawn as a **trapezoid** (near edge wider than far edge), rows are
painted far→near, walls are extruded to `0.22 + 1.15 × edgeNorm(cell)` (height is
the cell's own measured edge), gates are rings lying on the ground, and the
district's boundary is projected with its weather stitched along it at one mark
per room. The camera stands on the walker's own cell (its centre is under your
feet, so the cell is not drawn), faces **north — the text's own reading
direction** — and:

* **hold raises the eye line** (1.20 → 2.40 cells over ~0.9 s, settling in ~0.5 s
  on release). Reusing the hold is the point: the same press that decodes a room
  in the plan raises the eye here, and a tap still decodes.
* **the horizon never moves** — not with the eye, not with the resize
  (0.3200 at 390×745 and at 1024×700; asserted).
* **the view is the instrument, not a second one**: it samples `S.field.cells`
  (the cells ENTERED walks), and `measureRoute('RRRRUU')` returns sha256
  `93b650de…`, seed `45d716cc`, mad64 `0.084037` with the eye on and with it off.
* **no new data, no new route, no framework**; the page still has four elements.

Reachability without chrome: **two fingers on the field**, or **a held press
(560 ms) on the distance corner** — the corner that already carries the distance
gains a fifth tick while the eye is on. Deep link `#fpv` for a proof or a share.

Known limit, named: the eye shows ~15 rows legibly and compresses the rest into
the horizon line. That is what a ground camera does to a 32-row field; the plan
remains the map, and the eye is a place to stand, not a second map.

### 3. The RSVP rings — what they actually are

`/rsvp/` is **THE RING**: a game layer over READFIELD's aperture — a circular
reading-progress ring (`ring.setAttribute('stroke-dashoffset', C*(1-p))`), a
sweep, gate sectors with three candidate words each, and its own ledger
(`ring.ledger.v1`). It is a separate instrument on a separate route with its own
source loader. **The ladder never had rings**; its only rings are the eight gate
rings drawn in `drawGates()`.

What crossed over is the smallest faithful part — **the seam where "now" sits**:

* `readingHead(field, n)` measures your ordinal in your district's own text order:
  `i = n - n0 + 1` of `n1 - n0 + 1` (the district is a contiguous run of cells in
  row-major order — the order the matter was projected in).
* on the **existing hold** (the same one that opens the decode) a hairline ring is
  drawn around your cell: its arc is `i/of` of the circle, its seam is a radius at
  "now", and the decode's first line says `reading head 146/217 of ¶12`.
* at rest there is no ring: a reading head that is always on is decoration.

### 4. The field note

The operator's self-critique, verbatim, drawn on the canvas in the quiet type and
nothing else. Reached by **holding the frame's top-left crop-mark** or by
`#note`; a tap puts it away. No element, no panel, no route; the selftest asserts
all six strings byte for byte and that a tampered note is not what ships.

**Budget for the whole pass:** one toggle (the eye) + one reveal (the note).
Page elements 4 → 4. Routes 0 → 0. Wall marks and the reading head are marks on
objects that already existed.

## Determinism contract

- `paintingTag = hash32(PAINTING_ID + sha256(painting bytes))` = `f0f09635`.
  Unchanged: the painting still names itself.
- `sourceFingerprint = hash32('buddhadhamma@1|' + sha256(selected text))` =
  `bbbe96ac`. The selection is the identity: the same selection reproduces the
  file byte for byte; a different window (8 instead of 9) gives `81585e34`.
- `routeSeed = hash32(paintingTag + '|' + witness)`.
- `recompose(rgba, field, witness)` is pure. Unvisited tiles are untouched, so
  **the empty route IS the original bytes** (mad64 = 0, changedPx = 0). The hash
  only orients the per-tile tone sign inside a band measured from that tile's own
  texture; it never invents a coordinate.
- `weatherFold(bodies, districtRuns(witness))` is pure: same witness, same chain,
  in every process. The chain is a fold over the *district run* of the walk, so
  re-entering a district re-expresses it from the side you came.
- Blocked steps never enter the witness; a step refused by an unseen sight gate
  is not a blocked step and not a move — it does not enter the witness either.
- No `Math.random`, no `Date`, no `performance.now` in core, instrument or page
  (asserted by the selftest). Motion rides `requestAnimationFrame` timestamps.
  The reading ledger is ordered by visit, not clock.

Measured on the real painting (Chromium, 390x844, dpr 2, receipt in
`AXIS/work/sleeper-doctrine-2026-10-25/`):

| pair | measurement |
|---|---|
| rest (empty witness) vs original | mad64 0.0000 · changedPx 0 |
| same route twice | byte-identical sha256, identical seed |
| route A vs route B | different sha256 · mad64 > 0.05 · changedPx > 0 |
| weather chain, two node processes | byte-identical (fold of 28 districts) |
| same cell, two predecessors | lamp (27 marks, crop e36e1407) vs rain (85 marks, crop a712d751) |

## Interaction grammar (touch-first, one instrument, no HUD)

| act | result |
|---|---|
| tap the world | resolve: FAR → NEAR → ENTERED (one-shot sweep; reduced motion: instant) |
| tap the frame's corner notch | advance the ladder, including ENTERED → EXITED |
| tap or hold a cell | decode it in the foot strip (district, building, room, material, weather, elevation) |
| hold in NEAR (< 12px cells) | a 9×9 loupe: the same field at the resolution your attention bought |
| swipe / arrow keys / WASD | step one cell; a wall refuses; the witness grows |
| **step into an unseen sight gate** | refused: no move, no words, one flare of the broken ring |
| **hold the sight gate** | the rise: the view lifts until the district's shape is legible; at 0.9 the gate lights and its line is spoken |
| step onto a word gate (2–8) | the gate asks one word of the line you stand in; three doors at the foot |
| return to the origin coordinate (≥8 steps) | ninth-gate move: auto-EXIT, the run closes where it began |
| tap the recomposed painting | RETURN: the route clears, FAR, the painting reconstructs exactly |
| **two fingers on the field** (0.4.0) | the eye: stand in the same city looking north; two fingers again returns to the plan |
| **hold the distance corner 560 ms** (0.4.0) | the same toggle, for one thumb and for discoverability (the corner gains a fifth tick while on) |
| **hold in the eye** (0.4.0) | raise the eye line 1.20 → 2.40 cells; release settles it. Tap still decodes a room |
| **hold the top-left crop-mark** (0.4.0) | the field note, verbatim; a tap puts it away. `#note` deep-links it, `#fpv` deep-links the eye |

There is no header, no status bar, no rail, no panel, no button. The frame
carries the meter; the cells carry their own matter; one hairline strip at the
foot carries the line the world wants to say right now. The only persistent DOM
text is the provenance line. Four elements exist on the page: the canvas, the
provenance line, and two sr-only paragraphs.

Surface count did not grow in 0.3.0: the door strip is not drawn for the sight
gate (it replaces, not adds, the gate-1 quiz), the rise reuses the hold the
instrument already had, and two drawing layers were removed. 0.4.0 spends the
allowance exactly once: **one toggle** (the eye, with no control of its own) and
**one reveal** (the note, likewise). Elements stay at four.

## The game mechanisms that earned their place

1. **Diagetic state.** Distance = four ticks in the frame's corner. Understanding
   = eight lamps scratched on the frame. Where you are = the crosshair. What
   district you are in = the band. What you read = the foot line. Nothing is drawn
   that is not also a field of a record.
2. **One meter that matters: the eight lamps.** 0..8, monotone by design. It rises
   when a gate is enacted (the sight gate) or answered from the text. Consequences:
   a lit gate lights its own district's cells in ENTERED, and the EXITED line
   reports `k/8`. Decay was considered and rejected — it would punish walking, and
   walking is the whole act.
3. **One gate enacted, seven asked.** The sight gate cannot be passed by knowing a
   word; it can only be passed by looking until the shape resolves. That is the
   experiment of this pass: whether a mechanic can carry meaning without a single
   line of doctrine text. The seven word gates stay as the control.
4. **Weather is a consequence, not a decoration.** The band's weather is the fold of
   your own walk, so the city you see is a function of the route you took to it —
   the cheapest possible demonstration of conditionality: no two approaches to the
   same district show the same world.
5. **Return prompts (retention).** Every district you enter is stamped in a
   clock-free ledger with a monotonic ordinal. Come back into it after five other
   district visits and the world quotes the line you walked before: *"you walked
   this before (13 districts ago) · ¶14"*. Spacing is measured in walks.
6. **Reveal-on-touch depth.** Hold = decode, or (on a threshold) the rise. Nothing
   is permanently expanded; everything returns to quiet.

Rejected: a HUD/status readout (state is in the world), a four-button rail (one
corner notch), a separate decode panel (folded into the foot strip), a source
picker (one selection, one fingerprint), sound (no assets, and the room is quiet),
decay on the meter (punishes walking), a gate hint line (the three doors are the
instruction, and the sight gate's instruction is the refusal), per-cell weather
marks (invisible at phone size), the per-cell remembered underline (3,072
hairs doing the band's job badly), a weather readout (the band is the readout), and
a second camera for the rise (it interpolates the two geometries the ladder
already had).

## Laws applied

- **P1** hairline skin: pad `rgb(8,12,18)`, lines `rgb(79,87,96)`, 1px strokes,
  no blur, no high-contrast blocks; the district band, its weather and the
  recomposition trace are that same ink. Text over the painting is drawn twice
  (pad shadow, then ink) instead of on a panel.
- **P2** identity: two content hashes, both printed — the painting tag
  (`f0f09635`) and the source fingerprint (`bbbe96ac`). Identity is a number in
  the foot line, not a pattern.
- **P3** quiet by default: at FAR rest only the painting, the eight unlit lamps,
  the notch and one title row exist; depth (glyph field, loupe, decode, rise,
  gates) appears only behind an explicit act and returns on release;
  `prefers-reduced-motion` gets the same depth with zero motion.
- **P4** every layer carries a datum: tone ← luminance, wall ← edge, tint ← hue,
  material ← the book's character, band ← the district's own boundary, weather ←
  the fold of your walk, visits ← your actual steps, lamps ← gates enacted.
- **P5** one instrument: the frame's notch IS the distance coordinate; no scroll
  anywhere; one page, no child routes.
- **P6** microlib: `hash32` absorbed from `lib/moire-ambient.js`, not forked; the
  core is one UMD file shared verbatim by the page and the node selftest.
- **P8** shape/position before colour: wall vs floor is a shape difference; the
  district's *shape* (its band) carries the district before colour does; the tint
  only appears once you are inside the field.
- **P12(b)** a mark lights only where your own action changed a record cell
  (visits, gates enacted), and the origin retrieval is the completion move.
- **one panel = one scale**: NEAR draws the whole field at one resolution; the
  loupe is resolution earned by attention; the rise is the same field at the scale
  where a district becomes a shape, not a second view of it.

## Probe API (`window.SleeperLadder`)

```js
await SleeperLadder.ready
SleeperLadder.state()                    // distance, walker, witness, seed, gates, lit, ledger, voice, weather, sight
SleeperLadder.setDistance('NEAR')        // FAR | NEAR | ENTERED | EXITED
SleeperLadder.advance()                  // the notch
SleeperLadder.step('R')                  // U/D/L/R; false on a wall OR on an unseen sight gate
SleeperLadder.gateRoute(0)               // probe-only: shortest U/D/L/R route to gate i
SleeperLadder.routeTo(cellIndex)         // probe-only: shortest route to a cell
SleeperLadder.answer(1)                  // tap door 1 of an open word gate
SleeperLadder.doors()                    // the three door rects (CSS px)
SleeperLadder.rise(i) / riseEnd()        // begin / abort the sight gate's act
SleeperLadder.adjacentSight()            // the unseen sight gate within one step, or null
SleeperLadder.weatherOf(p)               // the weather district p would be, from the carry you hold
SleeperLadder.weatherInk(p)              // the band marks as data (p, weather, x, y)
SleeperLadder.shape(p)                   // the district's boundary sides, in cell coords
SleeperLadder.prompt(p)                  // what the ledger would quote for district p, or null
SleeperLadder.ledger() / clearLedger()
SleeperLadder.greedy(['R','D','L','U'], 40)   // deterministic probe traverse
SleeperLadder.measureRoute(route)        // sha256 / mad64 / changedPx / visitedCells
SleeperLadder.pairwise(A, B)             // head-to-head separation of two routes
SleeperLadder.decode(cellIndex) / closeDecode()
SleeperLadder.fieldStats()               // cut quantile, walkable, reachable, drawn counts, fingerprint, matter
// 0.4.0 probes
SleeperLadder.fpv(on)                    // the eye; false if asked for outside ENTERED
SleeperLadder.eye(k)                     // 0..1 of the declared eye range, for a still proof
SleeperLadder.fpvRows(eye)               // { lay: {w,h,f,horizon,eye}, rows: [{cy, row:{y,w,depth}}] }
SleeperLadder.head(n)                    // { p, n, i, of, t, n0, n1 } — the reading head's ordinal
SleeperLadder.walls(n)                   // the faces of a wall cell, or null for open ground
SleeperLadder.openSides()                // N/E/S/W the city would accept from where you stand
SleeperLadder.note(on)                   // the field note reveal
```

Selftest: `node sleeper/ladder/ladder-selftest.mjs` (113 arms, zero fixtures;
`--rgba <file> --size WxH` runs the same laws against real painting pixels;
`BUDDHADHAMMA_CORPUS=<dir>` enables the derivation arms, which re-run the slice
from the local corpus and require the shipped file to be its output byte for
byte. Without the corpus those arms report SKIP — never PASS).

## Known gaps (named, not repaired)

1. NEAR cannot show 96 columns of legible characters on a phone: the composition
   is carried by tone and glyph texture, and legibility is bought with the loupe.
   That is a resolution trade, named, not a hidden filter.
2. ENTERED is a top-down character grid with one ground-level view (the eye); the
   radial "sleeper maze" donor is not used. The eye looks north only, because north
   is the text's reading direction — a turnable camera would be a second control.
3. The recomposition is tone + trace, not re-painted brushwork: a long straight
   route reads as a drawn line across the water.
4. One selection, one fingerprint: the slice is Section 7's opening window. A
   different window is a different artifact (proved by the negative arm), not a
   user-facing control.
5. The eight lamps reset every walk; only the reading ledger persists. The band's
   weather resets with the walk too — it is a property of the route, not a save.
6. Public links stay inside `0xxx0.github.io`: the source URL is printed as text,
   never as an anchor.
7. The sight gate is the only enacted gate so far; the other seven still ask a
   word. If the enacted act does not grip, the seven are the fallback, not the
   fix.

## Next lanes

- Enact a second gate (right intention? right speech?) only if the first one
  proves the mechanic — and replace, never add.
- Route import/export (the witness string is already the schema) and a ghost of a
  prior walk drawn alongside the live one.
- Carry the weather chain out of the walk into the EXITED line, so the painting
  remembers what the city was under.
