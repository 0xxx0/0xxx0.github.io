# SLEEPER // LADDER — instrument spec (v0.2.0)

**One painting, four distances, and the city is made of Buddhadhamma.**

The thesis is unchanged from 0.1.0 (`recovery/sleeper/DESIGN_SPEC.md`): *make
painting and city the same object at different resolutions.* What changed is the
matter and the game. The city was built out of the canonical ONE RETURN contract;
it is now built out of **P. A. Payutto's Buddhadhamma** (free online edition,
`buddhadhamma.github.io`, Section 7 "Path Factors": chapters 16, 17, 18), and the
walk asks something of the walker.

| distance | what exists on screen |
|---|---|
| FAR | `borrowed-river/landscape.jpg` whole, hairline frame, eight unlit lamps scratched on the frame, the distance notch, one hairline title row |
| NEAR | the WHOLE 96×32 frame in the painting's own box, at character resolution: luminance → cell tone, the painting's own edges → walls (carrying the book's characters), hue → district tint, texture → window/rain/lamp/beacon; one hold opens a 9×9 loupe |
| ENTERED | a walkable window of that field; swipe or arrow keys step; tap or hold decodes a cell; eight gates stand along the walk; the frame's eight lamps say how many are lit |
| EXITED | the route recomposed into the painting (walked tiles shift inside a band measured from their own texture, the walked path lies in as hairline ink); the foot line carries the instrument's own numbers |

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
                   districts (one cited line <=92 chars + the word its gate asks for)

walk (U/D/L/R witness) -> hash32(paintingTag + '|' + witness) -> recompose
```

Drawn counts are asserted against the source's own counts at render time (28
districts = 28 districts, 50 buildings = 50 sentences, 1,228 of 1,257 rooms).
The slice is fetched from the artifact; if it fails to validate the page prints
the gap in the world's own strip and refuses to build a city out of nothing.

**The book's text is not republished.** The public artifact carries a sampled
projection (3,072 characters of matter), index coordinates into the real
structure, and one short cited line per district with its locator. The raw pages
and the extracted text stay in `void-anchor/sleeper/corpus/buddhadhamma/`. The
foot of the page names the source, the edition and the retrieval date, read live
from the shipped file.

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
- Blocked steps never enter the witness; the witness is the applied U/D/L/R
  string only.
- No `Math.random`, no `Date`, no `performance.now` in core, instrument or page
  (asserted by the selftest). The reading ledger is ordered by visit, not clock.

Measured on the real painting (Chromium, 390x844, dpr 2, receipt in
`AXIS/work/sleeper-dhamma-2026-10-25/`):

| pair | measurement |
|---|---|
| rest (empty witness) vs original | mad64 0.0000 · changedPx 0 |
| same route twice | byte-identical sha256, identical seed |
| route A vs route B | different sha256 · mad64 > 0.05 · changedPx > 0 |

## Interaction grammar (touch-first, one instrument, no HUD)

| act | result |
|---|---|
| tap the world | resolve: FAR → NEAR → ENTERED (one-shot sweep; reduced motion: instant) |
| tap the frame's corner notch | advance the ladder, including ENTERED → EXITED |
| tap or hold a cell | decode it in the foot strip (district, building, room, material, weather, elevation) |
| hold in NEAR (< 12px cells) | a 9×9 loupe: the same field at the resolution your attention bought |
| swipe / arrow keys / WASD | step one cell; a wall refuses; the witness grows |
| step onto a gate | the gate asks one word of the line you stand in; three doors at the foot |
| return to the origin coordinate (≥8 steps) | ninth-gate move: auto-EXIT, the run closes where it began |
| tap the recomposed painting | RETURN: the route clears, FAR, the painting reconstructs exactly |

There is no header, no status bar, no rail, no panel, no button. The frame
carries the meter; the cells carry their own matter; one hairline strip at the
foot carries the line the world wants to say right now. The only persistent DOM
text is the provenance line.

## The game mechanisms that earned their place

1. **Diagetic state.** Distance = four ticks in the frame's corner. Understanding
   = eight lamps scratched on the frame. Where you are = the crosshair. What you
   read = the foot line. Nothing is drawn that is not also a field of a record.
2. **One meter that matters: the eight lamps.** 0..8, monotone by design. It rises
   only when a gate is answered from the text. Consequences: a lit gate lights its
   own district's cells in ENTERED, and the EXITED line reports `k/8`. Decay was
   considered and rejected — it would punish walking, and walking is the whole act.
3. **Eight gates that verify understanding.** Placed at the quantiles of the walk's
   own BFS distance field from the origin (horizon = p85, capped at 96 steps), each
   preferring a district no other gate uses. A gate shows the district's cited line
   with one word removed and offers three doors: the word, and two words of the
   same book of similar length (never a morphological form of the answer). Two
   wrong answers and the gate stays shut for that walk.
4. **Return prompts (retention).** Every district you enter is stamped in a
   clock-free ledger with a monotonic ordinal. Come back into it after five other
   district visits and the world quotes the line you walked before: *"you walked
   this before (13 districts ago) · ¶14"*. Spacing is measured in walks.
5. **Reveal-on-touch depth.** Hold = decode + loupe. Nothing is permanently
   expanded; everything returns to quiet.
6. **A world that remembers.** Districts you have read carry a hairline under their
   cells; the ledger survives the session (localStorage, keyed by source schema)
   while the lamps reset each walk — the gates are recall, the ledger is memory.

Rejected: a HUD/status readout (state is in the world), a four-button rail (one
corner notch), a separate decode panel (folded into the foot strip), a source
picker (one selection, one fingerprint), sound (no assets, and the room is
quiet), decay on the meter (punishes walking), a gate hint line (the three doors
are the instruction), and the held-shimmer animation on NEAR (the loupe gives
something worth holding for).

## Laws applied

- **P1** hairline skin: pad `rgb(8,12,18)`, lines `rgb(79,87,96)`, 1px strokes,
  no blur, no high-contrast blocks; the recomposition trace is that same ink.
  Text over the painting is drawn twice (pad shadow, then ink) instead of on a
  panel.
- **P2** identity: two content hashes, both printed — the painting tag
  (`f0f09635`) and the source fingerprint (`bbbe96ac`). The 0.1.0 moiré identity
  strip is gone; identity is now a number in the foot line, not a pattern.
- **P3** quiet by default: at FAR rest only the painting, the eight unlit lamps,
  the notch and one title row exist; depth (glyph field, loupe, decode, gates)
  appears only behind an explicit act and returns on release;
  `prefers-reduced-motion` gets the same depth with zero motion.
- **P4** every layer carries a datum: tone ← luminance, wall ← edge, tint ← hue,
  material ← the book's character, visits ← your actual steps, lamps ← gates
  answered, underlines ← districts read.
- **P5** one instrument: the frame's notch IS the distance coordinate; no scroll
  anywhere; one page, no child routes.
- **P6** microlib: `hash32` absorbed from `lib/moire-ambient.js`, not forked; the
  core is one UMD file shared verbatim by the page and the node selftest.
- **P8** shape/position before colour: wall vs floor is a shape difference; the
  district tint only appears once you are inside the field, and the decode names
  the hue and the district index.
- **P12(b)** a mark lights only where your own action changed a record cell
  (visits, gates answered), and the origin retrieval is the completion move.
- **one panel = one scale**: NEAR draws the whole field at one resolution; the
  loupe is resolution earned by attention, not a second scale drawn at once.

## Probe API (`window.SleeperLadder`)

```js
await SleeperLadder.ready
SleeperLadder.state()                    // distance, walker, witness, seed, tag, source, gates, lit, ledger, voice
SleeperLadder.setDistance('NEAR')        // FAR | NEAR | ENTERED | EXITED
SleeperLadder.advance()                  // the notch
SleeperLadder.step('R')                  // U/D/L/R, returns false on a wall
SleeperLadder.gateRoute(0)               // probe-only: shortest U/D/L/R route to gate i
SleeperLadder.routeTo(cellIndex)         // probe-only: shortest route to a cell
SleeperLadder.answer(1)                  // tap door 1 of an open gate
SleeperLadder.doors()                    // the three door rects (CSS px)
SleeperLadder.prompt(p)                  // what the ledger would quote for district p, or null
SleeperLadder.ledger() / clearLedger()
SleeperLadder.greedy(['R','D','L','U'], 40)   // deterministic probe traverse
SleeperLadder.measureRoute(route)        // sha256 / mad64 / changedPx / visitedCells
SleeperLadder.pairwise(A, B)             // head-to-head separation of two routes
SleeperLadder.decode(cellIndex) / closeDecode()
SleeperLadder.fieldStats()               // cut quantile, walkable, reachable, drawn counts, fingerprint, matter
```

Selftest: `node sleeper/ladder/ladder-selftest.mjs` (65 arms, zero fixtures;
`--rgba <file> --size WxH` runs the same laws against real painting pixels;
`BUDDHADHAMMA_CORPUS=<dir>` enables the derivation arms, which re-run the slice
from the local corpus and require the shipped file to be its output byte for
byte. Without the corpus those arms report SKIP — never PASS).

## Known gaps (named, not repaired)

1. NEAR cannot show 96 columns of legible characters on a phone: the composition
   is carried by tone and glyph texture, and legibility is bought with the loupe.
   That is a resolution trade, named, not a hidden filter.
2. ENTERED is a top-down character grid; the radial "sleeper maze" donor is not
   used.
3. The recomposition is tone + trace, not re-painted brushwork: a long straight
   route reads as a drawn line across the water.
4. One selection, one fingerprint: the slice is Section 7's opening window. A
   different window is a different artifact (proved by the negative arm), not a
   user-facing control.
5. The eight gates reset every walk; only the reading ledger persists.
6. Public links stay inside `0xxx0.github.io`: the source URL is printed as text,
   never as an anchor.

## Next lanes

- Route import/export (the witness string is already the schema) and a ghost of a
  prior walk drawn alongside the live one.
- Carry the lit-gate record into the ledger, so a returning walker's lamps start
  where their understanding left off.
- A second painting (a field-catalog image) to prove the ladder is not
  landscape-specific — the only constants that would move are the grid aspect.
