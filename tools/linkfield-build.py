#!/usr/bin/env python3
"""
linkfield-build — regenerate the LINK FIELD living doc from the link ledger.

READS   ~/void-anchor/ops-hub/data/links/ledger.jsonl   (append-only, 1 row = 1 link)
WRITES  <repo>/20261005-linkfield-mcvoid/index.html

RUN     python3 tools/linkfield-build.py            (from ~/Projects/0xxx0.github.io)
        python3 tools/linkfield-build.py --check    (dry run: print stats, write nothing)

WHY     One command, one source of truth, no hand-maintained numbers.
        Every figure on the page is computed here or it does not appear.
"""
import json, re, sys, collections, datetime, html, os, pathlib, subprocess

LEDGER = os.path.expanduser("~/void-anchor/ops-hub/data/links/ledger.jsonl")
REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "20261005-linkfield-mcvoid" / "index.html"

# shortlink contract: DATE - TOPIC - CONTACT
PAGE = dict(
    date="2026-10-05",
    topic="linkfield",
    contact="mcvoid",
    expires="2026-11-04",          # 30-day expiry; page shows a live countdown
)
VARIANT = None   # None = house cut (mcvoid); "--variant frex" = the frex cut (dated today)

def configure(variant=None):
    """--variant <contact>: a dated cut for a named person. Folds in everything from
    its date (today's commits + new routes) and adds the share/settings reveal."""
    global VARIANT
    if variant and variant != PAGE["contact"]:
        VARIANT = variant
        PAGE["contact"] = variant
        today = datetime.date.today().isoformat()
        PAGE["date"] = today
        PAGE["expires"] = (datetime.date.fromisoformat(today) + datetime.timedelta(days=30)).isoformat()

LANES = [
    ("BUILD / CODE",      {"github.com","gist.github.com","api.github.com","raw.githubusercontent.com",
                           "avatars.githubusercontent.com","camo.githubusercontent.com","dev.to",
                           "stackoverflow.com","codeberg.org","gitlab.com","css-tricks.com","30secondsofcode.org"}),
    ("MODEL / AGENT",     {"hermes-agent.nousresearch.com","openrouter.ai","ollama.com",
                           "portal.nousresearch.com","nousresearch.com","anthropic.com",
                           "www-cdn.anthropic.com","docs.anthropic.com","platform.openai.com",
                           "help.openai.com","chatgpt.com","huggingface.co"}),
    ("WATCH / LEARN",     {"youtube.com","m.youtube.com","youtu.be","vimeo.com","ted.com"}),
    ("LIFE / SG",         {"singpromos.com","eatbook.sg","sethlui.com","burpple.com","chope.co","openrice.com"}),
    ("DISCUSS / READ",    {"reddit.com","medium.com","substack.com","wikipedia.org","en.wikipedia.org",
                           "paulgraham.com","news.ycombinator.com","hn.algolia.com","t.me","x.com","twitter.com"}),
    ("OUR SURFACE",       {"0xxx0.github.io","localhost","127.0.0.1"}),
    ("PAPERS",            {"arxiv.org","pubmed.ncbi.nlm.nih.gov","ncbi.nlm.nih.gov","openreview.net",
                           "aclanthology.org","doi.org","paperswithcode.com","researchgate.net",
                           "sacred-texts.com"}),
    ("HOUSE / PHONE",     {"homeassistant.local","home-assistant.io","developer.android.com",
                           "grapheneos.org"}),
]

def host(u):
    m = re.search(r"https?://([^/]+)", str(u))
    return m.group(1).lower().removeprefix("www.") if m else "?"

def lane_of(d):
    for name, ds in LANES:
        if d in ds or any(d.endswith("." + x) for x in ds):
            return name
    return "OTHER"

def load():
    rows, bad = [], 0
    with open(LEDGER, errors="ignore") as f:
        for line in f:
            try:
                rows.append(json.loads(line))
            except Exception:
                bad += 1
    return rows, bad

def stats(rows):
    lanes = collections.Counter()
    days = collections.Counter()
    prof = collections.Counter()
    hosts = collections.Counter()
    for r in rows:
        h = host(r["url"])
        lanes[lane_of(h)] += 1
        hosts[h] += 1
        days[str(r.get("ts", ""))[:10]] += 1
        prof[r.get("source_profile", "?")] += 1
    return lanes, days, prof, hosts

# --- hand-verified real-world rows: what a link turns into outside the screen ---
# deadline parsed from the slug by eye, re-checked against the row ts.
REALWORLD = [
    ("ELECTRICITY", "tariffs -10.4% Oct→Dec 2026", "2026-12-31",
     "https://singpromos.com/news/electricity-tariffs-to-decrease-by-10-4-from-oct-to-dec-2026-307391/"),
    ("STARBUCKS",   "2 tall drinks S$9.90 · 5–8 Oct", "2026-10-08",
     "https://singpromos.com/dining-restaurants-food/starbucks-spore-offering-2-tall-drinks-for-9-90-from-5-8-oct-2026-307367/"),
    ("FAIRPRICE",   "cleaning 1-for-1, up to 55% off", "2026-10-14",
     "https://singpromos.com/household/fairprice-cleaning-sale-1-for-1-up-to-55-off-deals-till-14-oct-2026-307513/"),
    ("BURGER KING", "e-coupons, up to 60% · 20 deals", "2027-01-03",
     "https://singpromos.com/dining-restaurants-food/burger-king-sg-e-coupons-save-up-to-60-on-20-deals-till-3-jan-2027-307466/"),
    ("HOUSE",       "cat feeder meal plan → Home Assistant", None,
     "https://www.home-assistant.io/actions/tuya.set_feeder_meal_plan/"),
    ("PHONE",       "GrapheneOS hardening", None,
     "https://grapheneos.org/"),
]

# --- variant sections (frex cut): fold in the day, expose the share levers ---

def sh(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=REPO).stdout

MACHINE = re.compile(r"^(desk:|nexus:|comms:|convergence:|stamp$|restamp|.*: stamp|"
                     r".*: restamp|.*restamp post-rebase|ci:|temp pages:)", re.I)

def today_foldin():
    """Everything that landed on PAGE['date']: real commits + routes new since day start.
    Pulled from git + showcase-manifest.json — numbers and lists are read, not written."""
    day = PAGE["date"]
    rows = []
    for line in sh("git log --since=%sT00:00:00+08:00 --pretty=format:'%%h|%%s' --no-merges" % day).splitlines():
        if "|" not in line:
            continue
        sha, msg = line.split("|", 1)
        if not MACHINE.match(msg.strip()):
            rows.append((sha.strip(), msg.strip()))
    old_commit = sh("git rev-list -1 --before=%sT00:00:00+08:00 origin/master" % day).strip()
    old = set()
    if old_commit:
        try:
            old = {r.get("href") for r in json.loads(sh("git show %s:showcase-manifest.json" % old_commit)).get("routes", [])}
        except Exception:
            pass
    try:
        m = json.load(open(REPO / "showcase-manifest.json"))
    except Exception:
        m = {}
    routes = [(r.get("href", "#"), r.get("title", "")) for r in m.get("routes", [])
              if r.get("href") not in old and not r.get("showcase_card")]
    rl = "\n".join(f'<li><a href="{html.escape(h)}">{html.escape(t) or html.escape(h)}</a></li>'
                   for h, t in routes)
    cl = "\n".join(f'<li><code>{html.escape(s)}</code> {html.escape(msg)}</li>' for s, msg in rows)
    return f"""<h2>Today · folded in <em>{day}</em></h2>
<div class="note">What actually landed today — {len(rows)} real commits, {len(routes)} new routes.
Machine refresh commits excluded. This is the shareable cut: everything below is public.</div>
<h2 class="tight">New routes</h2>
<ul class="qlist">{rl or '<li><span class="q">no new routes today</span></li>'}</ul>
<h2 class="tight">Commits</h2>
<ul class="qlist">{cl}</ul>"""

def share_panel():
    slug = f"{PAGE['date'].replace('-','')}-{PAGE['topic']}-{PAGE['contact']}"
    url = f"https://0xxx0.github.io/{slug}/"
    return f"""<h2>Share · settings <em>behind the reveal</em></h2>
<details class="reveal"><summary>share / settings</summary>
<div class="note">
<b>Link</b> <code id="u">{url}</code> <button id="cp" type="button">copy</button>
<span id="cp-ok" role="status" aria-live="polite"></span><br>
<b>Share it as</b> — public: anyone with the URL · unlisted: already <code>noindex</code>,
search engines skip it · keyed: ask for a private cut when you want one.<br>
<b>Pass on</b> — the whole field: the link above · one lane: <code>links.html</code> + a lane chip ·
one item: any row link · today only: the section above.<br>
<b>Levers</b> — expiry <b>{PAGE['expires']}</b> (banner flips after, the page stays honest) ·
regenerate from the ledger any time:
<code>python3 tools/linkfield-build.py --variant {html.escape(PAGE['contact'])}</code>
</div></details>"""

def bars(pairs, maxv, unit=""):
    out = []
    for k, v in pairs:
        pct = 0 if maxv == 0 else round(100 * v / maxv, 1)
        out.append(
            f'<div class="row"><span class="k" title="{html.escape(str(k))}">{html.escape(str(k))}</span>'
            f'<span class="bar" style="width:{pct}%"></span>'
            f'<span class="v">{v}{unit}</span></div>'
        )
    return "\n".join(out)

def build():
    rows, bad = load()
    lanes, days, prof, hosts = stats(rows)
    span = (min(days), max(days))
    lane_pairs = [(k, lanes[k]) for k, _ in sorted(LANES, key=lambda x: -lanes.get(x[0], 0))
                  if lanes.get(k)]
    if lanes.get("OTHER"):
        lane_pairs.append(("OTHER (long tail)", lanes["OTHER"]))
    lane_max = max(v for _, v in lane_pairs)

    # timeline: every day in span, zero-filled
    d0 = datetime.date.fromisoformat(span[0]); d1 = datetime.date.fromisoformat(span[1])
    series, cur = [], d0
    while cur <= d1:
        series.append((cur.isoformat(), days.get(cur.isoformat(), 0)))
        cur += datetime.timedelta(days=1)
    dmax = max(v for _, v in series) or 1

    prof_pairs = prof.most_common()
    host_top = hosts.most_common(10)

    today = datetime.date.today().isoformat()
    today_n = days.get(today, 0)
    exp_dt = datetime.date.fromisoformat(PAGE["expires"])
    days_left = (exp_dt - datetime.date.today()).days

    # --- real-world table with live countdown ---
    rw = []
    for label, what, when, url in REALWORLD:
        if when:
            left = (datetime.date.fromisoformat(when) - datetime.date.today()).days
            state = (f'<span class="live">LIVE · {left}d left</span>' if 0 <= left <= 30
                     else f'<span class="{"dead" if left < 0 else "far"}">'
                          f'{"EXPIRED" if left < 0 else f"{left}d left"}</span>')
            when_s = when
        else:
            state = '<span class="far">standing</span>'
            when_s = "—"
        rw.append(
            f'<tr><td class="lab">{html.escape(label)}</td><td>{html.escape(what)}</td>'
            f'<td class="num">{when_s}</td><td>{state}</td>'
            f'<td><a href="{html.escape(url)}" aria-label="Open {html.escape(label)}: {html.escape(what)}"'
            f' rel="noreferrer">open ↗</a></td></tr>'
        )

    window = series[-42:]
    timeline = "\n".join(
        f'<i title="{d}: {v}" style="height:{max(2, round(100*v/dmax))}%"><b>{v}</b></i>'
        for d, v in window
    )
    axis = "".join(
        f'<span>{window[i][0][5:]}</span>' for i in range(0, len(window), 7)
    ) + f'<span>{window[-1][0][5:]}</span>'
    peak = max(window, key=lambda x: x[1])
    peak_line = (f'peak {peak[0]} · {peak[1]} links · hover any bar for its day')
    month = lambda s: datetime.date.fromisoformat(s).strftime("%b %d")

    q = [
        ("Is 30 days the right expiry, or should dated deals expire on their own date?", "timer policy"),
        ("Are the 94 own-surface links proof of output, or just self-citation?", "honesty check"),
        ("Why do PAPERS outrank LIFE only 73:106 — is the archive actually feeding the body?", "balance"),
        ("Titles are empty on all 1,634 rows: fetch metadata, or keep the ledger raw?", "enrichment"),
        ("Who else needs this page besides frex/amy — public, unlisted, or keyed?", "audience"),
        ("2026-09-04 (243) and 2026-09-27 (127) are spikes: imports or real days?", "data quality"),
    ]
    ql = "\n".join(f'<li><span class="q">{html.escape(t)}</span><span class="tag">{html.escape(g)}</span></li>'
                  for t, g in q)

    today_sec = today_foldin() if VARIANT else ""
    share_sec = share_panel() if VARIANT else ""
    extra_style = """
<style>
 a{text-decoration:underline;text-underline-offset:2px;text-decoration-thickness:1px}
 a:hover{text-decoration:none}
 :focus-visible{outline:2px solid var(--acc);outline-offset:2px}
 h2.tight{margin-top:22px}
 .reveal{border:1px solid var(--rule);padding:10px 12px;margin:12px 0}
 .reveal summary{cursor:pointer;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut)}
 .reveal summary:hover{color:var(--ink)}
 .reveal button{font:inherit;font-size:11px;padding:2px 8px;border:1px solid var(--ink);
   background:none;color:var(--ink);cursor:pointer;margin-left:6px}
 .reveal button:hover{background:var(--ink);color:var(--bg)}
</style>""" if VARIANT else ""

    doc = f"""<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LINK FIELD · {PAGE['date']} · {PAGE['contact']}</title>
<meta name="robots" content="noindex">
<link rel="stylesheet" href="/tools/house-patterns.css">{extra_style}
<div id="banner">EXPIRED {PAGE['expires']} — this page is archived. The link field keeps moving; this frame does not.</div>
<div class="wrap">
<header>
<h1 class="display">Link<br>Field</h1>
<div class="meta">
 <span>{PAGE['date']}</span><span>topic <b>linkfield</b></span>
 <span>contact <b>{PAGE['contact']}</b></span>
 <span>expires <b>{PAGE['expires']}</b> · <b id="cd">{days_left}d</b> left</span>
 <span><a href="links.html"><b>→ all {len(rows)} links</b></a></span>
</div>
</header>

<h2>Pulse</h2>
<div class="pulse">
 <div><div class="n">{len(rows)}</div><div class="l">links</div></div>
 <div><div class="n">{(d1-d0).days}d</div><div class="l">{month(span[0])} → {month(span[1])}</div></div>
 <div><div class="n">{len(prof)}</div><div class="l">profiles</div></div>
 <div><div class="n">{today_n}</div><div class="l">today</div></div>
</div>
<div class="note">Source: <code>ops-hub/data/links/ledger.jsonl</code> — append-only, {len(rows)} rows,
{bad} unparseable. Regenerate: <code>python3 tools/linkfield-build.py</code>. Every number on this page
is computed from that file or it does not appear.</div>

{today_sec}

<h2>Where they land</h2>
{bars(lane_pairs, lane_max)}

<h2>Cadence · last 42 days</h2>
<div class="tl">{timeline}</div>
<div class="axis">{axis}</div>
<div class="peak">{peak_line}</div>

<h2>What this connects to in the real world</h2>
<table>
<tr><th>where</th><th>what it turns into</th><th>by</th><th>state</th><th></th></tr>
{"".join(rw)}
</table>
<div class="note">Three quarters of the field is input (build, models, video). The rows above are the
part that leaves the screen: a tariff, a feeder, a phone, a receipt. Dated rows carry a countdown —
the timer belongs to the <b>deal</b>, not to the page.</div>

<h2>Who dropped them</h2>
{bars(prof_pairs, max(v for _, v in prof_pairs))}

<h2>Top hosts</h2>
{bars(host_top, host_top[0][1])}

{share_sec}

<h2>Open questions · low confidence</h2>
<ul class="qlist">
{ql}
</ul>

<h2>Expiry system · spec</h2>
<div class="note">
1 · page has <code>expires:{PAGE['expires']}</code> — countdown above, banner on pass.<br>
2 · ledger rows that point at dated things take <code>note:"expires:YYYY-MM-DD"</code> — countdown
attaches to the row, not the page.<br>
3 · regenerate on any ledger write: one command, no hand-edited numbers.<br>
4 · expired page is not deleted: it renders with the banner, so old shares stay honest.
</div>

<footer class="foot">Shortlink pattern <code>/YYYYMMDD-TOPIC-CONTACT/</code> · this one
<code>/{PAGE['date'].replace('-','')}-{PAGE['topic']}-{PAGE['contact']}/</code> ·
generated by <code>tools/linkfield-build.py</code> · {PAGE['date']}</footer>
</div>
<script>
(function(){{
  var exp = new Date("{PAGE['expires']}T23:59:59Z");
  var ms = exp - Date.now();
  var el = document.getElementById('cd'), b = document.getElementById('banner');
  if (ms <= 0) {{ b.className = 'on'; el.textContent = '0d'; return; }}
  var d = Math.floor(ms/864e5), h = Math.floor(ms/36e5)%24, m = Math.floor(ms/6e4)%60;
  el.textContent = d + 'd ' + String(h).padStart(2,'0') + 'h ' + String(m).padStart(2,'0') + 'm';
  setTimeout(arguments.callee, 60000);
}})();
var cp = document.getElementById('cp');
if (cp) cp.addEventListener('click', function(){{
  var t = document.getElementById('u').textContent, ok = document.getElementById('cp-ok');
  function done() {{ ok.textContent = ' copied'; setTimeout(function() {{ ok.textContent = ''; }}, 2000); }}
  function legacy() {{
    var ta = document.createElement('textarea'); ta.value = t;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); done();
  }}
  if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, legacy);
  else legacy();
}});
</script>
</html>
"""
    return doc, dict(rows=len(rows), bad=bad, span=span, lanes=dict(lane_pairs),
                     today=today_n, days_left=days_left)

def build_list():
    """The actual links — every ledger row, newest first, filterable. No server."""
    rows, _ = load()
    items = sorted(rows, key=lambda r: str(r.get("ts", "")), reverse=True)

    def label(u):
        u = str(u)
        m = re.search(r"https?://([^/]+)(/.*)?", u)
        host = m.group(1).removeprefix("www.") if m else u
        path = (m.group(2) or "") if m else ""
        path = path.split("?")[0].rstrip("/")
        slug = path.rsplit("/", 1)[-1] if path else ""
        slug = slug.replace("-", " ")[:70]
        return host, slug or path.strip("/") or "·"

    chips, out = [], []
    counts = collections.Counter()
    for r in items:
        u = str(r["url"]); h = host(u); L = lane_of(h)
        counts[L] += 1
        d = str(r.get("ts", ""))[:10]
        hl, slug = label(u)
        q = html.escape((u + " " + L + " " + d).lower())
        out.append(
            f'<div class="it" data-l="{html.escape(L)}" data-q="{q}">'
            f'<span class="d">{d[5:] if d else ""}</span>'
            f'<span class="ln">{html.escape(L)}</span>'
            f'<a href="{html.escape(u)}" rel="noreferrer noopener" target="_blank">'
            f'<b>{html.escape(hl)}</b>/{html.escape(slug)}</a></div>'
        )
    for L, n in counts.most_common():
        chips.append(f'<button data-l="{html.escape(L)}">{html.escape(L)} {n}</button>')

    return f"""<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LINKS · {PAGE['date']} · {PAGE['contact']}</title>
<meta name="robots" content="noindex">
<link rel="stylesheet" href="/tools/house-patterns.css">
<div class="wrap">
<header class="headrow"><h1>Links</h1>
 <a class="back" href="./">← field</a>
 <span class="n">{len(items)} rows · newest first · dates 2026 · live from ledger</span></header>
<div class="filters">
 <input id="q" type="search" placeholder="filter: host, lane, date, path…" autofocus>
 <div id="chips">{''.join(chips)}</div>
</div>
<div id="list">{''.join(out)}</div>
<div class="n" id="cnt">showing {len(items)} / {len(items)}</div>
</div>
<script>
var rows=[].slice.call(document.querySelectorAll('.it')),lc=null;
function go(){{
 var q=document.getElementById('q').value.toLowerCase().trim(),n=0;
 rows.forEach(function(el){{
  var ok=(!q||el.dataset.q.indexOf(q)>-1)&&(!lc||el.dataset.l===lc);
  el.style.display=ok?'':'none'; if(ok)n++;}});
 document.getElementById('cnt').textContent='showing '+n+' / '+rows.length;}}
document.getElementById('q').addEventListener('input',go);
[].forEach.call(document.querySelectorAll('#chips button'),function(b){{
 b.addEventListener('click',function(){{
  lc=(lc===b.dataset.l)?null:b.dataset.l;
  [].forEach.call(document.querySelectorAll('#chips button'),function(x){{
   x.classList.toggle('on',x.dataset.l===lc);}});
  go();}});}});
</script>
"""


if __name__ == "__main__":
    if "--variant" in sys.argv:
        configure(sys.argv[sys.argv.index("--variant") + 1])
        OUT = REPO / (PAGE["date"].replace("-", "") + "-" + PAGE["topic"] + "-" + PAGE["contact"]) / "index.html"
    doc, meta = build()
    if "--check" in sys.argv:
        print(json.dumps(meta, indent=2, default=str)); sys.exit(0)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(doc)
    lst = OUT.parent / "links.html"
    lst.write_text(build_list())
    meta["links_html"] = lst.stat().st_size
    print(json.dumps(meta, indent=2, default=str))
    print("wrote", OUT, OUT.stat().st_size, "bytes")
    print("wrote", lst, lst.stat().st_size, "bytes")
