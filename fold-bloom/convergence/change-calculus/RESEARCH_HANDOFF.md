# CHANGE CALCULUS — APPLIED RESEARCH HANDOFF

**State:** bounded candidate research witness; no new source, execution, divination, or model authority.  
**Date:** 2026-09-27  
**Surface:** `/fold-bloom/convergence/change-calculus/`

## Recover first

1. `/fold-bloom/DESIGN.md`
2. `/fold-bloom/state-language.js`
3. `/fold-bloom/live/hex-projection.js`
4. `/fold-bloom/live/app.js` — existing FLOW / STEP source traversal
5. `/fold-bloom/lab/?mode=DATA`
6. `/iching/` and `/iching/hexagrams.json`
7. `/fold-bloom/convergence/jspace-steering/RESEARCH_HANDOFF.md`
8. this directory

Run:

```sh
node fold-bloom/convergence/change-calculus/selftest.mjs
node fold-bloom/convergence/jspace-steering/selftest.mjs
```

## The convergence

Do **not** say “I Ching = J-space = Fold/Bloom = STEP.” They are unequal objects connected by explicit maps.

```text
EXACT HOST FORM                 MODEL MICROSTATE
4 verbs × 6 addressed lines    hidden residual h
        │ Q                            │ R = J-lens read
        ▼                              ▼
6-bit CHANGE STATE             ranked verbal tokens
        │ Δ                            │ explicit vocabulary map
        ▼                              ▼
moving-line set                lawful native candidate set
        │ STEP ORDER                    │ explicit direction.ref
        ▼                              ▼
one addressed path             model-side intervention request
        └──────────── WITNESS / RETURN ────────────┘
```

The shared law is not shared semantics. It is:

> **explicit abstraction → explicit loss → lawful support → witnessed consequence → RETURN**

## Formal operator core

Use these as typed maps, not identities.

```text
V = {BLOOM, FOLD, SPLIT, RETURN}
B = {0,1}

q : V → B
q(BLOOM)=q(FOLD)=1
q(SPLIT)=q(RETURN)=0

Q = q^6 : V^6 → B^6

Δ(a,b) = { i | a_i != b_i }

P_π(a,b) = one-coordinate-at-a-time path
            for a permutation π of changed coordinates

R_J(h) = exported J-Lens ranked token/logit readout

M_s(token) = set of already-lawful native operations/forecasts
             supported by host state s

C(h,s) = ⋃ M_s(token), weighted only by explicitly exported readout evidence
```

`C(h,s)` is a **set-valued support relation**, not a policy. If its top mapped verb has `|C| = n > 0`, the calculator exposes `log2(n)` candidate-ambiguity bits. Zero ambiguity means one surviving candidate under this map; it still does not confer permission or prove the map causally valid.

A macrostate `A(x)` is control-sufficient only **relative to a named experiment family / horizon**. A practical finite test is:

```text
A(x)=A(y)
  ⇒ for every permitted action sequence u in U_H,
     relevant RETURN(x,u) ≈ relevant RETURN(y,u)
```

where the equality/tolerance and relevant RETURN channels are stated before testing. This converts “these states look the same” into a falsifiable behavioral equivalence claim.

## Native I Ching delegation

Current master already owns the richer structural I Ching surface at `/iching/` (v0.5):

- Boolean cube B₃ over the eight trigrams;
- 8×8 upper×lower grid for all 64 directed trigram pairs;
- King Wen walk;
- 卦算 operations including bitwise NOT 錯, line-order reversal 綜, nuclear/inner 互, single-line Hamming-1 moves, binary address and binomial yang-count bands.

CHANGE CALCULUS must **not clone those structures**. It computes an explicit supplied transition, then links the resulting hexagram address back to the native I Ching owner for those views. This keeps:

```text
CHANGE CALCULUS owns: transition / quotient / loss / step / steering arithmetic
I CHING owns: corpus / sequence / B₃ / 64-grid / 卦算 structural views
LIVE owns: exact game state / lawful forecasts / execution
J-LENS donor owns: model read/intervention evidence contract
```

The common binary address permits correspondence; it does not merge authorities.

## Transparent arithmetic

### Exact Fold/Bloom form → binary relation quotient

Each line has four exact operation symbols:

`{BLOOM, FOLD, SPLIT, RETURN}`

The existing projection groups them:

- BLOOM / FOLD → 1
- SPLIT / RETURN → 0

Therefore:

```text
exact forms       = 4^6 = 4096
binary states     = 2^6 =   64
fiber size        = 4096 / 64 = 64 exact forms / binary state
uniform log2 size = 12 bits → 6 bits
descriptive loss  = 6 bits
```

This is useful precisely because it is lossy.

A same-polarity exact edit such as `BLOOM → FOLD` is invisible to the hex quotient. The implementation records that as **quotient residue**, rather than pretending the operations are identical.

### Endpoint change → moving set → STEP ambiguity

For six-bit endpoints (a,b):

```text
d_H(a,b) = Σ_i [a_i != b_i]
moving lines = { i | a_i != b_i }
```

If (k=d_H) and we allow one line to move per discrete step, the same endpoints permit:

```text
k!
```

line orders.

Examples:

- k=0 → 1 null ordering
- k=2 → 2 paths
- k=3 → 6 paths
- k=6 → 720 paths

The moving-line set therefore does **not** determine a temporal path. If intermediate states affect consequences, step order is provenance and cannot be dropped.

### 2026-09-28 — addressed path space

The implementation now gives every one-line order a stable **factoradic address** instead of exposing only a default/reverse pair.

For canonical changed-line list `L=[l0,...,l(k-1)]`:

```text
rank : permutation(L) → {0,...,k!-1}
unrank : {0,...,k!-1} → permutation(L)

rank(unrank(i)) = i
```

The calculator exposes:

- `selected_order_index` — zero-based Lehmer/factoradic rank;
- `selected_order_address` — compact `order://i-of-k!` witness;
- `path_address` — endpoint-scoped `change://.../order/i-of-k!`;
- step-local addresses beneath that path.

This matters because six moving lines have 720 lawful one-line orderings. Enumerating only “forward” and “reverse” made 718 paths invisible even though the arithmetic already said they existed.

FIELD LAB DATA now treats this as an inspectable path space:

```text
ENDPOINTS
  → choose ORDER i/k!
  → STEP one line
  → intermediate six-bit state
  → STEP ...
  → target
  → RETURN(path address + cursor + clock witness)
```

`FLOW` only advances the **preview cursor**. If LAB PULSE is already running it may lend the interval; otherwise LAB uses a local 720 ms witness clock. This follows the existing law:

> borrowed clock ≠ borrowed authorship.

FLOW never calls LIVE `release()`, never mutates a host forecast aperture, and never converts I Ching/J-space evidence into effect authority.

LAB → APPLIED CALC carries the selected order index in the URL, so the research surface reopens the exact inspected path rather than silently falling back to path 0. LAB RETURN preserves the same path address and cursor.

The exact-form path is even richer: exact same-polarity edits may change while the binary quotient remains fixed.

### Derived I Ching line values

For an explicitly supplied before/after bit pair:

```text
0→0 = 8  stable yin
1→1 = 7  stable yang
0→1 = 6  changing yin
1→0 = 9  changing yang
```

The research surface uses these values to look up the existing I Ching corpus. **No cast is performed.** This is an endpoint-to-line-value projection only.

Classical text, King Wen sequence, nuclear hexagram, Human Design overlays, etc. remain owned by `/iching/`. They are lenses, not control truth.

## J-space steering arithmetic

`steering-calculus.mjs` makes the previously implicit support calculation inspectable.

For exported top-k logits (z_i):

```text
w_i = exp(z_i - max(z_topk)) / Σ_topk exp(z_j - max(z_topk))
```

The result is named **TOP_K_CONDITIONAL**. It is deliberately **not** called model probability because omitted vocabulary mass is unknown.

Each exported token then follows:

```text
token
  → explicit control-vocabulary mapping?
      no  → OUTSIDE_CONTROL_VOCABULARY
      yes → native host forecasts with that verb?
                no  → NO_NATIVE_CANDIDATE
                yes → NATIVE_SUPPORT
```

The calculation reports:

- top-k conditional weight;
- mapped control weight;
- host-supported weight;
- exact candidate count;
- discarded/unmapped residue.

Even `UNIQUE_NATIVE_CANDIDATE` means only “one current host candidate survived this calculation.” It does **not** mean permission to commit.

## The strongest research question: is the quotient sufficient for control?

The 4096→64 projection is currently a **descriptive quotient**.

For it to become a control-state abstraction, much more must hold. Roughly, exact states placed in the same macrostate must agree on the future behavior we care about: enabled operations, relevant successor classes, or boundedly similar consequences.

This is close to the classical ideas of **state aggregation / lumpability / bisimulation**. A quotient can be compact and visually meaningful while still being unsafe as a control state.

Concrete falsification test for this repo:

1. collect real LIVE snapshots with enough exact state to reproduce `availableForecasts()`;
2. derive a candidate macro description from each snapshot;
3. group snapshots sharing that macrostate;
4. compare their lawful candidate sets and post-operation successor witnesses;
5. if same-macro snapshots disagree materially, record the hidden variable as residue or refine the abstraction;
6. only call the macrostate control-sufficient for a named horizon/property after this test passes.

Do **not** solve disagreement by silently adding hidden fields to the macro label.

## The parallel J-space question: is the verbal variable causally faithful?

A readable J-Lens token is analogous to a proposed high-level variable, not proof that the model computes through that variable.

Causal-abstraction work makes the appropriate standard explicit: align a high-level variable with low-level representation, intervene, and test counterfactual behavior. The current donor therefore requires a real model-side `direction.ref` and before/after intervention receipt before any causal steering claim.

Useful anchors:

- Geiger et al., **Causal Abstraction: A Theoretical Foundation for Mechanistic Interpretability**, JMLR 2025.
- Geiger et al., **Inducing Causal Structure for Interpretable Neural Networks**, ICML 2022.
- Geiger et al., **Finding Alignments Between Interpretable Causal Variables and Distributed Neural Representations**, CLeaR 2024.
- Pîslar, Magliacane & Geiger, **Combining Causal Models for More Accurate Abstractions of Neural Networks**, CLeaR 2025.

The practical translation is:

> probe/read → hypothesis; intervention → causal evidence.

## Predictive sufficiency is a better target than semantic beauty

A compact state representation earns operational status when it preserves the predictions/actions required for the job.

This is closely related to predictive-state representations: describe state by enough observable predictions to support future inference/control, rather than by an attractive hidden label.

For FIELD/Fold-Bloom, a candidate compact state should answer concrete tests such as:

- what operations are lawful now?
- what changes if I take each operation?
- what address survives?
- can I RETURN?
- what uncertainty/residue remains?

If the compact representation cannot answer those, it is a projection, not sufficient state.

## Solve-for-all hypotheses

These are falsifiable research hypotheses, not architecture mandates.

### H1 — The universal primitive is not a universal UI

The repeated structure is:

```text
OBJECT
→ ADDRESS
→ ABSTRACTION
→ SUPPORTED OPERATIONS
→ CONSEQUENCE
→ WITNESS
→ RETURN
```

Different domains can share that grammar while retaining unequal state, geometry, semantics and authority.

### H2 — A useful “global workspace” for tools is small and operational

Do not broadcast whole application state.

Candidate shared workspace:

```text
source/address
current aperture
candidate operation
support/evidence
authority
residue
return address
```

Everything else remains private to the specialist host.

### H3 — Compression should be tested by action equivalence

Two states are safely merged for a job only to the extent that the job cannot distinguish them through relevant lawful interventions and observations.

This gives a more rigorous test than “the labels look equivalent.”

### H4 — STEERING should optimize preserved support, not semantic agreement

A model saying “FOLD” is interesting only when:

1. the readout is stable enough to inspect;
2. a genuine causal direction can be manipulated;
3. the host has lawful FOLD candidates;
4. intervention changes the expected observable consequence;
5. controls reject simpler explanations.

The target variable is therefore **actionable causal support**, not verbal prettiness.

### H5 — STEP is an experimental instrument for non-commutation

When several changes connect the same endpoints, vary their order.

If:

```text
A then B != B then A
```

in the observed RETURN, order is part of the state/history required for prediction.

This applies to:

- moving lines;
- Fold/Bloom exact operations;
- editing transforms;
- agent/tool operations;
- physical actions;
- model interventions.

Existing LIVE STEP mode already supplies the interaction intuition: pause continuous traversal and advance one addressed grain. The research layer generalizes the measurement principle without changing LIVE.

### H6 — Residue is a first-class output, not failure

Every projection should answer:

```text
what survived?
what collapsed?
what could change downstream because of what collapsed?
```

The right abstraction is often not the smallest one. It is the smallest one whose residue is harmless for the named task.

## Applied experiments

### E1 — HEX quotient counterexample search

Goal: find two exact six-verb forms with the same binary hex state but meaningfully unequal downstream Fold/Bloom evidence.

Current proof already shows syntactic inequality. Next step is behavioral inequality using native snapshots.

**Promotion condition:** either demonstrate a bounded property preserved across each tested fiber, or preserve the exact form beside the quotient forever.

### E2 — STEP commutator

Choose two or three addressed operations and execute every order from the same captured state.

Record:

```text
start
order
intermediate witnesses
final witness
RETURN
```

Compute pairwise final/intermediate deltas.

Do not infer commutativity from identical endpoints if intermediate consequences matter.

### E3 — J-space → host support intervention

Use a real small-model J-Lens trace.

For one genuine direction:

- zero strength;
- +direction;
- -direction / unrelated control;
- repeated prompts.

Measure both model output delta and the downstream host-support calculation.

The test is not “did top token become RETURN?” It is:

> did the intervention reproducibly alter the supported host candidate distribution in the predicted direction without hidden authority transfer?

### E4 — abstraction ladder

For one LIVE run, retain simultaneously:

1. full native snapshot;
2. exact recent verb form;
3. six-bit quotient;
4. trigram/hex lookup;
5. J-space verbal readout;
6. candidate host operation support.

Ask at each level: which next-step predictions remain possible?

This identifies the smallest sufficient layer for each task instead of assuming one representation should dominate.

## External research anchors

- Causal abstraction / mechanistic interpretability: https://jmlr.org/beta/papers/v26/23-0058.html
- Interchange intervention training: https://proceedings.mlr.press/v162/geiger22a.html
- Distributed alignment search: https://proceedings.mlr.press/v236/geiger24a
- Combined high-level causal models: https://proceedings.mlr.press/v275/pislar25a.html
- Information-theoretic Markov-chain reduction / lumpability review: DOI 10.1016/j.cosrev.2025.100802
- Predictive state representations: Singh, James & Rudary, arXiv:1207.4167
- Recent compositional state-abstraction work: arXiv:2606.25357

These sources motivate tests. They do not certify the current repo abstractions.

## Stop rules

- no claim that the I Ching is the latent ontology of the model or host;
- no claim that 6-bit state is sufficient control state without behavioral tests;
- no automatic operation from a J-Lens token;
- no converting top-k conditional weights into full model probabilities;
- no erasing exact Fold/Bloom verbs after projecting to yin/yang;
- no treating a moving-line set as an ordered trajectory;
- no new global event bus, state store, or universal UI;
- no production J-space binding before one real trace + intervention witness.

## Shortest successor move

1. Keep this calculator as RESEARCH.
2. Run E1 on real/native LIVE snapshots: does the binary quotient preserve any named next-action property?
3. In parallel, run the real small-model J-Lens trace already specified by the steering donor.
4. Join the lines only when both sides have causal/behavioral evidence.

The desired result is not “one symbolic system explains everything.”

The desired result is a reusable method for discovering **which compression remains sufficient for which action, at which scale, with which residue**.


## Native LIVE falsification result — 2026-09-27

This gate is now **RUN**, using only native `engine.js` transitions (`createState → rotateSteps → release → availableForecasts`), not injected fixtures.

Command:

```sh
node fold-bloom/convergence/change-calculus/live-sufficiency.mjs
```

Observed in CI:

```text
samples       1824 lawful LIVE snapshots
unique HEX      47
unique exact   235

tested property:
NEXT_LAWFUL_FORECAST_SET + CALL + TARGET_TYPE

HEX quotient sufficient?          NO
last-six exact form sufficient?   NO
```

First HEX counterexample:

```text
same macrostate: H[011|101]

A recent exact form:
F[R B F F R F]
next call: FOLD ×2, 3 candidates
next verbs: FOLD×3 + RETURN×1
max chain: 2

B recent exact form:
F[R F F F R F]
next call: RETURN ×2, 1 candidate
next verbs: BLOOM×1 + FOLD×2 + RETURN×1
max chain: 3
```

The quotient therefore collapses a behaviorally relevant exact distinction.

More strongly, `F[R F F F R F]` itself occurred in two lawful snapshots with unequal native futures (different target family / addressed slots). Therefore **recent exact operation history is also not a sufficient control state**.

Interpretation:

```text
HEX = lossy view of recent operation history
exact six-verb form = richer history witness
native control state = still requires current engine residue
```

For the currently tested one-step forecast property, the obvious causal residue visible in `engine.js` is current target family, anchor/topology (ordered creases), charge/cadence state, and call-cycle state. Do not promote that sentence into a new universal state schema without testing it; it is a code-derived candidate factorization for the named property.

Receipt source: public-surface-check run 36296755785 on rebased branch lineage. The current branch keeps this experiment in the normal steering/change-calculus gate.



## Native STEP typing / order result — 2026-09-27

The next convergence closes a subtle category error in the earlier STEP proposal.

`availableForecasts(state)` is **one decision aperture**. Its entries are alternatives for the next commit, not a queue of actions that can be freely permuted. Native `release()` always selects a new target family different from the released family; because sibling forecasts in the old aperture all address the old target family, committing one invalidates the siblings as stale native forecasts.

Executable witness:

```sh
node fold-bloom/convergence/change-calculus/live-step-order.mjs
```

The research module therefore separates two questions:

1. **stale-address composition** — rejected as ill-typed across a release boundary;
2. **re-resolved verb intents** — `BLOOM/FOLD/SPLIT/RETURN` may be tested in different orders only after declaring an explicit resolver. The current experiment uses `LOWEST_SLOT`, reports candidate ambiguity at every step, and never promotes that resolver into gameplay policy.

This sharpens H5:

```text
STEP is not "take two buttons from one forecast set and swap them."

STEP is:
  CAPTURE NATIVE APERTURE
  → COMMIT ONE LAWFUL ACTION
  → REFRESH APERTURE
  → RE-RESOLVE THE NEXT DECLARED INTENT
  → WITNESS
  → compare alternate orders only when their typing/resolution law is explicit.
```

If both intent orders remain defined and end in different native forecast apertures, that is a genuine bounded non-commutation witness. If one order becomes unsupported, record `DOMAIN_DEPENDENT` rather than pretending the operators commute or fail algebraically.

LAB does not gain another mode. Its existing DATA state/change panel now carries the exact supplied FROM/TO endpoints into CHANGE CALCULUS. This keeps FIELD LAB as the doorway and the convergence surface as the specialist research instrument.

### Solve-for-all implication

The reusable primitive is increasingly specific:

```text
STATE
→ APERTURE (lawful alternatives for one epoch)
→ INTENT
→ SUPPORT / AMBIGUITY
→ COMMIT
→ APERTURE'
→ RESOLVE NEXT INTENT
→ WITNESS / RETURN
```

The important boundary is the apostrophe: **commit changes the space in which the next action is interpreted**. A system that carries candidate labels forward without refreshing support is precisely where semantic steering, planners, UI macros and physical procedures can become unsafe or nonsensical.



## FIELD LAB transparent STEP witness — 2026-09-27

LAB DATA now exposes the arithmetic it previously hid behind the compact `H[...] Δ{...} → H[...]` token.

For the supplied endpoints it shows:

- Hamming distance `d_H/6`;
- stable-line count;
- derived Yi line values `6/7/8/9` (endpoint projection, never a cast);
- `k!` possible one-line STEP orders;
- `log2(k!)` order-information bits;
- the declared moving-line order;
- each intermediate six-bit state while stepping.

The reusable function is `steppedStatePath(from,to,order)`. It refuses an order that is not a permutation of the actual moving lines.

Example:

```text
H[010|100] Δ{3,5} → H[011|110]

L3 → L5:
H[010|100] → H[011|100] → H[011|110]

L5 → L3:
H[010|100] → H[010|110] → H[011|110]
```

The endpoints and moving set are identical; the intermediate state differs. Therefore a STEP path is not recoverable from Δ alone whenever intermediate consequences matter.

LAB remains a doorway, not a second calculus engine: it imports the existing change-calculus functions, displays the witness, places the calculation + selected path into LAB RETURN, and links to the specialist CHANGE CALCULUS surface for exact-form, native order and J-space support research.

The applied surface now also carries a compact evidence ladder:

```text
six-bit / HEX state       = descriptive lens; native control sufficiency falsified
recent exact six-verb     = history witness; native control sufficiency falsified
native forecast aperture  = lawful alternatives for one commit epoch
J-Lens readout            = read/support hypothesis; real smoke is plumbing-only
causal steering           = blocked pending semantic intervention controls + receipt
```

This is the current solve-for-all result in the strongest safe form:

> shared **experimental grammar**, not shared ontology.

```text
STATE
→ APERTURE
→ INTENT
→ SUPPORT / AMBIGUITY
→ COMMIT
→ APERTURE′
→ RE-RESOLVE
→ WITNESS
→ RETURN
```

The key quantity to expose at every reduction is not merely what the compressed label says, but **how many lawful distinctions remain hidden and whether those hidden distinctions can change the next witnessed consequence**.


## Promotion proof obligations — 2026-09-28

The support calculation and the causal promotion gate are now deliberately separate executable witnesses.

`promotion-gate.mjs` emits ten named predicates with:

- `id`;
- `pass`;
- stable failure `reason`;
- `observed`;
- `required`.

`appliedResearchFrame(...)` carries that gate beside the J-space → native-support calculation, and the Applied Calc surface renders the full proof table.

Current repository evidence is:

```text
host path resolved                    PASS
HEX sufficiency requirement           PASS / N/A on native path
native forecasts witnessed            PASS
real model fit/apply                   PASS
semantic model evidence               FAIL
real intervention executed            FAIL
zero-strength control                  FAIL
opposite/unrelated direction control  FAIL
repeated-prompt evidence               FAIL
execution receipt                      FAIL

4 / 10 pass
6 / 10 fail
status = BLOCKED
```

This sharpens the evidence typing:

```text
READOUT
  → SUPPORT CALCULATION
      asks: which already-lawful host candidates survive this explicit map?

PROMOTION GATE
  → CAUSAL EVIDENCE OBLIGATIONS
      asks: is there enough independent evidence to expose even bounded steering preview?
```

They are orthogonal. A uniquely supported native candidate can coexist with a blocked causal promotion gate. Conversely, satisfying causal model controls would not make an unsupported host operation lawful.

Even a fully passing promotion gate returns only `ELIGIBLE_FOR_BOUNDED_PREVIEW`; it never creates a commit operation or effect authority.

### Current stronger scientific boundary

The repository now has both the earlier real tiny-model fit/apply plumbing proof and a **real Qwen/Qwen2.5-1.5B-Instruct J-Lens read trace**. The Qwen trace is still observation-only: the 8-prompt fitted lens produced no `BLOOM / FOLD / SPLIT / RETURN` token in any exported top-8 cell at the sampled final position. Current evidence is therefore typed `REAL_READ_TRACE_OBSERVATION_ONLY`, not semantic steering evidence. It does not establish a useful direction or a causal host effect; those remain the six failed obligations above.

This is the reusable solve-for-all distinction:

> **legibility, support, and permission are three different questions.**

Do not collapse them into a single confidence score.

## 2026-09-28 — order-space convergence

The moving-line set is now represented as a **Boolean change lattice**, not merely an unordered Δ mask plus a list of permutations.

For `k` moving lines:

- reachable abstract intermediate states = `2^k`;
- lawful one-line directed edges = `k · 2^(k-1)`;
- complete one-line STEP orders = `k!` maximal chains;
- rank `r` contains `C(k,r)` states;
- every rank has exactly `k!` maximal-chain incidences because `C(k,r) · r! · (k-r)! = k!`.

This matters because “720 orders” at six moving lines is misleading if treated as 720 unrelated trajectories. They are 720 maximal chains reusing only 64 addressed intermediate states and 192 one-line edges. The shared state-space is the stable object; STEP selects one chain through it.

### FIELD LAB integration

DATA now renders that shared order space behind the selected FROM → PATH → TO witness. The selected factoradic chain is highlighted; STEP advances along it; ORDER selects another maximal chain; FLOW only animates the witness. No path acquires LIVE authority.

The LAB RETURN carries the bounded lattice summary (dimensions / vertices / edges / maximal chains) with the selected order witness, not a new state store.

### J-space / steering implication

A readout or steering hypothesis can at most nominate support inside a host's already-lawful option/state space. It does **not** determine a trajectory through that space. The distinction is now explicit:

`STATE SPACE ≠ PATH ≠ SUPPORT ≠ PERMISSION ≠ EFFECT`

For future causal work, compare interventions at matched lattice addresses rather than comparing only endpoint labels. If two interventions reach the same endpoint by different lawful chains, endpoint equivalence is insufficient evidence that mechanism or consequence was equivalent.

### Successor rule

Prefer enriching this shared lattice/path witness over adding another “stepped” subsystem. If a host has a different native transition graph, derive its graph explicitly and preserve the same separation between state-space witness, selected path, model support, and effect authority.

## Material projection: selected path → INK guide — 2026-09-28

A selected STEP chain may now be carried into FIELD LAB INK as a **projection-only tracing guide**.

The projection is deliberately transparent: every six-bit intermediate state becomes one point in an 8×8 matrix where the lower trigram binary value is the x coordinate and the upper trigram binary value is the y coordinate. The selected factoradic order becomes the polyline through those addressed states.

CHANGE CALCULUS path → addressed 8×8 state-matrix geometry → faint INK guide → human brush gesture → INK RETURN evidence.

The guide is `PROJECTION_ONLY`. It does not paint, select a path, promote J-space steering, or claim I Ching authorship. Once in INK, the visible stroke remains an authored wet-media trace; switching to a glyph guide discards the carried path guide rather than silently blending meanings.

This is the intended convergence pattern: **same addressed object, unequal projections, explicit residue, authorship preserved**.

## Prefix-preserving local steering donor — 2026-09-28

Transferred the useful mechanism from draft PR #483 into this richer whole-lattice lineage. `steerStepOrder(...)` treats the already-witnessed STEP prefix as immutable, lets the user nominate exactly one still-unmoved line as NEXT, and re-ranks only the future suffix with the existing Lehmer/factoradic address.

FIELD LAB exposes this as direct manipulation: future lines in the center stack are marked with a small steering aperture, and lawful one-edge lattice successors are ringed. Tapping either calls the same calculation-only steering primitive. No new control row, host mutation, LIVE `release()`, divinatory authority, or J-space causal promotion is introduced.

The end-to-end browser proof now exercises a three-line interval: choose L5 first, witness it, choose L3 second while preserving prefix L5, then carry the resulting ordered path into INK and return authored pigment evidence.

After this transfer is verified, PR #483 should remain provenance/donor only rather than a second maintained change-lattice implementation.


## 2026-09-29 — complete NEXT frontier / solve-for-all refinement

The prior lattice pass made the whole finite state space visible, but ordinary use still privileged one selected chain. The current refinement makes the **current frontier** first-class without promoting it into a planner.

New reusable witnesses:

- `stateFrontierCalculation(from,to,order,cursor)`
- `exactFormFrontierCalculation(fromForm,toForm,order,cursor,steering)`

### State frontier

At any witnessed STEP prefix, enumerate **every still-lawful one-line successor**. For each candidate retain:

- addressed line;
- exact bit transition and derived Yi endpoint line value;
- successor six-bit/hex token;
- lower/upper trigram consequence;
- stable factoradic path address if that edge is chosen next;
- number of future maximal paths after the edge;
- number of distinct prefix histories collapsed into the successor.

For a transition with `r` remaining moving lines:

```text
NEXT candidates                 = r
future paths from current       = r!
future paths after any NEXT     = (r-1)!
histories collapsed at depth d  = d!
```

This makes two different ambiguities simultaneously visible:

1. **future ambiguity** — what can still happen from here;
2. **history ambiguity** — how many prior orders can already have converged on the same current vertex.

A compact state label is therefore not just a compression of object detail; it may also be a compression of **trajectory history**.

### Exact-form + J-space support overlay

When exact FOLD/BLOOM forms and a J-Lens support calculation are both supplied, `exactFormFrontierCalculation(...)` annotates every exact NEXT edit with:

- target control verb;
- whether the six-bit quotient visibly changes;
- exported top-k conditional model weight for that target verb, when present;
- current native forecast candidate count;
- support status;
- remaining exact edit orders.

The annotation is deliberately typed:

```text
MODEL READOUT
  → CURRENT-EPOCH HOST SUPPORT
  → annotation on NEXT frontier

NOT:
MODEL READOUT
  → ranking
  → permission
  → queued multi-step plan
```

Every native-support annotation is scoped `CURRENT_NATIVE_APERTURE_ONLY`. A real commit invalidates that aperture; the next intent must be re-resolved against the host's new state.

### FIELD LAB experience

LAB DATA now exposes this frontier directly below the selected STEP path.

Each NEXT button answers, before selection:

```text
which line?
what transition?
what trigram consequence?
how many futures remain?
```

Selecting a NEXT edge uses the existing prefix-preserving `steerStepOrder(...)` primitive. Already-witnessed history is frozen; only the unseen suffix is reranked. The same frontier is preserved in the existing LAB RETURN packet.

Browser proof extends the existing change→INK and mobile smokes rather than creating a new test harness:

- 3-line interval begins with 3 NEXT candidates and 6 future paths;
- after witnessing L5, frontier contracts to 2 NEXT candidates and 2 future paths;
- steering L3 next preserves the witnessed L5 prefix;
- RETURN carries the current frontier witness;
- the selected path may still project to INK without changing authority.

### Solve-for-all result

The shared experimental grammar is now better stated as:

```text
STATE
→ APERTURE / FRONTIER
→ ALL LAWFUL NEXT CANDIDATES
→ INTENT
→ SUPPORT / RESIDUE
→ SELECT ONE EDGE
→ WITNESS
→ APERTURE′ / FRONTIER′
→ RE-RESOLVE
→ RETURN
```

The crucial improvement is **ALL before ONE**.

A useful system should expose the lawful alternatives and their residue before collapsing them into a chosen path. That principle applies beyond six-bit state:

- UI actions;
- model-tool plans;
- physical procedures;
- repository operations;
- reading/navigation choices;
- host/game operations.

The representation may differ radically by host. The invariant is that candidate space, selected path, evidence, and effect authority remain separable and recoverable.
