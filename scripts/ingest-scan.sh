#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <directory> [output-dir]" >&2
  echo "read-only scan: writes reports only; never moves or deletes source files." >&2
  exit 2
fi

ROOT="$(cd "$1" && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${2:-$PWD/.0xxx0-ingest/$STAMP}"
mkdir -p "$OUT"

INV="$OUT/inventory.tsv"
DUP="$OUT/duplicates.tsv"
META="$OUT/run.json"

if command -v b3sum >/dev/null 2>&1; then
  HASHER="b3sum"
  HASH_KIND="blake3"
else
  HASHER="shasum -a 256"
  HASH_KIND="sha256"
fi

printf 'hash\tsize\tmtime_epoch\tmime\tpath\n' > "$INV"

find "$ROOT" -type f -print0 | while IFS= read -r -d '' f; do
  size="$(stat -f '%z' "$f" 2>/dev/null || stat -c '%s' "$f")"
  mtime="$(stat -f '%m' "$f" 2>/dev/null || stat -c '%Y' "$f")"
  mime="$(file -b --mime-type "$f" 2>/dev/null || printf 'unknown')"
  hash="$(eval "$HASHER" '"$f"' | awk '{print $1}')"
  safe_path="$(printf '%s' "$f" | tr '\t\r\n' '   ')"
  printf '%s\t%s\t%s\t%s\t%s\n' "$hash" "$size" "$mtime" "$mime" "$safe_path" >> "$INV"
done

awk -F '\t' '
NR==1 {next}
{count[$1]++; lines[$1]=lines[$1] $0 "\n"}
END {
  print "hash\tcount\trecords"
  for (h in count) if (count[h] > 1) {
    gsub(/\n$/, "", lines[h])
    gsub(/\n/, " || ", lines[h])
    print h "\t" count[h] "\t" lines[h]
  }
}' "$INV" > "$DUP"

python3 - "$ROOT" "$OUT" "$HASH_KIND" "$INV" "$DUP" > "$META" <<'PY'
import json, os, sys, time
root,out,hash_kind,inv,dup=sys.argv[1:]
with open(inv,'rb') as f:
    files=max(0,sum(1 for _ in f)-1)
with open(dup,'rb') as f:
    groups=max(0,sum(1 for _ in f)-1)
print(json.dumps({
  "schema":"0xxx0/ingest-run/v0.1",
  "created_epoch":int(time.time()),
  "root":root,
  "output":out,
  "hash":hash_kind,
  "files_indexed":files,
  "exact_duplicate_groups":groups,
  "mutated_source":False,
  "next":"Review duplicates.tsv; do not delete/move until lineage and canonical-copy decisions are explicit."
}, indent=2))
PY

echo "inventory: $INV"
echo "duplicates: $DUP"
echo "receipt: $META"
echo "source files changed: NO"
