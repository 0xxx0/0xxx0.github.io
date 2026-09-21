# ONE RETURN City Engine v0.2

## Decision

ONE RETURN is now the primary host system. The older Atlas fields and the Lab remain reachable as historical fixtures and mechanics studies; they are not presented as ten equally complete games. New mechanics should enter the city only when they create a distinct player decision, consequence, proof, and transferable return.

The root route and `/one-return` both open the city. `/atlas`, `/wake`, and `/lab/*` remain stable.

## Complete vertical slice

The current circuit is:

`PHRASE + VERSE CELL + FIGURE → DETERMINISTIC CITY → EIGHT ENACTED GATES → RETURN TO ORIGIN → RETURN ARTIFACT V2`

### Inputs with separate jobs

| Input | Mechanical consequence | Visible evidence |
|---|---|---|
| Phrase | topology, extra passages, Gate coordinates, wall alphabet, world key, transfer assignment | compiled-world ledger and literal letters in walls |
| Verse cell | eight tokens, spatial Gate order, governing law, provenance | tokens on Gates, sky leakage, proof-order witness |
| Figure | movement speed, Conch duration, Keris recovery, stillness duration, distance band | numeric behavior plus figure effect shown before entry |
| Player trace | Gate proof order, tool counts, path signature, steps, time | completion ledger and copied JSON artifact |

Changing any of the three inputs changes the world key. Reusing all three reconstructs the same initial city.

### Nine-Gate circuit

The first eight Gates test an action. The ninth is not another collectible: it is retrieval of the starting coordinate.

| Gate | Evidence required |
|---|---|
| Provenance | sound Conch near the Gate |
| Truth | stop moving and operating; hold still near the Gate |
| Compression | switch projection near the Gate |
| Retrieval | place W8 at the Gate, leave its coordinate, and recall |
| Operation | make an actual interior wall cut near the Gate |
| Measure | hold the figure inside its distance band |
| Transfer | reuse the world-assigned operator in a second Gate context |
| Resilience | find the token, permit its coordinate to fail, then retrieve the same token |
| Return | after all eight proofs, return to the origin |

Each proof records Gate, cell token, method, step, elapsed time, and causal note. Proximity exposes the current protocol and progress; touching a Gate without satisfying its law does nothing.

## Return Artifact v2

The result is an inspectable local object, not a decorative ending:

```ts
type ReturnArtifact = {
  schema: "sleeper.one-return";
  version: 2;
  worldKey: string;
  source: string;
  returnedSource: string;
  cell: { id: VerseCellId; source: string; provenance: string; witness: string };
  figure: FigureId;
  dominantOperator: ToolName;
  transferInstruction: string;
  pathSignature: string;
  operatorCounts: Record<ToolName, number>;
  proofs: GateProof[];
  measures: { steps: number; elapsedMs: number };
};
```

The transformed phrase is caused by the dominant operator and path signature. Conch echoes, Keris inserts a boundary, W8 rotates, and Spiral reverses. The original source and all provenance remain present.

The artifact is now bidirectional: completion can copy both its JSON witness and a deep link to the exact phrase/cell/figure world. The intro verifies and loads v2 witness JSON, rejecting unknown cells, figures, versions, or mismatched world keys. This is the first stable interoperability seam for another Sleeper project; it restores the world inputs without pretending to replay a completed run.

## Generalization contract

An addition belongs inside the city only if it passes all six checks:

1. **Pleasure:** the repeated action has tactile or cognitive interest.
2. **Causality:** the source changes a decision or consequence, not merely the palette.
3. **Replay:** the same world permits a materially different attempt.
4. **Transfer:** the learned operator can be stated without the game fiction.
5. **Return:** the run emits inspectable evidence.
6. **Consent:** any real-world utility begins only after explicit player choice.

New verse cells are configuration: text, provenance, law, loop bias, and Gate order. New figures are parameter sets. New Gates require a new protocol handler and proof fixture; they must not be added as names alone.

## Scope and distinctiveness review

This version does not claim a new game genre. Its measurable distinction inside the project is the coupling of five independently inspectable layers in one run: reproducible text-built space, provenance-bearing verse structure, figure-specific physics, eight different evidence protocols, and a bidirectional artifact. Removing any layer changes either the world, the decision structure, or the returned evidence; none exists only as a skin.

The scope stop is deliberate. The Lab prototypes, Atlas fields, biofeedback ideas, music analysis, and real-question routing remain adjacent systems. They may exchange a verified world input or Return Artifact later, but they do not become extra modes inside the City until they pass the six-part contract below. This prevents consolidation from becoming feature accumulation.

## Candid review

Resolved in v0.2:

- nine labels are now eight enacted inner proofs plus a real origin return;
- seed causality is shown before entry;
- verse cells and figures have separate mechanical roles;
- non-Latin source glyphs survive wall rendering;
- runs compare best times only within the same three-input world;
- completion preserves a causal ledger and portable instruction;
- Atlas and Lab survive as fixtures while the root becomes the stronger host organism.

Still open after this slice:

- phrase semantics do not yet alter a Gate rule; phrase effects remain structural and textual;
- Gate protocol state still lives in the large React client rather than a pure replayable reducer;
- there is no same-world ghost or route-overlay comparison;
- Return Artifacts restore their exact world inputs, but full action-trace replay is not yet implemented;
- difficulty and perceptual thresholds require human playtesting on touch, keyboard, and smaller screens;
- the city has no authored long-form district progression yet.

These are the next depth targets. They should not be hidden behind additional fields or visual effects.

## Acceptance checks

- Identical phrase/cell/figure inputs compile the same world law.
- Changing phrase, cell, or figure changes the world seed.
- The eighth-position cell preserves eight distinct glyph positions.
- The canonical Gate list contains all eight inner validity checks.
- Return Artifact preserves provenance, proof order, operator counts, path, steps, and duration.
- Witness JSON and deep links restore only inputs whose world key verifies.
- Production build and rendered-route checks pass before a publish decision.
