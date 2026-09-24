---
name: lived-use-gate
description: Decide whether a technically working artifact earns promotion by observing ordinary use, comparison, re-entry, expression and failure rather than treating CI as lived proof.
version: 0.1.0
platforms: [macos, linux]
metadata:
  hermes:
    tags: [evaluation, lived-use, usability, promotion, evidence]
    category: evaluation
    requires_toolsets: [terminal, file]
---

# LIVED USE GATE

## Trigger

Use when:
- CI/tests/browser smoke pass but a current head is still CANDIDATE;
- promotion depends on feel, orientation, comprehension, expression, replayability or physical use;
- the user is about to try a prototype;
- a technically sophisticated artifact may be producing little lived value.

## Invariant

**Machine correctness is necessary evidence, not proof of lived value.**

The gate should answer:
- did the capability work in ordinary use?
- did the user understand/re-enter it?
- did it create consequence worth preserving?
- did it add more burden than value?

## Procedure

1. Define one ordinary-use task.
   Do not teach the prototype beyond what an ordinary user would receive.

2. Define a baseline:
   - prior version;
   - simpler mode;
   - existing workflow;
   - no-tool condition.

3. Select 2–5 observations only:
   - completion / abandonment;
   - orientation errors;
   - recovery after error;
   - number of controls opened;
   - need for explanation;
   - latency/jitter;
   - spontaneous replay;
   - meaningful authored output;
   - willingness to share/use again;
   - source identity remembered.

4. Run the task.

5. Capture friction in concrete form:
   - “opened settings three times to find X”
   - “could not tell whether text was source-timed or cinematic”
   - “returned to same section without assistance”
   - “shared resulting clip”
   not:
   - “UX felt off.”

6. Compare to baseline.

7. Separate:
   - PRODUCT FAILURE
   - TRAINING/LEARNING
   - PERSONAL PREFERENCE
   - DEVICE/PERFORMANCE
   - SOURCE QUALITY
   - UNKNOWN

8. Decide:
   - PROMOTE
   - KEEP CANDIDATE
   - MODIFY ONE THING
   - DEMOTE / COMPOST
   - WAITING ON MORE VARIED USE

9. Feed only the observed friction into the next implementation loop.

## Promotion Heuristics

Promotion is supported when several are true:
- ordinary entry works without lore;
- the artifact preserves orientation;
- a failure can be recovered from;
- the user voluntarily repeats or reuses it;
- it produces a meaningful artifact/consequence;
- the key mechanism is perceptible;
- advanced depth does not dominate the primary surface;
- value survives on the intended device.

Promotion is weakened when:
- explanation is doing the work;
- only the author can navigate it;
- the “effect” is noticed but the operation is not;
- replay is identical novelty;
- the output has no use outside demonstration;
- controls become a settings hunt;
- state cannot be returned/reconstructed.

## No Fake Quantification

Do not invent scores to create precision.

Use counts/timings when actually observed.
Use qualitative evidence when the phenomenon is qualitative.

## Return

Return:
- TASK
- BASELINE
- DEVICE / CONTEXT
- OBSERVED
- FRICTION
- SUCCESS
- FAILURE CLASS
- COMPARISON
- DECISION
- ONE DELTA
- OPEN LIVED GATE

## Boundary

Do not silently convert one user's preference into a universal design law.

Do not infer health, cognition or ability from interaction performance.

Do not promote from screenshots, static review or CI alone.
