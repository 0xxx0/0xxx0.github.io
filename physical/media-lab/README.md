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

## First sequence

**P0 — establish device baselines**  
Print `media-test-plate-v0.1.svg` at 100% on ordinary known-good paper on both printers. Measure the 100 mm bar. This separates printer scaling/toner/ink behavior from exotic media behavior.

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
