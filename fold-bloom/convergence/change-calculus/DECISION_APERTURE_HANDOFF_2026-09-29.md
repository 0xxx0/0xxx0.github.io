# DECISION APERTURE CONVERGENCE — successor handoff

Date: 2026-09-29  
Status: CANDIDATE / WITNESS-ONLY  
Scope: `/fold-bloom/convergence/change-calculus/` + FIELD LAB DATA projection

## Why this pass exists

Recent work produced several superficially similar choice surfaces:

- I Ching / six-bit state change exposes multiple possible one-line STEP paths.
- FOLD//BLOOM LIVE exposes multiple currently lawful native forecasts.
- J-space / J-Lens can narrow attention toward already-lawful native forecasts.
- READ/RIDE and other addressed traversal systems expose next-address choices.

The danger is to collapse these into one ontology or treat structural similarity as semantic equivalence.

This pass does the opposite.

It introduces a small **decision-aperture witness** that records only the common inspectable shape:

```text
FINITE CANDIDATE SET
→ OPTIONAL FOCUS / NARROWING
→ DECLARED COMMIT SEMANTICS
→ DECLARED REFRESH SEMANTICS
```

The witness explicitly preserves unequal authority.

## New module

`decision-aperture.mjs`

Schema:

`fold-bloom-decision-aperture/v0.1`

Core functions:

- `candidateApertureWitness(spec)`
- `stateStepDecisionAperture(lattice, step, cursor)`
- `nativeForecastDecisionAperture(nativeContext, steering)`
- `compareDecisionApertures(a, b)`

## Transparent arithmetic

For a finite candidate set of size (N):

```text
choice ambiguity = log2(N)
```

For an explicitly focused subset of size (F > 0):

```text
focus ambiguity = log2(F)
narrowing witness = log2(N) - log2(F)
```

This is information about the declared finite set only.

It is **not**:

- calibrated model probability;
- utility;
- semantic importance;
- causal effect size;
- permission;
- confidence that a candidate should be chosen.

### Example: state STEP

For:

```text
H[010|100] → H[011|110]
moving lines = {3,5}
```

At the start:

```text
N = 2
choice ambiguity = 1 bit
selected factoradic path may nominate L3
F = 1
path-plan narrowing = 1 bit
```

After one witnessed line has moved:

```text
N = 1
choice ambiguity = 0 bits
```

The endpoint is unchanged. This is calculation-only path selection.

### Example: native LIVE + model support

If one native forecast epoch contains three lawful forecasts and a steering preview overlaps two:

```text
N = 3
native ambiguity = log2(3) ≈ 1.584963 bits

F = 2
support ambiguity = 1 bit
narrowing witness ≈ 0.584963 bits
```

The two supported candidates remain host-owned alternatives.

No model readout acquires RELEASE authority.

## State STEP aperture

`stateStepDecisionAperture(...)` derives candidates from outgoing edges of the current Boolean-lattice vertex.

Authority:

`CALCULATION_ONLY`

Commit semantics:

`PATH_SELECTION_ONLY`

Refresh semantics:

`CURSOR_OR_PATH_STEER_RECOMPUTES_FROM_WITNESSED_PREFIX`

Important:

- the path prefix is preserved when steering the next line;
- endpoints remain fixed;
- an I Ching line is not a LIVE action;
- a selected line is not a causal model direction;
- stepping the witness does not mutate world state.

## Native forecast aperture

`nativeForecastDecisionAperture(...)` wraps an already-produced host forecast context.

Authority:

usually `NATIVE_EVIDENCE`

Commit semantics:

`HOST_RELEASE_REQUIRED`

Refresh semantics:

`EVERY_NATIVE_COMMIT_INVALIDATES_THIS_FORECAST_EPOCH`

If a J-space steering witness is supplied, its overlap becomes a **focus subset** only.

The native host still decides what is lawful and owns execution.

## Structural comparison law

`compareDecisionApertures(...)` may report a structural rhyme:

- finite candidate set;
- addressable alternatives;
- optional narrowing/focus;
- explicit commit semantics;
- explicit refresh semantics.

It also hard-codes non-equivalence:

- candidate identity is local;
- equal cardinality does not mean equal meaning;
- STATE STEP is a calculated trajectory witness;
- LIVE forecast commitment mutates native host state;
- every LIVE commit refreshes the forecast epoch;
- J-space support never means permission.

Returned fields include:

```text
semantic_equivalence: false
```

and authority equivalence is computed only from declared authority + commit semantics, not from cardinality or labels.

## FIELD LAB DATA integration

LAB already contained:

- six-bit state projection;
- transparent Hamming distance;
- I Ching line values derived from endpoints;
- factoradic STEP order;
- full Boolean change lattice;
- tap-to-steer while preserving path prefix;
- STEP / FLOW;
- residue ladder;
- path → INK projection.

This pass does not add another LAB mode.

DATA now also exposes:

- `NEXT` — candidate count from the current lattice vertex;
- `CHOICE INFO` — `log2(N)`;
- `PLAN GAIN` — narrowing from the currently selected next step;
- an explicit aperture text witness;
- decision-aperture evidence inside LAB RETURN.

The canvas order-space label now includes NEXT + PLAN.

This is intended to make calculation legible while interacting, not merely in a separate research report.

## Applied Change Calculus integration

`/fold-bloom/convergence/change-calculus/` now compares:

1. STATE / STEP aperture
2. LIVE / J-space-supported forecast aperture

The page explicitly states:

> SAME SHAPE ≠ SAME MEANING

The comparison is about set shape, ambiguity, narrowing, commit and refresh.

It is not a universal control abstraction.

## Relationship to I Ching

I Ching remains a readable projection over supplied six-bit state.

For this work:

```text
STATE ENDPOINTS
→ MOVING SET
→ BOOLEAN CHANGE LATTICE
→ SELECTED STEP PATH
→ optional I CHING names / line conventions
```

The calculation does not cast.

The hexagram quotient remains known to be control-insufficient for LIVE.

Do not promote hexagram identity into native forecast state.

## Relationship to J-space

Current J-space law remains:

```text
MODEL READOUT
→ explicit host-owned mapping
→ overlap with already-lawful native options
→ PREVIEW
```

The decision-aperture witness adds only:

- candidate cardinality;
- structural ambiguity;
- support-set cardinality;
- narrowing information inside the declared candidate set.

It does not solve residual-direction discovery or causal intervention.

Those remain separate evidence gates.

## Relationship to STEP / FLOW

A useful distinction is now explicit:

### Abstract state STEP

```text
choose one remaining moving line
→ update calculated intermediate state
→ preserve endpoints
```

### Native LIVE commit

```text
choose one currently lawful forecast
→ host RELEASE
→ native state changes
→ old forecast epoch expires
→ recompute
```

These can have the same finite-choice shape while requiring different execution rules.

That distinction should survive every future convergence pass.

## Tests

Existing change-calculus selftest now verifies:

- two-line state aperture starts with 2 candidates / 1 bit;
- selected path narrows to one next line / 1 bit;
- after one STEP only one candidate remains / 0 bits;
- a 3-candidate native aperture with two supported FOLD candidates has:
  - 1.584963 bits native ambiguity;
  - 0.584963 bits narrowing;
- structural comparison reports:
  - semantic equivalence = false;
  - authority equivalence = false.

The existing CI command already runs:

```text
node fold-bloom/convergence/change-calculus/selftest.mjs
```

so no second workflow gate was added.

## Do not add next

Do not create:

- a global DecisionAperture store;
- a new FIELD bus;
- a universal candidate ontology;
- a generic COMMIT method;
- automatic mapping from I Ching lines to FOLD/BLOOM verbs;
- automatic mapping from J-space tokens to moving lines;
- model-selected RELEASE;
- probability language around top-k conditional weights unless full-vocabulary/calibrated evidence supports it.

## High-value next experiment

After this candidate is green, the next useful proof is not more abstraction.

Use one live source and capture, at successive moments:

```text
NATIVE FORECAST EPOCH
→ J-SPACE SUPPORT PREVIEW
→ HUMAN CHOICE
→ HOST COMMIT
→ NEW EPOCH
```

Measure:

- candidate count before;
- support subset count;
- human-selected candidate;
- whether selection was inside/outside support;
- new candidate count after commit;
- whether repeated support actually improves a named human task.

Keep the result as evidence, not training truth.

## Short successor summary

The convergence is:

```text
STATE / MODEL / HOST
→ finite addressed candidate aperture
→ optional focus
→ transparent ambiguity / narrowing
→ local commit law
→ refresh
→ witness / return
```

The invariant is:

> **share arithmetic, not authority.**
