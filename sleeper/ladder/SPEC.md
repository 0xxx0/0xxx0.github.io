# SLEEPER // LADDER — instrument spec (v0.5.0)

**One painting, four distances, and the city is made of Buddhadhamma.**

The thesis is unchanged from 0.1.0 (`recovery/sleeper/DESIGN_SPEC.md`): *make
painting and city the same object at different resolutions.* 0.2.0 gave the city
its matter and its gates. 0.3.0 made the city conditional. 0.4.0 answered the
first walk. **0.5.0 answers the second: the eight gates become the eight path
factors, and the walk costs something.**

The operator walked 0.4.0 and said: *"its interesting... dont really consider
this gripping or compelling atm"* and *"maybe you can explain how it works better
or conveys deep essential wisdom from the text"*. Both complaints had one cause:
the source text of this instrument is **Section 7, "Path Factors"** (Payutto,
Ch. 16–18), and the instrument had **eight gates** — but those gates were
arbitrary quantiles of a distance field running generic cloze quizzes. The eight
gates and the eight factors were the same number and never met.

| distance | what exists on screen |
|---|---|
| FAR | `borrowed-river/landscape.jpg` whole, hairline frame, eight unlit lamps scratched on the frame, the distance notch, one hairline title row |
| NEAR | the WHOLE 96×32 frame in the painting's own box, at character resolution: luminance → cell tone, the painting's own edges → walls (carrying the book's characters), hue → district tint; one hold opens a 9×9 loupe |
| ENTERED | a walkable window of that field; swipe or arrow keys step; tap or hold decodes a cell; ONE district band is outlined in hairline with its weather stitched along that boundary; **the eight gates stand on one road out of the city, and gate *i* is path factor *i***; the frame's eight lamps say how many are done; the frame's inner top edge is the breath you have left |
| RISE | (a held state inside ENTERED) holding the first gate's ring lifts the view to the whole field: the rooms dissolve, the field resolves, one district's outline comes up — the district seen whole |
| EXITED | the route recomposed into the painting; the foot line carries the instrument's own numbers — steps, gates, ¶ read, **breath left**, seed, mad64, source fingerprint |

## The eight gates ARE the eight path factors (0.5.0)

**Order.** The text's own order, not the standard order assumed: MN 117
(Mahācattārīsaka Sutta), quoted at `path-factors-of-wisdom.txt:29` — *"when one
possesses right view, right thought comes into being; … right speech … right
action … right livelihood … right effort … right mindfulness … right
concentration"* (Ch. 16 ¶15). Verified against the text in the selftest, not
remembered: the arm finds that sentence in the corpus and checks the eight names
appear in it in that order.

**Binding.** Gate *i* asks factor *i*. The factor's own paragraph is what the
gate asks with — quoted verbatim, cited by chapter and paragraph:

| gate | factor | the text's own line (quoted at build time) | asks |
|---|---|---|---|
| 1 | right view (sammā-diṭṭhi) | Ch. 16 ¶13 — *"Monks, of all the Path factors, right view comes first."* | **act**: hold until the district's shape resolves |
| 2 | right thought (sammā-saṅkappa) | Ch. 16 ¶154 — *"Monks, what is right thought? The thought of renunciation, the thought of non-ill-will, the thought of non-cruelty…"* | **act**: let go of sensuality, ill-will, cruelty — one hold each |
| 3 | right speech (sammā-vācā) | Ch. 17 ¶8 — *"And what, monks, is right speech? This is called right speech:"* | **act**: say none of the four — keep off the ring |
| 4 | right action (sammā-kammanta) | Ch. 17 ¶14 — *"To abstain from killing living beings (pāṇātipātā veramaṇī)."* | **word**: one word of that sentence |
| 5 | right livelihood (sammā-ājīva) | Ch. 17 ¶17 — *"This is called right livelihood: here a noble disciple, having abandoned wrong livelihood…"* | **word**: one word of that sentence |
| 6 | right effort (sammā-vāyāma) | Ch. 18 ¶7 — *"Generates wholesome enthusiasm, exerts effort, rouses energy, strives…"* | **act**: walk four steps — prevent, abandon, cultivate, protect |
| 7 | right mindfulness (sammā-sati) | Ch. 18 ¶80 — *"What is right mindfulness? Mindfulness is constant recollection…"* | **act**: go back onto ground you have walked |
| 8 | right concentration (sammā-samādhi) | Ch. 18 ¶303 — *"The term samādhi refers to 'mental concentration' or 'one-pointed attention'."* | **act**: stay still, one point |

**Six enacted, two quizzed.** A gate is *enacted* when the text's account of the
factor is something a walker can DO with a thumb; it is *quizzed* only when the
account is a definition with no gesture in it:

- **right view** — the text's account is seeing things as they are; the act is
  sustained attention until a district's shape is legible (0.4.0's experiment,
  unchanged).
- **right thought** — the account names three thoughts to be free of; the act is
  letting each go. The three labels are extracted from the text's own paragraphs
  (¶162–164), never typed.
- **right speech** — the account is four abstentions; the act is not speaking.
  The four are extracted the same way (¶9–12). Touch the ring and the act fails:
  that was speech.
- **right action**, **right livelihood** — quizzed. The account of action is
  three bodily abstentions (killing, taking what is not given, misconduct): a
  walking instrument cannot present those as an act without depicting harm, and
  the honest form is the text's own sentence with one word taken out. Livelihood's
  account at this address is a single definitional sentence — *"having abandoned
  wrong livelihood, earns his living by right livelihood"* — with no gesture in it.
- **right effort** — the account is four endeavours and *"exerts effort, rouses
  energy, strives"*; the act is four steps in the room you stand in. It is the
  gate that costs the most breath.
- **right mindfulness** — the text's own word for sati here is *"constant
  recollection… remembering, non-fading, non-forgetting"*; the act is to step
  back onto ground you have already walked, which the instrument knows and you
  must remember.
- **right concentration** — the account is one-pointedness, *"attention is not
  distracted and does not waver"*; the act is to stay still while the ring closes.

**What a gate says, always, in three lines** (the answer to *"explain how it
works"*): who it is — `3/8 right speech (sammā-vācā) · Ch. 17 · ¶8`; what the text
says — its own sentence, quoted; what it asks — `say none: keep off the ring ·
false speech · divisive speech · harsh speech · idle chatter`. Each line is
ellipsized to one line of the foot strip on a phone, so the instruction can never
be crowded out by the quotation. A word gate gives its blank two lines and lets
the three doors carry the question.

**Where the gates stand.** They stand ON the city, never in its matter. The eight
factors are a *path*, so the gates are one road: the walk's own way out of the
city that crosses the most paragraphs, found in the distance field the walk
already computes, divided into eight equal stretches, gate *i* at the *i*-th
stretch. On the shipped painting that road is 58 steps and crosses 14 paragraphs;
the eight gates sit at steps 7, 15, 22, 29, 36, 44, 51, 58. A gate that happens
to stand in the very district whose paragraph it quotes speaks that district's
line instead of repeating the book. The matter — 3,072 cells, 28 districts, 50
sentences — is never touched: the gate layer is an appended table and a
placement, and the city's digest is identical to 0.4.0's.

## Breath: the walk costs, and nothing gives it back (0.5.0)

The walk had no stake. It has one now, and it is measured in the city's own units:

```
breath = the city's sentences + the city's paragraphs      (50 + 28 = 78)
one step                    costs 1
a failed gate (2nd wrong door, or a word said at the ring) costs 3
at 0 the walk ends where it stands
```

Deterministic: same source, same budget, in every process — it is a function of
`counts.sentences + counts.districts`, both of which are in the shipped file. A
different selection is a different budget (the negative arm proves it is not a
constant).

The budget is drawn, not printed at rest: a hairline along the frame's **inner
top edge** runs the width of what is left. Walk and it shortens. At zero the
frame keeps only a 3px stub, and the walk closes with a line that says so:
`out of breath — the breath is spent · 78 steps · 4/8 gates · 0 of 78`. Nothing
refills it inside a walk: `S.breath = S.breathMax` happens at boot and on a new
walk, nowhere else (asserted). A completed walk of all eight gates costs about
63 of the 78; wandering costs the rest.

This is a second mark, not a second meter: the eight lamps remain the one meter
of understanding, and breath is the frame's own remaining ink.

## Data pipeline

```
landscape.jpg (2172x724, sha256 7b1e50ff…)
  └─ canvas getImageData ──> rgba[2172*724]
        └─ imageField: 96x32 cells (the painting's own 3:1 frame)
             lum  = mean luminance          -> cell tone + elevation ramp
             edge = mean |∇lum|             -> wall (the quantile that OPENS the
                                               largest walkable district)
             hue/sat -> district 0..7 + neutral
             tex  = sd(lum)                 -> recomposition band width

buddhadhamma.github.io  (fetched ONCE, LOCAL ONLY)
  └─ void-anchor/sleeper/corpus/buddhadhamma/   raw/*.html · text/*.txt · heads/*.json
       ├─ extract.py      HTML -> one paragraph per line + heading anchors
       └─ derive-source.mjs   PROVENANCE -> SELECTION -> MAPPING -> PROJECTION
            │                 selection: the first 9 prose paragraphs of each page
            │                 28 districts / 6,925 characters of 2,502 corpus paragraphs
            │
            ├─ ladder-core.parseSource   ¶=district  sentence=building  word=room
            │                            character=material
            │                            punctuation -> . window  , rain  ; : lamp  ? ! beacon
            ├─ ladder-core.projectCells  cell n <- unit floor(n·U/3072), reading order
            ├─ deriveFactors             the eight factors: address -> paragraph ->
            │                            verbatim quote + locator + the text's own list
            └─ sleeper/ladder/source-dhamma.json   WHAT SHIPS (+3.3 KB)
                   provenance · selection (sha256 of the selected text) · counts
                   matter (3072 chars, one per cell) · cells · districts
                   factors (8, appended): key · en · pali · act · locator ·
                            quoteLocator · line · items · district · (word gates:
                            answer/cloze)
```

**The gate table is derived, and it refuses to lie.** Each factor row addresses a
paragraph and names the term that paragraph must contain; the build throws if the
address does not hold its own name (`factor action: ¶14 … does not carry "what,
monks, is right action"` — caught twice while building this). The quote is the
paragraph's own opening sentence, clipped at a word boundary. The lists (three
wrong thoughts, four wrong speeches, four endeavours) are extracted by regex from
the text's own paragraphs. Adding the block changed the shipped file by **one
appended key**: 3,296 bytes, and every byte above it identical.

One finding worth naming: the city's prose filter drops the Pali-dense abstention
lines (`To abstain from false speech (musāvādā veramaṇī).` — diacritic density
0.089–0.14 against a 0.08 cut), so **the lines that define right speech and right
action never entered the city**. The gates are how those lines finally reach the
walker: quoted, cited, with the Pali intact.

Drawn counts are asserted against the source's own counts at render time (28
districts, 50 buildings, 1,217 of 1,257 rooms). The slice is fetched from the
artifact; if it fails to validate the page prints the gap and refuses to build a
city out of nothing. **The book's text is not republished**: a sampled projection,
index coordinates, one cited line per district, and now eight cited factor lines.

## Determinism contract

- `paintingTag = hash32(PAINTING_ID + sha256(painting bytes))` = `f0f09635`. Unchanged.
- `sourceFingerprint = hash32('buddhadhamma@1|' + sha256(selected text))` =
  `bbbe96ac`. Unchanged: the selection is the identity, and 0.5.0 did not touch it.
- **`cityDigest = sha256(JSON({matter, cells, districts}))` =
  `18ac9948…` — identical to 0.4.0.** The gate layer is appended and placed, never
  written into the matter. Dropping `factors` from the file leaves the digest
  unchanged (arm).
- `routeSeed = hash32(paintingTag + '|' + witness)`; `recompose` is pure; the empty
  route IS the original bytes. Gates do not enter the witness, and a step refused
  by a gate is not a move.
- `breathBudget(counts) = sentences + districts` — pure, and the only source of
  the walk's length.
- `placeFactors(field, factors, budget)` is pure and reads only the distance
  field: same painting, same road, same gates. A different painting moves them.
- No `Math.random`, no `Date`, no `performance.now` in core, instrument or page
  (asserted). The acts run on `requestAnimationFrame` timestamps — and on
  **absolute** frame time, not accumulated deltas, so a throttled tab cannot
  starve a hold (measured: a delta-sum stopped a 3×620 ms act in a background tab).

## Interaction grammar (touch-first, one instrument, no HUD)

| act | result |
|---|---|
| tap the world | resolve: FAR → NEAR → ENTERED (one-shot sweep; reduced motion: instant) |
| tap the frame's corner notch | advance the ladder, including ENTERED → EXITED |
| tap or hold a cell | decode it in the foot strip |
| hold in NEAR (< 12px cells) | a 9×9 loupe |
| swipe / arrow keys / WASD | step one cell; a wall refuses; **−1 breath** |
| step into an unseen gate | refused: no move, no words; the gate names its factor and what it asks |
| press the gate's ring | begins that factor's act (keyboard: Enter/Space runs it) |
| hold the ring at gate 1 | the rise, until the district's shape is legible (0.9) |
| hold each of three marks at gate 2 | one wrong thought goes out per hold; release and it drains |
| keep off the ring at gate 3 | the four wrong speeches go out one per 700 ms; touching it is speech |
| tap a door at gates 4–5 | one word of the text's own sentence; two wrong answers shut it |
| walk four steps at gate 6 | the four endeavours, inside the room you stand in |
| step back onto walked ground at gate 7 | recollection |
| stay still at gate 8 | one point, while the ring closes |
| breath reaches 0 | the walk ends where it stands; the exit line says so |
| return to the origin coordinate (≥8 steps) | ninth-gate move: auto-EXIT |
| tap the recomposed painting | RETURN: the route clears, FAR, the painting reconstructs exactly |
| two fingers / held distance corner | the eye (0.4.0); hold raises the eye line |
| hold the top-left crop-mark | the field note, verbatim; `#note`, `#fpv` deep-link |

There is no header, no status bar, no rail, no panel, no button. Four elements
exist on the page: the canvas, the provenance line, and two sr-only paragraphs.
The eight lamps remain the one meter; the gate ring's own arc is the act's
progress; the frame's top edge is the breath.

## What 0.5.0 removed

- **`placeGates` and its quantile targets** — the eight gates were the 12.5 %,
  37.5 % … points of a distance band, with a district-uniqueness scramble. Gone,
  replaced by one road and eight stretches.
- **`gateCard` and the seven generic cloze gates** — every gate asked a word of
  whatever district it happened to stand in. Gone: two gates ask a word, and both
  ask their own factor's sentence. `factorCard` replaces it.
- **`SIGHT_GATES` and the "seven word gates" branch** — the gate kind is now the
  factor's own act (`see` → sight, `word` → word, anything else → act).
- **The silent refusal** — 0.3.0's law was "no words at the threshold". The
  operator asked for the instrument to explain itself, so the refusal now speaks
  the factor's name, its sentence, and its ask. It still does not blame, score, or
  argue.
- Nothing was added to the surface: no route, no element, no control. The strip
  learned to say three things at once; the ring learned to fill; the frame's top
  edge learned to shorten.

## The game mechanisms that earned their place

1. **Diagetic state.** Distance = four ticks; understanding = eight lamps; where
   you are = the crosshair; what district = the band; what you read = the foot
   line; what is left = the frame's top edge. Nothing is drawn that is not a field
   of a record.
2. **The path is walked in order.** The factors are a sequence in the text and a
   sequence on the ground: you cannot pass gate 2 without doing right thought.
   That is the doctrine's own claim about the factors, made mechanical.
3. **The gate must be done, not known.** Six of eight factors are acts. The two
   that are words are the two whose accounts are definitions without a gesture.
4. **Weather is a consequence.** The band's weather is the fold of your own walk.
5. **Return prompts.** The ledger quotes a line you walked before, spaced in
   walks, never in time.
6. **Reveal-on-touch depth.** Hold = decode, or the rise. Everything returns to quiet.

Rejected: a HUD/status readout, a four-button rail, a separate decode panel, a
source picker, sound, decay on the meter, a gate hint line, per-cell weather
marks, a weather readout, a second camera, a **breath number at rest** (the frame
carries it), and a **completion badge** (the lamps are the record).

## Laws applied

- **P1** hairline skin: pad `rgb(8,12,18)`, lines `rgb(79,87,96)`, 1px strokes, no
  blur, no high-contrast blocks.
- **P2** identity: two content hashes printed — `f0f09635`, `bbbe96ac` — and a
  third for the city (`18ac9948…`) in the selftest.
- **P3** quiet by default: at FAR rest only the painting, eight unlit lamps, the
  notch and one title row exist; depth appears behind an explicit act and returns
  on release; reduced motion gets the same depth with zero motion.
- **P4** every layer carries a datum: tone ← luminance, wall ← edge, tint ← hue,
  material ← character, band ← boundary, weather ← the fold of your walk, lamps ←
  factors done, ring arc ← the act's own progress, top edge ← breath left.
- **P5** one instrument: the frame's notch IS the distance coordinate; no scroll;
  one page, no child routes.
- **P6** microlib: `hash32` absorbed from `lib/moire-ambient.js`; the core is one
  UMD file shared verbatim by the page and the node selftest.
- **P12(b)** a mark lights only where your own action changed a record cell.

## Probe API (`window.SleeperLadder`)

```js
await SleeperLadder.ready
SleeperLadder.state()                    // distance, walker, witness, seed, gates(+factor,kind), lit, breath, act, voice
SleeperLadder.setDistance('NEAR') / advance() / step('R')
SleeperLadder.answer(1) / doors() / gateRoute(i) / routeTo(n)
SleeperLadder.rise(i) / riseEnd() / adjacentSight()
SleeperLadder.act(i)                     // begin a factor's act (probe auto; the keyboard does the same)
SleeperLadder.factor(i) / factors()      // the eight rows: en, pali, act, locator, quoteLocator, line, items
SleeperLadder.gateVoice(i)               // the exact three lines a gate says
SleeperLadder.breath() / breath(n)       // read; set (probe-only, for a bound proof)
SleeperLadder.head(n) / walls(n) / openSides() / screenOf(n) / frameRect()
SleeperLadder.measureRoute(route) / pairwise(A,B) / fieldStats()
SleeperLadder.fpv(on) / eye(k) / note(on) / weatherOf(p) / weatherInk(p) / shape(p)
SleeperLadder.ledger() / clearLedger() / prompt(p) / decode(n) / closeDecode()
```

Selftest: `node sleeper/ladder/ladder-selftest.mjs` (**142 arms**, zero fixtures;
`--rgba <file> --size WxH` runs the same laws against real painting pixels;
`BUDDHADHAMMA_CORPUS=<dir>` enables the derivation arms, which re-run the slice and
the factor table from the local corpus and require the shipped file to be their
output byte for byte).

## Known gaps (named, not repaired)

1. NEAR cannot show 96 columns of legible characters on a phone: legibility is
   bought with the loupe.
2. The road crosses 14 paragraphs but the eight gates land in three of them
   (¶14 six times): the city's paragraphs are unevenly sized, and even pacing was
   chosen over even coverage. A walk that wants the other paragraphs can leave the
   road — the city is open.
3. Only two gates ask a word, and a word gate is still a reading check, not an
   understanding. That is why they are two and not seven.
4. Breath is a single pool: a walker who spends it wandering cannot buy it back,
   and a walk may end at 3/8. That is the stake, not a defect — but it does mean
   the eight factors usually take more than one walk.
5. The recomposition is tone + trace, not re-painted brushwork.
6. One selection, one fingerprint: a different window is a different artifact.
7. Public links stay inside `0xxx0.github.io`: the source URL is printed as text.

## Next lanes

- Read the acts aloud: the factor's sentence spoken after the act, in the same
  voice the district uses (no new surface — the strip already has the line).
- A second walk that remembers which factors you have done across walks, so the
  eight can be finished over days (the ledger already persists; the lamps do not).
- Nothing else until the walk is walked.
