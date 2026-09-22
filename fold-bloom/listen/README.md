# FOLD//BLOOM LISTEN 0.4

Experimental addressed-stream lens, currently hosted on audio.

## Core law

`SOURCE → ADDRESS → APERTURE → PROJECTION → ANNOTATION → RETURN`

LISTEN's ring is no longer treated as merely an audio visualizer. Audio is the first rich host for a more general interaction primitive:

- **horizontal / ring motion = ADDRESS**
- **vertical / wheel / ↑↓ = APERTURE**
- **BEAT → PHRASE → SECTION → TRACK = audio-specific aperture vocabulary**
- **PIN = authored evidence at an address**
- **projection may change; source identity and address do not**

The portable donor is `field-addressed-stream/v0.1` in `stream-lens.js`. It contains no audio semantics and may later host text, sensor streams, timelines or video without pretending those streams have beats or musical sections.

## Audio host

Sources remain:

- **LOCAL_FILE** — canonical and browser-local.
- **SUNO** — best-effort public address/metadata/audio resolution; network/CORS dependent.
- **REMOTE_AUDIO** — direct http(s) audio address, capped at 96 MB.

After decode:

1. PREVIEW appears immediately.
2. Material under 20 minutes refines in a Worker.
3. DEEP analysis produces energy, brightness/centroid, spectral flux, low/mid/high balance, approximate BPM/beats, beat-synchronous **phrase novelty boundaries**, coarse sections, and a provider-independent chroma-based **key + major/minor estimate**.
4. PHRASE uses detected novelty peaks when evidence is sufficient; steady/ambiguous material gets an explicitly-labelled 8-beat `GRID_FALLBACK`.
5. Source SHA-256 remains the durable identity witness.
6. The AUDIO MAP compiles a deterministic `fold-bloom-audio-glyph/v0.1` SVG from source hash + structural contour + chroma + sections + tempo.

Provider metadata such as title/tags/lyrics and optional BPM/key/time-signature fields may be preserved when present, but LISTEN does not depend on undocumented provider fields. Local analysis remains the portable fallback.

## Interaction

- ring drag: absolute polar scrub inside the frozen current aperture
- horizontal trackpad / shift-wheel: relative address scrub
- ← / →: fine address movement inside the current aperture
- shift + ← / →: beat step
- vertical wheel / ↑ / ↓: aperture change
- **P** or PIN: mark current address
- PINS: inspect, seek, edit or remove annotations

Each pin records source identity, address, aperture, note/label and a small feature witness. Pins live beside the AUDIO MAP and never rewrite analysis evidence. Export carries:

`AUDIO MAP + source provenance + deterministic glyph + addressed annotations`

## FIELD PULSE

LISTEN still publishes the bounded `field-pulse/v0.1` transport: playback time, BPM, beat/optional-phrase/section witnesses, current aperture and compact audio features.

0.4 deliberately does **not** expand FIELD PULSE with harmonic identity. Phrase position is temporal context; Key/mode stays in the durable AUDIO MAP/UI until a real consumer requires it.

Current consumers remain LIVE, READFIELD/RSVP and TWO DIAL. Law: **borrowed clock != borrowed authorship**.

## Generalization donor

For another stream, replace only the host vocabulary:

`audio seconds + BEAT/PHRASE/SECTION/TRACK`

could lawfully become:

- text: character/token address + WORD/SENTENCE/PARAGRAPH/DOCUMENT
- sensor log: timestamp + EVENT/WINDOW/SESSION/RUN
- video: timestamp/frame + SHOT/SCENE/CLIP
- arbitrary series: index/time + host-defined nested windows

The portable invariants are address, aperture, projection, pin/provenance and RETURN—not the audio labels.

## Evidence gate

Before transferring this into READFIELD or another data host:

1. Desktop/phone: verify horizontal scrub feels distinct from vertical aperture change.
2. Load materially different songs and judge phrase boundaries + key/mode estimates as **approximate evidence**, not ground truth.
3. Add/edit/seek/export pins and the source glyph; confirm both remain attached to the same source hash/address.
4. Confirm LIVE/LISTEN/TWO DIAL pulse behavior did not regress.
5. Only then build a second host adapter.

Remote Suno resolution remains convenience, not a promotion gate. Local file analysis is the authority path.


## Glyph horizon

The deterministic glyph is deliberately small and interpretable: the same exact source/map should produce the same mark. A later AUDIO GLYPH ATLAS may use learned music embeddings to arrange *neighborhoods*, but similarity must never rewrite source identity, provenance or lineage.
