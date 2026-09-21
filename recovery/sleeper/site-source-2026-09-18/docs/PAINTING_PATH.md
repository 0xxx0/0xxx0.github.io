# Painting / Path — completed continuation, 2026-09-16

## Objective and assumptions

Turn the 2026-09-15 camera/reading specimen into one usable painting aperture: select a real source region, read or inspect it, assemble a bounded route, and keep a source-linked return. Preserve original artwork and explicit authorship. The existing public SLEEPER Site remains the host; this is a companion surface linked from Atlas and Lab, not a renumbered thirteenth Lab instrument.

## Recovered lineage / evidence

| Source | Role | Confidence / implemented consequence |
|---|---|---|
| `painting-path.html`, 2026-09-15 | Variant / predecessor | High: recovered local source. Retain source pixels and camera controls; replace globally coupled camera/word strip with selected-region PULSE. |
| `RSVP+TTS TMP-SPEECHSYNTH (20180502)` | Historical fixture | High: read from Drive in preceding turn. Text → speech → highlighting; space splitting and missing word return are actual defects. Use language-aware units and speech-start cancellation tokens. Original file unchanged. |
| `living-painting-kit-v0.2.zip`, 2026-09-15 | Survivor contract | High: README, protocol, schema and kernel inspected. Reuse stable identity, authored region manifest, unequal projections, and explicit return. This asymmetric palace detail is a different composition from its radial examples. |
| `SEMANTIC-PAINTING-v0.6-SOLAR-CONSTRAINTS.md` | Parallel variant | High for document contents. Preserve fact/proposal/commit distinction; do not import its time ring into an image reader. |
| RUN / Atlas / Dayline cross-thread constraints supplied in conversation | Accepted constraints | One bounded aperture, plain list comparison, explicit route steps, source precedence. No assertion that every conversation was synchronized. |
| Default museum image | Source | Qiu Ying, *Spring Dawn in the Han Palace* (detail), National Palace Museum Taipei; https://theme.npm.edu.tw/exh107/npm_anime/SpringDawn/common/images/selection/img06.jpg. Original image bytes embedded; modern region outlines, captions and questions are authored, not historical claims. |

No source archive was reorganized, deleted or deduplicated. The Living Painting Kit and semantic-painting sibling remain separate. This build does not claim byte equivalence with them or universal compatibility with CAP-IR.

## Closed interaction

- Four authored source regions: peacocks, steps, window, potted tree. Hit testing uses image-normalized polygons.
- Painting and List expose the same region IDs. Changing projection does not change selected identity.
- PULSE reads the selected region. Editable authored, word, sentence or grapheme units; Chinese, English, Malay, Tamil, Japanese, Arabic and Thai locale choices. Original text remains available. Only nearby units render, keeping large passages bounded.
- Timed reading and optional device speech stay inside one passage. They cannot advance a route. Speech uses only voices the browser labels local; late callbacks are ignored after cancellation.
- Up to three route stops, including across two source images. Begin / Next / Finish are explicit. Visiting does not mark real work complete.
- Keep a finding records observation, test result, or proposed next action against the region and its source passage. Returns are append-only.
- Find a detail is a complete untimed loop: authored question → choose source region → retain miss or advance → return attempt receipt. This measures this local interaction, not general comprehension.
- New images receive no inferred semantics. Draw a polygon or use the current viewport as an outline; add title, text, purpose and optional question.
- Device persistence uses one IndexedDB snapshot plus assets. Full JSON import/export carries images, region identity, route, events and returns. Markdown exports findings. Explicit new-field flow offers export before replacement.
- Legacy Painting Path 1 sessions migrate to authored viewpoint regions and preserve old text/chunks/marks in lineage. Imported camera marks are not presented as recovered object boundaries.
- Living Painting manifest export provides region identity, geometry, reads, actions and authority for another adapter. This is a concrete handoff, not automatic live cross-app synchronization.

## Small architecture

`experiments/painting/engine.mjs`: pure state transitions, geometry, segmentation, validation, migration, manifest.
`view.js`: thin DOM, SVG image projection, local speech, file and device storage adapter.
`shell.html` + `style.css`: bounded phone viewport, semantic controls and modal secondary setup.
`build.mjs`: produces dependency-free `public/painting.html` with the original image embedded.

Regenerate the HTML after edits with `node experiments/painting/build.mjs`.

## Validation / evidence limits

- 13 pure engine/package tests: identities, explicit routes, complete challenge with misses, returns, seven-language segmentation, actual region hit tests, authoring, pack roundtrip, malformed imports, legacy migration, multi-image routes and manifest.
- 4 bundled-handler tests with simulated DOM/device events: first action and view changes, speech cancellation/sequencing, bounded large-text aperture, exported state and rejected import preservation.
- Production Worker build passed; the self-contained painting page is included in the static assets. Four existing rendered-route suites passed for Atlas, City, Lab and Interphase.
- These are not browser visual tests or real-device speech tests. Actual font sizing, pointer feel, speech voice quality and phone storage availability remain human-device checks.
- No generated depth, unseen world geometry, lyric alignment, semantic inference, cloud account, remote data synchronization or comprehension improvement claim.

## Acceptance / next bounded evaluation

Try three tasks in both Painting and List: select the window, record one visible fact, revisit its exact source. Record completion, mistaken selections and number of actions. Demote the painting representation if it adds orientation cost without improving recall or selection.

Open loops: genuine phone visual/touch check; device voice availability; one user-supplied painting with 3–8 authored regions; downstream manifest adapter only when a real consumer requires it. No additional game collection or world generation in this pass.
