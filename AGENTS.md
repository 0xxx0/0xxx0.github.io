# FIELD HOUSE RULES

This repository is not a collection of unrelated apps.

It is a field of addressed objects, unequal projections, reusable mechanisms, executable artifacts and evidence-bearing returns.

**Read this file before doing substantial work.**

---

## BOOT SEQUENCE

1. Finish this file. It owns worker/authority law.
2. Read `/llms.txt` — machine entrypoint and canonical source map.
3. From a current checkout run `node scripts/emit-agent-transcript.mjs` (or `--json`) and use its bounded NOW / HEADS / HUMAN-WORLD-GATES / EGRESS projection. For one supplied JSON packet, `node scripts/emit-agent-transcript.mjs --reduce <packet.json>` maps it to exactly one FIELD egress class without promoting it. Reducer precedence is GATE → NOW → RESIDUE → NEXT → DELTA → ARCHIVE; packet labels cannot mint GATE/NOW authority. New packets should declare `schema: field-work-packet/v0.1` and follow `/control/FIELD_PACKET_EGRESS.json`: OBJECT + AUTHORITY are required, DELTA needs EVIDENCE, and NEXT is bounded to ≤3. Legacy shapes remain recovery-compatible.
4. Open full `/control/CURRENT.json` only when a selected head needs retained depth omitted by the transcript. **Authority source ≠ mandatory first-read payload.**
5. Resolve the selected object in FIELD INDEX / `showcase-manifest.json`; do not ingest the full manifest merely to find one route.
6. Read only the smallest applicable policies from `/control/POLICY_INDEX.json`.
7. Recover older/local material only when needed to identify the object, lineage, donor or missing function.

## WHO OWNS WHAT

| Surface | Owns |
|---|---|
| `CURRENT.json` | Attention (what matters now) |
| FIELD INDEX / `showcase-manifest.json` | Object identity, capability, address, ports, heads |
| AXIAL | Reversible constraint/focus projection over FIELD objects |
| `POLICY_INDEX.json` | Which laws govern a proposed action |
| `QUEUE.json` | Bounded execution capacity |
| `WAITING.json` | Human/world dependencies (not backlog) |
| `/returns/` | Evidence of what actually happened |
| `/recovery/` + local archive | Source/donor memory (not current authority) |
| HUMAN PORT | Ingress/egress boundary |
| `/llms.txt` + `scripts/emit-agent-transcript.mjs` | Stable machine entrypoint + transient selective handoff; no copied state authority |
| Hermes/Codex/ChatGPT | Replaceable executors |

## PRIMARY LAW

**RECOVER BEFORE INVENTING.**

Then:

```
SOURCE → ADDRESS → STATE → TRANSFORM → PROVE → RETURN
```

## BEFORE CREATING ANYTHING

**Find the host.**

- Does an existing route/head already perform or own this function?
- Is this a delta to that object, a donor for it, or genuinely a missing function?
- Can the proposed change be tested in one bounded move?

Do not create another route, architecture, registry, dashboard, agent or ontology merely because the contribution does not immediately fit.

**Zero obvious host means unresolved submission, not automatic new project.**

## CONTRIBUTION CLASSES

Every contribution must resolve as one of:

- **DELTA** — changes an existing head.
- **EVIDENCE** — tests or observes an existing claim.
- **DONOR** — supplies a mechanism to an existing head without replacing it.
- **RETURN** — records observed behavior of a completed run.
- **UNRESOLVED** — no host yet; held for review, not promoted.

## EVIDENCE CLASSES

| Class | Establishes |
|---|---|
| **BYTES** | What actually existed (exact source/executable/assets) |
| **SPEC** | What it meant or promised |
| **IMAGE** | What it looked like (never proves behavior) |
| **RECEIPT** | What actually happened in a particular run |

## WORKER AUTHORITY (DEFAULT)

May: READ · SEARCH · COMPARE · ANALYZE · RECOVER · CLASSIFY · DRAFT · RUN NON-DESTRUCTIVE CHECKS · PREPARE BOUNDED CHANGES

Escalate before: external sending · public publication · money movement · account changes · destructive deletion · irreversible filesystem operations · large architectural migration.

## SURFACE DISCIPLINE

Aesthetic work must reduce ambiguity or interaction cost, not create another visual framework.

- Preserve one addressed object/focus across projections; navigation is secondary to continuity.
- Expose only **1–3 reachable lawful operations** at a time; put depth behind explicit reveal.
- On mobile, keep **one persistent route-control affordance**. Secondary READ/LENS actions belong inside that control surface rather than as permanent floating chrome.
- Prefer hard edges, borders, typography, whitespace and state contrast. Rounded-card/pill grammar and decorative backgrounds are not defaults.
- Reuse the current host and its variables before extracting shared styling. The library threshold remains three real repeats; do not invent a universal shell.
- A visual delta must preserve semantics, keyboard/accessibility paths and evidence boundaries. If it only changes taste, hold it.

## CURRENT HEADS (coordinates, not invitations)

FIELD INDEX · Scale Lens · READFIELD/RSVP · Sleeper/ONE RETURN · FOLD//BLOOM · AXIAL · HUMAN PORT/FIELD INTAKE · POEM MAP/Verse · CARE/BODY · HOUSE/SPATIAL

Reopen a head only if it removes immediate friction, provides a needed tool, captures evidence cheaply, helps another human use something already built, or receives explicit human selection.

## REPOSITORY TRUTH DISCIPLINE

- **Branch existence ≠ active work.** Branches preserve lineage/transport; only `CURRENT.json` plus explicit human selection define attention. An open PR is a candidate delta, not an automatic queue item.
- **Generated snapshot commits are real Git mutations, not semantic FIELD changes.** `comms:` / `nexus:` refresh commits may move `master`; interfaces may de-emphasize them but must never relabel an older field commit as Git HEAD.
- Keep **MASTER HEAD** (exact repository chronology) distinct from **FIELD latest** (latest non-machine semantic mutation).
- Do not mass-delete historical branches merely to make the branch list look clean; prune only with explicit branch-deletion authority and evidence that no open work or unrecovered donor depends on them.

## LIVE STATE (regenerated, not hand-maintained)

- Coordination board: `/nexus/board.html`
- Machine-room comms state: `/comms/` (system glyph + fleet + open + digest + loops; regenerated from ops-hub by `comms_page.py` every 30m)
- Convergence dashboard: `/nexus/index.html`
- System map: `/nexus/map.html`
- **FIELD Index live sync**: `/` (Φ host/current frame + φ local focus; exact master commits are chronology; manifest rail is a route projection)
- Machine entrypoint: `/llms.txt`
- Transient current handoff: `node scripts/emit-agent-transcript.mjs` (or `--json`)
- `/control/WORKER_BOOT.json` is a superseded compatibility pointer, not live state.
- Submission contract: `/control/SUBMISSION_CONTRACT.json`

## SUCCESS

Success is not more architecture, more files, more tasks, more agent activity.

Success is **less friction between something that matters and reality becoming different**.