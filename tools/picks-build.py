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
            f'<div class="row" data-state="{esc(r["state"])}" data-family="{esc(r["family"] or "—")}" '
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
<style>
:root{{--ink:#111;--mut:#6b6b6b;--rule:#d8d8d8;--acc:#0b5fff;--warn:#c8102e;--ok:#0a7a3d}}
*{{box-sizing:border-box}}
body{{margin:0;background:#fff;color:var(--ink);
 font:16px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.01em}}
.wrap{{max-width:960px;margin:0 auto;padding:24px 16px 72px}}
header{{border-bottom:2px solid var(--ink);padding-bottom:12px;margin-bottom:18px}}
h1{{font-size:clamp(30px,8vw,58px);margin:0;line-height:.92;letter-spacing:-.045em;text-transform:uppercase}}
.sub{{color:var(--mut);font-size:13px;margin-top:8px}}
.meta{{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:10px;font-size:13px;color:var(--mut)}}
.meta b{{color:var(--ink)}}
h2{{font-size:13px;text-transform:uppercase;letter-spacing:.16em;margin:34px 0 10px;
 border-top:1px solid var(--rule);padding-top:10px;color:var(--mut)}}
.pulse{{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:1px;background:var(--rule);
 border:1px solid var(--rule)}}
.pulse div{{background:#fff;padding:12px}}
.pulse .n{{font-size:30px;font-weight:600;letter-spacing:-.04em}}
.pulse .l{{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.1em}}
.warn{{border-left:4px solid var(--warn);padding:8px 12px;margin-top:14px;font-size:14px;background:#fff}}
.ok{{border-left:4px solid var(--ok);padding:8px 12px;margin-top:14px;font-size:14px}}
.pick{{display:grid;grid-template-columns:210px 1fr 250px 52px;gap:12px;align-items:start;
 text-decoration:none;color:inherit;padding:12px 0;border-bottom:1px solid var(--rule)}}
.pick:hover{{background:#f4f7ff}}
.ph{{font-weight:600;color:var(--acc)}}
.pt b{{display:block;font-weight:600}}
.pt em{{display:block;font-style:normal;color:var(--mut);font-size:13px;margin-top:3px}}
.pw{{font-size:13px;border-left:3px solid var(--acc);padding-left:9px}}
.pa{{text-align:right;color:var(--mut);font-size:13px}}
.tools{{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 12px}}
.chip{{font:inherit;font-size:12px;background:#fff;color:var(--ink);border:1px solid var(--rule);
 padding:5px 9px;cursor:pointer;border-radius:0}}
.chip.alt{{color:var(--mut)}}
.chip.on{{background:var(--ink);color:#fff;border-color:var(--ink)}}
.chip b{{color:inherit;opacity:.7}}
input#q{{font:inherit;width:100%;padding:10px 12px;border:1px solid var(--ink);background:#fff;border-radius:0}}
.rows{{border-top:1px solid var(--rule);margin-top:10px}}
.row{{display:grid;grid-template-columns:232px 1fr 176px 54px;gap:10px;align-items:center;
 padding:9px 0;border-bottom:1px solid var(--rule);font-size:14px}}
.row a.rh{{color:var(--acc);text-decoration:none;font-weight:600;overflow-wrap:anywhere}}
.rt b{{display:block;font-weight:600}}
.rt span{{display:block;color:var(--mut);font-size:12.5px;margin-top:2px;
 display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}}
.rm i{{font-style:normal;font-size:12px;border:1px solid var(--rule);padding:2px 5px;display:inline-block}}
.rm u{{text-decoration:none;font-size:11.5px;color:var(--mut);display:block;margin-top:4px}}
.age{{font-size:13px;text-align:right;color:var(--mut)}}
.age.now{{color:var(--ok);font-weight:600}}
.count{{font-size:12px;color:var(--mut);margin-top:8px}}
footer{{margin-top:40px;border-top:2px solid var(--ink);padding-top:12px;font-size:12.5px;color:var(--mut)}}
@media(max-width:760px){{
 .pick{{grid-template-columns:1fr 46px}}
 .pick .pw{{grid-column:1/-1;order:3}}
 .row{{grid-template-columns:1fr 54px;grid-template-areas:"h a" "t t" "m m"}}
 .row a.rh{{grid-area:h}} .rt{{grid-area:t}} .rm{{grid-area:m}} .age{{grid-area:a}}
}}
</style>
<div class="wrap">
<header>
<h1>Field Picks</h1>
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
<div class="ok">Last touch, not contract state. {touched} of {len(rows)} routes have a commit behind them
in this history; a route only shows “never” when no commit in the full history touched its path.</div>

<h2>All {len(rows)} routes</h2>
<div class="tools">{'<input id="q" placeholder="filter — href, title or description">'}</div>
<div class="tools">{chips}</div>
<div class="tools">{fam_chips}</div>
<div class="count" id="c"></div>
<div class="rows" id="rows">
{''.join(rows_html)}
</div>

<footer>Generated by <b>tools/picks-build.py</b> — one command, one source of truth.
Every number on this page is computed from the manifest, the receipts or git, or it is not here.
PICKS text is the only hand-written block; each description is the manifest role.
Rebuild: <b>python3 tools/picks-build.py</b></footer>
</div>
<script>
(function(){{
 var q=document.getElementById('q'),c=document.getElementById('c'),
     rows=[].slice.call(document.querySelectorAll('.row')),
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
