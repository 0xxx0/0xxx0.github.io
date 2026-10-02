# POLY // Atlas Dayline — Branch I

A local-first radial ↔ linear planning instrument over ONE canonical task model.

**This README is the canonical rule home for Atlas Dayline.** It consolidates what used
to live in four places (this README, the vault research brief, the AXIS scratch copy, and
the make-grammar UI plan). External evidence and citations stay in the annex — see
*Evidence*.

## Core loop

`SEE → SIMULATE → COMPARE → ACT → RUN ≤ 3 → RETURN`

- **Atlas**: opportunity field; angle=time, radius=derived activation cost.
- **Plain**: same canonical task IDs and ranking without the spatial claim.
- **Scenario**: counterfactual time/context preview; does not mutate canon until APPLY.
- **TIDE**: hourly non-mutating sweep of which work becomes cheap.
- **RUN FIT**: checks whether the bounded route fits before the next hard anchor.
- **Gap Pack**: proposes up to the remaining RUN capacity, preview-only until ACT.
- **Stress +30/+60**: delay counterfactual exposing misses/cost degradation.
- **Return / Replay**: checksum-backed local receipt and restoration.
- **Capsule**: optionally encodes the current bounded state into the URL fragment for explicit sharing; otherwise state remains in browser localStorage.

## Projection rules (radial ↔ linear, one canon)

Atlas earns its survival only when it reveals useful actionability, reorientation,
bundling, or temporal structure that the Plain ablation does not make equally cheap to see.

1. **Split by task class, not taste.** PLAN / EDIT / COMPARE default to the PLAIN list —
   the accurate surface for durations and exact start times. RADIAL is the overview /
   engagement surface. (Linear wins reading and is preferred; radial is rated prettier.)
2. **One continuous 24 h ring, never 2×12 h.** a.m./p.m. swaps are the dominant radial
   error; if a 12 h face is used, encode p.m. explicitly (e.g. a dimmed outer band).
3. **Duration by angular span only.** Never encode duration/state by radius or arc
   thickness; reserve radius for ≤4 category lanes.
4. **Segment the dial.** 24 hour-wedges (15°) or 12 (30°) with visible boundaries and rim
   hour labels — segmented dials beat smooth circles for point reading.
5. **Minimum-arc rule.** Tasks shorter than 15° render at 15° with an overflow notch and
   an exact text duration on select; sub-15-minute bins are forbidden on the dial.
6. **Always show the number.** On selection the dial shows exact start/end/duration text;
   arc reading alone is never the only channel.
7. **The switch preserves identity and rank.** Same IDs, order and state in both views;
   selection and rotate/scroll position are mirrored.
8. **Radial is for pointing too.** Long-press an arc → pie/radial menu (done/defer/edit),
   3–5 items, equal radius — the one interaction class where radial beats linear.
9. **Aesthetic budget with a measurement plan.** Decorative dial ink stays minimal (hour
   ticks + ring + arcs); any A/B logs per-view completion/accuracy. "Prettier" biases
   usability ratings upward and is not proof.
10. **Accessibility floor for both views.** ≥24×24 px hit targets and 3:1 arc/background
    contrast; `prefers-reduced-motion` kills dial sweep animations; every state shown by
    angle/position is also shown by text/icon in the list.

## Disclosure rules (presentation, no model change)

Presentation only: no model/state change, no new panels, no new instrument. The full
capability set stays; its continuous visible area shrinks by class.

1. **PERSISTENT = world-state or action pressure** — now-line, anchors, open-task
   pressure, active scenario badge, run-fit warning. These may hold space.
2. **CONTEXTUAL = actions** — RETURN / REPLAY / CAPSULE / SCENARIO / ＋TASK: visible on
   intent, or when pressure exists.
3. **COLLAPSIBLE = configuration** — INK / DISCLOSURE settings, contexts, MAP KEY,
   strategy knobs: collapsed by default; reopen in place on intent; remember state.
4. **LATENT = explanation** — PROOF ledger, EVENT ledger, forecast detail, notes: on
   demand only. Collapsed ≠ hidden; it opens inward.

- **Witness rule (no silent disappearance).** Every collapsed control leaves a positional
  witness where it lived: count · dot · glyph · edge tension · changed-state mark. A
  collapsed element with no residue is a bug.
- **Fusion rule.** Indicators sharing one cause fuse into ONE mark (a "dayline digest"
  glyph with a count); expanding shows the separate items. Fusion must reduce total
  signals — if it adds a legend, it failed.
- **Text rule.** Headline-level text persists; body/notes collapse to snippet + indicator;
  full text on intent.

## Privacy

The public sample is synthetic. The app has no backend and no analytics. Personal state remains in the browser unless you explicitly export JSON or copy a capsule URL.

## Proof rule

Atlas earns survival only when it reveals useful actionability, reorientation, bundling, or temporal structure that the Plain ablation does not make equally cheap to see.

## Shipped state

- **PR #744** — `snapshot().state` now reports the active `projection` + `view`, and the
  feedback packet carries `projection_ms` / `projection_acts`; a runtime probe proves the
  flip/flip-back round trip with canonical IDs, ranking and aperture untouched. The FIELD
  bridge, feedback packets and FIELD-INDEX reporting can now see which projection is
  active. Deployed and covered by the public-surface smoke.
- The `/atlas-dayline/` FIELD-INDEX route entry carries this state (`transfer` +
  `index.updated_at` in `showcase-manifest.json`), so shipped non-route work is visible on
  the surface the operator actually reads.

## Evidence

- External evidence + citations for the projection rules: vault
  `ops-hub/wiki/research/radial-linear-projection-brief.md` (evidence annex — kept for its
  peer-reviewed sources; its rule list is the projection rules above).
- Machine contract / address: `/atlas-dayline/` in `showcase-manifest.json`.
- Release receipt: `/atlas-dayline/release.json`.
