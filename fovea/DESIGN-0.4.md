# FOVEA 0.4 — measured projection. Design note, 2026-10-20.

## The operator sent an image

Three panels. Panel one: a dense field of stars — *"Every dot is a star."* Panel two: a deep
field of galaxies — *"Every dot is a galaxy."* Panel three: clusters of clusters. Then: *"This is
sort of where im coming from with our work.. i mean the problem and solution in a sense."*

That is the whole design, and it is simultaneously a diagnosis of what is wrong with the current map.

**The image never draws two scales in the same panel.** Stars are in one picture, galaxies in
another, clusters in a third. The eye can hold each one because each one is at one resolution. The
cosmic scale problem is not solved by showing more — it is solved by **separating the panels**.

The current `fovea/index.html` does the opposite: it draws lanes, boxes, glyphs and a label for
every mark at one resolution, over 26 points that are a *subset* of a 193-route field. It looks
cluttered because it is mixing what should be separate panels, and because — this is the deeper
defect — **its positions are invented.**

## The actual defect: a figure that is seeded, not measured

Current layout code:

```js
var rng=mulberry32(42), pts=[];
LANES.forEach(function(L){var b=BOX[L],its=laneItems[L]||[];
  its.forEach(function(it){pts.push({it:it,x:b[0]+20+rng()*(b[2]-40),y:b[1]+30+rng()*(b[3]-46)});});});
```

Positions come from a seeded PRNG. Nothing about a route's x/y says anything about the route. And
`fovea-lens.js` — the instrument sitting right beside it — states the law in its first screenful:

> **THE SIGNAL IS MEASURED, NOT SEEDED.** … a hash may ORIENT a figure, never INVENT one.

So the map violates the law its own sibling enforces. **A figure whose coordinates mean nothing is
noise, and noise reads as clutter however carefully it is drawn.** That is why it looked bad. It is
not an aesthetic problem.

Same defect family as the ones we have already had to name:
- a timestamp that does not print its own age → reads "now" while being history
- a check that cannot fail → decoration
- a memory that only grows → a liability

All four are one bug: **a surface that carries no measurement is a claim about nothing.**

There is a second, quieter violation in the same file. The subtitle says *"nothing filtered"* while
`DATA` holds **26** entries against a manifest of **193**. The map is filtered while asserting it is
not. (Measured 2026-10-20: `python3` read of `showcase-manifest.json` → `len(d['routes']) == 193`.)

## The law, derived

1. **One panel = one scale. Never mixed.** Stars, galaxies, clusters are three panels, not one.
2. **Every coordinate is a measurement.** A mark's position, size and brightness must each reduce to
   a real field of the real object. If you cannot name the field, do not draw the dimension.
3. **Resolution is earned by attention, not by proximity.** The root is low-resolution on purpose.
   Foveating raises it. That is not filtering — it is what a fovea is.
4. **Nothing is hidden.** All 193 routes are in the first panel. "Nothing filtered" becomes true.

This is the same shape as the human eye (`fovea-lens.js` already borrows it), the same shape as a
mandala (one ring at a time, each ring one scale, the eye travelling outward), and the same shape as
the cosmic image.

## The measured projection (what 0.4 actually draws)

Source: `showcase-manifest.json`, read live. **No second store, no hardcoded list.** The manifest is
the address book — the old `DATA` array was a duplicated representation of it, and it had drifted to
26 of 193.

| dimension | drawn as | measured from | real distribution (2026-10-20) |
|---|---|---|---|
| ring | radius | `parent` depth | 63 at depth 0 · 90 at 1 · 39 at 2 · 1 at 3 |
| constellation | angular sector | `family` | ~50 families; FOLD//BLOOM 17, HUMAN PORT 13, FOUNDRY 9, WITNESS 9, LAW ZOO 8, SLEEPER 8 … |
| brightness | alpha / glow | `index.updated_at` recency | all 193 have it; span 2026-10-06 → 2026-10-08 |
| size | radius | child count (real, counted from `parent`) | 0–12 |
| glyph | ○ □ — | `state` | ACTIVE 50 · UTILITY 43 · CANDIDATE 35 · FROZEN_DONOR 35 · STABLE 17 · DONOR 6 · other 7 |
| jitter within sector | small offset | hash of `href` — **orients, does not invent** | lawful per `fovea-lens.js` |

The only seeded quantity left is the within-sector jitter, and it is exactly the case the law
permits: a hash that *orients* marks inside a measured structure without creating that structure.

## Panels

- **STARS** — the root. 193 points of light. No labels at rest. A sky. You see the *shape* of the
  field: where the mass is, which constellations are alive, what is parked.
- **GALAXIES** — foveate or hold a mark. That one route resolves: title, family, state, depth,
  children, recency, its own next move. The second panel, at the second scale.
- **CLUSTERS** — OPEN hands off to the native route. Never a second rendering.

## What is preserved

- Projection-only. No mutation authority, no priority, no second store.
- `○ running · □ waiting · — parked` legend.
- The manifest is the address book.
- OPEN hands off to native routes.

## Open

The third panel (constellation → its members as a sub-field) is designed but not built. The hardware
/ sensor layer has no route yet — see the day's task list.
