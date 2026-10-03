#!/usr/bin/env python3
"""Control-test check-interphase.mjs.

Every mutation runs against an isolated scratch checkout. The test also creates a
real file OUTSIDE that checkout and proves it cannot satisfy R9: another tree,
absolute host path, or sibling worktree is not evidence for the checkout under test.
Legacy absolute strings that merely serialize a path inside this repository are
normalized to the fixture checkout before seeding, matching the gate's ROOT_ONLY law.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
GATE = REPO / "scripts/check-interphase.mjs"
REAL_REG = json.loads((REPO / "control/INTERPHASE_CORRESPONDENCE_REGISTRY.json").read_text())

# Historical SET correction: if an older registry still cites the module directory,
# normalize the fixture to the executable file so each mutation isolates one rule.
KNOWN = {("SET", "/fold-bloom/experience-set/")}
for m in REAL_REG["mappings"]:
    evidence = list(m.get("evidence") or [])
    if (m.get("host_id"), "/fold-bloom/experience-set/") in KNOWN:
        evidence = [e for e in evidence if e != "/fold-bloom/experience-set/"]
        evidence.append("/fold-bloom/experience-set/experience-set.js")
    m["evidence"] = evidence

EVIDENCE_PATHS = sorted({
    e for m in REAL_REG["mappings"] for e in (m.get("evidence") or [])
    if isinstance(e, str) and e.startswith("/") and not e.endswith("/")
})
COMMUTE_PATHS = sorted({
    m.get("commutes_tested") for m in REAL_REG["mappings"]
    if isinstance(m.get("commutes_tested"), str) and m.get("commutes_tested")
})


def repo_rel(value: str) -> Path:
    """Interpret published or legacy *.github.io clone paths inside the fixture."""
    s = str(value or "").strip()
    marks = list(re.finditer(r"/[^/]+\.github\.io/", s))
    rel = s[marks[-1].end():] if marks else s.lstrip("/")
    return Path(rel)


def seed(root: Path):
    """Minimal checkout projection with manifest + all real file witnesses."""
    if root.exists():
        shutil.rmtree(root)
    (root / "control").mkdir(parents=True)
    shutil.copy(REPO / "showcase-manifest.json", root / "showcase-manifest.json")
    for raw in sorted(set(EVIDENCE_PATHS + COMMUTE_PATHS)):
        rel = repo_rel(raw)
        src = REPO / rel
        if not src.exists() or not src.is_file():
            continue
        dst = root / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if not dst.exists():
            os.symlink(src, dst)


def run(root: Path):
    p = subprocess.run(
        ["node", str(GATE), "--root", str(root), "--json"],
        capture_output=True, text=True, cwd=REPO
    )
    try:
        out = json.loads(p.stdout)
    except Exception:
        out = {"violations": [], "status": "UNPARSEABLE", "raw": p.stdout[:300]}
    return p.returncode, out


def first_mapping(reg):
    if not reg.get("mappings"):
        raise RuntimeError("registry fixture has no mappings")
    return reg["mappings"][0]


with tempfile.TemporaryDirectory(prefix="field-interphase-gate-") as tmp:
    base = Path(tmp)
    outside = base / "outside-checkout-proof.js"
    outside.write_text("// exists, but not in the checkout under test\n")

    def external_commute(r):
        m = first_mapping(r)
        m["commutes_claimed"] = ["SELECT↔FOCUS"]
        m["commutes_tested"] = str(outside.resolve())

    CASES = {
        "R2_duplicate_host_id": ({"R2"}, 1, lambda r: r["mappings"].append(dict(first_mapping(r)))),
        "I1_extra_facet_lawful": (set(), 0, lambda r: first_mapping(r).setdefault("facets", {}).__setitem__("VIBES", "x")),
        "I2_missing_preset_lawful": (set(), 0, lambda r: first_mapping(r).setdefault("facets", {}).pop("WITNESS", None)),
        "R3_no_facets": ({"R3"}, 1, lambda r: first_mapping(r).__setitem__("facets", {})),
        "R4_empty_residue": ({"R4"}, 1, lambda r: first_mapping(r).__setitem__("residue", [])),
        "R5_missing_evidence": ({"R5", "R6"}, 1, lambda r: first_mapping(r).__setitem__("evidence", ["/lib/interphase-DOES-NOT-EXIST.js"])),
        "R6_implemented_no_evidence": ({"R6"}, 1, lambda r: first_mapping(r).__setitem__("evidence", [])),
        "R7_unregistered_route": ({"R6", "R7"}, 1, lambda r: first_mapping(r).__setitem__("evidence", ["/not-a-real-route/"])),
        "R8_invalid_merge": ({"R8"}, 1, lambda r: first_mapping(r).__setitem__("merge", "handwave")),
        "R9_cross_checkout_rejected": ({"R9"}, 1, external_commute),
        "R10_missing_owner": ({"R10"}, 1, lambda r: first_mapping(r).__setitem__("owner", "")),
    }

    print(f"seeding {len(EVIDENCE_PATHS)} evidence + {len(COMMUTE_PATHS)} commute witness path(s)\n")
    failures = []
    for name, (expected_rules, expected_exit, mutate) in CASES.items():
        reg = json.loads(json.dumps(REAL_REG))
        mutate(reg)
        root = base / name
        seed(root)
        (root / "control/INTERPHASE_CORRESPONDENCE_REGISTRY.json").write_text(json.dumps(reg, indent=1))
        code, out = run(root)
        rules = {v["rule"] for v in out.get("violations", [])}
        ok = code == expected_exit and rules == expected_rules and out.get("resolution") == "ROOT_ONLY"
        if not ok:
            failures.append(name)
        print(f"  [{'PASS' if ok else 'FAIL'}] {name:31} exit={code} want={expected_exit} rules={sorted(rules) or '-'}")

    # Clean isolated checkout must pass without consulting REPO or another clone.
    clean_root = base / "CLEAN"
    seed(clean_root)
    (clean_root / "control/INTERPHASE_CORRESPONDENCE_REGISTRY.json").write_text(json.dumps(REAL_REG, indent=1))
    code, out = run(clean_root)
    clean_ok = code == 0 and out.get("status") == "CLEAN" and out.get("resolution") == "ROOT_ONLY"
    if not clean_ok:
        failures.append("CLEAN")
    print(f"  [{'PASS' if clean_ok else 'FAIL'}] {'CLEAN isolated checkout':31} exit={code} status={out.get('status')}")

    # The actual checkout must independently satisfy the same gate.
    code, out = run(REPO)
    live_ok = code == 0 and out.get("status") == "CLEAN" and out.get("resolution") == "ROOT_ONLY"
    if not live_ok:
        failures.append("LIVE")
    print(f"  [{'PASS' if live_ok else 'FAIL'}] {'LIVE current checkout':31} exit={code} status={out.get('status')} violations={[(v.get('rule'), v.get('host')) for v in out.get('violations', [])]}")

    total = len(CASES) + 2
    print(f"\n{total - len(failures)}/{total} control cases behaved correctly")
    if failures:
        print("failed:", ", ".join(failures))
    sys.exit(1 if failures else 0)