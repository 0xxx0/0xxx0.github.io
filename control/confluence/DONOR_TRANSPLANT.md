# DONOR / TRANSPLANT

A donor is a prior artifact, mechanism, schema, interaction law, visual grammar, code path, physical trick, or recovered fragment that can contribute **one bounded capability** to another lineage without reviving or promoting its original container.

## Core law

**Recover the donor exactly enough to name what transfers. Preserve source identity. Transplant only the mechanism. Test the recipient. Return evidence.**

A donor is not automatically:

- canon
- a current head
- an active project
- an authority over the recipient
- proof that two lineages are "really the same"

Similarity is not lineage.

## Minimal transplant cycle

```
SOURCE
  ↓ recover
DONOR
  ↓ extract
TRANSFER UNIT
  ↓ adapt
GRAFT / CLONE
  ↓ test
RECIPIENT
  ↓
RETURN
```

The smallest useful record is:

```yaml
donor_id: stable-local-id
source:
  address: path-or-stable-reference
  evidence_class: exact|recovered|reconstructed|proposed
transfer:
  unit: the specific mechanism being donated
  preserves: [invariants that must survive]
  may_change: [recipient-specific adaptation]
recipient:
  address: target artifact/lineage
operation: graft|clone|extract|adapt
test:
  claim: what improvement or capability is being tested
  evidence: receipt-or-observation-address
outcome: candidate|adopted|rejected|dormant
```

No transplant record is required when a simple source link is enough. Use this only when a mechanism actually crosses a lineage boundary.

## Four useful biological readings

These are operational distinctions, not metaphors that must fit everything.

### GRAFT

A bounded mechanism enters a living recipient.

```
donor A ──mechanism M──▶ recipient B
```

A remains A. B remains B. M may be adapted. This is the default donor operation.

### CLONE / CUTTING

A recovered object or mechanism is copied into a new branch that initially preserves strong identity with its source, then may diverge.

```
A ──clone/cutting──▶ A'
                     └─ future divergence
```

Use when the object itself, not merely a mechanism, is being propagated.

### SEED

Several donors recombine into a genuinely new object. Provenance remains plural; identity is new.

```
A ─┐
B ─┼──▶ NEW
C ─┘
```

Do not call this recovery of A/B/C.

### COMPOST

Material is informative but no stable mechanism or identity needs preservation. It may influence exploration, but it should not create a lineage claim.

## Graph representation

The graph needs only a few typed edges:

- `derived_from` — strong ancestry claim
- `donates_to` — bounded transfer without identity inheritance
- `adapted_from` — transferred mechanism changed for recipient
- `clone_of` — copied branch with initially strong identity relation
- `supersedes` — later object intentionally replaces an earlier one
- `sibling_of` — common known ancestor, neither derived from the other
- `tested_by` — evidence/RETURN that evaluates the transplant

Keep **mechanism nodes** separate from **artifact nodes** when useful:

```
[artifact A] ─extracts→ [mechanism M] ─grafts→ [artifact B]
                                      └tested_by→ [RETURN]
```

This lets one mechanism lawfully recur across games, interfaces, research, physical builds, language systems, or control surfaces without collapsing those objects into one project.

## Transplant laws

1. **RECOVER BEFORE INVENTING.**
2. **DONOR ≠ CANON.**
3. **DONOR ≠ CURRENT HEAD.**
4. **SIMILARITY ≠ LINEAGE.**
5. Name the transfer unit; never transplant an entire vague "vibe."
6. Preserve a source address and evidence class.
7. Recipient identity remains sovereign.
8. Adaptation must be explicit when the donated mechanism changes.
9. A transplant earns adoption through recipient-side evidence, not donor prestige.
10. Rejected grafts remain useful evidence.
11. If provenance cannot be supported, mark the relation proposed/unknown rather than repairing history.
12. Prefer a small transplant over wholesale resurrection.

## Relation to TAG projections

Tags may help **find** donors or assemble candidate contexts. They do not establish ancestry, authority, or successful transplantation.

```
TAG → candidate retrieval
SOURCE → provenance
DONOR RECORD → transfer claim
RETURN → evidence
```

The tag layer remains disposable. Donor lineage must survive its removal.

## Relation to CONFLUENCE

CONFLUENCE should coordinate donor traffic, not merge donors and recipients into a universal vocabulary.

A useful handoff says:

```
FROM: source lineage
TRANSFER: exact bounded mechanism
TO: recipient lineage
PRESERVE: invariants
CHANGE: allowed adaptation
TEST: recipient-side evidence
RETURN: address
```

That packet is enough for another thread or agent to use a recovered mechanism without rediscovering its whole history.

## Seal for the tagging thread

The tagging work contributes one donor capability:

**TAG PROJECTION — cheap, removable coordinates for retrieval/context assembly.**

It is now bounded by these invariants:

- stable families, open values
- lexicon is advisory
- tags never become authority
- source material remains intelligible without them
- generated tags are proposals with provenance/confidence where relevant
- removing the tag projection must not damage canon

No further taxonomy work is required until real retrieval/routing friction supplies evidence for a change.


## Candidate reading: COMPLEMENT / CO-SIGNAL

Status: **PROPOSED / TEST BEFORE CANON**  
Source interaction: HUMAN PORT convergence thread, 2026-09-21.

The current HUMAN PORT work exposed a useful possible donor distinction: some transferred mechanisms do not supply a whole capability by themselves; they **modulate whether another signal/mechanism should activate**.

This is closest to a complement / co-signal reading:

```
incoming signal
   + complement / co-signal
   + recipient context
   ↓
activation threshold / route changes
```

Candidate transfer unit:

**BINDING != INTERPRETATION != AUTHORITY != ACTIVATION.**

Related harvested mechanism:

**CONVERSATION MAY LEAVE USEFUL RESIDUE WITHOUT CREATING AN OBLIGATION.**

Possible recipients include HUMAN PORT policy, agent routing, continuity escalation, Atlas promotion and other systems where one observation should not automatically become action.

### Privacy / provenance boundary

Do **not** treat raw human conversation as a quarry to publish or mine wholesale.

A human interaction may donate a bounded mechanism only when the transfer unit can be stated independently of private wording. Preserve the source as a private/protected reference when needed; publish only curated paraphrase or explicitly authorized excerpts.

### Test before promotion

Use COMPLEMENT only if a real recipient requires a missing co-signal/activation distinction that GRAFT/SEED/etc. cannot already express cleanly. If it does not improve a recipient-side decision or prevent false activation, leave this reading dormant.

This note records the interaction as donor evidence without turning the joke/metaphor itself into canon.
