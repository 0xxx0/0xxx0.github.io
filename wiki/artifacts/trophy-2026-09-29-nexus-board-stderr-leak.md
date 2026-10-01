# Trophy — 2026-09-29

## Fix
- **before:** `ops-hub/scripts/nexus_board.py` rendered git's stderr into the
  published board. `sh()` returned `stdout + stderr`, so `git log -1 --format=%s <ref>`
  on an unresolvable ref (`+ comms-bot` worktree marker, `(no branch)` detached HEAD)
  wrote `fatal: ambiguous argument '+ comms-bot': unknown revision or path` into a
  table cell on the public site.
- **after:** `sh_out()` returns stdout only when `rc == 0`; `branches()` parses the
  `'* '` / `'+ '` / two-space markers explicitly, skips `(…)` and `->` forms, and
  `git rev-parse --verify --quiet` every ref before formatting it. Unresolved refs are
  skipped — never printed. The `comms-bot` row now shows its real latest subject.
- **evidence:**
  - pre-fix published `nexus/board.html`: `grep -c fatal:` = **1**
  - post-fix, at HEAD and at the live URL: **0**
  - live read-back `https://0xxx0.github.io/nexus/board.html` → `http=200`, stamp
    `2026-09-29 03:26 UTC`, `fatal:` count 0
  - commits: `ops-hub` **11d6a7a1**, `0xxx0.github.io` **a59d63f4** (HEAD == origin/master)
  - kanban `t_3786c9be` → done, with the full result string
- **rollback:** `git revert 11d6a7a1` (ops-hub) and `a59d63f4` (site). Both single-commit,
  no schema or data change.

## Correction carried in this turn
The "50 modular expert action steps framework" is **not** the two home-root orphans
(`~/master_next_steps_framework.md`, `~/EXTENSIVE_50_STEP_ACTION_PLAN.md`). The live
one is **`AXIS/reusable/AGENT-WORK-LOOP-50.md`** — "Modular Expert Action Steps — General
Agent Work Loop", 50 atomic steps S01–S50, written 2026-09-28, sha256 `7f2392de…`.
The archive copy at `ops-hub/wiki/frameworks/agent-work-loop-50.md` is superseded.

## Next True Move
`t_3786c9be` carried a second, unfixed defect: the branch table is heterogeneous —
28 four-cell rows, of which 10 carry a *state* in cell 2 and 18 carry an *assignee*.
Any consumer parsing by column position breaks. Decide the row type, then either
split the table or emit a typed field per row.
