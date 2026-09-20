STATE × TRANSFORM INSTRUMENT v0.3
=================================

PURPOSE
A browser test harness for one hypothesis:

  discrete semantic state
      × continuous embodied transform
      × explicit transaction / COMMIT
      → changed object + RETURN receipt

This is not a final UI mockup. It is designed to be falsifiable and hardware-bridgeable.

OPEN
Open state_transform_instrument_v0_3.html in a modern browser.

GRAMMAR
OBJECT   = FIELD / NODE / PANEL / BLOOM
OPERATOR = SCALE / ROTATE / PHASE / APERTURE
FRAME    = WORLD / LOCAL / LENS / SOURCE
COMMIT   = SAFE / TEST / ARM / RUN

BODY
vertical drag   = 0–60 mm axial amount
horizontal drag = -180°..180° twist

TRANSACTION
SAFE = semantic state editable; no output
TEST = preview / ghost only
ARM  = latch semantic + transform state
RUN  = apply latched command and emit receipt; then return to SAFE

KEYS
1 / 2 / 3 = cycle OBJECT / OPERATOR / FRAME
4 = cycle COMMIT
W / S = axial +/-5 mm
A / D = twist +/-15 degrees
Enter = ARM -> RUN

EXPERIMENT
START 10 TRIALS generates random target commands.
Success requires:
- exact semantic rings
- axial within +/-6 mm
- twist within +/-15 degrees
- ARM then RUN

Harness reports median completion time and errors.
Current provisional pass condition: median <8 s and <=1 error.
This digital harness validates grammar and transaction flow only; physical detent/hand-feel remains a separate experiment.

RETURN / RECEIPTS
Every successful RUN records command, transform values, applied projection, elapsed time, and trial result.
Export JSON or CSV.

BRIDGE CONTRACT
The page exposes:

  window.axial.applyPacket({
    object: 'BLOOM',
    operator: 'APERTURE',
    frame: 'LENS',
    axial_mm: 45,
    twist_deg: 90,
    commit: 'TEST'
  })

It also listens for window.postMessage and BroadcastChannel('axial-compositor') messages:

  { type:'AXIAL_PACKET', packet:{...} }

A later camera reader, WebSerial adapter, XIAO/ESP32 sensing spine, or another browser surface can therefore drive the same experiment without changing the core UI.

PHYSICAL V0.3 TARGET
- two nested tubes
- approx. 60 mm axial travel
- approx. 180 degree relative twist
- 3 discrete semantic rings
- fixed index/reference spine
- mechanically or perceptually distinct ARM/RUN
- bridge emits the packet above

FALSIFICATION TARGETS
Redesign if:
- users repeatedly manipulate the wrong control class
- discrete and continuous controls feel semantically interchangeable
- ARM/RUN adds no useful error prevention
- state cannot be read back from the object without software
- slide/twist becomes ornamental rather than explanatory

The claim being tested is not “cylinders are cool.”
It is: physical topology can carry computational meaning with low translation cost.