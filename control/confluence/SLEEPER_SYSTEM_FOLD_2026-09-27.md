# SLEEPER SYSTEM FOLD — 2026-09-27

Status: **CURRENT CONVERGENCE NOTE + IMPLEMENTED BRIDGE CONTRACT**  
Canonical object: **SLEEPER // ONE RETURN v2 / City Engine v0.2**  
Canonical source authority: `/recovery/sleeper/site-source-2026-09-18/`  
Public entry: `/sleeper/`  
Continuation membrane: `/sleeper/project/`

## 0. Why this fold exists

Sleeper had recovered its identity before it recovered its place in the larger system.

The canonical v2 runtime already has a unusually complete circuit:

`PHRASE + VERSE CELL + FIGURE → DETERMINISTIC CITY → 8 ENACTED GATES → RETURN TO ORIGIN → RETURN ARTIFACT V2`

But repository metadata and human navigation still treated Sleeper partly as an archaeological object, while adjacent instruments separately developed strong source, reading, projection, temporal and embodied mechanisms.

The convergence task is therefore not “merge the apps.”

It is:

**make Sleeper's source, world, proof and RETURN objects continue lawfully through the field without making any recipient a second Sleeper authority.**

## 1. The central model: boundary object, not bus

Return Artifact v2 is a **boundary object**.

It is self-describing enough that another instrument can inspect or project it:

- exact `worldKey`,
- source phrase,
- verse-cell provenance,
- figure,
- operator counts,
- Gate proof ledger,
- path signature,
- measures,
- transformed/returned source.

But it is not a universal event schema and not a shared mutable store.

A receiving instrument may:

- read it,
- focus it,
- compare it,
- project it,
- use the source as new authored material after explicit handoff.

A receiving instrument may not:

- retroactively satisfy a Gate,
- reinterpret geometry as proof,
- alter the completed run,
- claim Sleeper source/world authority,
- silently promote `returnedSource` into authored truth.

This gives a strong convergence primitive:

`HOST A durable object → typed bounded handoff → HOST B unequal projection → exact RETURN`

not:

`all hosts → one global state bus`.

## 2. Implemented now: RETURN BRIDGE 0.1

`/sleeper/project/` now receives copied Return Artifact v2 from the canonical live runtime.

Before exposing any continuation it checks:

1. `schema === "sleeper.one-return"`;
2. `version === 2`;
3. known verse-cell ID;
4. known figure ID;
5. deterministic `worldKey` recomputed from normalized source + cell + figure using the recovered FNV-1a world-seed law;
6. optional route witness, if present, names the same world;
7. all eight canonical Gate names are present in the proof ledger.

The bridge stores the accepted artifact only in `sessionStorage`.

It then exposes five small continuations:

### READ SOURCE

`Return.source → readfield-handoff/v1 → /docs/`

READFIELD owns only reading/focus. Caller RETURN is `/sleeper/project/`.

### READ RETURN

The exact artifact JSON enters the same READFIELD reader as an inspectable JSON source.

This is useful for proof-ledger inspection, comparison and ordinary operational reading without inventing a Sleeper-specific debugger.

### VERSE SOURCE

`Return.source + first-line focus → field-verse-handoff/v0.1 → /poetry/map/`

Only source/focus cross the seam.

Poem Map/Verse gains no Gate proof, route, world geometry or authorship from Sleeper. Once the user edits/adopts, Poem Map owns its own writing history.

### LENS RETURN

`Return Artifact → scale-lens.handoff/v2 → /fold-bloom/lens/`

The LensState object explicitly records:

- object ID `sleeper:return:<worldKey>`,
- canonical-style address `sleeper://<worldKey>/return`,
- upstream contract `sleeper.one-return/v2`,
- Sleeper provenance,
- return address `/sleeper/project/`.

Scale Lens can inspect the JSON at unequal scales while its own RETURN returns to Sleeper.

### OPEN SAME WORLD

The bridge reconstructs the canonical deep-link inputs:

`source + cell + figure + verified worldKey`

and opens the live ONE RETURN runtime.

Thus the portable artifact again becomes a world.

## 3. What Sleeper is in the wider FIELD

A useful compressed reading is:

`SOURCE → WORLD → TRAVERSE / ENCOUNTER / ORIENT → ENACT PROOFS → RETURN → PORTABLE WITNESS`

This distinguishes several concerns that had begun to blur.

### SOURCE

Phrase / verse cell / figure define reproducible initial conditions.

Possible neighbors:
- Verse/Poem: authored language and relation work.
- READFIELD: inspection of source/spec/witness.
- recovered Grid Path: typed path/source donor.

### WORLD

Sleeper owns deterministic city generation and its mechanical consequences.

Possible donors:
- ASCII City lineage: world-scale traversal and city-depth mechanisms.
- recovered painting/path/world experiments.
- future district/interior/verticality mechanisms only after a named gap.

### TRAVERSE / ENCOUNTER / ORIENT

Movement is meaningful, but movement is not proof.

Candidate donors:
- FOLD//BLOOM LIVE RIDE/trackfield embodiment,
- route/ghost replay,
- landmarks and orientation,
- interruptible carry / transit,
- vertical or interior address transitions,
- ambient traffic/actors if they alter traversal decisions without manufacturing truth.

### ENACT PROOFS

This remains Sleeper's strongest owned distinction.

PROVENANCE / TRUTH / COMPRESSION / RETRIEVAL / OPERATION / MEASURE / TRANSFER / RESILIENCE are enacted protocols, not labels.

No donor may bypass that requirement.

### RETURN

The origin return plus Artifact v2 is the system's outward membrane.

This is where Sleeper connects most naturally to FIELD.

## 4. ASCII City should be treated as a donor family, not “the transport idea”

The Prototype 3 transport episode initially highlighted a useful mechanism:

**compression can itself remain traversable.**

Ground ride, fixed-line travel and aerial overview can increase reach without replacing the city with a teleport menu.

But transport is only one possible world-depth donor.

The useful quarry should stay broader:

- **route hierarchy** — distinguish local / collector / trunk traversal;
- **interruptible carry** — borrowed movement that can return control immediately;
- **landmarks** — persistent retrieval/orientation anchors;
- **verticality** — a city can have address depth beyond a flat maze;
- **interiors** — nested spatial contexts can make districts materially distinct;
- **ambient movement** — traffic/residents can produce changing encounter conditions;
- **long-distance visibility** — orientation may depend on what can be perceived from afar;
- **same-world route memory** — ghosts/overlays make prior traversal a usable witness.

Only the Prototype 3 transport summary is currently concretely ingested here. Other videos in the channel should be mined as additional donor evidence rather than guessed from this note.

## 5. Route ghost is general memory, not transport

The same-world ghost design remains useful, but its correct classification is:

**PLAYER TRACE / MEMORY PROJECTION**

not “transport engine.”

A ghost should be able to replay:

- ordinary walking,
- detours,
- Gate ordering,
- future interiors/elevation,
- future carried/line traversal,
- return-to-origin behavior.

The optional `RouteWitness` belongs inside or beside Return Artifact v2 because it deepens a fact Sleeper already owns: **how this run traversed this exact world**.

A ghost never owns collision, Gate callbacks or current-run state.

## 6. Convergence with other heads

### FIELD INDEX

FIELD owns attention/addressing, not Sleeper state.

Sleeper should appear as one held object with a small lawful neighborhood:

`OPEN WORLD / RECEIVE RETURN / READ / PROJECT / RETURN`

not as many cards for its derivatives.

### READFIELD

Real integration exists now.

READFIELD is the default source/witness inspection surface; Sleeper should not build another text/JSON reader.

### VERSE / POEM

Real one-way source continuation exists now.

A reverse Poem → Sleeper world seam is attractive but not yet implemented because a Sleeper world needs three mechanical inputs, not merely text. Silently picking a verse cell and figure would move authority through defaults.

### SCALE LENS

Real Return Artifact projection exists now.

Lens is useful because the artifact is nested structured data; this is inspection, not game state.

### FOLD//BLOOM LIVE

Remain donor-first.

LIVE has mature embodied traversal, source-time, landmarks, AUTOPILOT and replay-adjacent mechanics, but its source authority is audio/linear experience. Sleeper should transplant bounded mechanisms, not import LIVE state wholesale.

### DAYLINE / reality systems

Do not automatically turn a game RETURN into a task.

ONE RETURN v2 already contains the correct consent boundary: any real-world utility starts only after explicit choice.

A future “CARRY OPERATOR INTO DAYLINE” action may be useful, but it should be opt-in and should transfer only the portable operator/instruction plus provenance.

## 7. Deeper system insight

Sleeper may be one of the clearest examples in the repository of an **executable intermediate representation**:

`symbolic source → generated environment → embodied operations → evidence → portable symbolic return`

This pattern rhymes with several other lineages:

- Verse: text → relation/path → authored change → RETURN;
- LIVE: source → map/terrain → embodied traversal → deformation witness → RETURN;
- Dayline: object → bounded moves → world delta → RETURN;
- HOUSE: address/state → operation → physical observation → RETURN.

The rhyme is useful, but it is not permission to universalize schemas.

The shared law is smaller:

**A representation earns complexity when action through it changes what can be honestly returned.**

Sleeper's specific contribution is that the middle representation is a world one must physically/cognitively traverse.

## 8. Open questions — preserve, do not prematurely resolve

### Q1 — Route Witness v1
Should Artifact v2 gain an optional complete delta-encoded route witness while keeping `pathSignature` as its compact transformation fingerprint?

Current answer: **probably yes**. It is additive and directly closes an open v0.2 depth target. It must be independently replayable and same-world validated.

### Q2 — External-runtime bridge
Can the canonical external runtime expose a direct “COPY / FIELD” or portable URL handoff so manual paste into `/sleeper/project/` disappears?

Constraint: repository pages and the Work-host runtime are cross-origin; same-origin `sessionStorage` cannot bridge them directly.

The current paste bridge is honest and robust.

### Q3 — Verse → Sleeper
What is the minimum explicit UI for choosing `source + verse cell + figure` from a writing context without turning those mechanical inputs into arbitrary defaults?

Do not ship until the choice itself has meaning.

### Q4 — Sleeper → LIVE
What bounded donor unit is actually missing first:
- ghost interpolation,
- landmark projection,
- ride smoothing,
- route hierarchy,
- autopilot/carry,
- temporal event tape?

Do not transfer “LIVE” wholesale.

### Q5 — District progression
The recovered v0.2 spec names authored long-form district progression as open. Does this mean:
- spatial sequencing,
- evolving laws,
- increasing proof composition,
- narrative authored districts,
- or simply better orientation across a larger city?

Need a concrete failure in current play before choosing.

### Q6 — Ambient world
Would traffic/residents add decisions, consequence or replay, or merely spectacle?

Ambient systems belong only if they perturb route/encounter choice while leaving proof causality legible.

### Q7 — RETURN as continuation
Which part of Return Artifact should naturally continue outside Sleeper:
- source,
- transformed source,
- dominant operator,
- proof pattern,
- route,
- question/residue?

Different hosts should receive different subsets rather than “the whole artifact everywhere.”

## 9. Next cuts, ordered by conversion value

1. **Use Return Bridge 0.1 on a real canonical Return Artifact.**
   This is the cheapest actual-use proof of cross-system continuity.

2. **Route Witness / ghost as optional Artifact v2 depth.**
   General memory first; transportation remains only one later event type.

3. **Ingest the remaining ASCII City channel episodes as donor evidence.**
   Extract mechanisms independently; only then choose one missing Sleeper function.

4. **One world-depth transplant.**
   Prefer the smallest mechanism that changes replay/decision/orientation over visual spectacle.

5. **Only after evidence: reverse Verse → Sleeper or explicit real-world operator continuation.**

## Stop rule

Do not add:
- a Sleeper dashboard,
- a global game-state bus,
- a second text reader,
- a second path ontology,
- a generic “all instruments” shell,
- transport merely because Prototype 3 has transport,
- NPCs merely because a city can contain NPCs.

The fold succeeds when one existing Sleeper object can move farther through the system with **less reconstruction and no authority blur**.
