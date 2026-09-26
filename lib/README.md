# lib/ — the shared library

No build step, ever. No npm, no bundler, no TypeScript, no registry, no manifest —
**the directory listing IS the registry.** Browsers autoupdate via GitHub Pages
ETag revalidation: when a file changes, the next page load revalidates and gets the
new bytes. A page picks the module convention that matches its own script loading
(module scripts vs classic scripts).

## Standing rules

> **One copy is a fact; two is a pattern; three is a library function.**
> **Extraction must be a verbatim move with a green selftest, never a rewrite.**

> **/lib/ is add-only — signatures and returned shapes never change; add a new
> function instead.**

> **schema strings (like field-pulse/v0.1) are the version contract; they live
> inside the data, not a manifest.**

## Modules (ls 2026-09-26: 18 module files; 19 entries incl. this README)

- `constraint-surface.js` — dual-mode classic (`ConstraintSurfaceCore` +
  `module.exports`): constraint-surface evaluator; filters records across
  dimension/selection pairs, returns survivors plus a per-value support matrix.
- `document-structure.js` — dual-mode classic (`FieldDocumentStructure` +
  `module.exports`): parses plain text into a document structure (lines, code
  fences, headings, sections) carrying `field-document-structure/v0.1`.
- `dom.js` — plain ES module: browser DOM primitives extracted verbatim from the
  fold-bloom pages — esc, toast, `$`/`$$`, fmtClock, fmtMark, download (7
  exports).
- `field-pulse.js` — plain ES module: field-pulse messaging — normalizePulse /
  publish / subscribe / last over BroadcastChannel plus a local event, schema
  `field-pulse/v0.1`, channel `field-pulse-v0`.
- `id.js` — plain ES module: content-identity primitives — SHA-256 to bare hex,
  and `sha256:`-prefixed digests of a File or a string (the prefix is contract).
- `interphase-core.js` — dual-mode classic (`Interphase`): the interphase host
  kernel, `interphase/v0.2` — createHost, channels, offices, default projections.
- `interphase-dom.js` — dual-mode classic (`InterphaseDOM`): DOM adapter;
  describes nodes as interphase records via stable selectors and refs.
- `interphase-field.js` — classic side-effect boot, no exports: opens the
  field-routes host over the FieldLensHost route map; no-ops if the API is missing.
- `interphase-glyph.js` — dual-mode classic (`InterphaseGlyph`): deterministic
  radial/polygon glyphs rendered over the ring primitives (`interphase-glyph/v0.1`).
- `interphase-lens.js` — classic side-effect boot, no exports: opens the
  scale-lens host over ScaleLensSpatialAPI.
- `interphase-listen.js` — classic side-effect boot, no exports: opens the
  fold-bloom-listen host over FoldBloomListen (SEEK/APERTURE operations).
- `interphase-mapping.js` — dual-mode classic (`InterphaseMapping`): normalizes
  mapping specs — facets, selectors, offices, channels, operations, residue
  (`interphase-mapping/v0.1`).
- `interphase-readfield.js` — classic side-effect boot, no exports: opens the
  readfield host over the docAperture element (SEEK/SCALE operations).
- `interphase-recovery.js` — dual-mode classic (`InterphaseRecovery`): reads a
  `0xxx0/interphase-recovery-packet/v0.1` and builds the interphase graph from its
  artifacts, claims, conflicts, unknowns and anti-merge holds.
- `interphase-ring.js` — dual-mode classic (`InterphaseRing`): polar math
  primitives — TAU, clamp, wrap, circular delta/distance, nearestEquivalent, polar.
- `polar-control.js` — plain ES module: pointer-to-polar control primitives —
  point angle/slot mapping plus the PolarDetent snap-and-drag physics.
- `path.js` — dual-mode classic (`InterphasePath` + `module.exports`): path
  optics — getIn / setIn / optic / compose / pathsFor / prop / index / all /
  where (+ clone); load BEFORE interphase-core, which destructures from it.
- `store.js` — plain ES module: thin localStorage/sessionStorage JSON wrappers —
  get/set with try/catch and fallback on missing or corrupt payloads.

Conventions observed (ls + headers, 2026-09-26): the interphase-* family is
classic scripts — most are dual-mode (`globalThis.InterphaseX` +
`module.exports`, glyph requires ring; document-structure, constraint-surface
and this wave's path.js — `InterphasePath` — are dual-mode classic too), while
interphase-field/lens/listen/readfield are
no-export side-effect boots that register a host on `globalThis` and no-op when
their host API is absent. The newer primitives — id.js, field-pulse.js,
polar-control.js, dom.js, store.js — are plain ES modules (`export` directly, no
globals, side-effect-free import).

## Standard names — vocabulary only, no tooling

- artifacts carry **ADR status words**: proposed / accepted / deprecated / superseded.
- receipts use **W3C PROV field names**: wasGeneratedBy / wasDerivedFrom / wasAttributedTo.
- evidence is graded **GRADE-style**: HIGH / MODERATE / LOW, each with a reason.
- projections follow **CQRS discipline** and declare their losses.

## Left in place on purpose — do not "fix"

- the three distinct receipt/return shapes;
- the three glyph encoders;
- the listen FFT/key analyzer (`fold-bloom/listen/analysis-core.js`) with its one consumer;
- the two vault-handoff wrappers, until their next edit;
- the spine smoke's hash path now delegates to `/lib/id.js` (rewired 2026-09-26) —
  do not restore an inline copy; its independence lives in its assertions, not a
  hash duplicate.

## Extracted 2026-09-26 (wave 1)

- `dom.js`, `store.js`, `path.js` and this README — verbatim moves from duplicated
  call sites; with `fold-bloom/listen/polar-control.js` folded into
  `polar-control.js` (byte-identical duplicate). The list above counts 18 module
  files; `ls lib/ | wc -l` reads 19 including this README.