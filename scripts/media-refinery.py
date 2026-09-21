#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy>=2.0", "pillow>=10.0"]
# ///
"""Bounded, model-independent visual-media census + quantitative fingerprint pass.

Read-only with respect to the source directory. Outputs reports, optional contact sheet,
and optional derived control maps to a separate output directory.

Law: byte identity, quantitative aesthetics, semantic composition, and render recipes
are separate layers. This tool never generates model media and never mutates sources.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from collections import Counter
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageOps

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp"}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def entropy01(gray_u8: np.ndarray) -> float:
    hist = np.bincount(gray_u8.ravel(), minlength=256).astype(np.float64)
    p = hist / hist.sum()
    p = p[p > 0]
    return float(-(p * np.log2(p)).sum() / 8.0)


def colorfulness(rgb: np.ndarray) -> float:
    x = rgb.astype(np.float32)
    rg = x[..., 0] - x[..., 1]
    yb = 0.5 * (x[..., 0] + x[..., 1]) - x[..., 2]
    return float((math.hypot(float(rg.std()), float(yb.std())) +
                  0.3 * math.hypot(float(rg.mean()), float(yb.mean()))) / 255.0)


def palette5(im: Image.Image) -> list[dict[str, Any]]:
    q = im.resize((160, 200)).quantize(colors=5, method=Image.Quantize.MEDIANCUT)
    colors = q.getcolors(maxcolors=256) or []
    pal = q.getpalette() or []
    total = sum(n for n, _ in colors) or 1
    out = []
    for n, idx in sorted(colors, reverse=True):
        rgb = tuple(pal[idx * 3: idx * 3 + 3])
        out.append({
            "hex": "#%02x%02x%02x" % rgb,
            "fraction": round(n / total, 6),
        })
    return out


def metrics(path: Path) -> dict[str, Any]:
    with Image.open(path) as im0:
        im = ImageOps.exif_transpose(im0).convert("RGB")
        rgb = np.asarray(im, dtype=np.uint8)
        hsv = np.asarray(im.convert("HSV"), dtype=np.uint8)
        palette = palette5(im)

    h, w = rgb.shape[:2]
    gray = np.asarray(Image.fromarray(rgb).convert("L"), dtype=np.uint8)
    g = gray.astype(np.float32) / 255.0

    gy, gx = np.gradient(g)
    mag = np.hypot(gx, gy)
    angle = np.mod(np.arctan2(gy, gx), np.pi)
    weight_sum = float(mag.sum()) + 1e-12

    vert = ((angle < np.pi / 8) | (angle >= 7 * np.pi / 8))
    horiz = (angle >= 3 * np.pi / 8) & (angle < 5 * np.pi / 8)
    orient_vertical = float(mag[vert].sum() / weight_sum)
    orient_horizontal = float(mag[horiz].sum() / weight_sum)
    orient_diagonal = float(max(0.0, 1.0 - orient_vertical - orient_horizontal))

    gradient_mean = float(mag.mean())
    gradient_p90 = float(np.percentile(mag, 90))
    edge_density = float((mag > 0.08).mean())

    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = w / 2.0, h / 2.0
    rx = np.abs(xx - cx) / max(cx, 1.0)
    ry = np.abs(yy - cy) / max(cy, 1.0)
    center = (rx < 0.33) & (ry < 0.33)
    border = (rx > 0.72) | (ry > 0.72)
    mean_mag = float(mag.mean()) + 1e-12

    bx = max(1, int(w * 0.04))
    by = max(1, int(h * 0.04))
    thirds = np.zeros((h, w), dtype=bool)
    for x in (w // 3, 2 * w // 3):
        thirds[:, max(0, x - bx):min(w, x + bx + 1)] = True
    for y in (h // 3, 2 * h // 3):
        thirds[max(0, y - by):min(h, y + by + 1), :] = True

    total = float(mag.sum()) + 1e-12
    visual_center_x = float((mag * xx).sum() / total / w)
    visual_center_y = float((mag * yy).sum() / total / h)

    k = 11
    pad = k // 2
    gp = np.pad(g, pad, mode="reflect")
    integral = np.pad(gp, ((1, 0), (1, 0)), mode="constant").cumsum(0).cumsum(1)
    blur = (integral[k:, k:] - integral[:-k, k:] - integral[k:, :-k] + integral[:-k, :-k]) / (k * k)
    residual = np.abs(g - blur)

    return {
        "width": int(w),
        "height": int(h),
        "aspect": round(w / h, 6),
        "luminance_mean": round(float(g.mean()), 6),
        "contrast": round(float(g.std()), 6),
        "entropy": round(entropy01(gray), 6),
        "saturation": round(float(hsv[..., 1].mean() / 255.0), 6),
        "colorfulness": round(colorfulness(rgb), 6),
        "palette": palette,
        "gradient_mean": round(gradient_mean, 6),
        "gradient_p90": round(gradient_p90, 6),
        "edge_density_strong": round(edge_density, 6),
        "orientation": {
            "vertical": round(orient_vertical, 6),
            "horizontal": round(orient_horizontal, 6),
            "diagonal": round(orient_diagonal, 6),
        },
        "symmetry": {
            "left_right": round(float(1.0 - np.abs(g - np.fliplr(g)).mean()), 6),
            "top_bottom": round(float(1.0 - np.abs(g - np.flipud(g)).mean()), 6),
        },
        "energy": {
            "center_relative": round(float(mag[center].mean() / mean_mag), 6),
            "border_relative": round(float(mag[border].mean() / mean_mag), 6),
            "thirds_relative": round(float(mag[thirds].mean() / mean_mag), 6),
        },
        "visual_center": {"x": round(visual_center_x, 6), "y": round(visual_center_y, 6)},
        "quiet_fraction": round(float((residual < (8 / 255.0)).mean()), 6),
        "dark_fraction": round(float((gray < 64).mean()), 6),
        "light_fraction": round(float((gray > 192).mean()), 6),
    }


def make_contact_sheet(items: list[dict[str, Any]], out_path: Path, thumb=(320, 400), cols=4) -> None:
    rows = math.ceil(len(items) / cols)
    margin, label_h = 18, 28
    sheet = Image.new("RGB", (cols * thumb[0] + (cols + 1) * margin,
                              rows * (thumb[1] + label_h) + (rows + 1) * margin), "white")
    draw = ImageDraw.Draw(sheet)
    for i, item in enumerate(items):
        with Image.open(item["_path"]) as im0:
            im = ImageOps.exif_transpose(im0).convert("RGB")
            im.thumbnail(thumb)
        x0 = margin + (i % cols) * (thumb[0] + margin)
        y0 = margin + (i // cols) * (thumb[1] + label_h + margin)
        x = x0 + (thumb[0] - im.width) // 2
        y = y0 + (thumb[1] - im.height) // 2
        sheet.paste(im, (x, y))
        draw.text((x0, y0 + thumb[1] + 6), f"{i+1:02d}  {item['basename']}", fill="black")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path, optimize=True)


def write_maps(item: dict[str, Any], out_dir: Path) -> list[str]:
    path = Path(item["_path"])
    with Image.open(path) as im0:
        im = ImageOps.exif_transpose(im0).convert("RGB")
    gray = np.asarray(im.convert("L"), dtype=np.float32) / 255.0
    gy, gx = np.gradient(gray)
    mag = np.hypot(gx, gy)
    q = float(np.percentile(mag[mag > 0], 88)) if np.any(mag > 0) else 1.0
    structure = np.clip(mag / max(q, 1e-9), 0, 1)
    tone = gray
    h, w = gray.shape
    yy, xx = np.mgrid[0:h, 0:w]
    dx, dy = (xx / max(w - 1, 1) - 0.5), (yy / max(h - 1, 1) - 0.5)
    focus = np.clip(1.0 - np.sqrt((dx / 0.5) ** 2 + (dy / 0.5) ** 2), 0, 1)

    out_dir.mkdir(parents=True, exist_ok=True)
    stem = path.stem
    outputs = []
    for name, arr in (("structure", structure), ("tone", tone), ("focus", focus)):
        op = out_dir / f"{stem}__{name}.png"
        Image.fromarray(np.uint8(np.clip(arr, 0, 1) * 255), mode="L").save(op, optimize=True)
        outputs.append(op.name)
    return outputs


def load_semantic(path: Path | None) -> dict[str, Any]:
    if not path:
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {str(x["seq"]): x for x in data.get("items", [])}


def batch_aggregate(items: list[dict[str, Any]]) -> dict[str, Any]:
    keys = [
        "luminance_mean", "contrast", "entropy", "saturation", "colorfulness",
        "gradient_mean", "gradient_p90", "edge_density_strong",
        "quiet_fraction", "dark_fraction", "light_fraction",
    ]
    out: dict[str, Any] = {}
    for key in keys:
        vals = np.array([x["quantitative"][key] for x in items], dtype=np.float64)
        out[key] = {
            "mean": round(float(vals.mean()), 6),
            "min": round(float(vals.min()), 6),
            "max": round(float(vals.max()), 6),
            "stdev": round(float(vals.std()), 6),
        }
    classes = Counter(
        x.get("semantic", {}).get("composition_class")
        for x in items
        if x.get("semantic", {}).get("composition_class")
    )
    if classes:
        out["composition_classes"] = dict(sorted(classes.items()))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("source_dir", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--semantic", type=Path)
    ap.add_argument("--contact-sheet", action="store_true")
    ap.add_argument("--maps", type=int, nargs="*", metavar="SEQ",
                    help="Write derived structure/tone/focus maps for listed 1-based items. Empty means all.")
    args = ap.parse_args()

    root = args.source_dir.expanduser().resolve()
    out = args.out.expanduser().resolve()
    if out == root or root in out.parents:
        raise SystemExit("refusing output inside source tree")
    out.mkdir(parents=True, exist_ok=True)

    paths = sorted(p for p in root.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS)
    sem = load_semantic(args.semantic)
    items = []
    for seq, path in enumerate(paths, 1):
        digest = sha256(path)
        item = {
            "seq": seq,
            "basename": path.name,
            "sha256": digest,
            "bytes": path.stat().st_size,
            "quantitative": metrics(path),
            "_path": str(path),
        }
        if str(seq) in sem:
            item["semantic"] = {k: v for k, v in sem[str(seq)].items() if k != "seq"}
        items.append(item)

    counts = Counter(x["sha256"] for x in items)
    duplicate_groups = [
        {"sha256": h, "seq": [x["seq"] for x in items if x["sha256"] == h]}
        for h, n in counts.items() if n > 1
    ]

    maps_requested = args.maps is not None
    map_seqs = set(args.maps or [x["seq"] for x in items]) if maps_requested else set()
    derived = {}
    for x in items:
        if x["seq"] in map_seqs:
            derived[str(x["seq"])] = write_maps(x, out / "maps")

    if args.contact_sheet:
        make_contact_sheet(items, out / "contact-sheet.png")

    public_items = []
    for x in items:
        y = dict(x)
        y.pop("_path", None)
        public_items.append(y)

    batch = {
        "schema": "0xxx0/media-refinery-fingerprint/v0.1",
        "source": {
            "kind": "directory",
            "path_redacted": root.name,
            "source_mutated": False,
        },
        "counts": {
            "files": len(items),
            "byte_objects": len(counts),
            "exact_duplicate_groups": len(duplicate_groups),
        },
        "duplicate_groups": duplicate_groups,
        "batch_quantitative": batch_aggregate(public_items),
        "layers": {
            "byte_identity": "sha256",
            "quantitative_aesthetic": "deterministic local metrics",
            "semantic_composition": "optional review overlay; never inferred from hash or title",
            "render_recipe": "out of scope for this scanner",
        },
        "items": public_items,
        "derived_control_maps": derived,
        "stop": "Fingerprint pass ends here. Rendering requires a separate bounded recipe with hypothesis, budget, locks and stop condition.",
    }
    (out / "fingerprints.json").write_text(json.dumps(batch, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(batch["counts"], indent=2))


if __name__ == "__main__":
    main()
