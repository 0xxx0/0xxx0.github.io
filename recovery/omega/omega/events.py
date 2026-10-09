from __future__ import annotations
import json
from pathlib import Path
from .db import connect, index_fts
from .util import append_jsonl, dumps, now_iso, stable_id


def make_event(event_type: str, payload: dict, recorded_at: str | None = None) -> dict:
    recorded_at = recorded_at or now_iso()
    seed = dumps({"type": event_type, "recorded_at": recorded_at, "payload": payload})
    return {"event_id": stable_id("evt", seed), "type": event_type, "recorded_at": recorded_at, "payload": payload}


def record_event(db_path: str | Path, event_log: str | Path, event_type: str, payload: dict, recorded_at: str | None = None) -> dict:
    event = make_event(event_type, payload, recorded_at)
    append_jsonl(event_log, event)
    con = connect(db_path)
    try:
        apply_event(con, event)
        con.commit()
    finally:
        con.close()
    return event


def apply_event(con, event: dict) -> None:
    et = event["type"]
    p = event["payload"]
    ra = event["recorded_at"]
    con.execute("INSERT OR IGNORE INTO event(id,type,recorded_at,payload_json) VALUES(?,?,?,?)",
                (event["event_id"], et, ra, dumps(p)))

    if et == "source.ingested":
        con.execute("""INSERT OR IGNORE INTO source
          (id,uri,title,author,observed_at,recorded_at,content_hash,content,metadata_json)
          VALUES(?,?,?,?,?,?,?,?,?)""",
          (p["id"], p.get("uri"), p.get("title"), p.get("author"), p.get("observed_at"), ra,
           p["content_hash"], p["content"], dumps(p.get("metadata", {}))))
        index_fts(con, "source", p["id"], " ".join(filter(None, [p.get("title"), p["content"]])))

    elif et == "span.asserted":
        con.execute("""INSERT OR IGNORE INTO span
          (id,source_id,start_char,end_char,exact_text,content_hash) VALUES(?,?,?,?,?,?)""",
          (p["id"], p["source_id"], p["start_char"], p["end_char"], p["exact_text"], p["content_hash"]))

    elif et == "episode.created":
        con.execute("""INSERT OR REPLACE INTO episode
          (id,title,goal,boundary_reason,valid_from,valid_to,recorded_at,metadata_json)
          VALUES(?,?,?,?,?,?,?,?)""",
          (p["id"], p.get("title"), p.get("goal"), p.get("boundary_reason"), p.get("valid_from"),
           p.get("valid_to"), ra, dumps(p.get("metadata", {}))))
        for sid in p.get("source_ids", []):
            con.execute("INSERT OR IGNORE INTO episode_source(episode_id,source_id) VALUES(?,?)", (p["id"], sid))

    elif et == "node.asserted":
        con.execute("""INSERT OR REPLACE INTO node
          (id,type,role,text,status,valid_from,valid_to,recorded_at,superseded_by,metadata_json)
          VALUES(?,?,?,?,?,?,?,?,?,?)""",
          (p["id"], p["type"], p.get("role"), p["text"], p.get("status","asserted"), p.get("valid_from"),
           p.get("valid_to"), ra, p.get("superseded_by"), dumps(p.get("metadata", {}))))
        index_fts(con, "node", p["id"], p["text"])
        for ev in p.get("evidence", []):
            con.execute("""INSERT OR IGNORE INTO node_source(node_id,span_id,source_role,evidence_root)
              VALUES(?,?,?,?)""", (p["id"], ev["span_id"], ev.get("source_role","supports"), ev["evidence_root"]))

    elif et == "relation.asserted":
        con.execute("""INSERT OR REPLACE INTO relation
          (id,subject_id,predicate,object_id,status,valid_from,valid_to,recorded_at,source_span_id,evidence_root,metadata_json)
          VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
          (p["id"], p["subject_id"], p["predicate"], p["object_id"], p.get("status","asserted"),
           p.get("valid_from"), p.get("valid_to"), ra, p.get("source_span_id"), p.get("evidence_root"),
           dumps(p.get("metadata", {}))))

    elif et == "node.superseded":
        con.execute("UPDATE node SET status='superseded', superseded_by=? WHERE id=?", (p["by"], p["id"]))

    elif et == "node.status":
        con.execute("UPDATE node SET status=? WHERE id=?", (p["status"], p["id"]))

    elif et == "artifact.linked":
        con.execute("""INSERT OR REPLACE INTO artifact(id,node_id,path,media_type,sha256,metadata_json)
          VALUES(?,?,?,?,?,?)""", (p["id"], p.get("node_id"), p.get("path"), p.get("media_type"), p.get("sha256"), dumps(p.get("metadata", {}))))

    elif et in {"test.recorded", "annotation.added", "manual.corrected"}:
        pass
    else:
        raise ValueError(f"Unknown event type: {et}")


def rebuild_from_log(db_path: str | Path, event_log: str | Path) -> dict:
    from .db import init_db
    from .util import iter_jsonl
    db_path = Path(db_path)
    for suffix in ("", "-wal", "-shm"):
        p = Path(str(db_path) + suffix)
        if p.exists():
            p.unlink()
    info = init_db(db_path)
    con = connect(db_path)
    count = 0
    try:
        for event in iter_jsonl(event_log):
            apply_event(con, event)
            count += 1
        con.commit()
    finally:
        con.close()
    return {"replayed_events": count, **info}
