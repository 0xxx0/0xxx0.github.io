# POV MOD — inside the composer (lane `pov-mod`, 2026-10-21)

The inside view of the cube composer: **you stand in the room**. The walls around
you ARE the state — north wall = the wall you compose (live), east wall = the
target, west wall = the map you hold (the fold net of five rooms), the ceiling
carries the room's record (level id, title, FNV tag, its solution), the floor
holds nothing, and the door you came in by is behind you — it opens when the
composed wall matches the target.

Chain the functions left→right (`f >>> g >>> h`); a cube is **lit only where your
chain changed it** (colour is the change — a REJECT leaves a named ghost). Solve
a room, walk through the door; the net you hold lights one square per opened
room — the composed glyph IS the net of rooms.

Static, self-contained: `index.html` + `core.js` + `selftest.mjs`, system fonts,
zero external requests, no build step. `core.js` **absorbs** `../core.js` (the
one wall-algebra home, P6) and adds only rooms/net/delta/decode.

## Run

- Live: `https://0xxx0.github.io/cube-composer/pov/`
- Local: `python3 -m http.server 8743` → `http://127.0.0.1:8743/cube-composer/pov/`
- Page verdict: `?selftest=1` → title + `<pre id="selftest">` read `PASS 5/5`
- Node verdict: `node selftest.mjs` → 29 checks, `PASS 29/29`

## Gestures (phone-first, 390 px)

| act | result |
|---|---|
| drag the room | look around (yaw free, pitch clamped ±26°) |
| **drag the floor** | **paint with sound** — the borrowed hand: velocity→pitch/brightness, width→loudness, height→tone, x→pan (the Paint With Music mapping) |
| tap `Sound: off/on` | the instrument speaks (quiet by default, P3) |
| tap a SHELF function | append to the chain (slots per room; the state wall updates live) |
| tap a CHAIN slot | remove that function (the DELTA tones if sound is on) |
| press-and-hold any function | DECODE overlay: what it does + its record field + tags |
| tap a lit square on the net | return to that room |
| tap the door (after solving) | enter the next room |
| keys `←`/`→` · `Esc` | look · clear the chain + close decode |

The floor marks ARE their record: every stroke is stored as `gesture.trace`
(points, velocities, span) and the drawn marks are that record projected —
the ceiling's GESTURE row names it, the TONE row names the mapping.

## Donor resolution (form follows the named prototype)

| he named | concrete donor | mechanism transposed |
|---|---|---|
| "cube composer like the haskell app" | [Cube Composer](https://david-peter.de/cube-composer/) — David Peter (sharkdp), PureScript, MIT | start wall → target wall; visual functions composed left-to-right over the wall; zero syntax — the composition IS the lesson |
| "those lil room cubes" | cube-room lineage (P9: `room0`, cube-net fold module) | CSS-3D folded tiles; one geometry, two fold states — here the inside state |
| "glyph comp labyrinthe stuff" | the cube-net fold module (2026-10-20) | five rooms = five cells of one plus-net; solving composes the net glyph; the map you hold IS the fold net |
| "wheres the pov(?)" | — (the named absence) | a camera at the room's centre; drag to look; the door is behind you |

## Principles satisfied (register: `AXIS/work/design-intent/DESIGN-INTENT.md`)

P1 hairline palette (pad `rgb(8,12,18)` / ink `rgb(79,87,96)`) · P2 deterministic
identity (FNV-1a level + chain tags, no randomness anywhere) · P3 quiet by
default (hairline walls; depth only in the lit delta and the solved bloom) ·
P4 layers mean something (a lit cube = a changed record cell; nothing else
lights) · P8 colour only on approach (letter at rest, colour when lit) · P9
cube-room lineage (character-grid register, one input line primary) · P11
measured, not seeded + decode overlay naming every drawn mark's record field.

Acceptance proven: `node selftest.mjs` → PASS 29/29 (level solutions solve,
wrong order does not, delta/ghost correctness, net uniqueness, tag determinism,
static-law scan) and `?selftest=1` → PASS 5/5 (six faces, five net cells, wall
stacks, shelf, deterministic tags).

## Reading note (INFERRED)

"POV mod" is read here as **the POV mode of the composer** — the inside state of
the same wall algebra (per the 2026-10-21 study's "the POV is the hinge"). If
the ask was instead a POV mode on the FIELD root's walk, this page is the
provable slice of the same form and the wiring is the next move.

## Revert

Delete `cube-composer/pov/` + its manifest entry; nothing else references it.
The parent `cube-composer/` is untouched.
