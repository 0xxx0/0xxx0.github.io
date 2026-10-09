from __future__ import annotations
import json, statistics, time
from pathlib import Path
from .core import search
from .util import iter_jsonl


def _recall(expected, got):
    expected=set(expected)
    return 1.0 if not expected else len(expected & set(got))/len(expected)


def run_eval(db_path, questions_path, top_k=10):
    rows=[]
    for q in iter_jsonl(questions_path):
        t0=time.perf_counter()
        hits=search(db_path,q["query"],limit=top_k)
        ms=(time.perf_counter()-t0)*1000
        got_nodes=[x["object_id"] for x in hits if x["kind"]=="node"]
        got_sources=[x["object_id"] for x in hits if x["kind"]=="source"]
        rows.append({
          "id":q.get("id"),"query":q["query"],"latency_ms":round(ms,3),
          "node_recall":_recall(q.get("expected_node_ids",[]),got_nodes),
          "source_recall":_recall(q.get("expected_source_ids",[]),got_sources),
          "got_node_ids":got_nodes,"got_source_ids":got_sources
        })
    agg={
      "n":len(rows),
      "mean_node_recall":statistics.mean([r["node_recall"] for r in rows]) if rows else None,
      "mean_source_recall":statistics.mean([r["source_recall"] for r in rows]) if rows else None,
      "mean_latency_ms":statistics.mean([r["latency_ms"] for r in rows]) if rows else None
    }
    return {"aggregate":agg,"rows":rows}
