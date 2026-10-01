# RETURN — convergence loop: refreshed, and why it read dead

**Date:** 2026-09-30 · **By:** mahshroom · **Evidence class:** RECEIPT (what actually happened)

## What I did

Ran `scripts/generate-convergence-strip.mjs` by hand. Regenerated
`control/convergence-strip.json` + `control/convergence-plain.md`
(generated 2026-09-29T02:04Z → 2026-09-30T06:30Z). Both were already dirty on
`push-feature`; my regen supersedes the 09-29 copy.

## The empirical finding — the loop has no clock

- **Nothing schedules the generator.** Grepped every profile's `cron/jobs.json`:
  no job runs `generate-convergence-strip.mjs`. The only "convergence" job is the
  *archive* profile's Convergence Scout — analysis-only, no writes. The strip only
  moves when a human/session runs it, which is why it sat 36h stale.
- **The surface reads "0 commits today" every day, structurally.** The generator
  reads committed *master* chronology. All live work is uncommitted WIP on
  `push-feature` (8 commits ahead of master, latest 09-29). So the visible
  convergence surface shows an empty field while the tree is busy — the number is
  honest but its input is the wrong boundary.

## The one move

Land `push-feature` (or merge it), then put the generator on a clock. Until the
work is committed to master, no regeneration can show it.

**Gate:** pushing/merging is a shared-trunk mutation — needs operator go-ahead.
The scheduler add is a one-line cron edit once the branch lands.