# INTERPHASE MAPPING / CORRESPONDENCE CONTRACT 0.1

Status: **IMPLEMENTATION CONTRACT**
Updated: **2026-09-23**

## Question

How can FIELD / READFIELD / Lens / Fold-Bloom / forms / rooms / browser pages / recovered artifacts / physical MAKE objects become the same *kind* of interface without pretending they contain the same domain truth?

## Short answer

Do not map **screen to screen**.

Map:

```
HOST OBJECT
  -> CORRESPONDENCE / FACET
  -> PROJECTION @ SCALE / APERTURE
  -> VISIBLE PLACEMENT
```

and separately:

```
HOST OPERATION
  -> SUPPORT + AUTHORITY
  -> PROJECTED OPERATION
  -> PREVIEW / COMMIT
  -> EVIDENCE / RETURN
```

The stable object and semantic facet survive. Geometry is disposable unless the host explicitly says geometry is canonical.

## The practical abstraction

For a host object `h`:

```
view = PROJECT(CORRESPOND(h), projection, scale, aperture)
```

`CORRESPOND` answers semantic questions:

- what exact object is this?
- which stable facet/role does it occupy?
- what channels does it carry?
- what operations does the host actually support?
- what authority do those operations require?
- what information would be lost by a given representation?

`PROJECT` answers geometric/perceptual questions:

- strip, table, radial, flower, room, RSVP, glyph, page;
- compact, working, expanded, room, physical;
- region, order, orientation, level of detail;
- what is temporarily suppressed and therefore must be declared as residue.

This is intentionally close to a stylesheet/layout engine, except the input is typed semantic structure rather than HTML boxes.

## Example: one input field at several scales

Canonical host object:

```json
{
  "id": "form.email",
  "kind": "input",
  "address": "form://signup/email",
  "value": "a@example.com",
  "constraints": ["email"],
  "authority": "EDIT"
}
```

Correspondence:

```
form.email -> facet FOCUS_INPUT
```

The facet does not say "left wall".

Possible placements:

| projection / scale | allocation |
|---|---|
| LINE / compact | one editable cell after its label |
| TABLE / working | value cell in the EMAIL row |
| FLOWER / expanded | one sector; context/help occupy neighboring sectors |
| ROOM / room | **left wall** becomes the editable field surface |
| ROOM / compact | small left-edge plate or doorway; same object id |
| PHYSICAL / physical | an addressed physical panel/control only if a measured physical host binds it |

Thus:

> **LEFT WALL is a reading of FOCUS_INPUT, not the identity or meaning of FOCUS_INPUT.**

The same rule works upward. A whole form can itself become one cell in a larger workflow, one wall in a larger room, one glyph in an atlas, or one source in a set. This is lawful nesting rather than UI duplication.

## Six offices

The recovered six-office arrangement remains useful:

```
SOURCE
FRAME
FOCUS
OPERATE
WITNESS
RETURN
```

It is a **preset correspondence**.

For a form, for example:

- SOURCE: schema / initial data / origin
- FRAME: labels / constraints / surrounding context
- FOCUS: current input(s)
- OPERATE: edit / choose / clear
- WITNESS: validation / preview / derived result
- RETURN: submit/cancel/history/caller

Another host may use different facets or fewer/more facets. Do not force six.

## Higher theory, minimally

Three existing bodies of theory fit unusually well.

### 1. Bidirectional transformations / lenses

A view is usually poorer than its source. An editable view therefore needs a forward `get` and a backward `put`.

The engineering laws are:

```
PUT(source, GET(source)) = source
GET(PUT(source, edited_view)) = edited_view
```

The first makes a no-op view edit a no-op source edit.
The second means an accepted view edit can be read back from the source.

INTERPHASE already approximates this with projection purity, native-host edits, RETURN and explicit SUPPORT=0.

### 2. Projectional editing

The useful idea is not "invent a visual programming language".
It is: keep the model canonical and allow several notations/presentations to manipulate the same model.

That is the exact reason LINE / ROOM / TABLE / GLYPH need not become separate applications.

### 3. Commuting operations

For a supported operation, this square should agree:

```
        canonical operation
HOST ------------------------> HOST'
 |                              |
 | project                      | project
 v                              v
VIEW -------- view operation -> VIEW'
```

In compact form:

```
PROJECT(OP(host)) ~= VIEW_OP(PROJECT(host))
```

The equality may be exact or a declared observational equivalence.

If the square does not commute, one of four things is usually true:

1. the projection lacks a required channel;
2. the "same" operation is actually host-specific residue;
3. authority has been smuggled into the view;
4. the correspondence itself is wrong.

Do not repair those failures by adding hidden state.

## Why Markdown / HTML is a useful but incomplete analogy

Markdown, HTML and CSS separate some concerns:

- underlying content/structure;
- semantic markup;
- presentation/layout.

INTERPHASE adds the pieces they do not solve:

- stable cross-projection identity;
- multifocus/selection;
- typed operations;
- view-to-source edits;
- authority/commit;
- provenance/evidence;
- exact RETURN;
- physical-world truth.

So the closest practical analogy is:

> **semantic markup + projectional editor + bidirectional lens + explicit transaction boundary.**

## Mapping descriptor

Machine contract: `/control/INTERPHASE_MAPPING_CONTRACT.json`

Runtime helper: `/lib/interphase-mapping.js`

A mapping descriptor contains:

```
host
facets[]
  facet_id
  selector
  channels
  operations
  authority
placements
  projection
    scale
      facet_id -> region/order/orientation/lod
```

The descriptor is allowed to say where something goes.
It is not allowed to invent canonical data or authority.

## What "transformation" means here

Use three different words instead of one overloaded transform:

### CORRESPOND

```
host object -> semantic facet
```

Identity-preserving classification.

### PROJECT

```
semantic facet -> render allocation
```

Identity-preserving representation.

### OPERATE

```
canonical state -> changed canonical state
```

A real transformation with an authority/evidence boundary.

This separation is probably the main simplification.

## Composition

Mappings may nest.

Example:

```
FORM
  INPUT email
  INPUT phone
  ACTION submit
```

At aperture A, each input is separately projected.

At aperture B:

```
FORM -> one workflow panel
```

At aperture C:

```
WORKFLOW -> one project glyph
```

The child identities remain addressable even when not currently rendered.

No new canonical object is created merely because a parent receives a compact projection.

## Physical MAKE

The same descriptor can bind a semantic facet to a physical address only through a physical host.

Examples:

- FOCUS_INPUT -> rotary encoder detent
- OPERATE -> lever/press/slide
- WITNESS -> LED / e-ink / measured sensor state
- RETURN -> mechanical home/index mark
- FRAME -> engraved scale / panel geometry
- SOURCE -> actual cassette/tool/material

But:

```
screen coordinate != physical coordinate
rendered adjacency != real mating
animation != mechanism
preview != actuation
```

Physical adapters must supply dimensions, tolerances, topology, load/fit, measured state and effect authority.

## Stop rules

- do not create another universal shell;
- do not assign coordinates during archaeology;
- do not promote a projection into canonical meaning merely because it is visually memorable;
- do not call two operations equivalent until their operation square is tested;
- do not require six facets when the host does not naturally have six;
- do not make hidden state to rescue a projection that has explicit residue.

## Next proof

Backup archaeology is the first migration because it contains the hardest representational material: exact bytes, hierarchy, claims, conflicts, supersession, aliases, provenance and UNKNOWN.

The archaeology output contract is `0xxx0/interphase-recovery-packet/v0.1`.
