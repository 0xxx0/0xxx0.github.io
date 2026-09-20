# CARE COURSE / CONVERGENCE NOTE

Updated: 2026-09-21
Status: IMPLEMENTED EXPERIMENT / CARE 0.2

## Why this delta

CARE 0.1 already solved compact OBSERVE -> FOLLOW -> BRIEF over CONTINUITY + BODYFIELD.

Two recurring real case shapes exposed the missing mechanism:

1. **STAGED TREATMENT**
   - current treatment phase
   - objective measurement course
   - next intervention
   - prerequisite / conditional decision
   - specific clinician question

2. **MONITOR -> RECHECK -> CONDITIONAL ESCALATION**
   - routine/adherence
   - repeated measurement
   - next appointment
   - IF/WHEN escalation supplied by clinician/vet
   - caregiver/owner handoff

The missing object was not another symptom form. It was a **care course**.

## CARE 0.2 law

```text
OBSERVE
   ↓
FOLLOW COURSE
   CURRENT → NEXT → IF/WHEN → OWNER/WHEN
   + descriptive measurements
   ↓
BRIEF
   ASK + situation + baseline + treatment
   + course + measurements + unknowns + sourced plan
   ↓
HUMAN PORT
```

## Truth boundaries

- CURRENT/NEXT/GATE describe workflow and sourced care logic; they are not diagnosis.
- A conditional gate should retain its source/date where known.
- Measurement trajectories are descriptive. CARE invents no threshold, target, interpretation, prognosis or urgency.
- Observation remains separate from interpretation.
- A case can be clinically important even with no body location.
- CASE != BRIEF != SEND.
- HUMAN PORT handoff uses same-origin sessionStorage; private brief text is not placed in the URL.

## Cross-system placement

```text
CONTINUITY
  source recovery / provenance / conflicts / unknowns
        ↓ projection
CARE
  observe / course / measurements / compact handoff
        ↕
BODYFIELD
  high-resolution body geometry when spatial detail matters
        ↓
HUMAN PORT
  explicit communication boundary

future:
CARE NEXT/OWNER/WHEN -> Dayline / FCM planning adapter
CARE events/course    -> FHIR Observation / CarePlan / QuestionnaireResponse adapter
```

## Why not merge CARE into BODY

Many consequential cases are not primarily spatial:
- lab trends
- medication/routine adherence
- treatment sequencing
- appointments and results
- caregiver handoffs
- conditional follow-up

BODY is an optional address/projection. CARE is longitudinal coordination.

## Implemented

- case schema v0.2;
- CURRENT PHASE / NEXT STEP / IF-WHEN gate / gate source / owner / when;
- measurement name/value/unit;
- descriptive measurement sparklines;
- course-aware clinician/vet brief;
- STEP BACK checks for unsourced gate, unowned next step and underspecified measurements;
- v0.1 CARE import compatibility;
- course preservation through CONTINUITY export;
- HUMAN PORT handoff fixed to current sessionStorage contract;
- print/PDF brief.

## Next gates

Do not add diagnostic intelligence.

Highest-value next tests:
1. run one staged-treatment case through CARE 0.2;
2. run one monitor/recheck/escalation case through CARE 0.2;
3. verify the generated brief actually reduces re-entry work in a real appointment/handoff;
4. only then implement Dayline planning export or FHIR CarePlan export.

Promotion criterion: a real case becomes easier to resume, explain, hand off or decide without loss of source/uncertainty.
