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
- `dom.js` — ES-module face (PROJECTION of `micro.js`, 2026-10-06): browser DOM
  primitives extracted verbatim from the fold-bloom pages — esc, toast, `$`/`$$`,
  fmtClock, fmtMark, download (7 exports). Re-exports the core's own objects.
- `field-pulse.js` — plain ES module: field-pulse messaging — normalizePulse /
  publish / subscribe / last over BroadcastChannel plus a local event, schema
  `field-pulse/v0.1`, channel `field-pulse-v0`.
- `fieldtypes.js` — dual-mode classic (`FieldTypes` + `module.exports`,
  2026-10-08): runtime contract + property-law module — combinators
  str/num/bool/enum/arrayOf/objectOf/record/oneOf/optional/withDefault/refine,
  `check(value, schema)` → `{ok, errors:[{path, message}]}` with paths like
  `$.routes[3].href`, `assert` (throws, labelled) and `parse` (applies
  `withDefault`, never mutates), plus law helpers `invariant` / `property`
  over a seeded `prng` with genInt / genPick / genArray generators. Selftest:
  `node lib/fieldtypes.selftest.mjs`.
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
- `micro.js` — dual-mode core (classic `Micro` global + `module.exports`): the SINGLE
  implementation of the DOM / store / polar primitives that `dom.js`, `store.js` and
  `polar-control.js` project. Classic pages load it directly; ESM pages import the
  faces; node can `require` it.
- `polar-control.js` — ES-module face (PROJECTION of `micro.js`, 2026-10-06):
  pointer-to-polar control primitives — point angle/slot mapping plus the
  PolarDetent snap-and-drag physics.
- `path.js` — dual-mode classic (`InterphasePath` + `module.exports`): path
  optics — getIn / setIn / optic / compose / pathsFor / prop / index / all /
  where (+ clone); load BEFORE interphase-core, which destructures from it.
- `store.js` — ES-module face (PROJECTION of `micro.js`, 2026-10-06): thin
  localStorage/sessionStorage JSON wrappers — kv/skv get/set with try/catch and
  fallback on missing or corrupt payloads.

Conventions observed (ls + headers, 2026-09-26): the interphase-* family is
classic scripts — most are dual-mode (`globalThis.InterphaseX` +
`module.exports`, glyph requires ring; document-structure, constraint-surface
and this wave's path.js — `InterphasePath` — are dual-mode classic too), while
interphase-field/lens/listen/readfield are
no-export side-effect boots that register a host on `globalThis` and no-op when
their host API is absent. The newer primitives — id.js, field-pulse.js — are
plain ES modules (`export` directly, no globals, side-effect-free import);
dom.js / store.js / polar-control.js are the ESM faces of `micro.js`'s dual-mode
core (Phase 2, 2026-10-06 — projections, identity-proven by
lib/micro.selftest.mjs).

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

## Phase 2 — one implementation (2026-10-06)

`dom.js`, `store.js`, `polar-control.js` are PROJECTIONS of `micro.js`: they
`import './micro.js'` and re-export the core's own objects (identity, not copies).
Classic pages load `/lib/micro.js` and use the `Micro` global; ESM pages import
the faces; node can `require` the core. `lib/micro.selftest.mjs` proves the
classic load (A) and the projection identity (B12–B14) — the three faces must
never carry copied bodies again. The sync found one real drift: toast's sticky
`ms:0` extension (adoption wave 2026-10-03) was missing from the core; ported
into `micro.js` the same day.

## Fieldtypes — types as runtime law (2026-10-08)

Question on the table: could our own mini type system do what TypeScript does
here? It cannot — TypeScript checks at COMPILE time and there is no build step,
ever, so that half is out by law. What ships is the runtime half, which is the
half a no-build repo can actually enforce on live JSON (manifest routes,
capability contracts, policy traces):

```js
// classic page: <script src="/lib/fieldtypes.js"></script>
const { objectOf, str, optional, refine, check } = FieldTypes;
const CardSchema = objectOf({ href: str(), title: str(), state: optional(str()) });
const r = check(card, CardSchema);
if (!r.ok) toast(r.errors.map(e => `${e.path}: ${e.message}`).join(' · '));
// ESM page: import '/lib/fieldtypes.js'; then use the same global.
```

- `check` never throws on a bad VALUE (only on a malformed schema — a
  developer bug), never mutates what it checks, and reports every violation
  at once at its address: `$.routes[3].operation: expected a string, got number`.
- `invariant` / `property` run laws over a seeded `prng` (mulberry32): same
  seed, same run, forever — a red run is reproducible from its result alone.
- `lib/fieldtypes.selftest.mjs` (102 checks) proves the combinators, the
  error paths, the parse/check parity, and — as negative controls — that the
  property runner CAN fail: two planted bugs, both found, with their fixed
  twins passing.
- Round-trip against the repo: a route-shape slice of the real
  `showcase-manifest.json` validates all routes, survives JSON serialization,
  and a mutated clone fails at the exact paths.

## Using it from a session (node / fetch — measured 2026-10-06)

The same primitives are reachable from agent sessions, not only from pages.
All four forms below were RUN on this tree; outputs quoted from those runs.

- node, the dual-mode core (from the repo root):
  `node -e "const M=require('./lib/micro.js'); console.log(M.TAU, M.circularDelta(0.95,0.05), M.esc('<x>'))"`
  → `6.283185307179586 -0.10000000000000009 &lt;x&gt;`
- node, ESM default import: `node --input-type=module -e "import M from './lib/micro.js'; console.log(M.TAU)"`
  → `6.283185307179586` (one global set, `module.exports` present — CJS-default interop)
- node, the ring (classic dual-mode; `require` behaves the same):
  `node -e "const R=require('./lib/interphase-ring.js'); console.log(R.TAU, R.relationVerb(0,1,6))"`
  → `6.283185307179586 FOLD`
- no checkout — fetch the live copy and require it:
  `curl -fsSL https://0xxx0.github.io/lib/micro.js -o /tmp/micro.js && node -e "const M=require('/tmp/micro.js'); console.log(M.fmtClock(3661))"`
  → `61:01`

Classic pages: `<script src="/lib/micro.js"></script>`, then `Micro.esc(x)`.
ESM pages: `import { TAU } from '/lib/polar-control.js'` — the face re-exports
the core's own objects. The load mode differs; the implementation never does.
The radial instruments converged on this in wave 2 (2026-10-06): two-dial and
atlas-dayline consume `/lib/interphase-ring.js`, and listen imports the
polar-control face. `node lib/micro.selftest.mjs` must stay green (24/24);
`node scripts/check-radial-adoption.mjs` is the gate for the convergence.
