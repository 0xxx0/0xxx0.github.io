# SELF-VERIFICATION FIRST — 2026-09-25

**Status:** active execution correction  
**Trigger:** user explicitly stated they are not realistically going to act as the project's routine test harness.

## SELF-CRITIQUE

The collaboration accumulated a recurring anti-pattern:

```
implement candidate
→ label HUMAN_USE / ORDINARY_USE / REAL_DEVICE as promotion gate
→ stop
→ ask the human to provide the missing proof later
```

That is valid only when the unresolved property is intrinsically physical or subjective. It became overused as an epistemic escape hatch.

Examples present in current state before this correction included:
- READFIELD: HOLD_FOR_HUMAN_USE with a list of human questions;
- FOLD//BLOOM: multiple direct-phone promotion gates and HOLD_FOR_HUMAN_USE;
- Dayline: lived phone use treated as promotion gate;
- HOUSE CARE: ordinary-use logging burden as falsifier/next test;
- BODY/FIT: real-device Health Connect read still required;
- SABER: two-real-phone proof required.

The mistake is not preserving uncertainty. The mistake is assigning verification work to the human before exhausting executor-accessible evidence.

## NEW DEFAULT

**DO NOT USE THE HUMAN AS A TEST RUNNER WHEN THE SYSTEM CAN TEST ITSELF.**

Verification order:

1. **STATIC** — syntax, schema, references, authority boundaries, privacy constraints.
2. **CORE** — pure-function fixtures, state-machine and property tests.
3. **REPLAY** — deterministic import/export, source identity, RETURN and reversal.
4. **ADVERSARIAL** — malformed/stale/wrong-source packets, double actions, interrupted state, empty state.
5. **BROWSER** — realistic phone viewport, scroll/reachability, focus, Escape/backdrop/outside-tap, persistence, handoff.
6. **PUBLIC** — deployed routes/assets/versions resolve and agree with repository state.
7. **DEVICE/WORLD** — only properties requiring actual hardware/environment remain.
8. **SUBJECTIVE** — delight, anxiety, cognitive burden, tactile feel and personal preference may be observed if they occur; they are not routine homework.

If layer N can settle a claim, do not defer it to N+1.

## GATE RECLASSIFICATION

### READFIELD
Machine-verifiable:
- downloaded text-like source intake;
- source/session boundary;
- cursor/focus preservation;
- RSVP/regress/scale operations;
- sticky mobile rail reachability and no overflow;
- READ↔LOCI / PULSE handoff packet integrity.

Optional subjective evidence:
- whether FAST/REVIEW/PULSE/VOICE/LOCI feels worth persistent use.

**Disposition:** remove HUMAN_USE as correctness gate.

### FOLD//BLOOM UI / PLAY
Machine-verifiable:
- default mode and source continuity;
- menu/modal close paths;
- Escape/backdrop/outside-tap;
- no scroll lock;
- HEX trigram state changes;
- STILL motion suppression;
- VIBE preset state;
- RETURN/source identity.

Optional subjective evidence:
- calmness, delight, anxiety, perceived motion quality.

**Disposition:** correctness belongs to browser/state tests; preference remains non-blocking.

### DAYLINE
Machine-verifiable:
- empty first run;
- normal mobile vertical scroll;
- source handoff import;
- one held object;
- max three lawful moves;
- RUN mutation boundaries;
- witness/RETURN shape;
- source back path.

World-only:
- whether a planned action was actually performed.

**Disposition:** the planner/runtime can be verified without requiring the human to live-test it.

### HOUSE CARE
Machine-verifiable:
- capture/state transition;
- WATCH/OPEN/DONE;
- DONE requires receipt;
- local persistence/export;
- Dayline packet;
- HUMAN PORT minimization and no send authority.

World/subjective only:
- whether the episode corresponds to reality;
- whether logging burden is worth it.

**Disposition:** do not freeze the mechanism waiting for ordinary use; bound claims instead.

### BODY / CARE
Machine-verifiable:
- local privacy;
- event schemas;
- observation/interpretation separation;
- BODY→CARE explicit-import boundary;
- measurement and brief generation;
- test/contrast math on fixtures.

Medical/world-only:
- diagnosis, treatment effectiveness, clinical urgency, actual symptom meaning.

**Disposition:** tools may be technically verified; medical claims remain outside their authority.

### BODY/FIT / HEALTH CONNECT
Already machine-proved:
- transform fixture;
- Android compile;
- provenance retention.

Still truly device-bound:
- Android permission UI;
- actual Health Connect records on a phone;
- vendor/device behavior.

**Disposition:** REAL_DEVICE limits only the claim "real phone Health Connect roundtrip proved"; it does not block the rest of BODY/FIT.

### FOLD//BLOOM SABER
Machine-simulatable:
- signaling/session state;
- clock-offset estimator;
- synthetic LEFT/RIGHT motion events;
- EVENT TAPE matching;
- disconnect degradation;
- persisted HIT/GRAZE/MISS only.

Truly device-bound:
- real IMU characteristics;
- two-phone end-to-end latency;
- physical swing feel.

**Disposition:** build/simulate everything else; retain a narrow device-physics UNKNOWN.

## CLAIM DISCIPLINE

Use:
- **PROVED** — supported by executor-accessible evidence.
- **SIMULATED** — behavior proved under explicit model/fixture, not physical substrate.
- **UNKNOWN / DEVICE** — cannot establish without actual hardware.
- **UNKNOWN / WORLD** — depends on real-world consequence.
- **OPTIONAL / SUBJECTIVE** — human preference or lived burden; observe when naturally encountered.

Do not write "waiting on human" when the accurate state is "all machine-verifiable claims are proved; one narrow subjective/device claim remains unknown."

## AUTONOMY CONSEQUENCE

A device/world unknown does not end the turn.

Continue any independent high-value work that:
- narrows the unknown;
- builds a simulator/fixture;
- proves surrounding invariants;
- removes stale or false human gates;
- fixes defects discovered by those tests.

Stop only when the remaining uncertainty is genuinely irreducible **and** no independent useful move remains.

## HUMAN ROLE

The human is the source of goals, corrections, preferences, authorizations, private reality and naturally occurring evidence.

The human is **not** the CI pipeline.
