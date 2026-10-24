# SLEEPER // LADDER — instrument spec (v0.1.0)

**One painting, four distances.** The thesis this slice tests, from
`recovery/sleeper/DESIGN_SPEC.md`: *make painting and city the same object at
different resolutions.* FAR is the painting; NEAR resolves its brushwork into a
character field computed from the image itself; ENTERED is a walkable window of
that field whose matter is the canonical ONE RETURN contract; EXITED recomposes
the painting with your route baked in — deterministic, and returning restores
the original bytes.

| distance | what exists on screen |
|---|---|
| FAR | `borrowed-river/landscape.jpg` whole, hairline frame, quiet rail |
| NEAR | the same frame at character resolution: luminance → cell tone, edges → walls (carrying the contract's own characters), hue → district tint, texture → window/rain/lamp marks; tap-and-hold makes the characters move |
| ENTERED | a walkable window of that field; swipe or arrow keys step; visited cells light; press-and-hold decodes a cell |
| EXITED | the route recomposed into the painting: walked tiles shift inside a band measured from their own texture, the walked path lies in as hairline ink; readout shows the instrument's own numbers |

## Data pipeline

```
landscape.jpg (2172x724, sha256 7b1e50ff…)
  └─ canvas getImageData ──> rgba[2172*724]
        └─ imageField: 96x32 cells (the painting's own 3:1 frame)
             lum  = mean luminance          -> cell tone + elevation ramp, the cell's
                                                luminance stretched over the PAINTING'S
                                                own range (field.lum min..max), pad -> line
             edge = mean |∇lum|             -> wall (top quantile that OPENS the
                                                largest walkable district; ladder
                                                [0.62,0.70,0.78,0.86,0.92], cut q
                                                reported in the readout)
             hue/sat -> district 0..7 + neutral
             tex  = sd(lum)                 -> recomposition band width
ONE_RETURN_V2.md (fetched live from /recovery/sleeper/site-source-2026-09-18/docs/)
  └─ parseSource: paragraphs / sentences / words / characters / punctuation
        └─ cell n <- unit floor(n * units / 3072), reading order
             paragraph -> district ¶   sentence -> building   word -> room
             character -> material (the glyph the cell is drawn with)
             punctuation -> . window   , rain   ; : lamp   ? ! beacon
walk (U/D/L/R witness) -> hash32(paintingTag + '|' + witness) -> recompose
```

Drawn counts are asserted against the source's own counts at render time (34
districts = 34 paragraphs, 71 buildings = 71 sentences, 1038 of 1047 rooms).
The source is fetched live; if it 404s the page prints the gap and refuses to
build a city out of nothing.

## Determinism contract

- `paintingTag = hash32(PAINTING_ID + sha256(painting bytes))` = `f0f09635`.
  The same tag names the painting, the city and the artifact (P2).
- `routeSeed = hash32(paintingTag + '|' + witness)`.
- `recompose(rgba, field, witness)` is pure. Unvisited tiles are untouched, so
  **the empty route IS the original bytes** (mad64 = 0, changedPx = 0). The hash
  only orients the per-tile tone sign inside a band measured from that tile's own
  texture; it never invents a coordinate.
- Blocked steps never enter the witness; the witness is the applied U/D/L/R
  string only.

Measured on the real painting (Chromium, 390x844, dpr 2):

| pair | sha256 (first 8) | mad64 | changedPx |
|---|---|---|---|
| rest (empty) vs original | `24cbc7d4` | 0.0000 | 0 |
| route A (40 steps) vs original | `a9e62ac2` | 0.5481 | 20 982 |
| route A recomputed | `a9e62ac2` | 0.5481 | 20 982 |
| route B (40 steps) vs original | `49fea9a8` | 0.1506 | 6 694 |
| A vs B | — | 0.6885 | 27 116 |

## Interaction grammar (touch-first, one instrument, no scrolling)

| act | result |
|---|---|
| tap the painting | FAR → NEAR (one-shot resolve sweep, reduced motion: instant) |
| press-and-hold on the field | decode overlay at that cell (crosshair + every real field + the whole mark vocabulary); at NEAR the held cells move |
| `ENTER` / rail detent | NEAR → ENTERED |
| swipe / arrow keys / WASD | step one cell; a wall refuses; the witness grows |
| return to the origin coordinate (≥8 steps) | ninth-gate move: auto-EXIT, readout says *returned to origin* |
| `EXIT` | ENTERED → EXITED, recomposition + measurements |
| `RETURN` | clears the route, FAR, the painting reconstructs exactly |

## Laws applied

- **P1** hairline skin: pad `rgb(8,12,18)`, lines `rgb(79,87,96)`, 1px strokes,
  no blur, no high-contrast blocks; the recomposition trace is that same ink.
- **P2** identity: one content hash → tag; `MoireAmbient.identity(tag+seed)`
  paints the identity strip.
- **P3** quiet by default: at FAR rest only the painting, the rail detents and
  the primary control are lit; depth (glyph field, decode, motion) appears only
  behind an explicit act and returns on release; `prefers-reduced-motion` gets
  the same depth with zero motion.
- **P4** every layer carries a datum: tone ← luminance, wall ← edge, tint ← hue,
  material ← source character, visits ← your actual steps.
- **P5** one instrument: the rail IS the distance coordinate; no scroll anywhere.
- **P6** microlib: `hash32`/`identity` absorbed from `lib/moire-ambient.js`, not
  forked; the core is one UMD file shared verbatim by the page and the node
  selftest.
- **P8** shape/position before colour: wall vs floor is a shape difference; the
  district tint only appears once you are inside the field, and the decode names
  the hue and the district index.
- **P12(b)** a mark lights only where your own action changed a record cell
  (visits), and the origin retrieval is the completion move.

## Probe API (`window.SleeperLadder`)

```js
await SleeperLadder.ready
SleeperLadder.state()                    // distance, witness, seed, tag, counts
SleeperLadder.setDistance('NEAR')        // FAR | NEAR | ENTERED | EXITED
SleeperLadder.step('R')                  // U/D/L/R, returns false on a wall
SleeperLadder.greedy(['R','D','L','U'], 40)   // deterministic probe traverse
SleeperLadder.measure([[], A, A, B])     // per-route sha256 / mad64 / changedPx
SleeperLadder.pairwise(A, B)             // head-to-head separation of two routes
SleeperLadder.decode(cellIndex)          // open the decode overlay at a cell
SleeperLadder.fieldStats()               // cut quantile, walkable, reachable, drawn counts
```

Selftest: `node sleeper/ladder/ladder-selftest.mjs` (34 arms, zero fixtures;
`--rgba <file> --size WxH` runs the same laws against real painting pixels).

## Known gaps (named, not repaired)

1. NEAR motion is a one-shot resolve sweep plus a held shimmer — no continuous
   drift, because P3 forbids ambient auto-play.
2. ENTERED is a top-down character grid; the radial "sleeper maze" donor is not
   used, and there is no Gate circuit or Return Artifact v2 in this slice.
3. The recomposition is tone + trace, not re-painted brushwork: a long straight
   route reads as a drawn line across the water.
4. One matter source. A source picker (other Sleeper texts) is the next lane.
5. The 96x32 grid is the painting's own aspect; on wide desktop windows the
   NEAR window covers most of the grid.

## Next lanes

- Route import/export (the witness string is already the schema) and a ghost of
  a prior walk drawn alongside the live one.
- Gate the ENTERED grid with the eight ONE RETURN proofs, reusing this witness.
- A second painting (a field-catalog image) to prove the ladder is not
  landscape-specific — the only constants that would move are the grid aspect.
