# SURFACE TRIAGE — untriaged home surfaces (Desktop∖d, Documents, Downloads)

*2026-09-25. Metadata-only pass. Method follows `disk-surface-triage` (hard rules on: no contents
opened/hashed, no moves, re-stat before any action, score components printed, every path quoted).*

## Method (every number below names its data set)

- **Walk A — home-wide inventory**: one `os.walk`+`os.lstat` pass over `/Users/mcvoid` (52 s,
  ~560 k files incl. hidden), apparent bytes, symlinked dirs not followed, hardlinks counted once
  per link occurrence.
- **Walk B — surface detail**: same walk restricted to `~/Desktop` (with `d/` excluded),
  `~/Documents`, `~/Downloads`, **hidden dirs excluded** (triage.py convention). All surface tables
  below are Walk B unless marked.
- **du on 5 named giants**: blocks-based, hardlink-aware, to separate apparent-vs-real where the
  walk overstates.
- **Vocabulary pass**: triage.py's own weight table + score components, driven by his
  `~/sovereign-node/corpus/INFLUENCES.tsv` (high-confidence names, 146 per triage.py docstring),
  the 16 ASKS themes, plus Pinterest-board-derived terms from his own board names (blight, art,
  drawing, typography, graf, esoteric, occult, ancient, mandala, mnemonic, symbol, modular,
  furniture, frame, ergonomic, interior, design, anatomy, infobox, cheat, make, glyph) and
  library terms (craft, diy, sigil, tarot, runes, geometry, grid, pattern, notation, visual, map,
  atlas, house, music, poet).
- **No file contents were opened anywhere. Every "duplicate" or "disposable" claim below is a
  guess derived from file names, sizes and dates — marked G where guessed.**

Live df at scan time: **352 GiB used / 55 GiB free / 87% capacity** (context note said
351/58/86 — the volume is a live, changing system; treat every figure as a snapshot).

---

## 1. INVENTORY — every top-level home dir (Walk A, apparent GB)

| entry | files | GB | state |
|---|---:|---:|---|
| `~/Library` | 299,113 | 520.96 | untriaged — **sparse**: `Containers/` is 497 GB apparent but 16 G real (du); real total ≈ 25 G |
| `~/.colima` | 32 | 85.93 | untriaged — **sparse VM images: 1.1 G real (du)** |
| `~/void-anchor` | 512,408 | 75.54 | live repo (this workspace) — not a surface |
| `~/Desktop` | 8,804 | 71.29 | **`d/` = 8,580 f / 70.8 G apparent, 66 G du — ALREADY TRIAGED (DONE, do not redo)**; the rest (137 f / 0.48 G) is small and covered in §2 |
| `~/.ollama` | 25 | 40.97 | model store (untriaged; out of scope) |
| `~/Documents` | 10,593 | 31.32 | **untouched** — see §2 |
| `~/.hermes` | 365,837 | 19.58 | runtime state; du 19 G — context note said 40 G; either stale or it shrank since (footnote: re-measure before trusting either) |
| `~/sovereign-node` | 13,647 | 17.74 | his corpus repo (live) |
| `~/Pictures` | 10,725 | 6.43 | untouched (out of this pass's scope) |
| `~/p8p-deploy` | 67 | 6.07 | untouched (out of scope) |
| `~/.cache` | 41,959 | 3.55 | caches (system) |
| `~/.npm` | 51,368 | 3.53 | caches (system) |
| `~/.platformio` | 17,389 | 3.04 | toolchain |
| `~/backups` | 1,098 | 2.72 | untouched — REVIEW (contents unknown to this pass) |
| `~/Downloads` | 14,996 | 2.28 | **untouched** — see §2 |
| `~/.codex`, `~/.local`, `~/.gradle`, `Claw3D`, `~/.openclaw`, `~/.docker`, `~/go`, `~/Projects`, `~/osint-lab`, `~/.android`, `phone-apps`, `~/.bun`, `~/.whispercpp`, `~/.pg0`, `~/.gem`, misc | 164,7xx | ≈ 10 | toolchains / sessions / repos; each < 1.2 G |
| `~/` loose files | 99 | 0.114 | **untouched — REVIEW**: ~50 authored `.md`/`.py`/`.json` at home root (`nike_*_research.md`, `nutrilite_singapore_research.md`, `origami_mattress_research.md`, `digital_twin_manifesto.md`, `EXTENSIVE_50_STEP_ACTION_PLAN.md`, `ACTION_EXECUTION_MATRIX.md`, `temporal-debt-repair.sh`, `execution_trench.py`, `soul-engine.js`, `aggregated-logs.jsonl` 0.11 G, …) — look like delegated reports/scripts dropped and never followed through on |
| oddballs | — | — | `~/“\n”` dir (15 f — literally newline-named), `~/“$K”` (empty stubs incl. an empty `backups/`), empty dirs `agent-eval-research/`, `chinese-legal-context/`, `workspace/`, `wiki/`; `~/.Trash` empty |

Verdicts: `d/` DONE; Desktop∖d, Documents, Downloads = this pass; everything else untouched** — stated plainly:
the two huge numbers (Library 521 G apparent, `.colima` 86 G apparent) are **sparse artifacts, not real usage**,
and the real reclaim surface for this owner's complaint is `~/Documents` (31 G) above all.

## 2. THE BIG UNKNOWNS (Walk B, hidden dirs excluded, apparent)

### `~/Desktop` minus `d/` — **137 files, 0.48 G** — small and mostly already "followed through"

| dir / file | files | bytes | comment (name-derived) |
|---|---:|---:|---|
| `~/Desktop/d/` | 8,580 | 70.8 G app. / 66 G du | DONE — triaged 09-25 (PATTERN.md). **Delta vs that pass: 65.9 G → 66 G (du, matches); file count 8,667 → 8,580 (‑87).** Candidate causes: hidden-file counting differences and/or live writes. Re-stat before any relocate. |
| `~/Desktop/22 aug/` | 59 | 277.5 MB | 2026-08-22 photos; giant inside: `22 aug/PORTRAIT 113ANV01/product demo video UNFINISHED wip (march 2019).mp4` 0.17 G; `CONCH/` videos (conch-blowing, 3 f) |
| `~/Desktop/archive-export-2017.zip` | 1 | 165.5 MB | his own 2017 archive export — **KEEP, not an installer despite `.zip`** |
| `~/Desktop/TODO/` | 31 | 5.8 MB | the esoteric/mnemonic reference cluster: `archetype-radial-mnemonic.jpeg`, `[ref][hands]finger-surface-water.jpg`, `Homonym_Euler_Diagram_Semantics.svg`, `[ref][origami]Sq-twist-fold.jpg` — matches his boards (mnemonic symbols, traditional esoteric systems) |
| `~/Desktop/TO MAKE (refs)/` | 17 | 3.3 MB | literally a "make" board: `FURNITURE-REF.jpg`, `***[FURNITURE STAND]zstand-minimalist-desk-system.jpeg`, `wooden_torso2.jpg`, `LARGE FORMAT SHEET PAINTING PAPER CANVAS etc RACK REF EG - …` — furniture/frames/make refs |
| `NORA-VID-20221123-WA0003.mp4` | 1 | 20.6 MB | family video (WhatsApp naming) |
| 12 × `Screenshot 2026-*.png` | 12 | ≈ 25 MB | ad-hoc screenshots 2026-03…08 |
| 6 × `*.command` | 6 | <1 MB | Hermes/Archive launchers — active tooling, KEEP |
| 4 × authored md | 4 | <1 MB | `note10-esp32cam-projects.md`, `physical_systems_cascade.md`, `thisjustthing_{close,overnight,status}.md` |
| `testapp0-banner.png`, `kestrel-work` (0-byte file — likely a failed mkdir), `Screenshot 2026-08-19 … 1.png` (dup of twin) | 3 | <1 MB | REVIEW |
| 20 × `.DS_Store` | 20 | 0.4 MB | disposable by convention |

**Desktop∖d verdict: KEEP.** Everything real is either active tooling, reference-surface material, or small personal media. Only `.DS_Store` is staging-worthy.

### `~/Documents` — **10,238 f / 31.30 G — 99.9% is ONE thing: the ChatGPT export factory**

Direct children: `Codex/` **31.28 G / 10,220 f**; `*/` 0.02 G (camera JPEGs, `DSC01246.JPG` etc., 9 f); `lawsofformiching.pdf`; `OBSIDIAN-VAULT-REIFIER-19to25SEP/` 7 f (<1 MB).

The whole giant is `~/Documents/Codex/` = 30.9 G of 2026-08/09 ChatGPT export generations:

| generation (name-derived) | files | bytes | redundancy read |
|---|---:|---:|---|
| `Codex/2026-08-06/i/outputs/chatgpt-export-2026-09-18-complete.zip` | 1 | 5.08 G | twin dir below, 5.69 G — **G: redundant pair, zip is the stage candidate** |
| `Codex/2026-08-06/i/outputs/chatgpt-export-2026-09-18-complete/` | 3,732 | 5.69 G | extraction of the above |
| `Codex/2026-08-06/i/outputs/ChatGPT-Backup-2026-09-18/` | 3,518 | 4.98 G | curated backup: `Images/` 3.46 G (2,075 f), `Documents/` 0.47 G (559 f), `Chats/` 0.44 G, `Field-Bridge/archive.sqlite3` 0.19 G, `Artifacts/Audio` 0.16 G, `Artifacts/Video` 0.17 G, Metadata/Web — **no zip twin → KEEP** |
| `…/chatgpt-export-salvaged-clean.zip` | 1 | 2.33 G | twin dir 2.63 G — **G: redundant pair, zip is the stage candidate** |
| `…/chatgpt-export-salvaged-clean/` | 1,374 | 2.63 G | extraction |
| `…/work/salvage/chatgpt-export-salvaged-raw.zip` | 1 | 2.33 G | no extraction — the pre-clean state; KEEP until clean is verified |
| `…/chatgpt-generated-images-recovered.zip` | 1 | 1.96 G | twin dir only 1.28 G → the dir is a PARTIAL extraction — **zip holds more than the dir; do NOT stage the zip** |
| `…/chatgpt-generated-images-recovered/` | 508 | 1.28 G | partial extraction |
| `…/chatgpt-generated-images-recovered-plus-gapfill.zip` | 1 | 2.61 G | same shape: dir 1.28 G ≤ zip → do NOT stage |
| `…/chatgpt-generated-images-recovered-plus-gapfill/images/` | 510 | 1.28 G | partial extraction |
| `…/ChatGPT-Corpus-2026-09-18/` | 18 | 0.89 G | **corpus.sqlite3 ×2 (0.44 G each — root and `foundation-initial/`): G: the same corpus twice → the actual high-value core (§3)** |
| `Codex/2026-08-14/tt/work/chatgpt-export-2026-08-03-salvage/` | 11 | 0.21 G | earlier salvage generation |
| `Codex/2026-08-06/i/outputs/` rest | 7 | 11.97 G | the four zips above + 3 small files |

Giants named: the **four multi-GB zips = 11.97 G of the 31.3 G**; `outputs/` subtree total 28.7 G;
extraction dirs another ~13.5 G. The same filenames recur across generations at identical sizes
(e.g. `…recovered/images/0402__file_000000005ed071fda75455e0fed34057.png` 3.5 MB also present in
`…plus-gapfill/images/` 3.5 MB — sampled 3 pairs, §6 covers what a sample does not prove).

mtime shape: 9,216 f / 28.7 G are 2026; 1,018 f / 2.57 G are ≤2021 — and those are **inside the
export dirs** (the recovered-image sets preserve source mtimes), not a hidden old tree. Documents
holds almost nothing personal beyond the exports.

**Documents verdict: KEEP the curated end products (Corpus sqlite, Backup, Field-Bridge);
REVIEW the partial/raw/legacy generations; gated STAGE the two zip+dirtwin pairs (§5).**

### `~/Downloads` — **14,040 f / 2.19 G (Walk B; 14,996 f / 2.28 G with hidden incl. — the 956-file delta is `.git/` internals)**

| entry | files | bytes | read |
|---|---:|---:|---|
| `20210607/` | 13,322 (incl. .git) | 392 MB | **the old machine's curated reference tree** — git clones of SVG/NLP/CRYPTO/UI/`_{ APP }_`/`_{ SOUND }_`/`_{ XP }_` repos + "zREVIEWNEXTz / zzREVIEWEDzz / zzzzzz FUTURE DIRECTIONS" folders + `[MONO]SPECS_TESTING_STDS`, TiddlyWiki, memory-system GIS data (`MEMORYTRG-GEOGRAPHICAL-disco-mundus-master/public/data/sydneySuburbsOriginal.json`). **Partially staged 09-23** (pen `crushed-20260923` holds 339 entries from this tree per PATTERN.md; its `_REVERT.sh` is 2,201 lines). What remains is his own reference material — REVIEW / MINE, not bulk-box |
| `pooBaby/` | 237 | 606.6 MB | `towel ghosts  laundry sky   misc specials` subdir — content unknown (photography? meme dump?) — **REVIEW, largest unknown in Downloads** |
| root audio essays + songs | 12 | ≈ 0.37 G | `Aperiodic_geometry_stops_human_model_collapse.m4a` 0.08 G, `The_Physics_of_Non-Doing__How__The_Sleeper__Masters_Efficiency_.m4a` 0.06 G, `The_Aperiodic_Self.mp4` 0.06 G, `The_Spectre_Tile_and_the_Reality_Interface.m4a` 0.05 G, `SINDER_turns_physical_rooms_into_downloadable_software.m4a` 0.04 G, `Life_Inside_a_Ruined_Digital_Cathedral.m4a` 0.03 G, `THROUGH THE FIRE.mp3/.m4a`, `BY YOUR WILL _ 遺志.mp3`, `wits.mp3`, `preforme.mp3` — **the one-thing cluster: geometry/interface/Sleeper audio** — KEEP |
| `suno/` | 24 | 143.2 MB | his own music (`静文贤汉 ×.mp3` + `(1)`/`(2)` retry copies, invocations "A — APERTURE THAT REMEMBERS" etc.) — KEEP; the `(n)` copies are G: retry artifacts (only 0.00 G at MB precision) |
| `31aug/`, `05sep/`, `04sep/` | 58+25+17 | 230.6 MB | dated downloads 2026-08-31/09-05/09-04 — REVIEW (contents unknown) |
| `9d0b9552c4…-2026-06-10-23-10-05-…/` | 18 | 0.18 G | Claude Data export dir (`chat.html` 0.08 G, conversations JSON) — new generation of the 08-03/09-18 zips **already in the pen** — REVIEW |
| `ttl 2/` | 241 | 76.0 MB | TTL export (`30d/export_data/…`) — REVIEW |
| `*CLAUDE-DATA-BACKUP/` + `.zip` | 5+1 | 0.04+0.01 G | G: zip+dirtwin pair (dir ≥ zip) → REVIEW/stage-later |
| `FOLD_BLOOM_SEED/` | 3 | 24.2 MB | matches `fold-bloom-ink-*.png` ×8, `REMEMBERME_exact_{A,B,C}_12x16.png` (12×16 — "infobox printouts" family), `reconstruction_daily_work_system.html` etc. — KEEP |
| small recovery packs | ~45 | < 0.1 G | `Sleeper_Corpus_Convergence_v1_Pack.zip`+dir, `corpus-recovery-chatgpt-pass0-pass1-v0.10.zip`+dir + `v0.8.zip`, `void-sovereign/`, `YJ/`, `kestrel_sync_capsule_2026-09-19/` (its zip is staged in the pen), `housebus/` (empty — its `haos…vdi.zip` is staged in the pen), `PROJECT-FEDERATION-GATE1-A003-v0.2.xlsx` + `(1)` twin — KEEP/REVIEW |
| `You.docx`, `You-draft.docx`, `You2.docx`, `COMPENDIUM_v1.0.md`, `SOVEREIGN-NODE-FOUNDATION-v0.1.md`, `HERMES_BOOTSTRAP.md`, `peak-partnership-protocol-v0.1.md`, `SOVEREIGN-NODE-FOUNDATION…`, `PORTABLE_AI_SOVEREIGN_NODE_CONVERGENCE_2026-08-26.md` | ~10 | < 0.1 G | authored docs — KEEP |
| test artifacts | 6 | ≈ 0.00 G (each <1 MB) | `qwen_old_man.wav`, `qwen_clone_test.wav`, `qwen3_test.wav`, `mahshroom_tts_test.mp3`, `mahshroom_perf_test.py`, `mahshroom_perf_report_20260627_202451.json` — **G: disposable test outputs** (regenerable claim is a guess) |
| ~60 `ChatGPT Image *.png` | ~60 | ≈ 0.02 G | generated images dropped at root 08/09-2026 — REVIEW (may be refs) |
| `~/Downloads/housebus/`, `void-shrine/` | 0 | 0 | empty stubs |

**Downloads verdict: KEEP (authored music, essays, docs, ink prints); REVIEW (pooBaby, dated
folders, 20210607, exports, images); gated BOX only the tiny test artifacts + `.DS_Store`.**

---

## 3. PATTERN EXTRACTION — what the vocabulary pass found

Search-by-vocabulary scored **everything by his own terms** (components printed per row). Hit rate
by surface (Walk B data):

- Desktop∖d: **35 of 137 files hit (0.34 G of 0.48 G)** — but the weight is `22 aug/` + the 2017 zip via weak themes; the true term-driven core is below.
- Documents: 10,161 of 10,238 hit (31.27 G) — **the vocabulary pass saturates here because every
  path contains "chatgpt-export" (theme *agent*)**. The signal is *behind* the wrapper names, not in them.
- Downloads: 10,800 of 14,040 hit (1.52 G) — driven by `suno`, `geometry`, `keep/agent` on the exports.

**The small high-value cluster hiding in the bulk:**

| cluster | where | size | why it is the "one thing" |
|---|---:|---:|---|
| **The queryable corpus** | `~/Documents/Codex/2026-08-06/i/outputs/ChatGPT-Corpus-2026-09-18/corpus.sqlite3` (+ `foundation-initial/` twin) + `ChatGPT-Backup-2026-09-18/Field-Bridge/archive.sqlite3` | 0.89 G + 0.19 G = **1.08 G** | 3.4% of Documents carries the distilled memory of the ChatGPT years — the same ratio shape as `d/` (0.17% signal in 66 G). Name-derived: corpus files + the Field-Bridge archive |
| **The ordered backup** | `ChatGPT-Backup-2026-09-18/` (Chats+Docs+Images+Audio+Video+Metadata) | 4.98 G | the human-order keeper of the same export; contains `Sleeper_Atlas_Reader`, `SINGAPORE_BLIGHT_PRISON…`, `POEM…` docs — his named entities *inside* the backup |
| **The make/ref surface** | `~/Desktop/TO MAKE (refs)/` + `~/Desktop/TODO/` | 9.1 MB | board-vocab hits literally named his boards: `FURNITURE-REF.jpg`, `[FURNITURE STAND]zstand-minimalist-desk-system.jpeg`, `archetype-radial-mnemonic.jpeg`, `[TODO][FURNITURE][REF]LandPeel.jpg`, `[ref][bldg]CatWallSpaceSolution.jpg` — furniture/frames/make/mnemonic material |
| **The geometry/interface audio** | `~/Downloads` root essays + Sleeper files | ≈ 0.37 G | `Aperiodic`, `Spectre Tile`, `The Sleeper`, `SINDER` — board terms *geometry* + project name *sleeper* |
| **The prints + seeds** | `REMEMBERME_exact_{A,B,C}_12x16.png`, `fold-bloom-ink-*.png` ×8, `FOLD_BLOOM_SEED/` | 24 MB | "infobox printouts" + fold-bloom seed material |

Direct board-term hits found across the three surfaces (aggregate, Walk B): **make 29 files (4 MB
− Desktop refs), furniture 9 (all Desktop), mnemonic 2, geometry 7 (Downloads audio), suno 24
(143 MB), blight 1, atlas 4, map 9, design 6, interior 2, frame 6, glyph 1, anatomy 1, symbol 4,
music 6, house 1, grid 2, pattern 9** (byte totals for the <1-MB clusters are "≈ 0.00 G" at MB
precision — the refs are small; the point is location, not weight). The big-ticket signal in
Documents is not a filename hit; it is the **structure**: generations are stacked raw→clean→
complete→corpus, and only the top and bottom of that ladder are worth keeping.

---

## 4. CLASS TABLE (files / apparent bytes — **every class is a filename-derived guess about content, G**)

### `~/Desktop` ∖ `d/` (137 f, 0.48 G)

| class | files | bytes | note |
|---|---:|---:|---|
| raw source (md/txt/code) | 5 | ≈ 0.00 G | the 4 authored md + launcher text |
| looks-wanted (img/av) | 124 | 0.32 G | 22 aug photos/videos, screenshots, refs |
| **duplicate-or-retry** | 5 stems / 5 extra copies | 0.002 G | exact-size `(n)` twins (e.g. `Screenshot 2026-08-19 … 1.png`) — G |
| disposable installers-and-caches | 20 (`.DS_Store`) | 0.4 MB | `.DS_Store` only — the 165.5 MB `archive-export-2017.zip` is **his own archive; exception to the class, KEEP** |
| UNCLASSIFIED remainder | 0 | 0 | — |

### `~/Documents` (10,238 f, 31.30 G)

| class | files | bytes | note |
|---|---:|---:|---|
| raw source (docs/json/extracted) | 1,391 | 1.84 G | mostly export internals (json/html/md/pdf) |
| looks-wanted (img/av) | 3,710 | 6.41 G | the recovered image sets + backup Images — **not disposable wholesale** |
| **duplicate-or-retry** | 4 zip↔dir pairs | 14.3 G of archives | complete+clean pairs G-redundant (7.41 G); images-recovered pairs G-overlapping but their zips hold MORE than the dirs (7.13 G) → NOT disposable without a hash pass |
| disposable installers-and-caches | 6 | 14.30 G | the 5 big export zips + 1 small archive — the zips are *archives*, not installers; only the 2 with complete extractions are stage candidates |
| UNCLASSIFIED remainder | 5,130 | 8.75 G | `.dat`/`html`/sqlite/no-ext files inside exports + `*/` and misc — the honest bucket: needs content-level triage to be sure |

### `~/Downloads` (14,040 f, 2.19 G)

| class | files | bytes | note |
|---|---:|---:|---|
| raw source | 11,376 | 0.52 G | the 20210607 git-clone tree — his curated refs, REVIEW not BOX |
| looks-wanted (img/av) | 1,576 | 1.54 G | photos, music, essays, prints |
| **duplicate-or-retry** | 2 stems / 6 extra copies | ≈ 0.00 G | exact-size `(n)` twins in `suno/` and root (G) + structural `*CLAUDE-DATA-BACKUP` zip↔dir |
| disposable installers-and-caches | 4 + 68 | 0.01 G | 4 archives (small) + 65 `.DS_Store` + 3 cache-junk (all ≈ 0.00 G) — this surface is nearly clean of disposable bulk |
| UNCLASSIFIED remainder | 1,081 | 0.12 G | `pooBaby/` and dated-folder content by extension fall-through — the honest bucket |

---

## 5. PROPOSED STAGING SET (safely-disposable classes only — nothing moves in this pass)

**Staging pen**: `/Users/mcvoid/void-anchor/delete/crushed-20260925/` — a **new dated subdir of the
existing instrumented pen** `~/void-anchor/delete/` (convention per `CHANGE_LEDGER.md`:
`_MANIFEST.json` with src/dst/bytes + executable `_REVERT.sh`; append a ledger row with the
rollback line; field note on `crushed-20260923`: *"QUARANTINE != DELETE"*).

| # | rows | bytes (G) | why safe | G? |
|---|---|---:|---:|---|
| 1 | 94 × `.DS_Store` (Desktop 20, Documents 9, Downloads 65) | ≈ 0.001 | regenerable metadata files; no content risk | no |
| 2 | `~/Documents/Codex/2026-08-06/i/outputs/chatgpt-export-2026-09-18-complete.zip` | 5.08 | same-stem extracted dir present at 5.69 G on the same generation date — the zip is the redundant twin **if and only if the extraction is complete** | yes, strongly |
| 3 | `~/Documents/Codex/2026-08-06/i/outputs/chatgpt-export-salvaged-clean.zip` | 2.33 | same-stem dir at 2.63 G; same logic | yes, strongly |
| 4 | `~/Downloads` test artifacts: `qwen_old_man.wav`, `qwen_clone_test.wav`, `qwen3_test.wav`, `mahshroom_tts_test.mp3`, `mahshroom_perf_test.py`, `mahshroom_perf_report_20260627_202451.json` plus size-identical `(n)` twins only (6 copies, ≈ 0.00 G) | ≈ 0.00 | test outputs; regenerable-by-convention | yes |

**Estimated yield ≈ 7.41 G** (the two zips dominate; the rest is near-zero).

**Execution discipline (non-negotiable, per skill):**
1. Build `_MANIFEST.json` + `_REVERT.sh` in the pen; **re-stat every path immediately before
   moving** with `~/.hermes/profiles/kestrel/skills/devops/disk-surface-triage/scripts/restat-manifest.py`
   (`--max-missing 0`); a scanned list never authorizes a move — a manifest expired by 75 minutes
   once in this same house.
2. If restat shows the twin dirs (`…complete/`, `…salvaged-clean/`) gone or smaller than listed,
   **drop the corresponding zip row** — the zip is then the only copy.
3. For full confidence on rows 2–3, run a hash-level diff of zip vs dir first (that is
   `corpus-unification` work — hashing is out of scope for a metadata pass).
4. Estimated yield **does not count** the ~339-entry pen already staged from `Downloads/20210607`
   + `Downloads/` root + `Desktop/d` on 09-23 (pen ≈ 24 G per ls block total, 09-25).

**Deliberately NOT staged** (REVIEW-hold): `chatgpt-generated-images-recovered*.zip` pair (their
zips hold more than the extractions), `salvaged-raw.zip`, `20210607/` remainder, `pooBaby/`,
dated folders, `*CLAUDE-DATA-BACKUP`, old-export dirs, `ChatGPT-Backup-2026-09-18/`,
`ChatGPT-Corpus-2026-09-18/`, corpus-recovery packs, all Desktop∖d content.

---

## 6. WHAT THIS PASS CANNOT KNOW (stated plainly)

- **Zip completeness and true duplication.** "Dir ≥ zip bytes" is a strong hint, and sampled
  identical names/sizes across `recovered/` vs `plus-gapfill/` are sightings, not proof. Which of
  `complete/` vs `ChatGPT-Backup-2026-09-18/` vs the corpus sqlites actually overlap at file level
  requires a hash pass (contents — forbidden here). The 7.1 G recovered family stays REVIEW
  because of this.
- **What anything inside is.** `pooBaby/` (606 MB, the largest unknown), the dated folders, `YJ/`,
  `Pictures/`, `~/backups`, and the 60 `ChatGPT Image *.png` could be anything; names here are
  handles, not descriptions.
- **Whether the `(n)` retry copies differ.** `suno/静文贤汉 × (1).mp3` might be an edit, not a copy.
- **Sparse/real semantics.** Library 521 G apparent = ~25 G real; `.colima` 86 G apparent = 1.1 G
  real; the report's other totals are apparent stat sums that overstate trees with hardlinks
  (`Desktop/d/`: 70.8 G apparent vs 66 G du).
- **Live drift.** `.hermes` measured 19.6 G vs 40 G in the task context; `d/` shows −87 files vs
  the 09-25 triage; df moved 351→352 Gi during the day. Nothing here is a stable fact; everything
  is re-measurable and any action must re-measure.
- **Desirability.** "KEEP" means "matches his stated vocabulary and naming" — not that he wants
  it, and not that REVIEW items are trash. The owner's eyeball is the only arbiter, especially on
  the UNCLASSIFIED rows (8.75 G in Documents, 0.12 G in Downloads).

*Prepared read-only: no file moved, deleted, opened, or hashed. Reversal of this report's own
artifact is deleting this file.*