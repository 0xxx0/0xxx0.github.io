#!/usr/bin/env python3
"""Export Anthropic jacobian-lens readouts into FIELD's portable trace schema.

This is a bridge, not a fork of jlens. It expects the upstream package to be
installed separately and never fabricates intervention directions.

Pinned upstream when authored:
  anthropics/jacobian-lens@581d398613e5602a5af361e1c34d3a92ea82ba8e
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Iterable


def parse_ints(value: str | None) -> list[int] | None:
    if value is None or value.strip() == "":
        return None
    return [int(x.strip()) for x in value.split(",") if x.strip()]


def top_rows(logits, tokenizer, k: int) -> list[list[dict]]:
    k = max(1, min(int(k), int(logits.shape[-1])))
    values, ids = logits.topk(k, dim=-1)
    rows: list[list[dict]] = []
    for row_ids, row_values in zip(ids.tolist(), values.tolist(), strict=True):
        rows.append(
            [
                {
                    "token_id": int(token_id),
                    "token": tokenizer.decode([int(token_id)]),
                    "logit": float(logit),
                    "rank": rank,
                }
                for rank, (token_id, logit) in enumerate(zip(row_ids, row_values, strict=True), start=1)
            ]
        )
    return rows


def resolve_positions(seq_len: int, positions: list[int] | None) -> list[int]:
    if positions is None:
        return list(range(seq_len))
    out: list[int] = []
    for pos in positions:
        resolved = pos if pos >= 0 else seq_len + pos
        if resolved < 0 or resolved >= seq_len:
            raise ValueError(f"position {pos} resolves outside sequence length {seq_len}")
        out.append(resolved)
    return out


def choose_device(torch, requested: str) -> str:
    if requested != "auto":
        return requested
    if torch.cuda.is_available():
        return "cuda"
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, help="HuggingFace model id or local path")
    ap.add_argument("--model-revision", default=None)
    ap.add_argument("--lens", required=True, help="local lens path/dir or HuggingFace repo")
    ap.add_argument("--lens-filename", default="lens.pt")
    ap.add_argument("--lens-revision", default=None)
    prompt_group = ap.add_mutually_exclusive_group(required=True)
    prompt_group.add_argument("--prompt")
    prompt_group.add_argument("--prompt-file")
    ap.add_argument("--layers", default=None, help="comma-separated source layers; default fitted layers")
    ap.add_argument("--positions", default=None, help="comma-separated token positions; negatives allowed")
    ap.add_argument("--top-k", type=int, default=8)
    ap.add_argument("--max-seq-len", type=int, default=512)
    ap.add_argument("--device", default="auto", help="auto|cpu|cuda|mps")
    ap.add_argument("--trace-id", default=None)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    import torch
    import transformers
    import jlens

    prompt = args.prompt if args.prompt is not None else Path(args.prompt_file).read_text()
    device = choose_device(torch, args.device)

    tok = transformers.AutoTokenizer.from_pretrained(args.model, revision=args.model_revision)
    hf = transformers.AutoModelForCausalLM.from_pretrained(
        args.model,
        revision=args.model_revision,
        torch_dtype="auto",
    ).to(device)
    hf.eval()
    model = jlens.from_hf(hf, tok)
    lens = jlens.JacobianLens.from_pretrained(
        args.lens,
        filename=args.lens_filename,
        revision=args.lens_revision,
    )

    layers = parse_ints(args.layers)
    positions_arg = parse_ints(args.positions)
    lens_logits, model_logits, input_ids = lens.apply(
        model,
        prompt,
        layers=layers,
        positions=positions_arg,
        max_seq_len=args.max_seq_len,
    )

    token_ids = input_ids[0].detach().cpu().tolist()
    resolved_positions = resolve_positions(len(token_ids), positions_arg)
    cells: list[dict] = []

    for layer, logits in sorted(lens_logits.items()):
        rows = top_rows(logits, tok, args.top_k)
        for position, top in zip(resolved_positions, rows, strict=True):
            cells.append({"layer": int(layer), "position": int(position), "kind": "J_LENS", "top": top})

    final_layer = int(model.n_layers - 1)
    model_rows = top_rows(model_logits, tok, args.top_k)
    # The model's final output is the authority for the final row. If the fitted
    # lens also contains final_layer, replace that cell rather than duplicate it.
    cells = [c for c in cells if c["layer"] != final_layer]
    for position, top in zip(resolved_positions, model_rows, strict=True):
        cells.append({"layer": final_layer, "position": int(position), "kind": "MODEL_OUTPUT", "top": top})

    seed = json.dumps(
        {"model": args.model, "lens": args.lens, "prompt": prompt, "positions": resolved_positions},
        sort_keys=True,
    ).encode()
    trace_id = args.trace_id or "jlens:" + hashlib.sha256(seed).hexdigest()[:20]

    payload = {
        "schema": "field-jlens-trace/v0.1",
        "trace_id": trace_id,
        "model": {
            "id": args.model,
            "revision": args.model_revision,
            "n_layers": int(model.n_layers),
        },
        "lens": {
            "id": args.lens,
            "revision": args.lens_revision,
            "n_prompts": int(lens.n_prompts),
            "d_model": int(lens.d_model),
        },
        "source": {
            "prompt": prompt,
            "token_count": len(token_ids),
            "token_ids": [int(x) for x in token_ids],
        },
        "producer": {
            "implementation": "fold-bloom/convergence/jspace-steering/export_jlens.py",
            "upstream": "anthropics/jacobian-lens",
            "upstream_commit": "581d398613e5602a5af361e1c34d3a92ea82ba8e",
            "device": device,
        },
        "cells": sorted(cells, key=lambda c: (c["layer"], c["position"])),
    }

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(out)


if __name__ == "__main__":
    main()
