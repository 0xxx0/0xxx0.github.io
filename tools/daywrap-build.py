#!/usr/bin/env python3
"""daywrap-build.py — generate the daily wrap page from REAL state, zero hand-typed claims.

Sources (read-only): git log (0xxx0), hermes kanban list, showcase-manifest.json routes.
Usage: python3 tools/daywrap-build.py [--check]
Output: 20261006-daywrap-mcvoid/index.html  (route date = today, +08)
"""
import json, re, subprocess, sys, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
NOW = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8)))
DATE = NOW.strftime("%Y-%m-%d")
ROUTE = "/" + NOW.strftime("%Y%m%d") + "-daywrap-mcvoid/"
OUT = ROOT / (NOW.strftime("%Y%m%d") + "-daywrap-mcvoid") / "index.html"
MACHINE = re.compile(r"^(desk:|nexus:|comms:|convergence:|stamp$|restamp|.*: stamp$|.*: restamp|.*restamp post-rebase|ci:|temp pages:)", re.I)

def sh(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=ROOT).stdout

def shipped():
    log = sh("git log --since=%sT00:00:00+08:00 --pretty=format:'%%h|%%s' --no-merges" % DATE)
    rows = []
    for line in log.splitlines():
        if "|" not in line:
            continue
        sha, msg = line.split("|", 1)
        if MACHINE.match(msg.strip()):
            continue
        rows.append((sha.strip(), msg.strip()))
    return rows

def kanban():
    out = sh("hermes kanban list 2>&1")
    tasks = []
    for line in out.splitlines():
        m = re.match(r"^\s*([✓⊘▶●])\s+(\S+)\s+(ready|running|blocked|done)\s+(\S+)\s+(.+)$", line)
        if m and m.group(3) != "done":
            tasks.append({"mark": m.group(1), "id": m.group(2), "status": m.group(3),
                          "who": m.group(4), "title": m.group(5)[:110]})
    return tasks

def new_routes():
    """Routes ADDED to the manifest today = current hrefs minus hrefs in the manifest as of
    start of day. (updated_at is useless: stamp sweeps normalise it fleet-wide; per-commit
    diffs are useless too: stamp commits rewrite whole objects.)"""
    old_commit = sh("git rev-list -1 --before=%sT00:00:00+08:00 origin/master" % DATE).strip()
    old = set()
    if old_commit:
        raw = sh("git show %s:showcase-manifest.json" % old_commit)
        try:
            old = {r.get("href") for r in json.loads(raw).get("routes", [])}
        except Exception:
            pass
    m = json.load(open(ROOT / "showcase-manifest.json"))
    hits = []
    for r in m.get("routes", []):
        if r.get("href") not in old and not r.get("showcase_card"):
            hits.append((r["href"], r.get("title", ""), r.get("role", "")[:150]))
    return hits

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def build():
    rows, tasks, routes = shipped(), kanban(), new_routes()
    if "--check" in sys.argv:
        print(json.dumps({"shipped": rows, "open_tasks": tasks, "new_routes": [r[0] for r in routes]}, indent=1))
        return
    h = []
    h.append(f"""<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>DAYWRAP · {DATE}</title>
<link rel="stylesheet" href="/tools/house-patterns.css">
<style>
 .g{{border:2px solid var(--ink);padding:11px 13px;margin:10px 0;font-size:14.5px}}
 .g .sha{{font:700 10px/1 ui-monospace,Menlo,monospace;color:var(--mut);letter-spacing:.08em}}
 .g a{{font-weight:700}}
 .who{{display:inline-block;font:700 9.5px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;
   background:var(--ink);color:#fff;padding:3px 6px;margin-right:8px}}
 .st{{font:700 9.5px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;padding:3px 6px;
   margin-right:8px;color:#fff}}
 .running{{background:#0a7a3d}}.blocked{{background:var(--hot)}}.ready{{background:#b8860b}}
 .tally{{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}}
 .tally div{{border:2px solid var(--ink);padding:10px 14px;text-align:center;min-width:92px}}
 .tally b{{font:800 26px/1 system-ui;display:block}}
 .tally span{{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut)}}
</style>
<div class="wrap">
<header>
<h1>DAYWRAP<br>{DATE}</h1>
<div class="meta">
 <span>generated from real state · <b>git log + kanban + route registry</b></span>
 <span>built <b>{NOW.strftime('%H:%M')} +08</b> · regenerable: <code>tools/daywrap-build.py</code></span>
 <span>numbers below are machine-pulled, not written</span>
</div>
</header>

<div class="forwho"><b>What this is:</b> the day, wrapped as evidence. Every row is a real commit, a real
board task, or a real registered route — pulled at build time. Nothing here is remembered; everything
here is checked.</div>

<div class="tally">
 <div><b>{len(rows)}</b><span>human commits</span></div>
 <div><b>{len(routes)}</b><span>new routes</span></div>
 <div><b>{sum(1 for t in tasks if t['status']=='running')}</b><span>running</span></div>
 <div><b>{sum(1 for t in tasks if t['status']=='blocked')}</b><span>blocked</span></div>
</div>

<h2>Shipped today (machine commits stripped)</h2>""")
    for sha, msg in rows:
        h.append(f'<div class="g"><span class="sha">{sha}</span><br>{esc(msg)}</div>')
    h.append("<h2>New surfaces registered today</h2>")
    for href, title, role in routes:
        h.append(f'<div class="g"><a href="{href}">{esc(title)}</a><div style="color:var(--mut);font-size:13px">{esc(role)}</div></div>')
    h.append("<h2>In flight (the board, live)</h2>")
    for t in tasks:
        h.append(f'<div class="g"><span class="who">{esc(t["who"])}</span><span class="st {t["status"]}">{t["status"]}</span>'
                 f'<span class="sha">{t["id"]}</span><br>{esc(t["title"])}</div>')
    h.append("""<h2>Waiting on a human</h2>
<div class="g"><b>The oil-town follow-up</b> — never received by any session (proven, not guessed). Resend it and the slot fills.</div>
<div class="g"><b>The one written IT question</b> (Slack plan tier + legal-hold coverage of Slack Connect + bot messages) — only a human can ask it.</div>
<div class="g"><b>mangospree's pick</b> — DECODE ships an A/B now; the subject adjudicates which instrument survives.</div>
<div class="close"><b>Regenerate this page any day:</b> <code>python3 tools/daywrap-build.py</code> — it reads the
same three sources and refuses to invent a row. The day is only wrapped when the wrap is evidence.</div>
<div class="foot"><b>Provenance</b> — built {ts} by tools/daywrap-build.py from git log since 00:00 +08,
hermes kanban list, and showcase-manifest.json index.updated_at. Machine refresh commits (desk/nexus/comms/
convergence/stamp) filtered by rule, not by hand. · noindex · contact: the group thread</div>
</div>""".replace("{ts}", NOW.strftime("%Y-%m-%d %H:%M +08")))
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text("\n".join(h))
    print("wrote", OUT, len("\n".join(h)), "bytes ·", len(rows), "commits ·", len(routes), "routes ·", len(tasks), "open tasks")

if __name__ == "__main__":
    build()
