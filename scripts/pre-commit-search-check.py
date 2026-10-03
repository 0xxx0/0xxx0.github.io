#!/usr/bin/env python3
"""pre-commit-search-check — SEARCH-DON'T-ASK enforcement for new artifacts.

WHY THIS EXISTS
---------------
Agents routinely create new files/routes/docs without first searching the corpus,
field index, or existing codebase — producing duplicates, contradictions, and
orphaned work. The house law is "SEARCH, DON'T ASK" (substrate → corpus → web
→ operator) but nothing enforces it.

This hook catches the real failure: an agent creating a NEW artifact (new file,
route, doc) without first searching. It runs at pre-commit so the reminder
appears before the commit is made, not after a push is refused.

EXTANT SEARCH TOOLS (use these, don't invent)
---------------------------------------------
1. Field Index (ops-hub):  python3 ~/void-anchor/ops-hub/scripts/field_index.py --search "<query>"
   Searches all Hermes conversation history + machine notice streams.

2. Corpus DB (FTS5):       ~/sovereign-node/corpus/corpus.db
   Use the recall tool or direct sqlite3 FTS5 queries.

3. Recall skill:           recall --query "<query>"  (searches all memory at once)

4. Code search (this repo): rg "<pattern>"  or  git grep "<pattern>"

5. Web search:             web_search "<query>"  (Hermes tool)

WHAT THIS HOOK DOES
-------------------
- Runs on `git commit` (pre-commit)
- Detects NEW files being added (--diff-filter=A)
- For new files >= threshold lines (default 10), prints a SEARCH-DON'T-ASK
  reminder with the exact search commands to run FIRST
- Advisory by default (exit 0) — "never block the shared trunk"
- Configurable refusal: set SEARCH_FIRST_REFUSE=1 to exit 1 on violation

CONFIGURATION
-------------
Environment variables:
  SEARCH_FIRST_REFUSE=1     # refuse (exit 1) instead of advisory (default 0)
  SEARCH_FIRST_THRESHOLD=10 # minimum lines in new file to trigger (default 10)
  SEARCH_FIRST_SKIP=1       # skip this check entirely (for emergencies)

BYPASS
------
Deliberate, visible bypass:
  SEARCH_FIRST_SKIP=1 git commit -m "msg"
  # or
  git commit --no-verify -m "msg"

INSTALLATION
------------
Installed via: sh tools/install-hooks.sh
Which wires it into .githooks/pre-commit (version-controlled via core.hooksPath)
"""

import os
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# Configurable via environment
REFUSE = os.environ.get("SEARCH_FIRST_REFUSE", "0") == "1"
THRESHOLD = int(os.environ.get("SEARCH_FIRST_THRESHOLD", "10"))
SKIP = os.environ.get("SEARCH_FIRST_SKIP", "0") == "1"

# File patterns that are exempt (generated, config, etc.)
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

# File extensions that count as "artifacts" worth searching for
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


def git(*args: str) -> tuple[int, str]:
    try:
        p = subprocess.run(
            ["git", "-C", str(REPO), *args],
            capture_output=True, text=True, timeout=15
        )
        return p.returncode, (p.stdout or "").strip()
    except Exception as e:
        return 1, str(e)


def is_exempt(path: str) -> bool:
    import re
    for pat in EXEMPT_PATTERNS:
        if re.search(pat, path):
            return True
    return False


def is_artifact(path: str) -> bool:
    from pathlib import Path as P
    return P(path).suffix in ARTIFACT_EXTS


def count_lines(path: str) -> int:
    full = REPO / path
    if not full.exists():
        return 0
    try:
        return len(full.read_text(errors="ignore").splitlines())
    except Exception:
        return 0


def get_new_files() -> list[str]:
    """Get list of new files being added in this commit (staged, diff-filter=A)."""
    rc, out = git("diff", "--cached", "--name-only", "--diff-filter=A")
    if rc != 0 or not out:
        return []
    return [f for f in out.splitlines() if f]


def print_reminder(new_files: list[str]) -> None:
    """Print the SEARCH-DON'T-ASK reminder with exact commands."""
    print("\n" + "=" * 70, file=sys.stderr)
    print("SEARCH-DON'T-ASK: New artifact(s) detected without prior search", file=sys.stderr)
    print("=" * 70, file=sys.stderr)
    print("", file=sys.stderr)
    print("New files in this commit:", file=sys.stderr)
    for f in new_files:
        lines = count_lines(f)
        print(f"  {f}  ({lines} lines)", file=sys.stderr)
    print("", file=sys.stderr)
    print("HOUSE LAW: SEARCH, DON'T ASK", file=sys.stderr)
    print("  substrate → corpus → web → operator", file=sys.stderr)
    print("  Before creating NEW artifacts, you MUST search first.", file=sys.stderr)
    print("", file=sys.stderr)
    print("RUN THESE SEARCHES NOW:", file=sys.stderr)
    print("", file=sys.stderr)
    print("  # 1. Field Index (all Hermes conversations + machine notices)", file=sys.stderr)
    print("  python3 ~/void-anchor/ops-hub/scripts/field_index.py --search \"<your topic>\"", file=sys.stderr)
    print("", file=sys.stderr)
    print("  # 2. Corpus DB (FTS5) — direct query or recall skill", file=sys.stderr)
    print("  recall --query \"<your topic>\"", file=sys.stderr)
    print("  # or: sqlite3 ~/sovereign-node/corpus/corpus.db \"SELECT * FROM corpus WHERE content MATCH '<topic>'\"", file=sys.stderr)
    print("", file=sys.stderr)
    print("  # 3. Code search (this repo)", file=sys.stderr)
    print("  rg \"<pattern>\"", file=sys.stderr)
    print("  git grep \"<pattern>\"", file=sys.stderr)
    print("", file=sys.stderr)
    print("  # 4. Web search", file=sys.stderr)
    print("  web_search \"<query>\"", file=sys.stderr)
    print("", file=sys.stderr)
    if REFUSE:
        print("REFUSING COMMIT — set SEARCH_FIRST_REFUSE=0 for advisory mode", file=sys.stderr)
        print("  (or SEARCH_FIRST_SKIP=1 to skip this check once)", file=sys.stderr)
    else:
        print("ADVISORY ONLY — commit will proceed. To enable refusal:", file=sys.stderr)
        print("  export SEARCH_FIRST_REFUSE=1", file=sys.stderr)
        print("  # or for one commit: SEARCH_FIRST_REFUSE=1 git commit ...", file=sys.stderr)
    print("=" * 70, file=sys.stderr)


def main() -> int:
    if SKIP:
        return 0

    new_files = get_new_files()
    if not new_files:
        return 0

    # Filter to artifact files above threshold
    triggering = []
    for f in new_files:
        if is_exempt(f):
            continue
        if not is_artifact(f):
            continue
        if count_lines(f) >= THRESHOLD:
            triggering.append(f)

    if not triggering:
        return 0

    print_reminder(triggering)

    return 1 if REFUSE else 0


if __name__ == "__main__":
    sys.exit(main())