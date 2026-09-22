# CULLING AUDIT — 2026-09-23

**Repo:** `/Users/mcvoid/Projects/0xxx0.github.io` · 923 tracked files · 63 MB working tree · 34 MB `.git`
**Mode:** READ-ONLY. Nothing was modified, moved or deleted. This file is the only write.
**Law respected:** findings are **CANDIDATES**. No predecessor is deleted. `RECOVER BEFORE INVENTING`.

---

## 0. Method (every claim below is reproducible)

```sh
# 1 byte-identical duplicates across all tracked files
git ls-files -z | xargs -0 shasum -a 256 | sort        # uniq -d on the hash column
# 2 largest tracked files
git ls-files -z | xargs -0 du -k | awk '$1>500' | sort -rn
# 3 reference test — for every candidate, full-path AND basename grep over the whole repo
grep -rn --exclude-dir=.git -F "<FILE OR BASENAME>" .
# 4 the repo's own gate (authoritative for HTML liveness)
node scripts/check-route-registration.mjs          # → 135 servable pages / 126 registered / OK
node scripts/check-route-registration.mjs --all    # → 12 archive pages, /recovery/ vault, expected
# 5 dynamic-loading risk (does anything glob control/ instead of naming files?)
grep -rn -E "readdirSync\(.*control|glob.*control|control/\*" --include=*.mjs --include=*.js --include=*.py --include=*.yml .
#    → NO MATCHES. control/*.json is only ever loaded by exact filename, so a
#      zero-reference JSON file is genuinely never read.
```

Duplicate detection was exact content (`shasum -a 256`). A whitespace-normalised pass over all
files <300 KB found **0** near-duplicate groups, so this repo does not carry near-copy drift.

---

## 1. Ranked candidates

### C1 — Byte-identical duplicate: `sleeper/app.js` + `sleeper/style.css` (two files, one twin pair)
| | |
|---|---|
| Paths | `sleeper/app.js` == `sleeper/ascii-pov-0.8/app.js` (24,462 B)<br>`sleeper/style.css` == `sleeper/ascii-pov-0.8/style.css` (7,379 B) |
| Hash | `38dd5d42…91810` · `ea2d6472…75296` |
| Evidence | `shasum -a 256` group output; `grep -oE '(src\|href)="[^"]*"' sleeper/ascii-pov-0.8/index.html` → loads `./app.js`, `./style.css` |
| Reclaimable | **31,841 B** if one copy went |

The versioned subdir `/sleeper/ascii-pov-0.8/` is the *live consumer* of these bytes — its
`index.html` loads them and its `release.json` even claims `"route": "/sleeper/"`. The copies at
`sleeper/` root are **not loaded by `/sleeper/index.html`**: that file (`cat sleeper/index.html`) is a
redirect portal to `https://sleeper-one-return.metaname.chatgpt.site/` with no `src="./app.js"`.

**Not dead, though.** `control/RSVP_MECHANISM_DIFF_2026-09-21.json:24` carries
`"evidence": "/sleeper/app.js"`. So the root copy is a live *evidence pointer* — retiring it would
silently break that receipt. Recommendation: **do not delete**; correct the evidence pointer first,
or leave in place. This is the one duplicate pair where "obvious" is a trap.

### C2 — Byte-identical duplicate: `lib/polar-control.js` has no consumer
| | |
|---|---|
| Paths | `lib/polar-control.js` == `fold-bloom/listen/polar-control.js` (1,788 B) |
| Hash | `c3784a04…b8447f` |
| Evidence | `grep -rn -F "polar-control" .` returns exactly two hits:<br>`fold-bloom/listen/app.js:3: import {pointAngle01} from './polar-control.js';`<br>`control/CURRENT.json:138: "/lib/polar-control.js"` |
| Reclaimable | **1,788 B** |

The LISTEN page imports the **`fold-bloom/listen/` copy**. The `lib/` copy is loaded by no HTML and
imported by no ES module — its only mention is a path string inside a state document. Contrast with
the other `lib/` kernels, which are genuinely wired: `lib/field-pulse.js` is imported by
`fold-bloom/listen/app.js`, `fold-bloom/two-dial/pulse-link.js`, `fold-bloom/live/app.js`,
`docs/index.html`; `lib/document-structure.js` by `fold-bloom/atlas/index.html`, `docs/index.html`.
**False-positive guard:** it *is* named in `control/CURRENT.json`, so it is not unreferenced — it is
an unloaded twin. Candidate, not confirmed dead.

### C3 — Byte-identical duplicate: `sleeper/one-return/` retyped inside the vault
| | |
|---|---|
| Paths | `sleeper/one-return/index.html` == `recovery/sleeper/one-return-recon-0.2/index.html` (26,694 B)<br>`sleeper/one-return/release.json` == `recovery/sleeper/one-return-recon-0.2/release.json` (3,295 B) |
| Hash | `6bd3c635…acc4` · `6c8912f9…1254` |
| Evidence | `shasum -a 256`; both routes registered (`/sleeper/one-return/` route line, `/recovery/sleeper/one-return-recon-0.2/` route line) |
| Reclaimable | **29,989 B** |

Both copies are first-class: the vault copy is a `PRESERVATION.json`-backed exact archive, the
`/sleeper/one-return/` copy is a registered live route. **This is the intended donor/live pairing,
not dead weight.** Flagging only because the two are byte-for-byte identical today, so the vault copy
adds provenance, not content — the lineage value lives in `PRESERVATION.json`, not in the bytes.

### C4 — 13 unreferenced `control/` state files (~41.5 KB)
Every one of these returned **zero hits** to `grep -rn --exclude-dir=.git -F "<path>" .` — not in
`showcase-manifest.json`, not in `CURRENT.json`, not linked from `control/index.html`, not read by
any script, and (per method step 5) never loaded by glob.

| Bytes | Path | Note |
|---|---|---|
| 1,720 | `control/CARE_VALIDATION_2026-09-21.json` | base copy of a family whose live head is `…_2026-09-22_V05.json` (4 refs) |
| 5,314 | `control/FIELD_INDEX_AUDIT_2026-09-20.json` | superseded by `FIELD_INDEX_AUDIT_2026-09-21.json` (2 refs) |
| 2,212 | `control/FOLD_WEAVE_PROMOTION_2026-09-20.json` | no sibling, no refs |
| 2,676 | `control/FOUNDRY_HOUSEKEEPING_2026-09-21.json` | no refs |
| 4,271 | `control/INGEST.json` | stem `INGEST` is used only by `INGEST_RULES.json` / `INGEST_RUN_*.json`, which are *read by* it — nothing reads it |
| 2,699 | `control/LENS_REIFY_RETURN_2026-09-21.json` | no refs |
| 3,952 | `control/MIGRATION_PUSH_2026-09-20.json` | superseded by `MIGRATION_PASS_2026-09-21.json` |
| 1,615 | `control/PHYSICAL_RETURN_AXIAL_2026-09-20.json` | no refs |
| 2,043 | `control/PHYSICAL_RETURN_ENV0_2026-09-20.json` | no refs |
| 2,209 | `control/CURRENT.md` | orphaned prose twin of `control/CURRENT.json`; `git log` shows it arrived in `f6de6eb control: replace stale CURRENT with conversion-first surface` |
| 2,137 | `control/confluence/CONSTRAINT_SURFACE_2026-09-21.json` | no refs |
| 8,828 | `control/confluence/FOLD_BLOOM_INSTRUMENT_HEAD_2026-09-22.json` | no refs |
| 2,830 | `control/confluence/SOVEREIGN_NODE_KIT_2026-09-22.json` | no refs |

`CURRENT.md` is the sharpest of these: the committed message says it *replaced* stale CURRENT, yet
`CURRENT.json` is the file every script and CI job actually reads
(`.github/workflows/convergence-validate.yml`, `scripts/generate-convergence-strip.mjs`,
`scripts/generate-kingdom-reading.mjs`). The `.md` never became the referenced surface.

### C5 — Untracked working-tree artifact at repo root: `r1`
| | |
|---|---|
| Path | `r1` (81 B, mtime `Sep 23 02:17`) |
| Evidence | `git status --porcelain` → `?? r1` (the **only** untracked item in the tree); `git log --all -- r1` → never committed |
| Content | `[Errno 1] Operation not permitted: '/Users/mcvoid/Documents/lawsofformiching.pdf'` |

A shell redirect captured a failed `cat`/`cp` error into a file at the repo root. There is no
`.gitignore`, and `find` for `.DS_Store` / `*.tmp` / `*.bak` / `*.orig` / `node_modules` / `*.log`
returned **nothing else**. Single stray file — highest-confidence, lowest-risk cull in the repo.

---

## 2. Checked and cleared (deliberately NOT called dead)

| Class | Verdict | Why |
|---|---|---|
| **Unreferenced HTML** | **None outside the vault** | `node scripts/check-route-registration.mjs` → *"every live surface is registered"*. Only 3 HTML files have no inbound link: `sleeper/ascii-pov-0.8/one-return/index.html` (195 B) and `…/project/index.html` (187 B) are meta-refresh shims to live routes and are themselves registered; `sleeper/borrowed-river/shell.html` is the **build template** — `sleeper/borrowed-river/build.mjs:4` does `read('shell.html').replace('/*STYLE*/'…)`. Not dead. |
| **Oversized assets >500 KB** | **0 qualify** | The repo has exactly 6 files >500 KB and every one sits under a registered route: `recovery/sleeper/site-source-2026-09-18/{public/painting.html 3.35 MB, public/og-atlas.png 2.91 MB, public/og.png 2.77 MB, experiments/painting/spring-dawn-detail.jpg 2.47 MB, public/wake-scroll.png 2.12 MB}` and `recovery/foundry-cabinet-v4/index.html` (764 KB). All are linked from their vault index page and hash-verified by CI (`convergence-validate.yml`), so they are **inside** a registered route, not orphaned. |
| **`recovery/sleeper/` = 18.5 MB (29% of tree)** | **Intentional, do not touch** | `site-source-2026-09-18` alone is 17.7 MB and is a hash-manifested frozen donor vault (the CI job *checks its SHA-256s*). This is the repo's single biggest byte mass and it is load-bearing provenance. |
| **`/recovery/` subdirs with no registered route** | **Vault-internal, expected** | `recovery/toolbelt` (72 K), `recovery/showcase-map-v0` (36 K), `recovery/seam-engine` (32 K), `recovery/focus-interface-sync-20260921` (20 K) expose no route. `check-route-registration.mjs --all` explicitly reports 12 unindexed archive pages as *expected*. |
| **`control/confluence/sovereign-node/*`** | **Not dead** | Basename greps came back empty, but a **partial-name** check caught real references: `control/KINGDOM_READING.md:253` names SOVEREIGN-NODE-FOUNDATION / PORTABLE_AI_CONVERGENCE / TRAINING_FIELD_MANUAL, and `scripts/build-lineage.mjs:25` + `lineage/index.html:184` reference `TRAINING_FIELD_MANUAL`. **False positive caught — left out of the cull list.** |
| **Superseded versioned snapshots in `control/`** | **Referenced — candidates only** | `CARE_VALIDATION_…_V02/V03/V04`, `BODY_FIT_VALIDATION_2026-09-22.json`, `BRANCH_FRONTIER_2026-09-21.json`, `FIELD_INDEX_AUDIT_2026-09-21.json`, `INGEST_RUN_2026-09-20.json`, `RECOVERY_RUN_2026-09-19.json`, `REPRESENTATION_01.json` (~39.6 KB) are all still named by `showcase-manifest.json` or `CURRENT.json`. Deleting them would break a `receipt` link. **Not dead.** |
| **Empty files** | **Not dead** | 6 zero-byte `.nojekyll` markers (root + `atlas-dayline`, `fold-bloom`, `fold-bloom/ecology`, `fold-bloom/lens`, `fold-bloom/two-dial`). Required for GitHub Pages. |
| **Near-duplicate content** | **None** | Whitespace-normalised hashing found 0 collision groups. The 108 `index.html` files and 43 `release.json` files are per-surface originals, not copies. |

---

## 3. Reclaim math

| Rank | Item | Bytes | Confidence |
|---|---|---|---|
| 1 | `r1` (untracked stray) | 81 | **Certain** — untracked, never committed, error text |
| 2 | 13 zero-ref `control/` state files (C4) | 42,506 | **High** — zero hits by path, by basename, and no glob loader |
| 3 | `sleeper/{app.js,style.css}` twin pair (C1) | 31,841 | Medium — one copy is a live evidence pointer |
| 4 | `sleeper/one-return/` vault twin (C3) | 29,989 | Low — intentional donor/live pairing |
| 5 | `lib/polar-control.js` (C2) | 1,788 | Medium — named in `CURRENT.json`, loaded by nothing |
| | **Total if all five executed** | **~106 KB** | |

**Honest headline: this repo has no large dead weight.** 96% of its 63 MB is either the frozen
`recovery/` vault (provenance, hash-checked by CI) or `.git` (34 MB). Outside the vault there is no
oversized orphan, no unreferenced HTML, and no orphaned directory — the route-registration gate is
green. The reclaimable surface is roughly **106 KB, 0.17% of the tree**, and every byte of it is a
*record*, which is exactly the class this repo's law says to preserve.

---

## 4. Recommended next action (no deletes)

1. **`r1`** — safe to remove; it is untracked, uncommitted, and contains only an error line.
2. **C4's 13 files** — do not delete. The repo's own answer to "state file nobody reads" already
   exists: append a decision to `control/` and link it from `control/index.html`, or move the
   zero-ref files into a single indexed `control/archive-2026-09/` with one `INDEX.json`, so they
   stop being invisible without ceasing to exist.
3. **C1** — fix the evidence pointer in `control/RSVP_MECHANISM_DIFF_2026-09-21.json` to
   `/sleeper/ascii-pov-0.8/app.js` **before** any consideration of retiring the root copy.
4. **Add a CI assertion** — `scripts/check-route-registration.mjs` already guards HTML. A sibling
   check "every `control/*.json` is named by at least one other file" would have caught C4's 13
   files the day they drifted, using the existing one-node-script pattern.