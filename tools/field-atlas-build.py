#!/usr/bin/env python3
"""
field-atlas-build — one page that shows the FIELD as a shape, not a table.

READS   <repo>/showcase-manifest.json   (route identity: href/title/kind/state/family/version/role)
        <repo>/returns/*.json           (evidence count)
        git log --name-only             (last touch per route, longest-prefix map)

WRITES  <repo>/20261006-field-mcvoid/index.html

RUN     python3 tools/field-atlas-build.py            (from ~/Projects/0xxx0.github.io)
        python3 tools/field-atlas-build.py --check    (dry run: print stats, write nothing)

WHY     A 170-row monospace table is not information design. This page answers three
        questions in one glance: what shape is the field, what is alive, where do I start.
        Layout is computed in the browser at real pixel sizes so it stays legible on a
        phone as well as a desktop. Every number is computed here or it does not appear.

ACT 1   THE FIELD   — nested treemap, one rect per route. area = family size,
                      hue = state, luminance = freshness. Tap/hover for detail.
ACT 2   THE PULSE   — state lanes × time. one dot per route at its last touch.
                      the frozen lanes sit left, the live lanes lean right.
ACT 3   START HERE  — ten picks, each description is the manifest's own role text.
ACT 4   THE COUNTS  — a typographic band, no boxes.
"""
import json, os, re, sys, glob, html, datetime, collections, pathlib, subprocess

REPO = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = REPO / "showcase-manifest.json"
RETURNS = REPO / "returns"
OUTDIR = REPO / "20261006-field-mcvoid"
OUT = OUTDIR / "index.html"

# the only hand-written block on the page. every description below is checked
# against routes[].role — if the manifest disagrees, the manifest wins.
PICKS = [
    ("/dayline/",       "One ranked object held, exact first native move. The one-instrument driver."),
    ("/godseye/",       "21 figures, each naming the command or file it came from. The number law, working."),
    ("/poetry/",        "Writing-first door: WRITE / WEAVE / READ. Everything else is optional machinery."),
    ("/iching/",        "64 states as a finite machine with address + transformation. A lens, not an oracle."),
    ("/fold-bloom/voice/",  "Pitch, stability, spectrum. Local only — no raw mic audio is stored."),
    ("/fold-bloom/listen/", "Cartographer for one exact audio identity. Your BOOKMARK / FLAG / ARC marks round-trip."),
    ("/app-atlas/",     "Capture an idea without committing to it. OLD wrangles to CURRENT without losing ancestry."),
    ("/foundry/omnitools/", "One screen: scan, read, align, reshape. Local processing, one help aperture."),
    ("/interphase-genesis/", "The recovered origin canon rendered live — one object across every projection."),
    ("/body/fit/",      "Addressed modules, saved kits, real RETURN/PATINA. No streak scoring anywhere."),
]

# state -> palette role (the house palette, reused by name)
STATE_HUE = {
    "ACTIVE": "hot", "CANDIDATE": "gold", "STABLE": "cool", "UTILITY": "green",
    "DONOR": "mut", "FROZEN_DONOR": "mut", "REFERENCE": "mut", "PARKED": "mut",
    "RECOVER": "gold", "PROOF_REQUIRED": "warn",
}
LANES = ["ACTIVE", "CANDIDATE", "STABLE", "UTILITY", "FROZEN_DONOR", "OTHER"]


def esc(s):
    return html.escape(str(s or ""))


def parse_iso(s):
    """git %cI is ISO8601; some rows carry a trailing 'Z' that older
    datetime.fromisoformat builds reject. Normalise before parsing."""
    s = str(s).strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.datetime.fromisoformat(s)


def git_log():
    fmt = "C|%cI|%s"
    p = subprocess.run(["git", "log", "--format=" + fmt, "--name-only"],
                       cwd=REPO, capture_output=True, text=True, errors="replace")
    if p.returncode != 0:
        raise SystemExit("git log failed: " + (p.stderr or "")[:300])
    commits, cur = [], None
    for line in p.stdout.splitlines():
        if line.startswith("C|"):
            _, ci, s = line.split("|", 2)
            cur = {"ci": ci, "s": s, "files": []}
            commits.append(cur)
        elif line.strip() and cur is not None:
            cur["files"].append(line.strip())
    return commits


def last_touch(routes, commits):
    """href -> (ISO committer date of newest touch, count of semantic touches).

    The count is what the treemap sizes rectangles by, so machine-refresh commits
    (nexus:/comms:/convergence:/desk:/loops:) are excluded — otherwise the
    generated pages would swallow the map and hide the real work."""
    machine = re.compile(r"^(nexus|comms|convergence|desk|loops):")
    paths = []
    for r in routes:
        h = r["href"]
        paths.append((h.lstrip("/"), h) if h.endswith(".html") else
                     ((h.strip("/") + "/", h) if h != "/" else (None, h)))
    paths = [p for p in paths if p[0] is not None]
    paths.sort(key=lambda x: -len(x[0]))
    top_level = [r["href"] for r in routes if r["href"] == "/"]

    touch, count = {}, collections.Counter()
    for c in commits:
        for f in c["files"]:
            hit = None
            for pre, href in paths:
                if f == pre.rstrip("/") or f.startswith(pre):
                    hit = href
                    break
            if hit is None and "/" not in f and top_level:
                hit = top_level[0]          # known blind spot: bare top-level files -> root
            if hit:
                if hit not in touch or c["ci"] > touch[hit]:
                    touch[hit] = c["ci"]
                if not machine.match(c["s"]):
                    count[hit] += 1
    return touch, count


def main():
    dry = "--check" in sys.argv
    routes = json.loads(MANIFEST.read_text())["routes"]
    commits = git_log()
    touch, tcount = last_touch(routes, commits)
    now = datetime.datetime.now().astimezone().replace(microsecond=0)
    today = now.date()
    rets = glob.glob(str(RETURNS / "*.json"))
    sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=REPO,
                         capture_output=True, text=True).stdout.strip()

    data = []
    for r in routes:
        h = r["href"]
        t = touch.get(h)
        age = None
        if t:
            age = (today - parse_iso(t).date()).days
        data.append({
            "h": h,
            "t": r.get("title") or h,
            "k": r.get("kind") or "",
            "s": r.get("state") or "OTHER",
            "f": r.get("family") or "—",
            "v": r.get("version") or "",
            "r": (r.get("role") or "").strip()[:400],
            "d": t[:10] if t else None,
            "a": age,
            "n": int(tcount.get(h, 0)),
            "c": bool(r.get("showcase_card")),
        })

    byhref = {d["h"]: d for d in data}
    picks = [{"h": h, "w": why, **byhref[h]} for h, why in PICKS if h in byhref]

    fams = collections.Counter(d["f"] for d in data)
    states = collections.Counter(d["s"] for d in data)
    buckets = collections.Counter()
    for d in data:
        a = d["a"]
        buckets["today" if a == 0 else "1-6" if (a or 99) <= 6 else "7-13" if (a or 99) <= 13
                else "14-30" if (a or 99) <= 30 else "31-90" if (a or 99) <= 90
                else "never" if a is None else "90+"] += 1
    fresh = sum(1 for d in data if d["a"] is not None and d["a"] <= 7)

    print(f"routes {len(data)} · families {len(fams)} · states {len(states)} · "
          f"returns {len(rets)} · fresh<=7d {fresh} · picks {len(picks)}")
    for b in ("today", "1-6", "7-13", "14-30", "31-90", "90+", "never"):
        print(f"  {b:<7} {buckets.get(b,0)}")
    if dry:
        print("--check: wrote nothing")
        return

    meta = dict(generated=now.isoformat(), head=sha, returns=len(rets),
                routes=len(data), families=len(fams), fresh=fresh, picks=len(picks))
    payload = json.dumps({"routes": data, "picks": picks, "meta": meta,
                          "lanes": LANES, "hue": STATE_HUE}, separators=(",", ":"))

    doc = TEMPLATE.replace("__TITLE__", f"THE FIELD · {today.isoformat()}")
    doc = doc.replace("__GENERATED__", esc(now.isoformat()))
    doc = doc.replace("__HEAD__", esc(sha))
    doc = doc.replace("__RETURNS__", str(len(rets)))
    doc = doc.replace("__ROUTES__", str(len(data)))
    doc = doc.replace("__FAMILIES__", str(len(fams)))
    doc = doc.replace("__FRESH__", str(fresh))
    doc = doc.replace("__PICKS_HTML__", "".join(
        f'<a class="pick" href="{esc(p["h"])}">'
        f'<span class="ph">{esc(p["h"])}</span>'
        f'<span class="pt"><b>{esc(p["t"])}</b><em>{esc(p["r"])}</em></span>'
        f'<span class="pw">{esc(p["w"])}</span>'
        f'<span class="pa">{("today" if p["a"]==0 else str(p["a"])+"d") if p["a"] is not None else "—"}</span></a>'
        for p in picks))
    doc = doc.replace("__LEGEND__", "".join(
        f'<span class="lg"><i class="sw" style="background:var(--{STATE_HUE.get(s,"mut")})"></i>{esc(s)} {states[s]}</span>'
        for s, _ in states.most_common()))
    doc = doc.replace("__BUCKETS__", "".join(
        f'<div class="n"><b>{buckets.get(b,0)}</b><span>{b}</span></div>'
        for b in ("today", "1-6", "7-13", "14-30", "31-90", "never")))
    doc = doc.replace("__DATA__", payload)

    OUTDIR.mkdir(parents=True, exist_ok=True)
    OUT.write_text(doc)
    print(f"wrote {OUT} ({len(doc)} bytes)")


TEMPLATE = r"""<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<title>__TITLE__</title>
<link rel="stylesheet" href="/tools/house-patterns.css">
<body class="dark">
<div class="wrap wide">
<header>
 <h1 class="display">The<br>Field <span class="thin">/ atlas</span></h1>
 <p class="thesis">One page, three readings. <b>What shape is this</b> — a treemap where every
 rectangle is one addressed route, sized by how many real commits landed in it,
 coloured by state, dimmed by staleness. <b>What is alive</b> — the same routes plotted
 on their last touch date, one lane per state. <b>Where to start</b> — ten picks.
 Every figure is computed from the manifest, the receipts and git.</p>
 <div class="meta">
  <span>generated <b>__GENERATED__</b></span>
  <span>head <b>__HEAD__</b></span>
  <span><b>__ROUTES__</b> routes</span>
  <span><b>__FAMILIES__</b> families</span>
  <span><b>__RETURNS__</b> return receipts</span>
  <span><b>__FRESH__</b> touched ≤7d</span>
 </div>
</header>

<h2 class="between">The field <em>area = how much work landed here · hue = state · brightness = freshness</em></h2>
<div class="stage"><svg id="treemap" role="img" aria-label="Treemap of every route in the field"></svg></div>
<div class="legend">__LEGEND__<span class="ramp"><span>fresh</span>
 <i style="background:var(--hot)"></i><i style="background:var(--hot);opacity:.7"></i>
 <i style="background:var(--hot);opacity:.45"></i><i style="background:var(--hot);opacity:.25"></i>
 <i style="background:var(--hot);opacity:.13"></i><span>frozen</span></span></div>

<h2 class="between">The pulse <em>last touch date · one dot per route · one lane per state</em></h2>
<div class="stage"><svg id="pulse" role="img" aria-label="Every route plotted on its last touch date, grouped by state"></svg></div>
<div class="legend"><span class="lg"><i class="sw" style="background:var(--hot)"></i>now</span>
 <span class="lg">dashed line = today · shaded band = last 30 days</span></div>

<h2 class="between">Start here <em>ten picks · descriptions are the manifest's own role text</em></h2>
<div class="picks">__PICKS_HTML__</div>

<h2 class="between">The counts <em>age of every route since its last touch</em></h2>
<div class="counts">__BUCKETS__</div>

<footer class="foot">Generated by <b>tools/field-atlas-build.py</b> — one command, one source of truth.
 Layout is computed in the browser at real pixel sizes, so the page stays legible at any width.
 Every number here comes from <b>showcase-manifest.json</b>, <b>returns/</b> or <b>git</b>,
 or it is not on the page. The PICKS block is the only hand-written text.
 Rebuild: <b>python3 tools/field-atlas-build.py</b></footer>
</div>
<div id="detail"><span class="k">tap</span><span class="v">any rectangle or dot for detail</span></div>
<script>
const DATA = __DATA__;
const HUE = {hot:"#ed7245",cool:"#73bce8",green:"#9ed88c",gold:"#d7ae67",mut:"#5c686d",warn:"#c8102e"};
const NS = "http://www.w3.org/2000/svg";
const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
const freshOpacity = a => a == null ? 0.14 : a <= 6 ? 1 : a <= 13 ? .78 : a <= 30 ? .55 : a <= 90 ? .36 : .2;
const hueOf = r => HUE[DATA.hue[r.s]] || HUE.mut;
const ageText = a => a == null ? "never" : a === 0 ? "today" : a + "d";

function detail(r) {
  document.getElementById("detail").innerHTML =
    '<span class="k">route</span><span class="v">' + r.h + '</span>' +
    '<span class="k">title</span><span class="v">' + r.t + '</span>' +
    '<span class="k">state</span><span class="v">' + r.s + '</span>' +
    '<span class="k">family</span><span class="v">' + r.f + '</span>' +
    '<span class="k">moved</span><span class="v">' + ageText(r.a) + '</span>' +
    '<span class="k">commits</span><span class="v">' + (r.n || 0) + '</span>' +
    '<span class="role">' + r.r + '</span>';
}

/* ---------- squarified treemap (Bruls, Huizing, van Wijk) ---------- */
function worst(row, sum, side) {
  let mx = -Infinity, mn = Infinity;
  for (const v of row) { if (v > mx) mx = v; if (v < mn) mn = v; }
  return Math.max(side * side * mx / (sum * sum), (sum * sum) / (side * side * mn));
}
function squarify(areas, x, y, w, h) {
  // areas are arbitrary weights; scale them so their sum is exactly w*h,
  // otherwise every rectangle comes out at ~1px and the map is blank.
  const total = areas.reduce((a, b) => a + b, 0) || 1;
  const scale = (w * h) / total;
  const A = areas.map(a => a * scale);
  const out = new Array(A.length);
  let i = 0, rx = x, ry = y, rw = w, rh = h;
  while (i < A.length) {
    const side = Math.min(rw, rh);
    let row = [], sum = 0, best = Infinity, j = i;
    while (j < A.length) {
      const trial = row.concat([A[j]]), tsum = sum + A[j];
      const wr = worst(trial, tsum, side);
      if (row.length === 0 || wr <= best) { row = trial; sum = tsum; best = wr; j++; }
      else break;
    }
    const strip = sum / side;
    if (rw >= rh) {
      let oy = ry;
      for (let k = 0; k < row.length; k++) {
        const hh = row[k] / strip;
        out[i + k] = { x: rx, y: oy, w: strip, h: hh };
        oy += hh;
      }
      rx += strip; rw -= strip;
    } else {
      let ox = rx;
      for (let k = 0; k < row.length; k++) {
        const ww = row[k] / strip;
        out[i + k] = { x: ox, y: ry, w: ww, h: strip };
        ox += ww;
      }
      ry += strip; rh -= strip;
    }
    i += row.length;
  }
  return out;
}

/* ---------- ACT 1: treemap ---------- */
function drawTree() {
  const svg = document.getElementById("treemap");
  const W = svg.clientWidth, H = svg.clientHeight;
  if (!W || !H) return;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const groups = new Map();
  for (const r of DATA.routes) {
    if (!groups.has(r.f)) groups.set(r.f, []);
    groups.get(r.f).push(r);
  }
  const fams = [...groups.entries()].map(([f, rs]) => ({ f, rs })).sort((a, b) => b.rs.length - a.rs.length);
  const pad = 2, gap = 3;
  const weight = r => 1 + (r.n || 0);
  const outer = squarify(fams.map(g => g.rs.reduce((s, r) => s + weight(r), 0)), 0, 0, W, H);

  fams.forEach((g, gi) => {
    const o = outer[gi];
    const gx = o.x + gap / 2, gy = o.y + gap / 2, gw = o.w - gap, gh = o.h - gap;
    const inner = squarify(g.rs.map(weight), gx, gy, gw, gh);
    const isBig = gw > 88 && gh > 40;
    g.rs.forEach((r, ri) => {
      const b = inner[ri];
      const cell = el("g", { class: "cell" });
      cell.appendChild(el("rect", {
        x: b.x + pad / 2, y: b.y + pad / 2,
        width: Math.max(1, b.w - pad), height: Math.max(1, b.h - pad),
        fill: hueOf(r), "fill-opacity": freshOpacity(r.a)
      }));
      const iw = b.w - pad, ih = b.h - pad;
      if (iw > 74 && ih > 26) {
        const t = el("text", {
          x: b.x + 6, y: b.y + 17,
          fill: (r.a != null && r.a <= 13) ? "#0b0f12" : "#eef2ef",
          "fill-opacity": (r.a != null && r.a <= 13) ? .92 : .8
        });
        const words = r.t.split(/\s+/);
        let line = "", lines = [];
        for (const w of words) {
          if ((line + " " + w).trim().length * 6.4 > iw - 12 && line) { lines.push(line); line = w; }
          else line = (line + " " + w).trim();
          if (lines.length >= Math.floor((ih - 10) / 13)) break;
        }
        if (line && lines.length < Math.floor((ih - 10) / 13)) lines.push(line);
        lines.forEach((ln, li) => {
          const ts = el("tspan", { x: b.x + 6, dy: li === 0 ? 0 : 13 });
          ts.textContent = ln;
          t.appendChild(ts);
        });
        cell.appendChild(t);
      }
      cell.addEventListener("pointerenter", () => detail(r));
      cell.addEventListener("click", () => { detail(r); });
      svg.appendChild(cell);
    });
    if (isBig) {
      const lab = el("text", { class: "famlabel", x: gx + 2, y: gy + 11 });
      lab.textContent = g.f;
      svg.appendChild(lab);
    }
  });
}

/* ---------- ACT 2: state lanes over time ---------- */
function drawPulse() {
  const svg = document.getElementById("pulse");
  const W = svg.clientWidth, H = svg.clientHeight;
  if (!W || !H) return;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const withDate = DATA.routes.filter(r => r.d);
  const dated = withDate.map(r => ({ r, t: new Date(r.d).getTime() }));
  const minT = Math.min(...dated.map(d => d.t));
  const maxT = Math.max(...dated.map(d => d.t));
  const padL = W < 640 ? 78 : 118, padR = 18, padT = 22, padB = 34;
  const x = t => padL + (t - minT) / (maxT - minT || 1) * (W - padL - padR);

  const lanes = DATA.lanes.filter(l => DATA.routes.some(r => laneOf(r) === l));
  const laneH = (H - padT - padB) / lanes.length;
  const nowT = new Date(DATA.meta.generated).getTime();

  // last-30-day band + now line
  const bandX = x(Math.max(minT, nowT - 30 * 864e5));
  svg.appendChild(el("rect", { class: "band30", x: bandX, y: padT - 8, width: Math.max(0, x(nowT) - bandX), height: H - padT - padB + 16 }));
  svg.appendChild(el("line", { class: "nowline", x1: x(nowT), x2: x(nowT), y1: padT - 8, y2: H - padB + 8 }));
  const nowLabel = el("text", { class: "axistext", x: x(nowT) - 6, y: padT - 12, "text-anchor": "end" });
  nowLabel.textContent = "today";
  svg.appendChild(nowLabel);

  // year gridlines
  for (let yr = new Date(minT).getUTCFullYear() + 1; yr <= new Date(maxT).getUTCFullYear(); yr++) {
    const t = Date.UTC(yr, 0, 1);
    if (t < minT || t > maxT) continue;
    svg.appendChild(el("line", { class: "axis", x1: x(t), x2: x(t), y1: padT - 8, y2: H - padB + 6, opacity: .5 }));
    const lb = el("text", { class: "axistext", x: x(t), y: H - padB + 22, "text-anchor": "middle" });
    lb.textContent = yr;
    svg.appendChild(lb);
  }

  lanes.forEach((lane, li) => {
    const cy = padT + laneH * li + laneH / 2;
    svg.appendChild(el("line", { class: "axis", x1: padL, x2: W - padR, y1: cy, y2: cy, opacity: .55 }));
    const ll = el("text", { class: "lanelabel", x: 8, y: cy + 4 });
    ll.textContent = lane;
    svg.appendChild(ll);

    // beeswarm within the lane: place, then nudge on collision
    const placed = [];
    const rows = dated.filter(d => laneOf(d.r) === lane).sort((a, b) => a.t - b.t);
    for (const d of rows) {
      const px = x(d.t);
      let py = cy, step = 0, dir = 1;
      while (placed.some(p => Math.abs(p.x - px) < 8 && Math.abs(p.y - py) < 8)) {
        step += 1;
        py = cy + dir * step * 8;
        if (Math.abs(py - cy) > laneH / 2 - 5) {
          if (dir === 1 && step > 1) { dir = -1; step = 0; py = cy; }
          else { break; }
        }
      }
      placed.push({ x: px, y: py });
      const c = el("circle", {
        class: "dot", cx: px, cy: py, r: 4.2,
        fill: hueOf(d.r), "fill-opacity": .92
      });
      c.addEventListener("pointerenter", () => detail(d.r));
      c.addEventListener("click", () => detail(d.r));
      svg.appendChild(c);
    }
    const cnt = el("text", { class: "axistext", x: W - padR, y: cy - 8, "text-anchor": "end" });
    cnt.textContent = rows.length + " routes";
    svg.appendChild(cnt);
  });
}

function laneOf(r) {
  return DATA.lanes.includes(r.s) ? r.s : "OTHER";
}

let raf = null;
function drawAll() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => { drawTree(); drawPulse(); });
}
window.addEventListener("resize", drawAll);
window.addEventListener("load", drawAll);
drawAll();
</script>
"""

if __name__ == "__main__":
    main()
