# INGEST / RECOVERY SOLVED-PROBLEM RAID — 2026-09-21

Status: **decision support / no migration authorized**

Question: which current maintained tools already solve parts of our backup → recover → inspect → relate → RETURN substrate, and where should 0xxx0 stop building?

## Decision

Keep the current exact-hash + overlay + receipt architecture.

Do **not** replace it with one archive platform.

Use mature tools as bounded projections/workers around it:

| Tool | Solves | State | Use threshold | Boundary |
|---|---|---|---|---|
| **fclones** | fast duplicate grouping with optional cached hashes; supports SHA-256/BLAKE3 | EXTRACT / WATCH | repeated scans or corpus grows enough that shell hashing becomes materially slow | duplicate grouping only; our cryptographic hash/receipt remains identity authority |
| **Recoll** | local full-text search across many document/archive formats on macOS/Linux/Windows | TEST WHEN RETRIEVAL HURTS | repeated “find the old report/source” work dominates one-family review | retrieval projection only; result rank is not lineage/semantic identity |
| **Docling** | local conversion of PDF/DOCX/PPTX/HTML/images to Markdown/JSON/YAML/text/chunks | TEST AFTER EXACT SELECTION | selected authored docs need structured extraction/comparison | derived representation only; original bytes/hash remain canonical evidence |
| **DataLad + git-annex** | content-managed datasets + recorded command/provenance runs | WATCH | cross-machine/media datasets and reproducible transforms outgrow Git + current RETURN receipts | do not migrate simply for elegance; adopt only when current provenance costs exceed it |
| **TagSpaces** | local tags/descriptions with filename or sidecar metadata; no central cloud DB | DONOR / WATCH | portable human-facing tags become useful across tools | sidecars near source violate immutable-ingress default; use only on writable derived/library views |
| **Immich external libraries** | strong photo/video browsing over existing filesystem; can mount read-only | TEST FOR PRIVATE MEDIA VIEW | 2,437-image reservoir needs ongoing visual browse/review beyond contact sheets | projection only; external-library metadata can be path-sensitive and duplicate behavior is not global |
| **Paperless-ngx** | local document archive, OCR, searchable tags/types, original preservation + PDF/A | SPECIALIST / HOLD | scanning/admin paperwork becomes a distinct recurring domain | not a general code/HTML/artifact recovery substrate |

## Sources

- fclones: https://github.com/pkolaczk/fclones
- Recoll: https://recoll.org/
- Docling CLI: https://github.com/docling-project/docling/blob/main/docs/reference/cli.md
- DataLad run/provenance: https://docs.datalad.org/en/latest/generated/man/datalad-run.html
- TagSpaces docs: https://docs.tagspaces.org/
- Immich external libraries: https://docs.immich.app/features/libraries/
- Paperless-ngx: https://docs.paperless-ngx.com/

## What this deletes from our future work

### Do not build a general duplicate engine
Current scanner is adequate for bounded corpus. If repeated/scaled duplicate hashing becomes expensive, benchmark fclones with a cryptographic hash + cache first.

### Do not build a general desktop full-text search engine
Use Spotlight/Recoll before creating embeddings/search infrastructure. Exact provenance still gates promotion.

### Do not hand-write document parsers/OCR pipelines
When an exact selected source requires normalization, benchmark Docling locally and store the result as a derived projection linked to the source hash.

### Do not make FIELD a canonical media manager
For the private image reservoir, contact-sheet review remains simplest. If persistent browsing is needed, test Immich External Library read-only and treat its DB/metadata as disposable projection state.

### Do not adopt DataLad just because its provenance model resembles RETURN
Our current scale already has Git + exact hashes + receipts + bounded execution packets. Re-evaluate only when large-file location/version/provenance across machines becomes an observed burden.

## Architecture reinforced by external tools

The useful common split is:

```
SOURCE BYTES / HASHES          authority
        ↓
DERIVED INDEX / SEARCH         disposable retrieval
        ↓
ALIAS / FAMILY VIEW            semantic overlay
        ↓
INSPECT / CONVERT / BROWSE     projection
        ↓
HUMAN / BOUNDED AGENT REVIEW
        ↓
RETURN                         durable evidence
```

Do not make the retrieval/index/projection layer own source identity.

## Immediate consequence for issue #8

The one-family review now returns a **family view**, not a reorganized directory.

Use the exact locator first. If later content retrieval inside the verified 559-file source becomes tedious:
1. use native Spotlight/grep first;
2. TEST Recoll on that bounded source;
3. use Docling only on selected authored documents that require structured extraction;
4. never let either tool decide family identity.

## Private media consequence

The 2,437-image Sleeper/private reservoir is a good candidate for a read-only browse projection, but not bulk publication.

Cheapest progression:
1. source-hashed thumbnail/contact-sheet batches;
2. human reviewed keep/donor group;
3. only if repeated browsing becomes painful, test Immich External Library read-only;
4. promote selected originals through normal receipt/publication gate.

## Stop

No installs or migrations authorized by this note.

Tool adoption requires one observed bottleneck + one bounded test + a RETURN.
