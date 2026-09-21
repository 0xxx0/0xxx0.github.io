# BODY / FIT — fitted-body + sensor-fusion donor research

Date: 2026-09-22
Status: IMPLEMENTATION PRIOR / DONOR NOTE

## Recovered internal donors

### BODY / FIELD 0.2
Owns low-burden self-observation, stable shared body-plan addresses, PULSE, TEST and explicit BODY↔HOUSE context.

### BODYFIELD × Open Twin cassette
Already recovered and tested:
- Open Twin XR as anatomy renderer / structure-address provider;
- BODYFIELD as self-observation + evidence/RETURN;
- OpenCap as movement/kinematics source;
- append-only event ledger and deterministic replay;
- donor atlas identity != anatomical concept != user body identity;
- personal registration is an evidence obligation, never assumed.

This means higher-resolution 3D anatomy is a donor projection, not a reason to rebuild BODY around anatomy.

### HOUSE / FIELD 0.5
Owns environment/device truth through private Home Assistant / HOUSEBUS. Existing BODY bridge is intentionally context-only and browser-local.

### HUMAN PORT 1.5.1
Owns addressed text/JSON/image/file passage and source identity; CARE already uses it for explicit evidence references.

## Game UI donors

### Syndicate Wars Cryovat
The Cryovat screen gives one agent a visible whole-body platform with four upgradeable regions: brain, arms, body and legs. Each region has levels; BODY is a prerequisite/anchor for other upgrades; upgrades visibly change capability values such as power output and resilience.

Sources:
- https://www.mobygames.com/game/syndicate-wars/promo/promoImageId,66779/
- https://gamefaqs.gamespot.com/pc/198873-syndicate-wars/faqs/63231
- https://syndicate.lubiki.pl/swars/html/swars_cryomods_v2.php

Transfer:
- center the addressed body;
- attach fitted components to regions;
- show revision/upgrade lineage rather than a flat inventory;
- expose prerequisites, compatibility and capability effects separately;
- preserve whole-body configuration at a glance.

Do not transfer:
- one universal numeric "power" score;
- fictitious biological thresholds;
- destructive upgrade semantics.

### Deus Ex
Original Deus Ex binds augmentations to body-specific slots (arms, legs, eyes, cranial, subdermal, torso), constrains compatibility and supports multiple tech levels.

Sources:
- https://deusex.fandom.com/wiki/Augmentations_(DX)
- https://strategywiki.org/wiki/Deus_Ex/Augmentations

Transfer: body-addressed slot compatibility + explicit revision level.

### Cyberpunk 2077 2.0
Cyberware is organized into body/system categories (frontal cortex, nervous system, skeleton, circulatory system, etc.), has slot/capacity constraints, and can be upgraded at ripperdocs.

Sources:
- https://www.cyberpunk.net/en/news/49060/update-2-0
- https://cyberpunk.fandom.com/wiki/Cyberpunk_2077_Cyberware

Transfer: capacity/compatibility can be a view over fitted components, not an intrinsic health score.

### RimWorld
Health view places injuries, implants, prosthetics and bionics alongside high-level functional capacities such as sight, moving and manipulation.

Source:
- https://rimworldwiki.com/wiki/Health

Transfer: BODY may project function/capability separately from localized condition and fitted component.

### Escape from Tarkov
Health is visibly body-part-addressed while global physiological quantities remain separate.

Source:
- https://escapefromtarkov.fandom.com/wiki/Health_system

Transfer: local body state and global state are unequal views.

## Sensor / twin donors

### OGC SensorThings
Useful minimal separation:
Thing -> Datastream -> Sensor -> ObservedProperty -> Observation -> FeatureOfInterest.

Sources:
- https://ogcapi.ogc.org/sensorthings/overview.html
- https://docs.ogc.org/is/18-088/18-088.html

For BODY/FIT:
- Thing = source device/service;
- Sensor = acquisition mechanism;
- ObservedProperty = heart rate / temperature / movement / humidity / etc.;
- FeatureOfInterest = body address, whole person, room, or other explicitly addressed target;
- Observation = one timestamped result.

### Open mHealth
Clinically meaningful sensor data must retain acquisition provenance and context. Effective time may differ from acquisition/recording time; self-reported and automatically measured data must remain distinguishable.

Sources:
- https://www.openmhealth.org/documentation/schema-docs/overview/
- https://www.openmhealth.org/documentation/schema-docs/schema-design-principles/

### Home Assistant
HA owns an entity state machine and distinguishes state history from long-term statistical aggregates. MQTT sensors also have explicit availability/unknown semantics.

Sources:
- https://developers.home-assistant.io/docs/dev_101_states/
- https://data.home-assistant.io/docs/statistics/
- https://www.home-assistant.io/integrations/sensor.mqtt

Transfer:
- source state/history stays HOUSE-owned;
- BODY/FIT receives typed observations or references;
- unavailable/unknown/stale remain explicit;
- aggregation is a projection, never replacement of source events.

### Eclipse Ditto / W3C WoT
Ditto separates Thing attributes from dynamic Features and even current vs desired properties; WoT uses Properties / Actions / Events as interaction affordances.

Sources:
- https://eclipse.dev/ditto/basic-overview.html
- https://eclipse.dev/ditto/basic-feature.html
- https://www.w3.org/TR/wot-thing-description/all/

Transfer:
- a fitting has identity/static metadata;
- sensor channels are dynamic features;
- desired/target state is separate from current observed state;
- actuation remains at source authority, not BODY.

## Proposed BODY / FIT object model

FITTING:
- id
- body_address
- class: WEARABLE | SENSOR | SUPPORT | PROSTHESIS | IMPLANT | ACCESSORY | OTHER
- label/model/version
- lifecycle: CANDIDATE | PLANNED | FITTED | ACTIVE | PAUSED | RETIRED
- replaces / superseded_by
- capabilities[]
- interfaces[]
- provenance

OBSERVATION:
- id
- source_id / source_class
- observed_property
- result + unit
- phenomenon_time
- recorded_at
- acquisition_method
- feature_of_interest: BODY_ADDRESS | WHOLE_BODY | HOUSE_ADDRESS | OTHER
- availability / quality
- provenance

FUSION is a projection, not a new fact:
- group source-distinct observations by observed_property;
- align within a selected time window;
- show disagreement/freshness;
- never average unlike sources by default;
- never imply cause from HOUSE context.

## Product split

BODY / FIELD = "How now?" and experiments.
BODY / FIT = "What is fitted / sensed / connected where?"
CARE = episode/course/handoff.
HOUSE = environmental/device runtime authority.
HUMAN PORT = source-object passage.
Open Twin = higher-resolution anatomical projection when useful.

## First proof

1. Add one real wearable/sensor/device as a fitting.
2. Bind one observed property to it.
3. Import or manually create one sensor observation.
4. Attach one HOUSE context observation.
5. View the same body in FIT and SENSE lenses.
6. Evolve the fitting to a new revision and verify lineage remains intact.
7. Export/re-import and verify addresses/provenance survive.

No diagnosis, no automatic causal claim, no live sensor adapter required for the first proof.
