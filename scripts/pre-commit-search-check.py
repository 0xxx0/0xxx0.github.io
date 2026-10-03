#!/usr/bin/env python3
"""pre-commit-search-check — search-first + standing-policy admission guard.

Two different failures are caught here:

1. SEARCH-DON'T-ASK: a worker creates a substantial new artifact without searching first.
   This remains advisory by default because generic artifact creation is not always unsafe.

2. RULE-LIKE FILE != AUTHORITY: a new or renamed LAW / RULE / POLICY / CHARTER /
   MANDATE file appears outside an explicitly non-authoritative evidence/history shelf
   without being admitted through control/POLICY_INDEX.json. This REFUSES by default.
   Standing policy is consequential shared state; another plausible-looking rule file
   must never silently create a second authority surface.

Installed via `sh tools/install-hooks.sh`, which uses the versioned .githooks path.
`SEARCH_FIRST_SKIP=1` skips only the generic search reminder. A conscious
`git commit --no-verify` remains the local emergency bypass for policy admission;
PR CI repeats policy admission independently.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

REFUSE = os.environ.get("SEARCH_FIRST_REFUSE", "0") == "1"
THRESHOLD = int(os.environ.get("SEARCH_FIRST_THRESHOLD", "10"))
SKIP = os.environ.get("SEARCH_FIRST_SKIP", "0") == "1"

EXEMPT_PATTERNS = [
    r"\.lock$",
    r"package-lock\.json$",
    r"yarn\.lock$",
    r"pnpm-lock\.yaml$",
    r"^\.github/",
    r"^node_modules/",
    r"\.min\.(js|css)$",
    r"^dist/",
    r"^build/",
    r"\.map$",
]

ARTIFACT_EXTS = {
    ".py", ".js", ".mjs", ".ts", ".tsx", ".jsx",
    ".md", ".mdx", ".txt", ".rst",
    ".html", ".htm", ".css", ".scss",
    ".json", ".yaml", ".yml", ".toml",
    ".sh", ".bash", ".zsh",
    ".sql", ".graphql", ".gql",
    ".rs", ".go", ".java", ".kt",
    ".c", ".cpp", ".h", ".hpp",
}

POLICY_LIKE = re.compile(
    r"(^|[._-])(LAWS?|RULES?|POLIC(?:Y|IES)|CHARTERS?|MANDATES?)([._-]|$)",
    re.I,
)
NON_AUTHORITY_SHELVES = (
    "returns/",
    "recovery/",
    "control/confluence/",
    "control/prompts/",
    "control/research/",
    "docs/",
    "research/",
)


def git(*args: str) -> tuple[int, str]:
    try:
        p = subprocess.run(
            ["git", "-C", str(REPO), *args],
            capture_output=True, text=True, timeout=20
        )
        return p.returncode, (p.stdout or "").strip()
    except Exception as e:
        return 1, str(e)


def is_exempt(path: str) -> bool:
    return any(re.search(pat, path) for pat in EXEMPT_PATTERNS)


def is_artifact(path: str) -> bool:
    return Path(path).suffix in ARTIFACT_EXTS


def count_lines(path: str) -> int:
    full = REPO / path
    if not full.exists():
        return 0
    try:
        return len(full.read_text(errors="ignore").splitlines())
    except Exception:
        return 0


def parse_added_or_renamed(out: str) -> list[str]:
    """Return destination paths for A and R records from `git diff --name-status`."""
    paths: list[str] = []
    for line in (out or "").splitlines():
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        status = parts[0]
        if status == "A":
            paths.append(parts[1])
        elif status.startswith("R") and len(parts) >= 3:
            paths.append(parts[-1])
    return paths


def staged_new_files() -> list[str]:
    rc, out = git("diff", "--cached", "--name-status", "--diff-filter=AR")
    if rc != 0 or not out:
        return []
    return parse_added_or_renamed(out)


def diff_new_files(base: str) -> list[str]:
    rc, out = git("diff", "--name-status", "--diff-filter=AR", f"{base}...HEAD")
    if rc != 0:
        raise RuntimeError(f"cannot inspect policy additions/renames against {base}: {out}")
    return parse_added_or_renamed(out)


def policy_index() -> dict:
    # In pre-commit mode the staged index is authoritative for the commit being formed.
    rc, staged = git("show", ":control/POLICY_INDEX.json")
    raw = staged if rc == 0 and staged else (REPO / "control/POLICY_INDEX.json").read_text()
    return json.loads(raw)


def indexed_policy_paths() -> set[str]:
    data = policy_index()
    out = set()
    for item in data.get("authorities", []):
        path = str(item.get("path") or "").strip().lstrip("/")
        if path:
            out.add(path)
    return out


def is_rule_like(path: str) -> bool:
    return bool(POLICY_LIKE.search(Path(path).name))


def is_explicit_non_authority(path: str) -> bool:
    return path.startswith(NON_AUTHORITY_SHELVES)


def policy_violations(new_files: list[str]) -> list[str]:
    candidates = [f for f in new_files if is_rule_like(f) and not is_explicit_non_authority(f)]
    if not candidates:
        return []
    try:
        admitted = indexed_policy_paths()
    except Exception as e:
        return [f"POLICY_INDEX unreadable while admitting {', '.join(candidates)}: {e}"]
    return [f for f in candidates if f.lstrip("/") not in admitted]


def print_policy_refusal(paths: list[str]) -> None:
    print("\n" + "=" * 70, file=sys.stderr)
    print("POLICY AUTHORITY: REFUSED", file=sys.stderr)
    print("=" * 70, file=sys.stderr)
    print("RULE-LIKE FILE != AUTHORITY", file=sys.stderr)
    print("", file=sys.stderr)
    for f in paths:
        print(f"  unindexed standing-policy candidate: {f}", file=sys.stderr)
    print("", file=sys.stderr)
    print("Resolve one of these ways:", file=sys.stderr)
    print("  1. Amend/reference an existing indexed policy instead of adding a synonym.", file=sys.stderr)
    print("  2. If this truly is standing authority, add it to control/POLICY_INDEX.json", file=sys.stderr)
    print("     in the SAME change with explicit scope, authority, status and consumers.", file=sys.stderr)
    print("  3. If it is evidence/history/donor prose, place it in returns/, recovery/,", file=sys.stderr)
    print("     control/confluence/, control/prompts/, docs/ or research/ where it cannot", file=sys.stderr)
    print("     silently masquerade as standing policy.", file=sys.stderr)
    print("", file=sys.stderr)
    print("Conscious emergency bypass: git commit --no-verify", file=sys.stderr)
    print("PR CI will still re-run the admission check.", file=sys.stderr)
    print("=" * 70, file=sys.stderr)


def print_reminder(new_files: list[str]) -> None:
    print("\n" + "=" * 70, file=sys.stderr)
    print("SEARCH-DON'T-ASK: substantial new artifact(s) detected", file=sys.stderr)
    print("=" * 70, file=sys.stderr)
    for f in new_files:
        print(f"  {f}  ({count_lines(f)} lines)", file=sys.stderr)
    print("", file=sys.stderr)
    print("HOUSE LAW: SEARCH, DON'T ASK", file=sys.stderr)
    print("  substrate → corpus → web → operator", file=sys.stderr)
    print("", file=sys.stderr)
    print("Search existing work first, e.g.:", file=sys.stderr)
    print("  python3 ~/void-anchor/ops-hub/scripts/field_index.py --search \"<topic>\"", file=sys.stderr)
    print("  recall --query \"<topic>\"", file=sys.stderr)
    print("  rg \"<pattern>\"", file=sys.stderr)
    print("  git grep \"<pattern>\"", file=sys.stderr)
    if REFUSE:
        print("", file=sys.stderr)
        print("REFUSING COMMIT — SEARCH_FIRST_REFUSE=0 returns this generic check to advisory.", file=sys.stderr)
    else:
        print("", file=sys.stderr)
        print("ADVISORY ONLY for generic artifacts. Policy admission above is always strict.", file=sys.stderr)
    print("=" * 70, file=sys.stderr)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--policy-diff",
        metavar="BASE",
        help="CI mode: check added/renamed policy-like files against exact BASE...HEAD",
    )
    args = ap.parse_args()

    try:
        new_files = diff_new_files(args.policy_diff) if args.policy_diff else staged_new_files()
    except Exception as e:
        print(f"POLICY AUTHORITY: REFUSED — {e}", file=sys.stderr)
        return 1

    # Standing-policy admission is deliberately stricter than the generic search reminder.
    # SEARCH_FIRST_SKIP must not bypass this check.
    bad_policy = policy_violations(new_files)
    if bad_policy:
        print_policy_refusal(bad_policy)
        return 1

    if args.policy_diff:
        print(
            f"POLICY AUTHORITY PASS · {len(new_files)} added/renamed file(s) inspected · "
            "standing policy remains indexed"
        )
        return 0

    if SKIP:
        return 0

    if not new_files:
        return 0

    triggering = []
    for f in new_files:
        if is_exempt(f) or not is_artifact(f):
            continue
        if count_lines(f) >= THRESHOLD:
            triggering.append(f)

    if not triggering:
        return 0

    print_reminder(triggering)
    return 1 if REFUSE else 0


if __name__ == "__main__":
    sys.exit(main())
