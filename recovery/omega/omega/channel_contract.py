from __future__ import annotations
import json
from pathlib import Path

REQUIRED = {"id","semantic_target","visual_channel","decoder","degradation","source_return","precision_class","status"}
PRECISION = {"exact","ordered","categorical","approximate","interface-only"}
STATUS = {"ADOPT","PROVISIONAL","TEST","UNASSIGNED","REJECT"}


def validate_channel_contract(path: str | Path) -> dict:
    path = Path(path)
    obj = json.loads(path.read_text(encoding="utf-8"))
    issues: list[dict] = []
    ids: set[str] = set()
    for i, ch in enumerate(obj.get("channels", [])):
        missing = sorted(REQUIRED - set(ch))
        if missing:
            issues.append({"index": i, "id": ch.get("id"), "issue": "missing_fields", "fields": missing})
        cid = ch.get("id")
        if cid in ids:
            issues.append({"index": i, "id": cid, "issue": "duplicate_id"})
        elif cid:
            ids.add(cid)
        if ch.get("precision_class") not in PRECISION:
            issues.append({"index": i, "id": cid, "issue": "invalid_precision_class", "value": ch.get("precision_class")})
        if ch.get("status") not in STATUS:
            issues.append({"index": i, "id": cid, "issue": "invalid_status", "value": ch.get("status")})
        # Guard the central discipline: unassigned channels cannot silently claim a decoder.
        if ch.get("status") == "UNASSIGNED" and ch.get("decoder") not in {None, "", "none until calibrated"}:
            issues.append({"index": i, "id": cid, "issue": "unassigned_channel_has_decoder"})
        # Interface-only color cannot be the only carrier of exact/categorical semantics.
        if "color" in str(ch.get("visual_channel", "")).lower() and ch.get("precision_class") in {"exact", "ordered"}:
            issues.append({"index": i, "id": cid, "issue": "color_used_for_precision"})
    return {
        "schema": obj.get("schema"),
        "path": str(path),
        "channels": len(obj.get("channels", [])),
        "forbidden_rules": len(obj.get("forbidden", [])),
        "issues": issues,
        "ok": not issues,
    }
