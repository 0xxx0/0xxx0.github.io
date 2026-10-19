# LANE NOTE — attention (L4 ATTENTION SPIRAL, epic10 2026-10-19)

Self-contained static instrument. **No build, no npm, no CDN, no network, system fonts only.**
Open `index.html` over HTTP (or `file://` — there are no ES-module imports).

## Files

| file | role |
|---|---|
| `index.html` | shell: header, hint, canvas figure, fixed-bar readout, day chips, legend, footer |
| `core.js` | PURE geometry + data + `frame()` display list + `hitTest()` + identity stamps (`ATTN` global, also CommonJS) |
| `app.js` | painter + reveal state machine + `?selftest=1` page-as-harness |
| `style.css` | palette/type/layout |
| `selftest.mjs` | node, zero deps — 36 checks |

## Encoding law (stated once, omnibar glyph law)

`arc = day` (14 × 52°, 2.02-turn Archimedean spiral around a FIXED central bar) ·
`lane = project` (8 radial lanes, inner→outer) ·
`length = volume` (arc length is *exactly* `LREF × volume / maxVolume` on any lane or turn —
the spiral's radius sets only sector coverage, never length) ·
`tick = shipped share` (radial tick; mark solid when shipped-dominant, dashed when open) ·
`dot = open share` · `alpha = volume` · bar gauge = context total as a share of the window,
bottom shipped / top open.

Nothing scrolls: the bar never reflows, the day chips and legend space are always reserved,
so a bloom moves zero layout.

## Quiet law (P1/P3) — measured, not asserted

Rest: every canvas op ≤ 0.12 alpha, ink-only. Browser pixel readback: **max deviation 15 from
pad, 0 gold, 0 cool**. Bloom: maxDev 187, gold 269px, cool 110px on the open-heavy day.
Release restores the rest pixel state **exactly** (lit 1572, maxDev 15 — byte-identical counts).
`prefers-reduced-motion`: 20/20 in-page checks still pass under `--force-prefers-reduced-motion`.

## Provenance (P2/P6)

`hash32` is the house FNV-1a from `lib/moire-ambient.js` v0.2, absorbed (not forked): all 8
project identity tags are byte-identical to the microlib's for the same names
(`the-field=3085e15d … comms=d1faa1ce`), and the bit-slice derivation of angle/pitch/phase/alpha
matches layer-for-layer. Geometry golden `5be2461c` is pinned in **both** harnesses and the
selftest fails if the two drift.

## Verification receipts (both run, both green)

- `node selftest.mjs` → **PASS 36/36**
- headless Chrome `?selftest=1` @390×844 → **SELFTEST PASS 20/20** (title is the verdict),
  including: 385 bright pixels on the bloomed day's band, **0 elsewhere**; 105/105 hit-test
  round-trips; volume→lit-pixel correlation **0.91** across the 14 day arcs.

Deep links for the parent: `?day=12&static=1` renders one bloomed day with no animation
(headless-safe); `?selftest=1` runs the in-page assertions and writes the verdict to
`<pre id="selftest">` + `<script type="application/json" id="verify-json">` + `document.title`.
The page makes **no** fetch — the verdict is DOM-only, by house law.

## Design-intent principles satisfied

- **P1** skinny-opacity moiré — 1px hairlines, pad/lines pixel truth, ≤0.12 at rest (ENFORCED by both harnesses)
- **P2** deterministic visual-hash identity — 8 project stamps, hash-derived, human-legible tag rides the legend
- **P3** quiet by default, depth behind explicit reveal — hover/focus/tap only, release returns to exact rest
- **P4** layers must mean something — a zero-volume cell emits **no** mark (negative arm in selftest); the footer carries the geometry hash as its own datum
- **P5** one instrument, position over scrolling — fixed bar, turn/scale, nothing scrolls, counts never hidden (zero rows are shown explicitly)
- **P7** minimalist a11y — active day marked by underline + accent, not a colour block; real `<button>` chips, keyboard focusable, Escape releases
- **P8** at-a-glance legibility, colour only on approach — shape/position/lane encode first; gold+cool appear only when reveal > 0

## Limits (honest)

1. **Dataset is inline and hand-authored** (synthetic but shaped to the real arc: heavy 10-07 and 10-18, quiet between). No live source is wired; swapping `DATA` in `core.js` is the whole integration.
2. **Phone-width vertical slack** (~100–200px below the footer on a tall phone) is structural: a 390px-wide spiral is width-bound, so its diameter cannot use the extra height. The slack sits below the footer as a quiet band; nothing is clipped (asserted in-page).
3. **Marks are length-proportional, not area-proportional** — a volume-23 mark is 47px long × 2.2px wide, so a heavy day reads as a longer stroke rather than a fatter one.
4. Lane pitch is 4.6px, so at bloom the 8 lanes of one day read as a tight radial comb; that is deliberate (moiré idiom) but it is dense on a small screen.
5. Not wired into the site registry — parent lands and registers the route.
