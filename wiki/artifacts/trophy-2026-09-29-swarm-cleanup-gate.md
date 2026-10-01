# Trophy — 2026-09-29 — swarm-cleanup consumer gate (cron + MCP + recency)

## Fix
- **before:** `ops-hub/scripts/swarm_cleanup.py` decided a script was "dead" by checking the
  Makefile, launchd plists and `crontab` only. It could not see **Hermes cron jobs** or
  **Hermes config** — so the 03:02 phase-5 pass archived two live cron dependencies
  (`share-fuse.py` hourly, `day_digest.py` daily; 7 silent failures before anyone noticed)
  and was one pass away from archiving `mqtt-mcp.py`, a live MCP server.
- **after:** `scheduler_text()` (the consumer scan) now also reads, discovered-not-hardcoded:
  - `~/.hermes/profiles/*/cron/jobs.json` + `~/.hermes/cron/jobs.json`, and each job's
    wrapper script (which names the real script),
  - every profile's `config.yaml` + `~/.hermes/config.yaml` (MCP servers declare script paths),
  - and phase 1 gained a **recency guard** (`RECENT_EDIT_DAYS = 14`): a script edited in the
    last fortnight is in use, never archived — manual/runbook tools have no automated
    consumer and previously read as dead.
- **evidence (dry run, no writes):**
  `python3 swarm_cleanup.py --phases 1,5 --dry-run`
  → `scripts=230 dead=45`, **`live-dir dead: 0`**, `moved 0 scripts, refused 0 at gate`.
  Before: `dead=56` with `share-fuse.py`, `day_digest.py`, `mqtt-mcp.py`,
  `ops-capabilities.py`, `fleet-self-audit.py` all in the list.
  Unit check via `is_live_script`: share-fuse/day_digest → `live=True (scheduled
  (launchd/crontab/hermes-cron))`; fold-metrics/state-note → `live=False (no live refs)`.
- **rollback:** `git -C ~/void-anchor diff ops-hub/scripts/swarm_cleanup.py` (three edits:
  import-free `scheduler_text` extension, `RECENT_EDIT_DAYS`, phase-1 guard). No other file touched.

## Why the failure mode is now the safe one
False "live" costs disk. False "dead" costs a silently dead cron / MCP server. The gate is now
deliberately conservative: nothing in the live tree is archivable by this heuristic.

## Next True Move
Give the guard a **recorded failing case** (the convergence board's open task
"Guard controls: every guard needs a recorded failing case"): add a test fixture that plants a
fake scheduled script and asserts phase 1 refuses it. Until a guard has a failing case it is a
claim, not a control.