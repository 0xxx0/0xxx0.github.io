# BODY / CALIBRATION APERTURE

**Status:** CANDIDATE TRANSFER PACK  
**Date:** 2026-09-22  
**Hosts:** `/body/`, `/body/fit/`, `/care/`, `/house/`  
**No new sovereign app.**

## Recovered substrate

The required pieces already exist:

- **BODY / FIELD** — subjective NOW, PULSE contrasts, bounded TEST and BODY↔HOUSE bridge.
- **BODY / FIT** — source-distinct sensor observations, fitting/loadout state, fusion without default averaging, RETURN / NEXT CUT / PATINA.
- **CARE / FIELD** — treatment/course observations and clinician/vet handoff without diagnostic authority.
- **HOUSE** — environment/device truth.
- **FIELD** — provenance, bounded experiments, RETURN and cross-lineage transfer.

The missing function is not “health dashboard.” It is a **bounded calibration / response layer** that knows when to observe, when to intervene, and when to stop observing.

## Core operation

```
QUESTION
→ CALIBRATE
→ NOTICE
→ TEST
→ RETURN
→ KEEP / DROP / UNKNOWN
→ FADE
```

**FADE is part of the protocol.** A campaign should declare what information would let monitoring stop or become sparse before collection expands.

## APERTURE = monitoring dose

APERTURE here is a reusable operation, not another product:

- **CLOSED** — no collection.
- **GLANCE** — passive sparse summary; no prompt unless a decision could change.
- **CAMPAIGN** — one question, selected streams, explicit evidence gate.
- **LIVE** — temporary high-resolution observation around a bounded experiment.

Default should be GLANCE or CLOSED. LIVE must expire.

This maps cleanly onto contemporary just-in-time adaptive intervention work: decision points, tailoring variables, intervention options, decision rules and proximal outcomes are explicit rather than hidden inside a permanent engagement loop. Recent reviews also emphasize engagement burden and the difficulty of intervening precisely when a person has the least capacity to engage.

## Android ingest: Health Connect first

Preferred first adapter:

```
Galaxy Watch
→ Samsung Health
→ Health Connect
→ BODY / FIT sensor-observation envelope
```

Samsung documents that Galaxy Watch data reaches Samsung Health and selected activity, heart-rate and sleep data synchronize into Health Connect with user permission. Health Connect currently exposes record types including sleep session, heart rate, resting heart rate, HRV RMSSD, exercise, steps, respiratory rate, oxygen saturation, skin temperature and more.

Use **Health Connect first** because it is the broader interoperability boundary. Keep the direct Samsung Health Data SDK as a richer optional donor for Samsung-specific data such as Energy Score, sleep apnea and other fields not required by the first BODY use case.

Initial ingest should stay narrow:

1. sleep start / end / duration
2. resting heart-rate trend
3. HRV trend where available
4. performed exercise session + duration
5. source/device metadata

Do not make calories, proprietary readiness scores or sleep-stage percentages primary truth.

## DERIVEDNESS

Extend BODY / FIT observations with a small provenance projection rather than a new ontology:

- **D0** — direct/raw-ish observation
- **D1** — vendor/device aggregate
- **D2** — proprietary vendor score
- **D3** — FIELD-derived feature/comparison
- **D4** — suggestion/action candidate

A suggestion must be able to expose the chain that produced it.

```
sleep_total · D1 · Samsung/Health Connect
→ baseline delta · D3 · FIELD
→ lighter-first-block option · D4
```

**DERIVED != MEASURED. SCORE != BODY TRUTH.**

## Sleep

Commercial wearables are useful longitudinal sensors but metric validity varies. Recent reviews report better utility for basic timing/duration than for treating device sleep outputs as equivalent to subjective sleep quality or clinical sleep measurement.

Therefore:

- preserve stage data if available;
- prioritize sleep timing, duration and within-person change;
- preserve subjective sleep quality separately;
- never force disagreement to average away.

A useful experiment can explicitly compare:

```
DEVICE SLEEP
× SELF REPORT
× HOUSE CONTEXT
× NEXT-DAY FUNCTION
```

and retain disagreement.

## Training

Training should extend BODY / FIT's existing loadout grammar:

```
PLAN
→ PERFORMED
→ BODY ADDRESS
→ SENSOR TRACE
→ SUBJECTIVE RETURN
→ NEXT CUT
```

The machine may expose branches such as original / lower volume / technique-only / defer, but the user chooses. Later RETURN evaluates the choice.

Recent wearable-validity work continues to show metric-specific performance: heart rate is generally stronger than estimated energy expenditure or some derived fitness quantities. That supports preserving raw-ish streams and demoting opaque composites.

## State / anxiety support

Do not build a passive “anxiety detector.”

Wearable anxiety research is promising, especially with multiple signals, but recent systematic reviews still report heterogeneous devices, methods, relatively small studies and limited standardization. Use passive data as a **check trigger**, not a diagnosis:

```
PASSIVE DEVIATION
→ “something changed — check?”
→ HUMAN CONFIRMS / REJECTS STATE
→ bounded response
→ BETTER / SAME / WORSE
→ response history
```

The transferable mechanism is **SENSOR CUE != STATE LABEL**.

## Medication / supplement / caffeine branch

Treat substances as source-backed **EXPOSURE events**, not inferred treatment plans.

A useful projection is a DAY RAIL over:

- identity / ingredient
- formulation / strength when known
- prescribed/scheduled instruction when applicable
- actual taken/logged event
- food/alcohol/caffeine/supplement context
- source + provenance

For clinical interoperability, preserve the distinction between an ordered medication and a reported/taken medication. FHIR R4 does this explicitly through resources such as MedicationRequest and MedicationStatement; Observation is intended for measurements/assessments rather than being a universal medication record.

Apple's current HealthKit Medications API is a useful adapter donor: medication concepts may carry RxNorm identity, while dose events represent scheduled/taken/skipped/snoozed events.

Consequential medication logic remains outside autonomous FIELD authority:

- no silent prescribed-dose change;
- no stop/start recommendation from observational correlation;
- interaction findings retain authoritative source and uncertainty;
- escalate consequential ambiguity to pharmacist/clinician review.

### Exposure source ladder — Singapore-local first where applicable

Keep four questions separate:

1. **WHAT IS IT?** Normalize ingredient/formulation/strength and preserve brand/product identity. RxNorm is useful when the concept exists, but identity normalization is not interaction authority.
2. **IS THIS PRODUCT LOCALLY LEGITIMATE / FLAGGED?** Use Singapore HSA Infosearch/Register of Therapeutic Products for medicines; for supplements/traditional medicines consult HSA's voluntarily notified complementary-product list and illegal/adulterated-product alerts. Voluntary notification must not be rendered as HSA endorsement.
3. **WHAT DOES THE PRODUCT/LABEL SAY?** Prefer the current locally approved product information / patient information where available; preserve jurisdiction and revision date.
4. **WHAT IS KNOWN ABOUT INTERACTIONS / TIMING?** Use authoritative product labels plus evidence-oriented clinical/pharmacology sources. For supplements, NIH ODS/NCCIH fact sheets are useful public evidence donors. Absence from one source is **UNKNOWN / NOT FOUND**, never “no interaction.”

For high-consequence combinations, uncertain identity, prescription timing changes, pregnancy, surgery, severe organ impairment or similarly consequential contexts, the tool should prepare a concise source-backed pharmacist/clinician question rather than manufacture a schedule.

## Minimum sufficient sensorium

Treat measurement itself as a resource cost.

A sensor, prompt or derived score earns continued aperture only when it does at least one of:

1. changes a real decision branch;
2. resolves a named uncertainty;
3. supplies a required safety/context constraint;
4. provides evidence for a bounded test that is still undecided.

Conceptually:

```
minimize  burden + privacy cost + attention cost + dependency
subject to
  enough information for the current decision
  + declared safety constraints
```

This is a governance objective, not a clinical formula. The useful operational test is **marginal decision value**: if an additional stream repeatedly fails to change the available branch or reduce meaningful uncertainty, demote it from LIVE/CAMPAIGN toward GLANCE/CLOSED.

This makes sensor removal a successful outcome.

## Borrow from JITAI / micro-randomized methods, without importing the whole product model

Modern JITAI work already gives a rigorous grammar for adaptive support:

- **decision point** — when support could be considered;
- **tailoring variables** — current state/context used to choose;
- **availability** — whether the person can/should be interrupted;
- **intervention options** — bounded actions, including doing nothing;
- **decision rule** — how the option is selected;
- **proximal outcome** — what near-term return evaluates the decision.

BODY campaigns should use these primitives where useful. For low-risk behavioral options, explicit opt-in micro-randomization can sometimes distinguish “this prompt/action helps” from hindsight storytelling. It is not appropriate for unsupervised medication changes, hazardous interventions, or anything where random assignment itself would be unsafe.

A candidate machine-readable carrier now exists at `/body/campaign.schema.json`. It deliberately includes an evidence gate, burden budget and FADE condition before a campaign earns more sensing.

## Calibration rather than dependence

We should test whether sensing improves decisions enough to justify continued sensing.

Candidate operations:

- **prediction before reveal** — record subjective estimate before exposing device result;
- **data fasting** — temporarily hide a metric and test whether decision quality/function changes;
- **value-of-information prompt** — ask only when an answer can change a branch;
- **registered prediction** — state expected direction before intervention;
- **sensor disagreement** — preserve sources separately and learn context-specific reliability;
- **advice half-life** — suggestions expire instead of becoming doctrine;
- **graduation condition** — every campaign states what lets it stop.

These are design hypotheses, not validated clinical procedures.

## Case → reusable mechanism → wider utility

The local human case is the proving ground, not the final ontology.

```
CASE A
→ exact problem / context
→ bounded mechanism
→ RETURN
→ CASE B with deliberately unequal context
→ replicate / adapt / fail
→ only then GENERALIZE
```

Transfer rule:

1. Solve the immediate case with the smallest lawful existing host.
2. Extract the mechanism independently of private details.
3. Look for an existing ecosystem surface to complement before reimplementation.
4. Test transfer on a second unequal case.
5. Generalize only the invariant that survives.
6. Keep failed transfer evidence.

**ONE PERSON MAY DISCOVER A MECHANISM. ONE PERSON DOES NOT ESTABLISH A UNIVERSAL.**

## Complement before compete

Before rebuilding an external capability, ask:

1. Can we ingest/export through a standard?
2. Can an existing tool remain source-of-truth while FIELD supplies provenance, calibration, transfer or privacy?
3. Is our missing function genuinely absent, or merely hidden behind an adapter?
4. If we reimplement, what specific invariant or local constraint makes replacement necessary?

Our likely distinctive contribution is not better commodity sensor capture. It is the sequence:

```
SOURCE-DISTINCT OBSERVATION
→ ADDRESS
→ BOUNDED TEST
→ PROVENANCE
→ RETURN
→ FADE
→ TRANSFER
```

## Research anchors

Primary/standards:

- Android Health Connect data types: https://developer.android.com/health-and-fitness/health-connect/data-types
- Samsung Health through Health Connect: https://developer.samsung.com/health/blog/en/accessing-samsung-health-data-through-health-connect
- Samsung Health Data SDK: https://developer.samsung.com/health/data/overview.html
- Apple HealthKit Medications API (WWDC25): https://developer.apple.com/videos/play/wwdc2025/321/
- HL7 FHIR R4 Observation: https://hl7.org/fhir/R4/observation.html
- HL7 FHIR R4 MedicationRequest: https://hl7.org/fhir/R4/medicationrequest.html
- HL7 FHIR R4 MedicationStatement: https://hl7.org/fhir/R4/medicationstatement.html

Research donors:

- Nahum-Shani & Murphy, *Just-in-Time Adaptive Interventions: Where Are We Now and What Is Next?*, Annual Review of Psychology 2026. DOI: 10.1146/annurev-psych-121024-044244
- Hsu et al., *Personalized interventions for behaviour change: A scoping review of JITAIs*, British Journal of Health Psychology 2025. PMID 39542743.
- *Wearable devices for anxiety assessment: a systematic review*, Communications Medicine 2025. PMID 41513763.
- *Concordance of wearable device sleep metrics with patient-reported sleep quality: A systematic review*, 2026. PMID 41946254.
- *How Valid Are Wearable Devices in Team Sports? A Systematic Review*, 2026. PMID 42506806.

## Smallest next implementation

Do **not** build the full coach.

1. Health Connect adapter contract for sleep + HR into BODY / FIT.
2. CAMPAIGN record with question + selected streams + evidence gate + FADE condition.
3. One tiny DELTA projection: “different from your own recent baseline” with source/derivedness reveal.
4. Ordinary-use proof before adding more signals.

