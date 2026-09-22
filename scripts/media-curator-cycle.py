#!/usr/bin/env python3
"""Run one bounded MEDIA REFINERY -> local VLM semantics -> refinery cycle.

Source media is read-only. This script never moves, renames, deletes, publishes, or renders
source media. It uses an Ollama vision model only to produce semantic overlays, validates
those overlays, installs accepted overlays into the local MEMORY surface, then reruns the
existing refinery so its recipe queue is rebuilt from reviewed semantics.
"""
from __future__ import annotations

import argparse
import base64
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            out.append(json.loads(line))
    return out


def write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")


def run_refinery(args: argparse.Namespace) -> None:
    cmd = [
        "uv", "run", str(args.refinery_script),
        str(args.source_dir),
        "--out", str(args.out),
        "--config", str(args.config),
        "--profile", args.profile,
    ]
    subprocess.run(cmd, check=True)


def ollama_request(host: str, payload: dict[str, Any], timeout: int = 900) -> dict[str, Any]:
    req = urllib.request.Request(
        host.rstrip("/") + "/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def image_b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def semantic_schema(required_fields: list[str]) -> dict[str, Any]:
    flexible = {"type": ["string", "array", "object", "number", "boolean"]}
    item_props: dict[str, Any] = {
        "item_id": {"type": "string"},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "notes": {"type": "string"},
    }
    for field in required_fields:
        item_props[field] = flexible
    return {
        "type": "object",
        "properties": {
            "batch_id": {"type": "string"},
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": item_props,
                    "required": ["item_id", *required_fields, "confidence", "notes"],
                    "additionalProperties": True,
                },
            },
        },
        "required": ["batch_id", "items"],
        "additionalProperties": False,
    }


def make_prompt(packet: dict[str, Any], retry_feedback: list[str] | None = None) -> str:
    required = packet["task"]["required_fields"]
    rows = "\n".join(
        f"- {i+1:02d} {x['item_id']} :: {x['relative_path']}"
        for i, x in enumerate(packet["inputs"])
    )
    constraints = "\n".join(f"- {x}" for x in packet.get("domain_constraints", []))
    feedback = ""
    if retry_feedback:
        feedback = "\nPrevious submission failed validation. Correct these issues:\n" + "\n".join(
            f"- {x}" for x in retry_feedback
        )
    return f"""You are a bounded visual-media semantic annotator.

Batch: {packet['batch_id']}
Return JSON only and exactly one item row for every listed item_id.

ITEM ORDER / IDENTITY
{rows}

REQUIRED SEMANTIC FIELDS
{json.dumps(required, ensure_ascii=False)}

RULES
- The contact sheet is a review projection; item_id above is the identity key.
- Do not infer lineage, authorship, dates, or project membership from filename alone.
- Keep COMPOSITION separate from SURFACE/APPEARANCE.
- Appearance similarity is not evidence of semantic identity.
- Use the literal string UNKNOWN when evidence is insufficient; never fabricate precision.
- confidence is 0..1 for the semantic row as a whole.
- notes must be concise and mention uncertainty or mixed evidence when relevant.
{constraints}
{feedback}
"""


def nonempty(v: Any) -> bool:
    if v is None:
        return False
    if isinstance(v, str):
        return bool(v.strip())
    if isinstance(v, (list, dict)):
        return bool(v)
    return True


def validate_overlay(
    overlay: dict[str, Any],
    packet: dict[str, Any],
    min_coverage: float,
    min_confidence: float,
) -> dict[str, Any]:
    reasons: list[str] = []
    expected = [x["item_id"] for x in packet["inputs"]]
    required = packet["task"]["required_fields"]
    if overlay.get("batch_id") != packet["batch_id"]:
        reasons.append("batch_id mismatch")
    rows = overlay.get("items")
    if not isinstance(rows, list):
        rows = []
        reasons.append("items is not an array")
    ids = [x.get("item_id") for x in rows if isinstance(x, dict)]
    if len(ids) != len(set(ids)):
        reasons.append("duplicate item_id rows")
    extras = sorted(set(ids) - set(expected))
    if extras:
        reasons.append("unknown item_ids: " + ", ".join(extras))
    present = set(ids) & set(expected)
    coverage = len(present) / max(1, len(expected))
    if coverage < min_coverage:
        reasons.append(f"coverage {coverage:.3f} below {min_coverage:.3f}")
    low_confidence: list[str] = []
    for row in rows:
        if not isinstance(row, dict) or row.get("item_id") not in expected:
            continue
        missing = [f for f in required if not nonempty(row.get(f))]
        if missing:
            reasons.append(f"{row.get('item_id')}: missing {','.join(missing)}")
        try:
            conf = float(row.get("confidence"))
        except (TypeError, ValueError):
            conf = -1
        if conf < min_confidence:
            low_confidence.append(str(row.get("item_id")))
    if low_confidence:
        reasons.append("low confidence: " + ", ".join(low_confidence))
    return {
        "schema": "0xxx0/media-overlay-validation/v0.1",
        "batch_id": packet["batch_id"],
        "status": "ACCEPTED" if not reasons else "RETRY",
        "coverage": round(coverage, 6),
        "minimum_confidence": min_confidence,
        "reasons": reasons,
    }


def packet_images(packet: dict[str, Any], source: Path, out: Path, attempt: int, max_individual: int) -> list[str]:
    images: list[str] = []
    contact = packet.get("contact_sheet")
    if contact:
        p = out / contact
        if p.exists():
            images.append(image_b64(p))
    # Retry gets exact individual images as additional evidence, bounded.
    if attempt > 0:
        for item in packet["inputs"][:max_individual]:
            p = source / item["relative_path"]
            if p.exists() and p.is_file():
                images.append(image_b64(p))
    return images


def annotate_packet(packet: dict[str, Any], args: argparse.Namespace) -> tuple[bool, dict[str, Any]]:
    submission_dir = args.out / "memory" / "overlay-submissions"
    validation_dir = args.out / "memory" / "overlay-validation"
    retry_feedback: list[str] = []
    last_validation: dict[str, Any] = {}
    for attempt in range(args.attempts):
        prompt = make_prompt(packet, retry_feedback if retry_feedback else None)
        payload = {
            "model": args.model,
            "messages": [{
                "role": "user",
                "content": prompt,
                "images": packet_images(packet, args.source_dir, args.out, attempt, args.max_individual_retry),
            }],
            "stream": False,
            "format": semantic_schema(packet["task"]["required_fields"]),
            "options": {
                "temperature": 0,
                "num_ctx": args.ollama_context,
            },
            "keep_alive": args.keep_alive,
        }
        response = ollama_request(args.ollama_host, payload, timeout=args.timeout)
        content = response.get("message", {}).get("content", "")
        try:
            overlay = json.loads(content)
        except json.JSONDecodeError:
            overlay = {"batch_id": packet["batch_id"], "items": []}
            retry_feedback = ["model response was not valid JSON"]
        overlay["schema"] = "0xxx0/media-semantic-overlay/v0.1"
        overlay["worker"] = {
            "kind": "ollama-vlm",
            "model": args.model,
            "attempt": attempt + 1,
        }
        sub_path = submission_dir / f"{packet['batch_id']}__attempt-{attempt+1}.json"
        write_json(sub_path, overlay)
        validation = validate_overlay(overlay, packet, args.min_coverage, args.min_confidence)
        validation["attempt"] = attempt + 1
        val_path = validation_dir / f"{packet['batch_id']}__attempt-{attempt+1}.json"
        write_json(val_path, validation)
        last_validation = validation
        if validation["status"] == "ACCEPTED":
            canonical = args.out / "memory" / "semantic-overlays" / f"{packet['batch_id']}.json"
            write_json(canonical, overlay)
            return True, validation
        retry_feedback = validation["reasons"]
    return False, last_validation


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("source_dir", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--config", type=Path, default=Path("control/MEDIA_REFINERY_PIPELINES.json"))
    ap.add_argument("--profile", default="archive-recovery")
    ap.add_argument("--refinery-script", type=Path, default=Path("scripts/media-refinery-run.py"))
    ap.add_argument("--model", default="qwen3.5:9b")
    ap.add_argument("--ollama-host", default="http://127.0.0.1:11434")
    ap.add_argument("--ollama-context", type=int, default=65536)
    ap.add_argument("--attempts", type=int, default=2)
    ap.add_argument("--min-coverage", type=float, default=1.0)
    ap.add_argument("--min-confidence", type=float, default=0.55)
    ap.add_argument("--max-batches", type=int, default=0)
    ap.add_argument("--max-individual-retry", type=int, default=8)
    ap.add_argument("--timeout", type=int, default=900)
    ap.add_argument("--keep-alive", default="30m")
    ap.add_argument("--no-refinery", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    args.source_dir = args.source_dir.expanduser().resolve()
    args.out = args.out.expanduser().resolve()
    args.config = args.config.expanduser().resolve()
    args.refinery_script = args.refinery_script.expanduser().resolve()

    if not args.source_dir.is_dir():
        raise SystemExit("source directory missing")
    args.out.mkdir(parents=True, exist_ok=True)

    if not args.no_refinery:
        run_refinery(args)

    packets = read_jsonl(args.out / "memory" / "worker-packets.jsonl")
    if args.max_batches:
        packets = packets[: args.max_batches]

    existing = args.out / "memory" / "semantic-overlays"
    pending = [p for p in packets if not (existing / f"{p['batch_id']}.json").exists()]
    if args.dry_run:
        print(json.dumps({
            "source": str(args.source_dir),
            "out": str(args.out),
            "model": args.model,
            "packets": len(packets),
            "pending": [p["batch_id"] for p in pending],
            "generation": False,
            "source_mutation": False,
        }, indent=2))
        return

    accepted: list[str] = []
    held: list[dict[str, Any]] = []
    for packet in pending:
        try:
            ok, validation = annotate_packet(packet, args)
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            ok = False
            validation = {
                "status": "HELD",
                "reasons": [f"ollama transport failure: {type(exc).__name__}: {exc}"],
            }
        if ok:
            accepted.append(packet["batch_id"])
        else:
            held.append({"batch_id": packet["batch_id"], "validation": validation})

    # Accepted semantic overlays alter compiler evidence, so rerun the deterministic refinery once.
    if accepted and not args.no_refinery:
        run_refinery(args)

    recipes_path = args.out / "memory" / "recipe-queue.json"
    recipes = json.loads(recipes_path.read_text(encoding="utf-8")) if recipes_path.exists() else []
    morning = {
        "schema": "0xxx0/media-curator-morning-return/v0.1",
        "created_epoch": int(time.time()),
        "source_root_basename": args.source_dir.name,
        "profile": args.profile,
        "semantic_model": args.model,
        "counts": {
            "packets_total": len(packets),
            "already_reviewed": len(packets) - len(pending),
            "attempted": len(pending),
            "accepted": len(accepted),
            "held": len(held),
            "recipes_ready": len(recipes),
        },
        "accepted_batches": accepted,
        "holds": held,
        "recipe_queue": str(recipes_path),
        "source_mutated": False,
        "rendering_performed": False,
        "next": "Inspect holds first; only then select reviewed recipes for TRANSLATE.",
    }
    write_json(args.out / "memory" / "morning-return.json", morning)
    print(json.dumps(morning, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
