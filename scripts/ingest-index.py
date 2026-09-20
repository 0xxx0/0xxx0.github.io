#!/usr/bin/env python3
import argparse, csv, json, os, re, time
from collections import Counter, defaultdict
from pathlib import Path

def load_rules(path):
    if not path:
        return []
    data=json.loads(Path(path).read_text(encoding="utf-8"))
    rules=[]
    for raw in data.get("rules", []):
        r=dict(raw)
        r["_rx"]=re.compile(r["path_regex"])
        rules.append(r)
    return rules

def read_inventory(path):
    with open(path, newline="", encoding="utf-8") as f:
        reader=csv.DictReader(f, delimiter="\t")
        required={"hash","size","mtime_epoch","mime","path"}
        if not required.issubset(set(reader.fieldnames or [])):
            raise ValueError("inventory schema mismatch")
        return list(reader)

def main():
    ap=argparse.ArgumentParser(description="Non-destructive semantic overlay for 0xxx0 ingest inventory")
    ap.add_argument("inventory")
    ap.add_argument("--rules")
    ap.add_argument("--output-dir", required=True)
    args=ap.parse_args()

    rows=read_inventory(args.inventory)
    rules=load_rules(args.rules)
    out=Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)

    counts=Counter(r["hash"] for r in rows)
    by_hash=defaultdict(list)
    for r in rows:
        by_hash[r["hash"]].append(r["path"])

    records=[]
    route_rows=[]
    for r in rows:
        matches=[x for x in rules if x["_rx"].search(r["path"])]
        tags=sorted({t for x in matches for t in x.get("tags",[])})
        lineages=sorted({x.get("lineage") for x in matches if x.get("lineage")})
        routes=sorted({x.get("semantic_route") for x in matches if x.get("semantic_route")})
        status="UNCLASSIFIED" if not matches else "TAGGED"
        if len(lineages)>1 or len(routes)>1:
            status="REVIEW_CONFLICT"
        elif len(routes)==1:
            status="DRY_RUN_PROPOSED"
        rec={
            "schema":"0xxx0/ingest-record/v0.1",
            "content_hash":r["hash"],
            "byte_object_id":"bytes:"+r["hash"],
            "size":int(r["size"]),
            "mtime_epoch":int(r["mtime_epoch"]),
            "mime":r["mime"],
            "source_path":r["path"],
            "basename":os.path.basename(r["path"]),
            "exact_duplicate_count":counts[r["hash"]],
            "exact_duplicate_paths":by_hash[r["hash"]] if counts[r["hash"]]>1 else [],
            "matched_rules":[x["id"] for x in matches],
            "tags":tags,
            "lineage":lineages[0] if len(lineages)==1 else None,
            "semantic_route":routes[0] if len(routes)==1 else None,
            "status":status,
            "source_mutated":False
        }
        records.append(rec)
        route_rows.append({
            "content_hash":r["hash"],
            "path":r["path"],
            "status":status,
            "lineage":rec["lineage"] or "",
            "semantic_route":rec["semantic_route"] or "",
            "matched_rules":",".join(rec["matched_rules"])
        })

    with open(out/"index.jsonl","w",encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec,ensure_ascii=False,sort_keys=True)+"\n")

    with open(out/"route-plan.tsv","w",encoding="utf-8",newline="") as f:
        w=csv.DictWriter(f,fieldnames=["content_hash","path","status","lineage","semantic_route","matched_rules"],delimiter="\t")
        w.writeheader()
        w.writerows(route_rows)

    summary={
        "schema":"0xxx0/ingest-index-run/v0.1",
        "created_epoch":int(time.time()),
        "inventory":os.path.realpath(args.inventory),
        "rules":os.path.realpath(args.rules) if args.rules else None,
        "records":len(records),
        "byte_objects":len(counts),
        "exact_duplicate_groups":sum(1 for n in counts.values() if n>1),
        "tagged_records":sum(1 for r in records if r["matched_rules"]),
        "route_proposals":sum(1 for r in records if r["semantic_route"]),
        "review_conflicts":sum(1 for r in records if r["status"]=="REVIEW_CONFLICT"),
        "mutated_source":False,
        "outputs":["index.jsonl","route-plan.tsv","index-run.json"],
        "law":"content hash proves byte identity only; lineage and semantic route are separate reviewable overlays"
    }
    (out/"index-run.json").write_text(json.dumps(summary,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(summary,indent=2))

if __name__=="__main__":
    main()
