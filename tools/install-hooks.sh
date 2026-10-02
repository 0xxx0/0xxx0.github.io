#!/bin/sh
# install-hooks — point this clone at the VERSION-CONTROLLED hooks directory.
#
# `.git/hooks/` is not tracked by git, so a hook left there is invisible to every other
# clone, worktree and session — which is how a "guard" quietly stops existing. Pointing
# core.hooksPath at .githooks/ makes the hook part of the repo, so every checkout shares
# one definition and a change to it is reviewable like any other diff.
#
# Idempotent. Safe to re-run. Does not overwrite an existing core.hooksPath without saying so.

set -e
root="$(git rev-parse --show-toplevel)"
cd "$root"

current="$(git config --get core.hooksPath || true)"
if [ -n "$current" ] && [ "$current" != ".githooks" ]; then
    echo "install-hooks: core.hooksPath is already '$current' — leaving it alone."
    echo "  To switch to the shared hooks: git config core.hooksPath .githooks"
    exit 0
fi

chmod +x .githooks/* 2>/dev/null || true
git config core.hooksPath .githooks

echo "install-hooks: hooks now live in .githooks/ (version controlled)"
echo "  pre-push -> .githooks/pre-push-guard (private trees/secrets) then tools/finish-line.py"
echo "              then the FIELD INDEX stamp gate (MUTATION -> INDEX TOUCH)"
echo
echo "  Verify: python3 tools/finish-line.py --check"
echo "  Bypass (deliberate, visible): git push --no-verify"