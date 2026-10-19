# ROOM-0 — cube-room reading instrument (lane `room0`, epic10 2026-10-19)

One CSS-3D cube holds **one object** — `the fovea lens / FIELD root`. Six walls = six
readings: **OBJECT · ADDRESS · STATE · TRANSFORM · PROVE · RETURN**. The held object's
glyph + name sits at the room's centre, seen through whichever wall faces you.

Static, self-contained: `index.html` (inline CSS + JS, system fonts, zero external
requests, no build step). `selftest.mjs` is node-only, no deps.

## Run

- Open the file directly: `open index.html` (works on `file://` — no imports).
- Or serve the lane: `python3 -m http.server 8743` → `http://127.0.0.1:8743/index.html`
- Page verdict: add `?selftest=1` → title + `<pre id="selftest">` read `PASS 4/4`.
- Node verdict: `node selftest.mjs` → 9 checks, `PASS 9/9`.

## Gestures (phone-first, 390 px)

| act | result |
|---|---|
| drag anywhere (touch/mouse) | rotates the room, `0.30°/px`, ROTX clamped ±105°, ROTY free |
| release | snaps to the nearest wall and holds its bloom 2.6 s → back to quiet |
| tap a wall | turns that wall to view and blooms its label + reading |
| tap the RETURN wall | emits one line: `room0 · OBJECT "…" · STATE "…" · GLYPH …` (+ clipboard if allowed) |
| bottom chips / keys `1`–`6` | go to wall; `←`/`→` step walls, `↑` STATE, `↓` PROVE, `Esc` quiet |
| hover (pointer devices only) | blooms the wall under the cursor (`@media (hover:hover)` — no sticky hover on touch) |

At rest the room is hairline edges only: no labels, no readings. `prefers-reduced-motion`
keeps the exact same depth (bloom, lit readings, glyph blades) with zero tween — transitions
off, rotation follows the finger 1:1, snap is instant.

## Every visual layer carries a datum (P4)

| layer | datum |
|---|---|
| 1 px face edges, rest alpha `.12` | the six walls themselves |
| tick row on each wall (1–6 `i`) | that reading's index 01/06 … 06/06 |
| axis micro-line (`F · +Z PRESENT · 01/06`) | wall letter, axis, role |
| vertical facing meter (`.zk`, `scaleY`) | live dot product of wall normal vs view axis (0 at edge-on) |
| centre ring + dot (rest form) | the held object at rest — fovea rest-state law |
| 8 glyph blades, presence/length/angle | bits of `FNV1a-32(canon)` = `d228dede` |
| centre tag line | the same identity hash, human-legible |
| `FACE … RX … RY … QUIET/BLOOM` | live rotation state + bloom state |
| RETURN receipt line | object canon + STATE reading + glyph, in one line |

No randomness anywhere; identity is a pure function of the canon string.

## Design-intent trace

- **P1** pad `rgb(8,12,18)`, ink `rgb(79,87,96)`, 1 px hairlines, every rest layer alpha ≤ 0.12
  (measured: border `rgba(79,87,96,0.12)`, ticks/meter `0.12`, ring `0.12`, readings `0`).
- **P2** deterministic identity: `FNV1a-32("the fovea lens / FIELD root") = d228dede`,
  declared in `data-glyph-tag`, recomputed by the page *and* independently by `selftest.mjs`.
- **P3** quiet by default, bloom only behind drag / tap / focus / hover; release decays to
  quiet in 2.6 s; reduced motion gets depth with no motion (forced via
  `Emulation.setEmulatedMedia`, `data-rm` flips, `transition-duration: 0s`).
- **P4** layer↔datum table above; nothing decorative without a datum.
- **P7** active chip = underline, not a colour block; focus ring is a 1 px hairline.
- **P8** legible at rest by shape/position (edges, meters, ticks); colour only on approach.
- **P9** cube-room lineage: monochrome character grid, terse uppercase micro-labels, CJK
  wall marks (物址态变证返) — spirit kept from `foundry/room/room-0.1.html`, which was read
  only and never modified.

Note: `b94df3ef` is the operator-supplied ship receipt and rides verbatim in the STATE
reading; `d228dede` is the computed glyph hash of the canon string. Two different values,
two different roles — both labelled as such on screen.

## Evidence

- `node selftest.mjs` → `PASS 9/9 · ROOM-0 SELFTEST` (exit 0).
- `?selftest=1` in Chrome → `SELFTEST PASS 4/4`, `data-render=ok`, no `data-boot-error`.
- CDP at 390×844 (emulated viewport): `scrollWidth == clientWidth == 390`, no element
  wider than 391, chips fit, centre block does not overlap head or reading (gap 230 px vs
  106 px core). Rest → tap → decay measured live: readings `0 → 1 → 0`, border
  `0.12 → 0.55 → 0.12`, `transition-duration` `0.42s` at rest and `0s` while dragging.
- Screenshots reviewed at rest and in bloom (scratch: `room0-rest.png`, `room0-bloom.png`).

## Limits

- Verification was headless Chrome + synthetic pointer events: real-device touch feel
  (momentum, palm rejection) is unchecked.
- Clipboard copy of the RETURN line is best-effort; when the API refuses, the line still
  prints in the footer.
- Walls are read face-on: mid-drag you see projected/foreshortened text (expected for a cube).
- One object only — no object switching; the registry lives elsewhere.
