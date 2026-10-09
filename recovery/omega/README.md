# Recovered Ω 0.4 engine

Exact executable source from `omega-core-interphase-v0.4.zip`, recovered 2026-10-09.
Per-file and archive SHA-256 witnesses are in `provenance.json`. The personal
corpus, seeded benchmark answers, databases and historical output artifacts are
kept in the original archive; they are not published here.

This is a donor behind `/interphase/`'s recovered research surface. It is not a
second FIELD or Dayline state authority. Python 3.11+, standard library only:

```sh
PYTHONPATH=recovery/omega python3 -m unittest discover -s recovery/omega/tests -v
PYTHONPATH=recovery/omega python3 -m omega --root /tmp/my-omega init
PYTHONPATH=recovery/omega python3 -m omega --root /tmp/my-omega ingest my-notes.txt
PYTHONPATH=recovery/omega python3 -m omega --root /tmp/my-omega query "my query"
```

The engine owns content-hashed source ingestion, exact character spans, typed
nodes/relations, evidence guards, SQLite/FTS retrieval, contradiction/open-loop
reads, context packets and event-log replay. Run `python3 -m omega --help` with
the same `PYTHONPATH` for the remaining native commands. Benchmark and channel
commands require caller-supplied datasets/contracts; the private fixtures are
not silently recreated.

The browser consumes caller-imported benchmark snapshots, independent question
JSONL, benchmark-result JSON and conversation manifests. Exact turn text can be
provided as `{ "sources": [{ "unit_id": "...", "text": "..." }] }`; L0 shows
these supplied bytes or an explicit missing-source state. Importing text does
not authenticate it. No backend is started by visiting INTERPHASE.
