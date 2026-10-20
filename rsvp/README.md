# PIN / RSVP · bounded repair (2026-10-20)

## One purpose
Make a practical, eye-stationary rapid reading surface that fits a watch, without adding a second canonical text owner. JSON should be **readable**, not just traversable.

## What changed
- `/rsvp/`: dependency-free HTML reader. 180px watch layout, ORP-pinned letters, progress ring (address), pause/context, adjustable 100–900 WPM, punctuation/length dwell, word-back/forward, keyboard and wheel/crown-like controls. Reads local TXT, MD, JSON, CSV, pasted text, and same-origin text URLs. Imported bytes remain in-tab; only a local content-derived position key and speed are persisted.
- `/docs/`: valid JSON now defaults to a *text/WORD* reading projection. **STRUCT** explicitly returns to navigable JSON nodes. **WRIST** passes a same-origin source URL, or session-only handoff bytes (no source text in URL).
- `field-aperture.js`: explicit TEXT/TXT/READ format now bypasses automatic JSON-tree inference; AUTO still detects JSON and preserves native tree scales.
- `lib/readfield-controls.js`: entering READ/SPEED from a JSON tree switches to the readable projection before asking for WORD/SENT.

## Three distinct clocks/authorities
1. PIN visual clock = local timer with variable dwell; no audio/TTS authority.
2. READFIELD = authoritative source cursor, structured JSON inspect, RETURN, voice options.
3. LISTEN = track/cartography/tempo owner; existing PULSE multipliers in READFIELD may borrow its clock, but PIN does **not** claim a synchronized LISTEN clock.

The circle around PIN is progress, not a decorative or simulated audio waveform. Its angle encodes position. The word stays fixed to one ORP axis. The controls appear only where a task requires them.

## Exact references
- **Native Wear OS baseline:** https://github.com/JonahZander/rsvp-reader (Kotlin; phone companion; crown; durable state; source builds, no release APK).
- **Embedded minimalism:** https://github.com/ionutdecebal/rsvpnano (ESP32 reader; page context and companion tooling).
- **Web/orp mechanics:** https://github.com/rollecode/speed-reader (web, offline-first, ORP).
- **Tiny command-line primitive:** https://github.com/pasky/speedread.
- **Evidence limiting speed claims:** Rayner et al. (2016), DOI 10.1177/1529100615623267; Benedetto et al. (2015), DOI 10.1016/j.chb.2014.12.043. RSVP removes easy regressions and can impair comprehension; user-controlled context/backtracking is functional, not optional decoration.
- Existing recovered donor / modern work: `control/confluence/RSVP_RECOVERY.md`, `control/RSVP_MECHANISM_DIFF_2026-09-21.json`, `fold-bloom/listen/`. The 2018 continuous speech-boundary clock remains a frozen experimental donor.

## Verified
- JavaScript syntax checks: `rsvp/index.html`, `field-aperture.js`, `docs/index.html`, `lib/readfield-controls.js`.
- Pure-unit checks: valid JSON -> path-addressed word stream, plain punctuation, ORP split, invalid .json -> visible error; explicit TXT -> text WORD scale, AUTO -> JSON TREE scale.

## Not claimed
- No real watch hardware or Galaxy Watch 6 test performed.
- No browser DOM/device E2E performed in this patch.
- `/rsvp/` is a responsive web proof, **not** a native Wear OS APK.
- The JSON STRUCT↔READ toggle restores the prior READ cursor; navigating a tree node and translating its structural path into an exact character index is not yet proved.
- PIN state uses a small, non-cryptographic local content key; it is not a provenance-grade content hash. No sync across watch/phone is claimed.
- No LISTEN beat-lock or continuous TTS boundary synchronization is claimed.

## On-device proof (stop if failed)
1. Open `/rsvp/` in phone browser at 180×180 viewport. TRY JSON, confirm visible sequential *hello/field/value* tokens, ORP pinned to one axis.
2. Paste actual JSON, press READ TEXT, inspect a nested key/address, scrub/backtrack, then reload: last word and speed resume.
3. Open `/docs/?src=%2Fcontrol%2FCURRENT.json`; verify WORD scale and FAST transport advance; click STRUCT, inspect nodes, click READ JSON.
4. From READFIELD, click WRIST; the same source must appear without including text in the URL.
5. Repeat in watch browser if one is available. Only then decide whether to adapt the upstream native Wear OS project. Halt if clipping, parsing, or alignment fails.

## Stop condition
Do not fold PIN into LISTEN/AXIS as another decorative ring or advertise native/clock-sync behavior until the above witnessed test passes. Prefer a single shared reading token/clock contract over duplicate components.
