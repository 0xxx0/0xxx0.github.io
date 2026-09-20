# CARE STATE / INTERACTION RESEARCH

Updated: 2026-09-21
Status: IMPLEMENTATION PRIOR / RESEARCH NOTE

## Question

How should CONTINUITY, BODYFIELD and HUMAN PORT converge into a compact tool for recurring real-world health/care situations: "something changed", "where?", "what happened over time?", "what do I need to tell/ask a doctor or vet?", without becoming a diagnosis oracle or a giant questionnaire?

## Recovered local evidence

### BODYFIELD
The existing BODYFIELD line already established several strong interaction rules:
- spatial selection or trace first;
- "What changed here?";
- own words first;
- optional vocabulary/qualities after raw wording;
- optional magnitude and deeper dimensions;
- prior observations can be ghosted rather than edited away;
- canonical observation keeps location/shape + raw wording + time separate from interpretation;
- v3 exports a lossless native event ledger and a FHIR preview.

The important lesson is not "build another body map"; it is that spatial observation is an evidence primitive that should survive handoff.

### CONTINUITY
CONTINUITY adds:
- source preservation;
- provenance split;
- UNKNOWN != ABSENT;
- anti-merge;
- supersession;
- STEP BACK review;
- compact reviewed handoff.

### Kiwi eye case
The useful sharing shape is small:
- patient/subject;
- baseline/known diagnosis;
- current treatment and adherence;
- what changed;
- objective measurements;
- bounded plan/escalation already supplied by the clinician;
- specific question/decision needed;
- recent trajectory.

## External prior art

### Consumer symptom tools
- WebMD current symptom checker: body map + multiple symptoms; interaction prior only. https://symptoms.webmd.com/
- Ada: symptom assessment followed by adaptive questions and a report. https://ada.com/help/how-do-i-start-a-symptom-assessment/
- Buoy: conversational symptom questions -> answers -> next-step plan. https://www.buoyhealth.com/multi-symptom-checker
- Isabel: accepts many symptoms in ordinary language in one go rather than forcing an endless questionnaire. https://symptomchecker.isabelhealthcare.com/the-symptom-checker/how-it-works
- NHS 111 Online: one main symptom at a time, question-driven triage, care disposition rather than diagnosis. https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-use-111/how-nhs-111-online-works/

**Transfer:** free text first, progressive questions, multiple symptoms/locations, explicit purpose.

**Do not transfer:** opaque diagnosis ranking or home-grown triage scoring.

### Structured forms / interoperability
HL7 FHIR Structured Data Capture 4.0.0 supports advanced rendering, conditional behavior, modular forms, adaptive forms, pre-population, validation and extraction. Current FHIR Questionnaire supports conditional enableWhen; Observation and BodyStructure can represent measurements/simple assertions and specific body locations.

- https://www.hl7.org/fhir/uv/sdc/en/index.html
- https://www.hl7.org/fhir/uv/sdc/en/adaptive.html
- https://hl7.org/fhir/R5/observation.html
- https://hl7.org/fhir/R5/bodystructure.html

**Transfer:** progressive disclosure; reusable question modules; lossless export; do not require one giant form.

### Digital pain manikins
2025 systematic review: 31 unique digital pain manikins across 104 studies; most were 2D, usually front/back, and most allowed drawing pain anywhere. A 2025 scoping review found spatial location, extent and widespreadness common, but time-series/multidrawing analysis was much less mature.

- https://pmc.ncbi.nlm.nih.gov/articles/PMC12058649/
- https://www.jmir.org/2025/1/e69360/

**Transfer:** spatial self-report is legitimately useful data, not decoration. Preserve the drawing/trace, not only a region label. Longitudinal comparison is an underdeveloped opportunity.

### Human handoff
AHRQ's SBAR is a mature structured communication pattern: Situation, Background, Assessment, Recommendation/Request. AHRQ explicitly notes SBAR can be adapted for patient/family communication and remote consultants. Teach-back confirms understanding in the other direction.

- https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/sbar.html
- https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/teachback.html

**Transfer:** handoff should foreground current situation, relevant background, observed evidence, uncertainty, and the request. For a user/caregiver tool, avoid silently manufacturing the clinical "Assessment"; call it INTERPRETATION and keep it optional/separate.

### Veterinary tools
Current pet tools increasingly converge on:
- one-sentence concern;
- a short sequence of relevant questions;
- urgency/next step;
- case history/follow-up;
- a vet-ready report.

Examples: Petriage, Vet-AI/Joii, Omelo, TriageTail, VetCheck/Kinly-style one-page vet handoff.

**Transfer:** ongoing case, follow-up, vet-ready brief, personal baseline.

**Do not transfer:** our own unvalidated urgency score.

## Product conclusion

Do not grow CONTINUITY into a medical form.

Create **CARE** as a specialized projection:

CONTINUITY = evidence/canonical state substrate
BODYFIELD = spatial observation substrate
CARE = compact capture / longitudinal follow / clinician-vet handoff
HUMAN PORT = explicit external transmission boundary

## CARE interaction law

**OBSERVE -> FOLLOW -> BRIEF**

### OBSERVE
One dominant prompt: **What changed?**

Optional progressive dimensions:
- WHERE: tap/trace or no-location;
- TREND: new / worse / same / better;
- QUALITY: region-adaptive chips;
- MEASURE: value/unit;
- EVENT: observation / measurement / treatment / appointment / result;
- STATUS: only when the event requires workflow state;
- INTERPRETATION: hidden/optional and never merged with observation.

### FOLLOW
Show event series and the previous event in the same region/case as ghost/context. Do not make the user re-enter a full intake.

### BRIEF
One-screen handoff:
1. ASK
2. SITUATION / WHAT CHANGED
3. RELEVANT BASELINE
4. CURRENT TREATMENT / ADHERENCE
5. RECENT COURSE + MEASUREMENTS
6. UNCERTAINTIES / CONFLICTS
7. PLAN ALREADY ON FILE

Do not add diagnosis or urgency unless it was explicitly provided by a clinician/vet/source.

## Privacy / safety architecture

- public code, private browser-local state;
- no server submission;
- explicit import/export;
- photo/file attachment is metadata-only until a private file substrate exists;
- CASE != BRIEF != SEND;
- CARE may prepare a HUMAN PORT handoff but never sends automatically;
- no medical-record authority claim;
- no triage/diagnostic scoring in v0.1.

## v0.1 proof criteria

1. Fewer visible controls than CONTINUITY.
2. Human and animal subjects both work without pretending they are identical.
3. Body/region capture is optional, not mandatory.
4. Region selection adapts vocabulary rather than showing every possible field.
5. Event status supports PLANNED/SCHEDULED/PERFORMED/RESULTED/REVIEWED/ACTED where relevant.
6. BODYFIELD ledger and CONTINUITY case imports preserve source semantics.
7. One button produces a concise clinician/vet brief.
8. STEP BACK reveals missing baseline, missing ask, missing units/source, interpretations, unresolved unknowns.
9. No network submission path.
