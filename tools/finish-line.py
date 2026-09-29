#!/usr/bin/env python3
"""finish-line — the gate that lives outside the model.

WHY THIS EXISTS
---------------
An agent's judgment that its own work is done cannot be trusted, and the failure is
undetectable from the output. Measured (René Zander, 6 frontier models x 2,000+ sessions):
agents agreed to a required process step and SKIPPED IT 100% OF THE TIME, producing
flawless-looking output that no reviewer -- human or LLM judge -- could distinguish from a
real run. Moving the finish line out of the model's reach took compliance 0% -> 75%.

Measured here, 2026-09-29: a session ran `git push`, reported success, and NOTHING PUSHED.
`git push` with HEAD == origin/master prints "Everything up-to-date" and exits 0. Exit 0
reads as success. The report was false and no one could tell.

THE DESIGN RULE THAT MATTERS
----------------------------
This is a CHECKER, not a writer. A checker that mutates the world it checks is the bug it
was built to catch: a blocking CI gate landed here on 2026-09-29 and broke a live writer
seven seconds later. This script never writes, never commits, never pushes. It reads,
refuses, and exits non-zero.

And it is deliberately NARROW. A guard that blocks normal work gets switched off, so it
checks only the three things that LIE SILENTLY:
  1. nothing to push while a push is being claimed  (the false success)
  2. a detached HEAD                             (commits that belong to no branch)
  3. route stamps that are not canonical         (silently breaks INDEX ordering)

USAGE
-----
  python3 tools/finish-line.py --pre-push      # wire as .git/hooks/pre-push
  python3 tools/finish-line.py --verify <sha>  # post-push: confirm it ACTUALLY landed
  python3 tools/finish-line.py --check         # ad-hoc, any time

Exit 0 = clear to proceed. Exit 1 = REFUSED, with the reason on stderr.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

CANONICAL = re.compile(r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+08:00$")
REPO = Path(__file__).resolve().parent.parent


def git(*args: str, timeout: int = 25) -> tuple[int, str]:
    try:
        p = subprocess.run(["git", "-C", str(REPO), *args],
                           capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout or "").strip()
    except Exception as e:  # noqa: BLE001 — a gate must never crash the caller
        return 1, str(e)


def stamp_violations() -> list[str]:
    """Routes whose updated_at is not canonical +08:00. Ordered, bounded."""
    man = REPO / "showcase-manifest.json"
    if not man.exists():
        return []
    try:
        data = json.loads(man.read_text())
    except Exception as e:  # noqa: BLE001
        return [f"showcase-manifest.json unreadable: {e}"]
    bad = [str(r.get("href")) for r in data.get("routes", [])
           if not CANONICAL.match(str((r.get("index") or {}).get("updated_at")))]
    return bad


def check_pre_push() -> int:
    """Refuse the three silent lies. Read-only."""
    problems: list[str] = []

    # Fetch FIRST. Judging against a stale origin/master ref gives a confident wrong
    # verdict: measured 2026-09-29, the local ref said "equal to origin" and the very
    # next push was rejected as non-fast-forward because another session had moved the
    # remote in the interim. A gate that reads stale state is worse than no gate.
    git("fetch", "origin", "--quiet")

    # 1. The false success, told apart properly. `git push` exits 0 and prints
    #    "Everything up-to-date" when there is nothing to send -- which reads as success.
    #    Three cases that must NOT be conflated:
    #      ahead>0            -> genuinely something to push
    #      ahead==0, behind>0 -> BEHIND; nothing to push and a push will be REJECTED
    #      both>0             -> diverged; a push cannot fast-forward at all
    rc, counts = git("rev-list", "--left-right", "--count", "origin/master...HEAD")
    if rc == 0 and counts:
        try:
            behind, ahead = (int(x) for x in counts.split())
        except ValueError:
            behind = ahead = -1
        if ahead == 0 and behind == 0:
            problems.append(
                "NOTHING TO PUSH — HEAD is already origin/master.\n"
                "    `git push` will exit 0 and print 'Everything up-to-date'. Do NOT report\n"
                "    this as a push that landed. Commit something, or say nothing was pushed.")
        elif ahead == 0 and behind > 0:
            problems.append(
                f"BEHIND BY {behind} — nothing of yours to push, and a push will be REJECTED\n"
                "    as non-fast-forward. This is NOT a successful push. Integrate first:\n"
                "    git fetch origin && git rebase origin/master")
        elif ahead > 0 and behind > 0:
            problems.append(
                f"DIVERGED — {ahead} ahead / {behind} behind origin/master. A push cannot\n"
                "    fast-forward. Rebase onto origin/master before claiming anything landed.")

    # 2. A detached HEAD: commits go nowhere and are lost on the next checkout.
    rc, _ = git("symbolic-ref", "-q", "HEAD")
    if rc != 0:
        problems.append(
            "DETACHED HEAD — commits here belong to no branch and are easy to lose.\n"
            "    Use `git worktree add --detach` for READ-ONLY inspection only.")

    # 3. Stamp drift: breaks FIELD INDEX ordering, and it is invisible on the page.
    bad = stamp_violations()
    if bad:
        problems.append(
            f"{len(bad)} route stamp(s) not canonical +08:00 — this silently breaks the\n"
            f"    FIELD INDEX ordering (a UTC stamp sorts 8h older than its peer).\n"
            f"    e.g. {', '.join(bad[:3])}\n"
            "    Fix: python3 tools/fi-mutation-contract.py --routes <file> --at <ISO+08:00>")

    if problems:
        print("finish-line: REFUSED\n", file=sys.stderr)
        for p in problems:
            print("  * " + p + "\n", file=sys.stderr)
        return 1

    print("finish-line: clear (stamps canonical, branch attached, something to push)")
    return 0


def check_verify(sha: str) -> int:
    """Post-push verification: did it ACTUALLY land? Asked of the remote, not of git."""
    git("fetch", "origin", "--quiet")
    rc, out = git("branch", "-r", "--contains", sha)
    if rc != 0 or "origin/master" not in out:
        print(f"finish-line: VERIFY FAILED — {sha} is NOT on origin/master.\n"
              f"  The push did not land. Do not report it as landed.", file=sys.stderr)
        return 1
    rc, subject = git("log", "-1", "--format=%s", sha)
    print(f"finish-line: VERIFIED — {sha[:12]} is on origin/master\n  {subject}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="the finish-line gate — refuses silent lies")
    ap.add_argument("--pre-push", action="store_true",
                    help="run as .git/hooks/pre-push")
    ap.add_argument("--verify", metavar="SHA",
                    help="confirm a commit actually reached origin/master")
    ap.add_argument("--check", action="store_true", help="ad-hoc check")
    a = ap.parse_args()
    if a.verify:
        return check_verify(a.verify)
    return check_pre_push()


if __name__ == "__main__":
    sys.exit(main())