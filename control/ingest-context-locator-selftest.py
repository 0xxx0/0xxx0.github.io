#!/usr/bin/env python3
from pathlib import Path
import csv, hashlib, importlib.util, json, tempfile

spec=importlib.util.spec_from_file_location("locator","scripts/locate-ingest-context.py")
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

def shab(b): return hashlib.sha256(b).hexdigest()

with tempfile.TemporaryDirectory() as td:
    root=Path(td)
    reports=root/"reports"/"20260921"; reports.mkdir(parents=True)
    source=root/"source"; source.mkdir()
    # Synthetic inventory hashes.
    payloads={source/"old-app.html":b"<html>old app</html>",source/"design-spec.txt":b"authored spec"}
    rows=[]
    for p,b in payloads.items():
        p.write_bytes(b); rows.append((shab(b),len(b),1,"text/plain",str(p)))
    inv="hash\tsize\tmtime_epoch\tmime\tpath\n"+"\n".join("\t".join(map(str,r)) for r in rows)+"\n"
    (reports/"inventory.tsv").write_text(inv)
    (reports/"duplicates.tsv").write_text("hash\tcount\tbytes_each\tpaths\n")
    run={"root":str(source),"output":str(reports),"schema":"test"}
    (reports/"run.json").write_text(json.dumps(run))
    (reports/"index.jsonl").write_text("")
    (reports/"route-plan.tsv").write_text("content_hash\tpath\tstatus\tlineage\tsemantic_route\tmatched_rules\n")
    (reports/"index-run.json").write_text("{}")
    # Patch exact expected hashes to the fixture.
    m.EXPECTED={p.name:m.sha256(p) for p in reports.iterdir()}
    valid,rejected=m.find_report_sets([root/"reports"])
    assert len(valid)==1 and not rejected, (valid,rejected)
    hs=m.inventory_hashes(reports/"inventory.tsv")
    assert len(hs)==2
    manifest=source/"backup-asset-manifest.json"
    manifest.write_text(json.dumps({"assets":[{"hash":h,"original_name":"x"} for h in sorted(hs)]}))
    scored=m.provenance_candidates([source],hs,32*1024*1024)
    assert scored and scored[0]["coverage"]==1.0, scored
    assert scored[0]["name_hint"] is True
print("INGEST CONTEXT LOCATOR SELFTEST PASS")
