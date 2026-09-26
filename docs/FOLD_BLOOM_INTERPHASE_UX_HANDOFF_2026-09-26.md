# Fold/Bloom → INTERPHASE UX handoff

**Date:** 2026-09-26  
**Status:** UX recovery plus a small, reviewable LIVE pass  
**Audience:** Hermes, ForAll, and any model continuing the repo  
**Rule:** Recover the working object and contracts before adding concepts. Keep every inference labeled.

## Recovered pivot

The “Interphase cube” is best treated as the existing INTERPHASE host and projection model, not a new app-wide store or a claim that a literal 3D cube is already implemented. The surviving code is the smaller, testable base:

- [INTERPHASE core](../lib/interphase-core.js): host, selection/focus, projections, operations, and return.
- [INTERPHASE DOM adapter](../lib/interphase-dom.js) and [self-test](../tools/interphase-selftest.cjs).
- [Instrument specimen](../fold-bloom/instrument/index.html) and [instrument behavior](../fold-bloom/app.js).

The operative law is:

`OBJECT → ADDRESS → RELATIONS → OPERATORS → CONSEQUENCE → RETURN`

A surface is a projection of a sovereign object. Focus and multifocus are aperture operations; the view should be derived from them and must not silently become a second authority. Keep the host as canonical state. Extend an adapter only when it proves a missing operation.

The requested radial / linear / axial foveating aperture can be developed as geometry over this host: radial alternatives around a focus, linear order or time, axial depth/context. Center mass should be a derived orientation or projection, not a competing canonical state. This is a proposed mapping for the next specimen, not a description of code already present. Keep it small and test its lawful return before generalizing it.

Homoiconic means the same representation actually drives, edits, and round-trips the operation. The existing audio research chain is a useful test: `AUDIO BYTES → DECODE → FEATURE TAPE → BEAT / PHRASE / SECTION → GEOMETRY → RIDE`. A diagram or a shared label alone is not integration.

## What the source currently does

These observations come from the current LIVE, LAB, VOICE, and INTERPHASE source:

- **LIVE audio example:** `enterPublicDemo()` loads the bundled Center Mass excerpt and starts it; source level previously inherited the normal 78% track level. The excerpt loops. The synth has four sound scenes (DEEP, TRANCE, WOOD, VOID), but the visible scene button only looked like a world-presentation cycle. The only synth control was a master level hidden in “AUDIO / RETURN.”
- **Synth scope:** presets change rhythm, oscillator choices, pacing, and scene presentation. Individual kick, hat, bass, lead, pluck, and drone levels are not independently exposed.
- **PLAY modes:** the challenges use fixed action goals (for example RUN is six hits within eight releases). They are not timed sessions. ZEN and the base RIDE do not use those same short win counters.
- **PULSE:** three fixed rings are drawn: M (beat), A, and B. The ratio menu changes A/B tick counts (3:2, 4:3, or 5:4); it does not change the number of rings. BPM, timbre, play/stop, tap training, and event-tape export already exist. The scheduler currently emits all three lanes.
- **VOICE:** pitch/pattern practice is a separate surface and already listens to the shared Field Pulse transport when explicitly linked. Preserve that boundary. Pulse owns rhythm construction; Voice owns pitch/pattern practice.

## This review branch changes

1. The public audio example starts at 24% source volume, and the visible source slider reflects that value. The user can raise or lower it immediately.
2. The settings drawer is now **SOUND / RETURN**. It separates original-source level from generated-synth master, exposes four named sound-palette presets, and says clearly that per-instrument levels are not available yet.
3. The scene cycle and intro copy now describe both sound palette and field presentation.
4. The Play-mode picker calls these **SHORT CHALLENGES**, names the immediate goals in plain language, and tells people the goals are fixed-count rather than timed. It points to ZEN or RIDE for open play.

This makes the current affordances discoverable. It does **not** yet repair the excerpt’s duration, loop seam, perceived loudness on every device, configurable game session length, or per-instrument mix. Do not report those as solved.

## Convergence contract for follow-on work

### Keep Pulse and Voice separate, interoperable at one seam

- Keep PULSE’s ratio, tempo, timbre, lane/ring, and training controls inside PULSE.
- Keep VOICE’s microphone, target note, interval/pattern, and vocal evidence inside VOICE.
- Use the existing Field Pulse transport as an explicit optional handoff. Show whether Voice is in FREE or LINKED/CLOCK-FROM-PULSE state, name the source/BPM, and offer a clear disconnect/return.
- Do not couple Voice pitch-pattern length to PULSE ratio. Do not merge their screens just to claim convergence.
- Do not call ratio subdivisions “number of rings.” If implementing a ring-count control, define whether it changes visible lanes, audible lanes, or both. Keep trainer targets, scheduler, event tape, and on-screen rings in agreement. Add tests for each supported count and for LINKED ↔ FREE return.

### Make the game session scale legible

- Keep a quick fixed-goal challenge as the short entry point.
- Add a user-facing choice between **Quick**, **Session**, and **Open** only when it changes real progression, not just a timer badge. Preserve the same underlying ride object and record the chosen policy in the run receipt.
- Prefer one challenge policy that supplies goal counts to the existing mode rules. Do not duplicate each game’s logic in the UI.
- Validate a medium session with real users before choosing a default duration. For each mode, show the goal, estimated/selected session scale, progress, and an obvious exit/continue path. ZEN/RIDE remain open-ended.
- Add invariant tests that difficulty length does not alter the operation semantics, only the completion policy.

### Make generated sound controllable

- Keep source audio and generated sound as separate gain paths.
- The four presets remain fast ways to choose a whole sound identity.
- If exposing instrument levels, route parts through named gain nodes (for example kick, hats, low tone, lead/pluck, drone) and add a small mix reset. Keep sliders bounded and ramp gain changes to avoid clicks. The rendered event and receipt should retain the selected mix.
- Do not make the public excerpt louder to compensate for the generated synth or merge their volume controls.

### Test the public example as sound, not just as a button

Measure the bundled asset’s actual duration and true peak / loudness, verify the loop boundary, and listen on phone speakers and headphones. Keep the low initial level. If the excerpt is too short, make the listening arc long enough to hear source → map → immersion and crossfade only if the asset supports it. Preserve a one-tap mute and an obvious source-volume control. Do not infer that 24% fixes every mastering or device issue.

## Next-model operating instructions

1. Read [control current](../control/CURRENT.json), [Interphase successor](../control/INTERPHASE_SUCCESSOR.json), [core](../lib/interphase-core.js), and [self-test](../tools/interphase-selftest.cjs) before edits.
2. Treat this document’s “currently” bullets as source observations and the “contract” bullets as proposed work. Recheck the branch tip before editing.
3. Make one seam change at a time. Reuse the current host, typed transport, and lawful return. Avoid universal stores, new control layers, and ornamental geometry.
4. Keep pulse ratios, ring count, game duration, and instrument mix as distinct parameters with their own names, owners, and tests.
5. Preserve prior artifacts and receipts. Do not delete variants or label an unverified structure “the cube.”
6. After an edit, run the smallest relevant tests, inspect the actual UI layout, and report what remains unresolved in plain language.

## Open research threads and starting links

- [INTERPHASE instrument](../fold-bloom/instrument/index.html) — smallest working projection surface.
- [INTERPHASE core](../lib/interphase-core.js) — canonical host/operation seam.
- [Radial-axial instrument experiments](../foundry/axial/) — geometry precedents to inspect before generating new shape.
- [Audio map](../fold-bloom/listen/audio-map.js) and [LIVE audio controls](../fold-bloom/live/audio.js) — source evidence and generated sound.
- [Field Pulse contract](../lib/field-pulse.js), [PULSE LAB](../fold-bloom/lab/app.js), and [VOICE surface](../fold-bloom/voice/app.js) — explicit interoperability seam.
- [PLAY rules](../fold-bloom/live/play-core.js) and [PLAY loop contract](../fold-bloom/live/play-loop.js) — preserve operation semantics when varying session length.
