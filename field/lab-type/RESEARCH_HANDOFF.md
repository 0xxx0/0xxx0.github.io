# LAB/TYPE · PROOF 001

**Class:** bounded specimen / typography routing proof  
**Authority:** NONE; projection/generator only  
**Source of truth:** local glyph recipes in `core.mjs`  
**Purpose:** collapse the labyrinth/space-filling typography thread into one falsifiable implementation.

## Question

For a fixed diagnostic glyph construction, how much orthogonal geometric variation remains before recognition requires manual rescue?

This specimen deliberately does **not** solve Unicode shaping, CJK/Tamil construction, Spectre tiling, PCB routing, moiré, folding, or font compilation. Those are downstream tests only if this simpler proof earns them.

## Corpus

`A B C H I M O R S 0 1 8`

Chosen for apertures, counters, junctions, symmetry, diagonals, minimal forms and confusables.

## Operator

`routeVariant()` normalizes each source stroke to an orthogonal lattice and introduces deterministic bounded jogs. Parameters:

- `seed`
- `density`
- `bendCost`
- `amplitude`

Every stochastic choice is seeded. Same source + parameters + seed must reproduce byte-identical path geometry.

## Evidence

`selftest.mjs` proves for seeds 1..64 over all 12 glyphs:

- deterministic generation;
- stroke endpoint preservation;
- orthogonal-only output;
- lattice bounds;
- non-zero design variation;
- no exact cross-glyph geometry collision.

The browser proof surface renders variants at actual small display size and reports exact duplicate geometry per glyph. This follows FIELD's existing rule: test what is actually projected, not merely metadata labels.

## Stop condition

Stop this branch rather than adding more architecture if any of the following becomes true:

1. recognizable outputs need per-variant manual redraw;
2. distinct source glyphs repeatedly collapse to indistinguishable rendered forms;
3. useful diversity disappears once recognition constraints are enforced;
4. the next font-compilation slice cannot consume generated geometry without redesigning the generator.

## Next slice — only if proof 001 survives

1. convert selected generated strokes to closed outlines;
2. compile the 12 glyphs into a deliberately incomplete installable TTF;
3. test OS/browser/graphics-app typing;
4. compare independent glyph placement with one globally routed short phrase;
5. only then test one exotic substrate or fabrication adapter.

## Non-goals

No new FIELD authority/state surface. No universal glyph ontology. No claim that this orthogonal profile generalizes across scripts. No Spectre/moiré/physics language until a concrete operator demonstrably benefits from it.
