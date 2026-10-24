# Painting / Path — with THE HAND (2026-10-24)

The route was a 1,479 B stub. It now carries the **real instrument** (the recovered, self-contained
`public/painting.html` build from the sleeper site source) plus an **additive hand layer**:
the BORROWED HAND's magenta ink, absorbed, in mute mode.

## What is on the page

- The instrument, unchanged: Qiu Ying, *Spring Dawn in the Han Palace* (detail), four authored
  regions (peacocks / steps / window / potted tree), PULSE reading in seven scripts, ≤3-stop routes,
  findings as append-only returns, local-only speech, IndexedDB snapshot, manifest export.
- **THE HAND** — a canvas overlay inside `#field`:
  - **Hand · off** by default (P3): the painting pans; nothing is painted until you arm it.
  - **Sound · mute** by default: master gain is 0 until you arm it; arming ramps to 0.18 (donor value).
  - Strokes: width from speed (fast = thin, 12→2 px), ink alpha grows with speed (P8 colour on
    approach), magenta `rgba(224,106,156,α)`.
  - Audio law, absorbed from `/20261018-borrowed-hand/` (donor commit `f9033a8b4`, mechanism
    Paint With Music × Magenta DDSP): velocity → pitch + brightness (lowpass 900–4300 Hz),
    width → loudness, y → tone (180 + y^0.7·1220 Hz), x → pan.
  - Every stroke is a record: `window.PaintingHand.record()` → `{schema:'painting.hand/v0.1',
    field:'hand.trace', strokes:[{i,t0,dur,points,wMean,vMax,tick}]}` — P11: the mark names its field.
  - Deterministic (P2): no randomness, no clock in any mapping; the clock only stamps durations.
- `?selftest=1` runs 12 in-page assertions and prints `PAINTING HAND n/12`.

## Reproducible build

```bash
# source instrument (recovered site source, lives outside this repo)
SRC=~/wt-systemfix-20261007/recovery/sleeper/site-source-2026-09-18/public/painting.html
python3 build-hand.py "$SRC" hand-layer.fragment.html index.html
```

`build-hand.py` inserts the fragment once, before `</body>`, and refuses if a hand layer is
already present. The fragment is plain ES5 + one `<canvas>`; it never edits the instrument's code.

## Proof (2026-10-24, headless Chromium)

- selftest **12/12**; 4 region pins; selecting 孔雀 · Peacocks opens the reader (`先看…`).
- drawn stroke: **1,828 ink pixels**, max alpha 153, record = 1 stroke / 23 points / wMean 11.41 /
  tick `muted`; audio gain **0** while muted, **0.18** after arming sound; 0 JS errors.
- phone viewport 390×844: canvas resizes to the field, instrument still interactive.
