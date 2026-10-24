from __future__ import annotations
import json, math, sqlite3
from pathlib import Path
from .constants import NODE_TYPES, RELATION_TYPES, STATUSES
from .db import connect, has_fts5
from .events import record_event
from .util import dumps, normalize_text, now_iso, sha256_bytes, sha256_text, stable_id, simple_terms


def ingest_file(db_path, event_log, path, *, title=None, author=None, observed_at=None, uri=None, metadata=None):
    p = Path(path)
    raw = p.read_bytes()
    text = normalize_text(raw.decode("utf-8"))
    h = sha256_bytes(raw)
    sid = f"src:sha256:{h}"
    payload = {
        "id": sid, "uri": uri or str(p.resolve()), "title": title or p.name, "author": author,
        "observed_at": observed_at, "content_hash": h, "content": text, "metadata": metadata or {}
    }
    record_event(db_path, event_log, "source.ingested", payload)
    return payload


def ensure_span(db_path, event_log, source_id, start_char, end_char):
    con = connect(db_path)
    try:
        src = con.execute("SELECT content FROM source WHERE id=?", (source_id,)).fetchone()
        if not src:
            raise KeyError(f"Unknown source: {source_id}")
        text = src["content"]
    finally:
        con.close()
    if start_char < 0 or end_char > len(text) or end_char <= start_char:
        raise ValueError("Invalid span bounds")
    exact = text[start_char:end_char]
    spid = stable_id("span", f"{source_id}:{start_char}:{end_char}:{sha256_text(exact)}")
    payload = {"id": spid, "source_id": source_id, "start_char": start_char, "end_char": end_char,
               "exact_text": exact, "content_hash": sha256_text(exact)}
    record_event(db_path, event_log, "span.asserted", payload)
    return payload


def add_node(db_path, event_log, node_type, text, *, role=None, status="asserted", valid_from=None, valid_to=None,
             evidence=None, metadata=None, node_id=None):
    node_type = node_type.upper()
    if node_type not in NODE_TYPES:
        raise ValueError(f"Invalid node type {node_type}; expected one of {sorted(NODE_TYPES)}")
    if status not in STATUSES:
        raise ValueError(f"Invalid status {status}")
    evidence = evidence or []
    if node_type in {"OBS","CLM","CON","DEC","ART","TST"} and status != "inferred" and not evidence:
        raise ValueError(f"{node_type} requires at least one source span; use status=inferred only for explicitly derived claims")
    if status == "inferred" and not ((metadata or {}).get("parent_ids")):
        raise ValueError("Inferred nodes require metadata.parent_ids")
    seed = dumps({"type":node_type,"text":text,"role":role,"valid_from":valid_from,"valid_to":valid_to,"evidence":evidence})
    nid = node_id or stable_id(node_type.lower(), seed)
    payload = {"id":nid,"type":node_type,"role":role,"text":normalize_text(text),"status":status,
               "valid_from":valid_from,"valid_to":valid_to,"evidence":evidence,"metadata":metadata or {}}
    record_event(db_path, event_log, "node.asserted", payload)
    return payload


def add_relation(db_path, event_log, subject_id, predicate, object_id, *, status="asserted", valid_from=None,
                 valid_to=None, source_span_id=None, evidence_root=None, metadata=None, relation_id=None):
    predicate = predicate.upper()
    if predicate not in RELATION_TYPES:
        raise ValueError(f"Invalid predicate {predicate}")
    con = connect(db_path)
    try:
        for nid in (subject_id, object_id):
            if not con.execute("SELECT 1 FROM node WHERE id=?", (nid,)).fetchone():
                raise KeyError(f"Unknown node: {nid}")
    finally:
        con.close()
    rid = relation_id or stable_id("rel", dumps({"s":subject_id,"p":predicate,"o":object_id,"vf":valid_from,"vt":valid_to}))
    payload = {"id":rid,"subject_id":subject_id,"predicate":predicate,"object_id":object_id,"status":status,
               "valid_from":valid_from,"valid_to":valid_to,"source_span_id":source_span_id,
               "evidence_root":evidence_root,"metadata":metadata or {}}
    record_event(db_path, event_log, "relation.asserted", payload)
    return payload


def search(db_path, query, limit=10):
    con = connect(db_path)
    try:
        if has_fts5(con):
            # Phrase escape individual terms to avoid user query syntax becoming executable FTS syntax.
            terms = simple_terms(query)
            if not terms:
                return []
            q = " OR ".join('"' + t.replace('"','') + '"' for t in terms)
            rows = con.execute("SELECT kind,object_id,text,bm25(fts) AS score FROM fts WHERE fts MATCH ? ORDER BY score LIMIT ?", (q, limit)).fetchall()
            return [dict(r) for r in rows]
        terms = simple_terms(query)
        like = "%" + "%".join(terms) + "%"
        rows = []
        for r in con.execute("SELECT 'node' kind,id object_id,text,0.0 score FROM node WHERE text LIKE ? LIMIT ?", (like, limit)).fetchall():
            rows.append(dict(r))
        rem = max(0, limit-len(rows))
        if rem:
            for r in con.execute("SELECT 'source' kind,id object_id,content text,0.0 score FROM source WHERE content LIKE ? LIMIT ?", (like, rem)).fetchall():
                rows.append(dict(r))
        return rows
    finally:
        con.close()


def trace_node(db_path, node_id, depth=2):
    con = connect(db_path)
    try:
        node = con.execute("SELECT * FROM node WHERE id=?", (node_id,)).fetchone()
        if not node:
            raise KeyError(node_id)
        evidence = con.execute("""SELECT ns.*,sp.source_id,sp.start_char,sp.end_char,sp.exact_text,s.title,s.uri
          FROM node_source ns JOIN span sp ON ns.span_id=sp.id JOIN source s ON sp.source_id=s.id
          WHERE ns.node_id=?""", (node_id,)).fetchall()
        seen={node_id}; frontier=[node_id]; rels=[]; nodes={node_id:dict(node)}
        for _ in range(depth):
            if not frontier: break
            qs=','.join('?'*len(frontier))
            found=con.execute(f"SELECT * FROM relation WHERE subject_id IN ({qs}) OR object_id IN ({qs})", frontier+frontier).fetchall()
            nxt=[]
            for r in found:
                d=dict(r)
                if d["id"] not in {x["id"] for x in rels}: rels.append(d)
                for nid in (d["subject_id"], d["object_id"]):
                    if nid not in seen:
                        nr=con.execute("SELECT * FROM node WHERE id=?",(nid,)).fetchone()
                        if nr:
                            nodes[nid]=dict(nr); seen.add(nid); nxt.append(nid)
            frontier=nxt
        return {"node":dict(node),"evidence":[dict(r) for r in evidence],"nodes":list(nodes.values()),"relations":rels}
    finally:
        con.close()


def context_packet(db_path, query, budget=8000, limit=12, graph_depth=1):
    hits=search(db_path, query, limit=limit)
    node_ids=[h["object_id"] for h in hits if h["kind"]=="node"]
    con=connect(db_path)
    try:
        if not node_ids:
            # Source hits: return bounded snippets directly.
            out=[]; used=0
            for h in hits:
                if h["kind"]!="source": continue
                text=h["text"][:min(1500,budget-used)]
                if not text: break
                out.append({"kind":"source","id":h["object_id"],"text":text})
                used += len(text)
            return {"query":query,"budget_chars":budget,"used_chars":used,"items":out,"evidence_roots":[]}
        expanded=set(node_ids)
        frontier=set(node_ids)
        for _ in range(graph_depth):
            if not frontier: break
            qs=','.join('?'*len(frontier))
            rs=con.execute(f"SELECT subject_id,object_id FROM relation WHERE subject_id IN ({qs}) OR object_id IN ({qs})", tuple(frontier)+tuple(frontier)).fetchall()
            nxt=set()
            for r in rs:
                nxt.update([r["subject_id"],r["object_id"]])
            nxt -= expanded; expanded |= nxt; frontier=nxt
        items=[]; roots=set(); used=0
        ordered=node_ids+[n for n in sorted(expanded) if n not in node_ids]
        for nid in ordered:
            n=con.execute("SELECT id,type,role,text,status,valid_from,valid_to,recorded_at FROM node WHERE id=?",(nid,)).fetchone()
            if not n: continue
            ev=con.execute("""SELECT ns.evidence_root,ns.source_role,sp.id span_id,sp.source_id,sp.start_char,sp.end_char,sp.exact_text
              FROM node_source ns JOIN span sp ON ns.span_id=sp.id WHERE ns.node_id=?""",(nid,)).fetchall()
            obj={"kind":"node",**dict(n),"evidence":[dict(x) for x in ev]}
            cost=len(dumps(obj))
            if used+cost>budget: continue
            items.append(obj); used+=cost; roots.update(x["evidence_root"] for x in ev)
        return {"query":query,"budget_chars":budget,"used_chars":used,"items":items,"evidence_roots":sorted(roots)}
    finally:
        con.close()


def contradictions(db_path):
    con=connect(db_path)
    try:
        rows=con.execute("""SELECT r.*,a.text subject_text,b.text object_text
          FROM relation r JOIN node a ON r.subject_id=a.id JOIN node b ON r.object_id=b.id
          WHERE r.predicate='CONTRADICTS' AND r.status!='superseded'""").fetchall()
        return [dict(r) for r in rows]
    finally: con.close()


def open_loops(db_path):
    con=connect(db_path)
    try:
        rows=con.execute("""SELECT * FROM node WHERE type IN ('QST','ACT') AND status NOT IN ('resolved','refuted','superseded') ORDER BY recorded_at""").fetchall()
        return [dict(r) for r in rows]
    finally: con.close()


def validate(db_path):
    con=connect(db_path)
    issues=[]
    try:
        # Evidence requirements.
        rows=con.execute("""SELECT n.id,n.type,n.status FROM node n LEFT JOIN node_source ns ON n.id=ns.node_id
          WHERE n.type IN ('OBS','CLM','CON','DEC','ART','TST') AND n.status!='inferred'
          GROUP BY n.id HAVING COUNT(ns.span_id)=0""").fetchall()
        for r in rows: issues.append({"code":"MISSING_EVIDENCE","node":r["id"],"type":r["type"]})
        rows=con.execute("SELECT id,superseded_by FROM node WHERE status='superseded' AND superseded_by IS NULL").fetchall()
        for r in rows: issues.append({"code":"SUPERSEDED_WITHOUT_SUCCESSOR","node":r["id"]})
        rows=con.execute("""SELECT ns.node_id,ns.evidence_root,COUNT(*) c FROM node_source ns
          GROUP BY ns.node_id,ns.evidence_root HAVING COUNT(*)>1""").fetchall()
        duplicates=[dict(r) for r in rows]
        return {"ok":not issues,"issues":issues,"same_root_multiple_spans":duplicates}
    finally: con.close()
