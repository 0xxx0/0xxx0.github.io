#!/usr/bin/env bash
set -euo pipefail

MODE="prepare"
PROFILE=""
BOARD=""
NO_PULL=0

usage() {
  cat <<'EOF'
Usage: scripts/hermes-confluence-bootstrap.sh [--prepare|--chat|--kanban] [--profile NAME] [--board SLUG] [--no-pull]

prepare  Recover/sync state and write a local Hermes bootstrap packet only. Default.
chat     Prepare, then seed an interactive Hermes chat from the packet.
kanban   Prepare, then create one idempotent goal-mode bootstrap card if the selected Hermes gateway is already running.

Safety:
- never auto-starts a Hermes gateway or messaging transport
- never merges, deletes branches, changes credentials, installs packages, or edits system config
- refuses to pull over a dirty worktree
- generated packets live under $HERMES_HOME/confluence-bootstrap/ (or ~/.hermes/...)
EOF
}

while (($#)); do
  case "$1" in
    --prepare) MODE="prepare" ;;
    --chat) MODE="chat" ;;
    --kanban) MODE="kanban" ;;
    --profile) PROFILE="${2:?missing profile}"; shift ;;
    --board) BOARD="${2:?missing board}"; shift ;;
    --no-pull) NO_PULL=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown arg: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then
  echo "ERROR: run this from inside the CONFLUENCE/FIELD repository." >&2
  exit 2
fi
cd "$ROOT"

need() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: missing $1" >&2; exit 2; }; }
need git
need python3
need node
need hermes

STAMP="$(date +%Y%m%d-%H%M%S)"
DAY="$(date +%F)"
HBASE="${HERMES_HOME:-$HOME/.hermes}"
OUT="$HBASE/confluence-bootstrap/$STAMP"
mkdir -p "$OUT"

git status --short >"$OUT/git-status-before.txt"
git branch --show-current >"$OUT/git-branch.txt"
git rev-parse HEAD >"$OUT/git-head-before.txt"

if (( NO_PULL == 0 )); then
  git fetch origin master
  if [[ -z "$(git status --porcelain)" && "$(git branch --show-current)" == "master" ]]; then
    if git merge-base --is-ancestor HEAD origin/master; then
      git merge --ff-only origin/master
    else
      echo "WARN: local master is not a fast-forward ancestor of origin/master; fetched but did not merge." | tee "$OUT/pull-warning.txt" >&2
    fi
  else
    echo "WARN: dirty or non-master worktree; fetched origin/master but did not mutate local checkout." | tee "$OUT/pull-warning.txt" >&2
  fi
fi

git rev-parse HEAD >"$OUT/git-head-after.txt"
git log -8 --pretty=format:'%h %cI %s' >"$OUT/recent-commits.txt"

node scripts/check-current-heads.mjs | tee "$OUT/current-manifest-check.txt"
node scripts/emit-agent-transcript.mjs >"$OUT/field-agent-transcript.md"
python3 scripts/hermes-daily-prompt.py --mode full >"$OUT/daily-charter.md"

hermes --version >"$OUT/hermes-version.txt" 2>&1 || true
hermes profile list >"$OUT/hermes-profiles.txt" 2>&1 || true
hermes gateway list >"$OUT/hermes-gateways.txt" 2>&1 || true
hermes sessions list >"$OUT/hermes-sessions.txt" 2>&1 || true
hermes kanban boards show >"$OUT/hermes-kanban-board.txt" 2>&1 || true
hermes kanban diagnostics --json >"$OUT/hermes-kanban-diagnostics.json" 2>"$OUT/hermes-kanban-diagnostics.err" || true
hermes kanban list --json >"$OUT/hermes-kanban-tasks.json" 2>"$OUT/hermes-kanban-tasks.err" || true
hermes kanban assignees --json >"$OUT/hermes-kanban-assignees.json" 2>"$OUT/hermes-kanban-assignees.err" || true

if [[ -z "$PROFILE" ]]; then
  PROFILE="$(awk '$1=="*" {print $2; exit}' "$OUT/hermes-profiles.txt" 2>/dev/null || true)"
  [[ -n "$PROFILE" ]] || PROFILE="default"
fi

cat >"$OUT/bootstrap-goal.md" <<EOF
# CONFLUENCE / FIELD — HERMES LOCAL BOOTSTRAP
generated: $(date -Iseconds)
repo: $ROOT
profile: $PROFILE
mode: $MODE

You are the replaceable local execution/orchestration layer for CONFLUENCE/FIELD.

## AUTHORITY

Repo/live evidence outranks this packet.
Read, in order:
1. /AGENTS.md
2. /llms.txt
3. /control/CURRENT.json
4. /control/WAITING.json
5. /control/QUEUE.json only as compatibility/history, never independent NEXT authority
6. /control/prompts/HERMES_ULTRA_MASTER_2026-09-23.md
7. the generated FIELD transcript and daily charter included below

Canonical truth is filesystem + Git + exact sources + typed state + evidence + RETURN.
Your session, model memory, provider memory, Kanban and this packet are non-canonical.

## HUMAN INTENT

Help bootstrap and stabilize the actual system on this Mac without creating another control plane.
Take over useful preparation/reconciliation aggressively inside reversible boundaries.
Use your own workers only when decomposition materially reduces time or re-entry cost.
Do not remain busy merely because autonomous capacity exists.

## FIRST JOB — RECONCILE BEFORE SPAWNING

Census existing Hermes sessions/goals/Kanban tasks/workers, Git branches/worktrees/PRs and relevant local services.

For every possibly-live worker/card/branch classify:
LIVE_UNIQUE | WAITING | SUPERSEDED | DUPLICATE_CANDIDATE | UNKNOWN

Continue an existing valid worker instead of duplicating it.

Maximum live execution fronts: 2.

If you have Kanban orchestrator tools and genuinely separable non-duplicate work survives recovery, you MAY create at most two child cards:
- child A should normally be the current conversion front;
- child B may be recovery/ingest only when it unlocks a current conversion or prevents false lineage.

Use goal-mode only when iterative completion criteria justify it.
Use isolated worktrees for concurrent repo writers.
No free-chat agent synchronization: exchange task bodies, files, patches, receipts and RETURNs.

If orchestrator Kanban tools are unavailable, do not fake fan-out. Continue as one bootstrap goal and RETURN the exact missing capability.

## CURRENT BEHAVIORAL CUT

- FIELD is a door/re-entry surface, not where all work lives.
- CURRENT is the sole authored attention/NEXT authority.
- QUEUE is compatibility/projection only.
- WAITING is human/world dependency residue, not priority.
- NEXUS board-refresh heartbeats are telemetry, not material project mutation.
- Observability must not manufacture work.
- Conversion outranks coordination.
- If the highest-value frontier is human/world-gated, allow at most ONE directly-related reversible fallback, then STOP with NO_LAWFUL_HIGH_VALUE_MOVE.
- Do not forage unrelated archive work merely to remain busy.
- No new dashboard/schema/transcript/router/core unless an observed missing function requires it.
- Existing branches are provenance; branch existence alone does not make work live.
- Do not merge to master. Draft/isolated work is allowed when bounded and verified.
- DRAFT != SEND. OBSERVE != ACTUATE. MODEL DECISION != AUTHORITY.
- Security, invalid-request or authority-denied failures STOP; never provider-hop around them.
- Do not start/enable messaging transports, send messages, make purchases, rotate credentials, change security/networking, install system-wide packages, actuate consequential devices, publish private material, or delete/move source archives without explicit human approval.

## EXECUTION TARGET

1. Recover exact local + repo + Hermes state.
2. Reconcile duplicates/stale workers before creating any work.
3. Select at most two fronts from CURRENT.
4. Execute one bounded reversible move that materially:
   - improves another-human/device/world use, OR
   - removes real re-entry/setup friction directly blocking such use, OR
   - recovers exact source necessary for that conversion.
5. Verify externally.
6. RETURN.
7. Re-read CURRENT before any second material move.

## RETURN

STATE:
DELTA:
EVIDENCE:
VALUE:
RESIDUE:
WAITING:
CONTRADICTIONS:
NEXT:
STOP:

NEXT is a candidate, never inherited authority.

If DELTA has no corresponding EVIDENCE or VALUE, do not count it as progress.

A valid successful outcome is:
NO_LAWFUL_HIGH_VALUE_MOVE — <exact human/world/private dependency>.

---

# GENERATED FIELD AGENT TRANSCRIPT

$(cat "$OUT/field-agent-transcript.md")

---

# GENERATED DAILY CHARTER

$(cat "$OUT/daily-charter.md")
EOF

{
  echo "OUT=$OUT"
  echo "PROFILE=$PROFILE"
  echo "MODE=$MODE"
  echo "HEAD=$(git rev-parse HEAD)"
} | tee "$OUT/BOOTSTRAP.env"

case "$MODE" in
  prepare)
    printf '\nPrepared Hermes packet:\n  %s\n\n' "$OUT/bootstrap-goal.md"
    printf 'Launch interactively:\n  scripts/hermes-confluence-bootstrap.sh --chat --profile %q\n' "$PROFILE"
    printf 'Or, if your Hermes gateway is already running with Kanban orchestration enabled:\n  scripts/hermes-confluence-bootstrap.sh --kanban --profile %q\n' "$PROFILE"
    ;;
  chat)
    exec hermes -p "$PROFILE" chat --query-file "$OUT/bootstrap-goal.md" --source cli
    ;;
  kanban)
    if ! hermes -p "$PROFILE" gateway status >"$OUT/hermes-gateway-status.txt" 2>&1; then
      cat "$OUT/hermes-gateway-status.txt" >&2 || true
      echo "STOP: selected profile gateway is not already running. I will not auto-start it because configured transports may have external effects." >&2
      echo "Use --chat now, or inspect/start the gateway yourself and rerun --kanban." >&2
      exit 3
    fi

    hermes kanban init >/dev/null 2>&1 || true
    BOARD_ARGS=()
    if [[ -n "$BOARD" ]]; then BOARD_ARGS=(--board "$BOARD"); fi
    hermes kanban "${BOARD_ARGS[@]}" create "CONFLUENCE bootstrap $DAY" \
      --body "$(cat "$OUT/bootstrap-goal.md")" \
      --assignee "$PROFILE" \
      --workspace "dir:$ROOT" \
      --goal \
      --goal-max-turns 20 \
      --max-runtime 2h \
      --idempotency-key "confluence-bootstrap-$DAY" \
      --json | tee "$OUT/kanban-create.json"
    printf '\nBootstrap card created/reused. Watch with:\n  hermes kanban %s watch\n' "${BOARD:+--board $BOARD}"
    ;;
esac
