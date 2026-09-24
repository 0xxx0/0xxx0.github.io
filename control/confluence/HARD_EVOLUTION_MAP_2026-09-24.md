# HARD EVOLUTION MAP — COMPOSITION / CONTEXT / REWRITE / PROVENANCE

Date: 2026-09-24  
Status: RESEARCH CONVERGENCE MAP / NO NEW CORE  
Purpose: sharpen the next hard evolution of FIELD / INTERPHASE / VERSE / FOLD//BLOOM / SLEEPER / DAYLINE / PHYSICAL MAKE without creating another universal shell.

## STATE LINE

The collaboration already has most of the substrate:

- CAP-IR: stable object identity, exact source, relations, evidence, transform history, RETURN.
- INTERPHASE: host-owned truth, multifocus, composable optics, projection state, explicit residue, preview/commit authority, RETURN frames.
- INTERPHASE Mapping: CORRESPOND -> PROJECT -> OPERATE, GetPut/PutGet checks, operation-commutation checks.
- GLYPH / RING: compact identity/address/depth/time/channel/operator witnesses.
- Domain hosts remain sovereign: READFIELD, Poem Map, LISTEN/SET/LIVE, FIELD, AXIAL, ROOM, SLEEPER, physical hosts.

Therefore:

> DO NOT INVENT A NEW KERNEL.

The missing proof is narrower:

> Can one already-addressed object expose typed part/whole structure, typed ports/relations, local focus context, lawful interface-preserving rewrites and exact derivation provenance — then render those same facts as page / graph / flower-formula / ring / room / physical binding without changing identity?

That is the next hard convergence target.

---

## RECOVERED / ALREADY IMPLEMENTED

### R1 · IDENTITY / ADDRESS / RETURN

CAP-IR and INTERPHASE already preserve stable IDs, source hashes, event history and return frames.

Do not replace these.

### R2 · BIDIRECTIONAL PROJECTION

INTERPHASE Mapping already encodes the core lens laws:

```
PUT(source, GET(source)) = source
GET(PUT(source, edited_view)) = edited_view
```

and supported-operation commutation:

```
PROJECT(OP(host)) ~= VIEW_OP(PROJECT(host))
```

Do not add a second lens layer.

### R3 · MULTIFOCUS / OPTICS

`lib/interphase-core.js` already has composable path optics and multi-focus.

This is enough substrate to test stronger focus/context semantics before importing an optics framework.

### R3B · MAKE GRAMMAR / WRAP PROOF ALREADY SEPARATES TOPOLOGY FROM GEOMETRY

Recovered donor:
- `/control/confluence/MAKE_GRAMMAR_WRAP_PROOF_2026-09-23.md`

It already proves the crucial distinction:

```
IDENTIFY != DEFORM
TOPOLOGY != GEOMETRY != EMBEDDING
```

The donor's plane -> cylinder -> torus proof separates:
- topological edge identification;
- geometric deformation/embedding;
- measured strain;
- physical-fit UNKNOWN.

This is a direct internal ancestor/donor for the DPO + mereotopology connection below. Do not overwrite it with imported graph-rewrite terminology.

Related admission law:
- `/control/research/SHAPE_LAW_ATLAS.md`
- name the invariant / constraint / objective first; admit a shape only when its formal property implements that thing.

### R4 · RELATIONS

CAP-IR / INTERPHASE canonical objects already permit `relations[]`.

The immediate experiment should use richer relation records inside this existing slot before any schema/core promotion.

---

# EXTERNAL DONOR CONNECTIONS

These are mechanism donors, not naming mandates.

## D1 · ZIPPER = ADDRESS + FOCUS + CONTEXT + RETURN

Gérard Huet's zipper represents a data structure together with one focused location and the path/context needed to move around and reconstruct the whole.

Source:
- Huet, “The Zipper” (1997): https://gallium.inria.fr/~huet/PUBLIC/zip.pdf

Why this matters here:

```
WHOLE
  + FOCUS
  + CONTEXT PATH
  -> LOCAL OPERATION
  -> RECONSTITUTE WHOLE
```

This is extremely close to:

- READFIELD source position + structural context;
- Poem Map selected token + line/poem context;
- FIELD focus + parent/peer/child;
- Dayline active range + containing ranges;
- ROOM selected cassette/node + containing structure.

### Proposed transfer

Do not add a “Zipper app.”

Test whether every focused INTERPHASE host can expose:

```json
{
  "focus_id": "...",
  "context_path": ["root", "...", "parent"],
  "left_or_before": [],
  "right_or_after": [],
  "return_address": "..."
}
```

Only promote if at least READFIELD + Poem Map independently benefit.

---

## D2 · OPERADS / WIRING DIAGRAMS = THE STRONG FORM OF THE FLORAL FORMULA IDEA

The old floral-formula attraction is not “make everything botanical.”

Its useful invariant is:

> compact notation of parts + multiplicity + interface + composition.

Operads and wiring diagrams formalize composition of systems by typed interfaces/ports. Catlab makes the model concrete: boxes have typed ports; wires connect ports; whole diagrams can substitute into boxes.

Sources:
- Vagner, Spivak et al., open systems / wiring diagrams: https://arxiv.org/abs/1408.1598
- Patterson, Spivak, Vagner, wiring diagrams as normal forms: https://arxiv.org/abs/2101.12046
- Catlab wiring diagrams / CPortGraphs: https://algebraicjulia.github.io/Catlab.jl/latest/apis/wiring_diagrams/

### Proposed transfer

The generalized “floral formula” should serialize **typed composition**, not coordinates.

Candidate minimal grammar:

```
WHOLE(
  PART*,
  PORT*,
  RELATION*,
  CONSTRAINT*,
  OPERATOR*,
  RETURN
)
```

Example shape only:

```
POEM[ L1 L2 L3 L4 | RHYME(A:{L1,L3},B:{L2,L4}) | TURN(L3) ]
SET [ S1 -CARRY-> S2 -DISSOLVE-> S3 ]
PANEL[ RAIL{L,R} + BOARD -> MOUNT ; LOAD<=x ; RETURN=UNCLAMP ]
```

The flower/radial diagram becomes one projection of this expression.

Do not import Catlab as a dependency. Borrow the typed-port/substitution law first.

---

## D3 · MEREOTOPOLOGY / RCC = THE MISSING HALF OF MEREOLOGY

Plain mereology handles part/whole. It does not distinguish:

- inside but not touching boundary;
- inside and touching boundary;
- overlap;
- external contact;
- disconnection.

Region Connection Calculus (RCC8) supplies exactly these qualitative spatial distinctions.

Sources:
- Randell, Cui, Cohn (1992), RCC lineage;
- overview / relation set: https://en.wikipedia.org/wiki/Region_connection_calculus
- practical cultural-heritage modeling example: https://cidoc-crm.org/Resources/rcc8-for-cidoc-crm-a-semantic-modeling-of-mereological-and-topological-spatial-relations-in-notre

### High-value domains

PHYSICAL MAKE:
- panel touches rail;
- insert is inside tray;
- pad contacts wall;
- wire crosses/does not cross region;
- tool is contained without being structurally joined.

ROOM / UI:
- panel contains focus;
- overlays overlap but do not own;
- edge-touch vs nested placement.

VERSE:
Use sparingly. Spatial relation is legitimate only for actual layout/cell topology, not semantic metaphor.

### Stop

Do not turn RCC8 into a universal semantic relation vocabulary.

---

## D3B · ALLEN INTERVAL ALGEBRA = TEMPORAL TOPOLOGY WITHOUT FALSE PRECISION

Allen's interval algebra distinguishes thirteen qualitative interval relations: before / meets / overlaps / starts / during / finishes, their inverses, and equality.

Sources:
- Allen interval algebra overview: https://ics.uci.edu/~alspaugh/cls/shr/allen.html
- Grüninger & Li, TIME 2017: https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.TIME.2017.16

This is the temporal sibling of the RCC/mereotopology insight.

High-value domains:

DAYLINE:
- task A before task B;
- appointment meets travel block;
- project contains action;
- two commitments overlap;
- week contains day/range.

FOLD//BLOOM:
- sections meet / overlap;
- CARRY crosses an exact boundary;
- DISSOLVE intentionally overlaps two source intervals;
- Journey time contains source-time intervals without replacing source clocks.

READFIELD / media:
- phrase during paragraph;
- cue overlaps sentence;
- transcript segment meets another segment.

### Boundary

Use exact timestamps where they are evidence. Use interval relations as derived qualitative structure, not as a replacement for source time.

Do not adopt the whole algebra if a domain only needs BEFORE / MEETS / OVERLAPS / CONTAINS.

---

## D4 · ALGEBRAIC GRAPH REWRITE = “FEW LAWFUL TRANSFORMATIONS”

Double-pushout style graph rewriting makes a transformation explicit as:

```
L <- K -> R
```

where:

- L = pattern before;
- R = pattern after;
- K = preserved interface/context.

Sources:
- DPO overview: https://www.cas.mcmaster.ca/~kahl/CAS701/2007/P/DPO.pdf
- modern formalization: https://arxiv.org/abs/2312.15641
- PBPO+ tutorial: https://arxiv.org/abs/2301.12912

This maps unusually well to FIELD law:

```
OBJECT -> OPERATION -> CHANGED OBJECT -> RETURN
```

with a missing explicit question:

> Which addressed parts/interfaces MUST survive this operation?

### Proposed transfer

Every hard transform fixture should declare:

```json
{
  "match": ["ids changed or consumed"],
  "preserve": ["stable ids / ports / source refs"],
  "produce": ["new ids / relations"],
  "preconditions": [],
  "authority": "EDIT|EFFECT",
  "evidence": [],
  "return": "..."
}
```

Examples:

VERSE:
replace one token while preserving line identity, locks and source ancestry.

FOLD//BLOOM:
change seam law while preserving exact member source identities.

PHYSICAL:
replace a detachable panel while preserving rail/interface address and measured mating constraints.

If the preserved interface cannot be named, the operation is probably underspecified.

---

## D5 · E-GRAPHS = “MANY LAWFUL READINGS” ONLY WHEN EQUIVALENCE IS PROVED

E-graphs compactly retain many equivalent expressions. Equality saturation applies semantics-preserving rewrites without destructively choosing an ordering, then extracts a result using a cost function.

Sources:
- Willsey et al., egg / equality saturation: https://arxiv.org/abs/2004.03082
- 2026 CACM overview: https://doi.org/10.1145/3815481
- https://egraphs.org/

Potential use:

- equivalent composition-formula normalizations;
- algebraically equivalent layout/route expressions;
- compiler-like simplification of generated transformation plans;
- preserve several equivalent structural expressions until a projection/cost requires one.

### Critical boundary

Do NOT put these in an e-graph merely because they are “alternatives”:

- two different poems;
- competing interpretations;
- different aesthetic choices;
- lossy projections with different residue.

E-graph equivalence must be earned by a law/test, not similarity.

---

## D6 · PROVENANCE SEMIRINGS = DERIVATION AS COMPUTABLE MATTER

Database provenance work shows how derived results can carry algebraic expressions describing which source facts contributed to them.

Source:
- Green, Karvounarakis, Tannen, “Provenance Semirings” (2007): https://repository.upenn.edu/bitstreams/b598c0a7-0d24-4162-8279-5f51a17d29c2/download

We probably do NOT need a literal semiring implementation now.

But the transfer is strong:

> every derived edge/value/candidate should be able to answer WHY IT EXISTS as a composable derivation expression.

Examples:

Poem candidate:
`LOCAL_CORPUS(term42) × RHYME(ruleA) + HUMAN_BANK(candidate7)`

Audio section:
`DECODE(bytesHash) -> ONSET(modelVersion) -> SECTION(boundaries)`

Recovery claim:
`SOURCE(hashA) + SOURCE(hashB) -> INFERRED_MATCH(rule)`

### Proposed minimal form

```json
{
  "derived": "...",
  "because": [
    {"source":"...", "op":"...", "version":"..."}
  ]
}
```

Start with a provenance DAG/string, not algebra machinery.

---

## D7 · VCSP = PUZZLE / SEARCH, WITH HUMAN PREFERENCE OUTSIDE THE SOLVER

Valued Constraint Satisfaction Problems model finite variables/domains plus cost functions; complexity depends on the permitted constraint language.

Sources:
- Krokhin & Živný survey: https://www.cs.ox.ac.uk/standa.zivny/publications/kz17survey.pdf
- JACM finite-valued CSP dichotomy: https://dl.acm.org/doi/10.1145/2974019

Current transfer remains:

```
STATE
-> LEGAL MOVES
-> HARD FILTER
-> SOFT COST VECTOR
-> SMALL OPTION SET
-> HUMAN CHOICE
-> COMMIT
-> RETURN
```

The human remains the preference/meaning oracle.

This model applies beyond poetry:
- layout under physical constraints;
- scheduling/dayline;
- migration/convergence candidate selection;
- set/seam composition;
- tool/part fit planning.

Do not replace human judgment with one scalar “quality” score.

---

## D8 · STRUCTURED PARAMETER EDITING > PIXEL-LEVEL GENERATION WHEN STRUCTURE EXISTS

A recent 2026 graphics result, StructuredEdit, explicitly reframes constrained graphic editing as parameter manipulation rather than free pixel generation and reports higher constraint satisfaction.

Source:
- https://arxiv.org/abs/2607.04612

Transfer to MEDIA REFINERY / glyph work:

If a visual has recoverable structure:
- geometry;
- layers;
- text;
- masks;
- paths;
- palette;
- constraints;

prefer editing that structure and rasterizing afterward.

Generative image transformation remains valuable when the structure is not available or the desired operation is genuinely pictorial.

---

# THE HARD ALIGNMENT MAP

| Existing lineage | Deepest useful formal donor | Concrete missing proof |
|---|---|---|
| READFIELD / Aperture | zipper + optics | one exact focus/context frame round-trips across scale changes |
| Poem Map / Pathweaver | VCSP + hyper/port relations + rewrite | n-ary relation + locked rewrite + human choice preserves poem identity |
| Verse floral/glyph idea | operad / typed wiring | formula ↔ node map ↔ flower glyph round-trip without geometry becoming meaning |
| Fold//Bloom SET/LIVE | wiring + temporal ports + preserved-interface rewrite | member/source ids survive seam/ride transformation |
| Sleeper | graph/path rewrite + provenance | gate enactment changes world state while source/figure/gate addresses remain recoverable |
| Dayline | zipper + interval/containment relations | day/week/project range changes projection without duplicating task identity |
| AXIAL / ROOM | typed ports + DPO rewrite + RCC | operation states exactly what mates/persists/changes |
| House / physical | RCC + typed ports + measured host | digital relation cannot claim physical contact/fit without measured evidence |
| FIELD / recovery | provenance + partial optics | every derived claim states source path; UNKNOWN remains representable |
| Glyph Atlas | typed structural witness | glyph can be decoded to address/channel/operator structure, not merely recognized visually |

---

# 12 CONNECTIONS WORTH KEEPING IN WORKING MEMORY

1. **FOCUS is probably a location-with-context, not merely a selected ID.**
2. **A flower formula is more promising as typed composition syntax than as a visual style.**
3. **Edges/seams can own operations; nodes do not need to own every transform.**
4. **N-ary relations matter.** Rhyme groups, chords, multi-part constraints and assemblies are not naturally binary edges.
5. **Mereology needs topology when contact/boundary matters.**
6. **Every real transform should name the interface it preserves.**
7. **Residue is information-loss metadata and should compose through projection chains.**
8. **A glyph can be a structural checksum/witness, not just an icon.**
9. **Many views should share address; they should not necessarily share geometry.**
10. **Git is already a strong append-only event/provenance substrate. Do not build a second event-sourcing database merely to imitate one.**
11. **The loading/progress surface can expose the transformation graph itself**: bytes -> decode -> features -> segments -> projection -> ride, with each stage inspectable.
12. **Physical reality is not “another visualization.”** It is another sovereign host whose operations demand measurement/effect evidence.

---

# NEXT THREE PROOFS — NO NEW APP

## P1 · FOCUS CONTEXT / ZIPPER PROOF

Consumers:
- READFIELD
- POEM MAP

Goal:
One common descriptor can capture focus + context + return without taking domain authority.

Pass:
- source identity unchanged;
- exact focused address recovers;
- parent/context survives;
- view change does not mutate source;
- local edit commits through host and RETURN restores attention, not data.

If only one host benefits, do not promote shared structure.

## P2 · TYPED COMPOSITION / FORMULA PROOF

Use existing `relations[]`; no core schema change.

Three fixtures:

1. four-line poem;
2. three-source Fold//Bloom set;
3. detachable rail/panel assembly.

Each fixture must serialize:
- parts;
- typed ports;
- n-ary relations;
- constraints;
- operators;
- return.

Render the same descriptor as:
- plain formula;
- node/hypergraph;
- flower/radial glyph.

Pass only if all three projections preserve exact identities and declared residue.

## P3 · PRESERVED-INTERFACE REWRITE PROOF

One transform per fixture.

Require:
- L / before;
- K / preserved addressed interface;
- R / after;
- authority;
- preconditions;
- evidence;
- RETURN.

Pass if the operation is independently understandable without project lore.

---

# PROMOTION THRESHOLDS

Promote a shared mechanism only when:

1. at least two independent current hosts need it;
2. it removes duplicate code/state or enables a previously impossible lawful operation;
3. exact identity + RETURN survive;
4. residue is explicit;
5. host authority does not migrate upward;
6. one human task becomes easier or one real capability becomes possible;
7. the public surface does not gain another peer destination.

---

# ANTI-CONVERGENCE / STOP RULES

- Do not expose category-theory terminology in normal UI.
- Do not add Catlab / egg / a graph database merely because their theories are useful.
- Do not label aesthetic alternatives “equivalent.”
- Do not force all relations into RCC, all operations into graph rewrite, or all decisions into VCSP.
- Do not let formula/glyph become source authority.
- Do not add a universal ontology for every domain.
- Do not make another dashboard showing this map.
- Do not implement P2/P3 in shared core before fixtures demonstrate independent reuse.

---

# CURRENT BEST HYPOTHESIS

The collaboration is converging toward neither “one app” nor “one database.”

It is closer to:

> **addressed sovereign objects + composable local contexts + typed relations/ports + few authority-bearing rewrites + unequal projections + explicit derivation + exact RETURN.**

A lawful projection may be:
- text;
- graph;
- flower;
- glyph;
- ring;
- room;
- game;
- physical mechanism.

The projection does not become the object.

A lawful operation must say what changed, what remained, why it was permitted, and how the collaboration returns.

That is enough theory. The next meaningful move is P1 or P2, not another architecture document.
