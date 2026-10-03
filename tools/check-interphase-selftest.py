#!/usr/bin/env python3
"""Control test: prove check-interphase.mjs FAILS on each violation class — and only on it.

Builds a scratch root containing the real manifest, the real evidence files (symlinked
at their real relative paths), and a deliberately broken registry. Each case must
exit 1 AND fire exactly the intended rule.

A gate that has never been seen to fail is a rubber stamp. This is the proof it isn't.
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

# Derive the repo from THIS file's own location, never a hardcoded home path.
# A hardcoded root made the copy at ~/Projects/0xxx0.github.io test
# void-anchor's gate instead of its own and report a false green.
REPO = Path(__file__).resolve().parents[1]
GATE = REPO / "scripts/check-interphase.mjs"
SCRATCH = Path.home() / ".hermes/profiles/lam4000/cache/scratch/interphase-control"
REAL_REG = json.loads((REPO / "control/INTERPHASE_CORRESPONDENCE_REGISTRY.json").read_text())

# KNOWN REAL VIOLATION in the live registry (found by this gate, 2026-09-29):
#   host SET cites "/fold-bloom/experience-set/" as evidence — a module DIRECTORY
#   (README.md, experience-set.js, fixtures/, tests/), not an addressed route.
#   It has no index.html, so route-registration correctly ignores it; the interphase
#   registry is the thing that is wrong. Normalise it here so each mutation below
#   isolates exactly one rule. The violation itself is reported separately, not hidden.
KNOWN = {("SET", "/fold-bloom/experience-set/")}
for m in REAL_REG["mappings"]:
    m["evidence"] = [e for e in (m.get("evidence") or [])
                     if (m["host_id"], e) not in KNOWN] + (
        ["/fold-bloom/experience-set/experience-set.js"]
        if (m["host_id"], "/fold-bloom/experience-set/") in KNOWN else [])

# every evidence path that exists in the real repo -> symlink it into each scratch root
EVIDENCE_PATHS = sorted({
    e for m in REAL_REG["mappings"] for e in (m.get("evidence") or [])
    if isinstance(e, str) and e.startswith("/") and not e.endswith("/")
})


def seed(root: Path):
    """Scratch root with real manifest + symlinked evidence files."""
    if root.exists():
        shutil.rmtree(root)
    (root / "control").mkdir(parents=True)
    shutil.copy(REPO / "showcase-manifest.json", root / "showcase-manifest.json")
    for rel in EVIDENCE_PATHS:
        src = REPO / rel.lstrip("/")
        if not src.exists():
            continue
        dst = root / rel.lstrip("/")
        dst.parent.mkdir(parents=True, exist_ok=True)
        if not dst.exists():
            os.symlink(src, dst)


def run(root):
    p = subprocess.run(["node", str(GATE), "--root", str(root), "--json"],
                       capture_output=True, text=True)
    try:
        out = json.loads(p.stdout)
    except Exception:
        out = {"violations": [], "status": "UNPARSEABLE", "raw": p.stdout[:200]}
    return p.returncode, out


CASES = {
    "R2_duplicate_host_id": ({"R2"}, 1, lambda r: r["mappings"].append(dict(r["mappings"][0]))),
    # R3 is now PRESET-aware (contract law 11: the six offices are a preset, not an ontology),
    # so these two are LAWFUL and must NOT fail — they must surface as info instead.
    "I1_extra_facet_lawful": (set(), 0, lambda r: r["mappings"][0]["facets"].__setitem__("VIBES", "x")),
    "I2_missing_facet_lawful": (set(), 0, lambda r: r["mappings"][0]["facets"].pop("WITNESS")),
    "R3_no_facets_at_all": ({"R3"}, 1, lambda r: r["mappings"][0].__setitem__("facets", {})),
    "R4_empty_residue": ({"R4"}, 1, lambda r: r["mappings"][0].__setitem__("residue", [])),
    # these two also fire R6 — correctly: an IMPLEMENTED host whose only evidence
    # cannot resolve has no resolving evidence either. Knock-on, not a bug.
    "R5_missing_evidence": ({"R5", "R6"}, 1, lambda r: r["mappings"][0].__setitem__(
        "evidence", ["/lib/interphase-DOES-NOT-EXIST.js"])),
    "R6_implemented_no_evidence": ({"R6"}, 1, lambda r: r["mappings"][0].__setitem__("evidence", [])),
    "R7_unregistered_route": ({"R6", "R7"}, 1, lambda r: r["mappings"][0].__setitem__(
        "evidence", ["/not-a-real-route/"])),
}

print(f"seeding {len(EVIDENCE_PATHS)} evidence path(s) into each scratch root\n")
failures = []
for name, (expect_rules, expect_exit, mutate) in CASES.items():
    reg = json.loads(json.dumps(REAL_REG))
    mutate(reg)
    root = SCRATCH / name
    seed(root)
    (root / "control/INTERPHASE_CORRESPONDENCE_REGISTRY.json").write_text(json.dumps(reg, indent=1))

    code, out = run(root)
    rules = {v["rule"] for v in out.get("violations", [])}
    ok = code == expect_exit and rules == expect_rules
    if not ok:
        failures.append(name)
    print(f"  [{'PASS' if ok else 'FAIL'}] {name:30} exit={code} (want {expect_exit}) "
          f"rules={sorted(rules) or '-'}")

# the normalised registry against the real repo must be CLEAN
root = SCRATCH / "CLEAN"
seed(root)
(root / "control/INTERPHASE_CORRESPONDENCE_REGISTRY.json").write_text(json.dumps(REAL_REG, indent=1))
code, out = run(root)
clean_ok = code == 0 and out.get("status") == "CLEAN"
if not clean_ok:
    failures.append("CLEAN")
print(f"  [{'PASS' if clean_ok else 'FAIL'}] {'CLEAN (normalised registry)':30} "
      f"exit={code} status={out.get('status')} hosts={out.get('hosts')}")

# and the LIVE registry must be clean now that the SET defect is fixed (2026-10-01)
code, out = run(REPO)
live = out.get("violations", [])
live_ok = code == 0 and out.get("status") == "CLEAN"
if not live_ok:
    failures.append("LIVE")
print(f"  [{'PASS' if live_ok else 'FAIL'}] {'LIVE registry (clean after fix)':30} "
      f"exit={code} status={out.get('status')} violations={[(v['rule'], v['host']) for v in live]}")

total = len(CASES) + 2
print(f"\n{total - len(failures)}/{total} control cases behaved correctly")
if failures:
    print("failed:", ", ".join(failures))
sys.exit(1 if failures else 0)