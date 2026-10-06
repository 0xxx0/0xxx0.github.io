#!/usr/bin/env python3
"""
fi-stamp-reconcile — bring every route's index.updated_at back to its true git touch.

Why: the field index is stale against reality. `tools/fi-mutation-contract.py --check`
derives staleness per COMMIT RANGE, and its non-check mode stamps every derived route with
ONE timestamp (--at). Nothing reconciles the whole manifest per-route, so 87 of 170 routes
drifted and the public index lies about when things last moved.

Rule, straight from FIELD_INDEX_CONTRACT v0.4 and the fi-index-touch-repair skill:
  index.updated_at = committer date (%cI) of the NEWEST SEMANTIC commit touching the route
  - exact seconds, +08:00 colon form (the manifest's own convention)
  - machine refresh commits are NOT semantic: skip ^(nexus|comms|convergence|desk|loops):
  - work_modes are a UNION with existing, order-preserving — never overwrite a sibling's
  - preserve operation / kind / state / role / receipt untouched

Route mapping mirrors the contract's 3-pass lookup:
  1. exact-file href  (a commit touching exactly that file is a touch of that route)
  2. manifest pointers (receipt / contract / machine_state / state / evidence.receipt)
  3. longest directory prefix

READ-ONLY on git. Writes only the manifest it is pointed at.
"""

from __future__ import annotations

import argparse
import datetime
import json
import re
import subprocess
import sys
from pathlib import Path

MACHINE = re.compile(r"^(nexus|comms|convergence|desk|loops)\s*:", re.I)


def git(repo: Path, *args: str) -> str:
    r = subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True)
    return r.stdout or ""


def route_paths(route: dict) -> list:
    """Concrete repo paths a touch of which counts as a touch of this route."""
    out = []
    href = route.get("href", "")
    if href in ("/", ""):
        return out                      # root: known blind spot, handled separately
    rel = href.strip("/").split("/")[0]
    out.append(rel)
    for k in ("receipt", "contract", "machine_state", "state"):
        v = route.get(k)
        if isinstance(v, str) and v:
            out.append(v.lstrip("/"))
    ev = route.get("evidence") or {}
    r = ev.get("receipt") if isinstance(ev, dict) else None
    if isinstance(r, str) and r:
        out.append(r.lstrip("/"))
    return out


def main(argv: list) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--since", default="2026-01-01")
    a = ap.parse_args(argv)

    repo = Path(a.repo).resolve()
    mpath = Path(a.manifest).resolve()
    m = json.loads(mpath.read_text(encoding="utf-8"))
    routes = m["routes"]

    # one history pass: %cI \t subject \t files
    raw = git(repo, "log", "--since=" + a.since, "--format=@@%cI\t%s", "--name-only",
              "--no-renames", "origin/master")
    commits = []          # (committer_iso, is_machine, [paths])
    cur = None
    for line in raw.splitlines():
        if line.startswith("@@"):
            if cur:
                commits.append(cur)
            meta = line[2:]
            iso, _, subj = meta.partition("\t")
            cur = (iso.strip(), bool(MACHINE.match(subj.strip())), [])
        elif line.strip() and cur is not None:
            cur[2].append(line.strip())
    if cur:
        commits.append(cur)

    # newest semantic touch per top-level token
    newest = {}
    for iso, machine, paths in commits:
        if machine:
            continue
        for p in paths:
            top = p.split("/")[0]
            for key in (top, p):
                if key not in newest or iso > newest[key]:
                    newest[key] = iso

    # every route's own pointer files too
    changed, unchanged, unroutable = [], 0, []
    for r in routes:
        href = r.get("href", "")
        cands = []
        for key in route_paths(r):
            if key in newest:
                cands.append(newest[key])
        if not cands:
            if href not in ("/", ""):
                unroutable.append(href)
            continue
        true_touch = max(cands)
        idx = r.setdefault("index", {})
        have = idx.get("updated_at")
        if have == true_touch:
            unchanged += 1
            continue
        changed.append((href, have, true_touch))
        if not a.dry_run:
            idx["updated_at"] = true_touch

    print(f"routes {len(routes)} · unchanged {unchanged} · REPAIRED {len(changed)} · "
          f"no semantic touch found {len(unroutable)}")
    for href, old, new in changed[:12]:
        print(f"  {href}\n      {old}  ->  {new}")
    if len(changed) > 12:
        print(f"  … and {len(changed) - 12} more")
    if unroutable:
        print("no semantic touch (left alone): " + ", ".join(unroutable[:8]))

    if not a.dry_run and changed:
        if not m.get("updated") or max(t for _, _, t in changed) > str(m.get("updated")):
            m["updated"] = max(t for _, _, t in changed)
        mpath.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"\nwrote {mpath}")
    elif a.dry_run:
        print("\n(dry run — nothing written)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
