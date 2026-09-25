# FIELD INDEX INJECTION — WHAT CAN ACTUALLY GO IN, NOW vs SOON vs BLOCKED

**Question:** can real content be injected into the Field Index apps / surfaces / tools today, how, and what blocks it?

**Scope inspected (read-only):** `/Users/mcvoid/Projects/0xxx0.github.io/` (live trunk, mirror at `0-canon`), `/Users/mcvoid/void-anchor/` + `/Users/mcvoid/void-anchor/AXIS/` (local workspace), `control/`, git history. Paths below are relative to the repo root unless prefixed `void-anchor/`. Markers: **OBSERVED** = seen in files/git; **INFERRED** = reasonable reading, not fully verified; **UNRESOLVED** = could not be confirmed from the repo alone.

**Bottom line first:** YES for content, on the main surfaces — the FIELD root renders plain checked-in JSON at page-load with no build step, so real content can appear today by writing a file. The two things that are NOT true: (1) some surfaces are generated snapshots or localStorage-only and are *not* file-driven; (2) *publishing* that content (push to GitHub) is not something Hermes is authorized to do today — that is the actual gate, not the plumbing.

Distinction: the **field-index SKILL** in the Hermes profile (searches BLIGHT conversation memory) and the **Field Index app** (this repo's root page) are unrelated. The repo's `skills/` dir contains other skill docs (README.md, lived-use-gate, media-curator, mechanism-extractor, research-design-loop, design-engineering-review) — no field-index app lives there. The app is `/index.html`.

---

## 1. INVENTORY — what surfaces actually exist and what they read

Base: `/Users/mcvoid/Projects/0xxx0.github.io/`

| Surface | What it is | Static or data-driven | Data source |
|---|---|---|---|
| **FIELD INDEX root** — `index.html` (title `0xxx0 / FIELD INDEX`, index.html:8; manifest route `/`, showcase-manifest.json:14-15) | The main app (v0.8.4): ROUTES, AXIAL, MAP, WAITING, ISSUES, CATCH UP panels | **Live data app, zero build step** | Fetches at runtime: `showcase-manifest.json` (index.html:642), `control/CURRENT.json` (index.html:643), `control/WAITING.json` (index.html:538), `control/FIELD_ISSUES.json` (index.html:544), plus **live GitHub API** for commits (index.html:453,470) and issues (index.html:547) |
| **`showcase-manifest.json`** (root, 297 KB) | The registry the index renders — 143 route objects | Data file (canon for the index) | Owned by FIELD INDEX governance; every `.html` must be registered here or CI fails (route-registration.yml:1-8; scripts/check-route-registration.mjs:1-13) |
| **`nexus/board.html`, `nexus/index.html`, `nexus/map.html`** | Coordination board snapshots | **Pure static** — zero `<script>` tags in board.html (OBSERVED, grep -c script = 0); self-declares "5/5 bots live · generated 2026-09-25 08:15 UTC · source: void-anchor/ops-hub" (nexus/board.html:34,98) | Generated snapshots of ops-hub state; refreshed by machine commits "nexus: board refresh" (git log 25fb67f0, dfe6e0aa). **INFERRED:** the generator lives in `void-anchor/ops-hub` (not found in repo `scripts/`) — UNRESOLVED which script |
| **`app-atlas/`** — "APP FOUNDRY / IDEA ATLAS" | Idea atlas + old→current wrangler | Hybrid | Wrangler fetches `app-atlas/convergence.json` + `/control/CURRENT.json` + `/showcase-manifest.json` (app-atlas/wrangler.js:25); seed data checked into `seed.js`; **user captures go to localStorage only** (`app.atlas.local.v01` key; "PIN LOCALLY", "CAPTURE · LOCAL ONLY UNTIL YOU EXPORT" — app-atlas/index.html) |
| **`atlas-dayline/`** (mobile PWA) | Dayline planner, "action-first over REALITY PORTS" | Reads one live file + browser-local state | `fetch('/control/CURRENT.json')` (atlas-dayline/field-bridge.js:52); task provenance = `USER` (live capture) or `FIELD /control/CURRENT.json` (app.js:317,335). Task grid (DayState) is localStorage; exported feedback packet is authority `NONE`, trigger `USER_EXPLICIT_COPY` (app.js:335) |
| **`port/`** — HUMAN PORT / OBJECT APERTURE | Ingress boundary for text/JSON/images/files | **Local-only by contract** | "Files stay in this browser. No upload, publish, filesystem move, or canonical admission happens here. FIELD INTAKE is a separate reviewed gate." (port/index.html:28). Also `/port/comms/` spine (tests at port/comms/tests/core.test.mjs) |
| **`field-intake/`** — FIELD INTAKE | The "separate reviewed gate" after the port | Local-only | Everything persists to localStorage (`localStorage.setItem(DRAFT|STORAGE|PREFS, …)` in field-intake/core-*.js / app-*.js) — it prepares packets, it does not write the repo |
| **`fold-bloom/`** (`app.js`, `listen/`, `lens/`) | The FOLD//BLOOM head | **Fully self-contained** | Only localStorage (fold-bloom/app.js) — no fetches, no data files |
| **`reader/`** — ARCHIVE READER | Public shape/verification projection of a private localhost archive-reader service (127.0.0.1:8777) | **Generated static HTML** | `scripts/build-reader.mjs` reads `/tmp/reader-probe.json` (written by the local service, scripts/build-reader.mjs:15,23-25) → writes `reader/index.html`. Deliberately content-free: "never its contents" (build-reader.mjs:5-9) |
| **`witness/`, `sky/`, `twins/`, `handshake/`, `godseye/`, `silences/`, `inventory/`, `lineage/`, `contact/`, ...** | Smaller registered surfaces | Mixed; several are **builder-generated** | `scripts/build-*.mjs` generators exist for each (build-witness, build-sky, build-twins, build-handshake, build-godseye, build-silences, build-inventory, build-lineage, build-git-history, build-reader — OBSERVED in scripts/ listing). Data → script → committed HTML. Individual data plumbing per surface not exhaustively verified — UNRESOLVED for each route's private inputs |
| **`shopping/`, `body/`, `care/`, `house/`, `poetry/`, `sleeper/`, `recovery/`, ...** | Registered head surfaces ("CURRENT HEADS" per AGENTS.md) | Route-dependent | Registered with release.json/state.schema/contract.json conventions (e.g. shopping/contract.json, shopping/state.schema.json); per-surface plumbing not exhaustively verified — UNRESOLVED |
| **`control/*.json`** | The control plane the surfaces render | Data files | CURRENT.json, WAITING.json, FIELD_ISSUES.json, QUEUE.json, plus dated snapshots `*_2026-09-*.json` in control/ (no separate ARCHIVE/ dir in void-anchor/control/ — the dated files ARE the snapshots) |

---

## 2. THE INJECTION PATH — where data enters, surface by surface

For every surface that reads data: the entry is a **checked-in JSON file fetched at page load** (no build, no template step) or a **generated snapshot needing a rebuild**, or **localStorage (no repo path)**.

**A. FIELD root (`index.html`) — file → browser, no build:**
Write/append to `showcase-manifest.json`, `control/CURRENT.json`, `control/WAITING.json`, or `control/FIELD_ISSUES.json` → root fetches with `cache:'no-store'` (index.html:538,544,642,643) → visible on refresh. **A new content item CAN be injected today by writing a file.** Two obligations: if you add a *new page*, it must also be registered in `showcase-manifest.json` routes[] (route-registration.yml:1-8 — citizenship gate), and per FIELD INDEX law a committed mutation to a tracked public surface must bump that route's `index.updated_at` in the same change (FIELD_INDEX_CONTRACT.json:10,55-56) or the index shows drift. The live GitHub API feeds (commits/issues) cannot be injected into — they are external truth (index.html:453,470,547).

**B. New surface (new .html) — write file + register + push:**
`<file>.html` + one route object in `showcase-manifest.json` routes[] (href/title/kind/index.updated_at…) → verify with `node scripts/check-route-registration.mjs` (script root, ~line 1-13 described) → Git push → GitHub Pages serves on master. Needs the push authority (see §4), no code change.

**C. Nexus boards — NOT file-injectable:**
The three nexus .html files are regenerated snapshots with no scripts (nexus/board.html:34,98). Editing the HTML by hand is possible but wrong (next refresh overwrites); the honest path is editing whatever ops-hub state feeds the generator — which lives outside the repo (INFERRED) — then regenerate and commit. **Needs a rebuild step, not a content write.**

**D. app-atlas — file-injectable partially:**
`app-atlas/convergence.json` and `control/CURRENT.json` flow into the wrangler at load (app-atlas/wrangler.js:25) — writing those files changes the app. User captures ("PIN LOCALLY") stay in the browser and never reach the repo — by design.

**E. atlas-dayline — CURRENT-injectable, tasks not:**
`control/CURRENT.json` content appears as dayline input rows (field-bridge.js:45-52). The task grid itself lives in localStorage; a worker must pick up an exported evidence packet (`authority:'NONE'`, `USER_EXPLICIT_COPY` — app.js:335) to turn it into repo state. No file write makes tasks appear directly.

**F. port/ + field-intake/ — NO file path exists, by design:**
Both are explicitly local-only (port/index.html:28; localStorage in field-intake/*.js). Injecting content *through* them means a human/agent copies the produced packet into a control file — the "reviewed gate." Making them write the repo directly would be an architectural change that contradicts their own contract.

**G. fold-bloom — code change required:**
No data loader at all (localStorage only). Content injection = adding a data file + loader = a code change.

**H. reader/ and other build-*.mjs surfaces — rebuild step:**
Content pipeline is data → `scripts/build-*.mjs` → committed HTML (e.g. build-reader.mjs:15,23-31 reads a probe file and writes reader/index.html). Writing files alone won't show up; the build must run and commit its output. (The `/tmp/reader-probe.json` input means the localhost service must be running — INFERRED.)

---

## 3. NOW vs SOON vs BLOCKED

**NOW — real content by writing a file, zero code change (appears after the push lands):**
1. `control/WAITING.json` → a new PARKED human/world dependency appears on the root's WAITING / YOU aperture (index.html:538). Schema at WAITING.json:20-50 (`id, route, human_move, why, unlocks, dependency_kind, surface_state, parked_at, parked_reason, reactivate_when`).
2. `control/CURRENT.json` → active fronts / current heads re-render on FIELD root (index.html:643), atlas-dayline (field-bridge.js:45-52), and app-atlas (wrangler.js:25). Caveat: CURRENT is the *attention* canon — overwriting it is a governance act, not free injection; add a `next_executable` gate only if it is a real one (QUEUE.json:1-…, WAITING.json:5-13).
3. `control/FIELD_ISSUES.json` → issues fallback list (index.html:544).
4. `showcase-manifest.json` → edit an existing route's `role`/`transfer` prose → ROUTES/AXIAL re-render; append a route entry → appears in ROUTES/RECENT (index.html:642,410). Must reference an existing file and bump `index.updated_at` (FIELD_INDEX_CONTRACT.json:10,55-56).
5. `app-atlas/convergence.json` → wrangler vectors/dayline text (app-atlas/wrangler.js:25).

**SOON — needs a small code change (hours, one bounded move each):**
1. New data file + loader for **fold-bloom** (currently localStorage-only, fold-bloom/app.js).
2. A "notes/content" feed for the **nexus boards**: point the generator at a checked-in JSON you can write, instead of ops-hub-only state — or move the generator into repo `scripts/` (UNRESOLVED where it lives today).
3. **reader/**: accept a checked-in input file instead of `/tmp/reader-probe.json` so content survives without the localhost service (build-reader.mjs:15,23-25).
4. A generic "inject a note into surface X" helper (e.g., one script that appends a content item + bumps `index.updated_at` + validates registration) — removes the manual two-file discipline.

**BLOCKED today:**
1. **Any push by Hermes/kestrel** — no write authority (see §4). Writing files locally is within "PREPARE BOUNDED CHANGES" (AGENTS.md:78); *publishing* them is not (AGENTS.md:80; SUBMISSION_CONTRACT.json:36-38; control/HERMES.md:30-32).
2. **Injecting into the live GitHub API feeds** (commits/issues on root, index.html:453,470,547) — external truth, read-only by design.
3. **Direct repo-write from HUMAN PORT / FIELD INTAKE** — deliberately nonexistent (port/index.html:28); building it would contradict the surface contract and is a large architectural change (requires human per SUBMISSION_CONTRACT.json:38).
4. **Pushing to master without the human/codex lane** — the trunk integrates only via PRs merged by the 0xxx0 identity (git log: "Merge pull request #268…", "Merge pull request #260…"); uncommitted interphase work in the working tree (git status: 11 files M/??, incl. .github/workflows/public-surface-check.yml, fold-bloom/app.js, lib/interphase-*.js) means another writer currently owns local writes to this exact checkout. **Do not co-write that tree while codex is mid-flight** (INFERRED: it is mid-flight; the dirty state says so).
5. Anything needing `EXTERNAL_SEND / PUBLIC_PUBLISH / MONEY_MOVEMENT / ACCOUNT_CHANGE / DESTRUCTIVE_DELETE / IRREVERSIBLE_FS / LARGE_MIGRATION` — human-gated (SUBMISSION_CONTRACT.json:38).

---

## 4. THE AUTHORITY LAYER — who can write, and under what

- **Trunk owner:** the GitHub identity `0xxx0` dominates history — `0xxx0 <46668049+0xxx0@users.noreply.github.com>` accounts for **2,785** of 2,986 total commits; older `0xxx0 <0xxx0@users.noreply.github.com>`: 182; `github-actions[bot]`: 7; local user (`st goh <mcvoid@sts-Mac-mini.local>`): 6; `A <str33turch1n@gmail.com>`: 5; `Phwn`: 1 (OBSERVED, `git log --format='%an <%ae>'`; 2785+182+7+6+5+1=2986). The last ~50 commits are machine-generated branch/PR work ("FIELD INDEX: carry reconciled catch-up metadata", "nexus: board refresh", "Converge Shopping reality lanes…") all as 0xxx0. The branch surface (~330 remote branches, one named `codex/release-comms` locally) is codex's per-task branch→PR workflow.
- **Hermes:** explicitly **read-only**. `control/HERMES.md` is titled "HERMES / GROKBOT HANDOFF — READ-ONLY CONVERGENCE WORKER" (HERMES.md:1) and states "You may NOT, unless explicitly granted later: … write/push GitHub" (HERMES.md:30-32). No grant appears in any control file inspected. **Hermes write authority is currently ABSENT — plainly.** (UNRESOLVED whether a conversational grant exists outside control/; the files say not granted.)
- **Default worker law:** repo AGENTS.md "WORKER AUTHORITY (DEFAULT)" — may READ · SEARCH · COMPARE · ANALYZE · RECOVER · CLASSIFY · DRAFT · RUN NON-DESTRUCTIVE CHECKS · PREPARE BOUNDED CHANGES; escalate before external sending · public publication · money movement · account changes · destructive deletion · irreversible filesystem ops · large architectural migration (AGENTS.md:76-80). SUBMISSION_CONTRACT authority gate mirrors it with a human-required list (SUBMISSION_CONTRACT.json:36-38).
- **The repo is a projection, not the canon:** void-anchor/CANON.md — "0xxx0.github.io is the **published projection**, not a canon. It receives selection."
- **Consequence:** the *content* path is techniquely open to anyone with the files, but the *publication* path is a two-actor choreography: codex carries the trunk; the human (mcvoid) approves selection; Hermes' lane is packet production, not push.

---

## 5. ONE RECOMMENDED FIRST INJECTION (smallest end-to-end proof)

**Add one PARKED item to `control/WAITING.json`** (append to `items[]`, pattern at WAITING.json:20-50):

```json
{
  "id": "field-index-first-injection-proof",
  "route": "/",
  "human_move": "Open https://0xxx0.github.io/ on phone or desktop and confirm this item renders in WAITING / YOU.",
  "why": "Smallest end-to-end proof that a committed content file reaches a live Field Index surface.",
  "unlocks": "Decide the injection contract (who may write which control files) from observed behavior, not speculation.",
  "dependency_kind": "HUMAN_CONFIRM",
  "surface_state": "PARKED",
  "parked_at": "<today>",
  "parked_reason": "Injection-path plumbing proof; not an active gate.",
  "reactivate_when": "CURRENT.current_heads[].next_executable references this id."
}
```

Why this one: single JSON append; zero code change; root renders it live with no build (index.html:538); no manifest/route-registration risk; fully reversible; public-safe (WAITING.json:17). **Then push** — by mcvoid or codex, or by Hermes only after explicit write grant. If the goal is *index-visible* content instead of a dependency, the equally small alternative is editing one existing route's `role` text in `showcase-manifest.json` (rendered at index.html:410) — slightly higher risk only because the manifest is the one file the machine lane regenerates most.

Be blunt: the plumbing was never the problem. **Hermes could inject content today if granted; the honest answer to "now or soon" is that the content path is NOW and the only real blocker is authority — and authority is the owner's to grant, deliberately, one bounded move at a time.**