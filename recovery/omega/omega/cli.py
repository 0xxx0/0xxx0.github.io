from __future__ import annotations
import argparse, json, sys
from pathlib import Path
from .db import init_db, connect
from .core import ingest_file, ensure_span, add_node, add_relation, search, trace_node, context_packet, contradictions, open_loops, validate
from .events import record_event, rebuild_from_log
from .eval import run_eval
from .render import render_dot, render_datadisc, render_field
from .corpus import freeze_chatgpt_exports
from .benchmark import build_r0_units, build_extractive_units, run_retrieval_benchmark, validate_questions
from .channel_contract import validate_channel_contract


def jprint(x): print(json.dumps(x,ensure_ascii=False,indent=2,sort_keys=True))

def paths(root):
    root=Path(root)
    return root/root.name if False else (root/"db"/"omega.sqlite", root/"data"/"events.jsonl")

def main(argv=None):
    p=argparse.ArgumentParser(prog="omega")
    p.add_argument("--root",default=".",help="Omega repo root")
    sub=p.add_subparsers(dest="cmd",required=True)
    sub.add_parser("init")
    x=sub.add_parser("ingest"); x.add_argument("path"); x.add_argument("--title"); x.add_argument("--author")
    x=sub.add_parser("span"); x.add_argument("source_id"); x.add_argument("start",type=int); x.add_argument("end",type=int)
    x=sub.add_parser("add-node"); x.add_argument("type"); x.add_argument("text"); x.add_argument("--status",default="asserted"); x.add_argument("--role"); x.add_argument("--span"); x.add_argument("--root-id"); x.add_argument("--parents",nargs="*")
    x=sub.add_parser("link"); x.add_argument("subject"); x.add_argument("predicate"); x.add_argument("object"); x.add_argument("--span"); x.add_argument("--root-id")
    x=sub.add_parser("query"); x.add_argument("query"); x.add_argument("--limit",type=int,default=10)
    x=sub.add_parser("trace"); x.add_argument("node_id"); x.add_argument("--depth",type=int,default=2)
    x=sub.add_parser("context"); x.add_argument("query"); x.add_argument("--budget",type=int,default=8000); x.add_argument("--limit",type=int,default=12)
    sub.add_parser("contradictions"); sub.add_parser("open"); sub.add_parser("validate"); sub.add_parser("rebuild")
    x=sub.add_parser("supersede"); x.add_argument("old"); x.add_argument("new")
    x=sub.add_parser("status"); x.add_argument("node_id"); x.add_argument("status")
    x=sub.add_parser("render"); x.add_argument("kind",choices=["graph","datadisc","field"]); x.add_argument("output"); x.add_argument("--query-label",default="CURRENT TASK")
    x=sub.add_parser("eval"); x.add_argument("questions"); x.add_argument("--top-k",type=int,default=10)
    x=sub.add_parser("freeze-chatgpt"); x.add_argument("selectors"); x.add_argument("out"); x.add_argument("exports",nargs="+")
    x=sub.add_parser("bench-r0"); x.add_argument("corpus"); x.add_argument("output")
    x=sub.add_parser("bench-extractive"); x.add_argument("corpus"); x.add_argument("output"); x.add_argument("--ratio",type=float,default=0.10)
    x=sub.add_parser("bench-validate"); x.add_argument("corpus"); x.add_argument("questions")
    x=sub.add_parser("bench-run"); x.add_argument("units"); x.add_argument("questions"); x.add_argument("--raw-chars",type=int); x.add_argument("--max-k",type=int,default=20)
    x=sub.add_parser("validate-channels"); x.add_argument("contract",nargs="?",default="research/CHANNEL_CONTRACT.json")
    a=p.parse_args(argv)
    db,eventlog=paths(a.root)
    if a.cmd=="init": jprint(init_db(db)); return
    if not db.exists(): init_db(db)
    if a.cmd=="ingest": jprint(ingest_file(db,eventlog,a.path,title=a.title,author=a.author))
    elif a.cmd=="span": jprint(ensure_span(db,eventlog,a.source_id,a.start,a.end))
    elif a.cmd=="add-node":
        ev=[]
        if a.span:
            ev=[{"span_id":a.span,"evidence_root":a.root_id or a.span,"source_role":"supports"}]
        meta={"parent_ids":a.parents} if a.parents else {}
        jprint(add_node(db,eventlog,a.type,a.text,role=a.role,status=a.status,evidence=ev,metadata=meta))
    elif a.cmd=="link": jprint(add_relation(db,eventlog,a.subject,a.predicate,a.object,source_span_id=a.span,evidence_root=a.root_id))
    elif a.cmd=="query": jprint(search(db,a.query,a.limit))
    elif a.cmd=="trace": jprint(trace_node(db,a.node_id,a.depth))
    elif a.cmd=="context": jprint(context_packet(db,a.query,a.budget,a.limit))
    elif a.cmd=="contradictions": jprint(contradictions(db))
    elif a.cmd=="open": jprint(open_loops(db))
    elif a.cmd=="validate": jprint(validate(db))
    elif a.cmd=="rebuild": jprint(rebuild_from_log(db,eventlog))
    elif a.cmd=="supersede": jprint(record_event(db,eventlog,"node.superseded",{"id":a.old,"by":a.new}))
    elif a.cmd=="status": jprint(record_event(db,eventlog,"node.status",{"id":a.node_id,"status":a.status}))
    elif a.cmd=="render":
        if a.kind=="graph": render_dot(db,a.output)
        elif a.kind=="datadisc": render_datadisc(db,a.output,a.query_label)
        else: render_field(db,a.output,a.query_label)
        jprint({"output":str(Path(a.output).resolve())})
    elif a.cmd=="eval": jprint(run_eval(db,a.questions,a.top_k))
    elif a.cmd=="freeze-chatgpt":
        selectors=json.loads(Path(a.selectors).read_text(encoding="utf-8"))
        jprint(freeze_chatgpt_exports(a.exports,selectors,a.out))
    elif a.cmd=="bench-r0": jprint(build_r0_units(a.corpus,a.output))
    elif a.cmd=="bench-extractive": jprint(build_extractive_units(a.corpus,a.output,ratio=a.ratio))
    elif a.cmd=="bench-validate": jprint(validate_questions(a.corpus,a.questions))
    elif a.cmd=="bench-run": jprint(run_retrieval_benchmark(a.units,a.questions,max_k=a.max_k,raw_chars=a.raw_chars))
    elif a.cmd=="validate-channels":
        contract=Path(a.contract)
        if not contract.is_absolute(): contract=Path(a.root)/contract
        jprint(validate_channel_contract(contract))

if __name__=="__main__": main()
