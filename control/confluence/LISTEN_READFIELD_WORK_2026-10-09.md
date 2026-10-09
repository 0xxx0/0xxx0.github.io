# LISTEN × READFIELD — phone work seam · 2026-10-09

## OBSERVED / EXACT

Current master already contains the architecture the requested expansion needs:

- `/fold-bloom/listen/` is LISTEN 0.6: local/Suno-bound audio → hashed AUDIO MAP, ADDRESS/APERTURE, marks/arcs, glyph, RIDE/LIVE, TWO DIAL, REPLAY, Beat Saber pack and SABER handoffs.
- `/lib/field-pulse.js` is the existing bounded cross-tab transport. LISTEN publishes playback/BPM/beat/phrase/section/scope/features; READFIELD already borrows tempo without borrowing authorship.
- `/docs/` is READFIELD / RSVP 0.8.5 with one source/cursor across FAST, REVIEW, PULSE, VOICE, LOCI, repository/local-file reading and RIDE/RETURN.
- LRC/VTT/SRT sidecars already preserve real timed cues in LISTEN, but the existing READ handoff flattened them to unaligned prose.
- On phone, LISTEN's capable workflows were mostly behind USE/MORE after load, increasing hunt cost.

## MOVE

Do not create another integration layer. Extend the two existing INTERPHASE host adapters.

### LISTEN

- add a compact post-load work rail: `RIDE · READ · COMPOSE · SABER · MORE`;
- surface short job-oriented explanations inside the existing USE sheet;
- when the loaded text evidence has real LRC/VTT/SRT cues, compile `readfield-track-handoff/v0.1` in addition to the existing source-text handoff;
- unaligned embedded/provider/TXT lyrics keep the current tempo-paced RSVP path and never receive invented cue timing.

### READFIELD

- when a real timed handoff is present, expose `TRACK` as an optional projection, not a new source or authority;
- consume only `FOLD_BLOOM_LISTEN` transport on the existing FIELD PULSE channel;
- verify source hash when both sides provide one;
- advance the existing READFIELD cursor by deterministic cue→character address at cue boundaries;
- any FAST / REVIEW / PULSE / VOICE / LOCI / REPO action exits TRACK immediately at the current addressed text position.

## USE CASES

1. **LISTEN → RIDE** — exact track becomes terrain; LIVE retains authored operation authority.
2. **LISTEN → READFIELD / TRACK** — timed lyrics/transcript follow playback; stop on a line and switch directly to REVIEW/VOICE/LOCI.
3. **LISTEN → READFIELD / RSVP** — unaligned lyrics or arbitrary text borrow BPM as pace only.
4. **LISTEN → TWO DIAL** — reference clock/energy/section context without copying note authorship.
5. **LISTEN → SABER** — existing AUDIO MAP → EVENT TAPE → Beat Saber mapper/test pack or internal two-phone motion proof.
6. **MARK → MESSAGE MAP** — BOOKMARK/FLAG/ARC records source-addressed drops, lyric turns, edit notes, scene cuts or cues.
7. **FAST → REVIEW → RIDE → RETURN** — preserve exact text address while changing reading/traversal projection.

## EXTERNAL BOUNDARY

Spotify is not adopted as FIELD PULSE/media-game authority: its developer policy prohibits synchronizing Spotify recordings with visual media and creating games using the Spotify Platform. Treat Spotify as an outbound listening/distribution/deep-link destination only.

Suno remains source-address/provenance + best-effort remote convenience. Local owned/downloaded bytes remain the analysis authority path. This also keeps Audiosurf/Beat-Hazard/Beat-Saber-style use compatible with source-local analysis rather than a provider-specific runtime.

## PROOF / GATE

Pure test: `/lib/readfield-track-sync.test.mjs` proves cue ordering, deterministic char addresses, time→cue lookup, handoff schema and source mismatch rejection.

CI: `.github/workflows/listen-readfield-check.yml` parses both adapters and executes the pure test. Existing PR-wide public-surface/browser checks remain authoritative for regressions.

Irreducible phone claim after machine proof: Android cross-tab audio continuation / BroadcastChannel behavior under actual browser power-management remains a real-device property. It limits only the claim of uninterrupted background TRACK; it does not block the source/address/handoff implementation.

## STOP

Do not add another media provider registry, universal transport, reader source store or new dashboard. Next expansion must arise from an observed work failure in one of the existing jobs above.
