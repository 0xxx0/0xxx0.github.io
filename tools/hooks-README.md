# Git Hooks Reference

This document describes the version-controlled git hooks in `.githooks/` (installed via `core.hooksPath=.githooks`).

## Hook Summary

| Hook | Purpose | Refusal Mode |
|------|---------|--------------|
| `pre-commit` | SEARCH-DON'T-ASK: catches new artifacts created without prior search | Advisory (default) / Configurable refusal |
| `pre-push` | Chain: pre-push-guard → finish-line → FIELD INDEX stamp gate | Refuses (blocks push) |

---

## pre-commit — SEARCH-DON'T-ASK

**File:** `.githooks/pre-commit` → calls `scripts/pre-commit-search-check.py`

### What It Enforces

Before committing NEW files (git `diff --cached --name-only --diff-filter=A`), the hook checks:
- Files ≥ 10 lines (configurable)
- Artifact extensions: `.py`, `.js`, `.mjs`, `.ts`, `.md`, `.json`, `.yaml`, `.sh`, etc.
- Not in exempt paths (lockfiles, node_modules, dist/, build/, .github/, minified files)

If triggered, prints a **SEARCH-DON'T-ASK reminder** with exact search commands to run FIRST:

```
SEARCH-DON'T-ASK: New artifact(s) detected without prior search

New files in this commit:
  path/to/new-file.md  (20 lines)

HOUSE LAW: SEARCH, DON'T ASK
  substrate → corpus → web → operator
  Before creating NEW artifacts, you MUST search first.

RUN THESE SEARCHES NOW:

  # 1. Field Index (all Hermes conversations + machine notices)
  python3 ~/void-anchor/ops-hub/scripts/field_index.py --search "<your topic>"

  # 2. Corpus DB (FTS5) — direct query or recall skill
  recall --query "<your topic>"
  # or: sqlite3 ~/sovereign-node/corpus/corpus.db "SELECT * FROM corpus WHERE content MATCH '<topic>'"

  # 3. Code search (this repo)
  rg "<pattern>"
  git grep "<pattern>"

  # 4. Web search
  web_search "<query>"
```

### Configuration (environment variables)

| Variable | Default | Effect |
|----------|---------|--------|
| `SEARCH_FIRST_REFUSE` | `0` | Set `1` to **refuse the commit** (exit 1) instead of advisory |
| `SEARCH_FIRST_THRESHOLD` | `10` | Minimum lines in new file to trigger |
| `SEARCH_FIRST_SKIP` | `0` | Set `1` to skip this check entirely |

### Why Advisory by Default?

> **Never block the shared trunk.** A blocking CI gate landed 2026-09-29 and broke a live writer seven seconds later. Local refusal stops only the actor about to make the claim; a CI gate stops every concurrent writer. The point is that skipping the search is now a **CONSCIOUS act** rather than an invisible default.

### Bypass (Deliberate, Visible)

```bash
# Skip once via env var
SEARCH_FIRST_SKIP=1 git commit -m "msg"

# Or use git's built-in bypass (visible in history)
git commit --no-verify -m "msg"
```

### Enable Refusal Mode

```bash
# Per commit
SEARCH_FIRST_REFUSE=1 git commit -m "msg"

# Persistent (add to shell profile)
export SEARCH_FIRST_REFUSE=1
```

---

## pre-push — Finish Line + Guards

**File:** `.githooks/pre-push` (chains three checks in order)

### 1. pre-push-guard (`.githooks/pre-push-guard`)
Refuses pushes that would publish private trees or secrets to the public repo.
- Private trees: `ops-hub/`, `hermes-workspace/`, `odysseus-*`, `sovereign-node/`, `AXIS/`, `delete/`, `backups/`, `_archive/`, `recovery/operator-model/`, `_private-review/`, `corpus/`, `ai-media/`, `hermes-runtime/`
- Secrets: `.env*`, `id_rsa`, `id_ed25519`, `.credentials`, `auth.json`, `secrets*.yaml/json`
- Oversize: files > 50 MB

Bypass: `ALLOW_PRIVATE_PUSH=1 git push ...`

### 2. finish-line (`tools/finish-line.py --pre-push`)
Refuses three silent lies:
1. **Nothing to push** — `git push` exits 0 with "Everything up-to-date" (false success)
2. **Detached HEAD** — commits belong to no branch, easily lost
3. **Non-canonical route stamps** — breaks FIELD INDEX ordering (must be ISO+08:00)

### 3. FIELD INDEX Stamp Gate (`tools/fi-mutation-contract.py --check`)
Enforces `MUTATION -> INDEX TOUCH`: a change touching a route must bump that route's `index.updated_at` IN THE SAME CHANGE.

---

## Installation

```bash
sh tools/install-hooks.sh
```

Idempotent. Safe to re-run. Sets `core.hooksPath=.githooks` so hooks are version-controlled and shared across all clones/worktrees/sessions.

To verify installation:
```bash
git config --get core.hooksPath    # should print .githooks
ls -la .githooks/                  # pre-commit, pre-push, pre-push-guard
```

---

## Design Principles

1. **Local refusal, report in CI — never block the shared trunk**
   - A guard that blocks normal work gets switched off
   - Local refusal stops only the actor about to make the claim

2. **Checkers never mutate**
   - `finish-line.py` reads, refuses, exits non-zero — never writes/commits/pushes

3. **Read fresh state before judging**
   - `finish-line.py` fetches origin FIRST; judging against stale refs gives confident wrong answers

4. **Bypass is deliberate and visible**
   - `--no-verify` or env var override = conscious choice, not invisible default

5. **Narrow scope**
   - Each hook checks only the specific failures that LIE SILENTLY
   - No "style" or "quality" gates that generate false positives