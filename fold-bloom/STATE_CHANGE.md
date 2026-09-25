# FOLD//BLOOM STATE / CHANGE LANGUAGE 0.1

Status: **ACTIVE CANDIDATE**

This is a compact notation for six binary state dimensions and exact change between them. It borrows the Yijing's formal six-line / trigram grammar as a readable projection, but it is usable without traditional interpretation or divination.

## Core token

```
H[010|100] Δ{3,5} → H[011|110]
```

Read it as:

- `H[010|100]` — six binary lines, written **bottom → top**
- `|` — lower three-line group | upper three-line group
- `Δ{3,5}` — only lines 3 and 5 changed
- `→ H[011|110]` — resulting state

The machine authority is the six bits + changed positions. Trigram glyphs/names are an optional human-readable lens.

## Visual projection

For any six-bit state:

- `1` = solid line `━━━`
- `0` = broken line `━ ━`
- lines 1–3 resolve the lower trigram
- lines 4–6 resolve the upper trigram
- changed lines may be highlighted without changing the underlying state token

Examples:

```
010|100 = lower ☵ KAN / upper ☳ ZHEN
011|110 = lower ☴ XUN / upper ☱ DUI
```

## Fold//Bloom adapter

PLAY uses one deliberately local mapping:

```
BLOOM / FOLD   → 1 / solid / continuity-building
SPLIT / RETURN → 0 / broken / branch-or-recur
```

This is **not** asserted as traditional Yijing meaning. It is the bridge from LIVE topology into the shared state grammar.

## Current enacted surfaces

### LIVE / PUZZLE
A six-release puzzle constructs a reachable target state. Each release writes one line.

### FIELD LAB / DATA
Two arbitrary six-line states can be entered as BEFORE / AFTER. The visual field renders both, connects changed lines, and lets the user tap a line in the AFTER state to flip it. The exact state-change token can be copied.

### RETURN
PLAY exports may carry `stateLanguage` with target, authored state and exact delta.

## Candidate projections — not yet claims

The same neutral grammar is potentially useful when an object truly has six binary dimensions:

- agent / collaboration handoff: compact before→after state receipts
- Visual Field: a state can be projected as line geometry, delta paths, or moving apertures
- Verse / poetry: six addressed line/cell conditions with exact changed positions
- FAN/8 / physical controls: state/delta could be printed or mechanically represented if a real six-condition use appears
- House / sensing: only where six explicit thresholded conditions are meaningful; do not force arbitrary devices into six bits
- Ecology: genotype/phenotype-style inheritance experiments can use the state token when exactly six inherited conditions are chosen
- Two Dial: relation output may select or constrain a state transition, but should not be collapsed into the same ontology

## Coordination use

When useful, human or agent messages may include a compact state line:

```
STATE H[010|100]
Δ{3,5}
→ H[011|110]
```

This is evidence-friendly because the changed positions are explicit and reversible. It should supplement, not replace, domain-specific facts.

## Boundary

A six-bit projection is a lens. The underlying object remains authoritative. Do not compress a richer state merely to make it fit this notation.
