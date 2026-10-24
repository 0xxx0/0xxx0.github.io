# FIELD INDEX GAME — spec & handoff (2026-10-22)

## What it is
`/field-index/` — a playable instrument over the real corpus: 31 months × 24 hours of
message counts (424 live cells, 184,560 messages) laid out as a walkable radial field.
Named-prototype lineage assembled from the operator's own list + the steal list:
- **sleeper maze** (his named prototype): radial top-down walkable plan — used as the space.
- **Paint With Music / Magenta DDSP**: stroke→sound — used as the audio law (no model: WebAudio additive).
- **InkPainting variable brush**: speed → stroke width (inverted: slow = thick).
- **Ink/Field gesture-to-JSON**: every traversal is recorded, replayable (`r`), exportable (`e`).
- **design-intent laws**: P3 quiet at rest (terrain alpha ≤ 0.12, text hidden until dwell),
  P5 one instrument / position over scrolling, P7 underline-not-color, measured-not-seeded,
  homoiconic (the structure IS the corpus; the revealed text IS real messages).

## Position = meaning (never decorative)
- angle = hour of day (measured `strftime('%H')`, rings at 00/06/12/18)
- radius = month (2023-06 core → 2026-10 rim)
- dot radius + tone = log(message count) · outer months ring higher in register

## Data pipeline (re-runnable)
```
sqlite3 -readonly ~/sovereign-node/corpus/corpus.db
  SELECT substr(ctime,1,7), strftime('%H',ctime), COUNT(*) FROM messages GROUP BY 1,2  -> matrix
  ... + 90-char sample per (month,hour) -> samples (the hidden text)
=> field-index/field-game.json  (48 KB, 424 cells, 395 samples)
```
Nothing synthetic. Refresh = re-run query, overwrite JSON. (One fix queued: GROUP BY picks
arbitrary sample rows — deterministic `MIN(ROWID)` sampling next revision.)

## Interaction grammar (the game)
- move/drag through the field = walk; passing a cell speaks it (pitch=log count, vol=count)
- **dwell** on a cell = the hidden text surfaces (alpha ramps 0→0.9, 3 lines max)
- drag horizontally = orbit the hour rings · scroll = radius zoom · arrows = step
- `r` = replay your recorded traversal · `e` = export the trace JSON (the session is data)

## Long-horizon lanes (take-the-lead plan)
1. **Field deepening**: topic clustering per cell (corpus FTS tags) -> second spatial axis
   (sector = topic family) once qmd/embeddings are cheap locally. Map it, don't list it.
2. **Cross-instrument identity**: the keel specimen brush + this field share the audio law;
   unify into `field-signal.js` family (site lib), never fork (microlib law).
3. **Walkable studio**: the sleeper-maze prototype proper — first-person plan over the
   AXIS tree (projects as rooms), same quiet-at-rest / dwell-reveal laws. This game is its
   pilot: prove the movement + reveal grammar here first.
4. **Session semantics**: traces as first-class artifacts — a work session leaves a trace
   JSON that can be replayed (gesture->JSON->memory). Feed traces to the field index as
   new evidence of what was attended to.
5. **Score/metagame (gated)**: only if it earns its place — coverage % of cells visited vs
   corpus weight. Games must serve retrieval, not replace it.

## Handoff state
- Live at https://0xxx0.github.io/field-index/ (verify 200 + play once before trusting).
- Known v1 limits: touch drag orbits instead of walking (fine), reveal text English-only
  (corpus samples stripped of newlines), no persistence of traces server-side (by design:
  export is local).
- Next concrete step: deterministic sample rows + topic sectors (lane 1), then fold both
  brushes into the shared lib (lane 2).
