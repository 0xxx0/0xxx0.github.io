# CARE / DIEGETIC LOCUS — GAME DONOR TRANSFER

**Date:** 2026-09-26  
**Status:** TWO-HOST IMPLEMENTED CANDIDATE  
**Role:** bounded interface transfer across CARE and HOUSE. Not a new app, ontology, health score, diagnosis engine, or shared state store.

## RECOVERED ORIENTATION

The existing AGENCY / CARE / LIGHTCONE orientation already supplies the constraint:

- cognitive light cone = scale/horizon of represented goals, not mere sensory range;
- CARE SCOPE ≠ COMPETENCE ≠ AUTHORITY;
- observation ≠ interpretation ≠ action ≠ outcome;
- widen scope without losing local contact;
- every scale change retains RETURN.

The relevant practical question is therefore not “how much care data can be shown?” but:

> Can the interface widen continuity while preserving the exact local thing that is being sensed or acted upon?

## GAME DONORS

### Dead Space — interface remains in the world

Dino Ignacio describes Dead Space UI as a functional interface that remains inside the represented world. The inventory does not transport the player into a detached safe screen; the UI must remain obvious but unobtrusive while competing with the surrounding environment.

Transfer:
- keep the represented body/room/object visible;
- attach status and action to the locus it concerns;
- use a small local aperture rather than replacing the whole surface;
- interaction must remain functional, readable, accessible, and concise.

Residue / do not transfer:
- horror tension;
- non-pausing danger;
- holographic visual skin;
- fiction-driven ornament.

Source:
https://inventinginteractive.com/2013/07/10/interview-dino-ignacio-dead-space/

### Spiritfarer — care must become an action, not merely a meter

Thunder Lotus describes the Hug as central to the game and explicitly says it reinforced mechanical ways to take care of others.

Transfer:
- care should expose a concrete relation/action when one is actually available;
- the cared-for entity remains primary; the interface should not turn it into a dashboard statistic;
- repeated care may change continuity/history without requiring a global score.

Residue / do not transfer:
- end-of-life narrative;
- affection meter;
- chore economy;
- implication that game-like care models medical or interpersonal reality.

Source:
https://www.gamedeveloper.com/design/inside-the-thoughtful-design-of-thunder-lotus-i-spiritfarer-i-

### NieR:Automata — small control grammar over complex state

PlatinumGames' UI design notes describe a deliberate effort to keep menu controls simple enough for non-expert players, while allowing optional shortcuts for experienced players. The UI also uses subtle physical/screen cues to make flat information feel situated.

Transfer:
- primary operation grammar stays tiny;
- secondary depth may exist without being mandatory;
- spatial/material cues may make state feel attached to an object, but cannot replace legibility.

Residue / do not transfer:
- visual identity;
- plugin-chip fiction;
- color palette;
- hidden shortcuts required for essential operations.

Source:
https://www.platinumgames.com/official-blog/article/9624

### RimWorld — structure, condition and capacity are separate

RimWorld separates body structure/parts from conditions and from derived capacities.

Transfer:
- addressed structure != observed condition != capability;
- a local condition must not silently become a whole-body/global score;
- capability summaries cannot erase underlying source observations.

Residue / do not transfer:
- numeric health percentages;
- medical inference;
- fatality/urgency semantics;
- fictional body simulation.

Source:
https://rimworldwiki.com/wiki/Capacity

## EXTERNAL THEORY DONORS

Michael Levin's TAME framework argues for empirically testing agency at the scale and problem space where an agency model improves prediction/control, rather than assuming one privileged substrate or level.

The cognitive-lightcone work treats cognition as extending across the spatiotemporal scale of represented goals. The stress-care-intelligence work frames care around perceived mismatch between current and preferred states.

FIELD translation remains our own:

```
LOCUS / AGENT
→ LOCAL STATE / MISMATCH
→ AVAILABLE COMPETENT ACTION
→ CONSEQUENCE
→ WITNESS
→ RETURN
```

A wider care scope is useful only when resolution and efficacy keep pace.

Sources:
- https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.02688/full
- https://www.frontiersin.org/journals/systems-neuroscience/articles/10.3389/fnsys.2022.768201/full
- https://www.mdpi.com/1099-4300/24/5/710/html
- https://www.sciencedirect.com/science/article/pii/S0303264723001399

## RECONSTRUCTED INTERFACE INVARIANT

**DIEGETIC LOCUS APERTURE**

```
WORLD / BODY / ROOM REMAINS VISIBLE
→ exact locus selected
→ small attached aperture
→ 1–3 host-lawful operations
→ local history / consequence
→ RETURN
```

Required properties:

1. **LOCUS FIRST** — exact body region / room / object remains addressed.
2. **WORLD REMAINS VISIBLE** — aperture does not replace the represented substrate.
3. **FEW ACTIONS** — at most three immediate operations.
4. **NO AUTHORITY GAIN** — aperture delegates to existing host operations.
5. **LOCAL ≠ GLOBAL** — local observations do not create a health/safety/priority score.
6. **SOURCE DISTINCTION** — prior observation, device truth, interpretation, and plan remain unequal.
7. **DISAPPEARS WHEN UNNEEDED** — no permanent dashboard block.
8. **RETURN** — deeper host state remains exactly reachable.

## TWO UNEQUAL IMPLEMENTATIONS

### CARE / FIELD

Selected body-plan region now gets a local map-attached aperture:

```
LOCUS / CARE
OBSERVE · PRIOR · COURSE
```

- OBSERVE focuses the existing raw-note composer.
- PRIOR projects prior same-region evidence as a ghost overlay.
- COURSE enters the existing longitudinal FOLLOW view.
- No new care record/state schema.
- No diagnosis, urgency, causal inference, or treatment recommendation.
- No personal data enters Git.

### HOUSE / FIELD

Selected room in PLAN/RCP/TRACE now gets:

```
LOCUS / HOUSE
CARE · BODY · DAYLINE
```

- CARE enters the existing browser-local HOUSE CARE projection.
- BODY uses the existing context-only local bridge.
- DAYLINE uses the existing planning-context handoff.
- No HA/HOUSEBUS actuation.
- Selected address != presence.
- Public HOUSE geometry retains its current uncertainty/provenance.

## CROSS-DOMAIN RESULT

The invariant survives two unequal domains:

- anatomical/reference body locus;
- spatial/room locus.

That is enough to retain the pattern as a proven interface donor.

It is **not** yet enough to extract a shared runtime component. The geometry, state and actions remain meaningfully host-specific, and the duplicated code is small.

## NEXT TRANSFERS WORTH TESTING

### BODY / FIT — candidate
Selected body region could expose FIT / SENSE / PATINA locally while leaving the body plan visible. This would test whether the same locus aperture survives equipment/sensor semantics.

### TRAINING — candidate, no new route
A selected BODY capacity/region plus Dayline timing could carry:

```
TARGET → DOSE → RESPONSE → RECOVERY → NEXT EXPOSURE
```

without a global readiness score. Citizen Sleeper-style bounded capacity can inform the action budget, but not become a health/productivity meter.

### HUMAN PORT — candidate
For an addressed person/relationship, Spiritfarer suggests that a care interface should expose a concrete relational verb only when the relation genuinely supports one. No automated intimacy, sentiment score or obligation generation.

## RETIREMENT / FALSIFIER

Remove the locus aperture if it:
- obscures the represented body/room;
- duplicates the host side panel without reducing navigation;
- creates accidental urgency/score semantics;
- requires more than three immediate actions;
- becomes a second state owner.

Do not create a “Diegetic UI System.”

If a third unequal host proves the same invariant and duplicated implementation begins to cause inconsistency, then consider extracting only positioning/action-shell mechanics.
