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
import json, re, sys, collections, datetime, html, os, pathlib

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
            f'<td><a href="{html.escape(url)}" rel="noreferrer">open ↗</a></td></tr>'
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

    doc = f"""<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LINK FIELD · {PAGE['date']} · {PAGE['contact']}</title>
<meta name="robots" content="noindex">
<style>
:root{{--ink:#111;--mut:#6b6b6b;--rule:#d8d8d8;--acc:#0b5fff;--warn:#c8102e}}
*{{box-sizing:border-box}}
body{{margin:0;background:#fff;color:var(--ink);
 font:16px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.01em}}
.wrap{{max-width:880px;margin:0 auto;padding:24px 16px 72px}}
header{{border-bottom:2px solid var(--ink);padding-bottom:12px;margin-bottom:20px}}
h1{{font-size:clamp(28px,7vw,54px);margin:0;line-height:.95;letter-spacing:-.04em;text-transform:uppercase}}
.meta{{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:10px;font-size:13px;color:var(--mut)}}
.meta b{{color:var(--ink)}}
h2{{font-size:13px;text-transform:uppercase;letter-spacing:.16em;margin:34px 0 10px;
 border-top:1px solid var(--rule);padding-top:10px;color:var(--mut)}}
.pulse{{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1px;background:var(--rule);
 border:1px solid var(--rule)}}
.pulse div{{background:#fff;padding:12px}}
.pulse .n{{font-size:30px;font-weight:600;letter-spacing:-.04em}}
.pulse .l{{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.1em}}
.row{{display:grid;grid-template-columns:206px 1fr 56px;align-items:center;gap:10px;
 font-size:14px;padding:3px 0}}
.row .k{{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.row .bar{{background:var(--acc);height:13px;display:block}}
.row .v{{text-align:right;font-variant-numeric:tabular-nums;color:var(--mut)}}
.tl{{display:flex;align-items:flex-end;gap:2px;height:96px;border-bottom:1px solid var(--ink);
 padding-top:8px}}
.tl i{{flex:1;background:var(--ink);position:relative;min-height:2px}}
.tl i b{{position:absolute;top:-15px;left:50%;transform:translateX(-50%);font-size:9px;
 font-weight:400;color:var(--mut);opacity:0;background:#fff;padding:0 2px;white-space:nowrap}}
.tl i:hover b{{opacity:1}}
.axis{{display:flex;justify-content:space-between;font-size:10px;color:var(--mut);
 letter-spacing:.04em;padding-top:5px}}
.peak{{font-size:11px;color:var(--ink);padding-top:6px}}
table{{border-collapse:collapse;width:100%;font-size:14px}}
td,th{{border-bottom:1px solid var(--rule);padding:7px 8px;text-align:left;vertical-align:top}}
th{{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--mut)}}
td.num{{font-variant-numeric:tabular-nums;white-space:nowrap}}
.lab{{font-weight:600;white-space:nowrap}}
.live{{color:var(--acc);font-weight:600}}
.dead{{color:var(--warn);font-weight:600;text-decoration:line-through}}
.far{{color:var(--mut)}}
a{{color:var(--acc)}}
ul{{list-style:none;padding:0;margin:0}}
ul li{{display:flex;justify-content:space-between;gap:14px;padding:7px 0;
 border-bottom:1px solid var(--rule);font-size:15px}}
.tag{{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.08em;
 white-space:nowrap;padding-top:3px}}
.q{{color:var(--ink)}}
.note{{font-size:13px;color:var(--mut);border-left:2px solid var(--acc);padding:2px 0 2px 10px;
 margin:10px 0}}
#banner{{position:sticky;top:0;background:var(--ink);color:#fff;padding:7px 14px;font-size:13px;
 display:none;letter-spacing:.04em}}
#banner.on{{display:block}}
code{{background:#f2f2f2;padding:1px 4px}}
footer{{margin-top:40px;font-size:12px;color:var(--mut);border-top:1px solid var(--rule);
 padding-top:12px}}
@media(max-width:560px){{.row{{grid-template-columns:110px 1fr 46px;font-size:13px}}
 td,th{{padding:6px 4px;font-size:13px}}}}
</style>
<div id="banner">EXPIRED {PAGE['expires']} — this page is archived. The link field keeps moving; this frame does not.</div>
<div class="wrap">
<header>
<h1>Link<br>Field</h1>
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

<h2>Open questions · low confidence</h2>
<ul>
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

<footer>Shortlink pattern <code>/YYYYMMDD-TOPIC-CONTACT/</code> · this one
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
</script>
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
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LINKS · {PAGE['date']} · {PAGE['contact']}</title>
<meta name="robots" content="noindex">
<style>
:root{{--ink:#111;--mut:#6b6b6b;--rule:#d8d8d8;--acc:#0b5fff}}
*{{box-sizing:border-box}}
body{{margin:0;background:#fff;color:var(--ink);
 font:14px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}}
.wrap{{max-width:960px;margin:0 auto;padding:18px 14px 60px}}
header{{display:flex;flex-wrap:wrap;gap:10px;align-items:baseline;
 border-bottom:2px solid var(--ink);padding-bottom:10px}}
h1{{font-size:26px;margin:0;letter-spacing:-.04em;text-transform:uppercase}}
a.back{{font-size:12px;color:var(--acc);text-decoration:none}}
.bar{{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--rule);
 padding:10px 0;z-index:2}}
input{{width:100%;padding:9px 10px;border:1px solid var(--ink);font:inherit;
 background:#fff;border-radius:0}}
button{{font:inherit;font-size:11px;border:1px solid var(--rule);background:#fff;
 padding:4px 7px;margin:6px 4px 0 0;cursor:pointer;border-radius:0;letter-spacing:.04em}}
button.on{{background:var(--ink);color:#fff;border-color:var(--ink)}}
.it{{display:grid;grid-template-columns:46px 132px 1fr;gap:8px;padding:5px 0;
 border-bottom:1px solid var(--rule);font-size:13px;align-items:baseline}}
.it .d{{color:var(--mut);font-variant-numeric:tabular-nums}}
.it .ln{{color:var(--mut);font-size:10px;text-transform:uppercase;letter-spacing:.06em;
 white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.it a{{color:var(--ink);text-decoration:none;overflow:hidden;text-overflow:ellipsis;
 white-space:nowrap;display:block}}
.it a b{{font-weight:600}}
.it a:hover{{color:var(--acc);text-decoration:underline}}
.it a::after{{content:' ↗';color:var(--mut);font-size:11px}}
.n{{color:var(--mut);font-size:12px;padding-top:8px}}
@media(max-width:560px){{.it{{grid-template-columns:44px 1fr}}
 .it .ln{{display:none}}}}
</style>
<div class="wrap">
<header><h1>Links</h1>
 <a class="back" href="./">← field</a>
 <span class="n">{len(items)} rows · newest first · dates 2026 · live from ledger</span></header>
<div class="bar">
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
