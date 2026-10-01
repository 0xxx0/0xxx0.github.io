# RETURN — convergence landing: the private trunk vs the public surface

**Date:** 2026-10-01 · **By:** mahshroom · **Evidence class:** RECEIPT (what actually happened)

## What was asked

"Fix repo/s — make sure past work is reflected… keep the repo convergent and visible."

## What was found (the correction)

- **`~/void-anchor` is NOT the publish path.** Its push URL is a sentinel
  (`DISABLED-void-anchor-is-the-private-trunk-do-not-publish`), it tracks 41 private
  paths (`AXIS/`, `delete/`), and its `push-feature` branch is **1097 commits behind**
  `origin/master`.
- **The live public surface is a separate clone:** `~/Projects/0xxx0.github.io`
  (branch `master`, in sync with `origin/master`, push enabled, 0 private paths).
- **An earlier chat figure was wrong.** "push-feature is 15 ahead of master" compared
  against void-anchor's *stale local* `master` (last moved 2026-09-26). Against the real
  trunk the branch is **49 ahead / 1097 behind**, and it is **not pushable**: the
  pre-push leak guard refuses it (41 private paths in its tree).

## What was landed here (public-safe, purely additive)

Absent from `origin/master` before this commit:

- `returns/CONVERGENCE_LOOP_OPEN_2026-09-30.md`
- `returns/SHARE-FUSE-STREAK-RETURN-2026-09-29.md`
- `wiki/artifacts/trophy-2026-09-29-nexus-board-stderr-leak.md`
- `wiki/artifacts/trophy-2026-09-29-swarm-cleanup-gate.md`

## Note that narrows the 09-30 finding

The public convergence strip is **already regenerated on the trunk** (commit
`fa791e11`, 2026-10-01T03:26Z — "9 material commits on 2026-10-01"). So the loop runs on
the public side. The "the loop has no clock" finding in `CONVERGENCE_LOOP_OPEN` was
measured on the **private trunk's stale copy** and does **not** hold for the public surface.

## The residual gap

The private trunk (`~/void-anchor`) holds substrate work that never crosses to the public
surface. That is by design (it is private), but the *public-safe* subset of it — returns,
control surfaces, lib/ — has no automatic export path; a session must hand-carry it, as here.