from __future__ import annotations
import hashlib, json, re, unicodedata
from datetime import datetime, timezone
from pathlib import Path


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    return sha256_bytes(text.encode("utf-8"))


def stable_id(prefix: str, seed: str, n: int = 20) -> str:
    return f"{prefix}:{sha256_text(seed)[:n]}"


def normalize_text(text: str) -> str:
    return unicodedata.normalize("NFC", text)


def dumps(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def load_json(path: str | Path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def iter_jsonl(path: str | Path):
    p = Path(path)
    if not p.exists():
        return
    with p.open("r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSONL {p}:{i}: {e}") from e


def append_jsonl(path: str | Path, obj) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        f.write(dumps(obj) + "\n")


def simple_terms(q: str) -> list[str]:
    return [t for t in re.findall(r"[\w-]+", normalize_text(q), flags=re.UNICODE) if t]
