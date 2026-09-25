# env0 — what this is, and why it's called a *harness*

*Written 2026-09-25 by kestrel. You said: "if you have access to env0 maybe make a
note wherever that project is — i think its like my harness." It is. Here's the map.*

## The artifact

**ENV-0 Body ↔ House Interface Atlas v0.1** — a physical print pack. `A2 landscape, 594×420 mm`.

| file | what |
|---|---|
| `ENV0_Atlas_v0_1_A2.pdf` | 2-page print pack |
| `ENV0_plate14_A2_v0_1.svg` | editable integrated field hero plate |
| `ENV0_symbols_A2_v0_1.svg` | editable symbol/type master |
| `*.png` | raster previews |

**Colour grammar** — monochrome-first, and the colour is not decoration, it's typing:
- **orange** = matter / energy / force
- **blue** = information / measurement
- **violet** = typed cross-domain coupling / docks

**Line grammar** — `dotted` = speculative · `dashed` = detachable.

*(source: `ENV0_Atlas_v0_1_README.txt`, this directory)*

## Why "harness" is the right word

It isn't a drawing of a body and a house. It's the **interface contract** between them —
which is exactly what a harness is: the thing that makes two systems driveable by each
other without collapsing one into the other. Three properties make it a harness rather
than an illustration:

1. **Ports, not pictures.** The atlas names *connection points* and types them. A port you
   can't enumerate is a decoration; a port you can enumerate is an integration surface.
2. **Direction and kind are encoded.** Colour carries domain (matter / information /
   coupling). So a port declares *what flows* and *which system it belongs to*.
3. **Detachability is drawn.** `dashed = detachable` is a reversibility annotation. This is
   the same discipline as `cp` before `rm` — the diagram states what can be separated
   without loss, which is what makes it an engineering document and not a poster.

## The mapping to the digital stack (so we don't have to re-derive it)

| env0 (physical) | equivalent in the digital stack |
|---|---|
| a typed port | a schema'd interface / a control file |
| orange / blue / violet | domain tags — the same role `kind` plays in the corpus |
| dotted = speculative | `HYPOTHESIZED` in the claim-type ladder |
| dashed = detachable | reversible-op annotation — "here is the undo" |
| the plate | a projection: one view over a canonical field, hiding detail lawfully |
| the atlas as a whole | AXIS itself — canonical state + lawful projections |

**That is the real claim**: env0 and the AXIS/corpus work are the **same structure in two
substrates**. One is printed, one is on disk. Both are: a canonical field, typed couplings,
lawful projections, and an explicit distinction between what's validated and what's
speculative.

## Where it stands — and the real answer to "a make project IRL"

It is a **prepared physical make packet that has never been executed.** From
`AXIS/work/make-grammar/EVIDENCE-MATRIX-2026-09-23.md`:

> *"print-ready masters exist (`recovery/env0/`, SVG masters frozen; ENV0 packet sources
> `ENV0_P0_BUILD_SHEET_A3.pdf`) — **no executed printed-projection receipt located.**"*

> *"ENV-0 gauge packet bounds (non-PPE, geometry-gauge-only, `PHYSICAL_RETURN_ENV0:7-13`) —
> **prepared, not executed.**"*

Both lines carry the status `P ◐ prepared`. So env0 is not a drawing project — it is a make
*packet*: a **build sheet** (`ENV0_P0_BUILD_SHEET_A3.pdf`), an atlas, a symbol master, and a
gauge, all frozen and print-ready, **waiting on the one thing that has not happened: someone
making it.**

**And it belongs to a grammar.** `AXIS/work/make-grammar/` holds `MAKE.schema.json`,
`MAKE-SCHEMA-0.1.md`, `MAKE-EXAMPLE-wrap-proof.json`, `spike-001-wrap/`, and a
`goal-make-convergence.json`. So env0 is one *instance* of a formal language for making —
the grammar exists, the packet is prepared, and the execution loop has never run once.

**The recorded next action, already written down:**

> *"Execute one prepared packet (axial MODE-ring diagnostic and/or ENV-0 gauge) — touches P for
> PROJECT/CONSTRAIN and the cut/assemble loop; record the actual verbs after execution rather
> than preclaiming family memberships."*

**That is a print-and-build task, not a software task.** Which makes it the only item on the
board today that moves in the physical world — and it is already prepared.

## The honest caveat — and it's in your own README

> *"This v0.1 is a grammar stress-test, not a claim that all shown ports or physiological
> relations are validated implementations."*

Keep that sentence. It's the most important line in the pack. It's the difference between
a harness and a horoscope — the artifact states its own epistemic status, so a reader
cannot mistake the grammar for a finding.

## Where it stands

- **v0.1 exists as files.** Not published, not printed (no evidence of either in this dir).
- It appears in `control/archive-2026-09/PHYSICAL_RETURN_ENV0_2026-09-20.json` — so it was
  part of the 2026-09-20 physical-return pass.
- **Not yet linked** to the Field Index surfaces or any reader route. That's the open
  question: whether a printed plate and an HTML surface should be two projections of one
  canonical field, or two separate objects.
