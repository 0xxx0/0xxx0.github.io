from __future__ import annotations
import sqlite3
from pathlib import Path

SCHEMA = r"""
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS meta(
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source(
  id TEXT PRIMARY KEY,
  uri TEXT,
  title TEXT,
  author TEXT,
  observed_at TEXT,
  recorded_at TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS span(
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES source(id),
  start_char INTEGER NOT NULL,
  end_char INTEGER NOT NULL,
  exact_text TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  UNIQUE(source_id, start_char, end_char)
);

CREATE TABLE IF NOT EXISTS episode(
  id TEXT PRIMARY KEY,
  title TEXT,
  goal TEXT,
  boundary_reason TEXT,
  valid_from TEXT,
  valid_to TEXT,
  recorded_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS episode_source(
  episode_id TEXT NOT NULL REFERENCES episode(id),
  source_id TEXT NOT NULL REFERENCES source(id),
  PRIMARY KEY(episode_id, source_id)
);

CREATE TABLE IF NOT EXISTS node(
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  role TEXT,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'asserted',
  valid_from TEXT,
  valid_to TEXT,
  recorded_at TEXT NOT NULL,
  superseded_by TEXT REFERENCES node(id),
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS node_source(
  node_id TEXT NOT NULL REFERENCES node(id),
  span_id TEXT NOT NULL REFERENCES span(id),
  source_role TEXT NOT NULL DEFAULT 'supports',
  evidence_root TEXT NOT NULL,
  PRIMARY KEY(node_id, span_id, source_role)
);

CREATE TABLE IF NOT EXISTS relation(
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES node(id),
  predicate TEXT NOT NULL,
  object_id TEXT NOT NULL REFERENCES node(id),
  status TEXT NOT NULL DEFAULT 'asserted',
  valid_from TEXT,
  valid_to TEXT,
  recorded_at TEXT NOT NULL,
  source_span_id TEXT REFERENCES span(id),
  evidence_root TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_relation_subject ON relation(subject_id);
CREATE INDEX IF NOT EXISTS idx_relation_object ON relation(object_id);
CREATE INDEX IF NOT EXISTS idx_relation_predicate ON relation(predicate);
CREATE INDEX IF NOT EXISTS idx_node_type_status ON node(type, status);
CREATE INDEX IF NOT EXISTS idx_node_recorded ON node(recorded_at);

CREATE TABLE IF NOT EXISTS artifact(
  id TEXT PRIMARY KEY,
  node_id TEXT REFERENCES node(id),
  path TEXT,
  media_type TEXT,
  sha256 TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS event(
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
"""


def connect(path: str | Path) -> sqlite3.Connection:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(p)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    return con


def init_db(path: str | Path) -> dict:
    con = connect(path)
    try:
        con.executescript(SCHEMA)
        fts5 = True
        try:
            con.execute("CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts5(kind UNINDEXED, object_id UNINDEXED, text)")
            con.execute("INSERT OR REPLACE INTO meta(key,value) VALUES('fts5','1')")
        except sqlite3.OperationalError:
            fts5 = False
            con.execute("INSERT OR REPLACE INTO meta(key,value) VALUES('fts5','0')")
        con.commit()
        return {"db": str(path), "fts5": fts5}
    finally:
        con.close()


def has_fts5(con: sqlite3.Connection) -> bool:
    row = con.execute("SELECT value FROM meta WHERE key='fts5'").fetchone()
    return bool(row and row[0] == "1")


def index_fts(con: sqlite3.Connection, kind: str, object_id: str, text: str) -> None:
    if not has_fts5(con):
        return
    con.execute("DELETE FROM fts WHERE kind=? AND object_id=?", (kind, object_id))
    con.execute("INSERT INTO fts(kind,object_id,text) VALUES(?,?,?)", (kind, object_id, text))
