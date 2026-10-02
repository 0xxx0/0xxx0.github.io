#!/usr/bin/env python3
"""fi-mutation-contract.py — apply control/FIELD_INDEX_CONTRACT.json's mutation_contract
for a set of routes touched by a delta.

WHY
  `field-index-contract/v0.4` -> mutation_contract.required_same_change says a change that
  touches a route must, IN THE SAME CHANGE:
    1. update showcase-manifest route.index.updated_at
    2. set route.index.work_modes to the modes actually exercised by the delta
    3. preserve route.operation independently
    4. update receipt/RETURN only when the claimed artifact/test/release state changed
  Law: "ATTENTION != RECENCY. /control/CURRENT.json owns NOW; Git commits own literal
  repository mutation chronology; showcase-manifest owns addressed route projection."

  Measured 2026-09-27: work shipped to origin/master all day (microlib, tests, interphase,
  ship-check) with NO route.index update, so the FIELD INDEX correctly showed nothing --
  the work was real but invisible on the surface the operator actually reads.

  Measured again 2026-09-28: the FIELD INDEX's CATCH strip decides a route "changed" by
  comparing route.index.updated_at against the browser's last-seen stamp. Because that stamp
  was hand-maintained, the newest value anywhere was 16:55 while commits had landed through
  19:45, and /house/ still claimed 09-26 from before its own 0.7.7 release. The strip was not
  broken -- it was faithfully reporting a clock nobody advanced.

  So the field is still hand-maintained. `--from-git` closes that: it derives BOTH the route
  set and the timestamp from the commit range, so the bookkeeping cannot be forgotten.

  This script is deliberately explicit and reviewable: it only touches the two fields the
  contract names (updated_at, work_modes), never route.operation, never any other key.

USAGE
  fi-mutation-contract.py --routes <file-of-hrefs> --at <ISO8601> --modes IMPLEMENT,VERIFY [--dry-run]
  fi-mutation-contract.py --from-git HEAD~1..HEAD --modes IMPLEMENT,VERIFY [--dry-run]

  <file-of-hrefs>: one manifest href per line, e.g. /care/  (blank lines and # comments ok)

  --from-git RANGE: take touched paths from `git diff --name-only RANGE`, map them to
  manifest hrefs by longest-prefix match, and use the range's newest commit date as --at.
  Routes whose recorded updated_at is already >= that date are SKIPPED as no-ops, so
  re-running over an overlapping range is safe and idempotent.
"""
import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone

MANIFEST = "showcase-manifest.json"
VALID_MODES = {"RECOVER", "INVESTIGATE", "RESEARCH", "SPECULATE", "SPECIFY",
               "IMPLEMENT", "VERIFY", "OPERATE", "RELEASE", "UNKNOWN"}

# Canonical stamp form: ISO 8601, whole seconds, and ONE specific offset — +08:00, the offset
# this repo's git commits carry. Mixed formats make route.index.updated_at sort wrongly: a UTC
# stamp reads 8 hours OLDER than its +08:00 peer, and a fractional-seconds stamp sorts by string
# in the wrong place. Measured 2026-09-29: 156 routes carried 5 different formats, so the FIELD
# INDEX ordering was quietly wrong. Accepting "any offset" is NOT enough — the offset itself has
# to be pinned, or `+00:00` sails through and the ordering bug survives the fix.
CANONICAL_STAMP = re.compile(r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+08:00$")


def canonicalise_stamp(value):
    """Return (canonical_stamp, note). Normalises rather than refuses, and SAYS what it did.

    Normalising silently is how the mixed formats arose; normalising loudly makes the
    coercion visible in the run output instead of hidden in the file.
    """
    if value is None:
        return None, None
    s = str(value).strip()
    if CANONICAL_STAMP.match(s):
        return s, None
    note = f"normalised --at {s!r} -> "
    if re.match(r"^\d{4}-\d\d-\d\d$", s):
        s = s + "T00:00:00+08:00"
        return s, note + repr(s) + " (bare date read as local midnight)"
    t = s.replace("Z", "+00:00")
    t = re.sub(r"^(.*T\d\d:\d\d)([+-]\d\d:\d\d)$", r"\1:00\2", t)   # add missing seconds
    try:
        dt = datetime.fromisoformat(t)
    except Exception:
        raise SystemExit(f"REFUSED: --at {value!r} is not a parseable ISO 8601 timestamp")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    out = dt.astimezone(timezone(timedelta(hours=8))).strftime("%Y-%m-%dT%H:%M:%S+08:00")
    return out, note + repr(out) + " (+08:00, instant preserved)"


def hrefs_for_paths(paths, routes):
    """Map changed repo paths to manifest hrefs.

    Three passes, in order of specificity -- the manifest already declares its own structure,
    so read that before guessing from directory layout:

      1. exact file route        nexus/board.html      -> /nexus/board.html
      2. declared pointer        house/release.json    -> /house/   (via route.receipt /
                                                                    route.contract /
                                                                    route.machine_state)
      3. longest dir prefix      house/index.html      -> /house/

    Pass 2 exists because pass 3 alone over-reaches: law-zoo/lab.release.json is the receipt
    for /law-zoo/lab.html, but prefix matching attributes it to the parent hub /law-zoo/,
    which did not change. Files the manifest already names as a route's receipt/contract/state
    belong to THAT route.

    Returns (sorted_hrefs, unmatched) so the caller reports what it ignored rather than
    dropping it silently.
    """
    hrefs = {r.get("href") for r in routes if r.get("href")}

    # Normalise the manifest's declared file pointers: "law-zoo/lab.release.json" -> that href.
    POINTER_KEYS = ("receipt", "contract", "machine_state", "state")
    pointers = {}
    for r in routes:
        h = r.get("href")
        if not h:
            continue
        for k in POINTER_KEYS:
            v = r.get(k)
            if isinstance(v, str) and v:
                pointers[v.strip().lstrip("./").lstrip("/")] = h
        ev = r.get("evidence")
        if isinstance(ev, dict):
            v = ev.get("receipt")
            if isinstance(v, str) and v:
                pointers[v.strip().lstrip("./").lstrip("/")] = h

    found, unmatched = set(), []
    for p in paths:
        p = p.strip().lstrip("./")
        if not p:
            continue
        # (1) exact file route
        if "/" + p in hrefs:
            found.add("/" + p)
            continue
        # (2) the manifest declares this file belongs to a route
        if p in pointers:
            found.add(pointers[p])
            continue
        # (3) longest directory prefix
        parts = p.split("/")
        hit = None
        for i in range(len(parts) - 1, 0, -1):
            pref = "/" + "/".join(parts[:i]) + "/"
            if pref in hrefs:
                hit = pref
                break
        if hit:
            found.add(hit)
        else:
            unmatched.append(p)
    return sorted(found), unmatched


def paths_from_git(rng):
    out = subprocess.run(["git", "diff", "--name-only", rng], capture_output=True, text=True)
    if out.returncode != 0:
        raise SystemExit(f"REFUSED: git diff failed for {rng!r}: {out.stderr.strip()}")
    return [l for l in out.stdout.splitlines() if l.strip()]


# Machine-generated refresh commits are real Git mutations but NOT semantic FIELD changes.
# AGENTS.md, verbatim: "Generated snapshot commits are real Git mutations, not semantic
# FIELD changes. `comms:` / `nexus:` refresh commits may move `master`; interfaces may
# de-emphasize them but must never relabel an older field commit as Git HEAD."
#
# So they must NOT advance route.index.updated_at -- those routes are regenerated by
# scripts, not worked on. Without this exclusion the recency gate fails every refresh
# cycle (~30 min) and turns the machine room permanently red for no semantic reason.
#
# `convergence: strip refresh` is the strip generator's own heartbeat, folded into the
# same 30m surfaces tick on 2026-10-01 (ops-hub/scripts/convergence_strip.sh). It commits
# control/convergence-strip.json + control/convergence-plain.md, which longest-prefix-map
# to /control/ — a route whose page never changed. Anchored precisely (not a bare
# `convergence:`) so a SEMANTIC convergence change still advances its route.
GENERATED_SUBJECT_RE = re.compile(r"^(nexus|comms):|^convergence: strip refresh\b", re.I)


def semantic_commits(rng):
    """Commits in the range that are NOT machine-generated refreshes, oldest first.

    Returns [(sha, subject, committer_iso)].
    """
    out = subprocess.run(
        ["git", "log", "--reverse", "--format=%H%x1f%s%x1f%cI", rng],
        capture_output=True, text=True)
    if out.returncode != 0:
        raise SystemExit(f"REFUSED: git log failed for {rng!r}: {out.stderr.strip()}")
    rows = []
    for line in out.stdout.splitlines():
        if not line.strip():
            continue
        parts = line.split("\x1f")
        if len(parts) < 3:
            continue
        sha, subject, ciso = parts[0], parts[1], parts[2]
        if GENERATED_SUBJECT_RE.match(subject.strip()):
            continue
        rows.append((sha, subject, ciso))
    return rows


def semantic_paths_and_stamp(rng):
    """Union of paths touched by non-generated commits in the range, plus the newest
    such commit's date. Zero commits means every commit in the range was generated."""
    commits = semantic_commits(rng)
    if not commits:
        return [], None, 0
    paths = []
    for sha, _subject, _ciso in commits:
        out = subprocess.run(["git", "diff-tree", "--no-commit-id", "--name-only", "-r", sha],
                             capture_output=True, text=True)
        if out.returncode == 0:
            paths.extend(l for l in out.stdout.splitlines() if l.strip())
    return sorted(set(paths)), commits[-1][2], len(commits)


def route_touch_dates(rng, routes):
    """href -> the newest non-generated commit date that touched THAT route.

    This is the value the contract actually compares against: a route's stamp must not be
    older than the commit that last touched the route itself -- not the newest commit in
    the range.
    """
    out = {}
    for sha, _subject, ciso in semantic_commits(rng):
        o = subprocess.run(["git", "diff-tree", "--no-commit-id", "--name-only", "-r", sha],
                           capture_output=True, text=True)
        if o.returncode != 0:
            continue
        paths = [l for l in o.stdout.splitlines() if l.strip()]
        hit, _unmatched = hrefs_for_paths(paths, routes)
        for h in hit:
            if h not in out or ciso > out[h]:
                out[h] = ciso
    return out


def semantic_stamp_for_routes(rng, routes):
    """Newest non-generated commit in the range whose touched paths map to >=1 ROUTE.

    A follow-up commit that only writes showcase-manifest.json (the stamp commit itself, or
    any bookkeeping file) maps to no route. Letting it advance the stamp makes the stamp it
    just wrote read as stale against its own commit -- so a correctly-stamped push could
    never pass --check. Measured 2026-10-01: applying the tool's own printed fix and
    re-running --check refused the result.
    """
    newest = None
    for sha, _subject, ciso in semantic_commits(rng):
        out = subprocess.run(["git", "diff-tree", "--no-commit-id", "--name-only", "-r", sha],
                             capture_output=True, text=True)
        if out.returncode != 0:
            continue
        paths = [l for l in out.stdout.splitlines() if l.strip()]
        hit, _unmatched = hrefs_for_paths(paths, routes)
        if hit and (newest is None or ciso > newest):
            newest = ciso
    return newest


def stamp_from_git(rng):
    """Commit date of the newest commit in the range, ISO8601 with offset."""
    out = subprocess.run(["git", "log", "-1", "--format=%cI", rng],
                         capture_output=True, text=True)
    if out.returncode != 0 or not out.stdout.strip():
        return datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%dT%H:%M:%S%z")
    return out.stdout.strip()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--routes", help="file with one href per line")
    ap.add_argument("--from-git", help="git range, e.g. HEAD~1..HEAD; derives routes + --at")
    ap.add_argument("--at", help="ISO8601 timestamp to stamp (defaults to the range's date)")
    ap.add_argument("--modes", help="comma-separated work modes (not needed with --check)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--check", action="store_true",
                    help="CI gate: exit 1 if any derived route is stale, writing nothing")
    args = ap.parse_args()

    if not args.routes and not args.from_git:
        print("REFUSED: pass --routes or --from-git", file=sys.stderr)
        return 2
    if not args.check and not args.modes:
        print("REFUSED: --modes is required unless --check is set", file=sys.stderr)
        return 2

    modes = [m.strip().upper() for m in (args.modes or "").split(",") if m.strip()]
    bad = [m for m in modes if m not in VALID_MODES]
    if bad:
        print(f"REFUSED: unknown work modes {bad}; valid = {sorted(VALID_MODES)}", file=sys.stderr)
        return 2

    m = json.load(open(MANIFEST))
    routes = m.get("routes", [])
    by_href = {r.get("href"): r for r in routes}

    unmatched = []
    if args.from_git:
        sem_paths, sem_stamp, sem_n = semantic_paths_and_stamp(args.from_git)
        wanted, unmatched = hrefs_for_paths(sem_paths, routes)
        # The stamp is the newest commit that actually touched a ROUTE -- never a commit that
        # only wrote bookkeeping (the manifest itself). Otherwise the stamp a writer just
        # committed reads as stale against the commit that carried it.
        route_stamp = semantic_stamp_for_routes(args.from_git, routes)
        at = args.at or route_stamp or sem_stamp or stamp_from_git(args.from_git)
        if sem_n == 0 and not args.at:
            print(f"NO SEMANTIC COMMITS in {args.from_git} (all were generated "
                  f"nexus:/comms:/convergence: refreshes) — nothing to stamp. Exiting clean.")
            return 0
        print(f"DERIVED from {args.from_git}: {len(wanted)} route(s), stamp {at} "
              f"({sem_n} semantic commit(s))")
        for h in wanted:
            print(f"  + {h}")
        if unmatched:
            print(f"  unmatched paths, ignored ({len(unmatched)}): "
                  f"{unmatched[:8]}{' …' if len(unmatched) > 8 else ''}")
    else:
        wanted = []
        with open(args.routes) as fh:
            for line in fh:
                line = line.split("#", 1)[0].strip()
                if line:
                    wanted.append(line)
        at = args.at
        if not at:
            print("REFUSED: --at is required with --routes", file=sys.stderr)
            return 2
        at, note = canonicalise_stamp(at)
        if note:
            print(f"  {note}")

    missing = [h for h in wanted if h not in by_href]
    if missing:
        print(f"REFUSED: {len(missing)} href(s) not present in the manifest: {missing}", file=sys.stderr)
        return 3

    changed, skipped = [], []
    recorded_before = {}
    for href in wanted:
        r = by_href[href]
        idx = r.setdefault("index", {})
        before_modes = list(idx.get("work_modes", []))
        before_at = idx.get("updated_at")
        recorded_before[href] = before_at
        # No-op guard: a derived stamp not newer than what is recorded means this route did
        # not actually change in the range. Skip rather than re-stamp, which keeps a
        # re-run over an overlapping range idempotent.
        if args.from_git and before_at and str(before_at) >= str(at):
            skipped.append((href, before_at))
            continue
        # (1) updated_at
        idx["updated_at"] = at
        # (2) work_modes: UNION with what's there. The contract says "set ... the modes
        # actually exercised by the delta"; a union is chosen deliberately because work_modes
        # records the route's activity and a delta-observing replace would erase a sibling
        # writer's modes on a file several sessions touch. Existing order is preserved.
        merged = before_modes + [x for x in modes if x not in before_modes]
        idx["work_modes"] = merged
        # (3) route.operation is NOT touched -- asserted below.
        changed.append((href, before_at, at, before_modes, merged))

    # (3) preserve route.operation independently -- verify we did not touch it
    m2 = json.loads(json.dumps(m))
    for href in wanted:
        a = by_href[href].get("operation")
        b = {r.get("href"): r for r in m2.get("routes", [])}[href].get("operation")
        assert a == b, f"operation changed for {href}"

    if args.check:
        # Per-ROUTE staleness. The contract is "the route's stamp must not be older than the
        # commit that last touched THAT ROUTE" -- a single range-wide stamp is wrong in both
        # directions: a later commit touching a different route would falsely flag an
        # earlier, correctly-stamped one, and a bookkeeping commit would falsely flag
        # everything. Compare each route against its own newest touch.
        if args.at:
            touches = {h: args.at for h in wanted}
        else:
            touches = route_touch_dates(args.from_git, routes)
        stale = []
        for href in sorted(touches):
            if href not in by_href:
                continue
            # recorded_before, NOT the live manifest: the apply loop above has already
            # written `at` into the in-memory route, so reading it back would compare the
            # stamp against itself and never find anything stale.
            recorded = recorded_before.get(href)
            if not recorded or str(recorded) < str(touches[href]):
                stale.append((href, recorded, touches[href]))
        if stale:
            print(f"STALE: {len(stale)} route(s) are registered but older than the "
                  f"commit that last touched them.", file=sys.stderr)
            for href, b_at, a_at in stale:
                print(f"  {href}: recorded {b_at}, commit says {a_at}", file=sys.stderr)
            print(f"\nRun this to fix, then commit showcase-manifest.json:\n"
                  f"  python3 tools/fi-mutation-contract.py --from-git {args.from_git} "
                  f"--modes IMPLEMENT,VERIFY", file=sys.stderr)
            return 1
        print(f"FI RECENCY OK: {len(touches)} route(s) checked, none stale")
        return 0

    if changed and not args.dry_run:
        m["updated"] = at
        json.dump(m, open(MANIFEST, "w"), indent=2, ensure_ascii=False)
        open(MANIFEST, "a").write("\n")

    print(f"{'DRY RUN — nothing written' if args.dry_run else 'APPLIED'}: {len(changed)} route(s)")
    for href, b_at, a_at, b_m, a_m in changed:
        print(f"  {href}")
        print(f"    updated_at: {b_at} -> {a_at}")
        print(f"    work_modes: {b_m} -> {a_m}")
    for href, b_at in skipped:
        print(f"  {href} — SKIPPED (already {b_at}, not older than {at})")
    print("  route.operation: untouched (asserted)")
    return 0


if __name__ == "__main__":
    sys.exit(main())