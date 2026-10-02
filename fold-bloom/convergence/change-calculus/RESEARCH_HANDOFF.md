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

### E1 — HEX quotient control-loss witness

Goal: make projection loss directly inspectable rather than merely asserted.

The native search already falsifies HEX control sufficiency for the named property `NEXT_LAWFUL_FORECAST_SET + CALL + TARGET_TYPE`. FIELD LAB now converts that proof into one reversible A/B investigation inside the existing calculation-tape lane:

```text
PROVE LOSS
→ deterministic lawful LIVE search
→ first same-HEX / unequal-native-NEXT pair
→ freeze exact recent verbs + native forecast apertures + native dependency factors
→ A ↔ B
→ HEX label stays fixed while lawful NEXT changes
→ RETURN carries the witness
```

The witness exposes which current forecast-factor fields differ (`cell_types / target_type / anchors / creases / charge`) and which forecast slots exist only on A, only on B, or survive at the same slot with changed consequence.

This is deliberately stronger than a static warning and deliberately weaker than a new controller:

- it never calls `release()`;
- it does not claim HEX is globally useless;
- it proves only that this projection is insufficient for the named control property on the witnessed pair;
- it does not rank or select a native action;
- model/J-space evidence remains separate and cannot inherit host effect authority.

**Promotion condition:** a compact projection may own a named control property only after bounded native evidence fails to produce unequal lawful consequences across its collapsed states. Until then, preserve the dropped residue or re-resolve through the native host.

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


## 2026-09-30 — LAB convergence calculation tape

FIELD LAB DATA now projects the already-existing change/steering mechanisms as one compact inspectable tape:

```text
SOURCE → QUOTIENT → PATH → NEXT → NATIVE → MODEL → RETURN
```

This is a **derived witness**, not another reducer, bus, store, state machine, or authority source.

Stage ownership remains unequal:

- **SOURCE** — supplied six-bit endpoint pair.
- **QUOTIENT** — transparent (d_H), moving-line set and collapsed temporal-order residue.
- **PATH** — one factoradic maximal chain with an exact path address.
- **NEXT** — every remaining one-line successor from the witnessed prefix plus remaining path multiplicity.
- **NATIVE** — the latest LIVE-owned lawful forecast aperture witnessed through the existing FIELD PULSE bridge.
- **MODEL** — only (C(direction,s)), the subset of the current native aperture matching the authority-NONE direction witness, plus (a=log_2|C|).
- **RETURN** — exact address for re-entering the inspected calculation.

The new pure `calculationTape(...)` projection lives in the existing change-calculus kernel and is covered by the normal selftest. LAB renders the seven stages as tap-to-inspect VIEW operations and includes the tape in its ordinary DATA RETURN. Clicking a stage may change only the LAB witness address/status; it does not select a NEXT edge, call LIVE `release()`, cast I Ching, or promote J-space support.

The key experiential reduction is that the former adjacent STATE/STEP and LIVE/J-space panels now share one visible provenance spine. The user can see where information is compressed, where order is restored, where abstract possibility becomes host-lawful support, and where model support stops before effect authority.


## 2026-09-30 — perceptual falsifier inside the tape

The calculation tape is the convergence spine. The A/B control-loss witness is a bounded experiment inside that spine, not an eighth stage and not another state owner.

Reducer move:

```text
projection warning
→ executable falsifier
→ replayable A/B witness
→ exact dropped factor
→ RETURN
```

When a representation is known to be lossy, prefer this pattern over another explanatory layer: expose one concrete pair the representation collapses, show the downstream lawful difference, name the residue, and preserve the owner that can re-resolve it.

Owners remain unequal:

- I Ching / HEX = readable structural projection;
- STEP / lattice = finite path/order calculation;
- J-space = read/support research evidence;
- LIVE = native lawful forecast/effect authority;
- LAB = comparison, preview and RETURN only.

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


## 2026-09-29 — native forecast factorization

The earlier LIVE sufficiency experiment established a negative result: neither the HEX quotient nor the recent exact six-verb form is sufficient for the named native next-forecast property.

The new pass answers the constructive follow-up without inventing a replacement ontology.

For the current `availableForecasts()` implementation, the native aperture separates into two explicit dependency layers:

```text
STRUCTURAL FORECAST
= f(cell types, target type, anchors, creases)

FULL FORECAST
= f(structural factor, charge)
```

A deterministic native experiment reconstructs forecasts from only those factors across lawful LIVE snapshots.

The structural comparison includes slot, type, verb, chain, cascade path, added edge and span. The full comparison additionally includes cadence and power. Removing charge still preserves structural topology but changes full forecast output on observed snapshots, making charge an explicit performance residue rather than hidden state.

This is stronger than another correlation over labels because the factor is fed back through the existing native `availableForecasts()` function. It is still deliberately bounded:

- it does **not** claim the factor is minimal;
- it does not include current gate alignment / rotation;
- it does not replace CALL/history;
- it does not describe post-RELEASE mutation;
- it does not include source timing, audio or presentation;
- it grants no execution authority.

### Convergence consequence

The stable separation is now:

```text
HISTORY / HEX / MODEL READOUT
        ↓ annotate
NATIVE FORECAST FACTOR
        ↓ computes
CURRENT FORECAST APERTURE
        ↓ expose ALL
INTENT / SELECT ONE
        ↓ commit by host only
RELEASE
        ↓ invalidates old aperture
RECOMPUTE FACTOR + APERTURE
        ↓
WITNESS / RETURN
```

This gives STEP, J-space and FOLD//BLOOM one shared non-equivalence law: **a representation may help describe or nominate an option, but the current native dependency factor owns what options actually exist.**

The applied-research surface exposes this as an explicit `RUN SUFFICIENCY + FACTOR AUDIT` action. It remains research-only and performs no LIVE commit.


## 2026-09-30 — LIVE release window → LAB change witness

FIELD LAB DATA now has a bounded bridge from **observed LIVE play** into the existing change calculus. It reuses `field-pulse/v0.1`; no second bus, store, or control path was added.

The seam is:

```text
LIVE release()
  → FIELD PULSE operation { BLOOM | FOLD | SPLIT | RETURN }
      + bounded post-release native forecast aperture
  → rolling six-release exact window
  → Q : V^6 → B^6
  → hex/change witness
  → optional FROM / TO capture
  → exact-vs-quotient residue
      + native NEXT comparison
  → STEP / lattice / INK / RETURN
```

Implementation:

- `/fold-bloom/lab/live-change-bridge.js`
- `/fold-bloom/lab/tests/live-change-bridge.test.mjs`
- `/tools/fold-bloom-lab-live-change-smoke.mjs`
- `/tools/fold-bloom-live-lab-change-bridge-smoke.mjs`

### What becomes experiential

A person can run LIVE in another tab, make releases, then see LAB accumulate the last six exact operations. Each committed release now also publishes the bounded post-release `forecastContext(state)` witness already owned by LIVE. LAB preserves the native structural comparison fields (`slot`, `type`, `verb`, `chain`, cascade `path`, `edgeAdded`, `span`) plus cadence/power residue, matching the existing forecast-factorization proof rather than comparing a weakened surrogate. Once six exist, LAB keeps three unequal readings together:

- the exact ordered verb window;
- its binary hex projection; and
- the most recent native lawful NEXT aperture (`NATIVE_EVIDENCE`).

`CAPTURE → FROM` and `CAPTURE → TO` freeze exact event refs, the projected bits and the observed post-release native NEXT aperture. The existing state/change machinery then receives the projected endpoints while the bridge retains the exact verbs and native support evidence.

This makes quotient loss inspectable from lived play. Two captured windows may have the **same hex endpoints** while every exact verb changed. LAB reports this explicitly as:

```text
EXACT Δ
HEX Δ
INVISIBLE EXACT Δ
64× exact-form fiber
NATIVE NEXT · SAME | DIFF
```

The point is not to make hex state more authoritative. The point is to let the user feel and inspect where the abstraction stops carrying the run. If two captures share one hex address while their native NEXT apertures differ, LAB labels that as a **lived control-sufficiency counterexample** rather than silently promoting the quotient.

### J-space beside the run, never above it

The same bridge may display a contemporaneous `kind=steering` FIELD PULSE only when `steeringDescriptor()` accepts it, including the invariant:

```text
data.authority = NONE
```

That steering witness travels beside the LIVE evidence in LAB RETURN. It does not:

- call `release()`;
- replace `availableForecasts()`;
- select a STEP edge;
- persist native support across a commit;
- become a causal steering claim.

An invalid/effect-authority steering pulse is ignored.

### RETURN law

LAB RETURN now may preserve:

- current rolling LIVE exact window;
- FROM / TO captured exact forms and event refs;
- exact-vs-hex comparison;
- bounded post-release native forecast evidence and native-NEXT comparison;
- optional authority-NONE steering witness.

The bridge is therefore a **research witness over real play**, not a new gameplay state machine.

### Proof gates

Run:

```sh
node --test fold-bloom/lab/tests/live-change-bridge.test.mjs
node tools/fold-bloom-lab-live-change-smoke.mjs
node tools/fold-bloom-live-lab-change-bridge-smoke.mjs
```

The deterministic LAB browser proof injects two six-release windows with the same hex projection but six exact same-polarity edits and intentionally unequal native NEXT apertures. It requires `EXACT Δ 6 / HEX Δ 0 / INVISIBLE 6 / NATIVE NEXT DIFF`, verifies both event windows and native evidence survive RETURN, and verifies an `AUTHORITY EFFECT` steering pulse cannot overwrite the accepted `AUTHORITY NONE` witness.

A separate end-to-end browser proof runs actual `/fold-bloom/live/` and `/fold-bloom/lab/` iframes together, executes six lawful LIVE releases through the public interaction surface, and requires LAB's observed exact window to equal LIVE's own last-six history while the retained native candidate count/target equal LIVE's current `forecastContext`. This proves the real BroadcastChannel seam, not merely the message schema.


## 2026-09-30 — direction support becomes host-relative

The LIVE→LAB bridge now folds the steering donor one step deeper without promoting it.

A model-side direction label is no longer displayed as an isolated hint. LAB asks a narrower, reproducible question against the **current witnessed native aperture**:

```text
C(direction, s)
  = { f ∈ nativeForecasts(s)
      | verb(f) = vocabulary(direction) }
```

The shared primitive lives in `/fold-bloom/convergence/jspace-steering/steering-calculus.mjs` as:

```text
directionSupportCalculation(direction, nativeForecasts)
```

It exposes:

- mapped control verb, if any;
- current native candidate count `|C|`;
- candidate slots and bounded candidate witnesses;
- `a = log2(|C|)` candidate-ambiguity bits when `|C| > 0`;
- one of `OUTSIDE_CONTROL_VOCABULARY`, `NO_NATIVE_CANDIDATE`, `UNIQUE_NATIVE_CANDIDATE`, or `MULTIPLE_NATIVE_CANDIDATES`;
- `authority: CALCULATION_ONLY`.

This is deliberately **host-relative**. The latest native aperture is retained as its own witness lane and does not wait for the six-release history window to become complete; the history window exists for the exact-form/HEX quotient experiment, not for host support. The same accepted authority-NONE direction may be supported in one native aperture and unsupported after a LIVE commit changes the host state. The browser proof now demonstrates exactly that transition.

The important law is:

```text
MODEL DIRECTION
  → query current lawful host aperture
  → expose 0 / 1 / N support
  → preserve ambiguity + residue
  → host alone may commit
  → commit invalidates the old aperture
  → re-resolve
```

Not:

```text
MODEL DIRECTION
  → universal semantic command
  → cached permission
  → execution
```

### Experience refinement

When LIVE FROM/TO captures remain attached to the current LAB endpoints, the DATA field now renders the exact operation symbols beside their corresponding binary lines.

This means a same-polarity edit such as:

```text
BLOOM → FOLD
```

can remain visually marked as an **exact change** even while:

```text
q(BLOOM) = q(FOLD) = 1
```

and the hex line therefore does not move.

The field also carries a compact witness for:

```text
EXACT Δ
HEX Δ
INVISIBLE EXACT Δ
NATIVE NEXT SAME|DIFF
MODEL direction → |C| + ambiguity
```

so the user does not need to reconstruct the convergence from panel prose.

This is the intended experiential direction for future transfers: make abstraction loss, lawful support and authority boundaries **perceptible at the manipulation site**, not merely documented afterward.

### RETURN extension

`liveChangeBridgeReturn(...)` now preserves a separate `steering_support` witness beside:

- the authority-NONE steering context;
- the exact LIVE release window;
- the hex quotient;
- FROM/TO captures;
- native NEXT evidence.

The returned support witness remains calculation-only and names the exact native aperture against which it was resolved.


## 2026-09-30 — native aperture becomes perceptual

The previous pass made host-relative support numerically inspectable. The next conversion moves the **current native forecast aperture itself** into the DATA field without adding a controller.

LAB now projects LIVE's latest witnessed `forecastContext(state)` onto a stable twelve-slot halo around the change object:

```text
12 stable LIVE slots
  ├─ empty slot             = no lawful forecast now
  ├─ native forecast slot   = lawful host candidate
  ├─ model-supported slot   = member of C(direction,s)
  └─ focused slot           = local evidence/address only
```

The halo is derived exclusively from `native_latest`; the six-release exact/HEX history remains a different lane. Model support is still the subset:

```text
C(direction,s) ⊆ nativeForecasts(s)
```

and never the source of the aperture.

### Interaction boundary

Tapping a halo slot performs only:

```text
SLOT
→ VIEW-LOCAL FOCUS
→ field://lab/live/<instance>/seq/<seq>/slot/<n>
→ bounded witness detail
→ RETURN
```

It does **not** call LIVE, seek the LIVE ring, queue a release, alter STEP order, or grant effect authority. Empty slots remain inspectable as `NATIVE=0` evidence instead of disappearing; model support remains a separate subset label.

The focus witness carries:

- LIVE instance;
- native forecast sequence;
- stable slot;
- whether a forecast currently exists;
- whether the current authority-NONE model direction supports it;
- bounded verb / chain / cadence / power / path detail.

FIELD LAB RETURN may preserve that focus as `nativeFocus` with `authority: VIEW_ONLY`.

### Why this matters

The steering calculation was previously correct but still panel-shaped. The spatial projection lets a person perceive the important nesting directly:

```text
ALL 12 stable positions
  ⊃ current lawful native aperture
      ⊃ current model-supported subset C
          ⊃ one locally inspected witness
```

This is the stronger reusable pattern:

**stable address space → lawful host aperture → advisory support subset → local focus → host-only commit elsewhere.**

It gives "driving / steering" a concrete geometry while preserving the rule that a co-driver may illuminate a road but does not acquire the steering wheel.


## 2026-09-30 — #705 donor reduced into the single calculation tape

The convergence reducer held PR #705 as donor-only because #714 owns this LAB/change-calculus/J-space surface. Its unique residue is now folded into the existing seven-stage tape rather than maintained as a second convergence object.

For exact six-verb FROM/TO evidence let:

- `e` = exact operation positions that changed;
- `v` = positions whose binary HEX quotient changed.

The tape now preserves the distinct trajectory compression:

```text
exact one-edit paths      = e!
visible quotient paths    = v!
path fiber                = e! / v!
path residue bits         = log2(e! / v!)
```

This matters beyond endpoint fiber. Same-polarity edits such as `BLOOM→FOLD` or `SPLIT→RETURN` can disappear from the quotient **and from the visible STEP trajectory/interleaving**.

### Single-tape experience

No stage was added.

- **QUOTIENT** names how many exact operation edits are invisible.
- **PATH** exposes the exact-path fiber and residue bits when attached LIVE exact evidence matches the current state endpoints.
- **NEXT** keeps exact target verbs beside the abstract edge, including current native candidate count and authority-NONE model-direction alignment.
- Exact edits with no quotient edge remain visible as **EXACT RESIDUE inside NEXT**, not as a second panel/plan.
- If the HEX quotient is already at `TARGET REACHED`, exact residue is still rendered. Quotient completion is not allowed to erase lower-level change.

The current native aperture remains the only source for candidate support. Model alignment only annotates whether the accepted authority-NONE direction names the same exact target verb.

```text
HEX TARGET REACHED
  ≠ exact operation identity preserved
  ≠ native support
  ≠ permission
  ≠ effect
```

A host commit still invalidates the old native-support witness and requires re-resolution.

### Proof requirement

The existing calculus selftest now proves path-fiber arithmetic and exact/native/model annotations on the tape. Browser proof must additionally require that same-HEX / six-exact-edit evidence remains visibly present inside the tape rather than disappearing behind `TARGET REACHED`.


## 2026-09-30 — selected STEP × exact-fiber attachment

When same-LIVE-instance FROM/TO captures are attached to the current six-bit endpoints, LAB may enrich the existing tape with the exact operation fiber.

The attachment law is deliberately asymmetric:

```text
selected quotient-visible STEP order
→ preserve that visible order exactly
→ append quotient-invisible exact edits in canonical addressed line order
→ mark this as ONE REPRESENTATIVE
→ retain e!/v! and log2(e!/v!) as the collapsed exact-path fiber
```

The representative is not claimed to be historical execution order. It exists so PATH/NEXT can expose exact verb residue and current native/model support without inventing hidden chronology.

If captures detach from the current endpoints, come from different LIVE instances, or cannot preserve the selected visible order, the exact-path attachment disappears rather than guessing.


## 2026-10-03 — STATE LENS + compact REDUCER convergence

This pass removes one remaining experience seam without creating another state authority.

### I Ching state lens

FIELD LAB can now open its supplied six-bit endpoints directly in `/iching/` as:

```text
FROM bits
→ derived 6/7/8/9 line values
→ marked moving lines
→ supplied TO transform
→ classical Judgment / Image / Lines / Nuclear / Sequence lenses
```

Hard boundary:

```text
SUPPLIED STATE TRANSITION ≠ RANDOM CAST
```

The I Ching surface labels this explicitly as **STATE LENS · SUPPLIED ENDPOINTS · NOT A CAST**. The current LAB STEP order may travel with the link, but it is displayed as non-classical experiment metadata, not attributed to the Yi text.

This gives the same state transition three unequal but connected witnesses:

1. FIELD LAB calculation / lattice / path address;
2. I Ching structural + textual lens;
3. optional STEP→INK geometric projection.

They share endpoints and addresses. They do not share authority.

### Compact reducer

DATA now has one operational row:

```text
NEXT → SUPPORT → RETURN
```

- **NEXT** walks one step on the already-selected addressed preview path. It never calls LIVE.
- **SUPPORT** reads the current authority-NONE J-space direction against the latest native LIVE forecast aperture.
  - `C=0`: no lawful mapped candidate.
  - `C=1`: LAB may focus that one already-lawful native candidate for inspection.
  - `C>1`: LAB refuses automatic choice and reports ambiguity.
- **RETURN** resets STEP preview and native focus only. LIVE remains untouched.

The compact readout keeps the transparent mechanics in one line:

```text
k · V=2^k · E=k·2^(k-1) · CHAINS=k! · STEP · NEXT · C(direction,s) · RETURN address
```

This is a reducer of existing mechanisms, not a new planner.

### Successor rule

Do not extend this into auto-commit.

The strongest lawful future composition is still:

```text
OBSERVE
→ CALCULATE
→ PREVIEW ONE ADDRESSED PATH
→ INSPECT CURRENT NATIVE SUPPORT
→ HUMAN / HOST COMMIT ELSEWHERE
→ REFRESH APERTURE
→ WITNESS
→ RETURN
```

Any implementation that carries native support across a real commit, treats STEP order as classical I Ching doctrine, or converts `C=1` into effect authority regresses the evidence boundary.
