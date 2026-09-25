#!/usr/bin/env python3
"""Compile live CONFLUENCE/FIELD state into a disposable Hermes daily charter.

The generator is deliberately read-only. It does not mutate CURRENT/QUEUE/WAITING,
create goals/cards, touch branches, or preserve its own daily output. Generated prompts
are working projections; only a later verified RETURN earns durable state.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import subprocess
from pathlib import Path
from typing import Any


MODES: dict[str, dict[str, Any]] = {
    "setup": {
        "name": "SETUP / BASELINE",
        "objective": "Make today's machine/repo/operator state legible and ready without speculative upgrades or new architecture.",
        "moves": [
            "Recover exact repo + Hermes worker/session/goal/Kanban state before spawning anything.",
            "Inspect current local runtimes, source roots and blockers read-only.",
            "Repair only setup friction that is reversible, evidenced and actually blocks a current conversion.",
            "Prepare—not perform—approval-gated account/security/system changes.",
        ],
    },
    "confluence": {
        "name": "CONFLUENCE / SYNTHESIS",
        "objective": "Reduce duplicate branches and lost lineage by transferring only verified mechanisms into existing current heads.",
        "moves": [
            "Recover exact donor and recipient before proposing any transfer.",
            "Distinguish SAME OBJECT / SIBLING / DONOR / SUPERSEDED / UNKNOWN rather than merging by resemblance.",
            "Prefer one bounded transplant into an existing recipient over a new framework or dashboard.",
            "Preserve source addresses, contradictions, unique residue and exact RETURN paths.",
        ],
    },
    "houseclean": {
        "name": "HOUSECLEAN / RECONCILE",
        "objective": "Lower re-entry cost by reconciling workers, branches, stale control surfaces, broken references and disposable coordination residue.",
        "moves": [
            "Census active branches/worktrees/PRs/Hermes workers/cards and map each to objective + latest evidence.",
            "Classify LIVE_UNIQUE / WAITING / SUPERSEDED / DUPLICATE_CANDIDATE / UNKNOWN.",
            "Fix broken references or obviously stale public-safe pointers only when evidence is exact.",
            "Do not delete, close, merge or rewrite source/history merely because something appears stale.",
        ],
    },
    "tzimtzum": {
        "name": "TZIMTZUM / CONTRACTION",
        "objective": "Create room by contraction: reduce visible/live surface area while preserving identity, lineage, capability and lawful return paths.",
        "moves": [
            "Ask what can leave NOW without being deleted: WAITING, HOLD, donor shelf, superseded lineage, generated projection or private/local residue.",
            "Collapse duplicate coordination surfaces into one pointer/contract where function is already preserved elsewhere.",
            "Demote projections that have become mistaken for sovereign projects; keep host truth and exact addresses.",
            "Prefer archive/park/link over delete; compression is valid only when reconstruction/RETURN remains possible.",
            "End with fewer live fronts, fewer ambiguous pointers and no lost unique residue.",
        ],
    },
    "full": {
        "name": "DAILY CONFLUENCE / SETUP + HOUSECLEAN + TZIMTZUM",
        "objective": "Prepare the collaboration for useful work today by recovering truth, reconciling workers, contracting excess surface and executing at most one reversible conversion-enabling move.",
        "moves": [
            "Run SETUP baseline first.",
            "Run HOUSECLEAN reconciliation second.",
            "Apply TZIMTZUM to reduce active/visible surface without deleting authority or unique residue.",
            "Use CONFLUENCE only for one verified transfer that unlocks or simplifies a current conversion.",
            "Execute at most one reversible material move before RETURN and replan.",
        ],
    },
}


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def git(root: Path, *args: str) -> str:
    try:
        p = subprocess.run(
            ["git", "-C", str(root), *args],
            capture_output=True,
            text=True,
            check=False,
            timeout=15,
        )
        return (p.stdout or p.stderr).strip()
    except (OSError, subprocess.TimeoutExpired):
        return "UNAVAILABLE"


def one_line(value: Any, limit: int = 220) -> str:
    text = " ".join(str(value or "").split())
    return text if len(text) <= limit else text[: limit - 1] + "…"


def active_fronts(current: dict[str, Any], queue: dict[str, Any]) -> list[str]:
    out: list[str] = []
    for item in current.get("active_fronts", [])[:3]:
        out.append(
            f"{item.get('id','?')} [{item.get('state','?')}] — "
            f"{one_line(item.get('objective') or item.get('center'))}"
        )
    if not out:
        for item in queue.get("live", [])[:3]:
            out.append(
                f"{item.get('id','?')} [{item.get('horizon','?')}] — "
                f"{one_line(item.get('goal'))}"
            )
    return out


def waiting_items(waiting: dict[str, Any]) -> list[str]:
    return [
        f"{x.get('id','?')} [{x.get('surface_state', x.get('state','?'))}] — {one_line(x.get('human_move'))}"
        for x in waiting.get("items", [])[:8]
    ]


def head_rows(current: dict[str, Any]) -> list[str]:
    rows = []
    for x in current.get("current_heads", [])[:12]:
        rows.append(
            f"{x.get('lineage','?')}: {one_line(x.get('head'), 100)} "
            f"[{x.get('state','?')}] {x.get('route','')}"
        )
    return rows


def snapshot(root: Path) -> dict[str, Any]:
    current = read_json(root / "control" / "CURRENT.json")
    queue = read_json(root / "control" / "QUEUE.json")
    waiting = read_json(root / "control" / "WAITING.json")

    return {
        "current": current,
        "queue": queue,
        "waiting": waiting,
        "branch": git(root, "branch", "--show-current"),
        "status": git(root, "status", "--short"),
        "head": git(root, "rev-parse", "--short=12", "HEAD"),
        "recent": git(root, "log", "-5", "--pretty=format:%h %s"),
    }


def render(root: Path, mode: str) -> str:
    s = snapshot(root)
    spec = MODES[mode]
    current = s["current"]
    queue = s["queue"]
    waiting = s["waiting"]

    now = dt.datetime.now().astimezone()
    live_max = queue.get("max_live", 2)

    fronts = "\n".join(f"- {x}" for x in active_fronts(current, queue)) or "- NONE RECOVERED"
    waits = "\n".join(f"- {x}" for x in waiting_items(waiting)) or "- NONE RECOVERED"
    heads = "\n".join(f"- {x}" for x in head_rows(current)) or "- NONE RECOVERED"
    moves = "\n".join(f"{i}. {x}" for i, x in enumerate(spec["moves"], 1))
    status = s["status"] if s["status"] else "clean"

    return f"""# HERMES DAILY / {spec['name']}
Generated: {now.isoformat(timespec='minutes')}
Generator: scripts/hermes-daily-prompt.py
Projection only: live repo state overrides this prompt.

## PURPOSE

{spec['objective']}

This is today's working contraction/setup prompt, not a new canonical plan.
Read /llms.txt first, then AGENTS.md and the live authority sources it names.
Historical master prompts are donor/reference material only; this generated snapshot may already be stale.

## HARD LAWS

- RECOVER BEFORE INVENTING.
- CURRENT owns attention.
- Large archive / small active surface.
- Max live execution fronts = {live_max}.
- Conversion outranks coordination.
- WAITING_ON_HUMAN is not an active front.
- One bounded material move → VERIFY → RETURN → REPLAN.
- No second move inherits authority.
- No new core/dashboard/ontology without a missing function.
- Compression must retain a return/reconstruction path.
- Provider/session/model memory is non-canonical.
- Security / invalid-request / authority-denied failures STOP; never route around them.
- Do not merge/delete/publish/send/spend/actuate/change security or system configuration without explicit human authority.

## GENERATED SNAPSHOT

Git:
- branch: {s['branch'] or 'UNKNOWN'}
- HEAD: {s['head'] or 'UNKNOWN'}
- worktree: {status}

Recent commits:
{s['recent'] or 'UNAVAILABLE'}

Current live fronts:
{fronts}

WAITING:
{waits}

Current-head witnesses:
{heads}

## TODAY'S MODE

{moves}

## TZIMTZUM LAW

"Tzimtzum" here means **contraction without amnesia**.

A lawful contraction may:
- remove something from NOW;
- demote it to WAITING/HOLD/donor/superseded;
- replace duplicate prose/state with a pointer to canonical truth;
- reduce worker/branch/card count;
- collapse multiple projections onto one existing host/contract;
- archive generated coordination residue.

It must NOT:
- destroy unique source bytes;
- erase unresolved contradictions;
- flatten unequal lineages;
- turn absence from the live surface into nonexistence;
- delete provenance needed to reconstruct/RETURN.

Prefer PARK / LINK / COMPRESS / RECONCILE over DELETE.

## EXECUTION

1. Re-read /llms.txt → CURRENT / QUEUE / WAITING and inspect live Hermes/NEXUS/branch/worktree state.
2. Compare that live state with this generated snapshot. Mark drift explicitly.
3. Reconcile existing workers before spawning another.
4. Derive:
   - KEEP LIVE
   - CONTRACT / PARK
   - WAITING
   - SAFE FIX
   - BLOCKED
5. Perform at most ONE material reversible move that either:
   - unlocks a current conversion;
   - removes real re-entry friction;
   - repairs a verified broken edge;
   - recovers exact material needed by a current head.
6. Verify from external state.
7. RETURN and stop.

If no material move survives the filter, perform no mutation.

## RETURN

STATE:
DELTA:
EVIDENCE:
KEEP LIVE:
CONTRACTED / PARKED:
WAITING:
CONTRADICTIONS:
VALUE:
NEXT CANDIDATE:
STOP:

A valid outcome is:

NO LAWFUL MACHINE MOVE — <exact missing dependency>.
"""


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Repository root (default: parent of scripts/).",
    )
    ap.add_argument(
        "--mode",
        choices=sorted(MODES),
        default="full",
        help="Prompt emphasis.",
    )
    ap.add_argument(
        "--out",
        type=Path,
        help="Optional output path. Omit to print to stdout.",
    )
    ap.add_argument(
        "--goal-draft",
        action="store_true",
        help="Prepend a one-line instruction to use the generated text as a Hermes /goal draft objective.",
    )
    args = ap.parse_args()

    root = args.root.expanduser().resolve()
    text = render(root, args.mode)

    if args.goal_draft:
        text = (
            "/goal draft Use the following generated daily charter as today's bounded objective. "
            "Recover live repo/worker state before acting; repo truth overrides the snapshot.\n\n"
            + text
        )

    if args.out:
        args.out = args.out.expanduser()
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text + "\n", encoding="utf-8")
        print(args.out)
    else:
        print(text)


if __name__ == "__main__":
    main()
