# INTERPHASE MIGRATION 0.1 — BACKUP ARCHAEOLOGY FIRST

Status: **EXECUTABLE MIGRATION SPEC**
Updated: **2026-09-23**

## Why this is first

Backup archaeology already has a mature law:

```
SOURCE -> SCHEMA -> ANCHOR -> RETRIEVE
-> PROVENANCE SPLIT -> ANTI-MERGE
-> CANON -> GAP -> DERIVE -> RETURN
```

What it lacks is a standard *recipient shape*.

Workers currently risk returning prose summaries, ad-hoc inventories or newly invented project groupings. Those then require another interpretive pass before FIELD / INTERPHASE / migration machinery can use them.

This migration makes recovery output immediately addressable.

## Delta

Before:

```
backup / chat / file / screenshot
  -> worker interpretation
  -> prose / inventory
  -> later human or agent reinterpretation
  -> maybe a current object
```

After:

```
backup / chat / file / screenshot
  -> RETRIEVAL CANON
  -> INTERPHASE RECOVERY PACKET
  -> read-only recovery adapter
  -> correspondence mapping
  -> any lawful projection
  -> explicit promotion / migration decision elsewhere
```

No archaeology worker receives authority to promote, merge or redesign.

## New durable interfaces

- packet schema: `/control/schemas/interphase-recovery-packet.schema.json`
- recovery adapter: `/lib/interphase-recovery.js`
- mapping contract: `/control/INTERPHASE_MAPPING_CONTRACT.json`
- mapping helper: `/lib/interphase-mapping.js`
- worker packet: `/control/confluence/BACKUP_ARCHAEOLOGY_INTERPHASE_WORKER_2026-09-23.md`

## Recovery packet object classes

### ARTIFACT

An exact or candidate thing that existed.

Must preserve:

- stable packet-local artifact id;
- original names/aliases;
- source refs;
- bytes state + hash when possible;
- provenance class;
- hierarchy / relations;
- mechanisms;
- observed projections;
- unique residue;
- candidate disposition only.

### CLAIM

A source-grounded assertion about an artifact/event/lineage.

Never flatten claim provenance into artifact truth.

### CONFLICT

Two or more incompatible claims.

Conflict is data, not worker failure.

### UNKNOWN

A schema slot expected to matter but not recovered.

UNKNOWN is not absence.

### ANTI-MERGE HOLD

Two similar candidates that cannot yet be lawfully joined.

### RETURN PATH

Enough information to find the exact evidence again.

## Correspondence into INTERPHASE

Default recovery mapping:

| recovered class | facet / office | reason |
|---|---|---|
| exact bytes / source artifact | SOURCE | what actually existed |
| hierarchy / relations / constraints | FRAME | context and structural neighborhood |
| current selected artifact/claim | FOCUS | current object of inspection |
| proposed disposition / comparison | OPERATE | a candidate action, not automatically executable |
| receipt / hash / test / contradiction | WITNESS | evidence |
| source refs / prior state / supersession path | RETURN | re-entry and provenance |

This is a preset only. The packet remains valid if a domain-specific mapping differs.

## Projection examples

The same recovered packet can be read as:

- LINE — chronology / ordered discoveries;
- TABLE — artifact × evidence attributes;
- RING — compact family/source cycle where cyclic ordering is actually declared;
- ROOM — six recovery offices around a focused artifact;
- GLYPH — compact artifact identity witness;
- GRAPH — hierarchy / relation / supersession edges;
- READFIELD — raw recovered notes/source;
- physical print — evidence cards or labels, if exact source references survive.

No projection becomes the packet.

## First operational migration

### Input

One bounded archaeology target:

- one archive/export directory;
- one named lineage;
- one exact-source gap;
- or one backup batch.

### Worker output

Exactly:

1. one recovery packet JSON;
2. exact/copied bytes or immutable refs where available;
3. optional screenshots/specs/receipts as evidence files;
4. one worker receipt with search scope and stop reason;
5. no redesigned UI.

### Intake

`InterphaseRecovery.create(packet)` exposes packet/artifact/claim/conflict/unknown/hold IDs through the normal INTERPHASE adapter shape.

It is read-only.

Promotion remains MIGRATION / FIELD INTAKE work.

## Acceptance tests

1. same artifact id survives LINE -> ROOM -> GLYPH -> TABLE;
2. exact source refs remain attached;
3. conflicts remain distinct;
4. UNKNOWN remains UNKNOWN;
5. aliases do not become merge keys by themselves;
6. hierarchy/relations remain available even if hidden in a projection;
7. projection suppressions are residue, not deletion;
8. no archaeology output creates execution authority;
9. one raw source can be re-found from every promoted claim;
10. worker can stop with a useful packet even when the lineage remains unresolved.

## Migration disposition vocabulary

Workers may suggest only:

- KEEP_HOST
- ADAPTER
- PROJECTION
- DONOR
- MERGE_CANDIDATE
- RECOVER
- QUARANTINE
- UNKNOWN

They may not make deletion or public-head decisions.

## Success condition

The migration succeeds when a second worker can begin from the packet and answer:

> What exactly existed, what remains uncertain, what unique mechanism survived, how does this map into the current instrument, and where do I return for proof?

without rereading the entire backup.
