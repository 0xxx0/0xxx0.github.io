# HERMES DAILY LIVE-AUTHORITY FIX — 2026-09-25

## Object

`scripts/hermes-daily-prompt.py`, the disposable daily working prompt generator.

## Defect

After worker authority was contracted in #246, the daily generator still had two stale seams:

1. it instructed a fresh Hermes session to read the dated `HERMES_ULTRA_MASTER_2026-09-23.md` before live machine authority;
2. it rendered `WAITING` items from obsolete `state` rather than v0.2 `surface_state`.

That meant a generated prompt could reintroduce historical doctrine or mislabel parked/removed dependencies despite the live control plane being correct.

## Delta

- bootstrap generated prompts from `/llms.txt` → AGENTS/live sources;
- keep dated master prompts as donor/reference only;
- render WAITING using `surface_state` with legacy fallback;
- add public validator regression checks for both laws;
- touch FIELD root mutation metadata in the same bounded change.

## Preserved

- the daily prompt remains disposable and authority NONE;
- CURRENT owns attention;
- QUEUE owns bounded execution;
- WAITING remains dependency memory, not backlog;
- historical prompt files remain intact.

## Stop

Do not add another durable daily-state store. If the generated prompt needs more context, derive it from live authority at generation time or add a bounded pointer—not copied current state.
