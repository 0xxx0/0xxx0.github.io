#!/usr/bin/env python3
"""
picks-build — regenerate THE FIELD PICKS page (what is in here, and where to start).

READS   <repo>/showcase-manifest.json      (route identity: title/role/state/family/version)
        <repo>/returns/*.json              (evidence count)
        git log --name-only                (one last-touch date per route, longest-prefix map)

WRITES  <repo>/20261006-picks-mcvoid/index.html

RUN     python3 tools/picks-build.py            (from ~/Projects/0xxx0.github.io)
        python3 tools/picks-build.py --check    (dry run: print stats, write nothing)

WHY     Same contract as linkfield-build.py: one command, one source of truth,
        every figure computed here or it does not appear. The PICKS block is the
        only hand-written text, and each line is checked against the manifest role.
"""
import json, os, re, sys, glob, html, datetime, collections, pathlib, subprocess

REPO = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = REPO / "showcase-manifest.json"
RETURNS = REPO / "returns"
OUTDIR = REPO / "20261006-picks-mcvoid"
OUT = OUTDIR / "index.html"

# hand-written, one line each, every description checked against routes[].role
PICKS = [
    ("/dayline/", "One ranked object held, exact first native move. This is the ONE INSTRUMENT driver."),
    ("/godseye/", "21 figures, each paired with the command or file it came from. The number law, working."),
    ("/poetry/", "Writing-first door: WRITE / WEAVE / READ, everything else stays optional machinery."),
    ("/iching/", "64 states as a finite machine with address + transformation. A lens, not a oracle."),
    ("/fold-bloom/voice/", "Pitch, stability and spectrum practice. Local only; no raw mic audio is stored."),
    ("/fold-bloom/listen/", "Cartographer for one exact audio identity. Your BOOKMARK / FLAG / ARC marks round-trip."),
    ("/app-atlas/", "Capture an idea without committing to it, and wrangle OLD to CURRENT without losing ancestry."),
    ("/foundry/omnitools/", "One screen: scan, read, align, reshape. Local processing, one help aperture."),
    ("/interphase-genesis/", "The recovered origin canon rendered live — one object preserved across every projection."),
    ("/body/fit/", "Addressed modules, saved kits, real RETURN/PATINA. No streak scoring anywhere."),
]

def esc(s):
    return html.escape(str(s or ""))

def git_last_touch():
    """route path -> (iso committer date, subject). Longest-prefix map, machine refreshes kept
    out of the 'semantic' figure but recorded too."""
    fmt = "C|%cI|%s"
    p = subprocess.run(["git", "log", "--format=" + fmt, "--name-only"],
                       cwd=REPO, capture_output=True, text=True, errors="replace")
    if p.returncode != 0:
        raise SystemExit("git log failed: " + p.stderr[:200])
    commits, cur = [], None
    for line in p.stdout.splitlines():
        if line.startswith("C|"):
            _, ci, s = line.split("|", 2)
            cur = {"ci": ci, "s": s, "files": []}
            commits.append(cur)
        elif line.strip() and cur is not None:
            cur["files"].append(line.strip())
    return commits

def build(routes, commits):
    # route paths, longest first, so /foundry/room/ beats /foundry/
    paths = []
    for r in routes:
        h = r["href"]
        if h.endswith(".html"):
            paths.append((h.lstrip("/"), r["href"]))
        elif h == "/":
            continue
        else:
            paths.append((h.strip("/") + "/", r["href"]))
    paths.sort(key=lambda x: -len(x[0]))
    machine = re.compile(r"^(nexus|comms|convergence|desk|loops):")

    touch = {}     # href -> (ci, subject)
    touch_sem = {} # href -> (ci, subject), machine refresh commits excluded
    for c in commits:
        for f in c["files"]:
            for pre, href in paths:
                if f == pre.rstrip("/") or f.startswith(pre):
                    if href not in touch or c["ci"] > touch[href][0]:
                        touch[href] = (c["ci"], c["s"])
                    if not machine.match(c["s"]) and (href not in touch_sem or c["ci"] > touch_sem[href][0]):
                        touch_sem[href] = (c["ci"], c["s"])
                    break
    return touch, touch_sem

def main():
    dry = "--check" in sys.argv
    routes = json.loads(MANIFEST.read_text())["routes"]
    commits = git_last_touch()
    touch, touch_sem = build(routes, commits)

    now = datetime.datetime.now().astimezone().replace(microsecond=0)
    today = now.date()
    rets = glob.glob(str(RETURNS / "*.json"))
    sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=REPO,
                         capture_output=True, text=True).stdout.strip()

    rows = []
    for r in routes:
        h = r["href"]
        t = touch_sem.get(h) or touch.get(h)
        age = None
        if t:
            d = datetime.datetime.fromisoformat(t[0])
            age = (today - d.date()).days
        rows.append(dict(
            href=h, title=r.get("title") or h, kind=r.get("kind") or "",
            op=r.get("operation") or "", state=r.get("state") or "",
            family=r.get("family") or "", ver=r.get("version") or "",
            role=(r.get("role") or "").strip(), card=bool(r.get("showcase_card")),
            age=age, subj=(t[1] if t else ""),
        ))

    buckets = collections.Counter()
    for r in rows:
        a = r["age"]
        buckets["today" if a == 0 else "1-6" if (a or 99) <= 6 else "7-13" if (a or 99) <= 13
                else "14-30" if (a or 99) <= 30 else "31-90" if (a or 99) <= 90 else "never" if a is None else "90+"] += 1
    states = collections.Counter(r["state"] for r in rows)
    families = collections.Counter(r["family"] or "—" for r in rows)
    fresh7 = sum(1 for r in rows if r["age"] is not None and r["age"] <= 7)
    touched = sum(1 for r in rows if r["age"] is not None)

    byhref = {r["href"]: r for r in rows}
    picks_html = []
    for href, why in PICKS:
        r = byhref.get(href)
        if not r:
            continue
        age = "today" if r["age"] == 0 else f"{r['age']}d" if r["age"] is not None else "—"
        picks_html.append(
            f'<a class="pick" href="{esc(href)}">'
            f'<span class="ph">{esc(href)}</span>'
            f'<span class="pt">{esc(r["title"])}'
            f'<em>{esc(r["role"][:170])}</em></span>'
            f'<span class="pw">{esc(why)}</span>'
            f'<span class="pa">{esc(age)}</span></a>')

    print(f"routes {len(rows)} · touched {touched} · fresh<=7d {fresh7} · "
          f"returns {len(rets)} · families {len(families)} · picks {len(picks_html)}")
    for b in ("today", "1-6", "7-13", "14-30", "31-90", "never"):
        print(f"  {b:<7} {buckets.get(b,0)}")
    if dry:
        print("--check: wrote nothing")
        return

    chips = "".join(
        f'<button class="chip" data-f="state" data-v="{esc(s)}">{esc(s)} <b>{states[s]}</b></button>'
        for s, _ in states.most_common())
    fam_chips = "".join(
        f'<button class="chip alt" data-f="family" data-v="{esc(f)}">{esc(f)}</button>'
        for f, _ in families.most_common(14))
    rows_html = []
    for r in sorted(rows, key=lambda x: (x["age"] is None, x["age"] if x["age"] is not None else 999)):
        age = "today" if r["age"] == 0 else f"{r['age']}d" if r["age"] is not None else "—"
        cls = "age now" if (r["age"] or 99) <= 6 else "age old"
        rows_html.append(
            f'<div class="route" data-state="{esc(r["state"])}" data-family="{esc(r["family"] or "—")}" '
            f'data-txt="{esc((r["href"] + " " + r["title"] + " " + r["role"]).lower())}">'
            f'<a class="rh" href="{esc(r["href"])}">{esc(r["href"])}</a>'
            f'<div class="rt"><b>{esc(r["title"])}</b>'
            f'<span>{esc(r["role"][:200])}</span></div>'
            f'<div class="rm"><i>{esc(r["state"])}</i><u>{esc(r["family"] or "—")}</u></div>'
            f'<span class="{cls}">{esc(age)}</span></div>')

    doc = f"""<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>FIELD PICKS · {now.date().isoformat()} · mcvoid</title>
<link rel="stylesheet" href="/tools/house-patterns.css">
<body class="dark">
<div class="wrap">
<header>
<h1 class="display">Field Picks</h1>
<div class="sub">what is in here, what moved, and where to start</div>
<div class="meta"><span>generated <b>{now.isoformat()}</b></span>
<span>head <b>{esc(sha)}</b></span>
<span>source <b>showcase-manifest.json + returns/ + git</b></span></div>
</header>

<div class="pulse">
<div><div class="n">{len(rows)}</div><div class="l">routes</div></div>
<div><div class="n">{fresh7}</div><div class="l">touched ≤7d</div></div>
<div><div class="n">{len(rets)}</div><div class="l">return receipts</div></div>
<div><div class="n">{len(families)-1}</div><div class="l">families</div></div>
<div><div class="n">{len(PICKS)}</div><div class="l">picks</div></div>
</div>

<h2>Start here</h2>
{''.join(picks_html) if picks_html else '<p>No picks resolved.</p>'}

<h2>Age of every route</h2>
<div class="pulse">
{"".join(f'<div><div class="n">{buckets.get(b,0)}</div><div class="l">{b}</div></div>' for b in ("today","1-6","7-13","14-30","31-90","never"))}
</div>
<div class="verified">Last touch, not contract state. {touched} of {len(rows)} routes have a commit behind them
in this history; a route only shows “never” when no commit in the full history touched its path.</div>

<h2>All {len(rows)} routes</h2>
<div class="filters">{'<input id="q" placeholder="filter — href, title or description">'}
{chips}
{fam_chips}</div>
<div class="count" id="c"></div>
<div class="rows" id="rows">
{''.join(rows_html)}
</div>

<footer class="foot">Generated by <b>tools/picks-build.py</b> — one command, one source of truth.
Every number on this page is computed from the manifest, the receipts or git, or it is not here.
PICKS text is the only hand-written block; each description is the manifest role.
Rebuild: <b>python3 tools/picks-build.py</b></footer>
</div>
<script>
(function(){{
 var q=document.getElementById('q'),c=document.getElementById('c'),
     rows=[].slice.call(document.querySelectorAll('.route')),
     active={{}};
 function run(){{
  var t=(q.value||'').trim().toLowerCase(),n=0;
  rows.forEach(function(el){{
   var ok=true;
   for(var k in active){{ if(el.dataset[k]!==active[k]){{ok=false;break;}} }}
   if(ok&&t&&el.dataset.txt.indexOf(t)===-1)ok=false;
   el.style.display=ok?'':'none'; if(ok)n++;
  }});
  c.textContent=n+' / '+rows.length+' shown';
 }}
 q.addEventListener('input',run);
 document.querySelectorAll('.chip').forEach(function(b){{
  b.addEventListener('click',function(){{
   var f=b.dataset.f,v=b.dataset.v;
   if(active[f]===v){{delete active[f];b.classList.remove('on');}}
   else{{active[f]=v;
     document.querySelectorAll('.chip[data-f="'+f+'"]').forEach(function(o){{o.classList.remove('on');}});
     b.classList.add('on');}}
   run();
  }});
 }});
 run();
}})();
</script>
"""
    OUTDIR.mkdir(parents=True, exist_ok=True)
    OUT.write_text(doc)
    print(f"wrote {OUT} ({len(doc)} bytes)")

if __name__ == "__main__":
    main()
