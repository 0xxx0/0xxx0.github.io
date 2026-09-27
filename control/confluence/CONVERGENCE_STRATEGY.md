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

**Current J-Lens/FOLD//BLOOM continuation:** the donor work lives in [PR #450](https://github.com/0xxx0/0xxx0.github.io/pull/450) and `fold-bloom/convergence/jspace-steering/RESEARCH_HANDOFF.md`. First run one small open-weight-model J-Lens trace with exact model/lens revisions and token IDs. Do not publish a new UI or let readout tokens act as causal directions. Only after a real trace exists, use an explicit model-side residual direction and one controlled perturbation with zero/opposite controls; save before/after traces and an execution receipt. Then stop and replan from the returned evidence.

**Success measure:** less friction from intent to consequence, with identity, authority, uncertainty, and RETURN intact. Artifact count and merged-app count are not progress measures.

---

*The targets and bounds below are retained as dated history for lineage; use CURRENT for active selection.*