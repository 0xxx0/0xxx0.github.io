# FOLD//BLOOM / Scale Lens Studio

Current public surface: `https://0xxx0.github.io/fold-bloom/`

## RC11 — Stable Address Navigator

The shared substrate is now treated as an addressed object graph under unequal projections.

Core invariant:

`OBJECT × SCALE × OPERATOR × PROJECTION → RESULT + RETURN RECEIPT`

Each canonical node carries:

- stable object id
- parent / child membership
- relation context
- provenance
- transform history
- projection and range addresses

Zoom and domain changes preserve the selected anchor.

### Data Disc structural ladder

`DATASET → TABLE → RECORD → ROW → FIELD → CELL`

Typed navigation also supports the compressed working path:

`TABLE ⇄ RECORD ⇄ FIELD ⇄ CELL`

### Parallel projection ladders

- TEXT: LETTER → WORD → PHRASE → SENTENCE → PARAGRAPH → SECTION → CHAPTER → BOOK → LIBRARY
- ATLAS: PULSE → TASK → ROUTE → SESSION → DAY → WEEK → PROJECT → PROGRAM → FEDERATION
- DAYLINE: MOMENT → ACTION → BLOCK → ARC → DAY → WEEK → CYCLE → SEASON → HISTORY
- DATADISC: CELL → FIELD → ROW → RECORD → TABLE → DATASET → CORPUS → WAREHOUSE → ECOSYSTEM
- OBJECT: TRACE → FEATURE → PART → COMPONENT → MODULE → ASSEMBLY → MACHINE → LINE → FLEET

These are typed correspondences, not literal equivalences. The stable anchor survives while the projection vocabulary changes.

### RC11 interaction additions

Scale Lens Studio now supports:

- breadcrumb ascent / descent through structural ancestry
- RISE / DIVE scope traversal
- previous / next sibling-group traversal
- jump by canonical id, projection address fragment, label, value, or JSON pointer
- clickable relation context
- source-window provenance preview
- copyable focus address + hash route
- same-anchor projection rail across TEXT / ATLAS / DAYLINE / DATADISC / OBJECT
- reversible navigation receipts through RETURN

### Schema-aware parsing inherited from RC10

JSON / CSV / text parsing produces inferred field types, typed canonical atoms, nested grouping, provenance, stable addresses, and reversible parse/zoom/project receipts.

### Release discipline

Keep the ordinary representation available as an ablation. Promote a strange projection only when it improves comprehension, manipulation, evidence, or return.
