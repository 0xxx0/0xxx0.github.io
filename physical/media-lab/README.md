# PHYSICAL / MEDIA LAB · donor packet v0.1

Status: **HOLD / DONOR / NOT REGISTERED**  
Authority: **NONE**  
Host relation: digital media preparation → physical fabrication → observed RETURN.

This folder is deliberately inert. It adds no FIELD route, CURRENT head, WAITING item, queue, registry, or effect path. It exists so printer/media/transfer experiments can accumulate as evidence without becoming project debt.

Existing anchors stay authoritative:

- `/physical/print-01/` remains the single prepared paper↔FIELD proof fixture. Its stop law is unchanged.
- `/20261007-art-atlas/` remains the FIELD / ART host. PR #957 currently proposes a local-only Media Refinery compiler; this packet can consume such a compiled source later but does not depend on that PR.
- `/control/SUBMISSION_CONTRACT.json` remains the contribution/RETURN envelope.

## One physical grammar

```text
SOURCE
  → PLATE       crop · scale · mirror · negative · separate · dither · tile · register
  → ADAPTER     INKJET | LASER | THERMAL | PHOTO/UV | MANUAL
  → CARRIER     paper · coated film · transfer sheet · plate · stencil/resist
  → INTERFACE   DIRECT | RELEASE | RESIST | MASK | CONTACT | GEL | FOIL
  → SUBSTRATE   paper · metal · wood · fabric · glass · plastic · prepared surface
  → PROCESS     print · transfer · expose · etch · plate-print · wet-transform
  → FINISH      dry · wash · flatten · mount · seal · trim
  → RETURN      photo + scale + settings + material IDs + observed defect/value
```

Diagram: `physical-media-pipeline-v0.1.svg`  
Common diagnostic fixture: `media-test-plate-v0.1.svg`  
Open experiment ledger: `experiments.v0.1.json`

## Current hardware/material facts to preserve

- Epson **L18050** six-colour dye inkjet.
- Brother monochrome laser printer; exact model/media limits remain an inventory field rather than a guessed capability.
- MakeID L1 / small thermal-label path exists but is not a focus of this pass.
- Rolled Xuan/rice-paper-like stock: exact sizing/weight unknown; current direct-print result can become muddy at high deposition.
- Substantial siliconised paper exists; **do not put unknown siliconised/release stock through the laser merely because it is heat resistant**. Printer compatibility and fuser contamination are separate questions.
- Electro-etching is planned; the first chemistry proof should use a disposable non-stainless coupon unless the stainless waste/Cr(VI) path is explicitly designed first.

## High-value lanes

| lane | mechanism | immediate use | gate |
|---|---|---|---|
| INKJET / DIRECT | dye deposition into/on media | Xuan bleed, photo paper, coated transparency, decal stock | nozzle/media compatibility |
| INKJET / MASK | density controls light | cyanotype, photoresist, screen/photo-polymer positives/negatives | calibrate optical density, not visual blackness |
| LASER / TRANSFER | thermoplastic toner becomes transferable resist/image | metal resist, PCB/copper, gel image transfer | carrier must be laser-rated |
| LASER / FOIL | reheated toner becomes selective adhesive | metallic/holographic overlays | smooth stock + repeatable heat/pressure |
| LASER / PLATE | toner becomes hydrophobic image on polyester litho plate | repeatable hand printmaking matrix | use laser-rated polyester plate |
| RESIST → ETCH | exposed metal is anodically removed | marks, plates, shallow relief | metal/electrolyte/waste path must be known |
| HYBRID | multiple registered physical transformations | colour + toner + hand + wet process | registration must survive each stage |

## What changed from old advice

1. **Unknown wax/silicone/release papers are not a default laser carrier.** Brother explicitly warns against unsuitable coated/inkjet media and laser specialty media must survive the fuser. Use dedicated toner-transfer paper, known laser-safe glossy stock, or another rated carrier first.
2. **Saltwater is not the default electro-etch electrolyte.** Chloride can create undesirable chlorine/hypochlorite chemistry and increases corrosion/pitting complexity. Use a deliberately chosen metal/electrolyte system and record it.
3. **Stainless is not the first home coupon.** Anodic/transpassive dissolution can produce soluble Cr(VI); NIOSH treats Cr(VI) compounds as occupational carcinogens. Start process development on copper or mild steel and treat all spent electrolyte as metal-bearing waste.
4. For electro-etching, **current density and charge density are more portable than voltage/time**:
   - `j = I / exposed_area`
   - `Q = ∫ I dt`
   - `q = Q / exposed_area`
   - Faraday estimate: `removed_mass ≈ M·Q/(n·F)`; real efficiency and undercut must be measured.
5. A printer/media pair is not “solved” by a driver preset. Build one physical calibration sheet, then change one axis at a time.

## Bounded operating law

Every test records:

```text
TEST ID
source hash / filename
printer + driver + media preset
physical media identity + printable side
scale/orientation/mirror state
transfer/exposure/etch variables
photo with ruler or calibration feature
PASS / FAIL / INTERESTING
one observed defect or capability
```

Do not create a new app for this. The JSON ledger is disposable enough to edit by hand and structured enough for a future worker to compile if it proves useful.

## P0 specimen packet · execute exactly

P0 is only a **two-printer ordinary-paper baseline**. It does not authorize Xuan, transfer stock, masks, exposure, foil, plates, metal coupons, chemistry, etching, or any other exotic medium/process.

### Source lock

Use exactly:

- file: `physical/media-lab/media-test-plate-v0.1.svg`
- source blob SHA: `4735268af942559f55eb6e48143825d84b25dfcb`
- geometry: A4 landscape, `297 × 210 mm`
- source state: as-is; no export/resample, crop, mirror, negative, tile, raster preflight, or Art Atlas/Media Refinery transform

`/physical/print-01/` contributes only the already-established print law and scale gate: **100% / Actual Size / no Fit-to-page; 100 mm ± 1 mm**. It remains the authoritative prepared paper↔FIELD fixture. P0 does not modify it or borrow its route identity.

`/20261007-art-atlas/` is not invoked for P0. No renderer, compiler, refinery, route, manifest, CURRENT, WAITING, queue, or effect authority is created here.

### Physical inputs

Use two sheets cut from the **same ordinary known-good white A4 paper stock**:

- sheet A → Epson L18050
- sheet B → Brother monochrome laser

Record paper brand / nominal gsm if known. If unknown, write `ordinary A4 / identity unknown`; do not substitute exotic stock merely to fill the field.

### Print settings

Apply the same common print law to both devices:

| setting | required value |
|---|---|
| source | canonical SVG above, opened directly |
| paper size | A4 |
| orientation | landscape |
| scale | 100% / Actual Size |
| Fit / Shrink / Oversize | OFF |
| borderless | OFF |
| duplex / booklet / poster / tiling | OFF |
| mirror / flip | OFF |
| copies | 1 |
| media | ordinary plain paper |
| quality | normal / standard; not Draft/Economy and not High/Photo |
| manual density / contrast / saturation edits | OFF / default |

Device-specific fixed intent:

- **Epson L18050:** media type `Plain Paper` (or the driver's exact semantic equivalent), normal/standard quality, colour output, borderless OFF.
- **Brother mono laser:** media type `Plain Paper` (or exact semantic equivalent), normal/default quality, Toner Save/Economy OFF.

Driver wording varies. If the displayed label differs, choose the semantic equivalent and record the **exact displayed label** in the RETURN. Do not invent an unavailable dpi or media preset. P0 measures the normal plain-paper path rather than tuning the device.

### IDs

Write on each physical sheet before photographing:

- `P0-EPS-001` for the Epson specimen
- `P0-BRO-001` for the Brother specimen

If a failed specimen is rerun, increment only that device: `P0-EPS-002`, etc. Never overwrite the evidence identity of a failed sheet.

### Measure / inspect

For each specimen record:

1. **Scale** — measured length of the nominal 100 mm bar, to the nearest 0.5 mm available from the ruler.
2. **Positive line survival** — smallest labeled line (`0.10 / 0.20 / 0.30 / 0.50 / 0.75 / 1.00 mm`) that remains visibly continuous for most of its run.
3. **Negative gap survival** — smallest labeled gap (`0.10 / 0.20 / 0.30 / 0.50 / 1.00 mm`) that remains visibly open rather than filled/bridged.
4. **Fine-structure survival** — smallest visibly distinct bar/line in the fine-structure block; record nominal width if identifiable.
5. **Banding** — `0 NONE`, `1 VISIBLE BUT SCORABLE`, `2 OBSCURES/CONFUSES A REQUIRED DIAGNOSTIC`.
6. **Clipping** — `NONE`, `BORDER ONLY`, or `DIAGNOSTIC LOST`.
7. **Skew/feed anomaly** — `NONE` or one short observation.
8. **One defect/value** — one sentence only: the most consequential visible behavior.

Feature survival is **measurement, not a P0 performance target**. Do not fail a printer because 0.10 or 0.20 mm features disappear; the point is to establish the baseline that later physical transforms can be compared against.

### Evidence · minimum

Exactly three evidence photos per specimen are sufficient:

1. **FULL** — whole A4 sheet, all diagnostic blocks visible, test ID readable.
2. **SCALE** — ruler physically aligned with the 100 mm bar; both bar endpoints and ruler graduations readable in one frame.
3. **DETAIL** — close enough to score the positive-line ladder, negative-gap ladder, and fine-structure region. Two detail photos are allowed only if one frame cannot make all three scorable.

Do not use a screenshot or digital ruler as physical proof. Keep the original paper specimens until the P0 RETURN is accepted or explicitly discarded.

### PASS / FAIL

Per-printer **PASS** requires all of:

- measured 100 mm bar is **99.0–101.0 mm inclusive**;
- all required diagnostic regions remain physically present and scorable; `BORDER ONLY` clipping is recordable, but `DIAGNOSTIC LOST` is FAIL;
- banding is `0` or `1`; banding `2` is FAIL because the baseline cannot be scored reliably;
- FULL + SCALE + DETAIL evidence exists and is readable;
- exact printer identity/settings are recorded well enough to repeat the print.

The smallest surviving line/gap values do **not** carry a pass threshold at P0.

Pair-level P0 is complete only when **both** the Epson and Brother specimens PASS independently.

### RETURN block · duplicate once per printer

```text
P0 RETURN
TEST ID:
DATE/TIME:
SOURCE: physical/media-lab/media-test-plate-v0.1.svg
SOURCE BLOB: 4735268af942559f55eb6e48143825d84b25dfcb
PRINTER MAKE/MODEL:
APP / DRIVER / VERSION IF VISIBLE:
PAPER ID / GSM IF KNOWN:
MEDIA PRESET — exact displayed label:
QUALITY — exact displayed label:
SCALE MODE — exact displayed label:
OTHER NONDEFAULT SETTINGS: NONE | ...
100 MM BAR — measured mm:
POSITIVE LINE — smallest surviving mm:
NEGATIVE GAP — smallest surviving mm:
FINE STRUCTURE — smallest surviving nominal width:
BANDING: 0 | 1 | 2
CLIPPING: NONE | BORDER ONLY | DIAGNOSTIC LOST
SKEW / FEED:
ONE DEFECT / VALUE:
EVIDENCE: FULL / SCALE / DETAIL refs
VERDICT: PASS | FAIL
```

### P0 hard stop

After the two measured RETURNs, **STOP**.

Even if both printers PASS, P0 does not authorize the next mechanism. Do not proceed to Xuan/rice paper, coated/release/siliconised stock, toner transfer, foil, polyester plate, photo/UV mask, metal coupon, wet chemistry, electro-etch, or any other exotic-media/process work until the P0 evidence has been returned and a subsequent bounded move explicitly opens P1 or P2.

If either printer FAILS, change only the failed device's driver/scaling/maintenance defect class, print one new specimen on the same ordinary paper stock, and repeat P0 for that device. Do not compensate by editing the canonical SVG.

## First sequence

**P0 — establish device baselines**  
Execute the P0 specimen packet above. The result is two measured ordinary-paper printer baselines and no further physical authorization.

**P1 — Xuan / inkjet material curve**  
Same plate, several ink-load / quality settings. Then selectively wet only one sacrificial copy. Capture edge spread, line survival, colour migration and dry-back.

**P2 — toner transfer before chemistry**  
Transfer the feature ladder onto one copper or mild-steel coupon using known laser-safe transfer stock. Stop there. Inspect toner adhesion, pinholes, smallest surviving line/gap, and edge lift before authorizing etch chemistry.

**P3 — electro-etch only after P2 has a useful resist**  
Current-limited DC, non-chloride default, non-stainless coupon. Log exposed area, current, current density, time and charge. Stop on unexpected heat, vigorous gas, odour, colour change or resist failure. The experiment target is not “deepest etch”; it is **minimum charge that produces legible depth with acceptable undercut**.

**P4 — one alternate printmaking lane**  
Choose either toner-reactive foil, digital-negative cyanotype, or polyester-plate lithography. One specimen, one RETURN. No new lane until one produces a materially useful result.

## Particularly promising projects / mechanisms

- **ImageMagick** — scriptable threshold, ordered-dither, error-diffusion, channel and geometry transforms; useful as the PLATE compiler rather than a new UI.
- **PosteRazor / Rasterbator** — large-image tiling; useful for the 1.2–1.8 m strip work without inventing another imposition system.
- **Polyester plate lithography / Pronto-style plates** — laser toner becomes the image-bearing hydrophobic matrix; a real printmaking process, not merely “laser art”.
- **Digital negatives** — inkjet transparency becomes a calibrated UV mask for cyanotype and other contact processes.
- **Toner-reactive foil** — simple secondary material transform with high visual leverage.
- **Toner resist** — direct bridge from existing digital geometry to copper/mild-steel electro-etch experiments.
- **Gel-medium toner transfer** — moves laser imagery to wood/canvas/metal without putting the substrate through the printer.

## Evidence anchors

- Brother media guidance: https://help.brother-usa.com/app/answers/detail/a_id/70048/~/recommended-paper
- Brother laser labels/transparency heat requirement example: https://support.brother.com/g/b/faqend.aspx?c=ph&faqid=faq00002190_000&ftype3=2044&lang=en&pfs=1&prod=hl1440_all
- Epson L18050 product/manual entry: https://www.epson.com.sg/For-Home/Printers/Home-Office-Printers/Epson-EcoTank-L18050-Ink-Tank-Printer/p/C11CK38501
- ImageMagick dithering/threshold operators: https://imagemagick.org/command-line-options/
- PosteRazor: https://github.com/aportale/posterazor
- Toner-transfer transparency experiments: https://www.delorie.com/pcb/transparencies/
- Polyester plate lithography overview: https://www.rittagraf.com/en/blog/polyester-printmaking-tutorial-how-to-print-laser-imaged-polyester-desktop-plates.html
- Digital negatives overview: https://www.alternativephotography.com/digital-negatives-positives-film-printers-tools/
- 2026 copper electrochemical machining comparison of chloride/sulfate systems: https://link.springer.com/article/10.1007/s10800-025-02398-8
- Stainless transpassive Cr(VI) dissolution background: https://cris.vtt.fi/en/publications/the-transpassive-dissolution-mechanism-of-highly-alloyed-stainles/
- NIOSH Cr(VI): https://www.cdc.gov/niosh/engcontrols/ecd/detail7.html

## Promotion / deletion gate

Keep this packet as a DONOR until **three real specimens** produce comparable receipts across at least two mechanisms.

Promote only if a reusable transform is demonstrated, e.g. the same source plate reliably drives `inkjet-direct` and `laser-resist` with measurable process metadata. If it becomes prose without specimens, delete/park it rather than register a route.
