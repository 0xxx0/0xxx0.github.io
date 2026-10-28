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

## THE CHART (v2, 2026-10-27) — the mechanic
- **The sentence**: "I charted a corner of my memory — and I can hear where I've never gone."
- **Laws (3)**: position = evidence (targets derived from the corpus, never invented) ·
  sound is the compass (proximity before sight) · the chart remembers and fades
  (marks fade over 7 days, drop at 30; a miss leaves a dashed trace, a lock a solid ring).
- **The one new gesture**: hold ~1s on a cell to lock. One attempt per target; cancels are free,
  the lock is the point of no return. Held drawn as a closing ring at the cell.
- **Targets** (`field-index/field-targets.json`, 5, derived by argmax/relational queries over
  field-game.json): loudest hour of Sep 2026 (11h, 6,166) · month where 03h is loudest
  (2026-09, 3,590) · loudest hour of Oct (15h, 5,500) · month where 04h beats 16h hardest
  (2026-09 04h) · first month 22h beat 10h (2024-08 22h — a sparse cell, the hard one).
- **Reward**: a correct lock surfaces that cell's real messages (the dwell reveal).
  **Failure**: dashed ring where you locked wrongly + the true cell haloes dim for 4s (learn, not punish).
- **What the machine cannot do**: the chart records what you touched; it cannot tell you why
  you wrote it. Stated on the surface, not as a locked socket.
- **Rejected / parked**: score, streak, rank (a mirror line of locked/missed only) · leaderboard ·
  time pressure (would reward speed over reading) · duplicates and degenerate targets were cut at
  derivation: "loudest hour anywhere" duplicated September, "most even month" landed on a 9-message stub.
- **Falsifiers**: (1) a stranger on a cold open cannot say what to do in 5s → the readout line failed;
  (2) holding never feels like the risk → the one-lock cost must be honoured (no undo);
  (3) the sonar cannot be localised — if players hunt by eye, the sound law failed.
