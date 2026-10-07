#!/usr/bin/env python3
"""temp-pages.py — expiry + holding-pen lifecycle for throwaway dated pages.

Registry: control/TEMP_PAGES.json (schema temp-pages/v1)
Holding pen: _archive/temp/<expires>/<dir>/ with *.html renamed to *.html.frozen

Subcommand flags (read-only by default):
  --check            print the registry table + summary. Writes nothing. Exit 0,
                     or exit 1 when a dated page dir on disk has no registry entry
                     (drift: it would never expire).
  --build            regenerate temp/index.html (computed countdowns, no baked numbers).
  --sweep [--dry-run]  move expired live pages to the holding pen, freeze their
                     HTML, mark them archived in the registry, rebuild the index,
                     then print the validate-public.mjs verdict.
  --retire DIR... [--dry-run]  move NAMED live pages to the holding pen NOW (before
                     expiry), freeze their HTML, mark archived, rebuild, validate.

Nothing is ever deleted: sweep is git mv + rename only, reversible with git mv back.
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
REGISTRY = REPO / "control" / "TEMP_PAGES.json"
INDEX = REPO / "temp" / "index.html"

VALIDATE_CMD = ["node", "tools/validate-public.mjs"]

# A dated page is any top-level dir named YYYYMMDD-… that carries its own index.html.
DATED_DIR = re.compile(r"^\d{8}-")



# ---------------------------------------------------------------- registry I/O

def load_registry() -> dict:
    with REGISTRY.open(encoding="utf-8") as fh:
        reg = json.load(fh)
    if reg.get("schema") != "temp-pages/v1":
        raise SystemExit(f"unexpected registry schema: {reg.get('schema')!r}")
    return reg


def save_registry(reg: dict) -> None:
    reg["updated"] = (
        datetime.datetime.now().astimezone().replace(microsecond=0).isoformat()
    )
    with REGISTRY.open("w", encoding="utf-8") as fh:
        json.dump(reg, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


# ---------------------------------------------------------------- date helpers

def today() -> datetime.date:
    return datetime.date.today()


def days_left(page: dict, now: datetime.date) -> int | None:
    """Days until expiry; negative => expired. None if unparseable."""
    try:
        exp = datetime.date.fromisoformat(page["expires"])
    except (KeyError, ValueError):
        return None
    return (exp - now).days


def days_label(page: dict, now: datetime.date) -> str:
    n = days_left(page, now)
    if n is None:
        return "?"
    if n < 0:
        return "EXPIRED"
    return f"{n}d"


# ---------------------------------------------------------------- --check

def unregistered(reg: dict) -> list[str]:
    """Dated page dirs on disk that the registry does not know about.

    Without this the registry drifts silently: a new YYYYMMDD-* dir gets a manifest
    route (the public gate forces that) but never gets an expiry, so the holding pen
    is incomplete and the page lives forever. Drift has to be loud, not implied.
    """
    known = {p.get("dir") for p in reg.get("pages", [])}
    out = []
    for child in sorted(REPO.iterdir()):
        if not child.is_dir() or not DATED_DIR.match(child.name):
            continue
        if child.name in known:
            continue
        if not (child / "index.html").exists():
            continue
        out.append(child.name)
    return out


def _first_tag(text: str, tag: str) -> str:
    m = re.search(rf"<{tag}[^>]*>(.*?)</{tag}>", text, re.I | re.S)
    return re.sub(r"\s+", " ", m.group(1)).strip() if m else ""


def derive_entry(name: str, reg: dict) -> dict:
    """Build a registry entry for an unregistered dated dir from what is on disk.

    Derives everything derivable (title, description, created) and refuses to
    invent the rest: owner stays 'unassigned' because the dir name suffix is who
    the page is FOR (…-mcvoid), not who made it.
    """
    d = REPO / name
    text = (d / "index.html").read_text(encoding="utf-8", errors="replace")
    title = _first_tag(text, "title") or name
    desc = ""
    m = re.search(
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', text, re.I | re.S
    )
    if m:
        desc = re.sub(r"\s+", " ", m.group(1)).strip()

    created = f"{name[0:4]}-{name[4:6]}-{name[6:8]}"
    try:
        out = subprocess.run(
            ["git", "log", "--format=%cI", "-1", "--", f"{name}/"],
            cwd=REPO, capture_output=True, text=True,
        )
        if out.stdout.strip():
            created = out.stdout.strip()[:10]
        datetime.date.fromisoformat(created)
    except Exception:
        created = f"{name[0:4]}-{name[4:6]}-{name[6:8]}"

    ret = int(reg.get("retention_days", 30) or 30)
    expires = (datetime.date.fromisoformat(created) + datetime.timedelta(days=ret)).isoformat()
    return {
        "dir": name,
        "title": title,
        "owner": "unassigned",
        "created": created,
        "expires": expires,
        "status": "live",
        "what": desc or "Dated page adopted by temp-pages.py --adopt. Set owner and what.",
        "superseded_by": None,
    }


def cmd_adopt(reg: dict) -> int:
    """Register every unregistered dated dir, then rebuild and re-check.

    Drift reporting alone leaves a chore behind. Adoption closes it in one
    command so the check can be green, and the registry can never silently
    miss a page again.
    """
    missing = unregistered(reg)
    if not missing:
        print("nothing to adopt: every dated page dir on disk is already registered")
        return 0
    for name in missing:
        entry = derive_entry(name, reg)
        reg["pages"].append(entry)
        print(f"adopted {name}  ->  expires {entry['expires']}  owner {entry['owner']}")
    save_registry(reg)
    cmd_build(reg)
    print()
    return cmd_check(reg)


def cmd_check(reg: dict) -> int:
    now = today()
    rows = []
    for p in reg["pages"]:
        rows.append([
            p.get("dir", "?"),
            p.get("title", "?"),
            p.get("owner", "?"),
            p.get("created", "?"),
            p.get("expires", "?"),
            days_label(p, now),
            p.get("status", "?"),
        ])
    headers = ["dir", "title", "owner", "created", "expires", "days-left", "status"]
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(str(cell)))

    def fmt(row):
        return "  ".join(str(cell).ljust(widths[i]) for i, cell in enumerate(row))

    print(fmt(headers))
    print(fmt(["-" * w for w in widths]))
    for row in rows:
        print(fmt(row))

    live = [p for p in reg["pages"] if p.get("status") == "live"]
    archived = [p for p in reg["pages"] if p.get("status") == "archived"]
    upcoming = sorted(
        ((n, p) for p in live if (n := days_left(p, now)) is not None),
        key=lambda t: (t[0], t[1].get("dir", "")),
    )
    expired = [p for n, p in upcoming if n < 0]
    soonest = next((p for n, p in upcoming if n >= 0), None)
    if soonest:
        next_bit = (
            f"next expiry {soonest['expires']} ({days_left(soonest, now)}d)"
        )
    else:
        next_bit = "no upcoming expiry"
    print()
    print(
        f"{len(reg['pages'])} pages · {len(live)} live · {len(archived)} archived · "
        f"{len(expired)} expired · {next_bit} · "
        f"retention {reg.get('retention_days', '?')}d · "
        f"holding pen {reg.get('holding_pen', '?')}"
    )

    # drift is a defect, not a footnote: a dated page outside the registry has no
    # expiry and will never reach the holding pen. Report it and fail the check.
    missing = unregistered(reg)
    if missing:
        print()
        print(f"DRIFT — {len(missing)} dated page dir(s) on disk with no registry entry:")
        for name in missing:
            print(f"  + {name}")
        print("add them to control/TEMP_PAGES.json (owner, created, expires) so they expire too")
        return 1
    return 0


# ---------------------------------------------------------------- --build

def _esc(s: str) -> str:
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def cmd_build(reg: dict) -> None:
    now = today()
    now_stamp = datetime.datetime.now().astimezone().replace(microsecond=0).isoformat()
    live = [p for p in reg["pages"] if p.get("status") == "live"]
    pen = [p for p in reg["pages"] if p.get("status") == "archived"]
    live.sort(key=lambda p: (p.get("expires", ""), p.get("dir", "")))
    pen.sort(key=lambda p: (p.get("expires", ""), p.get("dir", "")))

    expired_live = sum(1 for p in live if (days_left(p, now) or 0) < 0)
    with_days = [(n, p) for p in live if (n := days_left(p, now)) is not None]
    upcoming = sorted(
        ((n, p) for n, p in with_days if n >= 0),
        key=lambda t: (t[0], t[1].get("dir", "")),
    )
    next_bit = (
        f"next expiry {upcoming[0][1]['expires']} ({upcoming[0][0]}d)"
        if upcoming
        else "no upcoming expiry"
    )

    def live_row(p: dict) -> str:
        n = days_left(p, now)
        if n is None:
            cd = '<b class="unk">?</b>'
        elif n < 0:
            cd = f'<b class="exp">EXPIRED {abs(n)}d ago</b>'
        else:
            cd = f'<b class="ok">{n}d</b> left'
        sup = p.get("superseded_by")
        sup_bit = (
            f'<div class="sup">superseded by {_esc(sup)}</div>' if sup else ""
        )
        return f"""      <article class="entry">
        <h2><a href="/{_esc(p['dir'])}/">{_esc(p['title'])}</a></h2>
        <div class="meta">
          <span class="dir">/{_esc(p['dir'])}/</span>
          <span>owner <b>{_esc(p.get('owner', '?'))}</b></span>
          <span>created <b>{_esc(p.get('created', '?'))}</b></span>
          <span>expires <b>{_esc(p.get('expires', '?'))}</b> · {cd}</span>
        </div>
        <p class="what">{_esc(p.get('what', ''))}</p>
        {sup_bit}
      </article>"""

    def pen_row(p: dict) -> str:
        loc = f"{reg.get('holding_pen', '_archive/temp')}/{p.get('expires', '?')}/{p.get('dir', '?')}/"
        return f"""      <article class="entry pen">
        <h2>{_esc(p['title'])}</h2>
        <div class="meta">
          <span class="dir">/{_esc(p['dir'])}/</span>
          <span>owner <b>{_esc(p.get('owner', '?'))}</b></span>
          <span>expired <b>{_esc(p.get('expires', '?'))}</b></span>
          <span>frozen at <b>{_esc(loc)}</b></span>
        </div>
        <p class="what">{_esc(p.get('what', ''))}</p>
      </article>"""

    live_html = "\n".join(live_row(p) for p in live) or (
        '      <p class="empty">no live temp pages</p>'
    )
    pen_html = "\n".join(pen_row(p) for p in pen) or (
        '      <p class="empty">the pen is empty</p>'
    )

    html = f"""<!doctype html>
<html lang="en" class="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>temp pages · holding pen</title>
<link rel="stylesheet" href="/tools/house-patterns.css">
</head>
<body>
  <h1>temp pages · holding pen</h1>
  <p class="sub">
    retention <b>{reg.get('retention_days', '?')}d</b> ·
    live <b>{len(live)}</b> ·
    in the pen <b>{len(pen)}</b> ·
    expired-but-live <b>{expired_live}</b> ·
    {next_bit}
  </p>
  <h2>live</h2>
{live_html}
  <h2>in the pen (frozen)</h2>
{pen_html}
  <p class="foot">
    generated {now_stamp} by <code>tools/temp-pages.py --build</code> from
    <code>control/TEMP_PAGES.json</code> · noindex · expired pages move to
    <code>{_esc(reg.get('holding_pen', '_archive/temp'))}/&lt;expires&gt;/&lt;dir&gt;/</code>
    with <code>*.html</code> frozen as <code>*.html.frozen</code> · nothing is ever deleted.
  </p>
</body>
</html>
"""
    INDEX.parent.mkdir(parents=True, exist_ok=True)
    INDEX.write_text(html, encoding="utf-8")
    print(f"wrote {INDEX.relative_to(REPO)} "
          f"({len(html)} bytes, {len(live)} live, {len(pen)} in the pen, "
          f"{expired_live} expired-but-live)")


# ---------------------------------------------------------------- --sweep

def git_mv(src: Path, dst: Path, dry_run: bool, log: list[str]) -> bool:
    rel_src = src.relative_to(REPO)
    rel_dst = dst.relative_to(REPO)
    line = f"git mv {rel_src} -> {rel_dst}"
    log.append(line)
    if dry_run:
        return True
    dst.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(
        ["git", "mv", str(rel_src), str(rel_dst)],
        cwd=REPO, capture_output=True, text=True,
    )
    if r.returncode != 0:
        # untracked file: fall back to a plain move (still reversible by hand)
        log.append(f"  (git mv failed: {r.stderr.strip() or r.stdout.strip()}; using plain mv)")
        dst.parent.mkdir(parents=True, exist_ok=True)
        src.rename(dst)
    return True


def cmd_sweep(reg: dict, dry_run: bool) -> None:
    now = today()
    pen_root = REPO / reg.get("holding_pen", "_archive/temp")
    log: list[str] = []
    moved = 0

    for page in reg["pages"]:
        if page.get("status") != "live":
            continue
        n = days_left(page, now)
        if n is None or n >= 0:
            continue
        src = REPO / page["dir"]
        if not src.is_dir():
            print(f"skip {page['dir']}: not present on disk")
            continue
        dst = pen_root / page["expires"] / page["dir"]
        print(f"EXPIRED {page['dir']} (expires {page['expires']}, {-n}d ago)")
        git_mv(src, dst, dry_run, log)
        # freeze every *.html inside so the dir stops being a directory index surface
        for html_file in sorted(dst.glob("*.html")) if not dry_run else sorted(src.glob("*.html")):
            frozen = html_file.with_name(html_file.name + ".frozen")
            log.append(f"  freeze {html_file.relative_to(REPO)} -> {frozen.relative_to(REPO)}")
            if not dry_run:
                r = subprocess.run(
                    ["git", "mv", str(html_file.relative_to(REPO)), str(frozen.relative_to(REPO))],
                    cwd=REPO, capture_output=True, text=True,
                )
                if r.returncode != 0:
                    html_file.rename(frozen)
        if not dry_run:
            page["status"] = "archived"
        moved += 1

    for line in log:
        print(line)

    if moved == 0:
        print("nothing to sweep: no live page is past its expiry")
    elif dry_run:
        print(f"dry-run: {moved} page(s) would move to {reg.get('holding_pen', '_archive/temp')}/<expires>/<dir>/ "
              f"and have *.html frozen as *.html.frozen — nothing moved")
        return
    else:
        print(f"swept {moved} page(s) into {reg.get('holding_pen', '_archive/temp')}/ — nothing deleted, "
              f"reversible with git mv back")
        save_registry(reg)
        cmd_build(reg)

    # any mutation (or the sweep decision) ends with the gate verdict
    print_validate()


def print_validate() -> None:
    r = subprocess.run(VALIDATE_CMD, cwd=REPO, capture_output=True, text=True)
    verdict = (r.stdout + r.stderr).strip()
    print()
    print(f"$ {' '.join(VALIDATE_CMD)}  -> exit {r.returncode}")
    print(verdict)


# ---------------------------------------------------------------- --retire

def cmd_retire(reg: dict, dirs: list[str], dry_run: bool) -> None:
    pen_root = REPO / reg.get("holding_pen", "_archive/temp")
    log: list[str] = []
    moved = 0

    for name in dirs:
        page = next((p for p in reg["pages"] if p.get("dir") == name), None)
        if page is None:
            print(f"skip {name}: not in the registry (run --adopt first)")
            continue
        if page.get("status") != "live":
            print(f"skip {name}: already {page.get('status')}")
            continue
        src = REPO / page["dir"]
        if not src.is_dir():
            print(f"skip {name}: not present on disk")
            continue
        dst = pen_root / page["expires"] / page["dir"]
        print(f"RETIRE {name} (expires {page['expires']}, retired early)")
        git_mv(src, dst, dry_run, log)
        for html_file in sorted(dst.glob("*.html")) if not dry_run else sorted(src.glob("*.html")):
            frozen = html_file.with_name(html_file.name + ".frozen")
            log.append(f"  freeze {html_file.relative_to(REPO)} -> {frozen.relative_to(REPO)}")
            if not dry_run:
                r = subprocess.run(
                    ["git", "mv", str(html_file.relative_to(REPO)), str(frozen.relative_to(REPO))],
                    cwd=REPO, capture_output=True, text=True,
                )
                if r.returncode != 0:
                    html_file.rename(frozen)
        if not dry_run:
            page["status"] = "archived"
        moved += 1

    for line in log:
        print(line)

    if moved == 0:
        print("nothing to retire")
    elif dry_run:
        print(f"dry-run: {moved} page(s) would move to {reg.get('holding_pen', '_archive/temp')}/<expires>/<dir>/ "
              f"and have *.html frozen — nothing moved")
        return
    else:
        print(f"retired {moved} page(s) into {reg.get('holding_pen', '_archive/temp')}/ — nothing deleted, "
              f"reversible with git mv back")
        save_registry(reg)
        cmd_build(reg)

    print_validate()


# ---------------------------------------------------------------- main

def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(
        prog="temp-pages.py",
        description="expiry + holding-pen lifecycle for throwaway dated pages (read-only by default)",
    )
    grp = ap.add_mutually_exclusive_group(required=True)
    grp.add_argument("--check", action="store_true", help="print registry table + summary; writes nothing")
    grp.add_argument("--build", action="store_true", help="regenerate temp/index.html")
    grp.add_argument("--sweep", action="store_true", help="move expired live pages to the holding pen and freeze them")
    grp.add_argument("--retire", nargs="+", metavar="DIR", help="move NAMED live page dir(s) to the holding pen now and freeze them")
    grp.add_argument("--adopt", action="store_true", help="register every unregistered dated page dir, then rebuild and re-check")
    ap.add_argument("--dry-run", action="store_true", help="with --sweep/--retire: print planned moves, move nothing")
    args = ap.parse_args(argv)

    if args.dry_run and not (args.sweep or args.retire):
        ap.error("--dry-run only applies to --sweep or --retire")

    reg = load_registry()
    if args.check:
        return cmd_check(reg)
    elif args.build:
        cmd_build(reg)
        print_validate()
    elif args.sweep:
        cmd_sweep(reg, args.dry_run)
    elif args.retire:
        cmd_retire(reg, args.retire, args.dry_run)
    elif args.adopt:
        return cmd_adopt(reg)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
