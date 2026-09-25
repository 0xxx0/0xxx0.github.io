# BACK / UNDO / RETURN / HISTORY — research donors

Status: design evidence for `/control/INTERACTION_SEMANTICS.json`, not a UI style guide.  
Updated: 2026-09-25

## 1. Selective undo is semantic, not merely chronological

Thomas Berlage's selective undo work argues that an isolated earlier command should only be applied to the current state when doing so is meaningful. This supports a hard distinction between **BACK** (navigation) and **UNDO** (a state-changing inverse operation).

- Berlage T. *A selective undo mechanism for graphical user interfaces based on command objects.* ACM TOCHI 1(3), 1994. DOI: 10.1145/196699.196721

Design consequence here:
`BACK ≠ UNDO`.
An artifact owns its inverse semantics; the shared showcase shell does not.

## 2. Exploratory histories branch

Derthick & Roth showed the value of representing alternative exploration scenarios as a branching history rather than forcing users to remember conceptual branch points in a linear undo stack.

- Derthick M, Roth SF. *Enhancing data exploration with a branching history of user operations.* Knowledge-Based Systems 14(1–2), 2001. DOI: 10.1016/S0950-7051(00)00101-5

Design consequence here:
a replayable **PATH** may fork. A fork does not erase its siblings.

## 3. Interaction history can be provenance

Analytic-provenance research treats captured interaction history as material for recovering reasoning, resuming interrupted work, and analyzing how a result was reached.

- Xu K et al. *Survey on the Analysis of User Interactions and Visualization Provenance.* Computer Graphics Forum 39(3), 2020. DOI: 10.1111/cgf.14035
- Yang L et al. *A Design Framework for Instrumenting Analytic Provenance for Problem-Solving Tasks.* KEER 2018.

Design consequence here:
history should be capable of becoming evidence/RETURN, not merely an invisible implementation detail.

## 4. Reversibility is not always the goal

CHI 2023 work on deliberately irreversible interaction is a useful counterweight to the assumption that every consequence should be cosmetically undoable. Physical and social actions can have real residue.

- *Point of no Undo: Irreversible Interactions as a Design Strategy.* CHI 2023. DOI: 10.1145/3544548.3581433

Design consequence here:
`RETURN` records consequence and residue; it must not imply that reality can be rolled back.

## 5. Values / purpose belong in mature design records

Value Sensitive Design is relevant to the proposed instrument charter because it treats values as something to investigate through conceptual, empirical, and technical work throughout design—not as a decorative mission statement.

- Friedman B, Hendry DG. *Value Sensitive Design: Shaping Technology with Moral Imagination.* MIT Press.
- Hendry DG, Friedman B, Ballard S. *Value sensitive design as a formative framework.* Ethics and Information Technology 23, 2021.

Design consequence here:
the charter's **PASSION** may state why something matters, but **PURPOSE / POWER / PROOF / PROMISE / PRICE / RETURN** force the value claim back into mechanism and evidence.

## 6. Local falsification: expression rewind is not rollback

SPIKE 005 / EXPRESSION TRANSCRIPT adds a concrete local test for a distinction that the literature alone does not settle for FIELD.

Observed machine result:

- Φ is a derived host boundary (identity/source/authority/revision), not a copy of host data;
- φ is an addressed locus inside that host;
- a transient transcript may be checkpointed and rewound;
- **REWIND restores an earlier expression/focus context while canonical host revision/value remain current**;
- stale transcript commits and unsupported operations are refused;
- a counterfactual branch may fork an earlier expression without rewriting host history.

Design consequence here:

`REWIND ≠ ROLLBACK ≠ UNDO`.

REWIND is navigation through expression/provenance state. ROLLBACK is a consequential operation on canonical state. UNDO is an artifact-owned semantic inverse. RETURN records what happened and how to re-enter.

Evidence:
- `/spikes/005-expression-transcript/`
- PR #224
- `/spikes/005-expression-transcript/selftest.mjs`

Promotion remains conditional: the transcript grammar should enter shared FIELD machinery only if it prevents a concrete stale-projection, authority, over-copying or unsafe-replay failure.

## Local synthesis

Shared semantics:

`BACK = where was I?`
`UNDO = invert a meaningful mutation`
`PARENT = where does this live?`
`RETURN = what happened, what remains, how do I re-enter?`
`REPLAY = can I reconstruct it?`
`RESET = start another baseline`
`RE_ENTER = what should I know after interruption?`

The arrow is cheap. The semantics are not.
