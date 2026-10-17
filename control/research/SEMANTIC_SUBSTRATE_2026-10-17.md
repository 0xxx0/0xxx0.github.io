# INTERPHASE semantic substrate / glyphfield — 2026-10-17

## Question

Can FIELD / INTERPHASE move past scrolling cards, dropdowns and arbitrary graph layouts without hiding truth or inventing spatial meaning?

## Answer

Yes, but only when geometry is a projection of declared attributes. The transferable primitive is not “radial UI”. It is a **semantic substrate** with a strict visual contract.

### Perennial research transferred

1. **Semantic substrates — Shneiderman / Aris.** Position nodes by domain attributes in explicit regions instead of automatic graph-drawing aesthetics. Transfer: INTERPHASE angle is a declared operation; radius is exact parent-edge distance.
2. **Marking / pie menus — Kurtenbach / Buxton.** Stable directional sectors can become spatial memory and expert gesture. Transfer: operation sectors never reorder with object identity or recency.
3. **Zoomable interfaces / information physics — Pad++ / Furnas lineage.** Scale should alter available detail while preserving orientation and object continuity. Transfer: DEPTH changes the visible hop horizon; it does not change canonical identity or relation semantics.
4. **Glyph-based visualization surveys — Borgo et al. / Ward lineage.** Glyphs can carry multivariate state, but visual channels must be few, decodable and task-relevant. Transfer: reuse `interphase-glyph/v0.1`; identity/address/depth remain explicit channels instead of minting a second icon language.
5. **Provenance / reversible interaction.** A visible connection must have an inspectable source and effects must remain distinguishable from views. Transfer: substrate lines are manifest `parent` edges only; selection is a VIEW and HOLD / RECENTER is navigation, never source mutation.

## Local visual contract

| visual variable | meaning | source | refusal rule |
|---|---|---|---|
| center | exact held route | INTERPHASE identity | no route → no substrate |
| angle | `operation` | `showcase-manifest.kernel` + route record | unknown operation → RESIDUE |
| radius | shortest declared parent-edge hops from focus | route `parent` links | no declared path → invisible at bounded depth |
| line | one or more declared parent edges | route `parent` links | no inferred similarity/causality links |
| glyph core | stable object identity | `interphase-glyph/v0.1` | never replaces canonical ID |
| glyph channels | identity · address · depth | existing glyph contract | no decorative data channel |
| count | objects sharing an identical semantic coordinate | exact aggregation | collisions aggregate; never jitter |
| ↑ / ↓ / ↔ | ancestor / descendant / across relation | parent graph | relation is computed only from declared ancestry |
| DEPTH 1–3 | visible relation horizon | projection-local state | never writes source state |

## Laws

1. **POSITION MUST EXPLAIN ITSELF.** No force layout, random packing, aesthetic jitter, similarity embedding or model-generated coordinates in the canonical semantic view.
2. **IDENTITY OUTRANKS POSITION.** Moving between projections never mints a new object.
3. **COLLISION = INFORMATION.** If two records have the same semantic coordinate, keep the coordinate and aggregate them. Do not perturb them into fake distinctions.
4. **UNKNOWN = RESIDUE.** Missing semantics stay visible as unplaced count/text. Never guess an operation to make the picture prettier.
5. **LINK = WITNESS.** Draw only a relationship backed by a named source field. Parent edges are allowed; “looks related” is not.
6. **ZOOM ≠ FILTER ≠ PROJECT ≠ TRAVERSE.** DEPTH changes relation horizon; FIND narrows objects; VIEW changes representation; HOLD / RECENTER changes focus.
7. **GLYPH ≠ ONTOLOGY.** A glyph is a reversible witness generated from an object, not the object’s identity or a new taxonomy.
8. **EXPERT GESTURE FOLLOWS STABILITY.** Directional gestures are useful only after sectors remain fixed long enough to form motor memory.
9. **PLAIN ESCAPE REMAINS.** SOURCE, AXIS, search and UNFOLD remain available whenever spatial compression becomes slower or ambiguous.
10. **EFFECTS STAY BORING.** Semantic geometry may select or stage; native hosts still own mutation/effect authority and RETURN.

## Implementation shipped on PR #966

`GLYPHFIELD` is a ninth VIEW inside the existing `/interphase/` host.

- `interphase/substrate-kernel.mjs` — deterministic parent graph, ancestry, hop distance, semantic coordinates, collision aggregation, edge proof.
- `interphase/substrate.mjs` — bounded browser projection, glyph reuse, cluster cycling, HOLD / RECENTER, depth horizon, exact hash re-entry.
- `interphase/substrate.css` — self-decoding sectors/rings/edges; fixed square field; mobile contraction.
- `tools/interphase-substrate-selftest.mjs` — permutation invariance and anti-inference laws.
- `tools/interphase-substrate-smoke.mjs` — real mobile browser re-entry and interaction proof.

## Transfer map — next only when a native source warrants it

- **FIELD root:** operation × declared relation depth; already the closest fit.
- **Dayline:** angle/time is already lawful; do not replace it with operation angle. Compose glyph identity *inside* the existing temporal fan instead.
- **Sleeper / game worlds:** spatial placement may encode authored world coordinates or explicit encounter topology only. Never derive “narrative closeness” from an embedding and call it space.
- **COMMS / people:** radial placement only if the dimension is explicit (time, channel, direction, response chain). Social similarity embeddings remain optional analysis, not object geography.
- **House OS:** physical coordinates may come from the actual home plan; device relation lines may come from protocol/gateway topology. Keep those two coordinate systems visually distinct.
- **Media / READFIELD / LISTEN:** time and authored sections are lawful axes. Semantic topic embeddings may drive FIND but not unlabeled geometry.
- **Maker / physical workspace:** use measured room/tool coordinates or workflow stage; do not mix them without an explicit transform.

## Evaluation / stop condition

Run one repeated task against GLYPHFIELD and ordinary FIND/list: locate a known object, inspect one relation, switch representation, interrupt, then return. Measure completion time, wrong-object activations and reorientation errors after novice and repeated trials.

**Keep GLYPHFIELD optional or remove it from the default aperture if it does not reduce reorientation/error after learning.** Unusual representation earns permanence only by outperforming plain representation for a named operation.
