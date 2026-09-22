#!/usr/bin/env python3
"""Bounded Ollama endurance harness with JSONL receipts.

Runs against the native Ollama /api/chat interface. It does not change model tags,
provider configuration or canonical project state.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import time
import urllib.request
from pathlib import Path


def process_snapshot() -> list[str]:
    p = subprocess.run(
        ["ps", "-axo", "pid,rss,vsz,%cpu,command"],
        capture_output=True,
        text=True,
        check=False,
    )
    return [line for line in p.stdout.splitlines() if "ollama" in line.lower() or "mlx" in line.lower()]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--context", type=int, default=32768)
    ap.add_argument("--turns", type=int, default=100)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--append", action="store_true")
    ap.add_argument("--host", default="http://127.0.0.1:11434")
    ap.add_argument("--timeout", type=int, default=600)
    args = ap.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.out.exists() and args.out.stat().st_size and not args.append:
        raise SystemExit(f"refusing to mix evidence into existing file: {args.out}; use --append explicitly")
    messages = [{"role": "system", "content": "Return compact valid JSON only. Never use markdown."}]

    for i in range(args.turns):
        marker = f"TURN-{i:04d}"
        messages.append(
            {"role": "user", "content": f'Return {{"marker":"{marker}","square":{i*i}}}'}
        )

        body = {
            "model": args.model,
            "messages": messages,
            "stream": False,
            "keep_alive": "30m",
            "options": {
                "num_ctx": args.context,
                "num_predict": 128,
                "temperature": 0,
            },
        }

        t0 = time.monotonic()
        data: dict = {}
        status = "ok"
        error = None

        try:
            req = urllib.request.Request(
                args.host.rstrip("/") + "/api/chat",
                data=json.dumps(body).encode(),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=args.timeout) as r:
                data = json.load(r)
        except Exception as exc:  # receipt the provider failure exactly
            status = "error"
            error = f"{type(exc).__name__}: {exc}"

        wall = time.monotonic() - t0
        content = ((data.get("message") or {}).get("content") or "")

        if status == "ok":
            messages.append({"role": "assistant", "content": content})

        row = {
            "turn": i,
            "marker": marker,
            "status": status,
            "error": error,
            "model": args.model,
            "context": args.context,
            "wall_s": round(wall, 6),
            "response_sha256": hashlib.sha256(content.encode()).hexdigest(),
            "response_chars": len(content),
            "total_duration": data.get("total_duration"),
            "load_duration": data.get("load_duration"),
            "prompt_eval_count": data.get("prompt_eval_count"),
            "prompt_eval_duration": data.get("prompt_eval_duration"),
            "eval_count": data.get("eval_count"),
            "eval_duration": data.get("eval_duration"),
            "done_reason": data.get("done_reason"),
            "processes": process_snapshot(),
        }

        with args.out.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row) + "\n")

        print(i, status, round(wall, 2), flush=True)
        if status != "ok":
            break


if __name__ == "__main__":
    main()
