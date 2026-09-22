# SOURCE SPINE → ADDRESSED CONTINUITY
## A cross-domain abstraction note · 2026-09-22

**Status:** explanatory / research synthesis.  
**Not:** a new app, schema mandate, universal ontology, or replacement for existing project names.

SOURCE SPINE emerged inside FOLD//BLOOM, but the transferable mechanism is more general.

A useful provisional name for that mechanism is **ADDRESSED CONTINUITY**:

> an object keeps a recoverable identity and canonical place while scale, projection, operator and representation change around it.

This is close to the existing Scale Lens law, but it fills a different gap.

- **Scale Lens** describes lawful refraction: object → aperture → projection → operation → RETURN.
- **Addressed Continuity** describes the minimal state that must survive those refractions so the person does not lose the object or their place inside it.

The two are complementary.

---

## 1. Minimal contract

For an object **O**, preserve:

```
IDENTITY       exact object/provenance
ADDRESS        canonical place inside the object
APERTURE       current scale / window / resolution
EVIDENCE       derived observations, explicitly non-authoritative
CALIBRATION    human-authored tuning/bindings
MARKS          human-authored addressed meaning
PROJECTION     current view / embodiment / interface
RETURN         durable path back + consequential changed state
```

The continuity state can be thought of as:

```
SPINE(O) =
  identity
  + canonical address
  + aperture
  + refs to evidence
  + authored calibration / marks
  + projection witness
  + return path
```

It should usually carry **references and coordinates**, not duplicate the source.

---

## 2. Invariants

### Identity survives projection

A waveform, road, glyph, paragraph, room plan or trace can be a lawful reading of one object.

None becomes a new object merely because the representation is compelling.

### Address is not display position

The canonical address may be:

- seconds in audio;
- character/byte index in text;
- source + local offset inside a set;
- file/line/symbol in code;
- cell/path/coordinate in a room;
- event/time in a dayline.

A projection may bend, zoom, reorder visually or animate around that address.

It must not silently rewrite the address.

### Aperture changes resolution, not identity

BEAT → PHRASE → SECTION → TRACK and WORD → SENTENCE → PARAGRAPH → DOCUMENT are structurally similar because both alter **what neighborhood is visible around one place**.

The shared abstraction is APERTURE.

The vocabulary inside the aperture remains domain-specific.

### Evidence and authorship stay separate

Machine-derived:

- BPM;
- flux;
- section estimates;
- syntax tree;
- sensor readings;
- embeddings;
- inferred regions.

Human-authored:

- pin;
- label;
- alignment anchor;
- path;
- seam choice;
- BLOOM/FOLD/SPLIT/RETURN;
- note;
- acceptance/rejection.

A projection may combine them.

It must not launder one into the other.

### Calibration changes interpretation, not source truth

Examples:

- lyric offset / future anchor-warp;
- ride solidity / immersion;
- reading WPM;
- sensor calibration;
- viewport preferences.

Calibration is a human-authored lens/profile.

It belongs beside evidence, not inside evidence.

### A persistent witness may fade

The source-spine rail idea is powerful because it can be present without becoming the foreground interface.

A lawful witness can show:

- where am I?
- at what scale?
- what object?
- what marks/boundaries matter nearby?
- which projection am I in?
- how do I RETURN?

Then it can recede.

This is not decoration. It reduces re-entry cost and orientation loss.

### RETURN closes the loop

Without RETURN, the system becomes a sequence of views.

RETURN carries:

- changed authored state;
- provenance;
- enough address/context to resume or share;
- explicit non-carried source material where required.

---

## 3. What transfers from FOLD//BLOOM

Transfer these:

- exact identity before projection;
- canonical address;
- aperture;
- source/evidence/authorship boundary;
- persistent low-clutter orientation;
- marks anchored to the object;
- explicit transitions;
- reversible preview/autopilot;
- RETURN.

Do **not** automatically transfer:

- BPM;
- spectral bands;
- terrain;
- racers;
- combo/streak logic;
- BLOOM/FOLD/SPLIT/RETURN as literal UI vocabulary;
- music-specific event semantics.

The abstraction is the addressing/continuity law, not the skin.

---

## 4. Domain projections

### Audio / FOLD//BLOOM

```
object      = exact audio source
address     = source time
aperture    = beat / phrase / section / track
evidence    = AUDIO MAP
calibration = RIDE profile / text alignment
marks       = pins / authored landmarks
projection  = LISTEN / LIVE / ATLAS / READ
return      = map/path/profile/set packet
```

### Text / READFIELD

```
object      = exact text/source
address     = canonical character/source index
aperture    = grapheme / word / phrase / sentence / paragraph / section / document
evidence    = segmentation / xrefs / source structure
calibration = WPM / voice / focus preferences
marks       = notes / locks / annotations
projection  = PAGE / RSVP / VOICE / path
return      = source address + reader state + authored marks
```

The key transfer is not “music controls reading.”

It is that **the same place survives a change of reading mode and scale**.

### Repository / code work

```
object      = commit/artifact/repository identity
address     = file / line / symbol / object id
aperture    = repo / package / file / function / expression
evidence    = tests / trace / diff / static analysis
calibration = local environment / execution profile / view settings
marks       = task intent / review note / accepted change
projection  = source / diff / trace / runtime / docs
return      = commit / patch / receipt with provenance
```

This is one reason FIELD / Lens / TRACE work and Source Spine feel related.

A strong coding assistant should preserve the same addressed object while moving source → diff → runtime → proof, rather than forcing the human to reconstruct context each time.

### Room / physical object / House work

```
object      = exact room / device / build
address     = wall / region / part / coordinate / component
aperture    = house / room / surface / assembly / part
evidence    = measurements / photos / sensors / inventory
calibration = tolerances / user preference / temporary setup
marks       = cut line / hazard / intended route / task
projection  = photo / plan / AR-like overlay / instructions / sensor view
return      = changed physical state + evidence + next address
```

The transferable technology is orientation and provenance across representations, not a 3D cube UI.

### Messages / HUMAN PORT / communications

```
object      = exact conversation/message bundle
address     = thread / message / passage / claim
aperture    = corpus / thread / message / sentence
evidence    = delivery/status/source metadata
calibration = tone / routing / audience constraints
marks       = promise / decision / unresolved ask
projection  = chat / summary / task / letter / receipt
return      = bounded response + provenance + open obligation
```

This suggests a powerful use: an ask can survive transformation into plan/task/response without being lost inside summaries.

### Dayline / planning / life-log

```
object      = day / event stream
address     = time/event
aperture    = moment / block / day / week
evidence    = calendar / sensor / completion receipts
calibration = energy / priority / pacing
marks       = intent / commitment / interruption / return point
projection  = radial / linear / map / checklist
return      = changed schedule + completion evidence
```

Again: one day, many projections.

---

## 5. Why this matters

A common failure mode in complex tools is **projection amnesia**:

- open another mode;
- lose place;
- lose provenance;
- lose what was authored vs inferred;
- rebuild context manually;
- create a second copy of the object.

Addressed Continuity attacks that directly.

The gain is not merely navigation.

It enables deeper transformations because the system can move farther away from the original representation **without losing the return path**.

That is why the fading background rail felt unusually powerful: it is a visible symptom of a deeper invariant.

---

## 6. Research neighbors — ingredients, not identity

This synthesis has clear precedents. The point is not to claim novelty for each ingredient.

### Focus + context / fisheye views

George Furnas's **Generalized Fisheye Views** formalized the idea that a local neighborhood may be shown in detail while distant landmarks remain visible.

- Furnas, G. W. (1986), *Generalized fisheye views*. CHI '86.
- DOI: https://doi.org/10.1145/22627.22342

This is close to APERTURE and the desire for a fading contextual rail, but it does not by itself specify canonical cross-projection address, authority boundaries or RETURN.

### Multiscale / zoomable interfaces

Pad++ explored zooming as an alternative interface physics for navigating large information spaces while maintaining an intuitive sense of location and relationships.

- Bederson, B. B. & Hollan, J. D. (1994), *Pad++: a zooming graphical interface for exploring alternate interface physics*. UIST '94.
- DOI: https://doi.org/10.1145/192426.192435

This strongly neighbors Scale Lens and the persistent-place instinct. ADDRESSED CONTINUITY differs by allowing the projections themselves to be heterogeneous — e.g. waveform → terrain → text reader → trace — as long as a lawful address mapping survives.

### Object constancy through transitions

Heer & Robertson showed that animated transitions between related graphics can improve perception and proposed staged transition design principles.

- Heer, J. & Robertson, G. (2007), *Animated Transitions in Statistical Data Graphics*.
- DOI: https://doi.org/10.1109/TVCG.2007.70539

This supports the intuition that continuity is not only a database property: the human must be able to perceive that “this is still the same thing.”

### Provenance + annotation

Visualization-provenance research treats exploration history and annotation as durable material that can be recalled/shared, and later work surveys how interaction provenance can be captured and analyzed.

- Groth, D. P. & Streefkerk, K. (2006), *Provenance and annotation for visual exploration systems*.
- DOI: https://doi.org/10.1109/TVCG.2006.101
- Xu, K. et al. (2020), *Survey on the Analysis of User Interactions and Visualization Provenance*.
- DOI: https://doi.org/10.1111/cgf.14035

This neighbors RETURN, marks and receipts. Our project additionally insists that provenance be tied to a canonical addressed object and that machine evidence remain separate from human-authored meaning.

### What appears distinctive here

The components are established; the **composition** is the useful contribution:

```
exact object identity
+ canonical address
+ multiscale aperture
+ heterogeneous projections
+ explicit evidence / calibration / authorship boundaries
+ low-clutter continuity witness
+ durable RETURN
```

The strongest research claim we should make today is therefore modest:

> CONFLUENCE / FIELD is exploring a cross-domain composition of known continuity, multiscale and provenance ideas around an unusually strict addressed-object / authority / RETURN contract.

That is enough. No novelty claim is needed to make the mechanism powerful.

---

## 7. Relation to current CONFLUENCE / FIELD laws

This mechanism is already latent in several project operators:

- **Scale Lens:** object → address → lens/projection → operation → changed object → RETURN.
- **CELL / PATH / GRID:** place and traversal are distinct.
- **Verse Atlas / READFIELD:** one source position survives many reading projections.
- **AXIAL:** state × transform with explicit continuity.
- **HUMAN PORT:** preserve promises/decisions through transformation and handoff.
- **FOLD//BLOOM:** one source survives map / profile / ride / read / memory / set.
- **ONE RETURN:** transformation only matters if the path back is lawful.

SOURCE SPINE did not invent these.

It made the **continuity state** between them unusually visible.

---

## 8. Research questions worth keeping

These are questions, not active fronts.

- What is the smallest portable continuity state that still gives reliable re-entry?
- When two domains use different canonical addresses, what makes a mapping lawful enough to support shared marks?
- How should lossy address mappings declare uncertainty?
- Can an ambient witness improve orientation without becoming UI clutter?
- Which authored marks should survive aperture changes automatically?
- When does a calibration become important enough to deserve its own explicit object?
- Can one continuity contract support human↔AI handoff without requiring a giant shared transcript?
- Can the same contract improve physical work by linking photos, measurements, instructions and receipts to one addressable object?

---

## 9. Stop condition

Do not build “Addressed Continuity” as a standalone framework because this note exists.

Earn it by transfer.

A transfer counts only when an existing domain has a real orientation/provenance problem and the minimal contract solves that problem with less surface area than a bespoke mechanism.
