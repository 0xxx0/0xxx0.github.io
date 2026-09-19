# LACONIC / ICONIC RECOVERY 0.1

## JOB

Recover the response-bank lineage as a usable drafting instrument without fabricating history.

Loop:

`SITUATION → MOVE → VOICE/LENS → CANDIDATE → HUMAN REVIEW → HUMAN PORT → RETURN`

This route never sends. It prepares and curates drafts. HUMAN PORT owns the explicit share/copy boundary.

## PROVENANCE

- **EXACT** — verbatim recovered source with a source reference.
- **RECONSTRUCTED** — faithful reconstruction where exact wording is unavailable.
- **NEW** — created after recovery; never represented as historical.

The starter `bank.json` intentionally contains only **NEW** seed lines because the exact historical v0.01 artifact has not yet been recovered into the repository.

## RECOVERY / CLIPBOARD

Use the RECOVER panel in `/laconic/`:

1. paste source text;
2. choose source class (defaults to UNCLASSIFIED);
3. optionally add a source ref;
4. export/copy a source pack;
5. reconcile each item into `bank.json` only after provenance is known.

Do not silently overwrite NEW lines with recovered lines. Preserve both until dedup is explicit.

## CURATION

Browser-local KEEP / DROP judgments are stored under:

`laconic.iconic.verdicts.v01`

They are local evidence, not canonical repo state. Promote winners into the bank only with a source/decision receipt.

## BOUNDARIES

- no network submission;
- no hidden backend;
- no auto-send;
- no private correspondence in the public repository;
- no claim that NEW seed lines are recovered historical material.

## INTEROP

- HUMAN PORT: `/contact/?draft=<encoded text>&mode=REPLY`
- Router action: `DRAFT`
- Policy gate: `draft`
- Release receipt: `/laconic/release.json`
