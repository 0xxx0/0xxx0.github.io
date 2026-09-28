#!/usr/bin/env python3
"""check-redaction-aperture.py — PUBLIC SURFACE REDACTION APERTURE GATE.

Scans every text surface of this repository with the house aperture redactor
(`scripts/redact.py`, a byte-identical vendored copy of
`~/void-anchor/AXIS/reusable/scripts/redact.py`, sha256 recorded in the allow
file) and FAILS when unredacted sensitive material is found on any path a push
would publish.

Active detector classes: token, secret, privatekey, email, discord, user
(a username visible after /Users/, /home/ or C:\\Users\\ that is not a generic
system account).
Classes disabled by default, with measured reasons in the allow file:
phone, ipv4, wallet. Run `--all-kinds` for a diagnostics pass over those too.

Allowlist discipline (`scripts/redaction-aperture-allow.json`):
  Every entry is an EXACT (path, kind, sha256-of-the-value) triple with a why.
  Values are never stored — only their sha256. Never add a pattern or a family;
  add the one exact triple for the one finding you verified is benign:
      python3 scripts/check-redaction-aperture.py --hash '<exact value>'
  (`--hash` echo mode; then add {"path":…, "kind":…, "value_sha256":…, "why":…}.)

Usage:
  python3 scripts/check-redaction-aperture.py [--root DIR] [--all-kinds]
      [--json] [--max-findings N]
  python3 scripts/check-redaction-aperture.py --hash VALUE

Exit codes: 0 = clean · 1 = findings · 2 = usage/internal error.
"""

import argparse
import hashlib
import importlib.util
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

TEXT_EXT = frozenset((
    ".json", ".md", ".js", ".html", ".mjs", ".css", ".txt", ".cjs", ".svg",
    ".py", ".yml", ".yaml", ".sh", ".xml", ".ts", ".tsx", ".kt", ".kts",
    ".toml", ".csv", ".properties", ".webmanifest",
))
SKIP_DIRS = frozenset((".git",))
ALLOW_FILE = os.path.join(HERE, "redaction-aperture-allow.json")
UPSTREAM_DONOR = os.path.expanduser("~/void-anchor/AXIS/reusable/scripts/redact.py")


def load_redactor():
    path = os.path.join(HERE, "redact.py")
    spec = importlib.util.spec_from_file_location("aperture_redact", path)
    if spec is None or spec.loader is None:
        raise SystemExit("cannot load %s" % path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def sha256_text(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def load_config(path):
    if not os.path.isfile(path):
        return {"disabled_kinds": {}, "allow_any": [], "allow_path": []}
    with open(path, "r", encoding="utf-8") as fh:
        cfg = json.load(fh)
    cfg.setdefault("disabled_kinds", {})
    cfg.setdefault("allow_any", [])
    cfg.setdefault("allow_path", [])
    return cfg


def is_allowed(cfg, path, kind, value_sha256):
    for e in cfg["allow_any"]:
        if e.get("kind") == kind and e.get("value_sha256") == value_sha256:
            return True
    for e in cfg["allow_path"]:
        if (e.get("path") == path and e.get("kind") == kind
                and e.get("value_sha256") == value_sha256):
            return True
    return False


def scan(root, mod, active_kinds):
    findings = []
    n_files = n_bytes = 0
    for dp, dn, fn in os.walk(root):
        dn[:] = [d for d in dn if d not in SKIP_DIRS]
        for name in sorted(fn):
            if os.path.splitext(name)[1].lower() not in TEXT_EXT:
                continue
            full = os.path.join(dp, name)
            rel = os.path.relpath(full, root)
            try:
                with open(full, "r", encoding="utf-8", errors="replace") as fh:
                    text = fh.read()
            except OSError:
                continue
            n_files += 1
            n_bytes += len(text)
            for sp in mod.find_all(text):
                if sp.kind not in active_kinds:
                    continue
                findings.append({
                    "path": rel,
                    "line": text.count("\n", 0, sp.start) + 1,
                    "kind": sp.kind,
                    "origLength": sp.end - sp.start,
                    "marker": "\u2026<REDACTED:%s>" % sp.kind,
                    "value_sha256": sha256_text(sp.raw),
                })
    return findings, n_files, n_bytes


def main(argv=None):
    p = argparse.ArgumentParser(
        prog="check-redaction-aperture.py",
        description="public surface redaction aperture gate")
    p.add_argument("--root", default=REPO, help="tree to scan (default: repo root)")
    p.add_argument("--all-kinds", action="store_true",
                   help="also run the kinds disabled by default (diagnostics)")
    p.add_argument("--json", action="store_true", help="machine-readable output")
    p.add_argument("--max-findings", type=int, default=40,
                   help="human output: show at most N findings (default 40)")
    p.add_argument("--hash", metavar="VALUE",
                   help="echo mode: print sha256 of VALUE (for allow entries)")
    args = p.parse_args(argv)

    if args.hash is not None:
        print(sha256_text(args.hash))
        return 0

    mod = load_redactor()
    cfg = load_config(ALLOW_FILE)
    all_kinds = sorted({t[0] for t in getattr(mod, "_DETECTORS", [])})
    disabled = {} if args.all_kinds else dict(cfg["disabled_kinds"])
    active = [k for k in all_kinds if k not in disabled]

    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        print("REDACTION APERTURE: ERROR root not a directory: %s" % root,
              file=sys.stderr)
        return 2

    raw_findings, n_files, n_bytes = scan(root, mod, active)
    unallowed = []
    n_allowed = 0
    for f in raw_findings:
        if is_allowed(cfg, f["path"], f["kind"], f["value_sha256"]):
            n_allowed += 1
        else:
            unallowed.append(f)

    ok = not unallowed
    verdict = ("REDACTION APERTURE: PASS (%d files scanned)" % n_files if ok else
               "REDACTION APERTURE: FAIL (%d findings / %d files / %d scanned)"
               % (len(unallowed), len({f["path"] for f in unallowed}), n_files))

    upstream_note = None
    if os.path.isfile(UPSTREAM_DONOR):
        try:
            with open(UPSTREAM_DONOR, "rb") as fh:
                a = hashlib.sha256(fh.read()).hexdigest()
            with open(os.path.join(HERE, "redact.py"), "rb") as fh:
                b = hashlib.sha256(fh.read()).hexdigest()
            if a != b:
                upstream_note = ("vendored redact.py differs from the upstream donor "
                                 "(%s) — re-vendor before trusting gate parity" % UPSTREAM_DONOR)
        except OSError:
            pass

    if args.json:
        out = {
            "schema": "0xxx0/redaction-aperture/v0.1",
            "root": root,
            "scanned_files": n_files,
            "scanned_bytes": n_bytes,
            "kinds_active": active,
            "kinds_disabled": sorted(disabled.keys()),
            "findings": unallowed,
            "allowed_count": n_allowed,
            "verdict": {"ok": ok, "line": verdict},
            "remediation": ("For each benign finding add its EXACT triple to "
                            "scripts/redaction-aperture-allow.json — value hash via: "
                            "python3 scripts/check-redaction-aperture.py --hash '<exact value>'"),
        }
        if upstream_note:
            out["upstream_note"] = upstream_note
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 0 if ok else 1

    print("REDACTION APERTURE GATE · root=%s" % root)
    print("scanned: %d files / %.2f MB" % (n_files, n_bytes / 1e6))
    print("kinds active: %s" % ", ".join(active))
    if disabled:
        print("kinds disabled (repo-measured; --all-kinds to include): %s"
              % ", ".join(sorted(disabled)))
    if n_allowed:
        print("allowed (exact-triple allowlist): %d finding(s)" % n_allowed)
    if unallowed:
        shown = unallowed[:args.max_findings]
        for f in shown:
            print("  [%s] %s:%d  marker=%s  len=%d  sha256=%s"
                  % (f["kind"], f["path"], f["line"], f["marker"],
                     f["origLength"], f["value_sha256"]))
        if len(unallowed) > len(shown):
            print("  … and %d more (use --json for the full list)"
                  % (len(unallowed) - len(shown)))
        print("")
        print("remediation: verify each finding is benign, then add its EXACT triple to")
        print("  scripts/redaction-aperture-allow.json — value hash via:")
        print("  python3 scripts/check-redaction-aperture.py --hash '<exact value>'")
    if upstream_note:
        print("note: %s" % upstream_note, file=sys.stderr)
    print("")
    print(verdict)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())