# LENS / COMPOSITOR / TRANSDUCTION — recovery + recce fixed point

Date: 2026-09-23  
Status: RECOVERED + RECONSTRUCTED + EXTERNAL RECce; no new sovereign app  
Rule: recover mechanisms, preserve unequal meanings, compose only where contracts survive.

## 0. What this packet is

This consolidates the interface-lens thread that has been distributed across:

- old `xd` / INTERPHASE optics + transducer work;
- Scale Lens / LensState / Focus Ring;
- AXIAL / STATE × TRANSFORM / AXIAL COMPOSITOR;
- FOLD//BLOOM LISTEN addressed-stream ring;
- READFIELD / APERTURE / RSVP;
- ROOM / RADIAL / FAN / physical dial experiments;
- the newer thought about hylomorphism, categorical transducers, bow-tie/hourglass topology, linear→ring→spiral projection, semantic zoom and foveation.

It is not a claim that all of those were historically one project. The convergence is the present reconstruction.

---

# 1. OBSERVED / EXACTLY RECOVERED

## 1.1 Old functional optics + transducer substrate

Recovered historical code/material contains a minimal Lens family with getter/setter/over-style operations and composition/path experiments, alongside reducers/transducers such as `xduce`, mapping and filtering. Later reconstruction named the bridge `mapLens`: focus a part, transform it inside a stream pipeline, rebuild the whole.

Historical donor semantics:

```
source object
  → lens focus
  → transform focused value
  → rebuild source
```

The important survival is not syntax. It is that **focus itself is composable data**.

The current repo's `TRANSDUCTIONS` registry correctly treats that donor as evidence, not as proof that old `xd` already implemented today's FIELD laws.

## 1.2 Current Lens system already separates three meanings

The current Lens contract is stronger than our recent READFIELD ring by itself. It explicitly distinguishes:

### DATA_LENS
Getter/setter optic into canonical data.

Core laws:
- GetPut
- PutGet
- PutPut (strong / “very well behaved” form)

### VIEW_LENS
A pure/preview projection over an addressed object or range.

Current laws:
- identity is not invented by projection;
- same source + params + version → same derived view;
- aperture declares what it reveals/suppresses;
- provenance follows derived marks;
- view movement/zoom/filter/stack does not silently COMMIT;
- RETURN remains exact;
- a plain readable baseline remains reachable.

### ACTION_TOOLGLASS
A lens-like interface that may mutate canonical state.

Current laws:
- PREVIEW ≠ COMMIT;
- authority visible before consequence;
- COMMIT emits append-only evidence/receipt;
- rollback is compensation/RETURN, not erased history.

This distinction should survive everything below.

## 1.3 LensState / Focus Ring

Current canonical grammar:

```
HOST SELECTS OBJECT
  → APERTURE
  → VIEW
  → ORDERED STACK
  → optional ACTION
  → RETURN
```

Current state components already include stable object identity, local address/focus, aperture level/range, projection, ordered lens stack, operator, provenance/source refs and return address.

Composition is explicitly:
- ordered;
- typed;
- inspectable;
- not assumed commutative;
- unsupported candidates remain visible with reason rather than being coerced.

This is already close to the desired “lens composition instrument.” The missing piece is mainly **a better operational representation**, not another state model.

## 1.4 AXIAL / STATE × TRANSFORM

Recovered STATE × TRANSFORM v0.3 is a more operational ring/cylinder ancestor than the current READFIELD decoration.

Discrete semantic rings:
- OBJECT = FIELD / NODE / PANEL / BLOOM
- OPERATOR = SCALE / ROTATE / PHASE / APERTURE
- FRAME = WORLD / LOCAL / LENS / SOURCE

Continuous body:
- axial slide = 0–60 mm
- twist = −180°..180°

Transaction:
- SAFE
- TEST
- ARM
- RUN
- RETURN receipt

The fixed index/reference spine reads the aligned state. Physical topology was intended to carry computation with low translation cost.

This is the key donor for making a ring **meaningful** rather than merely informative.

## 1.5 LISTEN addressed-stream lens

LISTEN clarified another independent axis:

```
SOURCE
  → ADDRESS
  → APERTURE
  → PROJECTION
  → PIN / ANNOTATION
  → RETURN
```

Critical interaction split:
- horizontal motion = address/scrub;
- vertical motion = aperture/scale;
- annotations bind to source identity + position;
- audio vocabulary remains host-local (BEAT/PHRASE/SECTION/TRACK), not universal ontology.

LISTEN is therefore not just “a waveform app.” It is a **stream lens**.

## 1.6 READFIELD / APERTURE

READFIELD preserves one canonical text position across semantic scales:

```
DOCUMENT
SECTION
PARAGRAPH
SENTENCE
PHRASE
WORD
GRAPHEME
```

READFIELD's strongest law remains:

> one source + one canonical position; projection changes do not create a second source.

The recent FOCUS convergence imported ring geometry, but direct use immediately exposed that geometry without stronger operations feels weaker than earlier AXIAL / room experiments.

## 1.7 Physical FAN / Z8 dial

The recovered poly-cyclic fan/dial proves another useful primitive:

- one fixed source ring;
- one rotating reading disc;
- discrete 45° detents;
- a fixed reading relation;
- eight turns return to home;
- one wheel yields 64 pairings across two eight-item vocabularies.

Again: rotation is valuable when **alignment itself computes a relation**.

---

# 2. FORMAL CLARIFICATION

## 2.1 Hylomorphism

A hylomorphism is formally a fold after an unfold:

```
input
  --anamorphism / unfold-->
virtual recursive carrier
  --catamorphism / fold-->
result
```

The fused form avoids fully materializing the intermediate carrier.

Useful UI interpretation:

```
canonical source + focus request
  → generate only the locally needed structural neighborhood
  → immediately reduce/project it into visible geometry
```

Do **not** equate this with a Lens. A hylo describes recursive producer/consumer computation. A Lens describes focus/update or, in our broader UI vocabulary, lawful addressed projection.

Potential engineering consequence: READFIELD/LISTEN/Atlas should not need to construct an enormous full spiral/ring/tree merely to render the currently visible aperture. Unfold the needed carrier and fold it directly into display/evidence.

Reference: Meijer, Fokkinga, Paterson, *Functional Programming with Bananas, Lenses, Envelopes and Barbed Wire* (1991), DOI 10.1007/3540543961_7.

## 2.2 Categorical transducers

Jürgensen & Vogler define categorical transducers as a generalization of catamorphisms and prove a setting in which the class forms a category and **composition is fusion**; for top-down tree transducers, syntactic composition corresponds to fusion of top-down categorical transducers.

This is genuinely relevant, but boundary:

- our old/current `xd` transducers are **not thereby proven to be categorical transducers** in that formal sense;
- the useful donor is the idea that composition can fuse away intermediate representations while preserving composition semantics.

Reference: Jürgensen & Vogler, “Syntactic composition of top-down tree transducers is short cut fusion,” *Mathematical Structures in Computer Science* 14(2), 2004, DOI 10.1017/S0960129503004109.

## 2.3 Bow-tie / hourglass topology

Bow-tie architecture is a different claim:

```
many inputs
     \  |  /
     NARROW WAIST
     /  |  \
many outputs
```

For this collaboration the useful reconstruction is:

```
many carriers / adapters
    ↓
CANONICAL OBJECT + IDENTITY + ADDRESS + APERTURE + AUTHORITY
    ↓
many unequal projections / operations / returns
```

This is close to the Internet “narrow waist” intuition and biological bow-tie descriptions, but we should call it simply a **narrow canonical waist** unless the stronger analogy is useful.

### Relationship among the three

- **Lens** = what is focused/projected/updated and what laws survive.
- **Hylo / fusion** = how a derived representation can be computed without materializing unnecessary intermediate structure.
- **Bow-tie** = where the stable narrow interoperability layer sits between heterogeneous inputs and outputs.

They can coexist without being synonyms.

---

# 3. THE LINE → RING → SPIRAL OPERATOR

This has recurred for years and can finally be stated without claiming the ring is the source.

Let canonical source position be a linear or normalized address `u`.

For one finite/repeating cycle:

```
theta = 2π * frac(u)
```

The simplest ring therefore deliberately **forgets turn count**. That is correct for genuinely cyclic state; dangerous for chronology or an unbounded stream.

To preserve progression, add a second coordinate.

Archimedean-style:

```
turn = floor(u)
r = r0 + k * turn
theta = 2π * frac(u)
```

or a continuous spiral:

```
theta = 2πu
r = r0 + k*theta
```

A logarithmic spiral uses exponential radius growth instead.

### Projection law

```
LINEAR ADDRESS = canonical
RING           = modulo/cyclic projection
SPIRAL/HELIX   = cyclic projection + progression witness
```

Top-down view of a helix/spiral can visually collapse back toward a ring; therefore turn/depth must remain recoverable by radius, height, scale, texture, opacity, labels, or perspective. **Occlusion is not semantic deletion.**

This gives a concrete answer to the infinite-scroll frustration:

- normal scroll has address but poor global orientation;
- a simple ring has global cyclic orientation but aliases different turns;
- a spiral/helix can preserve both local cyclic structure and monotonic progression;
- semantic zoom/foveation decides how much of distant turns is actually rendered.

---

# 4. “HOMOICONIC RING” — KEEP THE CLAIM NARROW

In programming-language terms, homoiconicity has a strong meaning: program and data share a representation.

The ring can earn a weaker but useful UI meaning:

> **the same marks that display state are directly manipulated to change lawful projection/state.**

Examples:
- E6B: scales are both representation and calculator.
- Luopan: concentric inscriptions are both semantic lookup and orientation instrument.
- phoropter: selected optical elements are both state and operative transformation.
- STATE × TRANSFORM: aligned rings both show and specify command state.

Call this **self-describing / operationally isomorphic control** unless we deliberately implement code/data equivalence.

---

# 5. EXTERNAL INTERFACE RECce — DONORS, NOT TEMPLATES

## 5.1 Acko / Tools for Thought — strongest conceptual donor

Steven Wittens' Fourier visualizations take a linear waveform and literally **twist it into the complex plane**. Changing twist rate tunes the analysis to frequency; averaging then collapses the old dimension while exposing amplitude/phase, and a whole frequency axis can be built from many twist rates.

This is extremely close to the deeper intuition behind LISTEN:

> a projection may be a computation, not decoration.

A lawful warp can reveal a property that is obscure in the original coordinate system.

Reference: https://acko.net/files/gltalks/toolsforthought/

## 5.2 Pad++ / semantic zoom

Pad++ treats space and scale as fundamental organization, with objects able to change representation as scale changes rather than merely becoming larger.

Direct donor:
- Scale Lens should be **semantic zoom**, not CSS zoom.
- entering an object may change representational grammar while preserving identity.

## 5.3 Furnas fisheye / Table Lens / DateLens

Fisheye and focus+context systems preserve high detail near focus while compressing or simplifying distant context.

Direct donor:
- FOVEA / PARA / PERIPHERY is a legitimate UI family.
- compression must remain task-dependent.
- current evidence still says our FIELD foveation itself did not yet earn promotion.

Table Lens is especially important because it **fuses symbolic and graphical representation** into one adjustable view rather than switching between “data” and “visualization.”

## 5.4 Perspective Wall

The Perspective Wall folds a long linear information structure into a detailed center plus receding contextual wings.

Direct donor:
- before forcing a line into a circle, sometimes a **folded linear topology** preserves chronology and context better.
- LINE → WALL/FOLD is another lawful projection beside LINE → RING/SPIRAL.

## 5.5 Secret of Mana Ring Command

Square Enix's Ring Command lets the user select items/actions without leaving the action scene; multiple rings/hierarchies are navigated as a spatial command structure.

Direct donor:
- ring as **command aperture over current context**, not a separate dashboard;
- current object/world remains visible beneath/around it;
- important warning: deep ring hierarchies lose path/context unless ancestry remains visible.

## 5.6 Metroid Prime visor

The visor is a world lens: scan/thermal/other modes change what becomes legible while keeping the embodied viewpoint stable.

Direct donor:
- projection changes should alter affordances and readable features, not merely palette;
- the host/world remains canonical; visor is a mode of inspection.

## 5.7 Dead Space diegetic state

Health/status is embedded in the character/equipment rather than floating as a detached HUD.

Direct donor:
- state witness should live as close as possible to the object it describes.
- this reinforces FIELD's move from detached cockpit to inline Toolglass.

## 5.8 Outer Wilds ship log

The same accumulated evidence can be viewed by place/map or by relation/rumor graph.

Direct donor:
- unequal views over the same evidence object;
- useful relations emerge from play without making the graph a second canon.

## 5.9 Curta calculator

The Curta is a compact cylindrical computer:
- digit sliders encode input;
- crank executes;
- crank position/mode changes operation;
- counters expose result and operation count;
- repeated physical operations implement multiplication/division.

Direct donor:
- discrete setup + one embodied execute gesture;
- visible mechanism/state;
- **input / operator / commit** are mechanically distinct.

## 5.10 Circular slide rule / E6B flight computer

Circular slide rules align scales so a fixed/readable relation becomes a computation. E6B flight computers specialize this for time/distance/wind/airspeed/navigation.

Direct donor:
- **alignment computes**;
- many formulas can inhabit one compact surface because scales have declared relationships;
- fixed index/cursor separates reading from rotation;
- cyclic wrapping removes end-of-scale discontinuity, but precision/legibility costs rise with density.

## 5.11 Luopan

A luopan contains many concentric semantic rings under a fixed cross-line/index. Rotation aligns direction with several interpretive vocabularies simultaneously.

Direct donor:
- many unequal vocabularies can share one fixed aperture/index;
- ring count does not imply semantic sameness;
- the crosshair/index is as important as the rings.

## 5.12 Trial lenses / phoropter

Optometric trial systems combine spherical/cylindrical/prismatic lenses, and a phoropter selects/rotates optical elements while preserving one viewing target.

Direct donor:
- lens composition is **ordered physical transformation of one source/view**;
- some dimensions compose simply, others interact with axis/orientation;
- changing the lens does not change the viewed object.

This is almost embarrassingly close to the intended LensState mental model.

## 5.13 Cryptex / combination lock

Useful only for a narrower concept:
- several rings must align to a valid state;
- wrong combinations remain mechanically possible but non-authorized;
- successful alignment opens a gate.

Donor:
- **support/compatibility gate**, not general navigation.

Do not promote the “cryptex aesthetic” unless there is a real gated operation.

---

# 6. FRACTAL / SCALE EXPERIENCE

The “zooming into a Mandelbrot” intuition belongs here as a **representation experience**, not a source ontology.

Relevant distinction:

- geometric zoom = same representation larger/smaller;
- semantic zoom = representation changes with scale;
- recursive/fractal zoom = changing scale reveals structurally related but not necessarily identical organization.

The sensory-health observation also has some evidence, but should remain a design prior rather than a law. Studies report preference and physiological effects for mid-range visual fractal dimensions, often around D≈1.3–1.5; a 2025 VR interior study found mid-range fractals supported stress recovery on some physiological measures. This does **not** justify “1.4 is universally healthy.”

Possible use:
- peripheral texture / overview density;
- avoid both sterile emptiness and maximal visual noise;
- test, do not hard-code 1.4 as doctrine.

---

# 7. RECONSTRUCTED CONVERGENCE

The clearest current object is not “the ring.”

It is:

```
                    ┌─ LINE / SCROLL / MINIMAP
                    ├─ RING / DIAL
SOURCE@IDENTITY     ├─ SPIRAL / HELIX
      ↓             ├─ ROOM / FAN
ADDRESS             ├─ RSVP
      ↓             ├─ GLYPH / ATLAS
APERTURE            └─ AUDIO / WAVE / FIELD
      ↓
ORDERED LENS STACK
      ↓
OPERATOR / TOOLGLASS
      ↓
PREVIEW / TEST
      ↓
COMMIT? ── authority gate
      ↓
EVIDENCE / RETURN
```

The narrow waist is:

```
IDENTITY + ADDRESS + APERTURE + ORDERED TRANSFORM CONTRACT + AUTHORITY
```

Everything else is carrier/projection.

## The ring's lawful jobs

A ring earns screen area only if it does at least one of:

1. **compactification** — wraps an otherwise unwieldy scale into a manipulable instrument;
2. **alignment** — relative rotation computes a relation;
3. **cyclic state** — topology genuinely wraps;
4. **fixed-aperture comparison** — unequal vocabularies move beneath one index;
5. **composition** — ring stack visibly expresses ordered transforms;
6. **orientation** — gives progress/context that the linear view lacks.

If none apply, use a line, strip, list or ordinary controls.

---

# 8. PROPOSED REIFICATION — NOT A NEW APP

Working name only: **FOCUS COMPOSITOR** / **LENS INSTRUMENT**.

Implement as a renderer/controller over existing `LensState`, `TRANSDUCTIONS`, addressed-stream and APERTURE contracts.

## Visual/physical grammar

```
CENTER
  canonical identity / current focus

INNER RING
  aperture / semantic scale

MIDDLE RING(S)
  ordered VIEW_LENS stack
  each ring has one declared input/output contract

OUTER / INDEX RIM
  operator / frame / compatibility witness

FIXED SPINE
  reads current aligned composition

AXIAL DEPTH / ZOOM
  semantic depth / foveation / scale-space

TWIST
  relative alignment / lens selection

LINEAR SCRUB
  canonical address traversal

TEST / ARM / RUN
  only appears when current top element is an ACTION_TOOLGLASS
```

The important restoration from STATE × TRANSFORM is that **movement has typed meaning**.

## Stream rendering / hylo implementation

For long text/audio/data:

```
seed = {sourceId, address, aperture, lensStack}

unfold(seed)
  → only the structural cells needed around current aperture

fold(cells)
  → current ring/line/spiral/RSVP projection

fusion
  → no giant intermediate document geometry required
```

This is the correct place to use the hylomorphism idea.

## Homoiconic-ish condition

The instrument becomes genuinely self-describing when:
- each visible ring corresponds to a real typed LensState descriptor;
- rotating/removing/reordering that visible ring changes that exact descriptor;
- exported state recreates the same instrument;
- no hidden parallel UI state is required.

That is a strong, testable property.

---

# 9. WHAT TO BUILD NEXT — SMALLEST MEANINGFUL DELTA

Do **not** build another dashboard or a fourth audio/reader surface.

Use one existing host—preferably Scale Lens deep lab or READFIELD FOCUS—and add an **instrument mode** that proves only:

1. one stable source/object;
2. one fixed index/spine;
3. aperture ring;
4. two typed composable VIEW_LENS rings;
5. reorder/remove rings and see result immediately;
6. export/import exact LensState;
7. unsupported composition stays visible as SUPPORT=0;
8. no canonical mutation;
9. optional ACTION_TOOLGLASS shows TEST→ARM→RUN only when authority exists;
10. same state can render as STRIP and RING to prove geometry is projection.

Success is not “looks futuristic.”

Success is:

> The user can infer what the current transformation is, alter it physically/spatially, and RETURN without translating through a second abstract control panel.

---

# 10. QUESTIONS / UNKNOWNS

- Exact old red-dot-around-ring RSVP/foveated artifact remains unrecovered.
- Exact earliest ROOM/radial device that the user remembers as “more mature” may still contain control semantics not yet recovered.
- Need to recover whether older ring/room experiments had **continuous scale-space** or merely discrete selection.
- Need to determine whether LISTEN's waveform ring can become a generic stream projection without losing its strong audio-specific usefulness.
- “Homoiconic” should remain provisional until state representation and manipulation are literally the same serialized grammar.
- Fractal dimension should remain experimental/peripheral; no universal health claim.
- Named compound-lens presets remain unpromoted until repeated use proves them.

---

# RETURN

### Current best reconstruction

```
OBJECT@ADDRESS
  → APERTURE
  → ORDERED LAWFUL LENS STACK
  → PROJECTION
  → optional OPERATOR
  → PREVIEW / TEST
  → COMMIT if authorized
  → EVIDENCE
  → RETURN
```

### Deep mechanism

**One canonical thing; many lawful readings; transformations are explicit; composition is typed; geometry is an instrument only when alignment/scale/focus itself computes.**

### Stop

No new sovereign Lens product.  
Recover the older mature ROOM/AXIAL control semantics before adding new ornaments.  
Next implementation should transplant one operational semantic into an existing host and compare RING vs STRIP under the same exact state.
