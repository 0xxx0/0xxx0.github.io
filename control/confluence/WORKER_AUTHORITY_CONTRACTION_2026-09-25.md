# WORKER AUTHORITY CONTRACTION — 2026-09-25

## Object

Worker re-entry / autonomous task selection across FIELD, Hermes and other replaceable executors.

## Defect

`/control/WORKER_BOOT.json` was generated on 2026-09-22 but still carried copied head state after FIELD INDEX, READFIELD, HUMAN PORT and FOLD//BLOOM advanced. Meanwhile PR #245 introduced the stronger law: stable authority pointers plus a transient selective handoff compiler.

The stale snapshot and the Sep-21 Hermes `ready_tasks` therefore formed a divergence vector: a fresh worker could legally read current authority, then re-expand into old BODY / PRINT / representation / QA packets merely because they were still listed.

## Delta

- `/control/WORKER_BOOT.json` becomes a compatibility pointer with authority NONE.
- `/llms.txt` is the stable machine entrypoint.
- `scripts/emit-agent-transcript.mjs --json` is the disposable bounded current-state handoff.
- `HERMES_QUEUE.json` becomes trigger-driven:
  - CURRENT-CONVERSION
  - ANCHORED-RECOVERY
- Sep-21 task packets are preserved as historical records, but presence never makes them runnable.
- `HERMES.md` no longer authorizes ambient idle archaeology.
- FIELD INDEX receives the same-change mutation touch.

## Preserved

- CURRENT still owns attention.
- QUEUE still owns execution capacity.
- WAITING still owns parked/removed dependency memory.
- MIGRATION_NOW still owns concrete recovery anchors.
- Historical worker tasks and prior WORKER_BOOT content remain recoverable through Git history.
- No product/runtime head is changed.

## Stop

Do not build another worker state cache or scheduler. If a future executor needs a handoff, compile it transiently from live authority. Reopen this layer only if a concrete consumer cannot operate from `/llms.txt` + live sources + the JIT transcript.
