# FOLD//BLOOM LISTEN 0.5

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

For local MP3s, LISTEN also reads common ID3v2.3/v2.4 identity fields and **USLT embedded lyrics** when present. These lyrics are preserved as `UNALIGNED_EMBEDDED_ID3`: text evidence only, never claimed karaoke timing. Provider metadata remains optional provenance; local bytes/hash remain the authority path.

## Interaction

- ring drag: absolute polar scrub inside the frozen current aperture
- horizontal trackpad / shift-wheel: relative address scrub
- ← / →: fine address movement inside the current aperture
- shift + ← / →: beat step
- vertical wheel / ↑ / ↓: aperture change
- **P** or PIN: mark current address
- PINS: inspect, seek, edit or remove annotations
- **IDLE**: let the source play while LISTEN witnesses beat → phrase → section aperture changes; IDLE never scrubs or writes pins and restores your prior aperture on takeover

Each pin records source identity, address, aperture, note/label and a small feature witness. Pins live beside the AUDIO MAP and never rewrite analysis evidence. Export carries:

`AUDIO MAP + source provenance + deterministic glyph + addressed annotations + human-authored addressed-message path`

## FIELD PULSE

LISTEN still publishes the bounded `field-pulse/v0.1` transport: playback time, BPM, beat/optional-phrase/section witnesses, current aperture and compact audio features.

0.5 deliberately does **not** expand FIELD PULSE with harmonic identity. Phrase position is temporal context; Key/mode stays in the durable AUDIO MAP/UI until a real consumer requires it.

Current consumers remain LIVE/DRIVE, READFIELD/RSVP and TWO DIAL. GLYPH ATLAS receives a separate session-local glyph/source witness, not the audio bytes. Law: **borrowed clock != borrowed authorship**.

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

Before expanding the addressed-source cycle:

1. Desktop/phone: verify horizontal scrub feels distinct from vertical aperture change.
2. Load materially different songs and judge phrase boundaries + key/mode estimates as **approximate evidence**, not ground truth.
3. Add/edit/seek/export pins and the source glyph; confirm both remain attached to the same source hash/address.
4. With the exact same source loaded in LIVE, verify LISTEN pins arrive as authored road landmarks and remain attached to their addresses.
5. If the MP3 contains embedded USLT lyrics, open READFIELD and verify the text arrives explicitly unaligned.
6. Confirm LIVE/LISTEN/TWO DIAL pulse behavior did not regress.

Remote Suno resolution remains convenience, not a promotion gate. Local file analysis is the authority path.


## Glyph horizon

The deterministic glyph is deliberately small and interpretable: the same exact source/map should produce the same mark. A later AUDIO GLYPH ATLAS may use learned music embeddings to arrange *neighborhoods*, but similarity must never rewrite source identity, provenance or lineage.


## Address choreography

A PIN is not merely a note in a panel. Several source-scoped PINs form a source-ordered, human-authored path. LISTEN exports that path as `fold-bloom-addressed-message/v0.1`. The machine may preserve address, source hash and measured feature witnesses; it does **not** infer what the path means.

The first embodied consumer is LIVE/DRIVE: when the exact same hashed local file is loaded, those PINs become approaching road landmarks. This is the bounded mechanism behind the “map builder → another person experiences it” horizon.

## IDLE law

LISTEN follows `/control/FOLD_BLOOM_IDLE_CONTRACT.json`: autonomous motion may witness a source but may not impersonate human authorship. First direct input wakes the instrument at the source's current address.
