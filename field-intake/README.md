# POLY // FIELD INTAKE 0.5

FIELD INTAKE is an offline-first ingress membrane for Atlas/Workfield-style canonical state.

It is deliberately **not** another planner. It solves the boundary problem:

`compressed capture → typed candidate → explicit resolution → canonical mutation → receipt → rollback/replay`

## Live semantics

Supported record kinds: `task`, `anchor`, `observation`, `claim`, `measurement`.

Capture tokens include `~20m` duration, `@phone` context, `#tag`, `11:00-15:00` windows, `>20:30` earliest, `<17:00` latest, `!5` value, `^2` setup cost, `?0.7` claim confidence, `at:11:10` observation time, `ref:<stable-id>` evidence links, `id:<stable-id>` edit identity, and `// note`.

Prefix a line with `[task]`, `[obs]`, `[claim]`, `[measure]`, or use `=` for anchors.

## Visible evolution

- REVIEW and CONFLICT resolve as KEEP BOTH / REPLACE / REJECT rather than merely showing warnings.
- Replacement receipts retain exact before-images; rollback restores prior canonical records.
- Canonical records use **EDIT VIA GATE** so edits cross the same trust boundary as new input.
- TRACE exposes `source → token evidence → analysis → resolution` plus canonical/proposed diffs.
- `ref:` creates explicit evidence links; missing references trigger review.
- Stable records expose receipt/event lineage and copyable IDs.
- Quick capture + the larger inbox persist locally.
- HUMAN PORT object handoff enters as ordinary review candidates and cannot bypass analysis, resolution or APPLY.
- The interface is installable/offline after first successful load; no backend, account, CDN, or build step is required.
- Replay reconstructs fresh candidates and re-analyses current state rather than blindly reapplying history.

## Public release boundary

A canonical record can expose **PUBLIC RELEASE** from the STATE ledger.

`canonical record → reduced public projection → editable local review → optional GitHub issue draft`

The projection deliberately excludes raw capture, notes, parser evidence and undeclared fields by default. Opening the review and copying the packet are local-only. **OPEN GITHUB DRAFT** is the first external boundary: it places the edited packet in a GitHub issue-draft URL, but does not create an issue or authorize downstream action. The operator still reviews and submits on GitHub.

This seam creates no sender, credential store, queue, planner or effect authority.

## Trust laws

1. Parsers propose; gates authorize.
2. Compressed syntax is disposable input, not ontology.
3. Canonical edits pass through the same membrane as new records.
4. Replacement preserves the before-image.
5. Replay re-analyses current reality.
6. References are explicit; visual proximity is never evidence.
7. Public projection is narrower than canonical state; release remains explicit and reviewable.

## Validation

The existing five protocol tests cover mixed typed capture, explicit replace + rollback restoration, stable-identity edit-through-gate, stale-patch rejection/NOOP, and rollback replay. `tools/field-intake-public-release-selftest.mjs` additionally pins the public projection allow-list and `DRAFT_ONLY / NONE_UNTIL_OPERATOR_SUBMITS` authority boundary. JavaScript syntax/static resources remain subject to the repository release checks.

## Files

The browser release is split into small classic-script chunks (`core-*` and `app-*`) solely to keep the static artifact dependency-free and easy to publish. `public-release.js` is a pure packet compiler; `app-6.js` is its UI adapter. The release remains one semantic application/state model.
