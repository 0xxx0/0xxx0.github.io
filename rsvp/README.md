# READFIELD / WRIST — one reader, two layouts

Objective: read the same exact source through ordinary text, JSON structure and
compact RSVP without losing the addressed position. `/docs/` remains the source
host. `/rsvp/` is its small layout; it no longer has a tokenizer, timer or separate
position store. No source archive is moved or deleted.

## Use

1. Open `/docs/`, load a repository path, paste or local text/JSON file.
2. READ ↔ STRUCT carries the addressed JSON node. Selecting another node changes
   where reading resumes; an unchanged round trip retains the exact character.
3. WRIST carries source bytes, SHA-256, cursor and pace into `/rsvp/`. Open its
   source drawer → READFIELD to return at the position reached there.

Local source bytes stay in sessionStorage. Bounded positions use the existing
`FieldSourceTrail`; source text never enters a URL. Playback stops on a hidden
tab. A failed or mismatched import leaves the held source intact.

## Lineage / evidence

| Phase / exact artifact | Classification | Surviving function / confidence |
|---|---|---|
| 2018 temporal-focus donor, `recovery/rsvp/`; `control/confluence/RSVP_RECOVERY.md` | frozen fixture | Continuous speech-boundary experiment; preserved, no wrist audio-sync claim. HIGH for checked-in recovery record. |
| 2020 `recovery/poly-furnisher/interphase-lineage/interphase-2020.html` | fixture | Source/state/transformation lineage; current path optics already extracted (`control/confluence/INTERPHASE_CONVERGENCE_2026-10-09.md`). No monolith revival. HIGH for repository artifact. |
| READFIELD `field-aperture.js`, `/docs/`, `lib/readfield-controls.js` | survivor | Source cursor, scale, ORP, segmentation, visual clock, speech, text/structure and RETURN. HIGH. |
| LISTEN → TRACK `lib/readfield-track-sync.js` | complementary survivor | Audio-owned clock → addressed text cue. Preserved. No PIN/wrist substitute for the audio host. HIGH. |
| `e727bbd` (2026-10-20), original `/rsvp/index.html` | variant / retired duplicate mechanisms | Working compact ORP/progress layout retained. Its inline tokenizer/timer and `pin.progress.v1.*` writer are removed from current execution; exact old code stays in Git. HIGH. |
| This continuation, READFIELD 0.8.6 | runnable successor | Both layouts use FieldAperture and FieldSourceTrail. READ ↔ STRUCT ↔ WRIST preserves exact raw text and character anchors. HIGH after machine checks below; human comprehension UNKNOWN. |

## Reused fragments / boundaries

| Fragment | Exact owner / input | Dependency / effect |
|---|---|---|
| Segmentation, ORP, playback | `field-aperture.js` | Intl.Segmenter / existing fallback; native visual timer and optional speech remain here. |
| `jsonSpans`, `jsonNodeAt` | Same engine; original JSON text | Pure UTF-16 spans for values and keys; safe paths distinguish `a.b` from nested `a` → `b`. No serialization of source. |
| Position | `lib/read-trail.js` | Existing bounded browser-local traversal evidence. No claim of comprehension or cross-device sync. |
| Wrist projection | `rsvp/reader.js` | Displays the engine snapshot; adapts file/path/session input and explicit handoff. No application dependency. |
| Source identity | `lib/id.js` | Existing SHA-256; source mismatch rejects before loading. |
| Host continuity | Existing `rsvp.handoff.v1` / `readfield.handoff.v1` | Session-only source + focus; explicit navigation. No new registry or canonical source store. |

`/rsvp/` becomes a utility child of `/docs/`, retaining its stable address. The
WRIST label replaces a separate PIN product identity. LISTEN, LIVE, ROOM and the
recovered Ω workbench remain distinct native owners. PR #966 and #981 are owning
candidates, not permission to import their whole branches here. Historical sources
remain fixtures. No byte-identical archive duplicate is asserted or deleted.

Repeated JSON member names cannot supply a unique structural address. Mapping
fails visibly there; exact source text remains readable. Container → READ starts
at that container; unchanged READ → STRUCT → READ retains its original position.
Old unsafe dotted-key addresses are not guessed into new bracket-quoted paths.
The old PIN position indices are preserved locally but not promoted into exact
character positions; the shared trail supplies all new resume positions.

## Acceptance / falsifiers

- `node tools/reading-source-selftest.cjs`: exact CRLF/spacing/escapes/numeric
  spelling, key and value spans, special-key separation, duplicate-ancestor
  rejection, scalar/empty JSON, 64 nested fixtures and page syntax.
- `node tools/reading-continuity-smoke.mjs`: real Chromium at 320×640, 390×844,
  1280×800; source → tree → same cursor, tree movement → correct text, WRIST →
  step → reload → READFIELD, raw-byte and source-address equality. At 180×180:
  native READ/RIDE exact span RETURN; reachable transport, local JSON, native playback/pause, invalid import keeps
  source and tampered hash rejects before loading.
- Existing timed cue and source-trail tests; native READ/RIDE exact RETURN;
  selected repository ship checks. Both pages version their changed engine
  dependency as `?v=0.8.6` to avoid mixing new adapters with cached old APIs.

Stop if any handoff changes source identity/bytes or silently resets position.
Fix the existing host rather than adding a new source model or reader mode.

## Unresolved / next levers

1. Real watch hardware, Android power management, physical touch comfort and
   subjective comprehension remain unmeasured. The 180px browser proof is not a
   native Wear OS app or a physical-device claim.
2. Select one real long source and one useful operation before extracting any
   more old INTERPHASE machinery. This pass does not claim corpus-wide ingestion,
   semantic JSON narration or general operation authority over other hosts.
3. Continue with exact object/focus continuity only where a reproduced failure
   demands it. No archive reorganization is required to use this reader now.

## 28 Oct 2026 · Source bearings / one lawful operating surface

Use the current `/rsvp/` page, not a separate project UI:

1. **PIN** on a passage or a currently focused word remembers that exact
   source interval. Press PIN there again to remove the *bookmark*, not a
   separate authored question.
2. Select text → **NOTE** to write a `NOTE`, `QUESTION`, or `APPLIED`
   observation. The quote, start/end UTF-16 positions and exact SHA-256
   revision are checked before saving. `MARKS` is a plain list, not a second
   document; selecting a mark seeks the native reader. Direct circular glyph
   and linear rail stops invert to the same address.
3. **COPY REF** inside an annotation copies a real READFIELD
   `?src=/path&ap_char=N` link where a repository path exists, with the
   source hash, quoted bytes and precise range. Local-only sources receive
   explicitly non-clickable citations; source text is not placed in URLs.
4. The faint extent is **furthest VISITED**, not completed or understood.
   `FieldSourceTrail` binds last/visited positions to source revision. A
   changed file at the same path resets the visited extent and cannot
   restore the old cursor. Earlier authored marks remain parked as
   **UNBOUND** and are never implicitly attached to different bytes.
   Legacy unversioned positions cannot claim exact re-entry.
5. The available phone space retains the entire current text or an
   explicitly bounded long-source window. The source-selected word is
   highlighted in that same text. LISTEN's original source glyph and
   measured audio-energy contour remain optional and source-bound.
   The 180px wrist remains the minimal ring and transport.

**Same owners, not a new ontology:** `FieldAperture` owns focus/clock;
`FieldSourceTrail` owns browser-local traversal and marks;
`ReadfieldReviewModel.bound` decides if authored evidence belongs to the
current bytes; `READFIELD` remains source owner; INTERPHASE provides
cross-source relationships and exact RETURN; Scale Lens projects scale
without rewriting identity; Atlas Dayline owns the *temporal decision*
whether an `APPLIED` passage becomes a task. A note is not silently
promoted to a Dayline obligation. The user's explicit COPY REF action is
the available cross-work carrier. No duplicate bookmark database,
automatic comprehension metric or infinite radial graph is invented.

This cuts four specific friction points against established tools: the
fast annotation focus and revisit familiar in Reader, exact
quote/position binding standardized by W3C Web Annotation, a
side-by-side fovea+periphery (no hidden text during RSVP) and one
navigable source-spine at phone width. It does **not** claim PDF/EPUB
parsing, cloud-sync, graph-based semantic discovery, collaborative
editing, or general cross-source pin navigation.

**Promotion tests:** `tools/reading-trail-revision-selftest.cjs`;
`tools/reading-continuity-smoke.mjs` (320/390/1280 and 180px),
including pin/question creation, ring↔rail inverse, exact copy reference,
reload, native READFIELD review, and same-path changed-source demotion;
existing LISTEN real MP3+text source, review/annotation and source
identity suites. Subjective reading speed/recall and physical-device
comfort still require human comparison.
