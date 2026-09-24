# INTERPHASE / CONFLUENCE SUCCESSOR HANDOFF

Status: **ACTIVE HANDOFF**
Updated: **2026-09-24**

This file is a re-entry aid, not canonical truth. If it disagrees with exact code, receipts, CURRENT, or recovered source, recover the exact artifact and preserve the disagreement.

Machine packet: `/control/INTERPHASE_SUCCESSOR.json`

## One-paragraph state

The collaboration has converged on **INTERPHASE as a shared interaction protocol, not a universal app**. Domain objects stay where they already live. A semantic correspondence layer maps host objects to stable facets/roles; projections then allocate those facets differently by scale (ordinary page, line, table, ring, flower, ROOM, glyph, RSVP, etc.). Single focus and multifocus are shared attention state. Actual changes remain typed host operations behind support/authority boundaries. RETURN restores the caller/context without erasing committed host changes. Recovery archaeology now emits addressed evidence packets rather than prose-only summaries.

The shortest law is:

```
CORRESPOND != PROJECT != OPERATE
```

## Why this matters

A semantic object is not tied to a screen position.

Example:

```
form.email -> FOCUS_INPUT
```

may lawfully appear as:

```
LINE compact     -> inline editable cell
TABLE working    -> row/value cell
FLOWER expanded  -> focus sector
ROOM room        -> left wall
PHYSICAL         -> addressed left control panel, only with measured binding
```

Identity and semantic role survive. Placement changes.

The same recursion works upward: a field is a cell; a form can itself become one panel; a workflow can become one glyph; the children remain addressable even when compressed.

## Current implementation

Read in this order:

1. `/control/CURRENT.json`
2. `/control/INTERPHASE_SUCCESSOR.json`
3. `/control/INTERPHASE_CORRESPONDENCE_REGISTRY.json`
4. `/control/INTERPHASE_MAPPING_CONTRACT.json`
5. `/lib/interphase-core.js`
6. relevant host adapter / exact domain implementation

Current shared pieces:

- core: `/lib/interphase-core.js`
- correspondence helper: `/lib/interphase-mapping.js`
- generic DOM: `/lib/interphase-dom.js`
- browser extension: `/manifest.json` + `/interphase-extension.js`
- FIELD adapter: `/lib/interphase-field.js`
- READFIELD adapter: `/lib/interphase-readfield.js`
- Scale Lens adapter: `/lib/interphase-lens.js`
- LISTEN adapter: `/lib/interphase-listen.js`
- recovery packet adapter: `/lib/interphase-recovery.js`

## Latest mechanisms after mapping 0.1

### Shared glyph/ring grammar

Commit `8217a320…`.

Fold/Bloom, LISTEN and generic DOM now share a stateless glyph grammar rather than each drawing identity witnesses differently.

### Shared cyclic ring kernel

Commit `30655e76…`.

The addressed cyclic carrier used by INTERPHASE glyphs, Two Dial relation mechanics and Ecology gate/ratchet geometry has been extracted. This is a reusable carrier, not a new ontology.

### Unified RIDE dual-clock state

Commit `30705a04…`.

RIDE now has one state/address contract for single-source and set traversal:

```
sourceId
sourceTime
journeyTime
journeyDuration
layers
seam
focus
projection
LISTEN context
LIVE state
RETURN
```

CUT / DISSOLVE / CARRY / RESET / RETURN remain explicit seam laws.

That convergence is now implemented in merged PR #200: SET's primary RIDE action enters LIVE through the unified dual-clock state, exact child source identity is preserved, CUT / CARRY / RESET / DISSOLVE / RETURN are explicit, and Journey remains a secondary traversal/debug witness. The next Fold/Bloom gate is direct 2–3-source phone use, which is WAITING_ON_HUMAN rather than an autonomous implementation target.

## Fold/Bloom current reading

Do not merge all of Fold/Bloom into one engine.

Keep three unequal jobs:

```
SOURCE / CARTOGRAPH
  exact refs + LISTEN + Atlas

COMPOSE
  SET order/weight/seams + Two Dial/operator relations

RIDE / EMBODY
  LIVE + Journey seam/traversal laws + unified RIDE state
```

The root `/fold-bloom/` is one INTERPHASE doorway over those jobs.

## Higher theory in practical terms

### Correspondence

```
host object -> semantic facet
```

Example: an input becomes `FOCUS_INPUT`.

### Projection

```
semantic facet -> visible allocation
```

Example: `FOCUS_INPUT -> left wall` in ROOM.

### Operation

```
canonical state -> changed canonical state
```

Example: editing the native input value.

For an operation claimed equivalent through a view, require the operation square to commute:

```
        canonical op
HOST ----------------> HOST'
 |                      |
 | project              | project
 v                      v
VIEW ---- view op ----> VIEW'
```

If the two paths disagree, classify the failure. Do not add hidden sync state.

## Backup archaeology

Recovery is the first formal migration.

Workers follow:

`/control/confluence/BACKUP_ARCHAEOLOGY_INTERPHASE_WORKER_2026-09-23.md`

Output schema:

`0xxx0/interphase-recovery-packet/v0.1`

A useful packet preserves:

- exact artifacts/refs/hashes;
- source/user claims distinct from assistant summaries/inference;
- hierarchy and relations;
- conflicts and supersession;
- UNKNOWN;
- anti-merge holds;
- mechanisms and operations;
- authority/effect boundaries;
- observed projections;
- unique residue;
- exact return paths.

Recovery workers may suggest semantic correspondence after recovery. They must not assign interface geometry, redesign artifacts, or promote/delete them.

## Physical MAKE

The convergence appears useful above the material-truth boundary.

Possible mappings:

```
part/feature       -> address
assembly           -> hierarchy
mates/routes       -> typed relation
dial/slide/fold    -> controller/operation
measurement/sensor -> witness
cut/drill/energize -> explicit effect
home mark/index    -> RETURN witness
```

AXIAL, Two Dial, fan, annulus, cylinder, cube/net, cassette/rail, peg frame and printed glyphs may become physical projections/controllers.

But real dimensions/tolerances/topology/load/fit/safety remain physical host truth.

## Next transformations

### WAITING_ON_HUMAN — Fold/Bloom lived SET -> LIVE gate

Technical fusion is complete in PR #200. Validate 2–3 real local sources on phone across CUT / DISSOLVE / CARRY / RESET / RETURN, preserving exact source identity, sourceTime, journeyTime and bounded RETURN evidence. Do not spend autonomous implementation budget on this gate unless use exposes a concrete defect.

### 1. Real-form scale proof

Run a real normal webpage/form through page -> compact -> ROOM allocation. Native control remains canonical.

### 2. Produce real archaeology packets

Parallelize recovery by evidence role, then join only on stable keys when the packet removes a live blocker or feeds an active conversion.

### 3. Physical host v0

Choose one actual MAKE object and describe measured state + operations + correspondence before any actuation.

## Stop / refusal rules

- no new universal shell;
- no duplicate canonical store;
- no geometry-as-ontology;
- no authority escalation through views;
- no silent merge during archaeology;
- no donor deletion before unique residue transfers;
- no physical claim from rendering alone;
- no feature work solely to make the convergence diagram look complete.

## Session starters

See:

`/control/confluence/INTERPHASE_SESSION_STARTERS_2026-09-23.md`
