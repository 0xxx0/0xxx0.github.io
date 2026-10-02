# LACONIC / ICONIC 0.4

## JOB

A provenance-aware response instrument for recurring human exchanges.

It now has four distinct object classes:

1. **LINE** — compact single-turn candidate in the bounded current drafting layer.
2. **SCENE** — multi-turn trajectory with explicit branches.
3. **FRAGMENT** — recovered exact phrase/operator that may be memorable without being a deployable reply.
4. **VAULT SOURCE** — exact historical corpus/tag/lineage evidence visible for browsing and copying without automatic promotion.

The distinction is deliberate. A line should not become a scene by implication; an aphorism should not be scored as though it were a text-message answer.

## CORE LOOP

`OBSERVED → POSSIBLE → MOVE → LINE / SCENE → CURATE → HUMAN PORT → RETURN`

- **OBSERVED**: what was actually said/done.
- **POSSIBLE**: tentative need/interpretation, never treated as diagnosis.
- **MOVE**: listen, ask, answer, help, play, celebrate, repair, etc.
- **LINE / SCENE**: choose the required temporal depth.
- **CURATE**: preserve winners and failures.
- **HUMAN PORT**: explicit share/copy boundary.
- **RETURN**: evidence and continuation.

## RECOVERED MULTI-TURN LINEAGE

v0.2 restores an older mechanism recovered from the conversation archive: common exchanges were represented as 2–4-turn branching setups rather than as a flat list of quips.

Public exact donors currently include:
- HOW ARE YOU?
- WHAT DO YOU DO?
- WHY DID YOU DO THAT?

Each exact donor remains marked **EXACT** and is not silently promoted to current canon merely because it was recovered.

A separate older support-tree mechanism is represented as **CARE / CHOOSE THE KIND**. The historical source included private/sensitive situational details, so only the abstract mechanism survived publicly. The scene is marked **RECONSTRUCTED** and every newly written public line inside it is marked **NEW**.

## PLAY ↔ CARE

Humor is not a universal persona.

The scene layer separates:
- **PLAY** — reciprocal wit / branching banter.
- **CARE** — witness / think / practical help / distraction / silence.
- **CELEBRATE** — enthusiasm + elaboration for good news.
- **REPAIR** — low-friction re-entry after gaps or residue.

This prevents "be funny" from overwriting context.

## PSYCH / EMOTION RESEARCH BOUNDARY

Research notes live at:

`/laconic/research/response-principles.md`

They are design donors, not a diagnostic system.

The app must not:
- diagnose from text;
- pretend a sentiment score is ground truth;
- infer motive or hidden state as fact;
- use canned validation as an unconditional reflex.

It may:
- preserve observed language;
- expose possible needs as tentative;
- make support mode explicit;
- ask one bounded question;
- keep emotional labels precise and defeasible.

## PROVENANCE

- **EXACT** — wording recovered verbatim from an archived source.
- **RECONSTRUCTED** — mechanism/source lineage recovered, but wording or public form reconstructed.
- **NEW** — created after recovery.
- **RESEARCH_INFORMED** — new mechanism informed by cited research, not historical canon.

Origin, adoption, recovery, and current canon remain separate concepts.

## FILES

- `bank.json` — v0.1 single-turn candidate bank.
- `schema.json` — line-bank schema.
- `scenes.json` — v0.2 multi-turn trajectories.
- `scenes.schema.json` — scene schema.
- `fragments.json` — selected exact fragments/operators from the recovered master ledger.
- `research/response-principles.md` — bounded research donors.
- `source-pack.schema.json` — recovery staging format.
- `release.json` — current release receipt.

## LOCAL STATE

KEEP / DROP judgments remain browser-local:

`laconic.iconic.verdicts.v01`

The optional OBSERVED scratch field is not uploaded or classified.

## AUTHORITY

This route never sends.

`DRAFT ≠ SEND`

HUMAN PORT owns the explicit external share/copy boundary.

## NEXT BOUNDS

The next credible evolution is not more generic generated lines. It is evidence-bearing curation:

1. recover more exact scene trees / response sequences;
2. ~~mark user adoption/reuse separately from assistant generation~~ — **DONE 2026-09-29**: the scene receipt records `used` as its own field, independent of KEEP;
3. ~~add small branch-level KEEP / DROP / WHY receipts~~ — **DONE 2026-09-29**: verdicts inside a trajectory are keyed `scene#node`, carry `trail`, and accept a short `why`;
4. only then use the recovered grammar to generate a small new frontier.

### What (2) and (3) change, and why it matters

The promotion law above is `EXACT SOURCE ≠ USER-ADOPTED ≠ CURRENT CANON`. Before this change the
instrument could record **taste** (KEEP) but never **adoption** — so nothing recovered could ever
satisfy the rule, and the VAULT read as a museum with no exit. A verdict now carries:

- `v` — KEEP / DROP (taste, as before, backward-compatible with v01 local state);
- `used` — ADOPTED: this was actually used in a real exchange. **Evidence, not taste.** In the line
  ranking, adoption outscores KEEP because it is the stronger claim;
- `why` — short free text: what made it work or fail;
- `scene` / `node` / `trail` — WHICH branch it came from and the path taken to reach it.

Still local-only: `DRAFT ≠ SEND`, and nothing here uploads or promotes automatically. The receipts
are the *evidence substrate* a later, deliberate promotion step can read.


## Recovered source packs

These files are recovery evidence, not automatically current canon:

- `recovered/iconic-laconic-library-2025-10-21.json` — exact 60-line assistant-generated source block from the 2025-10-21 *Iconic laconic responses* archive.
- `recovered/companion-lexicon-2025-10-21.json` — exact historical Ping / Flux / Fuse / Myth / Pulse / Void / Glitch / Echo tag proposal.

Recovery law: **EXACT SOURCE ≠ USER-ADOPTED ≠ CURRENT CANON.** Bulk import into the live bank is intentionally blocked until adoption/reuse and the later 5–6-voice consolidation are recovered at source level.


## v0.3 — VAULT / LINEAGE RENOVATION

The visible surface now separates a small active response instrument from a larger recovered archive.

`VAULT` has four readings:

- **STARS** — selected exact fragments/operators, including user-authored material.
- **2025 BANK** — the exact 60-line assistant-generated Iconic/Laconic source block, grouped by its original six categories.
- **TAGS** — the exact Ping / Flux / Fuse / Myth / Pulse / Void / Glitch / Echo companion lexicon.
- **LINEAGE** — evidence-graded antecedents, convergence stages, and still-open seams around persona / plurality / Council work.

This is intentionally not a bulk canonization step. The historical bank can be funny, rich, or useful while remaining `SOURCE_DONOR_ONLY`.

### Multi-donor Council correction

The recovered evidence no longer supports a simple linear claim that the Council began with the 2024-12-29 persona experiment.

Three antecedents are currently preserved separately:

1. **2024-12-13 — interacting symbolic figures**: Sleeper / W8 / Conch / Keris / Specter dialogue provides exact early multi-character interaction evidence.
2. **2024-12-28 — comic council image**: the exact user line “The council sends you this invisible recovery hamper and a voucher for one cosmic hug” shows `the council` already operating as a humorous social institution inside Laconic/Iconic response play.
3. **2024-12-29 — persona switching**: the user explicitly says trying new personality settings is literally true, then repeatedly selects persona experiments and scenarios.

These may later converge, but they are not silently collapsed into one origin.

**RECOVERED 2026-09-29** — exact-source pass over `~/sovereign-node/corpus/corpus.db` (179,060
messages, read-only). All three items were present. Filed as `recovered/council-lineage-2024.json`
with exact bytes + sha256, and left **separate** rather than merged:

- ~~the direct generated **5–6 internal voice output set**~~ → **LOCATED, NOT TRANSCRIBED.** Assistant
  turns in both threads present full lineups ("Your Core Team of Five Selves (+ Shadow/Sublime
  Self)", "5 distinct, realistic personas, complete with their own personalities, quirks, and
  voices"). Extracting the full cast is a larger separate pass; not claimed as done.
- ~~the direct **"5 selves chatter – realistic personas"** turn~~ → **FOUND EXACT.** User turn,
  `2024-12-29T18:20:23Z`, thread *Response Consolidation Strategy*, 126 bytes, sha `2622f253ae488b0e`:
  *"5 selves chatter - realistic personas they should be real be each very very amusing
  entertaining unforgettable personalities."*
- ~~the earliest direct use of the exact proper name **"Council of Selves."**~~ → **FOUND, 3.5
  MONTHS EARLIER THAN PRESERVED.** `2024-09-02T17:48:22Z`, thread *SIN ORE*, assistant turn, a
  *defined proper-name use*: *"COUNCIL OF SELVES: the collective that cannot be seen, only
  convened"*. The earliest antecedent preserved here was 2024-12-13 — the true earliest is now
  2024-09-02.

Also found exact: the **direct 5–6 request** — `2024-12-28T11:00:24Z`, user, thread *Imago Dei
Exploration*, sha `5c2b68dee4893ca9`: *"Generate my team of 5 selves and or 6 maybe including
shadow or sublime self … embed in a system that has actual strong mathematicL rules in this case
iching"*. **It names I Ching as the embedding rule** — the same rule the surviving scene tree uses.

Recovery rule held: these are four exact dated sources added, **not merged**. `EXACT SOURCE ≠
USER-ADOPTED ≠ CURRENT CANON` — and whether any was ever adopted in live exchange is now
answerable going forward (by the branch receipt) but cannot be recovered retroactively.

Recovery rule: **generic council image ≠ proper-name project; interacting characters ≠ internal selves; persona mode ≠ simultaneous plurality; later canon ≠ proof of earlier identity.**

2026-09-22 exact-source pass: the 5–6 internal-voice request is independently reverified in the current export/search corpus, but its direct original message node and generated voice set remain unrecovered. Later Council casts and later multi-persona scenes are therefore not accepted as substitutes.


## v0.4 — FIVE SELVES / LINEAGE PROJECTION

The LINEAGE vault now turns already-recovered plurality evidence into a visible, bounded projection instead of leaving the exact five-self source chain buried in recovery JSON.

It derives, without copying into a new store:
- the exact 2024-12-29 request for 5–6 distinct internal-persona voices;
- the exact recovered five labels from the immediate 2024-12-30 output: **The Overthinking Strategist · The Chaotic Wildcard · The Dramatic Overachiever · The Overly Honest Realist · The Self-Aware Clown**;
- the explicit boundary that this direct early cast is **not automatically identical to later Council canon**.

This builds on 0.3.6's direct FIELD execution seam but does not add another action, route, object class, or state store.

Design law: **make provenance usable without upgrading its authority.**

## v0.3.5 — POCKET MOVES / SCENE PROJECTION

The POCKET view is deliberately **not** a fifth object class or another canon store.

It projects eight existing SCENES as a carryable deck:

- SCRIPT PRESSURE / NAME THE MOVE
- CARE / CHOOSE THE KIND
- MIXED NEWS / HOLD BOTH
- REPAIR / AFTER A GAP
- GOOD NEWS / CAPITALIZE
- HOW ARE YOU?
- WHAT DO YOU DO?
- WHY DID YOU DO THAT?

Each card reads its title, lane, provenance and opening move from the canonical scene object. **PLAY** enters that exact branch tree. **COPY** copies the current scene's opening line. **USED** writes to the same browser-local branch receipt keyed by `scene#start-node`; it does not create a second adoption store.

`DEAL ONE` is a transient projection only. It selects no canonical priority and grants no authority.

The design law is: **delight may add an aperture; it may not duplicate the object behind it.**
