# CONVERGENCE STRATEGY — TARGETS & BOUNDS

> **Historical snapshot: 2026-09-22.** The status table and target list below record that day's planning state; they are not a live queue. For current attention, read [CURRENT](../CURRENT.md) and [AGENTS](../../AGENTS.md). The active objective is conversion: move one existing verified head into real use or world contact, observe the consequence, record a bounded RETURN, then replan. Recovery and ingest remain maintenance unless they remove a live blocker.
>
> The original purpose and end condition are stated in [CONFLUENCE / FIELD — Conversion Report](./CONFLUENCE_FIELD_CONVERSION_REPORT_2026-09-22.md): preserve identity and provenance while transforming conversation, code, objects, rooms, bodies, media, and other unequal sources into consequential operations with evidence and a path back. The interface invariant is captured in [Unified Instrument Pivot](./UNIFIED_INSTRUMENT_PIVOT_2026-09-25.md): carry one object and focus through a small number of lawful operations, visible consequence, witness, and RETURN. Do not merge every project or create another universal layer.


**Generated:** 2026-09-22  
**Role:** Operational confluence document — sets reachable targets, bounds, and self-verification loops for the current convergence phase.

---

## CURRENT STATE

| Layer | Status | Surface |
|---|---|---|
| FIELD INDEX | ACTIVE | Public hub, capability + I/O grammar |
| CONVERGENCE | HIGH VELOCITY | LISTEN/READFIELD/FIELD PULSE/TWO DIAL composing |
| RECOVERY | COMPLETE (13 families) | All exact-source donors frozen and manifested |
| SLEEPER CITY | RECOVERED (was BLOCKED) | Live app at chatgpt.site, assets on disk |
| LACONIC CANON | PARTIAL (255 items) | Ledger exists; 7 canon files in ChatGPT sandbox |
| PHYSICAL RETURN | STALLED | Template exists, not exercised |
| HERMES | SETTING UP | 2 cronjobs ready, gateway needs start |

---

## TARGETS (bounded, reachable within 1-2 weeks)

### Target 1: Convergence audit — DONE
- ✅ GitHub Action `convergence-validate.yml` written (validates routes, hashes, references)
- ✅ GitHub Action `disk-integrity.yml` written (checks orphan files, missing manifests)
- ✅ Both fire weekly + on push to master
- **Bound:** Do not add more than 5 checks. Self-verification should be cheap, not comprehensive.

### Target 2: Laconic canon recovery — NEXT
- 11 canon files produced in ChatGPT sandbox on 2026-08-07
- 255 items recovered (195 ledger + 60 multilingual)
- 20 items still in missing queue
- **Bound:** Re-extract the 11 files from conversation text. Do not expand canon — only recover what was produced.

### Target 3: Sleeper City asset import — NEXT
- 8.2MB of assets downloaded from live URL
- MIGRATION.json still says BLOCKED (stale)
- **Bound:** Update status + add asset inventory. Do not re-architect the donor.

### Target 4: Disk reorg — PENDING
| Zone | Size | Action |
|---|---|---|
| ops-hub (6.4GB) | 170K files | Wiki backup (167MB) → repo. Remainder is Hermes runtime ops — leave in place. |
| hermes-workspace (1.4GB) | 119K files | Mostly node_modules — leave in place (Hermes needs it). |
| ai-media (2GB) | 53K files | ComfyUI + assets — check if generated outputs need curation. |
| chatgptbakimages (5.2GB) | 1,785 files | ~5GB of image generations — candidate for curated catalog. |
| InteriorAIApp (680MB) | 24K files | Likely stale project. Check if still active before reorg. |
| Downloads zips (5.9GB) | Multiple duplicates | Consolidate old export zips; keep only the latest 2. |

---

## SELF-VERIFICATION LOOP

Every Monday at 6am UTC, `convergence-validate.yml` checks:
1. MIGRATION.json routes exist on disk
2. CURRENT.json documentation paths exist
3. Showcase manifest routes resolve
4. Recovery manifest hashes match on-disk files
5. Recovery files are manifested

Every Monday at 8am UTC, `disk-integrity.yml` checks:
1. No unreferenced files in /recovery/
2. No empty/generic index.html files
3. Stale .gitkeep files

**Rule:** If validation fails, the failed check produces a CI artifact report. No automatic fixes — human review required.

---

## BOUNDS

| Limit | Rule |
|---|---|
| Active fronts | Max 3 (currently 2: recovery maintenance, convergence validation) |
| New cronjobs | Max 5 total (currently 2, +2 GH Actions = 4) |
| Laconic canon expansion | Do not add — only recover what was already produced |
| Sleeper City re-architecture | Do not — frozen donor status means freeze, not rebuild |
| Disk deletion | Never automatic. Reports only. |
| Hermes write authority | Keep read-only for recovery. Repo changes through Codex or manual commit. |

---

## SUCCESSOR INSTRUCTIONS — CURRENT AUTHORITY

1. Start from `AGENTS.md` and `control/CURRENT.json`; run `node scripts/emit-agent-transcript.mjs --json` for a bounded handoff. Treat the dated sections below as history, not present work.
2. Select one existing head and one real use/consequence. Keep the object identity and focus stable; expose at most three operations already lawful for that host.
3. Execute one bounded move. Test invariants and replay locally first; mark unobserved human, model, device, and physical properties UNKNOWN. A passing synthetic test is not lived-use evidence.
4. Record the exact source, operation, changed state, evidence class, limits, and return address. Update FIELD INDEX/CURRENT only when a material head or focus actually changes.
5. Re-read CURRENT and explicitly replan. Stop when the next useful move requires human/world input; do not substitute archive foraging, new architecture, or receipt-only work.

**J-Lens/FOLD//BLOOM continuation:** PR #450 is merged (`3093df1`). A pinned tiny-GPT-2 fit/apply run and exact artifact digest prove plumbing only; the promotion gate correctly remains `BLOCKED` for semantic workspace evidence, a controlled intervention, zero/opposite controls, repeated prompts and an execution receipt. Continue from `fold-bloom/convergence/jspace-steering/RESEARCH_HANDOFF.md`. Do not publish a new UI or treat readout tokens as causal directions. Run the next experiment only when CURRENT selects this head; preserve model/lens revisions and token IDs, then return before any second intervention.

## CURRENT CONVERGENCE RETURN — 2026-09-27

This section is the dated survey for the current repo state. `control/CURRENT.json` remains the authority for what to do next; this section records what the latest convergence work established and how to continue without reopening duplicate fronts.

### Recovered objective

The executable spine remains `SOURCE → ADDRESS → STATE → TRANSFORM → PROJECTION → PROVE → RETURN`: carry one addressed thing through unequal forms while preserving its source, identity, authority, uncertainty and way back. The measure is less friction from intent to a lawful operation, visible consequence, evidence and exact RETURN. The repo is a governed control surface, not a portfolio to flatten into one app. HEXAGRAM/glyph meanings remain culturally specific projections; geometry, model readouts and metaphors do not acquire human/action authority by resemblance.

### Lineage and evidence map

| Lineage / change | Current disposition | What is established | Limit that remains |
|---|---|---|---|
| FIELD INDEX, INTERPHASE, HUMAN PORT | Surviving coordination and passage mechanisms | CURRENT selects attention; host instruments retain domain truth; exact source/address can cross an explicit boundary and return | Shared protocol does not justify a universal runtime or bus |
| Shopping → HOUSE FIT (#449, `970be91`) | Merged | Exact candidate/lifecycle revalidation returns an accepted dimensional-envelope receipt | No doorway, utilities, ventilation, load, installation, ownership or adoption proof |
| CARE/HOUSE locus (#446, `a76b4bc`) | Merged | Selected body/room stays visible behind a small aperture with at most three existing host actions | No health score, new state owner, device actuation or medical authority |
| J-Lens/change calculus (#450, `3093df1`) | Merged research tooling | Lawful LIVE-state falsification and a pinned real-model fit/apply plumbing trace | No semantic workspace evidence or causal steering; promotion gate remains blocked |
| AXIAL object-at-center (#464, `b73fd92`) | Merged; PR CI passed | READ/LAB/REPLAY keep the attended object central, make lenses secondary, and preserve marks as passage residue | No claim that a mark means comprehension; no PDF/EPUB/DOCX parsing |
| READ trail draft (#461) | Parked donor proposal; not part of master | Its broad branch failed `field-aperture.js` syntax validation. A two-file extraction exists at `converge/focus-trail-replay-20260927` and `node tools/read-trail-selftest.cjs` passes | The extraction is not wired to a live route. Its content-derived key is a short FNV-1a fingerprint, not collision-resistant source identity; storage failures are swallowed into an empty-looking result |

The merged work reduces actual translation friction in existing hosts. Do not combine these unequal hosts or their meanings merely to make the architecture look uniform. Preserve closed/superseded branches as lineage; use a branch name only as provenance, never as current authority.

### Executable successor instructions

1. **Recover live authority.** Read `AGENTS.md`, `control/CURRENT.json`, and the smallest relevant policy in `control/POLICY_INDEX.json`. Run `node scripts/emit-agent-transcript.mjs --json` for the bounded handoff. Treat dated surveys, open PRs and branch names as evidence, not as a competing NEXT queue.
2. **Choose one existing object.** Follow `CURRENT.next_single_action`. Select a head only when it can reduce a named real-use friction, help another person use an existing capability, or unlock a specific device/world consequence. Name the user, source, address, present friction, available lawful action and expected return before editing.
3. **Set the baseline.** Record the current route/version and reproduce the friction with the smallest existing fixture or browser path. Check which state owner and exact source ID already govern it. Keep observed facts separate from inference; do not assume a missing receipt means the user failed.
4. **Make one bounded delta.** Reuse the host and its state owner. Keep the represented object visible, expose one to three reachable operations, show the resulting state, and provide an exact return path. Preserve source identity, authority boundaries and unknown properties. Do not add a shared runtime before three real consumers or material duplicated logic demonstrate the need.
5. **Verify in order.** Run pure-core/self-tests; test import/export and return round trips; run responsive browser and keyboard/touch-equivalent checks; validate route registration, public assets and `node tools/validate-public.mjs`; then inspect the full GitHub workflow on the exact proposed head. CI proves only its declared checks. Keep physical, device and subjective claims UNKNOWN until directly evidenced.
6. **Return and replan.** Write one `/returns/` record with source/revision, operation, prior and resulting state, evidence class, exact limits, and return address. Update FIELD INDEX, manifest or CURRENT only if a material head/focus/authority changed. Re-read CURRENT after the return. If the next useful step is human/world-gated, record it in WAITING and stop rather than filling the gap with archive work or proof-only PRs.

### READ trail promotion gate

The extracted `field-source-trail/v0.1` remains a donor until a selected conversion makes local mark/resume materially useful. If selected, integrate one host at a time. Bind the trail to that host's exact source identity (for example its existing source-bundle digest and canonical address); do not use the current 32-bit content fingerprint as canonical identity. Distinguish “no trail” from unavailable/corrupt storage instead of silently presenting an empty record. Keep VISITED/MARKED as traversal evidence only, never “read,” “understood,” “agreed,” “verified” or “complete.”

Before promotion, prove: (a) exact source and address survive reopen/reload; (b) marks and NEXT MARK remain local and removable; (c) source bytes and private text do not enter the trail; (d) storage failure is visible and does not overwrite evidence; (e) the existing route's read/ride operation remains usable on phone and keyboard; and (f) RETURN preserves the originating host and address. Add no cross-device sync, new bus, or separate route unless a real use case and evidence require it.

**Stop condition:** one successful conversion return is enough for the next replan. A passing self-test, attractive mock, merged PR or expanded index is not itself the end condition.

**Success measure:** less friction from intent to consequence, with identity, authority, uncertainty, and RETURN intact. Artifact count and merged-app count are not progress measures.

---

*The targets and bounds below are retained as dated history for lineage; use CURRENT for active selection.*
