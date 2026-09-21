#!/usr/bin/env python3
"""
Locate the verified 2026-09-21 ingest report set and a plausible original-name/source
provenance manifest without rescanning or mutating the user's source tree.

Defaults are intentionally narrow:
  1. $INGEST_REPORT_ROOT, when supplied
  2. ~/.0xxx0-ingest

The exact six report SHA-256 hashes are the authority. Once run.json is verified,
its recorded source root becomes the only default provenance search root.
Additional provenance roots require explicit --provenance-root arguments.
"""
from __future__ import annotations
import argparse, csv, hashlib, json, os, re, sys
from pathlib import Path

EXPECTED = {
    "inventory.tsv": "8ac55341954458bdfe2712ac92750a40bbd8dae5d70ffcdcaad644bae75014c0",
    "duplicates.tsv": "dbc8adbf79acb0389ab4b05fde4575845193a096927a89413def895421fa6385",
    "run.json": "bffc9b55c6daf51bf23331f134dc62e77bfea3f0998030a5459daf0ceb9e69a4",
    "index.jsonl": "c267cd3afd35fc79614bd332b6ed6e619598bee11999b4e4fae8768bffc184e7",
    "route-plan.tsv": "34732fdd4cb346d03d038f987192e8364cef87a1adb2e28926e713d65a572002",
    "index-run.json": "46b0bfd07555843232f08a3d410901885498bdfdf2dde29a9a6dc3f10c28aec9",
}
TEXT_EXT = {".json",".jsonl",".tsv",".csv",".txt",".md",".yaml",".yml"}
NAME_HINT = re.compile(r"(manifest|asset|backup|export|index|catalog|provenance)", re.I)

def sha256(path: Path) -> str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024), b""):
            h.update(chunk)
    return h.hexdigest()

def roots(args):
    out=[]
    env=os.environ.get("INGEST_REPORT_ROOT")
    if env: out.append(Path(env).expanduser())
    out.extend(Path(x).expanduser() for x in args.report_root)
    if not out: out.append(Path.home()/".0xxx0-ingest")
    seen=[]
    for p in out:
        p=p.resolve()
        if p not in seen: seen.append(p)
    return seen

def find_report_sets(search_roots):
    # Only exact expected basenames are visited. This is not a source rescan.
    candidates={}
    for root in search_roots:
        if not root.exists(): continue
        for name in EXPECTED:
            try:
                hits=root.rglob(name)
            except OSError:
                continue
            for p in hits:
                if not p.is_file(): continue
                parent=p.parent.resolve()
                candidates.setdefault(parent,{})[name]=p.resolve()
    valid=[]
    rejected=[]
    for parent, files in candidates.items():
        if set(files)!=set(EXPECTED): continue
        actual={n:sha256(files[n]) for n in EXPECTED}
        ok=all(actual[n]==EXPECTED[n] for n in EXPECTED)
        rec={"dir":str(parent),"files":{n:str(files[n]) for n in EXPECTED},"hashes":actual}
        (valid if ok else rejected).append(rec)
    return valid,rejected

def inventory_hashes(path: Path):
    out=set()
    with path.open(newline="",encoding="utf-8") as f:
        for r in csv.DictReader(f,delimiter="\t"):
            h=(r.get("hash") or "").strip().lower()
            if re.fullmatch(r"[0-9a-f]{64}",h): out.add(h)
    return out

def provenance_candidates(search_roots, hashes, max_bytes):
    scored=[]
    hexrx=re.compile(rb"(?i)\b[0-9a-f]{64}\b")
    for root in search_roots:
        if not root.exists() or not root.is_dir(): continue
        for p in root.rglob("*"):
            try:
                if not p.is_file() or p.suffix.lower() not in TEXT_EXT: continue
                size=p.stat().st_size
                if size<=0 or size>max_bytes: continue
                # Prefer likely manifest names, but still allow structured text when it has real hash overlap.
                raw=p.read_bytes()
            except (OSError,UnicodeError):
                continue
            found={m.group(0).decode("ascii").lower() for m in hexrx.finditer(raw)}
            overlap=len(found & hashes)
            if not overlap: continue
            score=overlap + (25 if NAME_HINT.search(p.name) else 0)
            scored.append({
                "path":str(p.resolve()),"bytes":size,"hash_overlap":overlap,
                "inventory_hashes":len(hashes),"coverage":round(overlap/max(1,len(hashes)),6),
                "name_hint":bool(NAME_HINT.search(p.name)),"score":score
            })
    scored.sort(key=lambda x:(x["score"],x["coverage"],-x["bytes"]),reverse=True)
    return scored[:20]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--report-root",action="append",default=[],help="bounded root containing ingest report directories; repeatable")
    ap.add_argument("--provenance-root",action="append",default=[],help="additional bounded root to inspect for original-name/source manifests")
    ap.add_argument("--max-candidate-mb",type=int,default=32)
    ap.add_argument("--output",help="write local JSON context here; defaults beside verified reports")
    args=ap.parse_args()

    search_roots=roots(args)
    valid,rejected=find_report_sets(search_roots)
    if not valid:
        print(json.dumps({
            "schema":"0xxx0/ingest-context-locator/v0.1","result":"BLOCKED",
            "reason":"VERIFIED_REPORT_SET_NOT_FOUND",
            "searched_report_roots":[str(x) for x in search_roots],
            "rejected_report_sets":rejected,
            "next":"Set INGEST_REPORT_ROOT or pass --report-root pointing only at the known ingest report parent; do not rescan the source tree."
        },indent=2),file=sys.stderr)
        return 2
    if len(valid)>1:
        # Exact duplicates of reports are lawful; choose newest directory mtime but expose all copies.
        valid.sort(key=lambda x:Path(x["dir"]).stat().st_mtime,reverse=True)
    chosen=valid[0]
    report_dir=Path(chosen["dir"])
    run=json.loads(Path(chosen["files"]["run.json"]).read_text(encoding="utf-8"))
    source_root=Path(run.get("root","")).expanduser().resolve() if run.get("root") else None
    inv=Path(chosen["files"]["inventory.tsv"])
    hashes=inventory_hashes(inv)

    prov_roots=[]
    if source_root and source_root.exists(): prov_roots.append(source_root)
    for x in args.provenance_root:
        p=Path(x).expanduser().resolve()
        if p not in prov_roots: prov_roots.append(p)

    scored=provenance_candidates(prov_roots,hashes,args.max_candidate_mb*1024*1024)
    best=scored[0] if scored else None
    # 90%+ overlap is strong enough to call a provenance-manifest candidate, but not semantic authority.
    manifest_state="STRONG_CANDIDATE" if best and best["coverage"]>=0.90 else ("PARTIAL_CANDIDATE" if best else "NOT_FOUND")

    result={
        "schema":"0xxx0/ingest-context-locator/v0.1",
        "result":"READY" if manifest_state=="STRONG_CANDIDATE" else "REPORTS_READY_PROVENANCE_NEEDS_REVIEW",
        "verified_report_dir":str(report_dir),
        "verified_reports":chosen["files"],
        "duplicate_verified_report_sets":[x["dir"] for x in valid[1:]],
        "run_root":str(source_root) if source_root else None,
        "inventory_unique_hashes":len(hashes),
        "provenance_search_roots":[str(x) for x in prov_roots],
        "provenance_state":manifest_state,
        "provenance_candidates":scored,
        "laws":[
            "Exact report hashes identify the Sep-21 ingest context.",
            "Provenance candidate selection uses hash overlap only; filename/title similarity is not semantic identity.",
            "No source file is modified, moved, renamed or published.",
            "A provenance candidate is an input to one-family review, not publication authority."
        ],
        "next":"If provenance_state is STRONG_CANDIDATE, execute exactly one family review. Otherwise pass one explicit --provenance-root or RETURN BLOCKED; do not widen to the whole home directory."
    }
    output=Path(args.output).expanduser() if args.output else report_dir/"ingest-context-2026-09-21.json"
    output.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({**result,"output":str(output.resolve())},indent=2))
    return 0 if result["result"]=="READY" else 3

if __name__=="__main__":
    raise SystemExit(main())
