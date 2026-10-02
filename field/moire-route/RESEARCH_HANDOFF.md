# MOIRÉ ROUTE / ALL MAPS ARE WRONG — RESEARCH HANDOFF

**Date:** 2026-10-02  
**Class:** EVIDENCE / bounded specimen  
**Host:** FIELD INDEX representation research; possible donor to Sleeper / Scale Lens / Atlas Dayline  
**Authority:** NONE outside this specimen

## Question

Can coordinate mismatch become visible interference, such that phase alignment exposes a continuous route more clearly than an unlabeled local adjacency view?

## Donor

Recovered visual-law lineage:
- `/recovery/naming/B260728B-visual-law-v0.1.json`
- B260728B seq 4: ISOMETRIC_LABYRINTH / route
- B260728B seq 5: TILTED_GATE / rotate the frame, not the world
- Sleeper field: ALL MAPS ARE WRONG

No donor image bytes are copied here.

## Hypothesis

A route encoded by a coherent local coordinate field will gain a usable next-edge cue when the global phase/orientation agrees with it. Coordinate disagreement should appear as interference/noise rather than as a decorative overlay.

## Baseline

Plain local adjacency:
- identical edge appearance;
- START and END visible;
- no route labels;
- local next choice has chance `1/N` among forward neighbors.

This is deliberately a **local perceptual baseline**, not a claim about graph algorithms. A graph search with full topology can of course solve the route.

## Specimen

`core.mjs`
- deterministic 6×6 fixture;
- one true route plus spurs;
- route nodes share one coordinate phase;
- off-route nodes carry deterministic phase/orientation offsets;
- cue strength is generated from phase + orientation agreement.

`index.html`
- moiré field: no route line by default;
- plain adjacency: equal-looking edges;
- phase/orientation controls;
- BEST/WORST phase;
- optional ground-truth reveal.

## Metrics

1. **Local route-choice accuracy** — at each forward step, does the strongest interference cue point to the true next edge?
2. **Plain adjacency chance** — mean `1/N` under identical-looking local choices.
3. **Continuity signal** — route coherence minus off-route coherence, with step smoothness.

## Falsifier

Hold/PARK the mechanism if:
- best phase fails to beat plain local adjacency chance;
- aligned vs opposite phase does not materially separate;
- the visual field requires explicit route strokes/labels to work.

## Verification

Run:

```
node field/moire-route/selftest.mjs
```

The selftest requires:
- aligned accuracy ≥ 0.85;
- aligned advantage over adjacency chance ≥ 0.20;
- aligned advantage over opposite phase ≥ 0.30;
- continuity separation ≥ 0.18.

## Boundary

This is **architectural proxy evidence only**.

It does not establish:
- superior human route-finding;
- superior navigation to a normal map;
- value as a current product surface.

A human comparison is justified only after the mechanism survives machine checks and is transplanted into one real host task.

## Transfer if it survives

1. **Sleeper / ALL MAPS ARE WRONG** — phase alignment reveals one lawful route through a scrambled projection.
2. **Scale Lens / Ministry Ridge** — interference encodes disagreement between two coordinate systems.
3. **Atlas Dayline** — only if there is a real pair of temporal/reference coordinates whose mismatch matters.

Do not use moiré as wallpaper.
