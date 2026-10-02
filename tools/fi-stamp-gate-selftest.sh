#!/bin/sh
# fi-stamp-gate-selftest — guards the FIELD INDEX stamp gate (MUTATION -> INDEX TOUCH).
#
# Asserts the two controls that matter:
#   1. a route touch WITHOUT a stamp is REFUSED
#   2. the same touch, stamped in a follow-up commit, is ALLOWED
#
# Control 2 is the one that regressed silently: a follow-up stamp commit used to advance the
# range's stamp past the stamp it had just written, so a correctly-stamped push could never
# pass. It also covers the per-route case (two routes, each stamped in its own commit).
#
# Runs in a throwaway worktree so it never touches the caller's checkout.
set -u
ROOT="$(git rev-parse --show-toplevel)"
TMP="$(mktemp -d)"
BR="fi-stamp-selftest-$$"
fail=0

cleanup() {
  git -C "$ROOT" worktree remove --force "$TMP/wt" 2>/dev/null
  git -C "$ROOT" branch -D "$BR" 2>/dev/null
  rm -rf "$TMP"
}
trap cleanup EXIT

git -C "$ROOT" worktree add "$TMP/wt" -b "$BR" origin/master -q || { echo "SETUP FAIL"; exit 2; }
cd "$TMP/wt" || exit 2

printf '\n<!-- fi-stamp-gate-selftest -->\n' >> shopping/index.html
git add shopping/index.html
git -c core.hooksPath=/dev/null commit -q -m "selftest: touch /shopping/ without a stamp"

python3 tools/fi-mutation-contract.py --from-git origin/master..HEAD --check >/dev/null 2>&1
if [ $? -eq 1 ]; then echo "  PASS unstamped route touch is REFUSED"; else echo "  FAIL unstamped route touch was NOT refused"; fail=1; fi

python3 tools/fi-mutation-contract.py --from-git origin/master..HEAD --modes IMPLEMENT >/dev/null 2>&1 \
  || { echo "  FAIL stamp apply failed"; fail=1; }
git add showcase-manifest.json
git -c core.hooksPath=/dev/null commit -q -m "selftest: stamp /shopping/"

python3 tools/fi-mutation-contract.py --from-git origin/master..HEAD --check >/dev/null 2>&1
if [ $? -eq 0 ]; then echo "  PASS stamped touch is ALLOWED (follow-up stamp commit does not self-invalidate)"; else echo "  FAIL stamped touch is still refused"; fail=1; fi

# second route, stamped in its own commit: the range now spans two route-touching commits
printf '\n<!-- fi-stamp-gate-selftest -->\n' >> dayline/index.html
git add dayline/index.html
git -c core.hooksPath=/dev/null commit -q -m "selftest: touch /dayline/"
python3 tools/fi-mutation-contract.py --from-git origin/master..HEAD --modes IMPLEMENT >/dev/null 2>&1
git add showcase-manifest.json
git -c core.hooksPath=/dev/null commit -q -m "selftest: stamp /dayline/"

python3 tools/fi-mutation-contract.py --from-git origin/master..HEAD --check >/dev/null 2>&1
if [ $? -eq 0 ]; then echo "  PASS two routes, each stamped in its own commit, are ALLOWED (no cross-route false positive)"; else echo "  FAIL multi-route push falsely refused"; fail=1; fi

if [ $fail -eq 0 ]; then echo "FI STAMP GATE SELFTEST PASS"; else echo "FI STAMP GATE SELFTEST FAIL"; fi
exit $fail