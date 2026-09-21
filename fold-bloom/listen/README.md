# FOLD//BLOOM LISTEN 0.1

Experimental audio-ingest branch.

## Core loop

`LOCAL AUDIO → AUDIO MAP → TIME RING × SCALE RAIL → AUDIO-REACTIVE FIELD → RETURN`

- Drop an audio file. Bytes never leave the browser.
- `decodeAudioData` produces PCM.
- A Worker analyzes 2048-sample Hann windows / 1024 hop with a radix-2 FFT.
- Features: RMS energy, spectral centroid, positive spectral flux, low/mid/high spectral balance.
- Tempo: onset-envelope autocorrelation + phase estimate.
- Sections: coarse multifeature change points.
- `ANGLE = TIME`; ring drag scrubs.
- `WHEEL / ↑↓ = BEAT → PHRASE → SECTION → TRACK`.
- WebGL2 Julia field reacts to the same map; 2D annulus exposes beats, section boundaries and current time.
- Export emits `FOLD_BLOOM_AUDIO_MAP` JSON with source SHA-256.

## What this is not

Not an Audiosurf clone, not a DAW, and not yet a Fold/Bloom canonical mode. It is a proof that uploaded music can enter the family through a bounded analysis object.

## Next gate

Use three materially different tracks. A useful map should:
1. put visible event density near heard transients,
2. estimate tempo close enough that beat stepping feels musically plausible,
3. produce section boundaries that correspond to at least some heard form changes,
4. remain responsive on a phone-sized viewport,
5. make BEAT/PHRASE/SECTION/TRACK feel like real scope changes rather than labels.
