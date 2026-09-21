#!/usr/bin/env bash
set -euo pipefail

# Prepare an isolated Hermes MEDIA CURATOR profile and local vision worker.
# Does not alter source media and does not schedule cron automatically.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MEDIA_ROOT="${1:-}"
OUT_DIR="${2:-$HOME/.0xxx0-media/refinery}"
PROFILE="media-curator"
LOCAL_MODEL="qwen3-vl:8b"
HERMES_LOCAL_MODEL="field-qwen3-vl:8b-64k"

if [[ -z "$MEDIA_ROOT" ]]; then
  echo "usage: $0 /absolute/path/to/media [output-dir]" >&2
  exit 2
fi
MEDIA_ROOT="$(cd "$MEDIA_ROOT" && pwd)"
mkdir -p "$OUT_DIR"
OUT_DIR="$(cd "$OUT_DIR" && pwd)"

if [[ "$OUT_DIR" == "$MEDIA_ROOT" || "$OUT_DIR" == "$MEDIA_ROOT/"* ]]; then
  echo "refusing output inside source media tree" >&2
  exit 2
fi

for cmd in uv ollama hermes; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "missing required command: $cmd" >&2
    case "$cmd" in
      hermes)
        echo "Install Hermes: curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash" >&2 ;;
      ollama)
        echo "Install Ollama from https://ollama.com/ then rerun." >&2 ;;
      uv)
        echo "Install uv from https://docs.astral.sh/uv/ then rerun." >&2 ;;
    esac
    exit 1
  fi
done

if ! ollama list | awk '{print $1}' | grep -qx "$LOCAL_MODEL"; then
  echo "Pulling local bulk vision worker: $LOCAL_MODEL"
  ollama pull "$LOCAL_MODEL"
fi

# Hermes needs >=64K context for agent/tool use. Give the optional local supervisor
# its own persistent Ollama model instead of changing the global Ollama server.
TMP_MODELFILE="$(mktemp)"
trap 'rm -f "$TMP_MODELFILE"' EXIT
cat > "$TMP_MODELFILE" <<EOF
FROM $LOCAL_MODEL
PARAMETER num_ctx 65536
EOF
if ! ollama list | awk '{print $1}' | grep -qx "$HERMES_LOCAL_MODEL"; then
  echo "Creating optional 64K local Hermes model: $HERMES_LOCAL_MODEL"
  ollama create "$HERMES_LOCAL_MODEL" -f "$TMP_MODELFILE"
fi

if ! hermes profile list | sed 's/^[*[:space:]]*//' | grep -qx "$PROFILE"; then
  hermes profile create "$PROFILE" --no-skills
fi
hermes profile describe "$PROFILE" --text "Supervises the local FIELD MEDIA REFINERY; bulk visual semantics stay local, ambiguous batches are escalated, source media is read-only."

PROFILE_HOME="$HOME/.hermes/profiles/$PROFILE"
mkdir -p "$PROFILE_HOME/skills/media-curator"
cp "$ROOT/skills/media-curator/SKILL.md" "$PROFILE_HOME/skills/media-curator/SKILL.md"

hermes -p "$PROFILE" config set terminal.cwd "$ROOT"
hermes -p "$PROFILE" config set skills.config.media-curator.source_dir "$MEDIA_ROOT"
hermes -p "$PROFILE" config set skills.config.media-curator.out_dir "$OUT_DIR"
hermes -p "$PROFILE" config set skills.config.media-curator.profile "archive-recovery"
hermes -p "$PROFILE" config set skills.config.media-curator.semantic_model "$LOCAL_MODEL"

echo
echo "MEDIA CURATOR profile prepared."
echo "source: $MEDIA_ROOT"
echo "state:  $OUT_DIR"
echo
echo "Recommended supervisor setup:"
echo "  hermes -p $PROFILE model"
echo "  -> choose ChatGPT or Codex Subscription for the supervisor/adjudicator."
echo
echo "Local-only supervisor alternative:"
echo "  hermes -p $PROFILE model"
echo "  -> Custom endpoint"
echo "  -> http://localhost:11434/v1"
echo "  -> API key: ollama"
echo "  -> model: $HERMES_LOCAL_MODEL"
echo "  -> context: 65536"
echo
echo "First bounded run:"
echo "  hermes -p $PROFILE chat --toolsets 'terminal,file,skills,vision,delegation' -q \\"
echo "    'Use the media-curator skill. Run a dry pass, then process at most 3 pending batches and report the morning return. Do not render or mutate source media.'"
echo
echo "After that succeeds, remove the 3-batch bound for an overnight run."
echo "Cron is intentionally not created automatically; schedule it only after the bounded run is clean."
