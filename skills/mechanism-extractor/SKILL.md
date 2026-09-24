---
name: mechanism-extractor
description: Extract a recurring demonstrated mechanism into a reusable Hermes skill/module only when recurrence, invariants, failure modes and verification are explicit.
version: 0.1.0
platforms: [macos, linux]
metadata:
  hermes:
    tags: [skills, mechanisms, transfer, reuse, confluence]
    category: methods
    requires_toolsets: [terminal, file]
---

# MECHANISM EXTRACTOR

## Trigger

Use when:
- the same operator recurs across at least two domains;
- a one-off experiment has been reused successfully;
- repeated reimplementation suggests hidden common structure;
- the user explicitly asks to extract a skill, method or reusable operator.

Do not use because a phrase sounds general.

## Admission Rule

A mechanism may become a skill only if:

- it has at least two independent observed uses, or one use repeated enough to expose stable variation;
- its invariant can be stated without project names;
- inputs and outputs are explicit;
- at least one failure mode is known;
- verification is possible;
- authority boundaries are explicit;
- the skill reduces future rediscovery.

If these are not met, write a DONOR NOTE, not a skill.

## Procedure

1. Collect exact observed instances.
2. Separate:
   - shared invariant;
   - domain-specific parameters;
   - accidental visual metaphor;
   - hidden dependency;
   - failure cases.
3. Write the minimal abstract form:
   `INPUT → OPERATOR → OUTPUT → VERIFY → RETURN`.
4. Test the abstract form against every observed instance.
5. Identify at least one counterexample where the mechanism should **not** be used.
6. Draft the skill with:
   - TRIGGER
   - INPUTS
   - INVARIANT
   - PROCEDURE
   - DECISION POINTS
   - FAILURE MODES
   - VERIFICATION
   - OUTPUT / RETURN
   - BOUNDARIES
   - DONORS
7. Re-run the skill on a second context.
8. If it requires hidden project lore, demote it back to a project-local note.
9. If it survives, register it under `/skills/`.

## Examples of Good Extraction

- source → address → projection → return;
- path + stable cell addresses reused in navigation and mnemonic recall;
- local exact source + derived map + downstream projections;
- pressure/speed/tilt → material deposition;
- one bounded experiment → lived gate → promote/compost;
- relation-as-operator where the edge itself owns transform.

## Examples of Bad Extraction

- “use radial UI everywhere”;
- “make it feel Nous”;
- “black/orange house style”;
- “always use Canvas”;
- “make things delightful”;
- one bug workaround;
- one project naming convention.

## Compression Test

A skill should make the next worker need **less context**.

If the extracted skill requires a long historical explanation to apply, the extraction is incomplete.

## Verification

A successful extraction has:
- >=2 demonstrated instances;
- one invariant;
- one non-example;
- one known failure mode;
- one second-context test;
- bounded inputs/outputs;
- no hidden authority expansion.

## Return

Return:
- INSTANCES
- INVARIANT
- PARAMETERS
- NON-TRANSFERABLE
- FAILURE MODE
- SECOND-CONTEXT TEST
- SKILL PATH
- MATURITY = CANDIDATE | PROVED | PARKED
