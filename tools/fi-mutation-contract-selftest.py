#!/usr/bin/env python3
"""Exercise real apply/check in an isolated mixed-timezone Git history."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

tool = Path(__file__).with_name("fi-mutation-contract.py").resolve()
with tempfile.TemporaryDirectory(prefix="fi-stamp-proof-") as tmp:
    cwd = Path(tmp)
    env = {**os.environ, "GIT_AUTHOR_NAME": "fixture", "GIT_COMMITTER_NAME": "fixture",
           "GIT_AUTHOR_EMAIL": "fixture", "GIT_COMMITTER_EMAIL": "fixture"}
    def run(*args, ok=True):
        p = subprocess.run(args, cwd=cwd, env=env, text=True, capture_output=True)
        if ok and p.returncode:
            raise AssertionError(p.stderr + p.stdout)
        return p
    def commit(message, at):
        env.update(GIT_AUTHOR_DATE=at, GIT_COMMITTER_DATE=at)
        run("git", "add", ".")
        run("git", "commit", "-m", message)
    run("git", "init", "-q")
    (cwd / "foo").mkdir()
    manifest = cwd / "showcase-manifest.json"
    manifest.write_text(json.dumps({"routes": [{"href": "/foo/", "operation": "OPEN",
        "index": {"updated_at": "2026-10-09T17:00:00+08:00", "work_modes": ["RECOVER"]}}]}))
    source = cwd / "foo/index.html"
    source.write_text("base")
    commit("base", "2026-10-09T17:00:00+08:00")
    base = run("git", "rev-parse", "HEAD").stdout.strip()
    source.write_text("first")
    commit("first", "2026-10-09T20:00:00+09:00")
    source.write_text("later")
    commit("later", "2026-10-09T19:30:00+08:00")
    rng = base + "..HEAD"
    run(sys.executable, str(tool), "--from-git", rng, "--modes", "IMPLEMENT,VERIFY")
    r = json.loads(manifest.read_text())["routes"][0]
    assert r["index"]["updated_at"] == "2026-10-09T19:30:00+08:00"
    assert r["index"]["work_modes"] == ["RECOVER", "IMPLEMENT", "VERIFY"]
    assert r["operation"] == "OPEN"
    run(sys.executable, str(tool), "--from-git", rng, "--check")
    m = json.loads(manifest.read_text())
    m["routes"][0]["index"]["updated_at"] = "2026-10-09T19:00:00+08:00"
    manifest.write_text(json.dumps(m))
    bad = run(sys.executable, str(tool), "--from-git", rng, "--check", ok=False)
    assert bad.returncode == 1 and "STALE" in bad.stderr
print("FI STAMP PASS: mixed-offset history, actual latest instant, canonical stamp, preserved operation/modes, stale negative control")
