# RETRIEVAL / CANON

Status: **active cross-thread primitive**
Updated: **2026-09-20**

## Purpose

Recover prior reality into a usable current state **without silently merging unequal things, promoting inference into fact, or losing the path back to source**.

This is not a memory product and not a new current-head app. It is a coordination protocol that binds existing recovery, intake, provenance, FIELD INDEX, and RETURN machinery.

## Core law

> **SOURCE → SCHEMA → ANCHOR → RETRIEVE → PROVENANCE-SPLIT → ANTI-MERGE → CANON → GAP → DERIVE → RETURN**

A compact equivalent:

> **Define the slots reality could occupy; bind the rarest useful key; recover what actually occupied them; preserve disagreement and source paths; only then compute forward.**

## Why schema comes before search

Search with only a name is precise but can be narrow. Search with only a generic schema is broad but noisy.

The useful order is:

1. **SCHEMA** — define likely fields, event types, measurements, entities, decisions, and evidence classes before trusting the available fragments.
2. **ANCHOR** — add high-information discriminators: exact names, rare phrases, dates, IDs, places, file names, or unique measurements.
3. **RETRIEVE** — search across all authorized prior context, files, repositories, logs, attachments, and raw sources.
4. **VERIFY ADVERSARIALLY** — search specifically for expected-but-missing values, synonyms, numeric variants, contradictions, superseded interpretations, and likely contamination.
5. **CANONICALIZE** — compress only after provenance is explicit.

The interaction is multiplicative:

```
SCHEMA only      → high recall / noisy
ANCHOR only      → high precision / possibly narrow
SCHEMA × ANCHOR  → high recall × high precision
```

## Provenance classes

Every recovered assertion should carry one of these classes:

| class | meaning | promotion rule |
|---|---|---|
| SOURCE | exact user/document/tool/source statement | may enter canon directly if not superseded |
| REPORTED | paraphrase traceable to a source | retain source link and wording delta |
| ASSISTANT_SUMMARY | prior model compression | never outranks underlying source |
| ASSISTANT_INFERENCE | prior model deduction/speculation | hypothesis only |
| CURRENT_INFERENCE | present deduction from available evidence | hypothesis only |
| CONFLICT | incompatible claims coexist | preserve both until resolved |
| UNKNOWN | expected field not recovered | do not convert to absence |

## Anti-merge rule

**Similarity is not identity. Temporal adjacency is not causality. Repetition is not confirmation.**

Before merging two fragments into one canonical object, require at least one stable join key:

- same exact entity / ID;
- same source chain;
- same event with compatible time and attributes;
- explicit user/source correction linking them;
- or a documented equivalence rule.

Otherwise:

```
KEEP DISTINCT
  ├─ candidate A
  ├─ candidate B
  └─ relation: UNKNOWN / POSSIBLE / SUPERSEDED / DUPLICATE-CANDIDATE
```

A later correction does not erase the earlier state. Encode:

```
OLD CLAIM → SUPERSEDED_BY → NEW CLAIM
```

This preserves archaeology while protecting present truth.

## Question reflection / human ingress

Restating a question is useful when it reduces ambiguity or consequence risk.

Rule:

> **REFLECT WHEN USEFUL; PRESERVE THE ORIGINAL.**

Good reflection:
- compresses the ask into one testable interpretation;
- marks assumptions;
- makes disagreement cheap;
- does not force ceremony on trivial questions;
- does not replace the source wording.

This applies to interviews, human handoffs, agents, and HUMAN PORT.

## Canonical packet

A minimal recovered-state packet:

```json
{
  "subject": "...",
  "scope": "...",
  "as_of": "...",
  "anchors": [],
  "facts": [
    {
      "claim": "...",
      "provenance": "SOURCE",
      "source_ref": "...",
      "time": "...",
      "confidence": "HIGH"
    }
  ],
  "conflicts": [],
  "superseded": [],
  "unknowns": [],
  "anti_merge_holds": [],
  "next_information_gain": [],
  "return_paths": []
}
```

## FIELD INDEX fit

The protocol maps directly onto the existing FI law:

```
INPUT      = raw fragments / files / messages / observations
PORT       = retrieval surface / connector / file / thread
ADDRESS    = schema slot + entity anchor + source ref
STATE      = evidence-graded recovered assertions
TRANSFORM  = retrieve / compare / split / anti-merge / canonicalize
OUTPUT     = canonical packet + gaps + derived candidates
EVIDENCE   = exact source links / hashes / citations / receipts
RETURN     = path back to source, conflicting branch, and superseded state
```

It therefore does **not** need a competing public app.

Operational landing zones:

- **CONFLUENCE** — owns this cross-thread method.
- **CONTINUITY / CASE** — executable local-first projection at `/continuity/`; turns sources + claims into a reviewed canonical packet without server-side private storage.
- **CARE / FIELD** — compact health/care projection at `/care/`; captures observations and trajectories, imports BODYFIELD/CONTINUITY, and produces reviewed clinician/vet briefs without diagnostic authority.
- **FIELD INTAKE** — can ingest recovered packets and resolve KEEP BOTH / REPLACE / REJECT while preserving before-state and provenance.
- **MIGRATION / RECOVERY** — performs artifact archaeology and exact-source recovery.
- **CURRENT** — references the method for cold-start workers.
- **RETURN** — stores evidence that a recovered/canonical state actually changed.
- **HUMAN PORT** — inherits only the human-facing reflection/confirmation discipline, not private canonical state.

## Worker handshake

For any substantial re-entry or consolidation task:

1. **REFLECT** — one-line interpretation + assumptions when ambiguity/stakes justify it.
2. **SCHEMA** — identify what classes of facts would matter.
3. **ANCHOR** — choose rare/high-information discriminators.
4. **RECOVER** — retrieve raw evidence before synthesis.
5. **SPLIT** — separate source facts from summaries and inference.
6. **ANTI-MERGE** — preserve unequal candidates and superseded states.
7. **VERIFY** — perform at least one omission/contradiction pass.
8. **CANON** — produce compact state with source paths.
9. **GAP** — rank missing fields by expected information gain.
10. **DERIVE** — research, decisions, planning, prognosis, implementation.
11. **RETURN** — record evidence and make the next worker able to re-enter cheaply.

## Stop condition

Stop the retrieval pass when:

- all high-value schema slots are either grounded, conflicted, or explicitly UNKNOWN;
- every promoted fact has a return path;
- unresolved merges are held rather than guessed;
- one adversarial omission pass has completed;
- further retrieval has lower expected value than the next bounded action.

Do **not** stop merely because a coherent narrative has appeared.

## Failure signatures

- a polished summary with no raw source path;
- an exact-looking number that originated in assistant inference;
- two similar people/projects/events silently collapsed;
- a later correction erasing earlier provenance;
- generic terms retrieving the wrong lineage;
- repeated assistant paraphrases being mistaken for independent evidence;
- UNKNOWN silently converted into “no”;
- research begun before the actual present state is recovered.

## Relation to existing laws

This primitive sharpens, rather than replaces:

- **RECOVER BEFORE INVENTING**
- **IDENTITY ≠ LOCATION ≠ PROJECTION ADDRESS**
- **COMPRESSION MUST RETAIN A RETURN PATH**
- **DISCUSSION ≠ INDEX TOUCH; MUTATION → INDEX TOUCH**
- **ONE THING, MANY LAWFUL READINGS, FEW LAWFUL TRANSFORMATIONS**

The new contribution is the explicit **anti-merge + provenance-split + adversarial omission pass** between retrieval and canonicalization.
