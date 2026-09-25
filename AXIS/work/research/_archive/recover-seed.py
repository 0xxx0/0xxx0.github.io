"""One-off: rebuild arxiv-feed.md from the prior run's raw jsonl, re-filtered
with the *precise* keyword matcher (drops the prior run's "scheme"/"goal" false
positives). Kept as provenance for how the feed seed was recovered.

Run once:  python3 _archive/recover-seed.py
"""

import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.dirname(HERE)
JSONL = os.path.join(HERE, "arxiv-feed.jsonl.seed-20260922-prior-run")
FEED = os.path.join(RESEARCH, "arxiv-feed.md")

KEYWORD_LABELS = [
    ("scheming", "scheming"),
    ("sycophancy", "sycophancy"), ("sycophantic", "sycophancy"), ("sycophant", "sycophancy"),
    ("reward hack", "reward-hacking"), ("reward tampering", "reward-hacking"),
    ("reward gaming", "reward-hacking"),
    ("alignment faking", "alignment-faking"), ("alignment faked", "alignment-faking"),
    ("faking alignment", "alignment-faking"), ("fake alignment", "alignment-faking"),
    ("conditional compliance", "alignment-faking"),
    ("deceptive alignment", "hidden-goals"), ("deceptive instrumental alignment", "hidden-goals"),
    ("sandbagging", "hidden-goals"), ("sandbagged", "hidden-goals"),
    ("emergent misalignment", "hidden-goals"),
    ("goal misgeneralization", "hidden-goals"), ("goal misgeneralisation", "hidden-goals"),
    ("specification gaming", "hidden-goals"),
    ("power seeking", "hidden-goals"),
]

# In-scope papers the keyword matcher misses (no literal keyword in title/abstract).
MANUAL_KEEP = {
    "2606.29604": "hidden-goals",  # Mechanistically Eliciting Latent Behaviors
}


def norm(s):
    return re.sub(r"[\s\-]+", " ", (s or "").lower()).strip()


def labels_for(text):
    t = norm(text)
    seen, out = set(), []
    for kw, lbl in KEYWORD_LABELS:
        if norm(kw) in t and lbl not in seen:
            seen.add(lbl)
            out.append(lbl)
    return out


def base_id(aid):
    return aid.split("v")[0]


def main():
    kept, dropped = [], []
    with open(JSONL, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            text = r.get("title", "") + " " + r.get("summary", "")
            labs = labels_for(text)
            extra = MANUAL_KEEP.get(base_id(r.get("id", "")))
            if extra and extra not in labs:
                labs.append(extra)
            if labs:
                kept.append((r, labs))
            else:
                dropped.append(r.get("id", "?"))

    kept.sort(key=lambda x: x[0].get("published", ""), reverse=True)

    with open(FEED, "w", encoding="utf-8") as f:
        f.write("# arXiv Alignment Feed\n\n"
                "Scheming / sycophancy / reward-hacking / alignment-faking and close kin.\n"
                "Seeded by bin/arxiv-fetch.py + _archive/recover-seed.py; "
                "triaged by the arxiv-alignment-feed cron.\n\n")
        for r, labs in kept:
            aid = base_id(r["id"])
            abstract = re.sub(r"\s+", " ", r.get("summary", "")).strip()
            f.write(f"## {aid}  {r['title']}\n")
            f.write(f"topics: {', '.join(labs)}\n")
            f.write("categories: \n")
            f.write(f"published: {r['published'][:10]}\n")
            f.write(f"authors: {', '.join(r.get('authors', [])) or '—'}\n")
            f.write(f"url: https://arxiv.org/abs/{aid}\n")
            f.write("triage: pending\n")
            f.write(f"abstract: {abstract}\n\n")

    print(f"KEPT {len(kept)} papers, DROPPED {len(dropped)} false positives")
    print("dropped:", ", ".join(dropped))
    return 0


if __name__ == "__main__":
    sys.exit(main())
