# The pattern — what `Desktop/d` actually was

*2026-09-25. Found by pattern-extraction after mcvoid said: "its more like lets pattern
extract we cant do it all that way obv but i think its all one thing."*

## The measurement

| | |
|---|---|
| `~/Desktop/d/macbeth ish` | **8,667 files · 65.9 GB** |
| consumable media (mp3/mp4/m4b/archives) | **57.6 GB — 87%** |
| mp3 alone | **47.96 GB / 3,364 files** (a music library) |
| coherent research cluster | **65 docs · 178 MB — 0.17%** |
| files matching his own work vocabulary | 69 |

## The verdict on the 66 GB

**It is not his work. It is an old machine's whole home directory** (`Documents/`,
`Downloads/`, `$Z01 = DO-OR/`, `un-BAK/`, `TMP/`) — carried onto the Desktop and never
opened again.

- **~87% is other people's content**: music, Jiu-Jitsu instructionals, audiobooks, installers.
- **~13% is personal documents**, of which the genuinely load-bearing part is the 65-doc cluster.
- **339 entries from this tree were already staged** in `delete/crushed-20260923`, and that
  staging pen is properly instrumented (`_MANIFEST.json`, `_REVERT.sh`, and a note reading
  *"QUARANTINE != DELETE. --revert puts it all back."* — plus 13 files recovered from overwrite).

**So the reclaim shape is: extract → relocate → stage.** Not delete. And the extract step is
now done.

## The cluster, and why it is the whole thing

Extracted (COPIED, source intact) to `~/void-anchor/AXIS/library/GLYPH-VIS-READING/`
— 65 documents + `_PROVENANCE.json`. Read against the axes of his actual build:

| the build | its seed in this cluster |
|---|---|
| field-glyph / Glyph Atlas / the instrument | *Systematising Glyph Design for Visualization* (32.6 MB) · *Glyph-based Visualization Foundations* · *Multi-Attribute Glyphs on Venn and Euler Diagrams* · *High Category Glyphs in Industry* · *FontCLIP* (CGF 2024) |
| the foveal / radial / aperture surface | *The Log-polar Image Representation in Pattern Recognition* · *A User-Centered Look at Glyph-Based Security* |
| field index, memory architecture, the atlas | *Handy Mnemonics: The Five-Fingered Memory Machine* · *Housing of Personal Memory in Prose* · *Future Memory: On Conservation* |
| poetry / grid / rule-based mapping tools | *POETRY DATAVIZ: Rule-based Visual Mappings with a Case Study* |
| the named operators, geometric abstractions | BRIDGES ×9 — *Thales' Theorem & Pythagorean Triples* · *Wallpaper Patterns with Voronoi Motifs* · *Closed Surface Envelopes* · *Composite Number Polyrhythms* · *Exploring Music as a Geometric Object* · *Viruses and Geometry* · *GEOMETRIC LAWS MOIRE* |
| **env0 — the physical make** | *Drill Jigs for Wooden Ball-and-Stick Models* · *Thales' Theorem, Pythagorean Triples and Geometric Art* |
| layering, comprehension, the learning loop | *Make It Stick* · *Pragmatic Thinking and Learning* · *Spacing-Effect Patterns in Learning* · *Short-term Plasticity in Auditory Cognition* · *Action Representation of Sound* |

**Zero of this is coincidental.** He gathered a research library on glyph systems,
log-polar vision, memory palaces, mathematical art, and the cognitive science of
retention — on an old machine, years ago — and is now building a system that needs
exactly those five things. The instrument, the field, the atlas, the make, the training
loop.

**"It's all one thing" is not a feeling. It's 0.17% of a junk dump.**

## What this implies

1. **The cluster is a source library, not an archive.** It should be *read*, indexed against
   the build's axes (as above), and mined for the specific mechanisms the build still lacks —
   log-polar mapping and glyph systematicity being the two most obviously un-mined.
2. **The remaining 65 GB is now a low-judgement decision**: 48 GB of music → relocate to
   external or a music library; instructionals/audiobooks → external; the rest → stage.
   The *thinking* is done; only the move remains.
3. **The general lesson, which is the reusable one**: in a large untriaged surface, the value
   is not distributed evenly and it is not proportional to size. **Search by vocabulary, not
   by walking.** 178 MB out of 65,900 MB carried the signal, and a byte-by-byte pass would
   have found it just as well but never finished.

## Provenance

- Source: `~/Desktop/d` — **unmodified**. `copy2` only; `stat` on the source tree is unchanged.
- Destination: `AXIS/library/GLYPH-VIS-READING/` — filenames encode the original path with
  `__` separators, so each file's origin is readable without the manifest.
- Machine-readable index: `AXIS/library/GLYPH-VIS-READING/_PROVENANCE.json`
- No file in this pass was moved, deleted, or modified. Reversal is `rm -rf` of the new
  directory — nothing else changed.
