# SKILL AUDIT — bloat, routing, elegant loops (2026-10-22)
Delegated audit of `~/.hermes/profiles/kestrel/skills/` (108 active + 8 staged, 3,577 recorded uses).

## Counts
- 108 active skills · 119 usage records · 1,743 curator ledger entries · 1.46 MB of SKILL.md.
- Use concentration: top 22 skills (20%) carry 62.2% of use · mid 45 carry 33.8% · tail 41 (≤9 uses) carry 4.1% · **4 at zero uses** (chroma, dynamic-workflow, har-derived-api-client, hermes-skill-authoring).
- Sizes: 4 huge >40KB (subagent-fanout 77.5KB, browser-instrument-verification 70.7KB, shared-repo-integration 47.2KB, hermes-stack-audit 42.6KB) · 18 in 20–40KB · 55 ok.
- Categories: devops = 78/108 (72% catch-all) · 15 uncategorized.

## Top findings
1. **The bloat is INDEX cost, not body cost.** All 108 name+description lines ride in the system prompt every turn — 108 routers for a library where 22 skills do the work.
2. **44/108 descriptions exceed the 57-char index ceiling** → routing trigger truncated for 41% of the library (worst: building-with-typesafe-jev 390 chars). Routing signal destroyed exactly where needed.
3. devops/ is a catch-all: path gives no routing information.
4. Tail: 41 skills (38%) with ≤9 uses = 4.1% of usage. Dead weight.
5. 12 overlap clusters where two skills split one trigger (model routing, decision queues, calibration, sourcing, persistence, telegram, skill authoring).
6. Data-quality bug: `state=stale` tracks PATCH AGE, not use — 4 high-use skills falsely flagged. Do not route on it.
7. Retire infrastructure healthy: `.archive/` + MANIFEST + curator ledger exist. Retirement is staged, never delete.

## Routing design (elegant loops)
- **T0 — the descriptions ARE the router.** Rewrite all 44 over-length descriptions so the trigger clause fits the first five words (detail stays in the body, loaded only by skill_view). Re-shelve devops into 6 groups (verify / corpus / hermes-ops / iot+render / comms / meta). Target ~65 index lines after merges.
- **T1 — default kit (loadout rules).** Session start equips ≤8 slots, weight ≤15, from a default 4: mcvoid-alignment · agent-discipline · recall · fix-verification, plus 1–2 task-shape adds. Everything else index-only: `skill_view` on trigger match, STOW writes a locator, OVERLOAD drops the heaviest never-fired slot, dark trigger across 2 sessions → stowed.
- **T2 — tail governance (search → reuse → repair → merge → create).** ≤9 uses → review list. 16 merge waves first, then stage retires into `.archive/` with MANIFEST.sha256 (`skills.disabled` hides an index line without moving the file). Promotion gate: ~5 uses. Demotion: ≤4 uses AND ≥12d idle. Exempt: pinned, ≥50-use, recently patched. Re-measure `.usage.json` monthly.

## Merge waves (16)
provider-routing + hermes-model-routes · inbox + operator-decision-queues + calls · capability-sourcing + tool-adoption-review · label-calibration + human-review-calibration · persistence-discipline → session-continuity-capsule · mem0-platform-ops → hermes-memory-curation · hermes-skill-authoring (0u) → skill-library-curation · dynamic-workflow (0u) → subagent-fanout · one-three-one-rule → brief · essence-loop → corpus-distillation · thread-analysis → restate · qwen3-8b-local-encoder → local-model-ops · mqtt-discovery → housebus-haos · telegram-mini-app + telegram-stickers → telegram-publishing · image-set-iteration → local-render-execution · cross-ai-handoff → chat-register.

## Retire candidates (staged, not deleted)
chroma (0u) · har-derived-api-client (0u) · docker-management (1u) · live-dashboard (1u) · qmd (2u) · gradio-space-headless (1u) · suno-composition (1u) · grill-me (1u) · rule-review (3u) · evidence-gap-audit (3u) · browser-library-adoption (6u) · session-transcript-archival (9u, merge-preferred) · label-calibration (post-merge surplus) · already staged: work-shipping, documentation-absorption, hermes-docs-refresh, hermes-voice-tts, replace-duplicated-esc-copies-in-fold.

## Status
AUDIT ONLY — nothing moved yet. Execution order: T0 rewrites (highest leverage per character) → merge waves → staged retires. Awaiting operator word to execute the waves.
