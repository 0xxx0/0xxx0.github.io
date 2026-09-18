# POLY // FIELD INTAKE 0.4

FIELD INTAKE is an offline-first ingress membrane for Atlas/Workfield-style canonical state.

It is deliberately **not** another planner. It solves the boundary problem:

`compressed capture → typed candidate → explicit resolution → canonical mutation → receipt → rollback/replay`

## Live semantics

Supported record kinds: `task`, `anchor`, `observation`, `claim`, `measurement`.

Capture tokens include `~20m` duration, `@phone` context, `#tag`, `11:00-15:00` windows, `>20:30` earliest, `<17:00` latest, `!5` value, `^2` setup cost, `?0.7` claim confidence, `at:11:10` observation time, `ref:<stable-id>` evidence links, `id:<stable-id>` edit identity, and `// note`.

Prefix a line with `[task]`, `[obs]`, `[claim]`, `[measure]`, or use `=` for anchors.

## Visible evolution from 0.3

- REVIEW and CONFLICT now resolve as KEEP BOTH / REPLACE / REJECT rather than merely showing warnings.
- Replacement receipts retain exact before-images; rollback restores prior canonical records.
- Canonical records use **EDIT VIA GATE** so edits cross the same trust boundary as new input.
- TRACE exposes `source → token evidence → analysis → resolution` plus canonical/proposed diffs.
- `ref:` creates explicit evidence links; missing references trigger review.
- Stable records expose receipt/event lineage and copyable IDs.
- Quick capture + the larger inbox persist locally.
- The interface is installable/offline after first successful load; no backend, account, CDN, or build step is required.
- Replay reconstructs fresh candidates and re-analyses current state rather than blindly reapplying history.

## Trust laws

1. Parsers propose; gates authorize.
2. Compressed syntax is disposable input, not ontology.
3. Canonical edits pass through the same membrane as new records.
4. Replacement preserves the before-image.
5. Replay re-analyses current reality.
6. References are explicit; visual proximity is never evidence.

## Validation

Before release, five protocol tests passed covering mixed typed capture, explicit replace + rollback restoration, stable-identity edit-through-gate, stale-patch rejection/NOOP, and rollback replay. Every JavaScript chunk passed `node --check`, and every static resource returned HTTP 200 from the exact Pages staging tree. See `release.json` for the release receipt.

## Files

The browser release is split into small classic-script chunks (`core-*` and `app-*`) solely to keep the static artifact dependency-free and easy to publish. The release remains one semantic application/state model.
