# FIELD LAB / native media fold · 2026-10-20

## Problem → transformation
LAB previously rendered a RIDE-themed 2D study but offered only an outbound link to real LIVE. LISTEN's existing source glyph and ring were buried in a separate route. Cross-mode work required leaving LAB, losing the local spatial context and rebuilding a source decision.

**Matter** is exact source bytes + native state + temporal evidence. **Form** is a chosen projection (ring, road, cursor, melody, field), not a new source. The test of hylomorphism here is operational: **does changing form change what the human can do without changing what the source is?**

## Shipped boundary
- LAB **PLAY RIDE HERE** opens the full native LIVE host in a viewport inside LAB. The parent exposes LEFT/RIGHT/RELEASE that invoke existing `FoldBloomLive.step` and `FoldBloomLive.release` and observe the native history count. No alternate ride reducer.
- LAB **LISTEN / GLYPH** opens the existing LISTEN interface in the same viewport. The parent renders its exact `audio-glyph` recipe (12 pitch-class spokes, 24 envelope samples, section ticks, tempo circle), not a hand-drawn stand-in.
- **RIDE THIS** is an explicit local-only, same-origin source-file handoff. It calls LISTEN's bounded `sourceFile` API, passes a `File` to LIVE's already-existing `loadFiles` method, and checks LIVE's resulting source SHA-256 against LISTEN's before declaring a match. A timeout, no bytes, or mismatch is **UNVERIFIED**, never 'matched'.
- **↩ LAB** pauses both native audio elements, preserves LAB's mode, and keeps the native frames in this one visit. No global source manager, no uploads, no new route, no provider integration, no duplicate canvas playback engine.
- A 12-bin `harmonic-evidence` micro-function interprets **only** a measured DEEP chroma vector; all PREVIEW and AUDIO_ONLY maps display unmeasured pitch. Deep-map labels are explicitly estimates. No chord, note-event, melody, tuning-system or music-generation claim.

## Prior art → borrow / reject
- [Google Paint With Music](https://magenta.tensorflow.org/paint-with-music) (released June 2021) maps drawing positions into pitch and uses DDSP pretrained instrument timbres. Borrow the **shortness of the instrument mapping** (one gesture has audible consequence), not painting-to-note novelty claims.
- [MusicVAE](https://magenta.withgoogle.com/music-vae) models interpolation through a learned latent space. Borrow only if there is an exact *musical editing operation* that beats the current native set/two-dial machinery and its output can carry source + edit receipts.
- Existing repo components already cover `voice/pitch.js` (Hz/MIDI/cents), `two-dial/music-data.js` (instrument/scope presets), `listen/analysis-core.js` (chroma/beat/section estimates), `pulse/psychophysics.js` (rhythmic entrainment), `listen/audio-glyph.js` (glyph), and `live/engine.js` (native meaningful release). **Do not introduce Tone.js, Magenta model weights or a new tonal framework now.** Add a dependency only to satisfy a falsified missing function.

## Gates
1. Cold LAB `/fold-bloom/lab/` → PLAY RIDE HERE → real LIVE boots inside LAB without navigation. Actual LEFT/RIGHT changes rotation; a lawful RELEASE grows native history; ↩ closes to the same LAB mode.
2. LISTEN / GLYPH → TRY DEMO local → hash and native glyph descriptor become visible at LAB surface; `sourceFile()` retains bytes; no musical-key assertion in AUDIO_ONLY.
3. RIDE THIS explicit path: exact expected sha256 == resulting LIVE hash. Headless decoder may be unable to prove the full handoff; that must be reported as **UNVERIFIED**, not a success. Device audio output, sound quality and touch feel also remain human/device gates.
4. Script syntax, pure harmonic claims, routes, global public-surface and security invariants. No unrelated CURRENT-ledger mutation.

## Stop, follow-up
If native LIVE release cannot be committed inside LAB, fix that interaction before adding any new mode. If source transfer repeatedly times out even on a real device, lift the **audio decoder error boundary** in LIVE natively—not a LAB-specific playback or copied map.
Only after these gates, fold RIDE/READ/VOICE/INK into one **addressed action receipt**. Measure first-action time and re-entry loss, then retire redundant chrome. The lab's eight domains stay distinct native responsibilities, not eight supposed source authorities.
