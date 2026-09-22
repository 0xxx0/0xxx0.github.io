# FIELD surface boundary — Hermes / agents

Status: coordination note, 2026-09-22.

## Purpose

The FIELD root is a human re-entry projection, not the coordination authority.

Its top line has three verbs only:

- **NOW → /control/** — what currently has bounded execution attention.
- **RECOVER → /recovery/** — exact source, lineage, donors, and prior artifacts. Root RECOVER stays generic; it must not point at whichever project happens to be a current head.
- **CONVERGE → /nexus/** — coordination, transfer, and RETURN.

The line should remain one line at rest. Expanded copy may explain the verbs, but should not become another dashboard.

## Convergence projection

The generated CONVERGENCE strip is also collapsed at rest. Its summary exposes only:

- live fronts,
- current heads,
- open gaps,
- generation time.

Expanded state may show commits, branches, named fronts, gaps, and transfer links. These are evidence/state signals, not priority scores.

`scripts/generate-convergence-strip.mjs` owns the generated block. Do not hand-edit the block in `index.html`.

## Hermes boundary

Hermes/persistent agents should coordinate through canonical state and receipts under:

- `/control/CURRENT.json`
- `/control/QUEUE.json`
- `/nexus/`
- `/control/confluence/`
- `/returns/`

Do not grow the FIELD root into an ambient agent dashboard. If Hermes gains a persistent coordination mechanism, implement it behind NEXUS / CONFLUENCE first. Surface a signal back to FIELD only when it changes a human decision or re-entry action.

The root answers: **where do I re-enter?**
NEXUS / CONFLUENCE answers: **how are actors and state being coordinated?**
RETURN answers: **what actually changed, and what evidence came back?**
