# PROJECT / SCALE MAP — 2026-09-28

**Status:** ORIENTATION / PROJECT-MANAGEMENT PROJECTION  
**Authority:** NONE  
**Reads from:** `control/CURRENT.json`, `showcase-manifest.json`, native release/RETURN records  
**Does not own:** priority, project truth, host state, execution authority, backlog, scheduling

This file exists to make the collaboration easier to hold at several scales without creating another dashboard, ontology, queue, or project registry.

The immediate trigger is the recent observation that **a glyph could itself be an entire dashboard**: not an icon for a project, but a compressed, scale-dependent reading of one addressed thing whose internal state can unfold without losing identity.

The management problem is therefore not “how do we list all projects?” It is:

> how do we move from one exact object, to its host, to its lineage, to the larger FIELD, and back again without losing what is current, what is proved, what is merely research, or who owns the next move?

The answer should reuse the existing substrate rather than add a new control plane.

---

## 1. WHAT TODAY ACTUALLY CHANGED

Today's merged work looks scattered if read as PR titles. At a higher scale it concentrates around a small number of recurring mechanisms.

### A. ADDRESSED PATH SPACE BECAME EXPLICIT

Merged PR #480, **FIELD LAB path-space: indexed STEP → FLOW → RETURN**:

- every moving-line STEP order is now exactly addressable;
- `k!` path ambiguity is explicit rather than hidden;
- selected path index survives into LAB / Applied Calc / RETURN;
- FLOW is preview-only;
- endpoint change is no longer treated as if it uniquely specifies process.

For six moving lines this means 720 lawful orderings can be addressed rather than collapsing to a default/reverse pair.

This is not “more I Ching UI.” It is a general proof that:

```
same endpoints
≠
same path
```

and that a path can be given identity, stepped through, witnessed, and returned.

### B. CAUSAL STEERING WAS MADE MORE HONEST, NOT MORE POWERFUL

Merged PR #478, **CHANGE CALCULUS: causal steering promotion proof**:

- causal promotion is now a visible set of proof obligations;
- current computed gate remains BLOCKED;
- current real-model observation is preserved as a negative result rather than repaired by interpretation;
- support / legibility / permission remain distinct.

Current result:

```
4 / 10 obligations PASS
6 / 10 FAIL
→ BLOCKED
```

This is useful project state. J-space is not “behind”; it is a research instrument with a named missing evidence class.

### C. MATERIAL TRAVERSAL / RE-ENTRY BECAME STRONGER

READFIELD ↔ LIVE work now has:

- exact source identity;
- addressed SENTENCE / PARAGRAPH / SECTION traversal;
- bounded trail evidence;
- exact cursor RETURN;
- fail-closed stale/malformed return handling.

Sleeper donor work now has:

- full same-world RouteWitness;
- exact route reconstruction;
- ghost replay;
- explicit distinction between same-world comparison and different-world residue.

These are unequal systems, but they now share a recurring shape:

```
SOURCE / WORLD
→ ADDRESS
→ PATH
→ STEP / VISIT
→ WITNESS
→ RETURN
```

Do not merge their semantics. Notice the transferable mechanism.

### D. SLEEPER / NINE GATE PUSHED EXPERIENCE, NOT JUST STRUCTURE

The Nine Gate work today made threshold re-entry explicit and continued a city-first transformative UX.

This matters because Sleeper is one of the places where the architecture is tested as an actual encounter rather than only a control surface.

The useful pressure is:

> can address / path / gate / return remain legible while the experience is still strange, gripping and worth entering?

That requirement should constrain the rest of FIELD. Correct architecture that produces dead interfaces is not enough.

### E. BOOT / CONTROL PLANE CONTRACTED

Merged PR #470 moved agent boot toward a bounded JIT transcript before deep CURRENT.

This is a project-management result, not only an agent optimization:

- canonical depth may remain large;
- active cognitive payload should be small;
- authority source and mandatory reading payload are not the same thing.

That same rule should govern human project orientation.

---

## 2. THE ZOOM-OUT: FEWER PROJECTS THAN IT LOOKS LIKE

Do not read every route, PR, branch, or named experiment as a peer project.

A useful current grouping is:

### FAMILY 1 — HOLD / ADDRESS / SCALE

Primary hosts:
- FIELD INDEX
- INTERPHASE
- Scale Lens
- FOVEA
- AXIAL
- FIELD glyph machinery

Question:

> What exact thing am I holding, at what scale, through what projection, with what lawful operations and RETURN?

This family owns orientation mechanics, not domain truth.

### FAMILY 2 — PATH / TRAVERSAL / RE-ENTRY

Primary hosts:
- READFIELD ↔ LIVE
- Sleeper / RouteWitness / Nine Gate
- STEP / FIELD LAB path-space
- LOCI and route-like projections where exact address survives

Question:

> How did this addressed thing move through state/space, and can the route be replayed, compared, resumed or returned without pretending the path is the endpoint?

### FAMILY 3 — TRANSFORM / CORRESPONDENCE / STEERING

Primary hosts:
- CHANGE CALCULUS
- I Ching correspondence lens
- J-space / J-Lens
- host-native forecast / lawful candidate mechanisms

Question:

> What transformations are structurally possible, what evidence supports a candidate, what ambiguity remains, and what would justify intervention?

This is currently a **research/proof family**, not a production control layer.

### FAMILY 4 — EXPERIENCE / EXPRESSION

Primary hosts:
- FOLD//BLOOM
- Verse Copilot / Poem Map
- Sleeper / Nine Gate
- REPLAY / LISTEN / INK / VOICE

Question:

> Can the same underlying source become readable, playable, memorable, expressive, embodied or shareable without losing its identity or laundering one projection into another's authority?

This family is where delight and causal legibility have to coexist.

### FAMILY 5 — WORLD LOOPS

Primary hosts:
- Dayline
- HOUSE
- Shopping
- HUMAN PORT / COMMS / CONTACT
- BODY / CARE where appropriate

Question:

> How does an addressed intention/contact/object reach reality, acquire evidence, and return to its native owner without status laundering?

This is the conversion frontier.

### FAMILY 6 — RECOVERY / PROVENANCE

Primary hosts:
- Recovery vault
- Migration / census
- Media refinery
- frozen donor families
- exact historical source

Question:

> Can we recover the source, lineage, contradiction or donor needed by a live conversion without turning archaeology into the work itself?

This remains maintenance unless it unlocks another family.

---

## 3. GLYPH: FROM ICON TO SCALE-CHANGING INSTRUMENT

There are already two important glyph implementations:

### `field-glyph.js`

Tiny route-level compression:

```
kind × operation × state × attention
```

This is good at small scale.

It answers quickly:

- what sort of surface is this?
- what kind of operation is associated?
- what is its lifecycle state?
- is it NOW / HEAD / issue-attended?

It is **not** a dashboard.

### `lib/interphase-glyph.js`

Richer object-level compression already supports:

- identity;
- address;
- content channel;
- depth / scale;
- time;
- authority;
- evidence;
- operations;
- residue;
- focus gate.

This is much closer to the recent intuition.

The important next interpretation is:

> a glyph is not a logo attached to a dashboard; a glyph may be the dashboard at one scale.

It may then unfold into another projection while retaining identity.

### Proposed scale behavior — projection only

This is not a new ontology. It is a view ladder over existing authority.

```
MARK
24–32 px
kind · operation · state · attention

    ↓ open / magnify

OBJECT
80–160 px
identity · address · focus · authority · evidence

    ↓ open / magnify

HOST
160–320 px
current head · 1–3 lawful moves · last witness · residue · RETURN

    ↓ zoom out

LINEAGE
one host among related unequal hosts
current recipient / donors / experiments / blocked evidence

    ↓ zoom out

FIELD
a small constellation of current families and their actual handoffs
not every route
not every donor
not every PR
```

The identity must survive the transition.

The projection may hide information.

It may not silently destroy it.

---

## 4. WHY THE OLDER LINEAGE MATTERS

This is not a new visual fashion.

Recovered prior work already contains the same recurrence:

### SINDERESIS / POLY / FURNISHER

The recovered 2019–2020 lineage repeatedly decomposes one thing into components, then re-projects it through different carriers.

The current `ONE_PRIMITIVE_SYNTHESIS` makes the useful correction explicit:

- six-facet canon;
- radial six-sector chart;
- cube/net chart;
- linear chart;

are **chosen unequal projections of the same addressed identities**, not geometric proof that one form causes the other.

This is exactly the discipline needed for glyph scaling.

### DATADISC / RADIAL DONORS

Radial geometry repeatedly served as a multichannel carrier:

- center = held identity / focus;
- ring = scale/time/context;
- marks = boundaries/events;
- outer positions = operations/relations.

The radial shape is a carrier, not an ontology.

### HOUSE MARKS / PHYSICAL GLYPHS

HOUSE MARKS already frames a mark as a reversible physical projection carrying:

- identity;
- state;
- relation;
- permissible action;
- return path.

The physical interface tile is effectively a dashboard reduced until it can live on an object.

### FAN / FOLD / CASSETTE LINEAGE

Fold, occlusion, fan sectors, cassettes and radial arrangements all test the same question:

> can detail recede while address and recoverability survive?

That is project-management compression as much as it is interface design.

---

## 5. SEMANTIC PATTERN / MOIRÉ: USE AS PRE-ATTENTIVE WITNESS, NOT DECORATION

Recent discussion also points toward pattern carrying state before text is read.

The useful hypothesis is not “make FIELD visually patterned.”

It is:

> can interference, density, alignment, rhythm or breakage make classes of project state perceptible at a glance?

Candidate experiment:

- **aligned / quiet** — no known conflict in the visible projection;
- **phase shift** — state changed since last witness;
- **interference / moiré** — two legitimate readings or obligations overlap unresolved;
- **break / void** — missing evidence / unknown;
- **edge pressure** — human/world gate;
- **return closure** — loop resolved to native owner.

These meanings are **not canonical yet**.

Pattern must beat a plain control in at least one real task:
- faster re-entry;
- fewer mistaken project/state readings;
- better contradiction detection;
- easier recognition at small scale.

If it does not, retain the structural glyph and drop the pattern channel.

---

## 6. PROJECT MANAGEMENT WITHOUT ANOTHER PROJECT-MANAGEMENT SYSTEM

Existing authority is already sufficient:

```
CURRENT
= attention / current heads / next execution law

MANIFEST
= durable public addresses and route state

RETURN
= evidence of what actually changed

CONFLUENCE
= bounded cross-lineage explanation / transfer

NEXUS
= optional derived orientation / coordination view
```

Therefore any project-management surface should be **derived**.

It must not own:
- a second status;
- a second backlog;
- a second “current” field;
- independent deadlines;
- a second project identity;
- autonomous priority.

### Small management record for one family

A family should be readable as:

```
NAME
WHY IT EXISTS

OWNED OBJECT / HOSTS
what actually owns state

CURRENT HEAD
from CURRENT / native release

LAST MATERIAL PROOF
exact RETURN / merge

NOW
at most one selected conversion if CURRENT chose it

NEXT
one bounded candidate move

BLOCKED / UNKNOWN
exact missing evidence

DONORS
only the few that could materially change NEXT

RETURN
where new evidence must land
```

This is enough for a human or agent to re-enter.

---

## 7. TODAY'S PORTFOLIO READING

| Family | Current posture | Strongest recent proof | What not to do next |
| --- | --- | --- | --- |
| HOLD / ADDRESS / SCALE | mature substrate, interface still evolving | FIELD 0.8.15 + recursive INTERPHASE | do not create universal shell/store |
| PATH / TRAVERSAL | high-value convergence | STEP path-space + READ/RIDE exact return + same-world RouteWitness | do not prematurely merge path schemas |
| TRANSFORM / STEERING | research, explicit proof debt | promotion table 4/10 PASS, 6/10 FAIL | do not turn J-space support into action authority |
| EXPERIENCE / EXPRESSION | active product/experience work | Fold/Bloom source continuity + Nine Gate city-first evolution | do not add modes merely to absorb donors |
| WORLD LOOPS | conversion frontier | Dayline/HOUSE/Shopping/Comms explicit bounded handoffs | do not status-launder across hosts |
| RECOVERY | maintenance | JIT boot + exact donor/source discipline | do not forage archive to stay busy |

This is the portfolio.

The dozens of individual surfaces are its implementations, donors, proofs and projections.

---

## 8. FORWARD PATH — THREE MOVES

Do not run all families as active fronts.

### MOVE 1 — PROJECT GLYPH DESCRIPTOR PROOF

**Goal:** prove that the “glyph can be an entire dashboard” intuition is useful without building a new dashboard.

Use the existing `interphase-glyph/v0.1`.

Write only a pure adapter that derives an INTERPHASE glyph descriptor from:

- one `CURRENT.current_heads[]` entry;
- its manifest route;
- its latest RETURN / next executable when present.

No new persistence.

Test on two deliberately unequal heads:

1. **FOLD//BLOOM** — deep, multimodal, many internal apertures;
2. **SLEEPER** or **DAYLINE** — one strong world/path or temporal loop.

A project-scale glyph should expose, without prose scanning:

- stable host identity;
- current state;
- depth / nested apertures;
- 1–3 current lawful operations;
- evidence present / missing;
- authority boundary;
- residue / unknown;
- RETURN.

**Pass:** the glyph can replace a chunk of project-status prose for re-entry while still opening the native host for detail.

**Fail:** it is merely pretty or requires a legend longer than the text it replaces.

### MOVE 2 — ONE ZOOMING PROJECTION INSIDE AN EXISTING SURFACE

If Move 1 passes, do not create `/projects/`.

Use FIELD INDEX or NEXUS.

One addressed head should be readable at three scales:

```
tiny glyph
→ project glyph
→ native host
```

Back/RETURN must restore the same addressed head.

The “zoom” may initially be click/tap/expand rather than graphical camera zoom.

The scale change is semantic first.

### MOVE 3 — MAKE IT EXTERNAL

Pick one thing whose value another human can understand without project archaeology.

Likely candidates:
- Sleeper / Nine Gate encounter;
- one Fold/Bloom READ/RIDE or LISTEN experience;
- a compact project/glyph orientation link if Move 1 proves genuinely useful.

Observe where the recipient gets lost.

Feed that evidence back into the glyph/scale grammar.

Do not optimize the management projection solely for agents.

---

## 9. RESEARCH / DONOR WORK THAT SHOULD NOT OCCUPY NOW

### J-space

Continue only when the named promotion obligations can be materially attacked.

Its BLOCKED state is valid project state.

### PATH UNIFICATION

STEP path-space, READ trail and Sleeper RouteWitness rhyme strongly.

Do not create a universal `Path` object yet.

First write a comparison table:

```
source identity
address unit
ordering
step witness
revisit semantics
world/state mutation
comparison law
return
```

Generalize only fields that survive all three without coercion.

### PATTERN / MOIRÉ

Run as one visual-ablation experiment after project glyph descriptor proof.

Do not make it a theme.

### ANCIENT / RECOVERED FORMAL SYSTEMS

Mine only when they answer a current scaling/composition problem.

Import mechanisms, not cosmology.

---

## 10. MANAGEMENT CADENCE

For this phase:

### On every material merge

Ask only:

1. Which family changed?
2. Did a current head change?
3. What capability became possible that was not possible before?
4. What evidence now exists?
5. Did the visible/cognitive surface get smaller or larger?
6. What, if anything, becomes the next bounded conversion?

If the answer is only “more files / more documentation / another proof of something already proved,” do not promote it.

### Daily zoom-out

Derive a five-line orientation from CURRENT + recent material merges:

```
NOW
WHAT BECAME POSSIBLE
WHAT REMAINS BLOCKED
WHAT CAN BE COMPOSTED / PARKED
ONE NEXT
```

No new daily state file is required unless a durable contradiction must survive.

### Weekly / major phase change

Re-evaluate the six families.

A family may split only when two different authorities or conversion paths can no longer be stated honestly together.

A family may merge only when the same host/state/operation/RETURN actually became shared.

---

## 11. FIXED POINT

The project system should eventually feel less like a repository of apps and more like an addressed field:

```
                FIELD
                  │
       ┌──────────┼──────────┐
       │          │          │
    LINEAGE    LINEAGE    LINEAGE
       │
      HOST
       │
     OBJECT
       │
      FOCUS
```

At every scale:

```
IDENTITY
FOCUS
1–3 MOVES
WITNESS
UNKNOWN / RESIDUE
RETURN
```

The glyph is the compressed carrier.

Opening it is not “go to another dashboard.”

Opening it means:

> show me more of the same addressed thing.

That is the project-management direction to test.
