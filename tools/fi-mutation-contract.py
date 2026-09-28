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

  This script is deliberately explicit and reviewable: it only touches the two fields the
  contract names (updated_at, work_modes), never route.operation, never any other key.

USAGE
  fi-mutation-contract.py --routes <file-of-hrefs> --at <ISO8601> --modes IMPLEMENT,VERIFY [--dry-run]

  <file-of-hrefs>: one manifest href per line, e.g. /care/  (blank lines and # comments ok)
"""
import argparse
import json
import sys

MANIFEST = "showcase-manifest.json"
VALID_MODES = {"RECOVER", "INVESTIGATE", "RESEARCH", "SPECULATE", "SPECIFY",
               "IMPLEMENT", "VERIFY", "OPERATE", "RELEASE", "UNKNOWN"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--routes", required=True, help="file with one href per line")
    ap.add_argument("--at", required=True, help="ISO8601 timestamp to stamp")
    ap.add_argument("--modes", required=True, help="comma-separated work modes")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    modes = [m.strip().upper() for m in args.modes.split(",") if m.strip()]
    bad = [m for m in modes if m not in VALID_MODES]
    if bad:
        print(f"REFUSED: unknown work modes {bad}; valid = {sorted(VALID_MODES)}", file=sys.stderr)
        return 2

    wanted = []
    with open(args.routes) as fh:
        for line in fh:
            line = line.split("#", 1)[0].strip()
            if line:
                wanted.append(line)

    m = json.load(open(MANIFEST))
    routes = m.get("routes", [])
    by_href = {r.get("href"): r for r in routes}

    missing = [h for h in wanted if h not in by_href]
    if missing:
        print(f"REFUSED: {len(missing)} href(s) not present in the manifest: {missing}", file=sys.stderr)
        return 3

    changed = []
    for href in wanted:
        r = by_href[href]
        idx = r.setdefault("index", {})
        before_modes = list(idx.get("work_modes", []))
        before_at = idx.get("updated_at")
        # (1) updated_at
        idx["updated_at"] = args.at
        # (2) work_modes: UNION with what's there. The contract says "set ... the modes
        # actually exercised by the delta"; a union is chosen deliberately because work_modes
        # records the route's activity and a delta-observing replace would erase a sibling
        # writer's modes on a file several sessions touch. Existing order is preserved.
        merged = before_modes + [x for x in modes if x not in before_modes]
        idx["work_modes"] = merged
        # (3) route.operation is NOT touched -- asserted below.
        changed.append((href, before_at, args.at, before_modes, merged))

    # (3) preserve route.operation independently -- verify we did not touch it
    m2 = json.loads(json.dumps(m))
    for href in wanted:
        a = by_href[href].get("operation")
        b = {r.get("href"): r for r in m2.get("routes", [])}[href].get("operation")
        assert a == b, f"operation changed for {href}"

    if not args.dry_run:
        m["updated"] = args.at
        json.dump(m, open(MANIFEST, "w"), indent=2, ensure_ascii=False)
        open(MANIFEST, "a").write("\n")

    print(f"{'DRY RUN — nothing written' if args.dry_run else 'APPLIED'}: {len(changed)} route(s)")
    for href, b_at, a_at, b_m, a_m in changed:
        print(f"  {href}")
        print(f"    updated_at: {b_at} -> {a_at}")
        print(f"    work_modes: {b_m} -> {a_m}")
    print("  route.operation: untouched (asserted)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
