---
name: media-curator
description: Run the local MEDIA REFINERY visual archive curator.
version: 0.1.0
platforms: [macos, linux]
metadata:
  hermes:
    tags: [media, vision, archive, automation]
    category: media
    requires_toolsets: [terminal, file]
    config:
      - key: source_dir
        description: "Read-only source media root."
        default: ""
        prompt: "Path to the image/media root to curate."
      - key: out_dir
        description: "Local MEDIA REFINERY state/output directory."
        default: "~/.0xxx0-media/refinery"
      - key: profile
        description: "MEDIA REFINERY pipeline profile."
        default: "archive-recovery"
      - key: semantic_model
        description: "Ollama vision model for bulk semantic annotation."
        default: "qwen3-vl:8b"
---

# MEDIA CURATOR

## When to Use

Use this skill when the user wants to census, understand, group, search, review, or prepare a large local image/media archive for later creative work.

The source tree is evidence, not a workspace. Never reorganize the physical source tree as a first step.

## Procedure

1. Resolve the configured source/output paths. Confirm the source exists and the output is outside the source tree.
2. Check the local semantic worker before a long run:
   - `ollama list` includes the configured vision model.
   - `ollama ps` reports sufficient context when the model is loaded.
   - Default bulk worker is `qwen3-vl:8b`.
3. Run a dry pass first:

       uv run scripts/media-curator-cycle.py "$SOURCE" \
         --out "$OUT" \
         --config control/MEDIA_REFINERY_PIPELINES.json \
         --profile "$PROFILE" \
         --model "$MODEL" \
         --dry-run

   Completion criterion: the command reports batch IDs and explicitly reports `generation: false` and `source_mutation: false`.

4. Run the bounded semantic cycle:

       uv run scripts/media-curator-cycle.py "$SOURCE" \
         --out "$OUT" \
         --config control/MEDIA_REFINERY_PIPELINES.json \
         --profile "$PROFILE" \
         --model "$MODEL"

   The deterministic refinery performs discovery/hash/dedupe/fingerprints/contact sheets first. The local VLM may only return semantic overlays. Accepted overlays are validated before becoming compiler evidence. The refinery reruns once to update the recipe queue.

5. Read `$OUT/memory/morning-return.json`.
   - Report accepted batches, held batches, and recipe count.
   - Inspect `holds` before doing anything else.
   - A held batch is not permission to loosen validation or mutate source files.

6. For a held/high-value batch only, use Hermes vision or one delegated subagent as an adjudicator. Review the exact batch/contact sheet and write a corrected semantic overlay; never generate a new image to resolve uncertainty. Hermes delegation is for exceptions, not bulk throughput.

7. Rerun the curator cycle. Once the batch overlay validates, the compiler may emit C/A/P/M recipe candidates. Stop there unless the user separately authorizes TRANSLATE/rendering.

## Model Policy

- Bulk visual semantics: local `qwen3-vl:8b` through Ollama.
- Supervisor/orchestration: Hermes main model. A stronger hosted model is useful for disputed/high-value batches, but is not needed for the bulk pass.
- Similarity/search embeddings are a separate layer. Prefer SigLIP2 when added; do not pretend VLM captions are an embedding index.
- Do not use the same model output as both composition truth and aesthetic-cluster truth.

## Safety / Authority

Allowed:
- read media;
- compute hashes/metrics;
- create local contact sheets/control maps;
- write MEMORY/SHARE derivatives outside source;
- write validated semantic overlays;
- update the local recipe queue.

Forbidden without separate explicit authority:
- move, rename, delete, or rewrite source media;
- publish;
- upload the entire archive;
- generate new images/video;
- auto-TRANSLATE or auto-render;
- promote low-confidence semantics into canonical overlays.

## Verification

A successful run has:
- `memory/run.json`
- `memory/index.jsonl`
- `memory/worker-packets.jsonl`
- `memory/semantic-overlays/`
- `memory/overlay-validation/`
- `memory/recipe-queue.json`
- `memory/morning-return.json`

The final return must state that source media was not mutated and rendering was not performed.
