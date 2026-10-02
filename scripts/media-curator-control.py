#!/usr/bin/env python3
"""One control surface for the local FIELD MEDIA CURATOR.

The source tree is read-only. This program stores only local configuration/state,
invokes the existing curator cycle, installs paused Hermes cron jobs, and exposes
status/search over reviewed MEMORY. It never renders media or reorganizes source
files.
"""
from __future__ import annotations

import argparse
import json
import shlex
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any

DEFAULT_CONFIG = Path("~/.0xxx0-media/media-curator.json").expanduser()
DEFAULT_MODEL = "qwen3.5:9b"
DEFAULT_PROFILE = "archive-recovery"
HERMES_PROFILE = "media-curator"


def dump(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")


def load(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise SystemExit(f"config missing: {path}\nrun: media-curator-control.py configure /PATH/TO/MEDIA")
    return json.loads(path.read_text(encoding="utf-8"))


def resolved(path: str | Path) -> Path:
    return Path(path).expanduser().resolve()


def inside(child: Path, parent: Path) -> bool:
    return child == parent or parent in child.parents


def run(cmd: list[str], *, capture: bool = False, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, text=True, capture_output=capture, check=check)


def cmd_configure(args: argparse.Namespace) -> None:
    source = resolved(args.source)
    if not source.is_dir():
        raise SystemExit(f"source directory missing: {source}")
    repo = resolved(args.repo_root or Path(__file__).resolve().parents[1])
    out = resolved(args.out or "~/.0xxx0-media/refinery")
    if inside(out, source):
        raise SystemExit("refusing output inside source media tree")
    cfg = {
        "schema": "0xxx0/media-curator-local-config/v0.1",
        "source": str(source),
        "out": str(out),
        "repo_root": str(repo),
        "pipeline_config": str(repo / "control" / "MEDIA_REFINERY_PIPELINES.json"),
        "cycle_script": str(repo / "scripts" / "media-curator-cycle.py"),
        "profile": args.profile,
        "model": args.model,
        "max_batches_overnight": args.max_batches,
        "configured_epoch": int(time.time()),
        "source_mutation": False,
        "rendering": False,
    }
    dump(args.config, cfg)
    print(json.dumps(cfg, indent=2))


def doctor_report(cfg: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    commands: dict[str, Any] = {}
    for name in ("uv", "ollama", "hermes"):
        path = shutil.which(name)
        item: dict[str, Any] = {"path": path}
        if not path:
            errors.append(f"missing command: {name}")
        else:
            p = run([name, "--version"], capture=True, check=False)
            item["runs"] = p.returncode == 0
            item["version"] = (p.stdout or p.stderr).strip().splitlines()[:1]
            if p.returncode != 0:
                errors.append(f"command present but unloadable: {name}")
        commands[name] = item

    source = resolved(cfg["source"])
    out = resolved(cfg["out"])
    repo = resolved(cfg["repo_root"])
    if not source.is_dir():
        errors.append(f"source unavailable: {source}")
    if inside(out, source):
        errors.append("output is inside source tree")
    for p in (Path(cfg["cycle_script"]), Path(cfg["pipeline_config"]), repo / "scripts" / "media-refinery-run.py"):
        if not p.exists():
            errors.append(f"required repo file missing: {p}")

    model_present = False
    if commands["ollama"].get("runs"):
        p = run(["ollama", "list"], capture=True, check=False)
        if p.returncode == 0:
            names = {line.split()[0] for line in p.stdout.splitlines()[1:] if line.split()}
            model_present = cfg["model"] in names
            if not model_present:
                errors.append(f"Ollama model missing: {cfg['model']}")
        else:
            errors.append("ollama list failed; daemon/model store unavailable")

    morning = out / "memory" / "morning-return.json"
    return {
        "schema": "0xxx0/media-curator-doctor/v0.1",
        "ok": not errors,
        "commands": commands,
        "source": str(source),
        "out": str(out),
        "model": cfg["model"],
        "model_present": model_present,
        "morning_return_exists": morning.exists(),
        "errors": errors,
        "warnings": warnings,
        "source_mutation": False,
        "rendering": False,
    }


def cmd_doctor(args: argparse.Namespace) -> None:
    cfg = load(args.config)
    report = doctor_report(cfg)
    print(json.dumps(report, indent=2))
    if not report["ok"]:
        raise SystemExit(2)


def cycle_cmd(cfg: dict[str, Any], max_batches: int | None = None) -> list[str]:
    cmd = [
        "uv", "run", cfg["cycle_script"], cfg["source"],
        "--out", cfg["out"],
        "--config", cfg["pipeline_config"],
        "--profile", cfg["profile"],
        "--model", cfg["model"],
    ]
    if max_batches is not None and max_batches > 0:
        cmd += ["--max-batches", str(max_batches)]
    return cmd


def read_morning(cfg: dict[str, Any]) -> dict[str, Any]:
    p = resolved(cfg["out"]) / "memory" / "morning-return.json"
    if not p.exists():
        raise RuntimeError(f"morning return missing after cycle: {p}")
    return json.loads(p.read_text(encoding="utf-8"))


def validate_return(m: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if m.get("source_mutated") is not False:
        errors.append("source_mutated invariant failed")
    if m.get("rendering_performed") is not False:
        errors.append("rendering_performed invariant failed")
    c = m.get("counts", {})
    attempted = int(c.get("attempted", 0) or 0)
    accounted = int(c.get("accepted", 0) or 0) + int(c.get("held", 0) or 0)
    if attempted != accounted:
        errors.append(f"attempt accounting mismatch: attempted={attempted} accepted+held={accounted}")
    return errors


def run_cycle(cfg: dict[str, Any], max_batches: int | None) -> dict[str, Any]:
    p = run(cycle_cmd(cfg, max_batches), capture=True, check=False)
    if p.returncode != 0:
        tail = "\n".join((p.stderr or p.stdout).splitlines()[-30:])
        raise RuntimeError(f"curator cycle failed ({p.returncode})\n{tail}")
    m = read_morning(cfg)
    errs = validate_return(m)
    if errs:
        raise RuntimeError("invalid morning return: " + "; ".join(errs))
    return m


def cmd_pilot(args: argparse.Namespace) -> None:
    cfg = load(args.config)
    report = doctor_report(cfg)
    if not report["ok"]:
        print(json.dumps(report, indent=2))
        raise SystemExit(2)
    m = run_cycle(cfg, args.max_batches)
    proof = {
        "schema": "0xxx0/media-curator-pilot/v0.1",
        "ok": True,
        "max_batches": args.max_batches,
        "counts": m.get("counts", {}),
        "holds": [x.get("batch_id") for x in m.get("holds", [])],
        "source_mutated": False,
        "rendering_performed": False,
        "next": "Install/resume Hermes cron only after reviewing this bounded proof.",
    }
    proof_path = resolved(cfg["out"]) / "memory" / "pilot-proof.json"
    dump(proof_path, proof)
    print(json.dumps(proof, indent=2))


def lock_dir(cfg: dict[str, Any]) -> Path:
    return resolved(cfg["out"]) / ".media-curator-nightly.lock"


def cmd_overnight(args: argparse.Namespace) -> None:
    cfg = load(args.config)
    lock = lock_dir(cfg)
    try:
        lock.mkdir(parents=False, exist_ok=False)
    except FileExistsError:
        age = int(time.time() - lock.stat().st_mtime) if lock.exists() else -1
        print(json.dumps({"status": "SKIP_ALREADY_RUNNING", "lock": str(lock), "age_seconds": age}))
        return
    try:
        max_batches = args.max_batches if args.max_batches is not None else int(cfg.get("max_batches_overnight", 0) or 0)
        m = run_cycle(cfg, max_batches if max_batches > 0 else None)
        c = m.get("counts", {})
        summary = {
            "status": "OK",
            "accepted": c.get("accepted", 0),
            "held": c.get("held", 0),
            "recipes_ready": c.get("recipes_ready", 0),
            "attempted": c.get("attempted", 0),
            "source_mutated": False,
            "rendering_performed": False,
            "morning_return": str(resolved(cfg["out"]) / "memory" / "morning-return.json"),
        }
        print(json.dumps(summary, separators=(",", ":")))
    finally:
        try:
            lock.rmdir()
        except OSError:
            pass


def cmd_status(args: argparse.Namespace) -> None:
    cfg = load(args.config)
    out = resolved(cfg["out"])
    m = read_morning(cfg)
    pilot = out / "memory" / "pilot-proof.json"
    result = {
        "config": str(args.config),
        "source": cfg["source"],
        "out": cfg["out"],
        "model": cfg["model"],
        "pilot_proved": pilot.exists(),
        "morning": m,
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))


def flatten(value: Any) -> str:
    if isinstance(value, dict):
        return " ".join(f"{k} {flatten(v)}" for k, v in value.items())
    if isinstance(value, list):
        return " ".join(flatten(v) for v in value)
    return str(value)


def cmd_search(args: argparse.Namespace) -> None:
    cfg = load(args.config)
    out = resolved(cfg["out"])
    index_path = out / "memory" / "index.jsonl"
    if not index_path.exists():
        raise SystemExit("index missing; run pilot/overnight first")
    rows: dict[str, dict[str, Any]] = {}
    for line in index_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            r = json.loads(line)
            rows[r["item_id"]] = r
    overlay_dir = out / "memory" / "semantic-overlays"
    if overlay_dir.exists():
        for p in overlay_dir.glob("*.json"):
            d = json.loads(p.read_text(encoding="utf-8"))
            for item in d.get("items", []):
                if item.get("item_id") in rows:
                    rows[item["item_id"]]["semantic"] = {
                        k: v for k, v in item.items() if k not in ("item_id", "confidence")
                    }
    terms = [x.casefold() for x in args.query]
    found = []
    for r in rows.values():
        path_text = r.get("relative_path", "").casefold()
        semantic_text = flatten(r.get("semantic", {})).casefold()
        full = path_text + " " + semantic_text
        if not all(t in full for t in terms):
            continue
        score = sum(4 for t in terms if t in path_text) + sum(2 for t in terms if t in semantic_text)
        found.append((score, r))
    found.sort(key=lambda x: (-x[0], x[1].get("relative_path", "")))
    source = resolved(cfg["source"])
    result = []
    for score, r in found[: args.limit]:
        result.append({
            "score": score,
            "item_id": r["item_id"],
            "path": str(source / r["relative_path"]),
            "relative_path": r["relative_path"],
            "semantic": r.get("semantic", {}),
        })
    print(json.dumps({"query": args.query, "count": len(result), "results": result}, indent=2, ensure_ascii=False))


def hermes_home(profile: str) -> Path:
    if profile == "default":
        return Path("~/.hermes").expanduser()
    return Path(f"~/.hermes/profiles/{profile}").expanduser()


def cron_exists(profile: str, name: str) -> bool:
    p = run(["hermes", "-p", profile, "cron", "list"], capture=True, check=False)
    return p.returncode == 0 and name.casefold() in p.stdout.casefold()


def cmd_install_cron(args: argparse.Namespace) -> None:
    cfg = load(args.config)
    if not (resolved(cfg["out"]) / "memory" / "pilot-proof.json").exists() and not args.force:
        raise SystemExit("pilot proof missing; run pilot first or pass --force")
    home = hermes_home(args.hermes_profile)
    script_dir = home / "scripts"
    script_dir.mkdir(parents=True, exist_ok=True)
    wrapper = script_dir / "media-curator-nightly.sh"
    config_q = shlex.quote(str(args.config.resolve()))
    control_q = shlex.quote(str(Path(__file__).resolve()))
    wrapper.write_text(
        "#!/usr/bin/env bash\nset -euo pipefail\n" +
        f"exec uv run {control_q} --config {config_q} overnight\n",
        encoding="utf-8",
    )
    wrapper.chmod(0o755)
    repo = cfg["repo_root"]
    out = cfg["out"]
    nightly_name = "media-curator-nightly"
    morning_name = "media-curator-morning-return"
    created = []
    if not cron_exists(args.hermes_profile, nightly_name):
        run([
            "hermes", "-p", args.hermes_profile, "cron", "create", args.nightly_schedule,
            "--no-agent", "--script", wrapper.name, "--deliver", args.deliver,
            "--name", nightly_name, "--paused", "--paused-reason", "Created from proved pilot; review then resume.",
        ])
        created.append(nightly_name)
    prompt = (
        f"Use the media-curator skill. Read {out}/memory/morning-return.json. "
        "Return the smallest useful morning brief: counts, held batches, and recipe frontier. "
        "For at most 3 held/high-value batches, inspect exact contact-sheet/source evidence and adjudicate only semantic overlays. "
        "Do not move/rename/delete source media; do not render; do not TRANSLATE. "
        "Write corrections only through the curator MEMORY overlay path, then rerun the deterministic curator once if evidence changed."
    )
    if not cron_exists(args.hermes_profile, morning_name):
        run([
            "hermes", "-p", args.hermes_profile, "cron", "create", args.morning_schedule, prompt,
            "--skill", "media-curator", "--name", morning_name, "--workdir", repo,
            "--deliver", args.deliver, "--reasoning-effort", "medium",
            "--paused", "--paused-reason", "Resume together with the nightly curator after review.",
        ])
        created.append(morning_name)
    print(json.dumps({
        "status": "INSTALLED_PAUSED",
        "profile": args.hermes_profile,
        "created": created,
        "nightly_script": str(wrapper),
        "resume": [
            f"hermes -p {args.hermes_profile} cron resume {nightly_name}",
            f"hermes -p {args.hermes_profile} cron resume {morning_name}",
        ],
        "health": f"hermes -p {args.hermes_profile} cron doctor",
    }, indent=2))


def cmd_cron(args: argparse.Namespace) -> None:
    names = ("media-curator-nightly", "media-curator-morning-return")
    verb = "resume" if args.action == "resume" else "pause"
    for name in names:
        run(["hermes", "-p", args.hermes_profile, "cron", verb, name], check=False)
    run(["hermes", "-p", args.hermes_profile, "cron", "list"], check=False)


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    sub = ap.add_subparsers(dest="command", required=True)

    p = sub.add_parser("configure")
    p.add_argument("source")
    p.add_argument("--out")
    p.add_argument("--repo-root")
    p.add_argument("--profile", default=DEFAULT_PROFILE)
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--max-batches", type=int, default=0)
    p.set_defaults(func=cmd_configure)

    p = sub.add_parser("doctor")
    p.set_defaults(func=cmd_doctor)

    p = sub.add_parser("pilot")
    p.add_argument("--max-batches", type=int, default=3)
    p.set_defaults(func=cmd_pilot)

    p = sub.add_parser("overnight")
    p.add_argument("--max-batches", type=int)
    p.set_defaults(func=cmd_overnight)

    p = sub.add_parser("status")
    p.set_defaults(func=cmd_status)

    p = sub.add_parser("search")
    p.add_argument("query", nargs="+")
    p.add_argument("--limit", type=int, default=20)
    p.set_defaults(func=cmd_search)

    p = sub.add_parser("install-cron")
    p.add_argument("--hermes-profile", default=HERMES_PROFILE)
    p.add_argument("--nightly-schedule", default="daily at 01:00")
    p.add_argument("--morning-schedule", default="daily at 07:00")
    p.add_argument("--deliver", default="local")
    p.add_argument("--force", action="store_true")
    p.set_defaults(func=cmd_install_cron)

    p = sub.add_parser("cron")
    p.add_argument("action", choices=["resume", "pause"])
    p.add_argument("--hermes-profile", default=HERMES_PROFILE)
    p.set_defaults(func=cmd_cron)
    return ap


def main() -> None:
    ap = build_parser()
    args = ap.parse_args()
    args.config = args.config.expanduser().resolve()
    args.func(args)


if __name__ == "__main__":
    main()
