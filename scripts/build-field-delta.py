#!/usr/bin/env python3
"""build-field-delta.py — regenerate /field/ as the house's one change instrument.

WHY THIS EXISTS
---------------
The operator asked: "make it useful so I can see what changed". The FIELD INDEX
root already drew a glyph field and hid a GitHub-API commit list behind a fold;
/field/ was a hand-typed four-card hub of links. Neither answered the question.
A change ledger that must be hand-updated is the failure class this replaces:
the page is a regenerable projection of five local records, so it cannot rot.

SOURCES (read-only, local files only — no network at build time)
  git log origin/master            commits in the last 72h (machine refreshes collapse)
  ~/sovereign-node/corpus/calls/answers.jsonl    operator answers (last line per id wins)
  ~/void-anchor/AXIS/work/ops/runs.jsonl         job runs (job | exit | duration)
  returns/*.json                   the return ledger (timestamp inside each record)
  showcase-manifest.json           routes whose index.updated_at moved

OUTPUT (both committed)
  field/index.html   server-rendered ledger: LAST 24H, then EARLIER 24-72H folded
  field/data.json    machine-readable projection of the same rows

LAW
  - measured, not seeded: every row is a real record; nothing is inferred.
  - one scale: time only. No counts-as-marks, no priority, no ranking.
  - quiet: hairlines, pad rgb(8,12,18), lines rgb(79,87,96); the moire weave is
    identity only (P1/P2/P3) and stays under the content.
  - a source with nothing in the window SAYS SO, with its last known row — an
    empty result names its own scope.

MODES
  python3 scripts/build-field-delta.py            # write both files
  python3 scripts/build-field-delta.py --check    # drift gate: exit 1 if stale
  python3 scripts/build-field-delta.py --hours 48 # window override (default 24)

py3.9-safe · stdlib only · run from anywhere (paths resolve from this file).
"""
from __future__ import annotations

import hashlib
import html
import json
import os
import re
import subprocess
import sys
from string import Template
from datetime import datetime, timedelta, timezone

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_HTML = os.path.join(REPO, "field", "index.html")
OUT_JSON = os.path.join(REPO, "field", "data.json")
MANIFEST = os.path.join(REPO, "showcase-manifest.json")
RETURNS = os.path.join(REPO, "returns")
RUNS = os.path.expanduser("~/void-anchor/AXIS/work/ops/runs.jsonl")
ANSWERS = os.path.expanduser("~/sovereign-node/corpus/calls/answers.jsonl")
GITHUB = "https://github.com/0xxx0/0xxx0.github.io"

TZ = timezone(timedelta(hours=8))
DEFAULT_WINDOW = 24
EARLIER_H = 72
STALE_H = 36          # the projection may be a day old; past 36h the gate goes red
CAP = 60

# machine refresh commits: generated clockwork, not authored change. The root's
# own chronology already learned this lesson ("not a second activity feed").
MACHINE = re.compile(
    r"^(nexus|comms|desk|convergence|fi-mutation-contract):"
    r"|^calls: refresh"
    r"|\(auto \u2014",
    re.I,
)

KIND_GLYPH = {"repo": "\u25b8", "route": "\u25c7", "call": "\u25c8", "run": "\u21bb", "return": "\u21a9"}
KIND_WORD = {"repo": "repo", "route": "route", "call": "call", "run": "run", "return": "return"}


def esc(s) -> str:
    return html.escape(str(s if s is not None else ""), quote=True)


def parse_ts(raw):
    """ISO stamp -> aware datetime in house +08. Naive stamps are house time."""
    if not raw:
        return None
    s = str(raw).strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        d = datetime.fromisoformat(s)
    except Exception:
        return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=TZ)
    return d.astimezone(TZ)


def hhmm(d):
    return d.strftime("%H:%M")


def daystamp(d, now):
    return d.strftime("%H:%M") if d.date() == now.date() else d.strftime("%m-%d %H:%M")


# ---------------------------------------------------------------- sources


def theme_of(subject):
    """The workstream a commit belongs to — the prefix the author already wrote.
    FIELD: ... / SLEEPER — ... / fix(field): ... all resolve to one lane name.
    A subject with no prefix is its own lane ('repo')."""
    s = str(subject or "").strip()
    m = re.match(r"^([A-Z][A-Z0-9 /&.\-]{1,20}):", s)
    if m:
        return m.group(1).strip().split(" ")[0]
    m = re.match(r"^([A-Z][A-Z0-9 /&.\-]{1,20}) \u2014", s)
    if m:
        return m.group(1).strip().split(" ")[0]
    m = re.match(r"^(fix|feat|chore)\(([^)]{1,24})\)", s, re.I)
    if m:
        return "%s(%s)" % (m.group(1).lower(), m.group(2))
    return "repo · other"


def read_git(now, since_h):
    cut = now - timedelta(hours=since_h)
    try:
        out = subprocess.run(
            ["git", "-C", REPO, "log", "origin/master",
             "--since=%s" % cut.strftime("%Y-%m-%dT%H:%M:%S%z"),
             "--format=%H%x1f%cI%x1f%s"],
            capture_output=True, text=True, timeout=60,
        )
    except Exception as e:
        return [], "git unavailable: %s" % e
    if out.returncode != 0:
        return [], (out.stderr or "git log failed").strip().splitlines()[-1][:120]
    rows = []
    for line in out.stdout.splitlines():
        parts = line.split("\x1f")
        if len(parts) < 3:
            continue
        sha, ts, subject = parts[0], parts[1], parts[2]
        t = parse_ts(ts)
        if not t:
            continue
        rows.append({
            "t": t, "kind": "repo", "key": "repo:" + sha[:12],
            "title": subject.strip() or "(no subject)",
            "detail": sha[:8],
            "theme": theme_of(subject),
            "href": "%s/commit/%s" % (GITHUB, sha),
            "machine": bool(MACHINE.search(subject.strip())),
        })
    return rows, None


def read_routes(now, since_h):
    try:
        doc = json.load(open(MANIFEST, encoding="utf-8"))
    except Exception as e:
        return [], "manifest unavailable: %s" % e
    cut = now - timedelta(hours=since_h)
    rows = []
    for r in doc.get("routes") or []:
        t = parse_ts((r.get("index") or {}).get("updated_at"))
        if not t or t < cut:
            continue
        href = r.get("href") or ""
        if not href or href == "/field/":
            continue        # the ledger's own recency is its footer clock, not news
        rows.append({
            "t": t, "kind": "route", "key": "route:" + href,
            "title": "%s" % (r.get("title") or href),
            "detail": "%s \u00b7 %s" % (href, r.get("state") or ""),
            "href": href,
        })
    return rows, None


def read_calls(now, since_h):
    if not os.path.exists(ANSWERS):
        return [], "answers.jsonl absent"
    cut = now - timedelta(hours=since_h)
    rows = []
    try:
        fh = open(ANSWERS, encoding="utf-8")
    except Exception as e:
        return [], "answers unreadable: %s" % e
    with fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                a = json.loads(line)
            except Exception:
                continue
            t = parse_ts(a.get("ts"))
            if not t or t < cut:
                continue
            iid = str(a.get("id") or "")
            pick = str(a.get("pick") or "")
            label = str(a.get("pick_label") or "")
            note = str(a.get("note") or "")
            rows.append({
                "t": t, "kind": "call", "key": "call:%s:%s" % (iid, t.isoformat()),
                "title": "%s \u2192 %s%s" % (iid, pick, (" \u00b7 " + label) if label else ""),
                "detail": note or "answered",
                "href": "/calls/#" + iid if iid else "/calls/",
            })
    return rows, None


def read_runs(now, since_h):
    """One row per RUN; grouping happens per window in collapse_runs(), so a
    3-minute cron cannot inflate a 24h count with 72h of clockwork."""
    if not os.path.exists(RUNS):
        return [], "runs.jsonl absent"
    cut = now - timedelta(hours=since_h)
    rows = []
    bad = 0
    try:
        fh = open(RUNS, encoding="utf-8")
    except Exception as e:
        return [], "runs unreadable: %s" % e
    with fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except Exception:
                bad += 1          # known pre-existing concatenated line; count, never crash
                continue
            if not isinstance(r, dict):
                bad += 1
                continue
            t = parse_ts(r.get("start"))
            if not t or t < cut:
                continue
            rows.append({
                "t": t, "kind": "run", "job": str(r.get("job") or "?"),
                "exit": r.get("exit_code"), "dur": r.get("duration_s"),
                "key": "run:%s:%s" % (r.get("job") or "?", t.isoformat()),
            })
    return rows, ("%d unparsable line(s)" % bad) if bad else None


def collapse_runs(rows):
    """job -> one row: count in THIS window, last exit, last duration, last 5 runs."""
    jobs = {}
    for r in rows:
        jobs.setdefault(r["job"], []).append(r)
    out = []
    for job, rs in jobs.items():
        rs.sort(key=lambda r: r["t"])
        last = rs[-1]
        fails = sum(1 for r in rs if r.get("exit") not in (0, None))
        try:
            dur = float(last.get("dur") or 0)
        except Exception:
            dur = 0.0
        detail = "\u00d7%d \u00b7 " % len(rs)
        detail += ("exit %s" % last.get("exit")) if not fails else ("%d fail%s \u00b7 last exit %s" % (
            fails, "" if fails == 1 else "s", last.get("exit")))
        detail += " \u00b7 %.2fs" % dur
        out.append({
            "t": last["t"], "kind": "run", "key": "run:" + job, "title": job,
            "detail": detail, "href": None, "fails": fails,
            "runs": [
                {"t": x["t"].strftime("%H:%M:%S"), "exit": x.get("exit"), "dur": x.get("dur")}
                for x in rs[-5:][::-1]
            ],
        })
    return out


def read_returns(now, since_h):
    if not os.path.isdir(RETURNS):
        return [], "returns/ absent", None
    cut = now - timedelta(hours=since_h)
    rows, newest = [], None
    for name in os.listdir(RETURNS):
        if not name.endswith(".json"):
            continue
        path = os.path.join(RETURNS, name)
        try:
            doc = json.load(open(path, encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(doc, dict):
            continue
        t = None
        for k in ("created", "created_at", "date", "updated", "logged", "ts"):
            t = parse_ts(doc.get(k))
            if t:
                break
        if not t:
            continue
        if newest is None or t > newest[0]:
            newest = (t, name)
        if t < cut:
            continue
        title = str(doc.get("id") or doc.get("object") or name[:-5]).replace("_", " ")
        rows.append({
            "t": t, "kind": "return", "key": "return:" + name,
            "title": title,
            "detail": str(doc.get("schema") or "return"),
            "href": "/returns/",
        })
    return rows, None, newest


# ---------------------------------------------------------------- assembly


def collect(now, window_h):
    sources = {}
    for name, fn in (("repo", read_git), ("route", read_routes), ("call", read_calls), ("run", read_runs)):
        rows, err = fn(now, EARLIER_H)
        sources[name] = {"rows": rows, "error": err}
    rrows, rerr, newest = read_returns(now, EARLIER_H)
    sources["return"] = {"rows": rrows, "error": rerr, "newest": newest}

    cut_now = now - timedelta(hours=window_h)
    raw_now, raw_earlier = [], []
    for name, src in sources.items():
        for r in src["rows"]:
            (raw_now if r["t"] >= cut_now else raw_earlier).append(r)

    def order(r):
        return (r["t"], {"call": 0, "repo": 1, "route": 2, "run": 3, "return": 4}[r["kind"]])

    def collapse(rows):
        """Three folds, all lossless in state:
        - machine clockwork -> ONE counted row (200 comms/nexus refreshes a day
          are not 200 changes; the count is still stated)
        - authored commits -> ONE row per workstream theme (the commit prefix IS
          the lane: FIELD / SLEEPER / RETURN ...); tap opens the exact commits
        - runs -> ONE row per job (count | fails | last duration); tap opens the
          last five exact runs
        Nothing is dropped: every underlying record stays one tap away."""
        out = []
        machines = [r for r in rows if r["kind"] == "repo" and r.get("machine")]
        repos = [r for r in rows if r["kind"] == "repo" and not r.get("machine")]
        others = [r for r in rows if r["kind"] not in ("repo", "run")]
        out.extend(others)
        out.extend(collapse_runs([r for r in rows if r["kind"] == "run"]))

        themes = {}
        for r in repos:
            themes.setdefault(r.get("theme") or "repo", []).append(r)
        for theme, rs in themes.items():
            rs.sort(key=lambda r: r["t"], reverse=True)
            out.append({
                "t": rs[0]["t"], "kind": "repo", "key": "repo:theme:" + theme,
                "title": theme, "count": len(rs),
                "detail": "last \u00b7 %s" % (rs[0]["title"][:82] + ("\u2026" if len(rs[0]["title"]) > 82 else "")),
                "href": None,
                "commits": [
                    {"t": r["t"].strftime("%d %H:%M"), "title": r["title"],
                     "href": r["href"], "sha": r.get("detail") or ""}
                    for r in rs
                ],
            })

        if machines:
            machines.sort(key=lambda r: r["t"], reverse=True)
            last = machines[0]
            out.append({
                "t": last["t"], "kind": "repo", "key": "repo:machine",
                "title": "machine refresh", "count": len(machines),
                "detail": "\u00d7%d \u00b7 last %s" % (len(machines), last["title"][:70] + ("\u2026" if len(last["title"]) > 70 else "")),
                "href": GITHUB + "/commits/master", "machine": True,
            })
        out.sort(key=order, reverse=True)
        machines_out = [r for r in out if r.get("machine")]
        if machines_out:
            out = [r for r in out if not r.get("machine")] + machines_out
        return out

    counts_now = counts(sources, raw_now)
    counts_earlier = counts(sources, raw_earlier)
    return sources, collapse(raw_now), collapse(raw_earlier), counts_now, counts_earlier


def counts(sources, rows):
    """A run row is a RUN; the ledger counts a JOB once — 479 calltap ticks are
    one changed job, not 479 changes. Failures are counted per job."""
    c = {"repo": 0, "route": 0, "call": 0, "run": 0, "return": 0}
    jobs = {}
    for r in rows:
        if r["kind"] == "run":
            jobs.setdefault(r.get("job") or "?", []).append(r)
        else:
            c[r["kind"]] = c.get(r["kind"], 0) + 1
    c["repo"] = sum(1 for r in rows if r["kind"] == "repo")
    c["run"] = len(jobs)
    c["run_fail"] = sum(1 for rs in jobs.values() if any(x.get("exit") not in (0, None) for x in rs))
    c["repo_field"] = sum(1 for r in rows if r["kind"] == "repo" and not r.get("machine"))
    c["repo_machine"] = sum(1 for r in rows if r["kind"] == "repo" and r.get("machine"))
    return c


def row_html(r, now):
    g = KIND_GLYPH.get(r["kind"], "\u00b7")
    t = esc(daystamp(r["t"], now))
    cls = "r" + (" m" if r.get("machine") else "") + (" bad" if r.get("fails") else "")
    if r["kind"] == "run":
        inner = "".join(
            "<span class=\"eq\">%s \u00b7 exit %s \u00b7 %ss</span>"
            % (esc(x["t"]), esc(x["exit"]), esc(x["dur"]))
            for x in r.get("runs") or []
        )
        return (
            "<details class=\"%s\" data-k=\"run\"><summary class=\"row\">"
            "<time>%s</time><span class=\"g\">%s</span>"
            "<span class=\"t\">%s</span><span class=\"d\">%s</span></summary>"
            "<div class=\"eqs\">%s</div></details>"
            % (cls, t, g, esc(r["title"]), esc(r["detail"]), inner)
        )
    if r.get("commits"):
        inner = "".join(
            "<a class=\"eq\" href=\"%s\">%s \u00b7 %s</a>" % (esc(x["href"]), esc(x["t"]), esc(x["title"]))
            for x in r["commits"]
        )
        return (
            "<details class=\"%s\" data-k=\"repo\"><summary class=\"row\">"
            "<time>%s</time><span class=\"g\">%s</span>"
            "<span class=\"t\">%s</span><span class=\"d\">%s</span></summary>"
            "<div class=\"eqs\">%s</div></details>"
            % (cls, t, g, "%s \u00d7%d" % (esc(r["title"]), r.get("count") or 1),
               esc(r["detail"]), inner)
        )
    title = esc(r["title"])
    body = ("<a class=\"t\" href=\"%s\">%s</a>" % (esc(r["href"]), title)) if r.get("href") else (
        "<span class=\"t\">%s</span>" % title)
    detail = "<span class=\"d\">%s</span>" % esc(r["detail"]) if r.get("detail") else ""
    return (
        "<div class=\"%s\" data-k=\"%s\"><time>%s</time><span class=\"g\">%s</span>%s%s</div>"
        % (cls, r["kind"], t, g, body, detail)
    )


def render(now, window_h, meta, rows_now, rows_earlier, c, ce, gen_stamp):
    n_now = c.get("repo_field", 0) + c.get("route", 0) + c.get("call", 0) + c.get("run", 0) + c.get("return", 0)
    n_machine = c.get("repo_machine", 0)

    seed_src = "|".join(sorted(r["key"] for r in rows_now + rows_earlier))
    seed = hashlib.sha256(("field-delta|" + seed_src).encode("utf-8")).hexdigest()[:16]

    per_source = []
    for k in ("repo_field", "route", "call", "run", "return"):
        label = {"repo_field": "repo", "route": "routes", "call": "calls", "run": "runs", "return": "returns"}[k]
        per_source.append("<span class=\"s\"><b>%d</b> %s</span>" % (c.get(k, 0), label))

    empty_lines = []
    for name, label in (("return", "/returns/"), ("route", None)):
        if not meta.get(name, {}).get("rows"):
            extra = ""
            if name == "return" and meta.get(name, {}).get("newest"):
                nt = meta[name]["newest"][0]
                extra = " \u00b7 last %s" % esc(daystamp(nt, now))
            empty_lines.append(
                "<li><span class=\"s\">%s</span> none in %dh%s</li>"
                % (name, EARLIER_H, extra)
            )

    now_rows = "".join(row_html(r, now) for r in rows_now[:CAP])
    if len(rows_now) > CAP:
        now_rows += "<div class=\"more\">+%d more below the fold \u00b7 <a href=\"%s/commits/master\">ALL COMMITS \u2197</a></div>" % (
            len(rows_now) - CAP, GITHUB)
    earlier_rows = "".join(row_html(r, now) for r in rows_earlier[:CAP])
    if not rows_earlier:
        earlier_rows = "<div class=\"none\">nothing older in the %dh window</div>" % EARLIER_H

    lede = "%dh" % window_h
    return Template(PAGE_TMPL).substitute({
        "seed": esc(seed),
        "gen": esc(gen_stamp),
        "lede": lede,
        "n_now": n_now,
        "n_machine": n_machine,
        "per_source": "".join(per_source),
        "now_rows": now_rows,
        "earlier_rows": earlier_rows,
        "earlier_n": ce.get("repo_field", 0) + ce.get("route", 0) + ce.get("call", 0) + ce.get("run", 0) + ce.get("return", 0),
        "earlier_m": ce.get("repo_machine", 0),
        "empty_lines": "".join(empty_lines),
        "window": str(window_h),
    })


def data_doc(now, window_h, sources, rows_now, rows_earlier, c, ce, gen_stamp):
    def ser(r):
        d = {
            "at": r["t"].isoformat(),
            "kind": r["kind"],
            "key": r["key"],
            "title": r["title"],
            "detail": r.get("detail") or "",
            "href": r.get("href") or "",
        }
        if r.get("count"):
            d["count"] = r["count"]
        if r.get("machine"):
            d["machine"] = True
        if r.get("fails"):
            d["fails"] = r["fails"]
        if r.get("commits"):
            d["commits"] = r["commits"]
        if r.get("runs"):
            d["runs"] = r["runs"]
        return d

    return {
        "schema": "field-delta/v0.1",
        "generated_at": gen_stamp,
        "window_hours": window_h,
        "source_window_hours": EARLIER_H,
        "law": "measured rows only; machine clockwork collapses to one counted row; no priority, no ranking, no second store",
        "sources": {
            k: {
                "rows": len(v["rows"]),
                "error": v.get("error"),
                **({"newest": v["newest"][0].isoformat(), "newest_file": v["newest"][1]}
                   if v.get("newest") else {}),
            }
            for k, v in sources.items()
        },
        "counts": c,
        "counts_earlier": ce,
        "now": [ser(r) for r in rows_now],
        "earlier": [ser(r) for r in rows_earlier],
    }


PAGE_TMPL = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>FIELD \u2014 what changed</title>
<meta name="description" content="One change ledger across the house: repo commits, route recency, operator calls, job runs, returns. Regenerated from local records.">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#080c12">
<style>
  :root{
    color-scheme:dark;
    --pad:rgb(8,12,18); --line:rgb(79,87,96); --ink:#d8d4c8; --mut:#8e897a;
    --dim:#59605b; --hot:#ed7447; --cool:#72bce7; --gold:#d5ad68;
  }
  *{box-sizing:border-box}
  html,body{margin:0;background:var(--pad);color:var(--ink)}
  body{max-width:40rem;margin:0 auto;padding:1.4rem 1.05rem 3.5rem;
       font:15px/1.5 -apple-system,"SF Pro Text",system-ui,sans-serif;
       -webkit-text-size-adjust:100%}
  #weave{position:fixed;inset:0;z-index:0;pointer-events:none}
  body>*{position:relative;z-index:1}
  header{border-bottom:1px solid rgba(79,87,96,.28);padding-bottom:.7rem}
  h1{font:600 1.05rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;
     letter-spacing:.16em;margin:0;display:flex;gap:.5rem;align-items:baseline}
  h1 .d{color:var(--gold);font-size:1.25rem;letter-spacing:0}
  .q{color:var(--mut);font-size:.8rem;margin:.35rem 0 0;letter-spacing:.02em}
  .q b{color:var(--ink);font-weight:600}
  .sum{display:flex;flex-wrap:wrap;gap:.35rem .9rem;align-items:baseline;
       margin:.9rem 0 .2rem;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;
       color:var(--mut)}
  .sum .n{color:var(--ink);font-size:1.5rem;line-height:1;letter-spacing:-.02em}
  .sum .s b{color:var(--ink);font-weight:600}
  .sum .s{white-space:nowrap}
  ol.ledger{list-style:none;margin:.6rem 0 0;padding:0}
  .r,.row{display:grid;grid-template-columns:3.1rem 1.1rem 1fr;gap:.1rem .55rem;
          align-items:baseline;padding:.62rem .1rem;border-bottom:1px solid rgba(79,87,96,.16);
          text-decoration:none;color:inherit;min-height:44px}
  .r time,.row time{font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dim);
                    letter-spacing:.02em}
  .r .g,.row .g{color:var(--mut);font-size:.82rem;text-align:center}
  .r .t,.row .t{color:var(--ink);text-decoration:none;overflow-wrap:anywhere}
  .r a.t{border-bottom:1px solid rgba(79,87,96,.45)}
  .r a.t:active{color:var(--cool)}
  .r .d,.row .d{grid-column:3;color:var(--dim);font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;
                overflow-wrap:anywhere;margin-top:.12rem}
  .r.m{opacity:.55}
  .r.bad .d{color:var(--hot)}
  .r.bad .g{color:var(--hot)}
  details.r{display:block;border-bottom:1px solid rgba(79,87,96,.16)}
  details.r>summary{list-style:none;cursor:pointer}
  details.r>summary::-webkit-details-marker{display:none}
  .eqs{padding:.1rem 0 .5rem 3.75rem}
  .eqs .eq{display:block;font:10px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dim)}
  .more,.none,.empty{font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dim);
                     padding:.7rem .1rem}
  .more a{color:var(--mut)}
  details.earlier{margin:1.2rem 0 0;border-top:1px solid rgba(79,87,96,.28)}
  details.earlier>summary{list-style:none;cursor:pointer;min-height:44px;display:flex;
    align-items:center;gap:.5rem;font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;
    letter-spacing:.1em;color:var(--mut);text-transform:uppercase}
  details.earlier>summary::-webkit-details-marker{display:none}
  details.earlier>summary b{color:var(--ink);font-weight:600}
  .scope{list-style:none;margin:1.1rem 0 0;padding:.6rem 0 0;border-top:1px solid rgba(79,87,96,.16);
         font:11px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dim)}
  .scope .s{color:var(--mut)}
  nav.quiet{display:flex;flex-wrap:wrap;gap:.2rem .9rem;margin:1.6rem 0 0;
            font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}
  nav.quiet a{color:var(--mut);text-decoration:none;border-bottom:1px solid rgba(79,87,96,.35);
              padding:.35rem 0;min-height:44px;display:inline-flex;align-items:center}
  nav.quiet a:active{color:var(--ink)}
  footer{color:var(--dim);font:10px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;
         margin-top:1.8rem;border-top:1px solid rgba(79,87,96,.16);padding-top:.7rem}
  footer code{color:var(--mut)}
  @media (prefers-reduced-motion:reduce){#weave canvas{animation:none}}
</style>
</head>
<body>
<div id="weave" aria-hidden="true" data-seed="${seed}"></div>

<header>
  <h1>FIELD <span class="d">\u0394</span></h1>
  <p class="q">what changed across the house \u00b7 last <b>${lede}</b> \u00b7 one row = one recorded change</p>
</header>

<div class="sum" role="status" aria-label="change counts">
  <span class="n">${n_now}</span>
  <span>field changes</span>
  ${per_source}
</div>

<ol class="ledger">
${now_rows}
</ol>

<details class="earlier">
  <summary>earlier \u00b7 24\u201372h \u00b7 <b>${earlier_n}</b> field \u00b7 ${earlier_m} machine</summary>
  <ol class="ledger">
${earlier_rows}
  </ol>
</details>

<ul class="scope">
${empty_lines}
</ul>

<nav class="quiet" aria-label="field instruments">
  <a href="/">\u2302 INDEX</a>
  <a href="/fovea/">\u25ce LENS</a>
  <a href="/field/moire-route/">\u25b3 MISMATCH</a>
  <a href="/field/axial-probe/">\u25c7 PROBE</a>
  <a href="/returns/">\u21a9 RETURNS</a>
</nav>

<footer>
  generated ${gen} \u00b7 window ${window}h \u00b7 regenerate
  <code>python3 scripts/build-field-delta.py</code> \u00b7 drift gate
  <code>--check</code><br>
  sources: git origin/master \u00b7 answers.jsonl \u00b7 runs.jsonl \u00b7 returns/ \u00b7 showcase-manifest.json
</footer>

<script src="/lib/moire-ambient.js"></script>
<script>
(function(){
  if(!window.MoireAmbient) return;
  try{
    var host=document.getElementById('weave');
    var seed='/field/delta|'+(host.getAttribute('data-seed')||'');
    var rows=document.querySelectorAll('.r,.row').length;
    var layers=MoireAmbient.fromState({threads:Math.max(3,rows),custom:MoireAmbient.identity(seed)});
    var weave=MoireAmbient.mount(host,layers,{});
    var h1=document.querySelector('h1');
    if(h1){
      h1.addEventListener('pointerenter',function(){weave.reveal()});
      h1.addEventListener('pointerleave',function(){weave.release()});
      h1.addEventListener('pointerdown',function(){weave.reveal()});
    }
    document.documentElement.setAttribute('data-weave','mounted:'+MoireAmbient.identity(seed)[0].value);
  }catch(e){document.documentElement.setAttribute('data-weave','error');}
})();
</script>
</body>
</html>
"""


# ---------------------------------------------------------------- main


def build(window_h):
    now = datetime.now(TZ).replace(microsecond=0)
    sources, rows_now, rows_earlier, c, ce = collect(now, window_h)
    gen_stamp = now.isoformat()
    meta = {k: {"rows": len(v["rows"]), "newest": v.get("newest")} for k, v in sources.items()}
    page = render(now, window_h, meta, rows_now, rows_earlier, c, ce, gen_stamp)
    doc = data_doc(now, window_h, sources, rows_now, rows_earlier, c, ce, gen_stamp)
    for k, v in sources.items():
        if v.get("error"):
            print("field-delta: SKIP %s \u2014 %s" % (k, v["error"]), file=sys.stderr)
    return page, doc


def strip_clock(page):
    return re.sub(r"generated [0-9T:+\-\.]+ \u00b7", "generated <clock> \u00b7", page)


def rows_from_doc(doc):
    """Rebuild renderable rows from a committed projection (for --check)."""
    def row(d):
        r = {
            "t": parse_ts(d.get("at")) or datetime.now(TZ),
            "kind": d.get("kind") or "repo",
            "key": d.get("key") or "",
            "title": d.get("title") or "",
            "detail": d.get("detail") or "",
            "href": d.get("href") or None,
        }
        for k in ("count", "machine", "fails", "commits", "runs"):
            if k in d:
                r[k] = d[k]
        return r
    return [row(d) for d in doc.get("now") or []], [row(d) for d in doc.get("earlier") or []]


def check_committed():
    """The anti-rot gate. Three assertions, none of them a clock race:
      1. field/data.json is internally sane (schema, stamps, counts, every row
         addressable and time-ordered).
      2. field/index.html IS the page this data renders to — byte-identical
         apart from the generation clock, so a hand edit or template drift is
         caught instead of shipping.
      3. the projection is younger than STALE_H. A ledger that silently reads
         "now" while being days old is the failure this page exists to end, so
         a dead regenerator turns the gate red."""
    problems = []
    try:
        doc = json.load(open(OUT_JSON, encoding="utf-8"))
    except Exception as e:
        print("field-delta DRIFT: no committed projection (%s)" % e)
        return 1
    if doc.get("schema") != "field-delta/v0.1":
        problems.append("schema %r" % doc.get("schema"))
    gen = parse_ts(doc.get("generated_at"))
    if not gen:
        print("field-delta DRIFT: generated_at missing/unparsable")
        return 1
    age_h = (datetime.now(TZ) - gen).total_seconds() / 3600.0
    if age_h > STALE_H:
        problems.append("projection is %.0fh old (>%dh) — regenerator has not run" % (age_h, STALE_H))

    now_rows, earlier_rows = rows_from_doc(doc)
    for bucket, name in ((now_rows, "now"), (earlier_rows, "earlier")):
        seen = set()
        for r in bucket:
            if not r["key"] or not r["title"]:
                problems.append("%s: row without key/title: %r" % (name, r))
            if r["key"] in seen:
                problems.append("%s: duplicate row key %s" % (name, r["key"]))
            seen.add(r["key"])
        # machine clockwork is deliberately listed last; authored rows stay strictly newest-first
        authored = [r for r in bucket if not r.get("machine")]
        for a, b in zip(authored, authored[1:]):
            if b["t"] > a["t"]:
                problems.append("%s: rows out of order at %s" % (name, b["key"]))
                break

    c = doc.get("counts") or {}
    for k in ("repo_field", "route", "call", "run", "return", "repo_machine"):
        if k not in c:
            problems.append("counts missing %s" % k)

    meta = {}
    for k, v in (doc.get("sources") or {}).items():
        newest = None
        if v.get("newest"):
            nt = parse_ts(v["newest"])
            if nt:
                newest = (nt, v.get("newest_file") or "")
        meta[k] = {"rows": int(v.get("rows") or 0), "newest": newest}

    page = render(gen, int(doc.get("window_hours") or DEFAULT_WINDOW), meta,
                  now_rows, earlier_rows, doc.get("counts") or {},
                  doc.get("counts_earlier") or {}, doc.get("generated_at") or "")
    try:
        old_html = open(OUT_HTML, encoding="utf-8").read()
    except Exception:
        old_html = ""
    if strip_clock(old_html) != strip_clock(page):
        problems.append("field/index.html is not the render of field/data.json (template drift or hand edit)")

    if problems:
        print("field-delta DRIFT — regenerate: python3 scripts/build-field-delta.py")
        for p in problems[:40]:
            print("  " + p)
        return 1
    print("field-delta: no drift — %d rows, projection %.1fh old, page == data" % (
        len(now_rows) + len(earlier_rows), age_h))
    return 0


def main(argv):
    check = "--check" in argv
    window_h = DEFAULT_WINDOW
    if "--hours" in argv:
        i = argv.index("--hours")
        try:
            window_h = max(1, min(168, int(argv[i + 1])))
        except Exception:
            print("build-field-delta: --hours needs an integer", file=sys.stderr)
            return 2

    if check:
        return check_committed()

    page, doc = build(window_h)
    os.makedirs(os.path.dirname(OUT_HTML), exist_ok=True)
    with open(OUT_HTML, "w", encoding="utf-8") as fh:
        fh.write(page)
    with open(OUT_JSON, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=1)
        fh.write("\n")
    c = doc["counts"]
    print("field-delta: %d in %dh (%d field / %d machine) + %d earlier -> field/index.html + field/data.json" % (
        len(doc["now"]), window_h, c.get("repo_field", 0) + c["route"] + c["call"] + c["run"] + c["return"],
        c.get("repo_machine", 0), len(doc["earlier"])))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
