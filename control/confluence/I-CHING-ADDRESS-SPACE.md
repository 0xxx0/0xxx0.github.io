# I-CHING ADDRESS SPACE — 64 hexagrams as field index objects

**Spec for /iching/ surface at 0xxx0.github.io**

## Architecture

Each hexagram is a field index object with:
- **ADDRESS:** hexagram number (1–64) + binary (䷀–䷿)
- **STATE:** current hexagram (the reading)
- **LINES:** 6 lines, each yin (⚋) or yang (⚊)
- **CHANGING LINES:** moving lines → TRANSFORM to a new hexagram
- **NUCLEAR:** the inner hexagram (lines 2–5)
- **RETURN:** judgment, image, line text

## The 64 as a bounded vocabulary

The trigrams are the base layer (8 × 8 = 64):

```
☰ QIAN / HEAVEN (111)   ☷ KUN / EARTH (000)
☳ ZHEN / THUNDER (100)   ☵ KAN / WATER (010)
☶ GEN / MOUNTAIN (001)   ☲ LI / FIRE (101)
☴ XUN / WIND (110)       ☱ DUI / LAKE (011)
```

Each hexagram = lower trigram × upper trigram.
King Wen sequence orders them by narrative, not by binary.

## Data model (for the field index)

```
hexagram: {
  id: 1–64,
  binary: "111111" — "000000",
  unicode: "䷀" — "䷿",
  name_zh: "乾" — "未濟",
  name_en: "Creative" — "Before Completion",
  judgment: "元亨利貞",
  image: "天行健，君子以自強不息",
  lines: [
    { position: 1, text: "潛龍勿用", changing_to: null },
    ...
  ],
  nuclear_id: null,  // derived hexagram from lines 2–5
  sequence_relation: null,  // next/previous in King Wen
}
```

## Implementation

This will be a static JSON manifest at `/iching/hexagrams.json` (generated from canonical text), consumed by a lightweight field index surface that:

1. Loads the 64 as addressed objects
2. Accepts a random-cast operation (6 simulated coin tosses → binary hexagram)
3. Shows the hexagram, its judgment, image, and changing lines
4. On changing lines: computes the TRANSFORM hexagram (flip each changing line)
5. Shows the nuclear hexagram as an inner reading

The state transition IS the expiry mechanism: a static hexagram is a dead reading. Casting produces movement. Movement produces the next state. The next state has its own changing lines.

**First action:** generate the hexagrams.json manifest with all 64 entries.