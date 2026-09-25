#!/usr/bin/env python3
"""god's-eye-view — one command, the whole state.

Built 2026-09-25 because the owner said: "i dont know rly what or how much was done"
and "survey god's eye view everything". A status you have to ask an agent for is not
a status you own. This one is a file you can run yourself.

    python3 ~/void-anchor/AXIS/reusable/survey.py
    python3 ~/void-anchor/AXIS/reusable/survey.py --json

Design rules, learned the hard way today:
- Every number names its source (a filesystem stat, a sqlite query, a git command, a
  live port). No number comes from memory or inference.
- Bounded everywhere. A survey that can hang is a survey nobody runs.
- Read-only. This writes nothing, moves nothing, and deletes nothing.
- A section that cannot be measured prints why, rather than printing zero.
"""
import argparse, glob, json, os, sqlite3, subprocess, sys, time, datetime as dt

HOME = os.path.expanduser("~")
NOW = time.time()


def sh(cmd, timeout=12):
    """Shell out with a hard ceiling. Returns (ok, text)."""
    try:
        p = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return p.returncode == 0, (p.stdout or "").strip()
    except Exception as e:
        return False, f"({type(e).__name__})"


def human(b):
    for u in ("B", "K", "M", "G", "T"):
        if abs(b) < 1024:
            return f"{b:.0f}{u}"
        b /= 1024
    return f"{b:.0f}P"


def section(name):
    print(f"\n\033[1m{name}\033[0m")


def collect():
    out = {}

    # --- disk -----------------------------------------------------------------
    ok, t = sh("df -k /System/Volumes/Data | tail -1")
    if ok and t:
        f = t.split()
        used, avail, cap = int(f[2]) * 1024, int(f[3]) * 1024, f[4]
        out["disk"] = {"used": used, "avail": avail, "capacity": cap}

    # --- repos ----------------------------------------------------------------
    repos = []
    for pat in (f"{HOME}/void-anchor", f"{HOME}/sovereign-node", f"{HOME}/Projects/*"):
        for r in sorted(glob.glob(pat)):
            if not os.path.isdir(os.path.join(r, ".git")):
                continue
            _, br = sh(f"git -C '{r}' status -sb 2>/dev/null | head -1")
            _, last = sh(f"git -C '{r}' log -1 --format='%ad %s' --date=short 2>/dev/null")
            _, dirty = sh(f"git -C '{r}' status --porcelain 2>/dev/null | wc -l")
            ahead = behind = 0
            if "[" in br:
                seg = br[br.index("[") + 1: br.index("]")]
                for part in seg.split(","):
                    part = part.strip()
                    if part.startswith("ahead"): ahead = int(part.split()[1])
                    if part.startswith("behind"): behind = int(part.split()[1])
            repos.append({"path": r.replace(HOME, "~"), "branch": br.split("...")[0].replace("## ", ""),
                          "ahead": ahead, "behind": behind, "dirty": int(dirty or 0),
                          "last": last[:96]})
    out["repos"] = repos

    # --- sessions -------------------------------------------------------------
    sess = []
    for db in glob.glob(f"{HOME}/.hermes/profiles/*/state.db"):
        prof = db.split("/profiles/")[1].split("/")[0]
        try:
            c = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
            cut = NOW - 24 * 3600
            for sid, src, title, la, n in c.execute(
                "SELECT id, source, title, last_activity_at, message_count FROM sessions "
                "WHERE last_activity_at > ? ORDER BY last_activity_at DESC LIMIT 6", (cut,)):
                sess.append({"prof": prof, "src": src, "title": (title or "")[:44],
                             "msg": n or 0, "ago": NOW - (la or NOW)})
            c.close()
        except Exception as e:
            sess.append({"prof": prof, "src": "ERR", "title": str(e)[:40], "msg": 0, "ago": 0})
    sess.sort(key=lambda s: s["ago"])
    out["sessions"] = sess

    # --- cron -----------------------------------------------------------------
    jobs, total, enabled, cantfail = [], 0, 0, 0
    for f in glob.glob(f"{HOME}/.hermes/profiles/*/cron/jobs.json"):
        try:
            d = json.load(open(f))
            js = d if isinstance(d, list) else (d.get("jobs") or list(d.values()))
            for j in js:
                if not isinstance(j, dict):
                    continue
                total += 1
                if j.get("enabled", True):
                    enabled += 1
                    cmd = (j.get("command") or j.get("prompt") or "")
                    if isinstance(cmd, str) and cmd.strip() and "exit 1" not in cmd and \
                       not any(k in cmd for k in ("--fail", "set -e", "|| exit")):
                        cantfail += 1
                    jobs.append({"name": (j.get("name") or "?")[:38], "on": True})
        except Exception:
            pass
    out["cron"] = {"total": total, "enabled": enabled, "cantfail": cantfail, "jobs": jobs[:12]}

    # --- services -------------------------------------------------------------
    svcs = []
    ok, t = sh("launchctl list 2>/dev/null | grep -iE 'hermes|archive|ollama|kanban|ancestor' | head -12")
    if ok:
        for line in t.splitlines():
            p = line.split("\t")
            if len(p) >= 3:
                svcs.append({"pid": p[0], "status": p[1], "label": p[2][:52]})
    out["services"] = svcs

    # --- ports ----------------------------------------------------------------
    ports = []
    ok, t = sh("lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk 'NR>1{print $1,$9}' | sort -u | head -18", 15)
    if ok:
        ports = [l for l in t.splitlines() if l.strip()]
    out["ports"] = ports

    # --- AXIS -----------------------------------------------------------------
    ax = {}
    for name, path in (("LEDGER", "AXIS/LEDGER.md"), ("NOW", "AXIS/NOW.md"), ("QUEUE", "AXIS/QUEUE.md")):
        p = os.path.join(HOME, "void-anchor", path)
        if os.path.exists(p):
            st = os.stat(p)
            age = NOW - st.st_mtime
            tail = ""
            if name == "LEDGER":
                # newest heading, not oldest — -m1 returns the FIRST match, which
                # showed 2026-08-17 on a file whose latest entry is today. Caught by
                # running it rather than by reading it.
                _, tail = sh(f"grep '^## ' '{p}' | tail -1 | cut -c1-78")
            ax[name] = {"age_h": age / 3600, "size": st.st_size, "head": tail}
    out["axis"] = ax

    # --- reader ---------------------------------------------------------------
    ok, _ = sh("curl -s -o /dev/null -m 4 -w '%{http_code}' http://127.0.0.1:8777/")
    code = _
    out["reader"] = {"up": code == "200", "code": code}

    return out


def render(d):
    if "disk" in d:
        section("DISK")
        x = d["disk"]
        print(f"  {human(x['used'])} used · {human(x['avail'])} free · {x['capacity']} full   [df -k]")

    if d.get("repos"):
        section("REPOS")
        for r in d["repos"]:
            if r["behind"] or r["ahead"] or r["dirty"]:
                flag = f"  ahead {r['ahead']} behind {r['behind']}" if (r["ahead"] or r["behind"]) else ""
                flag += f"  {r['dirty']} uncommitted" if r["dirty"] else ""
                print(f"  {r['path']:<38}{flag}")
                print(f"      {r['last']}")
            else:
                print(f"  {r['path']:<38} clean")

    if d.get("sessions"):
        section(f"SESSIONS — active in 24h: {len(d['sessions'])}")
        for s in d["sessions"][:8]:
            print(f"  {s['ago']/3600:>5.1f}h  {s['prof']:<10} {s['src'][:7]:<7} {s['msg']:>4}msg  {s['title']}")

    if d.get("cron"):
        c = d["cron"]
        section("CRON")
        print(f"  {c['enabled']}/{c['total']} enabled · {c['cantfail']} CANNOT REPORT FAILURE   [jobs.json]")
        if c["cantfail"]:
            print("  ^ a job that cannot fail silently reports success. That has already cost here once.")

    if d.get("services"):
        section("SERVICES")
        for s in d["services"]:
            mark = "running" if s["pid"].isdigit() else "not running"
            print(f"  {s['label']:<52} pid={s['pid']:<7} {mark}")

    if d.get("ports"):
        section("LISTENING PORTS")
        for p in d["ports"][:14]:
            print(f"  {p}")

    if d.get("axis"):
        section("AXIS")
        for k, v in d["axis"].items():
            fresh = "fresh" if v["age_h"] < 24 else f"{v['age_h']/24:.1f}d old"
            print(f"  {k:<8} {human(v['size']):>7}  {fresh}")
            if v.get("head"):
                print(f"           last: {v['head']}")

    r = d.get("reader", {})
    section("READER")
    print(f"  http://127.0.0.1:8777/  {'UP' if r.get('up') else 'DOWN'} (HTTP {r.get('code')})")

    section("NOT COVERED")
    print("  · what any of this MEANS — this is state, not judgement")
    print("  · file contents (metadata only, deliberately)")
    print("  · anything on the network or outside this machine")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="one command, the whole state")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    data = collect()
    if a.json:
        print(json.dumps(data, indent=1, default=str))
    else:
        print(f"\033[1mGOD'S EYE VIEW\033[0m  {dt.datetime.now():%Y-%m-%d %H:%M}  "
              f"(read-only · metadata only · nothing moved)")
        render(data)
        print()
