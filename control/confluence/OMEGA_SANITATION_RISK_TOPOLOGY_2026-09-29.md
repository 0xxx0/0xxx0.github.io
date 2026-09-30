# Ω / SANITATION RISK TOPOLOGY

**State:** RESEARCH → SPECIFY / evidence-bounded  
**Date:** 2026-09-30  
**Host:** CONFLUENCE; reconstructed on current master 2026-09-30; no new FIELD route, store, queue, planner, or authority.  
**Object:** toilet / bathroom / washroom risk as a compound microenvironment, not a morbid anecdote class.

## LAW

```
SERIOUS HARM ≈ EVENT HAZARD
             × UNATTENDED PROBABILITY
             × DETECTION LATENCY
             × RESCUE IMPEDANCE
             × EVENT LETHALITY
```

The room is not the causal unit. The useful unit is:

```
PERSON STATE × ACTIVITY/TRANSITION × GEOMETRY × OBSERVABILITY × RESCUE
```

Do not merge toilet location, toileting activity, bathing, journey, physiology, privacy, or sanitation infrastructure.

## EXECUTIVE STATE

- **LEVEL 4 / large hidden public-health burden:** NOT SUPPORTED.
- **General healthy adult toilet use:** no unusual fatal-risk estimate demonstrated.
- **Older/frail/institutional toileting:** concentrated, preventable risk is supported through falls/transfer evidence.
- **Sudden collapse in a private toilet:** adverse observability/resuscitation profile is supported.
- **Japanese older-adult bathing:** separate LEVEL-3-like subdomain; immersion + thermal context + isolation must not be generalized to ordinary toilet use.
- **Decisive missing denominator:** person-time / visit-time in toilet or bathroom, stratified by age, health and setting.
- **Decisive severity variable:** collapse/event → discovery → help activation → first contact/CPR.

## PRIOR ERROR / REPAIR

The previously repeated “11% of in-hospital cardiac arrests occur in toilets” claim is false.

**11.1% | 101 | 907 | adults with non-traumatic cardiac arrest occurring at home or nursing home and transported to one ED | toilet within home/nursing-home setting | Japan | 2006–2009 | retrospective ED cohort | Kiyohara et al. / PMCID PMC3590314**

This is not an inpatient-hospital denominator and must never be represented as one.

## CLAIM LEDGER

Every numerical claim below carries: VALUE | NUMERATOR | DENOMINATOR | POPULATION | SETTING | GEOGRAPHY | PERIOD | METHOD | SOURCE.

### C1 — population OHCA location cluster

**4.6% | 849 toilet OHCAs | 18,458 registered OHCAs | all registry OHCAs | inside toilet | Osaka City, Japan | 2009–2015 | population-based Utstein-style registry | Kiyohara et al., 2018**

Eligible analytic cohort after exclusions: 733; favorable 1-month neurological survival: **1.9% | 14 | 733 | eligible toilet OHCA patients | inside toilet | Osaka | 2009–2015 | registry analysis | same source**.

This demonstrates a reproducible location cluster, not exposure-normalized excess hazard.

### C2 — observability discriminator

**3.0% | 75 toilet-associated fatal OHCAs | 2,463 fatal OHCAs | persons age 5–50 with autopsy-confirmed cardiac or unascertained fatal OHCA | toilet vs elsewhere | Denmark + Victoria, Australia | registry periods reported in study | linked sudden-death/forensic registries | Paratz et al., 2025**

Within the same study:
- witnessed: **13.3% | 10 | 75** toilet vs **32.1% | 753 | 2,388** elsewhere;
- bystander CPR: **32.0% | 24 | 75** vs **55.7% | 818 | 2,388**;
- shockable rhythm: **5.9% | 3 | 51 with rhythm data** vs **23.8% | 349 | 1,467 with rhythm data**;
- pressure-loaded/sensitive pathology composite: **8.0% | 6 | 75** vs **7.7% | 183 | 2,388**, p=.914.

Interpretation: strong support for an **observability/resuscitation disadvantage**; no support in this selected fatal-young cohort for a dominant pressure-sensitive pathology explanation.

### C3 — activity ≠ room

**46.9% | 46 toileting-related falls | 98 first inpatient falls | hospitalized adult fallers | toileting need/activity | large urban academic hospital, St Louis, USA | 2003 study window | case-control + adverse-event review | Krauss et al., 2005**

Only **17.4% | 8 | 46 toileting-related falls** occurred in the bathroom.

Therefore:
```
TOILETING-RELATED ≠ BATHROOM-LOCATED
```

The risk trajectory may be:
```
urge → bed exit → stand → orient → walk → threshold → transfer → toilet → stand → return
```

### C4 — Singapore nursing-home signal

**15.9% | 10 bathroom-related falls | 63 documented falls | 95 nursing-home residents | bathroom-related contributory factor | one nursing home | Singapore | 18 months | follow-up study using case notes + examination | Yap et al., 2003**

Also:
- wheelchair/commode related: **22.2% | 14 | 63 falls**;
- ambulation-related: **31.7% | 20 | 63 falls**;
- transfer-related: **17.5% | 11 | 63 falls**.

“Bathroom-related” is a contributory-factor category, not proof that every event occurred physically inside a bathroom. This study is local and old; it cannot support a Singapore prevalence estimate.

## BASE-RATE INVERSION

Osaka's 849/18,458 event-location share is 4.6%.

If instantaneous OHCA hazard were identical inside and outside toilets, toilet exposure would also have to occupy about **4.6% of all person-time**, or **66.2 minutes/person/day**.

This is a **sensitivity threshold, not an observed exposure estimate**.

For hypothetical daily toilet occupancy (t), let:
- event share (p = 0.046)
- exposure share (e = t/1440)

Then the implied toilet/non-toilet incidence-rate ratio under that assumed exposure is:

```
RR = [p/(1-p)] / [e/(1-e)]
```

Examples:
- 15 min/day → ~4.58×
- 30 min/day → ~2.27×
- 45 min/day → ~1.49×
- 60 min/day → ~1.11×
- 66.2 min/day → 1.00×

No representative toilet-occupancy distribution sufficient to populate this denominator was verified here. **H1 REAL CLUSTER versus H2 EXPOSURE EFFECT therefore remains unresolved.**

## HYPOTHESIS STATE

| Hypothesis | State | Reason |
|---|---|---|
| H1 REAL CLUSTER | PARTIAL | location clustering reproduces; exposure normalization absent |
| H2 EXPOSURE EFFECT | OPEN | decisive person-time denominator missing |
| H3 POPULATION EFFECT | SUPPORTED | frailty, gait/cognition, illness and care dependence recur |
| H4 OBSERVABILITY EFFECT | STRONGLY SUPPORTED | witnessing/CPR/rhythm profile worse in toilet-associated fatal OHCA |
| H5 ACTIVITY EFFECT | SUPPORTED FOR FALLS; PARTIAL PHYSIOLOGY | toileting trajectory extends outside room |
| H6 CODING ARTIFACT | SUPPORTED | location, activity, cause and contributory factor are unequal fields |
| H7 COMPOUND | BEST CURRENT MODEL | several modest effects can multiply consequence |

## SINGAPORE / MEASUREMENT SURFACE

### Existing measurable pieces

1. **SG-PAROS exists.** Singapore OHCA research already uses the Pan-Asian Resuscitation Outcomes Study, an Utstein-style prospective registry populated from dispatch, ambulance, ED and inpatient records; studies have linked it to the Singapore Registry of Births and Deaths.
2. **The missing fact is field granularity.** Public papers confirm location and event variables exist, but this pass did not establish whether source records expose a reliable `toilet / bathroom / en-route / bath` micro-location field.
3. **HDB EASE already targets the environmental topology** with grab bars, slip-resistant toilet/bathroom floor treatment, entrance-kerb lowering/widening and shower seats.
4. **BCA Code on Accessibility 2025** requires accessible sanitary-facility doors to swing outward or use sliding/folding designs; its emergency assistance alarm uses a waterproof button/pull-cord 400–600 mm above floor level and alerts responsible personnel. The code also advises access from outside if a person falls behind the door.

These design provisions are mechanism-aligned controls. They are not proof of mortality reduction.

### Highest-EIG Singapore query

Before building any new registry:

```
ASK FOR DATA DICTIONARY / SOURCE FIELD:
scene micro-location?
activity at collapse?
door/locked state?
witnessed?
last-known-well?
discovery time?
call time?
first-contact / CPR time?
```

If these fields exist, the cheapest serious study is retrospective linkage, not new sensing infrastructure.

## INTERVENTION ORDER

Evidence quality differs by component. Do not call a component “proven” merely because it appears in a successful bundle.

**Cheap-first engineering sequence:**
1. stable, correctly placed handholds;
2. slip-resistant wet-area floor;
3. clear transfer geometry / threshold reduction;
4. night visibility and unobstructed route;
5. assistance matched to mobility/cognition;
6. alarm reachable from floor level;
7. rescue-accessible door/lock;
8. only then privacy-preserving sensing.

### Sensor law

Prefer:
```
FAILED EXPECTED EXIT
```
over:
```
INTIMATE ACTIVITY RECOGNITION
```

Minimal privacy-preserving architecture:
```
door state
+ anonymous occupancy/presence
+ low-height manual alarm
+ floor-level immobility or dwell anomaly
→ local prompt
→ human check
→ escalation on non-response
```

Occupancy detection ≠ identity detection ≠ behavior recognition.

## FALSIFIERS

The current compound model should weaken or fail if:

1. representative exposure studies show toilet/bathroom person-time fully explains the event-location share;
2. toilet location ceases to predict adverse outcome after adjustment for witnessing/discovery delay and patient state;
3. toileting-related falls disappear after controlling for transfer/mobility rather than room;
4. rescue-latency interventions do not reduce detection time or consequential injury despite acceptable false-alarm rates;
5. Singapore micro-location linkage finds no concentration after age/frailty/activity normalization.

## THREE EXPERIMENTS

### Ω1 — exposure denominator
50–100 homes/care settings across risk strata; 4–8 weeks; door contact + anonymous occupancy only.

Output:
```
visits/day
minutes/day
visit-duration distribution
night fraction
age/frailty strata
```

### Ω2 — rescue-latency registry join
For qualifying falls/OHCA:
```
LAST_KNOWN_WELL
EVENT_ESTIMATE
DISCOVERY
HELP_ACTIVATED
FIRST_CONTACT_OR_CPR
LOCATION
ACTIVITY
```

Model:
```
location → witnessed/delay → initial rhythm or injury severity → outcome
```

### Ω3 — detection intervention
Primary endpoint is not mortality initially.

Measure:
```
collapse/immobility → detection
successful summon
door-access time
false alarms / user-day
non-response escalation
```

## RETURN

**Retain**
- denominator discipline;
- strict location/activity separation;
- observability as a severity axis;
- Singapore registry/design convergence as a testable opportunity;
- explicit UNKNOWN where exposure or micro-location data are absent.

**Do not retain**
- “people die on toilets” framing;
- national/global extrapolation from selected cohorts;
- “toileting-related = bathroom fall”;
- “location = cause”;
- physiology-first storytelling without discriminating evidence.

**Next lawful move:** inspect SG-PAROS/SCDF data-field granularity before any sensor build or prevalence claim.

## SOURCES / PRIMARY ANCHORS

- Kiyohara et al. 2013, *Cardiac arrest in the toilet: clinical characteristics and resuscitation profiles* — https://pmc.ncbi.nlm.nih.gov/articles/PMC3590314/
- Kiyohara et al. 2018, *Out-of-hospital cardiac arrests in the toilet in Japan* — https://pmc.ncbi.nlm.nih.gov/articles/PMC6167395/
- Paratz et al. 2025, *Cardiac arrest while using the toilet: not uncommon and associated with adverse resuscitation profile* — https://pmc.ncbi.nlm.nih.gov/articles/PMC12359240/
- Krauss et al. 2005, inpatient falls — https://onlinelibrary.wiley.com/doi/10.1111/j.1525-1497.2005.40171.x
- Yap et al. 2003, *Nursing Home Falls: A Local Perspective* — https://annals.edu.sg/nursing-home-falls-a-local-perspective/
- SG-PAROS / Singapore death-registry linkage example — https://pmc.ncbi.nlm.nih.gov/articles/PMC10960127/
- HDB EASE — https://www.hdb.gov.sg/managing-my-home/upgrading-and-redevelopment/enhancement-for-active-seniors-ease
- BCA Code on Accessibility in the Built Environment 2025 — https://go.gov.sg/bca-coa2025

**Boundary:** research synthesis only; not clinical advice and not a claim of individual risk.
