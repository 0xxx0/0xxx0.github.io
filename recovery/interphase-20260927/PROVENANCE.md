# PROVENANCE — `recovery/interphase-20260927/`

Retired 2026-09-27 by the interphase hazard lane (house-build wave). Landed in
`recovery/` (the house donor-lineage home, "never current authority") rather than
`_archive/` because root `/_archive/` is deliberately gitignored (`.gitignore:129`)
and must stay untracked.
Source of findings: `~/void-anchor/AXIS/work/deep-review-20260927/lane-b-interphase.md`
(LANE B interphase implementation audit, pinned rev `9aec78967fef05fb95b3a9c1b3b0781c02fbb821`),
re-verified against `origin/master` 3e3c5a54 before any change.

## Retired: `interphase-kernel.js` (was `kernel/interphase-kernel.js`)

**What it was.** A recovered donor — "THE EXTRACTED SHARED KERNEL" (its own header):
an independent second interphase host (`interphase(spec)` / `canon` / `attention` /
`mutate` / `captureFrame` / `noCrossWiring`), UMD, 12,381 bytes, 277 lines.
Its proof lives in `spikes/003-het12-harness/` and `spikes/004-interphase-sync/` as
**duplicated inline copies**, not as callers.

**Why retired.** Provably dead — zero loaders and zero readers anywhere in the tree:

| search (run at 3e3c5a54) | result |
|---|---|
| `grep -rn 'interphase-kernel' . --exclude-dir=.git` | 2 hits, neither a consumer: its own header comment (line 1) and `returns/HERMES_CROSS_SESSION_RETURN_2026-09-25.json:68` (narrative label `"id": "interphase-kernel-held"` — note "held") |
| `grep -rn 'kernel/interphase-kernel.js' . --exclude-dir=.git` | 0 hits |
| loader enumeration (`<script src>`, `require(`, `import`, `import()`, `importScripts`, `manifest.json` content_scripts) | 0 references |
| per-export name-independent sweeps (`mutateCanon`, `captureFrame`, `defaultSupport`, `canonHash`, `noCrossWiring`, `sameFrame`) | only self-hits plus inline spike duplicates — no consumer under any name |
| CI (`.github/workflows/public-surface-check.yml`) | never `node --check`'d, never required |

Under `AGENTS.md` (NO NEW CORE WITHOUT A MISSING FUNCTION) this is an UNRESOLVED /
held donor, not a live head. Retiring it also removes the global-name collision it held
with `lib/interphase-core.js` (see below).

**Global renamed in the retired copy.** The file was renamed on assignment:
`root.Interphase = api` → `root.InterphaseKernel = api` (the only assignment;
the body never reads the global), and the header comment updated to match.
Reason: `kernel/interphase-kernel.js` and `lib/interphase-core.js:5` BOTH claimed the
global `Interphase` — two different APIs, one name; whichever loaded last silently won
and all five adapters' guards (`if(!globalThis.Interphase)return`) would pass against the
wrong object. After this move+rename, exactly ONE file in the tree claims `Interphase`:
`lib/interphase-core.js:5`. Behaviour of `lib/interphase-core.js` is untouched.

Byte identity:
- pristine original (at `kernel/interphase-kernel.js`): sha256 `3734b51b083a3adccb7cadd10ed3863caa4916c324b2ac90e320b7b80392378c`
- archived copy (after the documented 2-line rename): sha256 `891635e5d6fece38320caec57fd1ffda48f4e74959af4af344eb878aa42e7700`
- diff = exactly 3 added comment lines + 2 changed lines (header UMD note, assignment).
  `node --check` passes on the archived copy. Nothing in the repo loads it.

**Nothing references it.** Verified at retirement (see table above): no loader, no
import, no manifest entry, no CI step, no control-plane path registration. The only
tree-wide string mention outside itself is a narrative id label in a 2026-09-25 return.

**Sibling deliberately NOT retired.** `kernel/INTERPHASE.schema.json` is live — 11
tree-wide references with real consumers (`foundry/room/room-core.js:223`,
`control/interphase-room-selftest.js:48`, `contact/context-frame.json:34`,
`foundry/room/release-0.1/0.2.json`). `kernel/fixture.recover-repo.json` is dead
(0 references) but outside this lane's mandate — left in place, flagged for a later lane.

## Considered and KEPT in place (absorbed, not retired)

Each of the four has at least one real loader plus live control-plane registrations,
so "do NOT move anything a loader actually loads" applies. Moving any of them would
break `.github/workflows/public-surface-check.yml` and orphan registered paths in
`control/` substrate files.

| module | loader(s) | CI | control-plane registration | verdict |
|---|---|---|---|---|
| `lib/interphase-mapping.js` | `tools/interphase-mapping-selftest.cjs:3` (`require`) | `public-surface-check.yml:90` (`node --check`), `:92` (selftest) | `control/INTERPHASE_SUCCESSOR.json:39` (`mapping_helper`) | KEEP — unique law-checking surface (`checkLens`/`checkCommutation`/`checkProjectionPurity`), tested, merely unwired to a page |
| `lib/interphase-recovery.js` | `tools/interphase-mapping-selftest.cjs:4` (`require`) | `:91` (`node --check`), `:92` (selftest) | `INTERPHASE_SUCCESSOR.json:41`, `control/MIGRATION_NOW.json:118`, `control/CURRENT.json:886`, `control/confluence/RETRIEVAL_CANON.json:105`, `INTERPHASE_CORRESPONDENCE_REGISTRY.json:223` | KEEP — only implementation of `0xxx0/interphase-recovery-packet/v0.1` parsing; the format is referenced tree-wide |
| `lib/interphase-lens.js` | `fold-bloom/lens/index.html:32` (`<script src>`) | `:115` (`node --check`) | `control/TRANSDUCTIONS.json:345`, `INTERPHASE_SUCCESSOR.json:52`, `INTERPHASE_CORRESPONDENCE_REGISTRY.json:54` | KEEP — loaded by a live page; inert output (0 readers of `ScaleLensInterphase`) is a DELTA opportunity, not grounds for removal |
| `lib/interphase-readfield.js` | `docs/index.html:28` (`<script src>`) | `:114` (`node --check`) | `TRANSDUCTIONS.json:344`, `INTERPHASE_SUCCESSOR.json:51`, `INTERPHASE_CORRESPONDENCE_REGISTRY.json:33` | KEEP — same class as lens |

## Second hazard fixed in the same commit (for the record)

`fold-bloom/two-dial/sw.js:2` precached no interphase file while
`fold-bloom/two-dial/core1.js:11–12` hard-throws `INTERPHASE_RING_REQUIRED` without
`globalThis.InterphaseRing` (`<script src="/lib/interphase-ring.js">` at
`fold-bloom/two-dial/index.html:236`). A service-worker cache miss crashed the page.
Fixed by adding `/lib/interphase-ring.js` to the `CORE` precache list. Same-URL note:
the precache entry and the page's script src are byte-identical absolute paths, so
`caches.match(e.request)` hits exactly.