# BACKUP ARCHAEOLOGY -> INTERPHASE WORKER PACKET

Use this as the default handoff for parallel recovery workers.

## Mission

Recover prior reality **before** interpreting or redesigning it.

Your output is not a retrospective essay and not a new project taxonomy.

Produce one evidence-grounded `0xxx0/interphase-recovery-packet/v0.1` that another worker can immediately inspect through INTERPHASE.

## Non-negotiable laws

1. Exact bytes > reconstruction.
2. Raw user/source material > assistant summary.
3. Similarity is not identity.
4. UNKNOWN is not absence.
5. Later correction does not erase earlier state; use supersession.
6. Screenshot proves appearance, not behavior.
7. Spec proves intended/declared behavior, not observed execution.
8. Receipt/test proves only the version/run actually observed.
9. Do not redesign recovered artifacts during archaeology.
10. Do not assign screen/ROOM coordinates during recovery.
11. Do not merge two candidates without a stable join key.
12. Do not create a new sovereign "project" merely because files share a theme.
13. Every promoted claim requires a return path.
14. Stop when the next bounded action has higher value than further broad search.

## Required workflow

### 1. REFLECT

Write one sentence stating what exact lineage/batch/object you are trying to recover.

Preserve the original task wording separately.

### 2. SCHEMA

Before searching, list the slots that would matter:

- identities / aliases;
- dates / versions;
- source files / bytes / hashes;
- specs;
- screenshots/images;
- tests/receipts;
- hierarchy;
- relations;
- operations/mechanisms;
- authority/effect boundaries;
- observed projections;
- current/superseded state;
- contradictions;
- expected-but-missing evidence.

### 3. ANCHOR

Use the rarest available keys:

- proper names;
- exact phrases;
- filenames;
- commit ids;
- dates;
- hashes;
- URLs;
- unique measurements;
- distinctive labels.

### 4. RECOVER

Search the authorized backup/export/repo/files.

Copy or freeze exact bytes before semantic consolidation where practical.

Record source refs immediately.

### 5. SPLIT EVIDENCE

Classify every assertion:

- SOURCE
- REPORTED
- ASSISTANT_SUMMARY
- ASSISTANT_INFERENCE
- CURRENT_INFERENCE
- CONFLICT
- UNKNOWN

Never allow assistant repetition to count as independent confirmation.

### 6. ANTI-MERGE

Before joining A and B require:

- same exact id/entity; or
- same source chain; or
- same event with compatible time/attributes; or
- explicit correction/equivalence; or
- documented equivalence rule.

Otherwise emit an `anti_merge_hold`.

### 7. EXTRACT THE MECHANISM

For each artifact, answer mechanically:

```
SOURCE
canonical object / bytes
address
hierarchy
relations
selection/focus evidence
observed projection(s)
operations
authority / irreversible effects
clock if any
output
RETURN / provenance
unique residue
```

This is not a request to force the artifact into INTERPHASE. It is a way to reveal what would be lost by doing so.

### 8. PROPOSE CORRESPONDENCE, NOT GEOMETRY

Only after recovery, optionally suggest semantic facets:

```
SOURCE / FRAME / FOCUS / OPERATE / WITNESS / RETURN
```

or a domain-specific facet set.

Do **not** say "put this on the left wall" unless the recovered artifact itself made that geometry semantic.

Projection/layout belongs to a later mapping pass.

### 9. ADVERSARIAL VERIFY

Search once specifically for:

- missing expected version;
- contradicting date/number;
- alternate spelling;
- superseded artifact;
- same name used for a different object;
- exact source behind an assistant summary;
- evidence that the apparent mechanism did not actually work.

### 10. RETURN

Produce the packet + worker receipt.

## Required JSON skeleton

```json
{
  "schema": "0xxx0/interphase-recovery-packet/v0.1",
  "packet_id": "recovery:<bounded-subject>:<date>",
  "subject": "...",
  "scope": "...",
  "as_of": "...",
  "anchors": [],
  "artifacts": [],
  "claims": [],
  "conflicts": [],
  "superseded": [],
  "unknowns": [],
  "anti_merge_holds": [],
  "next_information_gain": [],
  "return_paths": [],
  "worker_receipt": {
    "searched": [],
    "not_searched": [],
    "stop_reason": "...",
    "exact_bytes_copied": 0,
    "exact_refs_only": 0
  }
}
```

Schema:

`/control/schemas/interphase-recovery-packet.schema.json`

## Artifact minimum

```json
{
  "artifact_id": "stable-local-id",
  "kind": "html|code|image|spec|physical|conversation|game|...",
  "names": ["exact recovered names"],
  "source_refs": ["exact path/url/message/commit"],
  "sha256": null,
  "bytes_status": "EXACT|LOCATED_NOT_COPIED|UNAVAILABLE|NOT_APPLICABLE|UNKNOWN",
  "provenance_class": "SOURCE",
  "addresses": [],
  "parent": null,
  "relations": [],
  "channels": ["identity","address","content","evidence"],
  "operations": [],
  "authority": "VIEW",
  "observed_projections": [],
  "mechanisms": [],
  "unique_residue": [],
  "disposition_candidate": "UNKNOWN",
  "mapping_candidate": null
}
```

## What a good result looks like

Bad:

> "There were several radial UI experiments that evolved into the current system."

Good:

> 4 exact artifacts recovered, two share source hash/explicit version chain, one is visually similar but has no join key and is held distinct, one is a later reconstruction. Their common surviving mechanism is cyclic alignment over stable addresses; only two contain executable rotation. Exact source refs and contradiction are in the packet.

## Parallel-worker partitioning

Prefer non-overlapping axes:

- worker A: exact bytes + hashes + file ancestry;
- worker B: user-message/spec intent + corrections;
- worker C: runnable behavior + receipts/screenshots;
- worker D: lineage/anti-merge + current-head correspondence.

All workers return packets/fragments with source refs.
A convergence worker joins them using stable keys; workers do not free-chat to synchronize.

## Copy-paste task header

```
RECOVER BEFORE INVENTING.

Target: <EXACT LINEAGE / BACKUP BATCH / NAMED ARTIFACT>

Produce an INTERPHASE recovery packet, not a narrative summary.

Use:
- /control/confluence/RETRIEVAL_CANON.md
- /control/schemas/interphase-recovery-packet.schema.json
- /control/INTERPHASE_MAPPING_CONTRACT.json
- /control/confluence/BACKUP_ARCHAEOLOGY_INTERPHASE_WORKER_2026-09-23.md

Recover exact source first. Preserve conflicts and UNKNOWN. Do not redesign, merge on resemblance, or promote projects. Extract surviving mechanisms and unique residue. Mapping suggestions are semantic correspondence only; geometry comes later. Finish with exact return paths and a bounded stop reason.
```
