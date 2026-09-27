# AXIAL APERTURE CONSTRAINT
## Object at center · ring as address/order/clock/scale · residue as evidence
Date: 2026-09-27
Status: IMPLEMENTED CANDIDATE / USER-USABILITY CORRECTION

This is a constraint on the existing FIELD / INTERPHASE / Fold//Bloom family, not a new framework.

It exists because correct mechanisms repeatedly made the wrong thing visually primary: mode names, controls, metadata, derived lenses and diagnostic panels displaced the material the user was actually trying to read, hear, remember, manipulate or traverse.

The repair is deliberately small:

~~~text
                CONTROLS / LENSES
                      orbit

            ┌───────────────────┐
            │       RING        │
            │ address / order   │
            │ clock / scale     │
            │                   │
            │      OBJECT       │
            │      CENTER       │
            │                   │
            └───────────────────┘

                 ↓ interaction

              RESIDUE / MARK
                    ↓
                  RETURN
~~~

## 0. Constraint

For an addressed interactive projection:

> **The current object or current unit of material belongs at the perceptual center.**

Everything else is secondary:
- ring = where / when / at what scale / in what order;
- controls = what may be done;
- derived lens = another way to inspect it;
- marks = what the human actually touched, passed, bookmarked or authored;
- RETURN = how source identity and position survive.

The ring is a shared spatial grammar, not shared semantics.

Do not say every ring means the same thing.

---

# 1. Mode-specific meaning

## READ / READFIELD

Center:
- current word, phrase, sentence, paragraph, JSON node or selected value.

Ring / axial field:
- source progress;
- scale;
- document structure;
- optional borrowed pulse;
- source glyph witness.

Residue:
- exact bookmark / mark;
- address;
- scale;
- cursor;
- source progress.

Law:

~~~text
MARK = I intentionally marked / passed this position
MARK ≠ I understood this
MARK ≠ source truth changed
~~~

For JSON the human-facing view should be:

~~~text
exact $.path
current value / object
direct children
hover preview
click child → exact child path
ring → depth / progress / scale
~~~

not a wall of serialized JSON.

Raw JSON remains available.

---

## DATA / FIELD LAB

Center:
- selected node / key / value.

Ring / graph:
- structural neighborhood;
- depth;
- path;
- order.

Secondary lenses:
- static six-bit state/change projection;
- Change Calculus;
- I Ching lookup;
- J-space host-support preview.

Those lenses must not replace the selected data object.

Working order:

~~~text
DATA OBJECT
→ ADDRESS / PATH
→ SELECT / INSPECT
→ optional CHANGE / J-SPACE / I-CHING lens
→ RETURN
~~~

Not:

~~~text
I CHING / J-SPACE
→ invent what the data means
~~~

### I Ching constraint

Keep it low-key and static.

Use it as:
- a lossy finite change-state view;
- a correspondence lens;
- an explicit quotient of a supplied state transition.

Do not use it as:
- a cast unless the user explicitly casts;
- semantic authority over arbitrary data;
- a replacement for exact state;
- a hidden controller for LAB.

The exact six-bit form remains underneath.

### J-space constraint

J-space is a bounded co-driver.

It may:
- read model-side disposition;
- nominate an existing lawful host operation/aperture;
- narrow candidates;
- show ambiguity.

It may not:
- mutate the source;
- choose a meaning;
- silently commit a host operation;
- displace exact source/path evidence.

A useful DATA question is:

> Given this exact selected object, which already-existing aperture or operation is worth inspecting next?

---

## PULSE

Center:
- current timing lane / immediate timing task.

Rings:
- simultaneous clocks:
  - M = beat/meter;
  - A = subdivision A;
  - B = subdivision B.

Interaction:
- click center → start/stop;
- click ring → tap that lane;
- A ± / B ± → manipulate subdivision counts;
- tap → immediate signed timing error + lock feedback.

Two explicit jobs:

### FREE

~~~text
clock
→ tap
→ immediate timing feedback
→ keep playing
~~~

No curriculum required.

### TRAIN

~~~text
clock
→ staged target lane
→ taps
→ lock / bias / jitter
→ next target
→ RETURN Δ
~~~

Training is optional.

The number of rings stays three for now. Changing ratio changes subdivisions, not ontology.

---

## VOICE

VOICE is its own projection again.

Center:
- current target note / HUM;
- heard pitch relation when microphone is active.

Ring:
- target / deviation / pitch-space witness.

Clock:
- FREE by default.
- PULSE may be explicitly linked as borrowed timing.

Law:

~~~text
VOICE + PULSE can cooperate
VOICE does not belong inside PULSE
borrowed clock ≠ borrowed authorship
~~~

Microphone analysis stays local.
Voice evidence is training evidence, not diagnosis.

---

## REPLAY

Center:
- active authored word;
- if no cue is active, the message itself.

Ring / field:
- source interval;
- operations;
- beat/section evidence;
- playhead;
- experience shaping.

The old layout put the word above the actual geometric center. That violated the axial constraint.

REPLAY is a message artifact. The message belongs in the center.

---

## LOCI

Center:
- current mnemonic item.

Path/ring:
- traversal order;
- previously visited positions;
- next legal/selected position.

LOCI is where the order intuition matters most, but do not call every mnemonic route a mathematical partial order.

Useful distinction:
- total order: one prescribed sequence;
- partial-order-like route: some prerequisites/relations constrain order while multiple next positions remain lawful;
- spatial neighborhood: adjacency without precedence.

Use the strongest exact term supported by the actual route representation.

---

## GLYPH ATLAS / DOCUMENTS

A document needs recognition surfaces just as media does.

A document cell may contain:
- deterministic source glyph;
- bounded source-text thumbnail;
- filename;
- structural witness.

The thumbnail is:
- a recognition cue;
- bounded;
- derived from exact source text;
- not an AI summary.

Law:

~~~text
GLYPH ≠ semantic fingerprint
THUMBNAIL ≠ summary
CELL ≠ source
~~~

Raw source remains session/native-source owned.

---

# 2. INTO

The recurring “go INTO it” abstraction is now concrete:

~~~text
OUTSIDE
collection / document / data / track / world
          ↓
       ENTER
          ↓
INSIDE
one exact addressed unit is central
          ↓
MOVE
step / seek / tap / traverse / RSVP
          ↓
RESIDUE
mark / route / timing trace / authored operation
          ↓
RETURN
same source + changed human history
~~~

This is the useful connection between:
- reading a paper;
- riding a text course;
- RSVP;
- traversing a Sleeper world;
- following a LOCI route;
- moving through AUDIO MAP;
- selecting JSON nodes;
- replaying an authored message.

It is not one universal engine.

It is one interaction constraint across unequal hosts.

---

# 3. Reading progress / responsibility

The user specifically needs an honest answer to:

> Have I actually gone through this thing?

The system must answer only what it has evidence for.

Possible evidence classes:

~~~text
OPENED
VISITED ADDRESS
MARKED
TRAVERSED RANGE
RSVP PASSED
VOICE PASSED
RIDE PASSED
ANNOTATED
RETURNED
~~~

None automatically means:

~~~text
UNDERSTOOD
AGREED
MEMORIZED
VERIFIED
~~~

A future reading trace can aggregate visited addressed intervals.

The first implementation uses explicit marks because they are simple, intentional and honest.

Do not infer comprehension from scroll position.

---

# 4. Fortress connection

The transferable Fortress mechanism remains:

> trajectory leaves residue that changes future affordance.

For document/material traversal:

~~~text
past route
→ visible faint trail / covered interval / intersection
→ easier re-entry / different navigation affordance
~~~

The source itself stays unchanged.

Correct first Fortress experiment:
- mark visited/explicitly traversed positions;
- render residue on the ring/course;
- compare re-entry with residue ON vs OFF.

Do not import combat, territory metaphors or decorative TRON styling unless a concrete function earns them.

---

# 5. Sleeper connection

Sleeper remains the strongest precedent for:

~~~text
LOCAL POV
↔ GLOBAL ROUTE
→ enacted path
→ RETURN
~~~

For reading/data:

~~~text
CENTER OBJECT / POV
↔ RING / COURSE / GLOBAL MAP
→ traversal marks
→ RETURN
~~~

The commonality is structural.

Do not merge world-generation semantics with reading semantics.

---

# 6. Complexity budget

When the system becomes difficult to use, apply this order:

1. What is the exact object in focus?
2. Put that object at center.
3. What single ring/route dimension helps locate it?
4. Show at most the next useful actions.
5. Hide diagnostics/lenses until requested.
6. Preserve marks/residue.
7. Preserve RETURN.

For DATA specifically:

~~~text
DEFAULT:
selected node
path
children
depth/progress

OPTIONAL:
state/change
J-space
I Ching
Change Calculus
~~~

Optional layers should never be prerequisites for ordinary JSON inspection.

---

# 7. Current implementation cut

Branch:
- feat/axial-object-at-center

Implemented candidate changes:

### READFIELD
- structured JSON current-node card;
- exact child-path buttons;
- cursor hover previews;
- exact JSON path preservation;
- MARK / NEXT MARK device-local residue.

### FIELD APERTURE
- structured JSON node witness;
- exact seekPath(path);
- exact path in snapshot;
- source-native scales retained.

### FIELD LAB
- VOICE separated from PULSE;
- eight unequal projections;
- generic mode-name core removed from READ/PULSE/VOICE/DATA center;
- PULSE FREE / TRAIN split;
- direct M/A/B ring tap;
- center start/stop;
- A/B subdivision manipulation;
- VOICE free clock by default;
- optional explicit PULSE clock link;
- selected DATA node moved to center;
- VOICE target moved to center.

### REPLAY
- active word moved to geometric center;
- message fallback occupies center;
- center text exposed as bounded QA witness.

### GLYPH ATLAS
- document entry retains bounded <=180-character recognition thumbnail;
- card overlays thumbnail with deterministic glyph;
- full raw document remains excluded from Atlas packet.

---

# 8. Evidence gate

Before promotion:
- syntax tests;
- bounded-thumbnail privacy test;
- existing LAB mobile + cross-projection tests;
- existing REPLAY addressed-step test;
- new axial browser proof:
  - JSON child click preserves exact path;
  - mark toggles;
  - LAB has eight modes;
  - PULSE defaults FREE and toggles TRAIN/FREE;
  - VOICE is independent and unlinked;
  - REPLAY exposes centered active word;
- full public-surface CI;
- J-space / Change Calculus regressions;
- READ/RIDE regressions;
- frozen Sleeper regressions.

---

# 9. Next experiment after repository proof

Do not add another abstraction.

First real-use experiment:

1. Open a real complex JSON or CURRENT-like object in READFIELD.
2. Navigate only through structured node cards + ring.
3. Mark three useful nodes.
4. RETURN later and use NEXT MARK.
5. Compare against raw JSON scanning.

Then:

1. Open one actual paper/book-like text.
2. MARK as you intentionally pass key sections.
3. RIDE or RSVP through a bounded section.
4. Return the next day.
5. Judge whether route/mark residue reduces re-entry effort.

Only if that succeeds:
- render visited-route residue on ring/course;
- test Fortress-style ghost trail.

---

# 10. Distillation

~~~text
OBJECT AT CENTER
RING LOCATES / ORDERS / CLOCKS / SCALES
CONTROLS ORBIT
LENSES STAY SECONDARY
MARKS RECORD HUMAN PASSAGE
RETURN PRESERVES SOURCE
~~~

For the current complexity problem:

~~~text
DATA first.
CHANGE lens second.
J-space/I Ching only when they answer a concrete question.
~~~

Use this constraint to reject new complexity.
