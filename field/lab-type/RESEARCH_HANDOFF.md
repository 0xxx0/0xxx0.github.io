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

## 2026-10-18 continuation — recognition before compilation

**Decision:** the smallest next proof is rendered recognition, not another generator.
Baseline `619314e5480d40f91b33aa3a199305e16b736fff` reproduces the claimed
439 unique deterministic geometries. Exact path inequality does not establish
perceptual distinction. No human recognition or installation result is recorded.

Run `node field/lab-type/selftest.mjs`, serve the repository with
`python3 -m http.server 8766`, then open
`http://localhost:8766/field/lab-type/` → TEST RECOGNITION → BEGIN.
The existing surface now presents 36 shuffled, unlabelled glyphs: all 12 normalized
sources plus generated seeds 1 and 2, at 32 CSS pixels, density .65, bendCost 1.2,
amplitude 1. Responses and milliseconds remain local until explicitly exported;
no answer feedback appears before completion. The source/variant condition is
hidden from the display, not secured against code inspection.

### Files and exact invariants

| File | Responsibility |
|---|---|
| `core.mjs` | Unmodified generator and source recipes; geometry authority for this donor only |
| `recognition.mjs` | Deterministic balanced trial and explicit decision rule |
| `recognition-ui.mjs` | Render, keyboard/select response, export actual observations |
| `index.html` | Existing donor host; no manifest registration |
| `selftest.mjs` | Existing geometry proof plus incomplete/invalid evidence and repeated-confusion controls |

An exported `lab-type/recognition-001` receipt retains each expected glyph,
profile, seed, geometry signature, response, time, session order, viewport and
fixed parameters. It is observational evidence from one reader/device, never a
population legibility result or font certificate. Automated synthetic responses
test mechanics only; do not file them as reader observations.

**Predeclared engineering screen (chosen here, not a research-derived threshold):**
12/12 sources correct, at least 23/24 variants correct, and no repeated directed
confusion pair. Otherwise STOP_OR_REDUCE. Do not rescue a failed result by
redrawing individual variants or relaxing the threshold after seeing results.
If the source fails, fix or park its orthogonal construction before expanding.
If variants fail, reduce density and make a separately identified run; preserve
failed receipts. These seeds and this size do not validate all 439 variants.

### Conditional outline/TTF proof — specified, not yet implemented

Only a real passing recognition receipt opens this gate. Select one correctly
identified seed per glyph, preferring seed 1 when both succeed. Export its current
JSON/SVG from this host. Proposed files, all under `field/lab-type/font-proof/`:
`selection.json`, `build.py`, generated `lab-type-12.ttf`, `specimen.html`, and
`evidence.json`. Do not add these placeholders before the gate opens.

1. Consume the exact selected strokes; expand width 1.05 grid units with square
   caps/miter joins, union overlaps into closed contours, preserve counters.
   Do not redesign `routeVariant()`. Use existing FontTools/standard outline
   tooling as build-only dependencies; no custom font compiler or runtime stack.
2. Fixed proof metrics: 1000 UPM, advance 650, ascent 800, descent -200;
   `x_font = 50*x + 50`, `y_font = 750 - 50*y`. These are proposed constants,
   not measured typography. Map only `A B C H I M O R S 0 1 8`, plus space and
   `.notdef`. All other input must visibly report unsupported characters.
3. Reopen the generated TTF and prove exact cmap, nonempty diagnostic contours,
   finite integral coordinates, bounds within advance/ascent/descent, no unintended
   filled counters, and repeatable geometry/table content. Raster-compare each
   glyph with its selected stroked SVG at matched 32/64/128 px; >1 pixel edge
   deviation at 128 px or a changed counter/connected component falsifies it.
4. Browser: await `FontFace.load()`, type the 12 supported characters, render
   without fallback, and compare the known unsupported `Z`. Separately record
   OS font install and a named graphics application's typing result, including
   app/OS versions and screenshot. Browser success cannot stand in for these.
5. Freeze the literal phrase `A ROOM 018`. Compare independent placement against
   one globally routed SVG using the same skeletons, advances, width and bounds.
   Log cross-glyph bridges and recognition separately; routed text must not alter
   character identities or be misrepresented as the installed TTF's behavior.

**Falsifier/stop:** any manual per-variant rescue, repeated rendered confusion,
outline conversion requiring generator redesign, counter collapse, fallback font,
or failed install stops expansion. No universal glyph ontology, exotic substrate,
new route or font-wide character coverage until these bounded proofs survive.

### Convergence and lineage

`#956` remains the LAB/TYPE donor. `#966` owns the existing INTERPHASE workbench.
`lib/interphase-glyph.js` remains FIELD's semantic identity renderer; LAB/TYPE's
letter skeletons are a distinct typography experiment. Do not substitute letter
shape for object identity or import a second provenance/state kernel. Byte-identical
source duplicates were not introduced; source and seed variants remain meaningful
fixtures. Font outputs are conditional derivatives, not replacements for recipes.

Primary outline reference:
https://learn.microsoft.com/en-us/typography/opentype/spec/glyf
The OpenType spec distinguishes contours, glyph IDs, cmap/metrics companions and
overlap handling; a stroked SVG alone does not establish an installable font.
