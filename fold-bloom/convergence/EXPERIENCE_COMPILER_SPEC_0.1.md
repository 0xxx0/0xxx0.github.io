# FOLD//BLOOM — PRODUCT / IMPLEMENTATION SPEC
## EXPERIENCE COMPILER 0.1

**Date:** 2026-09-22  
**Status:** proposed next implementation contract built on LIVE 0.12 / LISTEN 0.6 / ATLAS 0.2.

---

# 1. Product statement

FOLD//BLOOM is a local-first **experience compiler for addressed linear sources**.

It lets a human take one source or a bounded set of sources and:

- identify it;
- inspect it;
- annotate it;
- calibrate how it should be experienced;
- traverse it;
- compose a journey through it;
- return/share that journey without losing source provenance.

The first production-quality public vocabulary is:

- **RIDE**
- **SEE**
- **SHAPE**

---

# 2. Primary use cases

## MUSIC

- load song / album / local set;
- inspect map/glyph;
- tune world/profile;
- ride;
- annotate landmarks;
- curate a set;
- share a return.

## PODCAST / TALK

- load episode audio;
- bind transcript / chapters;
- inspect rhetorical/time structure;
- pin quotes;
- traverse;
- move between audio and reading at the same source position.

## DOCUMENT / READING

- canonical text source;
- hierarchy = section / paragraph / sentence / phrase;
- READFIELD owns reading;
- Fold/Bloom may project rhetorical density / novelty / emphasis as environment;
- no audio metaphors required.

## PHOTO / MEMORY ROLL

- ordered image sequence;
- EXIF/time/caption/place as optional facets;
- clusters / recurrences / landmarks;
- traverse one trip/month/memory sequence;
- preserve original image identity.

## DAYLINE

- ordered events;
- optional sensor/message/media references;
- temporal clustering;
- navigate and annotate a day;
- no claim that inferred emotional state is ground truth.

---

# 3. Object model

## 3.1 SOURCE CELL

One exact source plus unequal facets.

```ts
type SourceCell = {
  schema: "fold-bloom-source-cell/v0.2"
  id: string
  exact: {
    hash?: string
    canonicalAddress?: string
    mediaType: string
    name: string
    size?: number
    duration?: number
  }
  origin?: {
    kind: string
    address?: string
    externalId?: string
  }
  display?: {
    title?: string
    artist?: string
    album?: string
    artwork?: string
  }
  text?: TextFacet[]
  collectionRefs?: string[]
  mapRef?: string
  profileRef?: string
  landmarkRef?: string
}
```

Identity is strongest at `exact`.

---

## 3.2 SOURCE MAP

Evidence derived from source.

```ts
type SourceMap = {
  schema: "fold-bloom-source-map/v0.1"
  sourceId: string
  duration?: number
  hierarchy: {
    macro: MapEvent[]
    section: MapEvent[]
    phrase: MapEvent[]
    pulse: MapEvent[]
  }
  featureFrames: FeatureFrame[]
  provenance: {
    analyzerVersion: string
    generatedAt: string
  }
}
```

Map events must be traceable to source time/address.

---

## 3.3 RIDE PROFILE

Human calibration. Never analysis truth.

```ts
type RideProfile = {
  schema: "fold-bloom-ride-profile/v0.1"
  sourceId?: string
  solidity: number
  immersion: number
  dropGain: number
  textOffset: number
  world?: "DEEP" | "TRANCE" | "WOOD" | "VOID" | string
  motion?: {
    opticGain?: number
    pitchGain?: number
    bankGain?: number
  }
}
```

Future profile expansion requires a named perceptual problem.

---

## 3.4 LANDMARK

Human-authored address.

```ts
type Landmark = {
  schema: "fold-bloom-landmark/v0.1"
  id: string
  sourceId: string
  address: {
    time?: number
    range?: [number, number]
    textAnchor?: string
    frame?: number
  }
  kind:
    | "NOTE"
    | "QUOTE"
    | "IMAGE"
    | "BRANCH"
    | "MEMORY"
    | "INSTRUCTION"
    | "CUSTOM"
  label?: string
  body?: string
  authoredAt: string
}
```

Landmarks are not analyzer events.

---

## 3.5 EXPERIENCE SET

Higher-order authored journey.

```ts
type ExperienceSet = {
  schema: "fold-bloom-experience-set/v0.1"
  id: string
  title: string
  entries: ExperienceEntry[]
  acts?: ExperienceAct[]
  profile?: SetProfile
  note?: string
  createdAt: string
  updatedAt: string
}
```

```ts
type ExperienceEntry = {
  id: string
  sourceId: string
  weight?: number
  profileOverride?: Partial<RideProfile>
  transitionIn?: TransitionLaw
  transitionOut?: TransitionLaw
  landmarkIds?: string[]
}
```

```ts
type TransitionLaw =
  | "CUT"
  | "DISSOLVE"
  | "CARRY"
  | "RESET"
  | "RETURN"
```

A set never erases child identities.

---

## 3.6 PROJECTION

```ts
type ProjectionKind =
  | "RIDE"
  | "SEE"
  | "SHAPE"
  | "READ"
  | "ATLAS"
  | "COMPOSE"

type ProjectionState = {
  sourceOrSetId: string
  kind: ProjectionKind
  canonicalPosition?: number | string
  localState?: unknown
  profileRef?: string
}
```

Projection state is allowed to be ephemeral.

---

## 3.7 RETURN

```ts
type ExperienceReturn = {
  schema: "fold-bloom-return/v0.2"
  sourceOrSetId: string
  sourceRefs: string[]
  projection: ProjectionKind
  path?: {
    landmarks?: string[]
    branchChoices?: unknown[]
  }
  profile?: RideProfile | SetProfile
  authoredOperations?: unknown[]
  evidenceRefs?: string[]
  createdAt: string
}
```

No RETURN should need raw private source bytes unless the user explicitly packages them.

---

# 4. Experiential feature model

Low-level features may vary by adapter.

Human-facing projection should use bounded normalized dimensions.

## 4.1 RHYTHM

| Feature | Meaning |
|---|---|
| PULSE | periodic temporal certainty |
| PROPULSION | forward kinetic pressure |
| SYNCOPATION | off-grid rhythmic displacement |
| IMPACT | transient density / force |

## 4.2 ENERGY

| Feature | Meaning |
|---|---|
| LIFT | tendency toward rising/opening |
| TENSION | unresolved pressure |
| RELEASE | relative resolution event |
| SATURATION | fullness / density |

## 4.3 SPACE

| Feature | Meaning |
|---|---|
| CLOSENESS | compressed / intimate aperture |
| WIDTH | horizontal/open perceptual field |
| GRADE | ascent/descent tendency |
| APERTURE | tunnel ↔ open-sky continuum |

## 4.4 TEXTURE

| Feature | Meaning |
|---|---|
| GRAIN | irregular microstructure |
| SMOOTHNESS | continuity / low roughness |
| SHIMMER | high-frequency brightness/change |
| WEIGHT | low-frequency / sustained mass |

## 4.5 VOICE/TEXT

| Feature | Meaning |
|---|---|
| DENSITY | amount of language/speech |
| PRESENCE | text/voice available now |
| CUE CERTAINTY | timed / inferred / unaligned |
| SALIENCE | explicit human/analyzer witness only |

## 4.6 MEMORY / SEQUENCE

| Feature | Meaning |
|---|---|
| RECURRENCE | repeated motif/entity |
| NOVELTY | difference from recent context |
| CLUSTER | local grouping strength |
| DISTANCE | temporal separation |

Adapters may leave unsupported dimensions absent.

Do not synthesize fake values merely to fill the table.

---

# 5. SET COMPOSITOR

## 5.1 Interaction concept

The set editor should feel like moving pieces, not filling forms.

### Visual model

- each source = block/cell;
- block width = duration or authored experiential weight;
- glyph embedded in block;
- world/profile shown as thin overlay;
- transition = seam between blocks;
- act = background region spanning blocks;
- landmark = small addressed mark inside block.

### Required gestures

Desktop:
- drag block to reorder;
- drag seam to select transition;
- click block to focus/open;
- shift/command multi-select optional later.

Phone:
- long-press + drag reorder;
- tap seam → transition picker;
- tap block → focused source sheet.

No freeform resize of actual source duration in v0.1.

### Tetris-converge behavior

The delight should come from **snapping meaningful objects together**.

The user may choose an experiential weight independent of literal source duration for overview layout, but the actual ride/play duration remains source truth.

A block can be visually compressed without pretending the source became shorter.

---

# 6. Transition semantics

## CUT

- source boundary is explicit;
- world may reset to next source profile;
- no interpolation required.

## DISSOLVE

- visual world/horizon may interpolate;
- source identity still switches discretely;
- audio crossfade is optional implementation detail, not semantic requirement.

## CARRY

- preserve selected projection state:
  - world;
  - profile;
  - motion residue;
- never carry source-derived landmarks as if they belong to next source.

## RESET

- clear ephemeral projection state;
- next source starts from its own profile/defaults.

## RETURN

- final set closure;
- produce set RETURN;
- optional visual convergence;
- never means “undo.”

---

# 7. Unified shell

## Persistent source header

Every major projection should be able to expose the same compact identity strip:

- glyph;
- title;
- source/set count;
- canonical position;
- profile indicator;
- landmark count;
- RIDE / SEE / SHAPE;
- RETURN.

The strip may collapse on mobile.

### Law

The shared shell may own navigation and identity.

It must **not** own analyzer authority, reader authority, composition authority or world-writing authority.

---

# 8. RIDE requirements

## Must preserve

- source identity;
- source position;
- route/branch state;
- human-authored operations;
- profile separation;
- reduced-motion behavior.

## Visual material requirements

- near terrain occludes far terrain;
- macro events alter geometry before effect layers;
- event effects are bounded;
- scene/world identity is visible without reading the label;
- no high-frequency flashing;
- text remains optional.

## QA metrics

Human:
- “felt movement without HUD”
- “noticed one real macro change before/at arrival”
- “could distinguish worlds”
- “did not see geometry bleed-through”

Technical:
- >= 50–60 fps target on modern phone for default scene where feasible;
- no repeated source-event firing under steady playback;
- no unbounded allocation per frame;
- source load/decode failure returns to usable state.

---

# 9. SEE requirements

SEE combines Atlas + LISTEN affordances through one source identity.

Must answer:

- what is this?
- where did it come from?
- what structure was measured?
- what text/chapters exist?
- where are my landmarks?
- what profile will RIDE use?
- what can I change without changing evidence?

Glyph → inside remains a primary interaction.

---

# 10. SHAPE requirements

SHAPE is not a generic settings page.

It edits bounded authored state:

- RIDE PROFILE;
- landmarks;
- world choice;
- set order;
- transition laws;
- act labels.

Every control must answer:

> “what object am I changing?”

No anonymous global sliders where a source-specific control is intended.

---

# 11. Podcast adapter spec

## Input

- local/enclosure audio;
- RSS origin;
- transcript URL/file;
- chapters file;
- artwork;
- episode title.

## Canonical position

Audio playhead time.

## Text projection

Transcript cues address the same time.

## Chapter projection

Chapter start times produce bounded hierarchy events.

## Landmarks

Quote/topic pins remain human authored.

## RIDE

May derive movement from:
- speech cadence;
- pause;
- energy;
- chapter boundaries;
- user landmarks.

Do not fabricate “emotional truth” from speaker audio.

---

# 12. Document adapter spec

## Canonical position

Character/token/structural address managed by READFIELD.

## Hierarchy

DOCUMENT
→ SECTION
→ PARAGRAPH
→ SENTENCE
→ PHRASE
→ WORD

## Fold/Bloom transfer

Allowed:
- terrain from structural density/novelty;
- landmarks;
- aperture;
- traversal;
- profile;
- RETURN.

Not automatically allowed:
- music-specific beat/tempo semantics;
- game scoring;
- “drop” terminology if it confuses the reading domain.

Recipient names its own events.

---

# 13. Photo / memory adapter spec

## Canonical position

Ordered item index + timestamp where available.

## Features

Allowed:
- temporal gaps;
- clusters;
- recurrence;
- image similarity;
- human captions/pins;
- place if supplied.

Avoid:
- inferred private emotional labels presented as fact;
- face/person identity inference without explicit authorized data.

## Projection

A trip/month/relationship archive may become a traversable sequence.

Original files remain exact source cells.

---

# 14. Communication RETURN

A future share object should be capable of carrying:

- source/set identity;
- selected path;
- text;
- glyph;
- profile;
- bounded motion script;
- landmarks;
- optional destination note.

Potential renderings:

- link;
- compact web artifact;
- looping preview;
- GIF/video-like export later.

The communication object must state whether it contains:
- source material;
- references only;
- derived visuals only.

---

# 15. Storage / privacy

## Default

Local-first.

Use:
- browser localStorage / IndexedDB for profiles, paths, lightweight caches;
- user-selected files;
- source hash/address as join keys.

Avoid:
- silently uploading private sources;
- provider credentials in public repo;
- embedding large media into Git history.

A later private runtime may synchronize selected objects.

---

# 16. Performance constraints

- analysis workers isolated from renderer;
- preview before deep analysis;
- bounded frame sampling;
- bounded text cues in exported packets;
- no per-frame full-map rebuild;
- geometry/material draw order must preserve occlusion;
- scene switching should not trigger re-analysis;
- profile changes should be projection-only and fast.

---

# 17. Accessibility

- reduced-motion respected;
- text overlay optional;
- no strobe grammar;
- keyboard/touch access for core controls;
- color alone must not encode critical state;
- RIDE remains meaningful muted where practical;
- SEE/SHAPE must remain usable without animation.

---

# 18. Instrumentation / receipts

Each meaningful use may emit compact local evidence:

```ts
type UseReceipt = {
  sourceOrSetId: string
  surface: "RIDE" | "SEE" | "SHAPE"
  startedAt: string
  durationMs?: number
  profileChanged?: boolean
  landmarksAdded?: number
  returnCreated?: boolean
  humanQA?: {
    material?: "PASS" | "FAIL"
    eventTiming?: "EARLY" | "RIGHT" | "LATE" | "MISSED"
    delight?: number
    note?: string
  }
}
```

No telemetry upload is required for the public/local artifact.

---

# 19. Acceptance tests for EXPERIENCE COMPILER 0.1

## Source integrity

- exact source ID survives all projection changes;
- profile mutation cannot alter map hash/evidence;
- text offset cannot rewrite source cue times.

## Set integrity

- export/import preserves ordered source refs + transitions;
- missing source displays explicit unresolved cell;
- child source remains independently openable.

## UX

- newcomer can load → RIDE in < 30 seconds;
- newcomer can locate SEE and SHAPE without documentation;
- same source visibly persists across projection switch.

## Ride

- one macro source event cannot repeatedly fire while playhead moves continuously;
- solid terrain occludes far terrain;
- reduced-motion path passes browser smoke.

## Return

- RETURN names source/set;
- records authored state;
- can be reopened without source identity ambiguity.

---

# 20. Implementation packet

Recommended next PR sequence:

### PR A — `EXPERIENCE SET v0.1`
Pure schema + tests + import/export.

### PR B — `SET COMPOSITOR 0.1`
Block/Tetris board + reorder + five transition laws.

### PR C — `JOURNEY RIDE 0.1`
LIVE consumes ordered set and performs transition laws.

### PR D — `SOURCE SHELL 0.1`
RIDE / SEE / SHAPE persistent identity strip.

### PR E — `PODCAST ADAPTER 0.1`
One non-music proof over the same source cell model.

Do not parallelize all five.

Complete → RETURN → replan after each.

---

# 21. Final product criterion

The artifact is successful when a person can say:

> “I gave it something meaningful, it showed me what was inside, I shaped how I wanted to encounter it, I moved through it, and I could hand that experience to someone else.”

without needing to understand the architecture that made that sentence true.
