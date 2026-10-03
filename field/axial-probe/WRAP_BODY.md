# AXIAL / WRAP BODY 0.1

Status: **PRINTABLE CANDIDATE / PHYSICAL VALUE UNPROVED**  
Host: existing `/field/axial-probe/` → `/foundry/axial/` lineage.  
Authority: **NONE / projection only**.

## Why this exists

The current digital shadow probe established two machine-level properties of the three-coordinate model:

1. the declared transform sequence can close back to `[0,0,0]`;
2. distinct transform orders can end at the same state while their traces remain different.

That is not physical proof.

`wrap-body-a4.svg` is the smallest paper-only body that can test the remaining mechanical question without inventing a new interface system:

> Can one wrapped object expose three independently manipulable coordinates — **twist / slide / shift** — while preserving visible state and exact return?

This is deliberately a **WRAP / CYLINDER embedding** of the existing probe law. It does not replace FAN/8, create new semantics, or claim that a cylinder creates cyclic meaning. Existing AXIAL / TRANSDUCTIONS law remains: **IDENTIFY ≠ EMBED ≠ DEFORM**.

## Object

Print one A4 landscape sheet at **100% / Actual Size**.

The sheet contains:

- **CORE** — 160 mm working circumference + 8 mm seam tab; nominal rolled diameter ≈ **50.9 mm**.
- **RING** — loose 160 mm working loop + 6 mm tab; eight equal 20 mm address sectors `0…7`.
- **CYLINDER SLEEVE** — loose 160 mm working loop + 6 mm tab; one pointer sliding over five core marks `0…4`.
- **AXIS** — 98 × 12 mm strip passing through two opposed core slots; read positions `−1 / 0 / +1`.
- **100 mm calibration line**.

The two axis slots sit 80 mm apart on the 160 mm wrap, so they become nominally diametric after rolling.

## Build

Required: one printed sheet, scissors or craft knife, tape.

1. Verify the 100 mm calibration line measures **99–101 mm**.
2. Cut the core outline and both marked axis slots.
3. Roll the 160 mm core edge-to-edge and tape only the 8 mm tab.
4. Cut the ring and sleeve. Close each with its own 6 mm tab **loosely enough to move** around the core; do not tape either loop to the core.
5. Put the ring at the top with one number under the fixed gate.
6. Put the sleeve over the depth scale with its pointer at `0`.
7. Cut the axis strip and pass it through both opposed slots. Centre it at `0`.

Home state:

`A = [R0, C0, A0]`

## Validation

### A — physical closure

Perform:

`R+2 → C+1 → A−1 → R−2 → C−1 → A+1`

PASS only if all three physical read marks return to the exact home state:

`[0,0,0]`

Record any slip, coupling, backlash, re-grip or ambiguity.

### B — same state / different path

Path α:

`R+2 → C+2 → A+1`

Path β:

`A+1 → C+2 → R+2`

PASS only if both paths terminate at the same visible physical state:

`[2,2,+1]`

The action histories remain distinct; the body should not need to remember them.

## Coupling failure

The most important observation is not “does it look good?” It is:

> Does moving one coordinate accidentally move another?

Count a coupling failure if any of these occur:

- twisting the ring shifts the sleeve or axis;
- sliding the sleeve rotates the ring or drags the axis;
- shifting the axis rotates or translates either loop;
- the read mark can sit between addresses without an obvious intended state;
- returning to a prior tuple produces a visibly different physical alignment.

One such failure is enough to redesign the paper mechanics before adding sensing, detents, magnets, bearings or electronics.

## Evidence to keep

Minimum useful RETURN:

- one photo at calibrated home;
- one photo at `[2,2,+1]`;
- calibration measurement;
- closure PASS/FAIL;
- coupling events count by coordinate;
- one sentence naming the worst ambiguity.

## Stop condition

Do **not** add sensing or actuation from a printable/model PASS.

Next only after one physical specimen exists:

- if independent motion + readback pass: refine friction / detent geometry;
- if coupling or ambiguity fails: alter the mechanical embedding while keeping the same abstract state law;
- if the body adds no useful physical legibility: park WRAP and retain the digital probe + FAN/8 as separate projections.
