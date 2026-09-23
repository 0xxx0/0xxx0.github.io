# HERMES DAILY PROMPT GENERATOR

A disposable daily charter compiler for CONFLUENCE/FIELD.

It reads live `CURRENT.json`, `QUEUE.json`, `WAITING.json`, plus Git state, then emits a paste-ready Hermes prompt. It does **not** mutate control state.

## Modes

- `setup` — machine/repo/operator readiness.
- `confluence` — bounded cross-lineage transfer.
- `houseclean` — workers/branches/control residue reconciliation.
- `tzimtzum` — contraction without amnesia: reduce live surface while preserving return paths.
- `full` — setup → houseclean → tzimtzum → at most one conversion-enabling move.

## Typical use

```bash
python3 scripts/hermes-daily-prompt.py --mode full
```

Copy directly on macOS:

```bash
python3 scripts/hermes-daily-prompt.py --mode full | pbcopy
```

Generate a Hermes goal-draft payload:

```bash
python3 scripts/hermes-daily-prompt.py --mode tzimtzum --goal-draft | pbcopy
```

Write a disposable local prompt outside the repo:

```bash
python3 scripts/hermes-daily-prompt.py \
  --mode houseclean \
  --out ~/.hermes/daily/$(date +%F).md
```

Daily generated files are projections, not canonical state. Preserve only verified RETURNS/deltas that earn durability.

## Tzimtzum law

Contraction may park, link, compress, reconcile or demote. It must not destroy unique source, contradictions, provenance or the ability to reconstruct/RETURN.
