# arXiv Alignment Feed — pipeline

Daily deterministic fetch of arXiv papers on scheming / sycophancy / reward-hacking /
alignment-faking (plus a "hidden-goals" cluster: deceptive alignment, sandbagging,
emergent & goal misgeneralization), then LLM triage ranks importance on change.

## Files (this dir)

- `arxiv-feed.md` — append-only feed. One block per paper: `## <id>  <title>` then
  `topics: / categories: / published: / authors: / url: / abstract:`. Never hand-edited
  (the fetch script appends; triage never touches it).
- `arxiv-triage.md` — importance ranking, 1–5 scale (5 = core covert-misalignment
  finding). `## <id>` then `triage: <n>/5 — <reason>`. Written only by the triage cron.
- `_archive/` — provenance: the prior run's raw jsonl seed + `recover-seed.py`
  (one-time re-filter that rebuilt the feed from it, dropping false positives).

## Scripts (canonical home: `~/.hermes/profiles/kestrel/scripts/`)

- `arxiv_alignment_fetch.py` — deterministic fetch (no LLM). One arXiv API query
  (broad recall across cs.AI/LG/CL/CY/MA), precise client-side topic tagging, 4-day
  lookback, dedup by ID, appends to `arxiv-feed.md`. Exit 0/1. Safe to re-run.
- `arxiv_alignment_monitor.py` — prints sha256 of the sorted feed-ID set (the triage
  cron's `monitor`). Changes only when the feed grows; triage writes never re-trigger it.
- `arxiv_alignment_inbox.py` — prints untriaged papers (feed id absent from triage) as
  the triage cron's `script` context; `NO_UNTRIAGED` when nothing to rank.
- `_retired/arxiv_feed.py.v1-jsonl-buggy` — the earlier buggy version (http, jsonl
  output, loose keywords incl. "situational awareness" → false positives). Superseded.

## Cron jobs

- `arxiv-alignment-feed` (job 640555d6b6ab) — no_agent, runs `arxiv_alignment_fetch.py`
  every day 08:00, deliver=local.
- `arxiv-alignment-triage` (job 2a1f7c056244) — agent, `monitor=arxiv_alignment_monitor.py`,
  `script=arxiv_alignment_inbox.py`, every day 08:30. Wakes only when the monitor digest
  changes (new papers); ranks untriaged papers into `arxiv-triage.md` (1–5 scale).

## Topic labels

`scheming` · `sycophancy` · `reward-hacking` · `alignment-faking` · `hidden-goals`.
Keywords are a config list at the top of `arxiv_alignment_fetch.py` (TOPIC_PATTERNS +
QUERY); tune there, not here.
