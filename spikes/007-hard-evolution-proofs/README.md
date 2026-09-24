# HARD EVOLUTION PROOFS — P1 / P2 / P3

Status: **SPIKE / EXECUTABLE PROOF**  
Date: 2026-09-24  
Authority: none. This does not create a new host, schema authority, or public product.

This spike tests three claims from `control/confluence/HARD_EVOLUTION_MAP_2026-09-24.md` without mutating READFIELD, Poem Map, Fold//Bloom, ROOM, AXIAL, or physical state.

## P1 — focus + context

Question: can two unequal domains expose one small location-with-context descriptor without moving domain authority?

Fixtures:
- READFIELD-shaped document: document → section → paragraph → sentence → word.
- Poem Map-shaped poem: poem → line → token.

Proof fields:
- exact object id;
- exact focus id/address;
- context path to root;
- ordered siblings before/after;
- source ref;
- exact RETURN address.

This is intentionally a zipper-like descriptor, not a new focus store.

## P2 — typed composition across unequal domains

Fixtures:
1. four-line poem with n-ary ORDER and rhyme groups;
2. three-source Fold//Bloom set with typed seam ports;
3. synthetic wall/rail/panel assembly with contact/mating ports.

Each fixture has PARTS, typed PORTS, n-ary RELATIONS, CONSTRAINTS, OPERATORS and RETURN.

The same canonical structure is projected as FORMULA, HYPERGRAPH and FLOWER.

Pass condition is deliberately narrower than “lossless visualization”:
- exact object/part/port/relation/constraint/operator addresses survive;
- every projection declares its residue;
- no projection becomes canonical authority.

## P3 — preserved-interface rewrite

Three model rewrites:
- poem token replacement while line/rhyme/lock interface survives;
- Fold//Bloom seam change while exact source identities survive;
- detachable panel model replacement while rail/contact interface survives.

Every rewrite requires explicit commit, preconditions where applicable, a preserved interface, changed addresses, evidence refs and RETURN.

The physical fixture is model-only. `PHYSICAL_FIT_UNKNOWN` must remain UNKNOWN; no model rewrite can prove real fit.

## Run

```bash
node spikes/007-hard-evolution-proofs/selftest.mjs
```

Expected top-level result:

```json
{"pass":true,"proof":"P1+P2+P3"}
```

The full JSON report includes the two P1 focus frames, nine P2 projection checks, three P3 rewrite receipts, exact preserved IDs, source-identity proof and the physical-fit boundary.

## Stop

A passing spike does **not** authorize shared-core promotion.

Promote only after a second real consumer demonstrates that a tiny shared helper removes duplicate state/code or unlocks a previously impossible lawful operation. Until then these functions remain proof material.
