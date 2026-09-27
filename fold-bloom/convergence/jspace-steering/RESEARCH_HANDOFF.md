# J-SPACE / J-LENS STEERING DONOR — SUCCESSOR HANDOFF

Status: **BOUNDED CANDIDATE DONOR — READ/PREVIEW CONTRACT IMPLEMENTED; REAL MODEL INTERVENTION NOT YET EXECUTED**
Date: **2026-09-27**

This is deliberately not a new app, core, store, model runtime, or authority layer. It is a small transport contract connecting real Jacobian-lens evidence to existing FIELD / INTERPHASE / FOLD//BLOOM machinery.

## Recover first

1. `/control/CURRENT.json`
2. `/AGENTS.md`
3. `/lib/interphase-core.js`
4. `/lib/interphase-readfield.js`
5. `/lib/interphase-listen.js`
6. `/lib/field-pulse.js`
7. `/fold-bloom/live/engine.js`
8. `/fold-bloom/convergence/geometric-interphase/RESEARCH_HANDOFF.md`
9. this directory

## External source pinned

Anthropic reference implementation:

- repo: `anthropics/jacobian-lens`
- commit inspected: `581d398613e5602a5af361e1c34d3a92ea82ba8e` (`Initial release`)
- license: Apache-2.0
- key upstream API: `JacobianLens.apply(model, prompt, ...) -> (lens_logits, model_logits, input_ids)`
- upstream equation: `lens_l(h) = unembed(J_l @ h)`, where `J_l` is an average input-output Jacobian.

Do not silently replace the pinned behavior with assumptions from a video summary.

## What was implemented

### `kernel.mjs`

Portable contracts:

```text
field-jlens-trace/v0.1
    ↓ READ
addressed cell: jlens://MODEL/LENS/L{layer}/P{position}
    ↓ explicit external direction ref
field-steering-request/v0.1
    ↓ model-side executor ONLY
before/after traces + execution receipt
    ↓ WITNESS
field-steering-return/v0.1
    ↓ optional authority-NONE context
field-pulse/v0.1 kind=steering
```

Hard boundary: **decoded token != causal direction**. `buildSteeringRequest()` refuses to create an intervention request without `direction.ref`. J-Lens says what a state is disposed to make the model say; it does not by itself supply the hidden-space vector that should be added/subtracted for a causal intervention.

A RETURN distinguishes:

- observational before/after comparison; versus
- an intervention for which an external executor supplied a concrete execution receipt.

Even the latter is recorded as intervention + observed delta, not automatic proof of a general causal law.

### `export_jlens.py`

A thin bridge over Anthropic's public package. It loads an open-weight HF decoder, loads a fitted Jacobian lens, calls the upstream `apply()`, and writes the portable `field-jlens-trace/v0.1` JSON. It preserves prompt, exact input token IDs, model/lens identifiers, fitted-lens metadata, layers/positions, ranked token readouts, and the actual final model output row.

It does **not** fit a lens automatically and does **not** implement interventions.

### `fold-bloom-adapter.mjs`

A strict preview adapter. It accepts:

1. a snapshot of native FOLD//BLOOM state;
2. native `availableForecasts(state)` output produced by the existing engine;
3. one addressed J-Lens cell.

Only the explicit control vocabulary `BLOOM / FOLD / SPLIT / RETURN` is mapped by default. The model-derived signal may choose among already-lawful native forecasts. The adapter returns `authority: PREVIEW`, `commit_operation: null`, and proves it did not mutate the supplied host snapshot.

No model signal gains LIVE/SET authority.

### Generic INTERPHASE steering aperture

`interphase-adapter.mjs` now implements the cross-host form without binding any host:

```text
authority-NONE steering pulse
        ↓
host-owned explicit direction→operation map
        ↓
verify operation already exists in host.describe(...).operations
        ↓
PREVIEW candidate only
```

If the mapping is absent, the result is `SUPPORT=0:STEERING_MAPPING`. If the mapped operation is not already supported by the host, the result is `SUPPORT=0:<operation>`. The adapter never calls `host.invoke()`, never commits, and reports the host operation's native authority without inheriting it. This is the reusable seam for READFIELD, LISTEN, BODY, HOUSE, Dayline, Poetry, etc.; each host must still author its own semantics.

## Why this belongs in Fold/Bloom but not only Fold/Bloom

The useful primitive is not “LLM visualization.” It is:

```text
STATE → READABLE DIRECTIONAL SIGNAL → LAWFUL HOST OPTIONS → STEER → WITNESS → RETURN
```

FOLD//BLOOM already has native forecasts, explicit verbs, a ride/control grammar, witnessed consequences, and RETURN. That makes it a good concrete driver surface.

Across other hosts, the same steering pulse can be treated as **ephemeral context only**. A host must explicitly map it to its own supported operations; absence of a mapping means `SUPPORT=0`, not guessed semantics. This preserves the existing law that borrowed context does not borrow authorship/effect authority.

## Local proof executed

Run:

```sh
node fold-bloom/convergence/jspace-steering/selftest.mjs
python -m py_compile fold-bloom/convergence/jspace-steering/export_jlens.py
```

Observed candidate checks:

- trace schema and stable layer/position address;
- token observation cannot substitute for a causal direction ref;
- steering request requires explicit commit + return semantics;
- before/after witness distinguishes observation from executed intervention;
- steering pulse carries cross-surface authority `NONE`;
- FOLD//BLOOM preview maps only explicit control vocabulary to native lawful forecasts;
- host snapshot remains byte-equivalent under preview.

This local proof uses synthetic trace/forecast fixtures. It is **not evidence that an Anthropic/Qwen lens has been run on this machine** and **not evidence that a real residual intervention changes FOLD//BLOOM or model behavior**.

## The next real experiment

Use a small Qwen-class model first. Do not begin on the 32B local model.

Example shape:

```sh
# external env, not vendored into this repo
uv venv
source .venv/bin/activate
uv pip install torch transformers huggingface_hub
uv pip install 'git+https://github.com/anthropics/jacobian-lens@581d398613e5602a5af361e1c34d3a92ea82ba8e'

python fold-bloom/convergence/jspace-steering/export_jlens.py \
  --model <open-weight-model> \
  --lens <local-or-hf-lens> \
  --prompt 'Choose one control verb: BLOOM, FOLD, SPLIT, or RETURN.' \
  --positions -1 \
  --out /tmp/jlens-before.json
```

If no pre-fitted compatible lens exists, fit one using upstream `jlens.fit()` first. Keep that expensive artifact outside this static repo; record its exact hash/ref here.

Then supply a **real direction vector reference** from a model-side intervention experiment, execute one bounded perturbation, export `/tmp/jlens-after.json`, and call `witnessSteering(before, after, request, {committed:true, receipt_ref:...})`.

Minimum causal controls before claiming a steering direction works:

- same prompt/model/lens/revision;
- same target layer/position;
- zero-strength control;
- opposite-sign or unrelated-direction control;
- multiple prompts, not one anecdote;
- exact execution receipt and before/after traces.

## Fold/Bloom real binding

The bridge is intentionally one line of native authority:

```js
const forecasts = availableForecasts(liveState); // existing engine owns this
const preview = previewFoldBloomDrive(liveState, forecasts, trace, target);
```

Do not move `availableForecasts`, `release`, `rotateSteps`, source clocks, seams, SET order, or LIVE state into this donor.

A later runtime binding is justified only after a real J-Lens trace exists. Until then, importing this candidate into production pages would increase surface without evidence.

## General-host binding law

For READFIELD, BODY, HOUSE, Dayline, Poetry, etc.:

```text
steering pulse
  ├─ host declares explicit token/direction → native operation mapping → PREVIEW
  └─ no mapping → SUPPORT=0
```

No automatic universal semantic mapping. `FOLD` in a language model is not globally identical to a fold gesture, a fold seam, a UI collapse, or a physical bend.

## Stop rules

- no second event bus: use existing FIELD PULSE envelope if cross-surface context is needed;
- no new global steering ontology;
- no hidden vector synthesized from decoded token labels;
- no effect authority from a projection/pulse;
- no production UI before one real model trace removes the current evidence gap;
- no “causal” claim from readout correlation alone;
- no 32B-first experiment when a 1.5B–8B model can validate the pipeline.

## Successor shortest task

**Run one real open-weight J-Lens read trace, preserve the exact model/lens refs, then either stop with that evidence or execute exactly one controlled residual-direction perturbation and RETURN the before/after witness.**


## Change-calculus continuation — 2026-09-27

The steering donor now has a separate applied-research companion at:

`/fold-bloom/convergence/change-calculus/`

Recover its `RESEARCH_HANDOFF.md` before inventing another symbolic layer. It makes three losses explicit:

- exact six-verb form → binary hex quotient;
- endpoint moving-set → unordered STEP ambiguity;
- J-Lens top-k readout → explicit host-support calculation.

The Fold/Bloom steering preview now carries `fold-bloom-steering-calculation/v0.1`, including top-k conditional weights, mapped control weight, host-supported weight, candidate counts and residue. These weights are conditional only on exported top-k tokens and are never full-vocabulary model probabilities.

Critical next research test: determine whether any six-bit/hex macrostate is behaviorally sufficient for a named LIVE control property. Until a lumpability/bisimulation-like test passes, the hex layer remains a projection beside exact verbs, not a replacement control state.


## Real pretrained fit/apply smoke — 2026-09-27

This gate is now **RUN**.

Workflow: `.github/workflows/jlens-real-smoke.yml`  
Script: `real_model_smoke.py`  
Run: **36296854890 PASS**  
Artifact: `jlens-real-smoke` · id `10923953545` · digest `sha256:2d5962ec36406d119b00f696d0e8b39896566a80d4665b400f54583f39b9b9ae`

Pinned inputs:

- model: `sshleifer/tiny-gpt2@5f91d94bd9cd7190a9f3216ff93cd1dd95f2c7be`
- Anthropic J-Lens: `581d398613e5602a5af361e1c34d3a92ea82ba8e`
- model shape: 2 layers, `d_model=2`
- fitted prompts: 1
- source layer: 0
- target layer: 1

Observed fitted Jacobian:

```text
[[ 0.98631734,  0.01368271],
 [-0.03695348,  1.03695357]]
```

```text
Frobenius norm = 1.4316589832
determinant    = 1.0232708454
finite         = true
```

The J-Lens and final-model top-five token ordering matched on the sampled position. That is useful only as a plumbing witness.

**Truth boundary:** this is a real pretrained model, a real fitted Jacobian, and a real `lens.apply()` result. It is intentionally a tiny checkpoint, so it does **not** establish a useful semantic workspace, a meaningful steering direction, or causal intervention quality.

The exact fitted lens and FIELD-compatible trace are preserved in the Actions artifact for 14 days. The next meaningful model gate must use a substantially capable open-weight decoder and repeated prompts.

## Executable promotion gate

`promotion-gate.mjs` now encodes the join law.

Current evidence is intentionally `BLOCKED` from causal steering promotion because:

- model evidence class is `PLUMBING_ONLY`;
- no real residual intervention has been executed;
- zero and opposite/unrelated controls do not exist yet;
- repeated-prompt causal evidence does not exist yet.

A falsified HEX macrostate also cannot be substituted for native host forecasts. Even a future passing model intervention yields only `ELIGIBLE_FOR_BOUNDED_PREVIEW`, never an automatic commit operation.

## First real open-weight read trace — 2026-09-27

Status: **RUN — observation only; no intervention; promotion gate unchanged (`BLOCKED`).**

- run: local (Mac mini M4), venv-only; artifacts in `~/void-anchor/AXIS/work/jspace-trace-2026-09-27/` (RECEIPT.md, trace JSON, validator outputs, fit script); fitted lens kept in scratch, not committed.
- model: `Qwen/Qwen2.5-1.5B-Instruct@989aa7980e4cf806f80c7fef2b1adb7bc71aa306` (28 layers, d_model=1536) — the "substantially capable open-weight decoder" this gate required. (0.5B step-down not needed.)
- lens: fitted locally via upstream `jlens` 0.1.0 (layers 0–26 → 27, n_prompts=8, sha256 `b5c15096…41941`). Eight fit prompts is below the paper's ~100-usable guidance and is recorded as a limitation, not hidden.
- trace: `field-jlens-trace/v0.1` · id `jlens:7c2310b9afe3894e0714` · sha256 `345826c9…b8af46` · donor `kernel.mjs` `normalizeTrace` **PASS** (18 exact token IDs; 28 cells at P17; ranked top-8) · donor `selftest.mjs` **PASS 8/8**.
- measured: model download 50 s · fit 601 s (75.2 s/prompt) · export 14 s · ≈33 min total.
- observation: **no control verb (BLOOM / FOLD / SPLIT / RETURN) appears in any top-8** at the final position — an honest negative; no direction is claimed. Late-layer readouts converge to the model output token.
- return: `/returns/JSPACE_REAL_TRACE_2026-09-27.json`.
- next: repeated-prompt read traces and/or an ~100-prompt refit (~2 h at ~75 s/prompt, shardable via `JacobianLens.merge()`); only then — as a separate, gated step — one bounded residual perturbation with an external `direction.ref` plus zero/opposite controls.

