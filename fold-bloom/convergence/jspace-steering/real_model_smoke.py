#!/usr/bin/env python3
"""Real-model Jacobian-Lens plumbing proof.

This intentionally uses a tiny pretrained GPT-2 checkpoint (hidden size 2).
It proves the external model -> real Jacobian fit -> apply -> FIELD trace path.
It does NOT establish workspace quality or useful semantic steering.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import platform
from pathlib import Path

import torch
import transformers
import jlens

MODEL_ID = "sshleifer/tiny-gpt2"
MODEL_REVISION = "5f91d94bd9cd7190a9f3216ff93cd1dd95f2c7be"
JLENS_COMMIT = "581d398613e5602a5af361e1c34d3a92ea82ba8e"
PROMPT = (
    "A small pretrained language model can still prove that a real Jacobian "
    "was fitted and applied to an actual decoder state."
)


def top_rows(logits: torch.Tensor, tokenizer, k: int = 8) -> list[dict]:
    values, ids = logits.topk(min(k, logits.shape[-1]))
    rows = []
    for rank, (token_id, logit) in enumerate(
        zip(ids.tolist(), values.tolist(), strict=True), start=1
    ):
        rows.append(
            {
                "token_id": int(token_id),
                "token": tokenizer.decode([int(token_id)]),
                "logit": float(logit),
                "rank": rank,
            }
        )
    return rows


def rounded_matrix(t: torch.Tensor, digits: int = 8) -> list[list[float]]:
    return [[round(float(v), digits) for v in row] for row in t.tolist()]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out-dir", default="jlens-real-smoke")
    args = ap.parse_args()
    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)

    torch.manual_seed(0)
    tokenizer = transformers.AutoTokenizer.from_pretrained(
        MODEL_ID, revision=MODEL_REVISION
    )
    hf = transformers.AutoModelForCausalLM.from_pretrained(
        MODEL_ID, revision=MODEL_REVISION
    )
    model = jlens.from_hf(hf, tokenizer, force_bos=False)

    if model.n_layers != 2 or model.d_model != 2:
        raise RuntimeError(
            f"unexpected pinned model shape: layers={model.n_layers} d={model.d_model}"
        )

    lens = jlens.fit(
        model,
        prompts=[PROMPT],
        source_layers=[0],
        target_layer=1,
        dim_batch=2,
        max_seq_len=64,
        skip_first=0,
        checkpoint_path=None,
        resume=False,
    )
    lens_path = out / "lens.pt"
    lens.save(str(lens_path), dtype=torch.float32)

    position = -2
    lens_logits, model_logits, input_ids = lens.apply(
        model,
        PROMPT,
        layers=[0],
        positions=[position],
        max_seq_len=64,
    )
    ids = input_ids[0].detach().cpu().tolist()
    resolved_position = len(ids) + position if position < 0 else position
    j = lens.jacobians[0].detach().cpu().float()
    det = float(torch.linalg.det(j))
    fro = float(torch.linalg.matrix_norm(j))

    trace = {
        "schema": "field-jlens-trace/v0.1",
        "trace_id": "real-smoke:"
        + hashlib.sha256(
            json.dumps(
                {
                    "model": MODEL_ID,
                    "revision": MODEL_REVISION,
                    "jlens": JLENS_COMMIT,
                    "prompt": PROMPT,
                    "position": position,
                },
                sort_keys=True,
            ).encode()
        ).hexdigest()[:20],
        "model": {
            "id": MODEL_ID,
            "revision": MODEL_REVISION,
            "n_layers": model.n_layers,
        },
        "lens": {
            "id": "ci-fit/anthropics-jacobian-lens",
            "revision": JLENS_COMMIT,
            "n_prompts": lens.n_prompts,
            "d_model": lens.d_model,
        },
        "source": {
            "prompt": PROMPT,
            "token_count": len(ids),
            "token_ids": [int(x) for x in ids],
        },
        "producer": {
            "implementation": "fold-bloom/convergence/jspace-steering/real_model_smoke.py",
            "upstream": "anthropics/jacobian-lens",
            "upstream_commit": JLENS_COMMIT,
            "model_revision": MODEL_REVISION,
            "python": platform.python_version(),
            "torch": torch.__version__,
            "transformers": transformers.__version__,
        },
        "cells": [
            {
                "layer": 0,
                "position": resolved_position,
                "kind": "J_LENS",
                "top": top_rows(lens_logits[0][0], tokenizer),
            },
            {
                "layer": model.n_layers - 1,
                "position": resolved_position,
                "kind": "MODEL_OUTPUT",
                "top": top_rows(model_logits[0], tokenizer),
            },
        ],
    }
    (out / "trace.json").write_text(
        json.dumps(trace, ensure_ascii=False, indent=2) + "\n"
    )

    summary = {
        "schema": "field-jlens-real-smoke/v0.1",
        "status": "PASS",
        "truth_boundary": (
            "real pretrained model + real fitted Jacobian + real apply path; "
            "tiny model is a plumbing proof only, not workspace-quality evidence"
        ),
        "model": trace["model"],
        "lens": trace["lens"],
        "source_position": resolved_position,
        "jacobian": rounded_matrix(j),
        "frobenius_norm": fro,
        "determinant": det,
        "finite": bool(torch.isfinite(j).all() and math.isfinite(fro) and math.isfinite(det)),
        "lens_top": trace["cells"][0]["top"][:5],
        "model_top": trace["cells"][1]["top"][:5],
        "trace_file": "trace.json",
        "lens_file": "lens.pt",
    }
    if not summary["finite"]:
        raise RuntimeError("non-finite fitted Jacobian")
    (out / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
