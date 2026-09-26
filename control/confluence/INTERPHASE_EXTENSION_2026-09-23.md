# INTERPHASE 0.2 — shared host + browser extension cut

Status: **EXPERIMENTAL CONVERGENCE CUT**

This is not a new sovereign app.

It extracts one small host protocol from the existing INTERPHASE / Lens / APERTURE / READFIELD / FIELD / projection-contract lineage, then proves that the same protocol can sit over an ordinary website.

## Plain rule

**Data exists once. INTERPHASE keeps selection/focus/view state outside the data, composes lawful paths into data, and lets unequal projections expose only the channels they actually carry.**

Current channels:

- identity
- address
- content
- depth
- time
- authority
- raster
- evidence

A projection declares which channels it can carry. Anything omitted becomes explicit `residue`; it is not silently discarded.

## Files

- `/lib/interphase-core.js` — dependency-free core, multifocus, projection state, RETURN frames, edit receipts, tiny composable optics.
- `/lib/interphase-dom.js` — generic browser DOM adapter.
- `/lib/interphase-field.js` — FIELD route adapter over existing `FieldLensHost`; no second FIELD selection authority.
- `/lib/interphase-readfield.js` — READFIELD adapter over the existing `field-aperture` cursor; no second text cursor.\n- `/lib/interphase-lens.js` — Scale Lens adapter over its existing snapshot/focus/aperture/project/RETURN API; LensState remains authority.\n- `/lib/interphase-listen.js` — LISTEN source/address/aperture adapter; LISTEN remains audio cartographer.
- `/manifest.json` + `/interphase-extension.js` — Manifest V3 load-unpacked browser extension.
- `/tools/interphase-selftest.cjs` — core law check.

## Extension

Load the repository root as an unpacked extension.

The extension adds one tiny `◎` control to ordinary pages.

When active:

- click = select + focus;
- shift-click = multifocus;
- PAGE / FOVEA / LINE / RING / SIX / GLYPH are views over the same DOM objects;
- editable native form controls may be changed through the instrument;
- all generic button/link effects remain disabled;
- projection residue is shown rather than hidden;
- MARK RETURN / RETURN restore INTERPHASE view/attention state;
- Escape releases the overlay.

The generic DOM adapter is deliberately modest. Canvas/WebGL/cross-origin/opaque application state requires a richer site adapter rather than invented semantics.

## FIELD / READFIELD convergence

FIELD now exposes the current route focus through the same host protocol, but `FieldLensHost` remains authoritative.

READFIELD now exposes the current Aperture snapshot through the same host protocol, but `field-aperture` remains authoritative.

This is the intended convergence law:

```
host owns domain truth
        ↓
INTERPHASE adapter
        ↓
shared select / multifocus / projection / operation / RETURN
        ↓
host-specific or generic views
```

No state is copied into another canonical store.

## Recovered donor authority\n\n`/spikes/003-one-instrument/` remains the direct proof donor for the six-office carrier and explicit `CONTENT / AUTHORITY / DEPTH / TIME` residue. INTERPHASE 0.2 does not supersede that spike; it extracts the reusable host protocol and carries the same six panel elements across `FLOWER_KEY ↔ ROOM` in the browser extension.\n\nThe six offices `SOURCE / FRAME / FOCUS / OPERATE / WITNESS / RETURN` are a reusable preset, not a universal ontology.\n\n## FOLD//BLOOM reduction\n\nThe current family is treated as three operational roles rather than many state systems:\n\n1. **SOURCE / CARTOGRAPH** — SET + LISTEN + Atlas: exact source refs, maps, paths, memory.\n2. **COMPOSE** — Two Dial / operator algebra: authored transformations and parameter relations.\n3. **RIDE / EMBODY** — Journey + LIVE: traversal/play/embodied projection over source + authored operation state.\n\nLISTEN is the first role bound to INTERPHASE in this cut. No claim is made that the other surfaces are already migrated.\n\n## What this proves

This cut is successful if:

1. the same core can sit over FIELD, READFIELD and arbitrary DOM;
2. projection changes cannot mutate host data by themselves;
3. multifocus is core state, not a special UI feature;
4. an edit through the generic DOM adapter changes the native host element itself;
5. unsupported channels appear as residue;
6. exact view/attention state can RETURN without reverting committed data.

It does **not** prove that every projection can show every object.

The heterogeneous collapse spike already falsified that stronger claim.

## Physical MAKE consequence

The same protocol can later address physical objects, fixtures and assemblies if the physical host supplies:

- stable object identity;
- containment / mating / routing relations;
- measured state;
- lawful operations;
- explicit irreversible-effect boundaries.

A cube net, rotary carrier, panel, cassette, rail or printed glyph can therefore become a physical projection/controller over the same address graph. Physical geometry is canonical only when the user/build declares that geometry as real structure; renderer coordinates are not.

## Stop

Do not build another dashboard around this.

Next useful proof is real use of the extension on unrelated websites plus one richer host adapter where generic DOM is insufficient.

## GLYPH conformance pass — 2026-09-23

Authority: `/control/TRANSDUCTIONS.json` (`instrument_cell`, existing GLYPH cell,
`xd.focus.address`, `xd.lens.compose`, `artifact_fold.lossless_test`),
`/control/REPRESENTATION.json`, and `/control/INTERACTION_SEMANTICS.json`.
Contribution: DELTA + tested EVIDENCE. No new transduction, schema, registry,
composition engine, source store, application, or shell demotion.

### Recovery and counterfactual

Planning began at `69d2dbf`; implementation recovered `5b56b78`, including
`8217a32`'s new shared glyph/ring renderer and the existing mapping/recovery work.
The earlier dirty Atlas Dayline disclosure edits were no longer present at
implementation entry. The current file was left untouched, not reconstructed
from the older diff. Its SHA-256 at verification is
`2e39333516a9416f2e67e4f4df212a62d014eede3a02eae3722fd18302b7ef2b`.
This pass does not claim that those earlier edits were committed or preserved elsewhere.

The useful common seam is representation delivery, not feature derivation.
FIELD and LISTEN conform without translating their features. This earns the hook;
it does not earn a universal glyph algebra. The existing shared renderer had
copied audio polygon/chroma drawing into `audioCore`. That duplicate and its
structural `radial` sniffing are removed. Native audio rendering now supplies the
inner image; the concurrent shared rings, focus spine and generic polygon remain.
Fold/Bloom's existing cached-audio consumer uses the same native helper so that
removing the duplicate does not regress its source witness. Its `sha256:` address
spelling and LISTEN's raw hash remain distinct host conventions.

### Producer comparison

| Producer | Identity / return address | Derived features and stable visual meanings | Renderer detail and compression residue |
|---|---|---|---|
| FIELD (`field-glyph.js`) | Route `href`, supplied by FIELD; marks alone are not unique | Kind → frame; operation class → inner mark; status → color; optional NOW/HEAD/issue marks | Size/stroke/layout are rendering. Body, ancestry, evidence, execution authority and detailed status semantics remain host-side. The adapter does not invent unavailable attention flags. |
| LISTEN (`audio-glyph.js`) | Exact source hash; host retains time/scope address | Hash → rotation; sampled energy/flux/brightness → radial contour; chroma → spokes; BPM → inner radius; section count → ticks | Padding, colors and pixel size are rendering. No audio bytes, waveform, lyrics, full analysis, clock, seek authority or provenance proof can be reconstructed from this witness. |
| Glyph Atlas audio cells | Entry ID/source hash; focused cell and existing LISTEN/LIVE/rebind links | Same native audio descriptor/renderer as LISTEN | Cell layout, thumbnail/focus sizes are rendering. Authored paths/notes, collection/origin, byte availability and rebinding remain Atlas/host state. A glyph packet is not a source backup. |
| Glyph Atlas document cells (`document-source.js`) | SHA-256 of exact file bytes; READFIELD handoff preserves source identity/address | Text density → radial bins; paragraph/heading distribution → spokes; section count → ticks | Reuses the audio-shaped descriptor with non-audio meanings. Words, hierarchy and source bytes remain residue; do not label document spokes chroma or infer tempo. No document adapter migration here. |
| Spike 003 / Fold/Bloom identity recipes | Explicit node/active object ID; spike focus/RETURN or instrument host | Deterministic hash → polygon choices | Geometry does not encode content, proof or capability. Similar/colliding shapes are possible. Existing recipe variants remain unequal. |
| Shared INTERPHASE glyph/ring renderer | Host node ID/address; extension button focuses that same node in FOVEA | Deterministic identity fallback, plus explicitly supplied native inner image; contextual rings remain available outside compact GLYPH output | Ring geometry is a carrier. Channel presence is not channel content, an operation mark is not authority, and an ordinal ring does not prove cyclic semantics. |
| Verse Atlas route glyph | Canonical 4×7 cell addresses and authored ordered path; same source/path tabs and RETURN | Path cells → positions; typed edges → color/dashing; endpoints → marks | Pixel grid and line widths are renderer details. Meaning, prosody, proof, text and authoring authority cannot be inferred from proximity. Keep specialist host semantics. |

Across producers, collapse preserves an addressed reference plus selected derived
witnesses. Expansion dereferences the host; it never inverts an image. Stable
identity + recipe/version + identical derivation inputs reproduces the descriptor.
New audio analysis or changed FIELD status can change the glyph without changing
identity. Poem Map/READFIELD focus wheels are not automatically new glyph producers;
READFIELD's imported source witness remains a derivative of the original recipe.
Foundry operator meanings require an explicit host mapping, not visual analogy.

### Minimal runtime contract within the existing GLYPH cell

`adapter.glyph(resolvedRef)` optionally returns `{recipe, descriptor, svg}`.
This is ephemeral runtime output with no schema discriminator or persistent store.
`recipe` uses existing Lens descriptor vocabulary (`lensId`, `lensVersion`,
`kind`, `authority`, `params`, `inputContract`, `outputContract`, `preserves`,
`hides`, `derives`); native `descriptor` remains domain-owned.
`host.glyph(ref)` supplies the authoritative ID/address and inspectable support
result. Missing/invalid/failed derivation falls back visibly; it never selects
another source. The hook is a trusted repository adapter boundary, not a sandbox
for arbitrary plugins; its purity and source filtering are covered by host tests.

Both recipes are VIEW_LENS/PREVIEW, output `projection/glyph`, and retain only
identity/address as complete channels. GLYPH projection results omit full host
values, labels containing source content, operation lists and capabilities.
CONTENT/AUTHORITY/DEPTH/TIME suppression remains explicit, alongside other omitted
host channels. Glyph data is absent from instrument state and RETURN frames.
The renderer embeds native SVG as an inert image rather than injecting its markup.
The extension's compact GLYPH mode offers expansion, not edit controls; existing
host write/effect checks still govern edits after expansion.

No new LensState store is introduced into FIELD or LISTEN. Existing typed Lens
composition can inspect these recipe descriptors. A `projection/glyph` output
fails a subsequent `field-route/v0.1` input requirement; support does not arise
from information merely retained elsewhere in the host.

### Compression versus composition versus artifact folding

Actual composition counterexample: two SETs have the same ordered sources and
identical member glyphs, but CUT versus DISSOLVE yields different SET identities.
Member glyphs do not carry the seam law. No function of only those glyphs can
reconstruct this distinction. Adding a glyph-composition equation is unsupported.

`artifact_fold.lossless_test` is evaluated against host + instrument state + recipe:

| Existing gate | Evidence / remaining boundary |
|---|---|
| Canonical identity recoverable | FIELD route and LISTEN source references survive GLYPH cycles. Old LISTEN IDs are rejected after source replacement. |
| Address/focus recoverable | Direct host and browser expansion return to the selected object; address is host-supplied. |
| Aperture/scale/parameters recoverable | Host capture plus instrument RETURN restores fixture aperture and projection parameters without putting them in glyph features. |
| Recipe recoverable | Native recipe ID/version is inspectable and reproduced for the same derivation snapshot. No historical recipe archive is promised. |
| Operator semantics/order recoverable | Operations remain in their hosts; existing ordered LensState serialization passes. The glyph is not an operator serialization. |
| Authority/commit boundary unchanged | View recipes cannot acquire COMMIT; host writes/effects retain their gates. |
| RETURN/provenance exact | Same-host fixture RETURN preserves state. Cross-source LISTEN RETURN refuses to seek the replacement source; unavailable old source stays unresolved. |
| Unique domain behavior retained | Kept in existing hosts. Atlas notes/path/rebinding, Verse semantics and live transport are not migrated or proved reconstructible here. |

The existing INTERPHASE `captureReturn()/return()` methods restore ephemeral
view/attention frames. Their name predates this pass; these tests do not establish
the durable evidence RETURN required by `INTERACTION_SEMANTICS.json`. This note
records the run, while durable source/provenance re-entry remains an artifact gate.
No rename or new RETURN mechanism is introduced here.

These prove projection conformance, not eligibility to demote a whole artifact.
Lived use and each candidate's unique-residue fixture remain required.

### Compact convergence map

| Surface | Disposition | Retained function / next evidence gate |
|---|---|---|
| Fold/Bloom Glyph Atlas shell | DEMOTE SHELL CANDIDATE | Only after authored paths/notes, source rebinding, collection context and exact RETURN round-trip through a retained host; no demotion now. |
| LISTEN | KEEP DOMAIN ADAPTER | Source cartography, analysis, address/aperture, pins and native audio recipe. |
| SET | KEEP ENGINE | Authored order, weights, seam laws and exact source references. |
| Journey | KEEP DOMAIN ADAPTER | Ordered traversal and seam interpretation; sharing glyphs does not replace playback law. |
| LIVE | KEEP ENGINE | Embodied transport and domain projections. |
| READFIELD | KEEP ENGINE | Canonical text/cursor, reading performance and source handoff. |
| Poem Map | KEEP ENGINE | Authored revisions, token focus and language choices. |
| Verse Atlas | KEEP DOMAIN ADAPTER | Jueju addresses, typed path semantics and evidence boundaries. |
| FIELD glyphs | KEEP PROJECTION RECIPE | Route kind/operation/status witnesses; FIELD retains authority. |
| Foundry operator representations | UNRESOLVED | Need a specific operator mapping and round-trip fixture, not resemblance to rings. |
| Atlas Dayline | KEEP ENGINE | Task constraints, commitments, scenarios and re-entry; no changes in this pass. |

### Validation and exact change inventory

- `node --test tools/interphase-glyph-conformance.test.mjs`: 10 pass.
- Existing audio/Atlas/document/instrument/SET suites: 30 pass (combined with the new suite: 40).
- `node tools/interphase-selftest.cjs`, `node tools/interphase-glyph-selftest.cjs`, `node tools/interphase-dom-form-selftest.cjs`: pass.
- `node control/lens-state-selftest.js`: 24 pass; `node spikes/003-one-instrument/selftest.mjs`: 11/11 invariants.
- `node tools/interphase-mapping-selftest.cjs`, `node control/interphase-room-selftest.js`, `node tools/validate-public.mjs`: pass.
- `node tools/fold-bloom-spine-smoke.mjs`: source spine + Journey browser smoke pass using installed macOS Chrome via a temporary launcher.
- Temporary real-Chrome probe: generic fallback, compact edit suppression, exact expansion, LISTEN module hook and inert native-SVG decoding pass. This is observed browser evidence, not a claim that all hosts were manually exercised.
- Changed JavaScript syntax checks and `git diff --check`: pass.

Exact files changed by this pass:
`lib/interphase-core.js`, `lib/interphase-field.js`, `lib/interphase-listen.js`,
`lib/interphase-glyph.js`, `fold-bloom/listen/audio-glyph.js`, `fold-bloom/app.js`,
`interphase-extension.js`, `tools/interphase-glyph-selftest.cjs`,
`tools/interphase-glyph-conformance.test.mjs`, `.github/workflows/public-surface-check.yml`,
`control/TRANSDUCTIONS.json`, `showcase-manifest.json`, and this evidence note.

Next single bounded move: one Atlas source-cell fixture against
`artifact_fold.lossless_test`, preserving authored marks, exact source rebinding
and RETURN before considering shell demotion.
