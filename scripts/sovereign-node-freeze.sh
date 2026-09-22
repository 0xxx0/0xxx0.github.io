#!/usr/bin/env bash
set -euo pipefail
umask 077

OUT="${1:-$HOME/sovereign-node-runs/$(date +%Y%m%d-%H%M%S)}"
FLAKE="${FLAKE:-$HOME/.config/nix-darwin}"
mkdir -p "$OUT"/{baseline,receipts}

capture() {
  local name="$1"
  shift
  {
    echo "$ $*"
    "$@"
  } >"$OUT/baseline/$name" 2>&1 || true
}

{
  date -u
  date
  sw_vers
  uname -a
  uname -m
  sysctl -n hw.model 2>/dev/null || true
  sysctl -n hw.memsize 2>/dev/null || true
} >"$OUT/baseline/host.txt"

{
  for cmd in nix darwin-rebuild ollama node npm openclaw hermes docker; do
    printf '%-18s ' "$cmd"
    command -v "$cmd" || true
  done
} >"$OUT/baseline/paths.txt"

capture nix-version nix --version
capture darwin-rebuild-version darwin-rebuild --version
capture ollama-version ollama --version
capture node-version node --version
capture npm-version npm --version
capture openclaw-version openclaw --version
capture hermes-version hermes --version
capture docker-version docker version

if [[ -d "$FLAKE/.git" ]]; then
  git -C "$FLAKE" status --porcelain=v1 >"$OUT/baseline/nix-git-status.txt"
  git -C "$FLAKE" rev-parse HEAD >"$OUT/baseline/nix-git-head.txt"
fi

if [[ -e "$FLAKE/flake.nix" ]]; then
  nix flake metadata --json "$FLAKE" >"$OUT/baseline/nix-flake-metadata.json" 2>"$OUT/baseline/nix-flake-metadata.err" || true
  find "$FLAKE" -maxdepth 3 \( -name '*.nix' -o -name 'flake.lock' \) -type f -print0 \
    | sort -z | xargs -0 shasum -a 256 >"$OUT/baseline/nix-config-sha256.txt" || true
fi

capture darwin-generations darwin-rebuild --list-generations
capture ollama-list ollama list
capture ollama-ps ollama ps
capture openclaw-update openclaw update status --json
capture openclaw-security openclaw security audit --json
capture openclaw-doctor openclaw doctor
capture hermes-update-plan hermes update --plan
capture hermes-profiles hermes profile list

# Hash provider state without copying secrets into the evidence bundle.
for d in "$HOME/.openclaw" "$HOME/.hermes"; do
  [[ -d "$d" ]] || continue
  find "$d" -maxdepth 3 -type f -print0 2>/dev/null \
    | sort -z | xargs -0 shasum -a 256 >>"$OUT/baseline/provider-state-sha256.txt" 2>/dev/null || true
done

(
  cd "$OUT"
  find baseline -type f -print0 | sort -z | xargs -0 shasum -a 256
) >"$OUT/receipts/FREEZE.sha256"

cat >"$OUT/RETURN.txt" <<EOF
STATE=BASELINE_FROZEN
OUT=$OUT
FLAKE=$FLAKE
MUTATED_CANONICAL_STATE=false
SECRETS_COPIED=false
NEXT=Inspect failures and unexplained dirt before any upgrade or bake-off.
EOF

printf '%s\n' "$OUT"
