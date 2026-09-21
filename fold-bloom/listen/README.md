# FOLD//BLOOM LISTEN 0.2.2

Experimental audio-ingest / temporal-field branch.

## Core loop

`SOURCE → DECODED AUDIO → AUDIO MAP → POLAR TIME × SCOPE → REACTIVE FIELD → RETURN`

The object is not a waveform ring. A song becomes an addressed temporal field that other instruments may borrow as **clock/context without borrowing authorship**.

### Sources

- **LOCAL_FILE** — canonical path. Browser-local; bytes do not leave the browser.
- **SUNO** — URL or UUID best-effort public metadata/audio resolution. Network/CORS dependent; no auth/cookie scraping.
- **REMOTE_AUDIO** — direct `http(s)` audio address, capped at 96 MB.
- Failure of a remote source returns cleanly to local file intake.

## AUDIO MAP

`decodeAudioData` produces PCM. A Worker analyzes a 12 kHz mixdown using FFT windows and derives:

- RMS energy
- spectral centroid / brightness
- positive spectral flux
- low / mid / high spectral balance
- approximate tempo + beat phase
- coarse section boundaries
- source SHA-256 provenance

After decode, a **PREVIEW** map appears immediately; material under 20 minutes then refines to a **DEEP** map. Long-form audio stays interactive in PREVIEW rather than blocking.

## Address / scope grammar

- **ANGLE = TIME**
- ring drag = scrub
- **BEAT → PHRASE → SECTION → TRACK** changes the actual addressed time window, not just a label
- 2D annulus shows beat/section witnesses even without WebGL
- reactive field uses the same AUDIO MAP features
- export emits `FOLD_BLOOM_AUDIO_MAP` JSON with source evidence

## FIELD PULSE

LISTEN publishes an optional ephemeral `field-pulse/v0.1` transport containing playback time, BPM, beat/section index, scope, energy, flux, brightness and source witness.

Current bindings:

- **LISTEN → LIVE**: beat pulse + compact track witness
- **LISTEN → READFIELD / RSVP**: explicit PULSE OFF/×2/×4/×8 maps BPM to reading pace
- **LISTEN → TWO DIAL**: opt-in metrical clock plus energy/section context
- LIVE / TWO DIAL may publish bounded operations back

Law: **borrowed clock != borrowed authorship**. Each instrument keeps its own transformation grammar. FIELD PULSE never becomes canonical state; AUDIO MAP / RETURN remain the durable evidence boundary.

## External-media boundary

- Suno share links are source addresses when public resolution works.
- YouTube is a candidate playback/link adapter; iframe playback is not treated as raw analyzable audio.
- Spotify is a listening/publishing target for this path, not a raw-audio synchronization source.
- Same-origin owned/licensed self-hosted audio is a clean future source seam.

Future, not yet implemented: beat/event tape export, Audiosurf 2 donor integration, Beat Saber draft beatmap/event export from AUDIO MAP + authored FIELD operations.

## Current evidence gate

The code is not waiting on another visual mode. It is waiting on real-track truth:

1. Retest a real phone on 0.2.2: visible PREVIEW, then DEEP map.
2. Try one real Suno/source address and record only: `RESOLVES / CORS_BLOCKED / DECODE_FAIL / MAP_READY`.
3. Compare heard transients, tempo and sections with AUDIO MAP witnesses.
4. Verify LISTEN→LIVE, LISTEN→RSVP and LISTEN↔TWO DIAL opt-in pulse behavior with real audio.

Do not add another hub, automatic musical coupling, source-specific hack or decorative visual mode before those returns.

## Provenance note

A Sep-22 coordination packet records that a real Suno address had been supplied, but the current conversation recovery did not recover its exact URL/UUID. Treat that source identity as unresolved until exact evidence is recovered; do not reconstruct it from memory.
