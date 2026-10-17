# INTERPHASE semantic substrate / glyphfield — 2026-10-17

## Question

Can FIELD / INTERPHASE move past scrolling cards, dropdowns and arbitrary graph layouts without hiding truth or inventing spatial meaning?

## Answer

Yes, but only when geometry is a projection of declared or reviewably folded attributes. The transferable primitive is not “radial UI”. It is a **warranted-coordinate semantic substrate** with a strict visual contract.

### Perennial research transferred

1. **Semantic substrates — Shneiderman / Aris.** Position nodes by domain attributes in explicit regions instead of automatic graph-drawing aesthetics. Transfer: INTERPHASE angle is an explicit FIELD operation class; radius is exact parent-edge distance.
2. **Marking / pie menus — Kurtenbach / Buxton.** Stable directional sectors can become spatial memory and expert gesture. Transfer: action sectors never reorder with object identity or recency; sector adjacency remains a mnemonic convention, not a similarity metric.
3. **Zoomable interfaces / information physics — Pad++ / Furnas lineage.** Scale should alter available detail while preserving orientation and object continuity. Transfer: DEPTH changes the visible hop horizon; it does not change canonical identity or relation semantics.
4. **Glyph-based visualization surveys — Borgo et al. / Ward lineage.** Glyphs can carry multivariate state, but visual channels must be few, decodable and task-relevant. Transfer: reuse `interphase-glyph/v0.1`; identity/address/depth remain explicit channels instead of minting a second icon language.
5. **Provenance / reversible interaction.** A visible connection must have an inspectable source and effects must remain distinguishable from views. Transfer: substrate lines are manifest `parent` edges only; selection is a VIEW and HOLD / RECENTER is navigation, never source mutation.

## Why the operation fold is necessary

The first truthful prototype used raw `showcase-manifest.routes[].operation` directly. Browser proof exposed the consequence: **151 of 193 routes were unplaced** because the FIELD has 71 distinct operation strings while the root aperture had only five verbs. Passing tests did not make that useful.

The repository already carries a read-only operation-fold proposal in `tools/field-fold.mjs`, generated into `returns/FIELD_FOLD_MAP.json`: 71 raw operation verbs map onto six explicit classes — `SEE · WAYFIND · OPERATE · MAKE · PLAY · RECOVER`. The current generated map classifies all 71 distinct operation strings and never rewrites the manifest. GLYPHFIELD now consumes that exact data artifact and fails closed if its `routes_total` or operation coverage no longer matches the manifest.

This is not an embedding or model guess. It is an inspectable regex/rule fold already used by FIELD convergence research. The raw operation remains visible beside its class when a glyph is selected.

## Local visual contract

| visual variable | meaning | source | refusal rule |
|---|---|---|---|
| center | exact held route | INTERPHASE identity | no route → no substrate |
| angle | explicit action class (`SEE · WAYFIND · OPERATE · MAKE · PLAY · RECOVER`) | `FIELD_FOLD_MAP.routes.operation_class_map[route.operation]` | stale/incomplete fold → no geometry; unmapped op → RESIDUE |
| sector order | fixed mnemonic cycle | projection contract | angular adjacency never means similarity |
| radius | shortest declared parent-edge hops from focus | route `parent` links | no declared path → invisible at bounded depth |
| line | one or more declared parent edges | route `parent` links | no inferred similarity/causality links |
| glyph core | stable object identity | `interphase-glyph/v0.1` | never replaces canonical ID |
| glyph channels | identity · address · depth | existing glyph contract | no decorative data channel |
| count | objects sharing an identical semantic coordinate | exact aggregation | collisions aggregate; never jitter |
| ↑ / ↓ / ↔ | ancestor / descendant / across relation | parent graph | relation is computed only from declared ancestry |
| DEPTH 1–3 | visible relation horizon | projection-local state | never writes source state |

### Fixed mnemonic cycle

`SEE → WAYFIND → OPERATE → MAKE → PLAY → RECOVER → SEE`

This ordering is a learnable directional convention only: perceive → orient → act → materialise → explore → recover. **Angular distance is not semantic distance.** If this convention does not become useful motor memory under repeated use, it should be changed or removed; the data model does not depend on it.

## Laws

1. **POSITION MUST EXPLAIN ITSELF.** No force layout, random packing, aesthetic jitter, similarity embedding or model-generated coordinates in the canonical semantic view.
2. **IDENTITY OUTRANKS POSITION.** Moving between projections never mints a new object.
3. **COLLISION = INFORMATION.** If two records have the same semantic coordinate, keep the coordinate and aggregate them. Do not perturb them into fake distinctions.
4. **UNKNOWN = RESIDUE.** Missing semantics stay visible as unplaced count/text. Never guess a class to make the picture prettier.
5. **FOLD MUST BE INSPECTABLE.** A reduced vocabulary may drive geometry only when the raw→class mapping is explicit, versioned/readable, and fails closed on drift.
6. **LINK = WITNESS.** Draw only a relationship backed by a named source field. Parent edges are allowed; “looks related” is not.
7. **ZOOM ≠ FILTER ≠ PROJECT ≠ TRAVERSE.** DEPTH changes relation horizon; FIND narrows objects; VIEW changes representation; HOLD / RECENTER changes focus.
8. **GLYPH ≠ ONTOLOGY.** A glyph is a reversible witness generated from an object, not the object’s identity or a new taxonomy.
9. **EXPERT GESTURE FOLLOWS STABILITY.** Directional gestures are useful only after sectors remain fixed long enough to form motor memory.
10. **PLAIN ESCAPE REMAINS.** SOURCE, AXIS, search and UNFOLD remain available whenever spatial compression becomes slower or ambiguous.
11. **EFFECTS STAY BORING.** Semantic geometry may select or stage; native hosts still own mutation/effect authority and RETURN.

## Implementation on PR #966

`GLYPHFIELD` is a ninth VIEW inside the existing `/interphase/` host.

- `interphase/substrate-kernel.mjs` — deterministic parent graph, ancestry, hop distance, explicit action-class coordinates, collision aggregation, edge proof.
- `interphase/substrate.mjs` — consumes both manifest + generated FIELD fold, rejects drift, reuses glyph identity, cycles exact-coordinate clusters, HOLD / RECENTER, depth horizon, exact hash re-entry.
- `interphase/substrate.css` — self-decoding sectors/rings/edges; fixed square field; mobile contraction.
- `tools/interphase-substrate-selftest.mjs` — fold provenance, permutation invariance and anti-inference laws.
- `tools/interphase-substrate-smoke.mjs` — real mobile browser re-entry, six action sectors, zero visible operation residue on the current fold, interaction and screenshots.

## Transfer map — next only when a native source warrants it

- **FIELD root:** operation class × declared relation depth; already the closest fit.
- **Dayline:** angle/time is already lawful; do not replace it with action-class angle. Compose glyph identity *inside* the existing temporal fan instead.
- **Sleeper / game worlds:** spatial placement may encode authored world coordinates or explicit encounter topology only. Never derive “narrative closeness” from an embedding and call it space.
- **COMMS / people:** radial placement only if the dimension is explicit (time, channel, direction, response chain). Social similarity embeddings remain optional analysis, not object geography.
- **House OS:** physical coordinates may come from the actual home plan; device relation lines may come from protocol/gateway topology. Keep those two coordinate systems visually distinct.
- **Media / READFIELD / LISTEN:** time and authored sections are lawful axes. Semantic topic embeddings may drive FIND but not unlabeled geometry.
- **Maker / physical workspace:** use measured room/tool coordinates or workflow stage; do not mix them without an explicit transform.

## Evaluation / stop condition

Run one repeated task against GLYPHFIELD and ordinary FIND/list: locate a known object, inspect one relation, switch representation, interrupt, then return. Measure completion time, wrong-object activations and reorientation errors after novice and repeated trials.

**Keep GLYPHFIELD optional or remove it from the default aperture if it does not reduce reorientation/error after learning.** Unusual representation earns permanence only by outperforming plain representation for a named operation.
