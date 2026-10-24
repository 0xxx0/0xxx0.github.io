#!/usr/bin/env python3
"""build-archive-timeline.py — regenerate /recovery/timeline/ from the archive itself.

WHY THIS EXISTS
---------------
The operator's standing ask: "the original point was to extract out work done over
time" — and the omnibar thesis is going INTO instead of scrolling DOWN. The work
exists (return receipts, frozen vault collections, one consolidated media pass) but
it is scattered across three directories and two off-repo manifests, so there is no
single surface that shows the archive as a chronology. This generator projects all
of it onto ONE spine: month-grouped, newest first, every row one tap into the thing
it names. It follows scripts/build-calls.py: Python stdlib, reads local manifests,
writes static server-rendered HTML, no build step, no framework, no network.

SOURCES OF TRUTH (read-only; nothing here writes to them)
  returns/*.json                      the return ledger — 295 receipts (schema varies;
                                      date from `date`/`at`/filename/git, in that order)
  recovery/*/                         the frozen vault collections — file count/bytes
                                      measured on disk, first-commit date from git,
                                      note from showcase-manifest route.role when the
                                      collection is registered, else its own RECOVERY/
                                      manifest json, else its first doc heading
  showcase-manifest.json              route registry (roles, registration, /recovery/*)
  ~/void-anchor/ai-media/consolidated/MANIFEST.tsv
                                      1,948 rows path|bytes|sha256|origin — the media
                                      consolidation pass; homes and dedupe clusters are
                                      RECOMPUTED from the sha column, never read from prose
  ~/void-anchor/AXIS/work/media-consolidate-2026-10-22/INVENTORY.md
                                      pass date only (frontmatter `created:`)

OUTPUT (all committed; the page is server-rendered so it needs zero JS to read)
  recovery/timeline/index.html         the spine: month groups, one row per artifact
  recovery/timeline/data.json          machine projection: schema, counts, entries[]
  recovery/timeline/media-manifest.tsv byte copy of the consolidated manifest, so every
                                       media row's tap lands on a real public manifest

DESIGN LAW CARRIED (DESIGN-INTENT.md)
  P1/P2  lib/moire-ambient.js identity() seeded from this page's own entry route list;
         pad = the page's own background, ink = the library's rgb(79,87,96) hairline,
         quiet alpha <= 0.12 — the ambient changes no surface colour
  P3     quiet at rest; the moiré blooms only behind an explicit act (hover the title,
         tap it, focus a month chip) and returns to quiet on release
  P4/P5  every drawn layer names a real field of this data (threads = receipts on the
         ledger, parked = frozen vault collections, identity = the entry routes); the
         month rail is the coordinate — position, not scroll
  house  dark #080a0b / #edf0ed, orange #e87548, max-width 1000px, monospace, 12px,
         one tap per row, noindex — the /recovery/ vault's own language

REGENERATE (run from anywhere; the script resolves its own repo root)
  python3 scripts/build-archive-timeline.py
  python3 scripts/build-archive-timeline.py --check   # drift check: byte-compare against
                                                      # the committed page, stamp excluded
py3.9-safe · stdlib only.
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timedelta, timezone

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE_DIR = os.path.join(REPO, "recovery", "timeline")
OUT_HTML = os.path.join(PAGE_DIR, "index.html")
OUT_JSON = os.path.join(PAGE_DIR, "data.json")
OUT_TSV = os.path.join(PAGE_DIR, "media-manifest.tsv")

RETURNS_DIR = os.path.join(REPO, "returns")
RECOVERY_DIR = os.path.join(REPO, "recovery")
SITE_MANIFEST = os.path.join(REPO, "showcase-manifest.json")

MEDIA_MANIFEST = os.path.expanduser("~/void-anchor/ai-media/consolidated/MANIFEST.tsv")
MEDIA_INVENTORY = os.path.expanduser(
    "~/void-anchor/AXIS/work/media-consolidate-2026-10-22/INVENTORY.md")

ROUTE_HREF = "/recovery/timeline/"
PAGE_ROUTE_DIR = "recovery/timeline"   # repo-relative, for relative hrefs on the page
TZ = timezone(timedelta(hours=8))      # house stamps are canonical +08:00

DATE_RE = re.compile(r"(20\d{2})[-_]?(\d{2})[-_]?(\d{2})")
MONTHS = {"01": "JANUARY", "02": "FEBRUARY", "03": "MARCH", "04": "APRIL",
          "05": "MAY", "06": "JUNE", "07": "JULY", "08": "AUGUST",
          "09": "SEPTEMBER", "10": "OCTOBER", "11": "NOVEMBER", "12": "DECEMBER"}


def esc(s) -> str:
    return html.escape(str(s if s is not None else ""), quote=True)


def human(n: int) -> str:
    """House units: binary steps, GB/MB labels (913 MB == 912.9 MiB, as the
    inventory writes it). >=100 rounds to whole units so a phone row stays short."""
    n = int(n)
    if n < 1024:
        return "%d B" % n
    if n < 1024 ** 2:
        return "%.1f KB" % (n / 1024.0)
    if n < 1024 ** 3:
        mb = n / float(1024 ** 2)
        return ("%d MB" % round(mb)) if mb >= 100 else ("%.1f MB" % mb)
    gb = n / float(1024 ** 3)
    return "%.2f GB" % gb


def tidy(text, hi: int = 8, lo: int = 3):
    """Collapse whitespace, cut at `hi` words on a word boundary, drop a dangling
    delimiter. Returns None when the text is too thin to be a note (>= lo words)."""
    if text is None:
        return None
    t = re.sub(r"\s+", " ", str(text)).strip().replace("`", "")  # markdown noise is not a note
    if not t:
        return None
    w = t.split(" ")
    if len(w) > hi:
        t = " ".join(w[:hi])
    t = t.rstrip(":;,-·/")
    if len(t.split(" ")) < lo:
        return None
    return t


def first_str(v, depth: int = 0):
    """First string anywhere in a value: str | [str,...] | {..}. Receipt schemas
    disagree on shape, so one walker answers 'what did this receipt say?' once."""
    if depth > 3:
        return None
    if isinstance(v, str):
        return v
    if isinstance(v, (list, tuple)):
        for item in v:
            got = first_str(item, depth + 1)
            if got:
                return got
        return None
    if isinstance(v, dict):
        for item in v.values():
            got = first_str(item, depth + 1)
            if got:
                return got
    return None


def enumish(s):
    """EXACT_BYTE_VERIFIED_REPO_MIRROR -> 'exact byte verified repo mirror'."""
    if not isinstance(s, str):
        return None
    if "_" in s and re.fullmatch(r"[A-Za-z0-9_\-/:.+ ]+", s):
        return re.sub(r"[_\-/]+", " ", s).strip()
    return s


def git_dates(*relpaths):
    """(first, last) commit dates touching a repo-relative path. Real chronology,
    read from git rather than a timestamp someone hand-maintained."""
    args = ["git", "-C", REPO, "log", "--reverse", "--format=%ad", "--date=short",
            "--"] + [p for p in relpaths if p]
    try:
        out = subprocess.run(args, capture_output=True, text=True, timeout=30)
    except Exception:
        return None, None
    lines = [l.strip() for l in out.stdout.splitlines() if l.strip()]
    return (lines[0], lines[-1]) if lines else (None, None)


def relhref(target: str) -> str:
    """Canonical route -> relative href, so the page works over file:// and http
    alike (the vault's own pages are relative for the same reason)."""
    t = target.strip("/")
    rel = os.path.relpath(t if t else ".", PAGE_ROUTE_DIR)
    if target.endswith("/") and not rel.endswith(os.sep):
        rel += "/"
    if rel == ".":
        rel = "./"
    return rel.replace(os.sep, "/")


# --------------------------------------------------------------------------
# source 1 — the consolidated media pass (recomputed from the sha column)
# --------------------------------------------------------------------------

def collect_media(warn):
    if not os.path.exists(MEDIA_MANIFEST):
        warn("media manifest missing: %s" % MEDIA_MANIFEST)
        return []
    homes = {}
    size_by_sha = {}
    total_files = total_bytes = 0
    with open(MEDIA_MANIFEST, "r", encoding="utf-8") as fh:
        for i, line in enumerate(fh):
            line = line.rstrip("\n")
            if not line or (i == 0 and line.startswith("path|")):
                continue
            parts = line.split("|")
            if len(parts) < 4:
                continue
            try:
                size = int(parts[1])
            except ValueError:
                continue
            sha = parts[2]
            origin = parts[3]
            home = origin.split("/ai-media/consolidated/")[-1].split("/")[0] or "other"
            h = homes.setdefault(home, {"files": 0, "bytes": 0, "shas": {}})
            h["files"] += 1
            h["bytes"] += size
            h["shas"][sha] = h["shas"].get(sha, 0) + 1
            size_by_sha[sha] = size
            total_files += 1
            total_bytes += size

    date = "2026-10-22"
    if os.path.exists(MEDIA_INVENTORY):
        try:
            head = open(MEDIA_INVENTORY, "r", encoding="utf-8").read(400)
            m = re.search(r"^created:\s*(20\d{2}-\d{2}-\d{2})", head, re.M)
            if m:
                date = m.group(1)
        except Exception:
            pass

    entries = []
    manifest_rel = ROUTE_HREF + "media-manifest.tsv"
    entries.append(dict(
        date=date, kind="media", name="consolidated media",
        note="one hardlink per unique hash across homes",
        count="%s files · %s" % (format(total_files, ","), human(total_bytes)),
        files=total_files, bytes=total_bytes, href=manifest_rel, go="MANIFEST →"))

    for home in sorted(homes):
        h = homes[home]
        clusters = sum(1 for c in h["shas"].values() if c > 1)
        entries.append(dict(
            date=date, kind="media", name=home,
            note="%d unique hashes, %d duplicate clusters" % (len(h["shas"]), clusters),
            count="%s files · %s" % (format(h["files"], ","), human(h["bytes"])),
            files=h["files"], bytes=h["bytes"], href=manifest_rel, go="MANIFEST →"))

    # dedupe clusters, per home (the pass never merged across homes — the note says so)
    n_clusters = 0
    redundant = 0
    files_in = 0
    for h in homes.values():
        for sha, c in h["shas"].items():
            if c > 1:
                n_clusters += 1
                files_in += c
                redundant += (c - 1) * size_by_sha.get(sha, 0)
    entries.append(dict(
        date=date, kind="media", name="dedupe clusters",
        note="duplicate groups collapsed within each home",
        count="%d clusters · %s" % (n_clusters, human(redundant)),
        files=files_in, bytes=redundant, href=manifest_rel, go="MANIFEST →"))

    os.makedirs(PAGE_DIR, exist_ok=True)
    shutil.copyfile(MEDIA_MANIFEST, OUT_TSV)
    return entries


# --------------------------------------------------------------------------
# source 2 — the frozen vault collections
# --------------------------------------------------------------------------

VAULT_NOTE_KEYS = ("status", "state", "object", "purpose", "reason",
                   "classification", "recovery_class", "title", "summary")


def _walk_depth(root, max_depth=99):
    """Every file under a collection, sorted (shallow first, then name). Depth is
    bounded only against a runaway symlink; counts and taps both read this list,
    so what the row counts is exactly what the tap can reach."""
    out = []
    root = root.rstrip(os.sep)
    base_depth = root.count(os.sep)
    for dirpath, dirnames, filenames in os.walk(root):
        if dirpath.count(os.sep) - base_depth > max_depth:
            dirnames[:] = []
            continue
        for f in sorted(filenames):
            out.append(os.path.join(dirpath, f))
    return out


def vault_target(d):
    """One tap that resolves: index.html -> the route; otherwise the collection's
    own receipt/manifest/doc file. Never a directory listing (static hosts 404)."""
    root = os.path.join(RECOVERY_DIR, d)
    files = _walk_depth(root)
    if os.path.exists(os.path.join(root, "index.html")):
        return "/recovery/%s/" % d, "OPEN →"
    prefs = ("RECOVERY.json", "manifest.json", "PRESERVATION.json", "status.json")
    for pref in prefs:
        for f in files:
            if os.path.basename(f).lower() == pref.lower():
                rel = os.path.relpath(f, REPO).replace(os.sep, "/")
                return "/" + rel, "RECEIPT →"
    for f in files:
        if f.endswith(".json"):
            return "/" + os.path.relpath(f, REPO).replace(os.sep, "/"), "RECEIPT →"
    for f in files:
        if f.endswith(".html"):
            rel = os.path.relpath(f, REPO).replace(os.sep, "/")
            return "/" + rel, "OPEN →"
    for f in files:
        if f.endswith(".md"):
            return "/" + os.path.relpath(f, REPO).replace(os.sep, "/"), "RECEIPT →"
    return "/recovery/", "OPEN →"


def vault_note(d, routes, warn):
    """Note from the collection's own authority, in order: registered route.role
    (what the manifest says this is) -> its RECOVERY/manifest json -> its first
    document heading -> a plain fallback that says so."""
    r = routes.get("/recovery/%s/" % d)
    if isinstance(r, dict):
        got = tidy(r.get("role"))
        if got:
            return got, "manifest"
    root = os.path.join(RECOVERY_DIR, d)
    files = _walk_depth(root)
    receipt = [f for f in files
               if os.path.basename(f).lower() in
               ("recovery.json", "manifest.json", "preservation.json", "status.json")]
    for f in receipt + [f for f in files if f.endswith(".json")]:
        try:
            j = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        if isinstance(j, dict):
            for k in VAULT_NOTE_KEYS:
                got = tidy(enumish(first_str(j.get(k))) if j.get(k) is not None else None)
                if got:
                    return got, k
    for f in files:
        if not f.endswith(".md"):
            continue
        try:
            with open(f, encoding="utf-8", errors="replace") as fh:
                scanned = 0
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    scanned += 1
                    if scanned > 25:
                        break
                    if line.startswith("#"):
                        got = tidy(re.sub(r"^#+\s*", "", line).strip("` ").strip())
                        if got:
                            return got, "heading"
                        continue
                    if line.startswith(("-", "|", ">", "*", "`", "```")):
                        continue
                    got = tidy(line)
                    if got:
                        return got, "doc line"
        except Exception:
            continue
    warn("no note source for recovery/%s — fallback used" % d)
    return "vault shelf, files held", "fallback"


def collect_vault(routes, warn):
    entries = []
    for d in sorted(os.listdir(RECOVERY_DIR)):
        p = os.path.join(RECOVERY_DIR, d)
        if not os.path.isdir(p) or d == "timeline":
            continue  # this generator's own output is not an archive collection
        files = _walk_depth(p)
        nbytes = 0
        for f in files:
            try:
                nbytes += os.path.getsize(f)
            except OSError:
                pass
        first, _last = git_dates("recovery/%s" % d)
        if not first:
            m = re.search(r"(20\d{2})(\d{2})(\d{2})", d)
            first = "%s-%s-%s" % m.groups() if m else None
        if not first:
            warn("no date for recovery/%s — skipped" % d)
            continue
        note, _src = vault_note(d, routes, warn)
        href, go = vault_target(d)
        entries.append(dict(
            date=first, kind="vault", name=d, note=note,
            count="%d files · %s" % (len(files), human(nbytes)),
            files=len(files), bytes=nbytes, href=href, go=go))
    return entries


# --------------------------------------------------------------------------
# source 3 — the return ledger
# --------------------------------------------------------------------------

def return_name(path, doc):
    title = doc.get("title") if isinstance(doc, dict) else None
    if isinstance(title, str) and title.strip():
        return re.sub(r"\s+", " ", title).strip()
    stem = os.path.splitext(os.path.basename(path))[0]
    s = DATE_RE.sub(" ", stem)
    s = re.sub(r"[_\-]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s or stem


def return_date(path, doc):
    for key in ("date", "at", "created", "ts"):
        v = doc.get(key) if isinstance(doc, dict) else None
        if isinstance(v, str) and re.match(r"20\d{2}-\d{2}-\d{2}", v):
            return v[:10]
    m = DATE_RE.search(os.path.basename(path))
    if m:
        return "%s-%s-%s" % m.groups()
    first, _ = git_dates("returns/%s" % os.path.basename(path))
    return first


def return_note(doc):
    for key in ("summary", "object", "delta", "result", "operation",
                "status", "state", "next"):
        if isinstance(doc, dict) and doc.get(key) is not None:
            got = tidy(enumish(first_str(doc.get(key))))
            if got:
                return got
    return "return receipt, on the record"


def collect_returns(warn):
    entries = []
    for name in sorted(os.listdir(RETURNS_DIR)):
        if not name.endswith(".json"):
            continue
        path = os.path.join(RETURNS_DIR, name)
        try:
            doc = json.load(open(path, encoding="utf-8"))
        except Exception as e:
            warn("unreadable receipt %s (%s) — skipped" % (name, e))
            continue
        if not isinstance(doc, dict):
            doc = {}
        date = return_date(path, doc)
        if not date:
            warn("no date for returns/%s — skipped" % name)
            continue
        entries.append(dict(
            date=date, kind="return", name=return_name(path, doc),
            note=return_note(doc),
            count=human(os.path.getsize(path)),
            files=1, bytes=os.path.getsize(path),
            href="/returns/%s" % name, go="RECEIPT →"))
    return entries


# --------------------------------------------------------------------------
# render
# --------------------------------------------------------------------------

KIND_ORDER = {"media": 0, "vault": 1, "return": 2}


def group_months(entries):
    months = {}
    for e in entries:
        months.setdefault(e["date"][:7], []).append(e)
    return [months[k] for k in sorted(months, reverse=True)]


def render_rows(entries):
    out = []
    for e in entries:
        out.append(
            '<a class="row" href="%s"><span class="d">%s</span><b>%s</b>'
            '<span class="note">%s</span><span class="ct">%s</span>'
            '<span class="go">%s</span></a>'
            % (esc(relhref(e["href"])), esc(e["date"]), esc(e["name"]),
               esc(e["note"]), esc(e["count"]), esc(e["go"])))
    return "\n".join(out)


def build_page(entries, months_groups, stamp, seed, threads, parked, counts):
    rail = []
    blocks = []
    for i, group in enumerate(months_groups):
        month = group[0]["date"][:7]
        y, m = month.split("-")
        kc = {"media": 0, "vault": 0, "return": 0}
        for e in group:
            kc[e["kind"]] += 1
        breakdown = " · ".join("%d %s" % (kc[k], k) for k in ("media", "vault", "return")
                               if kc[k])
        rail.append('<a class="chip" href="#m-%s" data-m="m-%s"><b>%s</b> %d</a>'
                    % (month, month, month, len(group)))
        blocks.append(
            '<details class="m" id="m-%s"%s><summary class="head"><span><b>%s</b> '
            '%s · %d entries%s</span></summary>%s</details>'
            % (month, " open" if i == 0 else "", month, MONTHS[m] + " " + y,
               len(group), (" · " + breakdown) if breakdown else "",
               render_rows(group)))

    counts_line = ("%d entries · %d months · %d returns · %d vault collections · "
                   "%d media artifacts"
                   % (counts["entries"], counts["months"], counts["by_kind"]["return"],
                      counts["by_kind"]["vault"], counts["by_kind"]["media"]))
    footer = ("generated %s &middot; the spine is a projection of the archive &mdash; "
              "regenerate: <code>python3 scripts/build-archive-timeline.py</code> &middot; sources: "
              "<code>returns/</code> (%d receipts) &middot; <code>recovery/</code> "
              "(%d collections) &middot; consolidated media MANIFEST.tsv (%s rows) "
              "&middot; identity <span id=\"ident\">&mdash;</span>"
              % (stamp, counts["by_kind"]["return"], counts["by_kind"]["vault"],
                 format(counts["media_rows"], ",")))

    page = PAGE_TEMPLATE
    page = page.replace("__SUB__", esc(counts_line))
    page = page.replace("__RAIL__", "\n".join(rail))
    page = page.replace("__MONTHS__", "\n".join(blocks))
    page = page.replace("__FOOTER__", footer)
    page = page.replace("__SEED__", json.dumps(seed))
    page = page.replace("__THREADS__", str(threads))
    page = page.replace("__PARKED__", str(parked))
    page = page.replace("__GENERATED__", esc(stamp))
    return page


def build(check=False):
    warnings = []

    def warn(msg):
        warnings.append(msg)
        print("  warn: %s" % msg, file=sys.stderr)

    try:
        routes = {r.get("href"): r for r in json.load(open(SITE_MANIFEST)).get("routes", [])}
    except Exception as e:
        routes = {}
        warn("showcase-manifest unreadable (%s) — vault notes fall back" % e)

    entries = []
    entries += collect_media(warn)
    media_rows = len(entries)
    entries += collect_vault(routes, warn)
    entries += collect_returns(warn)

    # newest first; within a day: media -> vault -> return, then name (stable sorts)
    entries.sort(key=lambda e: (KIND_ORDER.get(e["kind"], 9), e["name"].lower()))
    entries.sort(key=lambda e: e["date"], reverse=True)

    # every tap must land: assert each href resolves to a file in this repo
    missing = []
    for e in entries:
        rel = e["href"].lstrip("/")
        if not os.path.exists(os.path.join(REPO, rel)):
            missing.append(e["href"])
    if missing:
        print("REFUSED: %d row tap target(s) do not exist: %s"
              % (len(missing), missing[:6]), file=sys.stderr)
        return 1

    months_groups = group_months(entries)
    counts = {"entries": len(entries), "months": len(months_groups),
              "media_rows": media_rows,
              "by_kind": {k: sum(1 for e in entries if e["kind"] == k)
                          for k in ("media", "vault", "return")}}

    now = datetime.now(TZ).replace(microsecond=0)
    stamp = now.isoformat()
    if check:
        try:
            stamp = json.load(open(OUT_JSON))["generated_at"]
        except Exception:
            print("REFUSED: --check needs the committed page to compare against",
                  file=sys.stderr)
            return 1

    # identity seed = this page's own entry route list (P2: pure function of content)
    seed = ROUTE_HREF + "|" + "|".join(e["href"] for e in entries)
    threads = counts["by_kind"]["return"]     # measured: receipts on the ledger
    parked = counts["by_kind"]["vault"]       # measured: frozen vault collections

    page = build_page(entries, months_groups, stamp, seed, threads, parked, counts)

    data = {
        "schema": "archive-timeline/v0.1",
        "route": ROUTE_HREF,
        "generated_at": stamp,
        "generator": "scripts/build-archive-timeline.py",
        "sources": {
            "returns": "returns/*.json",
            "vault": "recovery/*/",
            "media_manifest": MEDIA_MANIFEST,
            "media_inventory": MEDIA_INVENTORY,
        },
        "counts": counts,
        "months": [
            {"month": g[0]["date"][:7],
             "label": "%s %s" % (MONTHS[g[0]["date"][5:7]], g[0]["date"][:4]),
             "entries": len(g),
             "by_kind": {k: sum(1 for e in g if e["kind"] == k)
                         for k in ("media", "vault", "return")}}
            for g in months_groups
        ],
        "entries": [
            {"date": e["date"], "month": e["date"][:7], "kind": e["kind"],
             "name": e["name"], "note": e["note"], "count": e["count"],
             "files": e["files"], "bytes": e["bytes"], "href": e["href"]}
            for e in entries
        ],
    }
    json_out = json.dumps(data, ensure_ascii=False, indent=1) + "\n"

    if check:
        problems = []
        for path, fresh, label in ((OUT_HTML, page, "index.html"),
                                   (OUT_JSON, json_out, "data.json")):
            try:
                disk = open(path, encoding="utf-8").read()
            except OSError:
                problems.append("%s missing" % label)
                continue
            if label == "data.json":
                try:
                    disk_stamp = json.loads(disk)["generated_at"]
                    disk = disk.replace(disk_stamp, "@STAMP@")
                    fresh = fresh.replace(stamp, "@STAMP@")
                except Exception:
                    pass
            else:
                disk = re.sub(r"generated \d{4}-\d{2}-\d{2}T[0-9:+\-]+", "generated @STAMP@", disk)
                fresh = re.sub(r"generated \d{4}-\d{2}-\d{2}T[0-9:+\-]+", "generated @STAMP@", fresh)
            if disk != fresh:
                problems.append("%s differs from a fresh build" % label)
        if problems:
            for p in problems:
                print("DRIFT: %s" % p, file=sys.stderr)
            return 1
        print("build-archive-timeline --check: clean (%d entries, %d months, no drift)"
              % (counts["entries"], counts["months"]))
        return 0

    os.makedirs(PAGE_DIR, exist_ok=True)
    with open(OUT_HTML, "w", encoding="utf-8") as fh:
        fh.write(page)
    with open(OUT_JSON, "w", encoding="utf-8") as fh:
        fh.write(json_out)

    print("build-archive-timeline: %d entries (%d returns / %d vault / %d media) "
          "over %d month(s) -> recovery/timeline/index.html + data.json + "
          "media-manifest.tsv (%s)"
          % (counts["entries"], counts["by_kind"]["return"], counts["by_kind"]["vault"],
             counts["by_kind"]["media"], counts["months"], stamp))
    return 0


PAGE_TEMPLATE = """<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#080a0b">
<title>ARCHIVE SPINE — work done over time</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;background:#080a0b;color:#edf0ed;font:12px/1.5 ui-monospace,monospace;padding:28px 14px}
main{max-width:1000px;margin:auto;position:relative;z-index:1}
#weave{position:fixed;inset:0;z-index:0;pointer-events:none}
h1{font:850 clamp(48px,10vw,96px)/.8 system-ui;letter-spacing:-.075em;margin:16px 0 14px}
h1:focus-visible{outline:1px solid #e87548;outline-offset:6px}
.ey{color:#e87548;letter-spacing:.18em;font-size:9px}
.sub{color:#899499;font-size:10px;letter-spacing:.06em;margin:0 0 8px}
.law{color:#6f7b80;font-size:9.5px;letter-spacing:.04em;line-height:1.75;margin:0 0 16px;max-width:680px}
.rail{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 4px}
.chip{display:flex;align-items:center;gap:7px;min-height:36px;padding:7px 11px;border:1px solid #30383c;color:#8ccdf2;text-decoration:none;font-size:10px;letter-spacing:.08em}
.chip b{color:#edf0ed}
.chip:active{background:#11161a}
details.m{margin-top:20px}
summary.head{display:flex;justify-content:space-between;gap:12px;align-items:baseline;cursor:pointer;list-style:none;min-height:34px;padding:9px 5px;border-top:1px solid #30383c;color:#899499;letter-spacing:.12em;font-size:9px}
summary.head::-webkit-details-marker{display:none}
summary.head::after{content:"\\25B8";color:#e87548;font-size:11px}
details[open]>summary.head::after{content:"\\25BE"}
summary.head b{color:#edf0ed;font-size:11px;letter-spacing:.1em;margin-right:6px}
.row{display:grid;grid-template-columns:72px minmax(140px,1fr) 2fr auto auto;grid-template-areas:"d n note ct g";gap:12px;padding:13px 5px;border-top:1px solid #30383c;align-items:start;color:inherit;text-decoration:none}
details.m a.row:last-of-type{border-bottom:1px solid #30383c}
.row b{grid-area:n;font:750 17px system-ui;overflow-wrap:anywhere}
.d{grid-area:d;color:#899499;font-size:9.5px;letter-spacing:.05em;padding-top:4px}
.note{grid-area:note;color:#9ca7ab;overflow-wrap:anywhere}
.ct{grid-area:ct;color:#9ca7ab;white-space:nowrap;text-align:right;padding-top:2px}
.go{grid-area:g;color:#8ccdf2;white-space:nowrap;padding-top:2px}
.row:active{background:#11161a}
.links{color:#899499;font-size:11px;margin:30px 0 0}
.links a{color:#8ccdf2}
footer{color:#6f7b80;font-size:10px;margin-top:16px;line-height:1.9;max-width:780px}
code{font:10px ui-monospace,monospace;color:#9ca7ab}
@media(max-width:700px){
  body{padding:20px 10px}
  .row{grid-template-columns:64px 1fr auto;grid-template-areas:"d n g" "note note ct";gap:4px 10px;padding:11px 4px}
  .ct{text-align:right}
  .note{font-size:11px}
}
</style>
<div id="weave" aria-hidden="true"></div>
<main>
<div class="ey">WORK DONE OVER TIME &middot; NEWEST FIRST &middot; TAP IN</div>
<h1 tabindex="0">ARCHIVE<br>SPINE</h1>
<p class="sub">__SUB__</p>
<p class="law">the moir&eacute; is measured, not decoration &mdash; <b>threads</b> = ledger receipts
&middot; <b>parked</b> = frozen vault collections &middot; <b>identity</b> = this page&rsquo;s entry
routes. quiet at rest; tap the title to reveal it.</p>
<nav class="rail" aria-label="month coordinates">__RAIL__</nav>
__MONTHS__
<p class="links"><a href="../">RECOVERY VAULT</a> &middot; <a href="../../">FIELD INDEX</a>
&middot; <a href="data.json">data.json</a> &middot; <a href="media-manifest.tsv">media manifest</a></p>
<footer>__FOOTER__</footer>
</main>
<script src="../../lib/moire-ambient.js"></script>
<script>
(function(){
  var rail=document.querySelectorAll('.rail .chip');
  for(var i=0;i<rail.length;i++){(function(c){
    c.addEventListener('click',function(ev){
      var d=document.getElementById(c.getAttribute('data-m'));
      if(d){ev.preventDefault();d.open=true;d.scrollIntoView({block:'start'});}
    });
    c.addEventListener('focus',function(){if(window.__spineWeave)window.__spineWeave.reveal();});
    c.addEventListener('blur',function(){if(window.__spineWeave)window.__spineWeave.release();});
  })(rail[i]);}
  if(!window.MoireAmbient) return;
  try{
    var seed=__SEED__;
    var idl=MoireAmbient.identity(seed);
    var layers=MoireAmbient.fromState({
      threads:__THREADS__,
      parked:__PARKED__,
      custom:idl
    });
    var w=MoireAmbient.mount(document.getElementById('weave'),layers,{pad:'#080a0b'});
    window.__spineWeave=w;
    var ident=document.getElementById('ident');
    if(ident&&idl.length){ident.textContent=idl[0].value;}
    var h1=document.querySelector('h1'),rev=false;
    function set(v){rev=!!v;rev?w.reveal():w.release();}
    h1.addEventListener('pointerenter',function(e){if(e.pointerType!=='touch')set(true);});
    h1.addEventListener('pointerleave',function(){set(false);});
    h1.addEventListener('pointerdown',function(e){if(e.pointerType==='touch')set(!rev);});
    h1.addEventListener('focus',function(){set(true);});
    h1.addEventListener('blur',function(){set(false);});
  }catch(e){}
})();
</script>
<!-- generated __GENERATED__ by scripts/build-archive-timeline.py -->
"""


def main() -> int:
    ap = argparse.ArgumentParser(description="build /recovery/timeline/ from the archive")
    ap.add_argument("--check", action="store_true",
                    help="compare a fresh build against the committed page (stamp excluded)")
    a = ap.parse_args()
    return build(check=a.check)


if __name__ == "__main__":
    sys.exit(main())
