#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: $0 <directory> [output-dir]" >&2
  echo "read-only scan: writes reports only; never moves or deletes source files." >&2
  exit 2
fi

command -v python3 >/dev/null 2>&1 || { echo "python3 is required" >&2; exit 2; }
command -v file >/dev/null 2>&1 || { echo "file is required" >&2; exit 2; }

ROOT="$(cd "$1" && pwd -P)"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_RAW="${2:-${HOME:-$PWD}/.0xxx0-ingest/$STAMP}"
OUT="$(python3 - "$OUT_RAW" <<'PY'
import os, sys
print(os.path.realpath(os.path.abspath(os.path.expanduser(sys.argv[1]))))
PY
)"

case "$OUT" in
  "$ROOT"|"$ROOT"/*)
    echo "refusing output inside scanned source tree: $OUT" >&2
    echo "choose an output directory outside: $ROOT" >&2
    exit 2
    ;;
esac

mkdir -p "$OUT"
INV="$OUT/inventory.tsv"
DUP="$OUT/duplicates.tsv"
META="$OUT/run.json"
TMP="$OUT/.inventory.unsorted.tsv"

if command -v b3sum >/dev/null 2>&1; then
  HASH_KIND="blake3"
  hash_file(){ b3sum -- "$1" | awk '{print $1}'; }
elif command -v shasum >/dev/null 2>&1; then
  HASH_KIND="sha256"
  hash_file(){ shasum -a 256 -- "$1" | awk '{print $1}'; }
elif command -v sha256sum >/dev/null 2>&1; then
  HASH_KIND="sha256"
  hash_file(){ sha256sum -- "$1" | awk '{print $1}'; }
else
  echo "need b3sum, shasum, or sha256sum" >&2
  exit 2
fi

case "$(uname -s)" in
  Darwin)
    stat_size(){ stat -f '%z' "$1"; }
    stat_mtime(){ stat -f '%m' "$1"; }
    STAT_KIND="bsd"
    ;;
  *)
    stat_size(){ stat -c '%s' "$1"; }
    stat_mtime(){ stat -c '%Y' "$1"; }
    STAT_KIND="gnu"
    ;;
esac

: > "$TMP"
find "$ROOT" -type f -print0 |
while IFS= read -r -d '' f; do
  size="$(stat_size "$f")"
  mtime="$(stat_mtime "$f")"
  mime="$(file -b --mime-type -- "$f" 2>/dev/null || printf 'unknown')"
  hash="$(hash_file "$f")"
  safe_path="$(printf '%s' "$f" | tr '\t\r\n' '   ')"
  printf '%s\t%s\t%s\t%s\t%s\n' "$hash" "$size" "$mtime" "$mime" "$safe_path" >> "$TMP"
done

{
  printf 'hash\tsize\tmtime_epoch\tmime\tpath\n'
  LC_ALL=C sort -t $'\t' -k5,5 "$TMP"
} > "$INV"
rm -f "$TMP"

awk -F '\t' '
NR==1 {next}
{
  count[$1]++
  size[$1]=$2
  paths[$1]=paths[$1] (paths[$1] ? " || " : "") $5
}
END {
  print "hash\tcount\tbytes_each\tpaths"
  for (h in count) if (count[h] > 1)
    print h "\t" count[h] "\t" size[h] "\t" paths[h]
}' "$INV" | {
  IFS= read -r header
  printf '%s\n' "$header"
  LC_ALL=C sort
} > "$DUP"

python3 - "$ROOT" "$OUT" "$HASH_KIND" "$STAT_KIND" "$INV" "$DUP" > "$META" <<'PY'
import json, sys, time
root,out,hash_kind,stat_kind,inv,dup=sys.argv[1:]
with open(inv, encoding="utf-8") as f:
    files=max(0,sum(1 for _ in f)-1)
with open(dup, encoding="utf-8") as f:
    groups=max(0,sum(1 for _ in f)-1)
print(json.dumps({
  "schema":"0xxx0/ingest-run/v0.2",
  "created_epoch":int(time.time()),
  "root":root,
  "output":out,
  "hash":hash_kind,
  "stat":stat_kind,
  "files_indexed":files,
  "exact_duplicate_groups":groups,
  "mutated_source":False,
  "reports":["inventory.tsv","duplicates.tsv","run.json"],
  "next":"Review duplicate groups; content hash proves byte identity only. Do not delete/move until lineage and canonical-copy decisions are explicit."
}, indent=2))
PY

echo "inventory: $INV"
echo "duplicates: $DUP"
echo "receipt: $META"
echo "source files changed: NO"
