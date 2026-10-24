# SLEEPER // THE ONE RETURN CONTRACT

**Status:** STANDING · **authored** 2026-10-24 (kestrel) · **proven by** `node sleeper/conformance/conformance.mjs`
**Authority chain:** `recovery/sleeper/site-source-2026-09-18/` (frozen EXACT source; `docs/ONE_RETURN_V2.md` is the law) → this document (the invariants, extracted) → `sleeper/conformance/` (the machine check). The contract README this extends lives at `void-anchor/sleeper/README.md` and is mirrored at `/sleeper/README.md`.

This file is the **ONE RETURN contract** — the invariants every Sleeper lineage must share. It exists because the shelf holds six surfaces that all say "SLEEPER ONE RETURN" and only two of them implement the same law. Where they disagree, this document and the harness decide; nobody's prose does.

## 1 · The circuit

```
PHRASE + VERSE CELL + FIGURE → DETERMINISTIC CITY → EIGHT ENACTED GATES
→ RETURN TO ORIGIN → RETURN ARTIFACT V2
```

Changing any of the three inputs changes the world key. Reusing all three reconstructs the same initial city. The ninth position is not a ninth collectible: it is retrieval of the starting coordinate.

## 2 · The four invariants

**I1 — deterministic phrase → city (same phrase = same city, stable hash).**
Input normalisation is trim → collapse internal whitespace → uppercase → NFC → FNV-1a (`app/lib/seed.ts`, 2166136261/16777619). `compileWorldLaw(phrase, cell, figure)` fixes `seed`, `key` (base36, 7 chars), maze topology, loop count, Gate coordinates and wall alphabet; `buildCityLayout` fixes the 27×27 grid and the eight Gate positions. Same input ⇒ byte-identical city, in any process, on any run. A lineage may use its own input (painting bytes, drawn geometry) **only** if that chain is equally stable and content-derived — never `Math.random`, never a clock.

**I2 — the eight enacted gates, in order, plus the origin return.**
`PROVENANCE · TRUTH · COMPRESSION · RETRIEVAL · OPERATION · MEASURE · TRANSFER · RESILIENCE`, each with a method (`conch / stillness / spiral / w8 / keris / distance / conch / relocation`) and an instruction. Verse cells may **reorder** these eight; nothing may add, remove or rename one. Touching a Gate without satisfying its law does nothing.

**I3 — return → artifact V2 determinism.**
`schema: "sleeper.one-return"`, `version: 2`, with exactly these fields: `worldKey · source · returnedSource · cell{id, source, provenance, witness} · figure · dominantOperator · transferInstruction · pathSignature · operatorCounts · proofs · measures{steps, elapsedMs}`. Same world + same proofs + same counts + same signature ⇒ **identical bytes** (only `measures.elapsedMs` is wall-clock). `returnedSource` is caused by `dominantOperator` and `pathSignature` — never free text. The artifact restores its exact world inputs and verifies them (`parseReturnArtifactWorld`); a wrong `worldKey` or a non-v2 schema is rejected by name.

**I4 — the ten fields' identity.**
`app/field-catalog.ts` `FIELD_DEFINITIONS` is the one catalogue: `01 return · 02 garden · 03 body · 04 maps · 05 rules · 06 bridge · 07 cultivators · 08 vertical · 09 confluence · 10 ridge` (ids, numbers, hrefs, images all fixed). The published spine `/sleeper/archive/` carries the same ten in the same order, each derivative traced to the field's own `image` in the frozen `public/` shelf. No lineage may renumber or rename a field; a surface that predates the catalogue may claim none.

## 3 · Lineage register (what each surface IS)

| surface | role | contract role |
|---|---|---|
| `recovery/sleeper/site-source-2026-09-18/` | frozen exact v2 source | **the contract itself** |
| `/sleeper/` (native-core/engine/views/ui) | static port of the v2 law, the live organism | claimant — must CONFORM |
| `/sleeper/one-return/` | playable donor, nine-gate reconstruction | donor; pre-v2 circuit, evidence-only witness |
| `/sleeper/ascii-pov-0.8/` | superseded derivative | preserved experiment; no canonical claim |
| `/sleeper/borrowed-river/` | painting/ink-route variant | EXIT-RECOMPOSE projection |
| `/sleeper/ladder/` | four-distance resolution ladder | RESOLUTION-LADDER projection |
| `/sleeper/archive/` | published deduped media spine | carrier of I4 |

## 4 · Named projections (lawful, one-way, declared)

- **EXIT-RECOMPOSE** (borrowed-river): the contract's exit half with authored geography instead of a phrase. Identity = the port/rock graph plus the drawn geometry; determinism = replay validation (`validate()` re-derives state from legs and recomputes derived fields); artifact = `sleeper.borrowed-river.return` v1 (byte-deterministic, no timestamps). It has **no** phrase input, **no** gates and does not emit v2. What it may claim: an authored stroke that becomes navigable space and a reversible route ending in an inspectable artifact.
- **RESOLUTION-LADDER** (ladder): the contract's identity chain at painting resolution. `paintingTag = hash32(PAINTING_ID + sha256(painting bytes)) = f0f09635` names painting = city = artifact; `routeSeed = hash32(tag | witness)`. Its ENTERED matter is the canonical `ONE_RETURN_V2.md` itself (paragraph → district, sentence → building, word → room, character → material). Gates are **not** enacted; the walk is a compressed U/D/L/R witness and the ninth-gate move is the return to origin. Artifact = the recomposed painting bytes (empty route = original bytes, mad64 0.0000). What it may claim: determinism and the thesis (painting and city are the same object at different resolutions) — never Gate proof.

## 5 · Verdict rule (applied mechanically by the harness)

- **CONFORMS** — a claimant of the recovered law, and no FAIL on I1–I4.
- **NON-CONFORMING** — any FAIL: a value it implements contradicts the contract. The FAIL line carries the evidence; the mismatch is the deliverable, never papered over.
- **PROJECTION** — not a claimant, no FAIL: a lawful subset aspect (§4) with its own stable, content-derived identity chain.

## 6 · Measured result (2026-10-24, node 26.7.0, headless, real sources)

```
L1  CANONICAL      recovery/sleeper/site-source-2026-09-18/   CONFORMS
L2  NATIVE PORT    /sleeper/ native-core+ui                    CONFORMS
L3  DONOR          /sleeper/one-return/                        NON-CONFORMING
L4  DERIVATIVE     /sleeper/ascii-pov-0.8/                     NON-CONFORMING
L5  BORROWED RIVER /sleeper/borrowed-river/                    PROJECTION  (EXIT-RECOMPOSE)
L6  LADDER         /sleeper/ladder/                            PROJECTION  (RESOLUTION-LADDER)
CHECKS 48/57 pass; the 9 FAILs all sit on the two non-conforming lineages.
FINGERPRINT canonical-city == native-city == 33fb1d0ab4240562 (27×27 grid bytes for "ASK BETTER"/doors/urchin)
```

The two CONFORMING lineages produce the **same city bytes and the same artifact bytes** for the same inputs (world key `0BFPHOW`; artifact sha over all fields but wall-clock ms `414046ce14fc`). Cross-process run-to-run fingerprints are identical.

## 7 · The mismatches, named

1. **`/sleeper/one-return/` (donor) is NOT v2.** Measured: N=**9** collectible gates over two protocols (`RECALL|SUCCESSION`), not the eight enacted gates; export schema `one-return/import-reified-0.2` (timestamped ⇒ not byte-deterministic); it **refuses** a canonical v2 artifact (`"No compatible ONE RETURN or BY/GRID-PATH-2 state"`) — there is no bidirectional seam. It is the pre-v2 nine-label circuit: a superseded predecessor, not a projection (no lawful 8→9 mapping exists). Its `sleeper.route-witness/v0.1` sidecar is lawful as evidence and says so itself: *"TRAVERSED != OPTIMAL != UNDERSTOOD != PROVED… it cannot satisfy canonical ONE RETURN v2 Gate proofs."*
2. **`/sleeper/ascii-pov-0.8/` is NOT v2.** Measured: 4 fixed-coordinate contracts (`RECALL|OBSERVE|DECIDE|ACT`), witness schema `ascii-sleeper/0.8` with no `worldKey`/`version`, and the witness carries projection-timing ⇒ not structurally deterministic. Only its seal token is byte-stable.
3. **New finding — the 0.8 derivative's own selftest is red on its own default corpus.** Clean-browser first visit: 14/15, failing arm `local law changes 0`. Diagnosed from the page's own law: district-0 phases are 1 vs 5 (mod 6), the arm samples x,y step 2, and `(x+p)%6===0` with even x needs p even — both laws are vacuous on its grid. It is a **false negative of the selftest, not of the field law** (odd x still changes). A page whose selftest says FAIL on its own shipped preset should not be read as verified.
4. **`325-entry archive spine` (from the brief) is UNVERIFIED.** Measured instead: `sleeper/archive/catalog.json` = 24 published derivatives, dedup over 1138 inventoried rows → 201 unique sha256. Cheap test before any district work: name the 325-row source or adopt the measured numbers.

## 8 · Running the proof

```bash
node sleeper/conformance/conformance.mjs     # exit 0 = both claimants conform + every verdict justified
```

Headless, zero dependencies, no browser: the browser-only lineages (donor, derivative, native port) are driven through a DOM shim that executes their **shipped** code unmodified — handlers are invoked, artifacts are captured, nothing is copied into the harness. Sub-suites that already exist are re-run as they ship: canonical `node --test tests/` (21/21), borrowed-river `node --test test.mjs` (2/2), ladder `node sleeper/ladder/ladder-selftest.mjs` (34/34).

## 9 · Change rules

- The canonical shelf under `recovery/` is frozen: read-only, hashed, never edited. Corrections happen in ports, not in the source of record.
- A new lineage joins by passing the harness or by declaring a §4 projection with its transformation named. "Looks like Sleeper" is not an entry criterion.
- Frozen shelves (`workfield-v1.2` et al.) are contracts with verifiers: do not restructure them; new work goes beside them.
- Never delete a lineage to make the table smaller. Non-conforming surfaces stay published and stay labelled.
