# CONVERGENCE STRATEGY — TARGETS & BOUNDS

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

## NEXT CONCRETE ACTIONS

1. ✅ Convergence validate action written
2. ✅ Disk integrity action written
3. **Extract 11 Laconic canon files** from conversation text
4. **Update MIGRATION.json** with corrected Sleeper status
5. **Write convergence summary to repo** (this document → `/control/confluence/CONVERGENCE_TARGETS.md`)

---

*Targets are reachable. Bounds prevent scope creep. Self-verification replaces manual audit.*