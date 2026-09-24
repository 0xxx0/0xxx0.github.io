---
name: design-engineering-review
description: Review or evolve an interface/prototype by deriving form from object, address, relation and operation rather than applying a style skin.
version: 0.1.0
platforms: [macos, linux]
metadata:
  hermes:
    tags: [design-engineering, hci, interface, interaction, primitive-first]
    category: design
    requires_toolsets: [terminal, file]
---

# DESIGN ENGINEERING REVIEW

## Trigger

Use when:
- changing UI, interaction, creative tooling, public surfaces, forms, visualizations or instruments;
- a prototype feels stylish but unclear;
- controls have accumulated;
- the user asks for delight, wonder, quality, immersion, intuitive interaction, spatial/nav improvements or a stronger experience.

## Invariant

**SUBSTANCE GENERATES FORM.**

The interface must make the underlying object, address, relation, operation and consequence more legible or manipulable.

## Review Frame

For the exact host, answer:

1. **OBJECT** — what exact thing exists before the UI?
2. **ADDRESS** — what stable position/time/path/identity can the user return to?
3. **RELATIONS** — what dependencies, edges, seams or neighborhoods matter?
4. **OPERATORS** — what can actually change?
5. **WITNESS** — what visual/audio/material consequence proves the operation happened?
6. **AUTHORITY** — what is evidence, derived projection, preference/profile or authored transform?
7. **ORIENTATION** — how does the user know where they are and what scale/mode they occupy?
8. **REVERSAL** — distinguish BACK / UNDO / RETURN / PARENT / REPLAY / COMMIT.
9. **REPLAY** — why would a second encounter differ meaningfully?
10. **SHARE** — what artifact/state can leave the instrument?
11. **SURFACE COST** — what permanent chrome, state or dependency was added?
12. **REMOVAL TEST** — what evidence would justify deleting the change?

## Procedure

1. Recover the existing interaction law and current pain.
2. Identify controls that are:
   - evidence-bearing;
   - operational;
   - preferences;
   - diagnostics;
   - redundant.
3. Collapse unrelated visible controls only when a lawful contextual gesture can replace them.
4. Prefer:
   - stable spatial placement;
   - direct manipulation;
   - contextual aperture/toolglass;
   - edge/relationship operators;
   - peripheral witnesses;
   - purposeful transitions;
   - browser primitives and small modules.
5. Make typography communicate state/address/action; do not let it substitute for interaction architecture.
6. Give delight a cause:
   - prediction;
   - reveal;
   - successful transform;
   - scale transition;
   - memory payoff;
   - expressive consequence.
7. Preserve accessibility:
   - keyboard/pointer semantics where relevant;
   - readable contrast;
   - reduced motion;
   - reachable mobile controls;
   - no information encoded only by transient effect.
8. Compare before/after on one actual task.

## Donor Discipline

For an external reference, record:
- donor;
- mechanism;
- problem solved there;
- invariant;
- non-transferable surface;
- reconstruction in local primitives.

Never write “make it like X” as an implementation requirement.

## Primitive-First Gate

Prefer HTML/CSS/Canvas/SVG/WebAudio/native pointer+keyboard/local JSON.

A new dependency needs a sentence answering:
**What hard capability does this dependency buy that the primitives cannot reasonably provide?**

## Verification

A successful review must show at least one of:
- fewer controls for same capability;
- clearer orientation/re-entry;
- a relation made directly manipulable;
- a source/projection distinction made visible;
- a meaningful performance/accessibility improvement;
- a share/replay path;
- a demonstrable increase in task success or expressive range.

Pure visual refresh is not enough.

## Output

Return:
- CURRENT LAW
- FRICTION
- PROPOSED DELTA
- WHY FORM FOLLOWS SUBSTANCE
- SURFACE COST
- ACCESSIBILITY/PERF
- EVIDENCE
- REMOVE IF
- NEXT
