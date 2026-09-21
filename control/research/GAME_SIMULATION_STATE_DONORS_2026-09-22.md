# GAME-SCALE STATE DONORS — CARE / FIELD / HUMAN PORT

Date: 2026-09-22  
Status: research donor / mechanism transfer only

## Question

What do simulation-heavy games such as Cyberpunk 2077, RimWorld, Dwarf Fortress and Project Zomboid actually do when they need to preserve a large, reactive world state — and which mechanisms transfer usefully into FIELD / CONTINUITY / CARE / HUMAN PORT?

The useful answer is **not** “make a game-like medical simulator.”

The useful answer is that sophisticated simulations avoid one giant authoritative blob. They separate **definitions, persistent facts, runtime state, conditions/gates, effects, projections and presentation**.

## Cyberpunk 2077 / REDengine 4

### 1. Static definitions are separate from runtime state

Cyberpunk's TweakDB is a static record database for gameplay entities/properties. Records define things such as characters, items and behavior data; runtime code reads those records rather than treating every current state as part of the definition.

Source:
- https://wiki.redmodding.org/cyberpunk-2077-modding/for-mod-creators-theory/tweaks/tweaks

**Transfer:** BODY PLAN / care vocabulary / route schemas should be definitions. A particular person's or cat's current condition should not mutate the definition layer.

### 2. Persistent facts are tiny and deliberately dumb

Cyberpunk quest facts are named signed integers persisted in the save. A fact can be tested later by conditions, but the fact itself does not perform behavior. The same fact may affect scenes much later, and changing one fact ad hoc can break seemingly unrelated later logic.

Source:
- https://github.com/CDPR-Modding-Documentation/Cyberpunk-Modding-Docs/blob/main/for-mod-creators-theory/files-and-what-they-do/file-formats/quests-.scene-files/quests-facts-and-files.md

**Transfer:** a durable fact such as “appointment performed”, “medication changed”, “report received”, or “photo attached” should remain a fact. Decision logic belongs in a separate gate/projection layer.

This reinforces:

~~~
FACT != EFFECT
FACT != DECISION
FACT != MESSAGE
~~~

Changing one canonical fact can have downstream consequences, therefore provenance and RETURN matter.

### 3. Blackboard state is shared, observable runtime context

REDengine blackboards are key/value stores designed for multiple objects to publish, observe and react to changing data. Prerequisites can listen to blackboards and cache condition state instead of reconstructing everything constantly.

Sources:
- https://wiki.redmodding.org/nativedb-documentation/classes/gameblackboardsystem
- https://wiki.redmodding.org/cyberpunk-2077-modding/for-mod-creators-theory/tweaks/prereqs-customizable-conditions

**Transfer:** CURRENT / HOUSE live state / CARE current episode / HUMAN PORT current focus resemble blackboard projections: useful, reactive, replaceable current context. They should not be confused with the durable event/history ledger.

### 4. Stats, pools and status effects are distinct systems

Cyberpunk exposes static/stat-derived values, mutable stat pools such as health, and status-effect presence as separate runtime concepts. Decompiled scripts visibly query them separately.

Sources:
- https://github.com/CDPR-Modding-Documentation/Cyberpunk-Scripts/blob/main/scripts/cyberpunk/ai/Tasks/ReactionTasks/aiHitReactionTasks.script
- https://wiki.redmodding.org/cyberpunk-2077-modding/for-mod-creators-theory/tweaks/stat-modifiers

**Transfer:** separate:
- measurement / current value;
- condition/effect;
- interpretation;
- derived functional consequence.

Do not turn “pain 6”, “eye squint”, “on phenobarbital”, and “needs vet” into one field.

### 5. Presentation owners remain separate

Cyberpunk's messages, phone operations and performed dialogue may appear to the player as one conversation, but they have different resource owners and completion signals.

Source:
- https://hlky.github.io/cyberpunk-quest-authoring/patterns/messages-calls-and-conversations.html

**Transfer:** CARE case, CARE brief, Port object, Contact draft and actual SEND may look like one flow, but must remain different authorities.

~~~
CASE != BRIEF != PORT OBJECT != DRAFT != SEND
~~~

## RimWorld

RimWorld's central health abstraction is the **Hediff** (“health difference”). A Hediff may apply to the whole pawn or one body part. It can have severity, stages, thresholds, components, healing/disappearance behavior and functional/stat consequences.

Sources:
- https://rimworldwiki.com/wiki/Hediffs
- https://github.com/RimWorldMod/RimworldModdingFiles/blob/master/Defs/HediffDefs/Hediffs.xml

A typical pattern is:

~~~
condition definition
  + body-part address
  + current severity
  + stage
  + components / progression
  -> capacity/stat consequences
~~~

**Transfer:** this is a strong donor for CARE's representation of a known condition/course, especially:
- condition instance != condition definition;
- part/locality is optional;
- severity/value may evolve independently;
- stage transitions are derived from evidence;
- components are modular.

**Do not transfer:** game-authored biological thresholds into real care. In CARE, clinician/vet supplied thresholds may be stored as sourced gates; CARE must not invent them.

## Dwarf Fortress

Dwarf Fortress pushes the spatial model further. Syndrome effects may target specific body parts **and tissue layers**, or use localized contact so the affected site depends on where exposure happened. Effects such as pain, swelling, bleeding or impaired function remain separate effect types.

Source:
- https://www.dwarffortresswiki.org/index.php/Syndrome

~~~
EVENT / EXPOSURE
  -> TARGET (body part / tissue)
  -> EFFECT INSTANCE
  -> SEVERITY / TIME
  -> FUNCTIONAL CONSEQUENCE
~~~

**Transfer:** BODY/FIELD addresses and CARE event localization can remain exact without pretending the address itself is a diagnosis. It also argues for keeping **function** separate from **symptom**.

## Project Zomboid

The exposed health script shows environmental events selecting a specific body part, then applying a typed injury state to that part.

Source:
- https://github.com/Project-Zomboid-Community-Modding/ProjectZomboid-Vanilla-Lua/blob/main/server/HealthSystem/HealthUpdate.lua

~~~
source event -> body address -> state change
~~~

**Transfer:** event provenance matters. This is better than a timeless symptom list.

## Unreal Gameplay Ability System — useful generic reference

Epic's Gameplay Ability System cleanly separates:
- Attributes: current/base values;
- Gameplay Effects: temporary/permanent/periodic changes;
- Tags: categorical state/requirements;
- application requirements/gates;
- Gameplay Cues: presentation only.

Sources:
- https://dev.epicgames.com/documentation/unreal-engine/gameplay-attributes-and-gameplay-effects-for-the-gameplay-ability-system-in-unreal-engine
- https://dev.epicgames.com/documentation/unreal-engine/gameplay-effects-for-the-gameplay-ability-system-in-unreal-engine

This is useful because it is a deliberately general simulation architecture rather than one game's bespoke health model.

## Proposed FIELD state separation

The convergent donor pattern is:

~~~
DEFINITION
  static vocabulary / body plan / route / known workflow kind

ENTITY / CASE
  stable identity

FACT
  durable sourced assertion

EVENT
  something observed or performed at a time

MEASUREMENT
  value + unit + method/context

CONDITION / ACTIVE EFFECT
  current bounded state inferred or explicitly sourced from facts/events

GATE
  IF/WHEN condition + source + action/next state

BLACKBOARD / CURRENT
  replaceable current projection for interaction

PROJECTION
  body map / timeline / brief / dashboard / FI reading

PORT OBJECT
  addressed transferable snapshot or evidence object

ACTION
  explicit mutation / communication / treatment event

RETURN
  what actually happened + new evidence
~~~

## What this suggests for CARE

CARE should **not** become deeper by adding dozens of symptom fields.

Its next useful internal leap is a layered state model underneath the same compact UI:

~~~
EVENT LEDGER
FACTS
MEASUREMENTS
ACTIVE CONDITIONS
SOURCED GATES
CURRENT PROJECTION
EVIDENCE OBJECTS
~~~

The user should still mostly see:

~~~
WHAT CHANGED?
FOLLOW
BRIEF
~~~

Complexity belongs underneath.

## What this suggests for FIELD

FIELD already has analogous layers:

~~~
manifest route definition      ~ static definitions
CURRENT                        ~ blackboard
route.index.updated_at         ~ mutation chronology
route.evolution                ~ bounded experimental gate
RETURN                         ~ persisted outcome/evidence
HUMAN PORT                     ~ addressed object passage
FIELD INTAKE                   ~ explicit admission/mutation gate
~~~

The missing reading is **release lineage**. RECENT and EVOLVE must not be overloaded to provide it.

Hence a separate FI **VERSIONS** projection is justified.

## Anti-patterns from simulation systems

1. **Global mutable flag soup.** Cyberpunk fact editing demonstrates how a tiny state change can have later consequences. We need source/owner/RETURN, not hidden toggles.
2. **One numeric health score.** RimWorld/DF show why locality, condition type, progression and functional consequence matter.
3. **UI state as canonical state.** Blackboard/current views are useful but replaceable.
4. **Presentation coupled to logic.** Message/phone/scene separation is a strong donor for CARE/HUMAN PORT/CONTACT.
5. **Thresholds without authority.** Games author thresholds because they own the simulated world. CARE does not own biology; real thresholds must be sourced.

## Next bounded test

Use one actual CARE case with:
- one observation event;
- one measurement;
- one Port evidence object;
- one sourced IF/WHEN gate;
- one brief.

Then inspect whether the same underlying state can produce:
1. BODY/FOLLOW view;
2. clinician/vet BRIEF;
3. Port object;
4. FIELD INTAKE candidate;

without copying or silently changing facts.

If yes, retain the layered state model. If not, repair the smallest failing boundary.
