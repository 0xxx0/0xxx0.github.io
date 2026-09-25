# HERMES COORDINATION / DETERMINISTIC-FIRST — 2026-09-25

## STATUS

Protocol over the existing FIELD authority model. Not a new runtime, planner, queue, database or dashboard.

## PURPOSE

Use Hermes where language-model judgment changes the answer. Convert repeated stable work into deterministic machinery so model compute migrates upward toward ambiguity, recovery, synthesis and exception handling.

## AUTHORITY

Repo/live state outranks chat. Source owner retains mutation authority.

Default Hermes authority remains:

`READ / RESEARCH / RECOVER / ANALYZE / PREPARE_PACKET`

Consequential mutation requires a separate explicit bounded grant.

## CYCLE

```
TRIGGER
→ ADDRESS owner/object
→ RECOVER current head
→ CLASSIFY lane
→ SELECT smallest delta
→ EXECUTE or PREPARE one packet
→ VERIFY
→ RETURN to owner
→ STOP / REPLAN
```

Exactly one packet is live per worker unless the current task explicitly requires a bounded set.

## LANES

### PRIVATE REALITY
Examples: chores, personal obligations, appointments, private home state.

- Keep out of public repo canon.
- Prefer local Dayline/private runtime.
- Return only durable evidence to a public domain when it materially changes represented state.

### DOMAIN ADAPTER
Examples: SHOPPING, HOUSE, COMMS, BODY, CARE.

- The domain owns truth and lifecycle.
- Hermes may enrich evidence or prepare a next action.
- Hermes must not become the domain's second state store.

### REPO MUTATION
- Use a clean bounded branch/PR.
- One missing function per packet.
- If a tracked route changes, touch FIELD INDEX metadata in the same change.
- Verify exact changed paths and return evidence.

### RESEARCH / RECOVERY
- Requires a current blocker or exact anchor.
- One exact gain, sharpened blocker, or NO_GAIN → RETURN → stop.

## PACKET

```json
{
  "schema": "field-hermes-task/v0.1",
  "authority": "NONE | BOUNDED_WRITE",
  "owner": "/route-or-private-lane",
  "object": "stable-id-or-exact-target",
  "state": "what-is-true-now",
  "delta": "one useful change",
  "sources": ["exact paths / URLs / recovered anchors"],
  "do_not_touch": ["boundaries"],
  "acceptance": ["observable checks"],
  "return": ["STATE","DELTA","EVIDENCE","RESIDUE","WAITING","ONE_NEXT"]
}
```

## DETERMINISTIC PROMOTION LAW

Promote a transform from agent reasoning to script/schema/validator when all are true:

1. the same transform recurs at least twice;
2. inputs and outputs can be typed;
3. success can be checked without taste/judgment;
4. failure can stop safely;
5. provenance can be preserved.

After promotion, the agent should call the mechanism rather than re-reason the transform.

Keep model reasoning for:

- ambiguous classification;
- source recovery;
- conflicting evidence;
- cross-domain transfer;
- trade-offs and judgment;
- novel exception handling.

## SOURCE-SPECIFIC COORDINATION

### SHOPPING
Hermes may research exact listings and landed cost. Lane is preserved:
- ESSENTIAL = realistic need/restock/maintenance;
- CAPABILITY = named capability gap;
- EXPEDITION = bounded curiosity/research.

No lane moves money or implies ownership.

### HOUSE
Hermes may map evidence and prepare packets. Ordinary chores remain private tasks; only durable physical/resource/state changes return to HOUSE.

### DAYLINE
Dayline owns temporal execution projection. Handoffs remain explicit and local. Hermes does not become a scheduler merely because it can read a Dayline return.

### COMMS
Hermes may prepare or classify a message packet. Send authority remains explicit and source-addressed.

## PAPERCLIP BOUNDARY

Do not install another orchestration control plane merely to represent the above protocol. External orchestrators are donor candidates until persistent multi-agent contention, cost control, heartbeats or audit requirements exceed the repo + bounded-packet model.

## RETURN TEST

The cycle is good when it reduces at least one of:

- re-entry cost;
- repeated model reasoning;
- duplicated state;
- ambiguous ownership;
- unverified work.

and leaves one exact owner + one exact next boundary.
