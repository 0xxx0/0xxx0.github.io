# CREW SEAM — successor / worker handoff

Date: 2026-10-03  
Status: **HOUSE-LOCAL CANDIDATE / AUTHORITY NONE**

## Recover in 30 seconds

Do not create another coordination bus.

HOUSE already has:
- one exact spatial locus;
- one local design-trial state;
- runtime witness age;
- REALITY ◎;
- INTERPHASE carrier for authority-free cross-host continuity.

Crew Seam adds only the missing **shared operational minimum**.

```text
OBJECT
INTENT
CONSTRAINTS
STAGE
HUMAN GATE
NEXT ≤3
WITNESS
RESIDUE
RETURN
```

Runtime:
- `/house/crew-seam.js`
- machine capability card: `/house/crew-card.json`
- host UI: `/house/reality-harness.js` → `CREW / AGENT`

## Read hook

Browser:

```js
const {frame, offer, response, carrier} = window.HouseCrewSeam.snapshot();
```

Reactive:

```js
window.addEventListener('house:crew-frame', e => {
  // e.detail is house-crew-frame/v0.1
  // e.detail.changed names only coordination fields that changed.
});
```

Do not require a whole-state checksum. Stable HOUSE address + changed fields + native evidence are enough.

## Offer hook

An external worker may submit **data only**:

```js
const offer = {
  schema: 'house-crew-offer/v0.1',
  authority: 'OFFER_ONLY',
  from: { id: 'worker-id', label: 'WORKER LABEL' },
  object: { address: window.HOUSE_CONTEXT.address },
  summary: 'why this helps the current intent',
  proposals: [
    { id: 'p1', kind: 'PROPOSE', label: 'bounded option', note: 'evidence / tradeoff' },
    { id: 'p2', kind: 'CHECK', label: 'verify constraint', note: 'what this would falsify' }
  ],
  return_to: '/house/'
};
window.dispatchEvent(new CustomEvent('house:crew-offer', { detail: offer }));
```

Or:

```js
window.HouseCrewSeam.receive(offer);
```

Same-origin cross-route handoff may write the same object to:

`sessionStorage['house.crew.offer.v01']`

before returning to `/house/`.

## Hard offer rules

- exact current HOUSE address required;
- `authority = OFFER_ONLY` required;
- 1–3 proposals only;
- proposal kind ∈ `RESEARCH | PROPOSE | CHECK | DRAFT | NAVIGATE`;
- effect-bearing proposals are rejected;
- a different locus fails closed;
- no private HA credential/runtime information belongs here.

## Human steering hook

The host renders only three coordination responses:

### KEEP
The framing/proposal is worth retaining in active attention.

It does **not** authorize native effect.

### PARK
Keep as residue/later possibility; continue elsewhere.

It does **not** mean the idea is wrong.

### WRONG_FRAME
Stop elaborating the current model and repair the framing first.

This is intentionally more useful than a generic thumbs-down.

Reaction event:

```js
window.addEventListener('house:crew-response', e => {
  // house-crew-response/v0.1
  // action = KEEP | PARK | WRONG_FRAME
});
```

Session response:

`sessionStorage['house.crew.response.v01']`

## Human gate law

Do not ask the operator merely because a stage exists.

Read `frame.human_gate.class`.

### NONE
Continue lawful inspection/research/proposal work.

### PING
One small acknowledgement can choose continuation.

### CHOOSE
Preference/framing/adoption belongs to the human.

### WORLD_RETURN
Fresh physical/subjective evidence is required.

If `WORLD_RETURN`, workers may still:
- prepare the test;
- reduce ambiguity;
- precompute alternatives;
- identify exactly what evidence is missing.

They must not invent the result.

## INTERPHASE bridge

Crew Seam does not replace `interphase-carrier/v0.1`.

It compiles into it:

```js
window.HOUSE_CREW_CARRIER
```

or pure-core:

```js
HouseCrewSeamCore.compileCarrier(frame, InterphaseCarrier)
```

Carrier authority remains:

`NONE / HANDOFF ONLY`

and each move remains:

`HOST_NATIVE_ONLY`.

## External protocol bridges

These are **adapter targets, not current dependencies**.

### A2A 1.0
Useful for remote-agent discovery and task/artifact exchange.

Bridge boundary:

`A2A task/artifact → validated house-crew-offer/v0.1`

Do not expose native HOUSE/HA effect methods through the A2A card merely to make integration symmetrical.

### AG-UI 1.0
Useful if an external agent runtime needs event/state synchronization and HITL interrupts.

Candidate mapping:

```text
house:crew-frame.changed → state/delta event
human_gate CHOOSE/WORLD_RETURN → interrupt
house:crew-response → resume/reframe signal
```

### A2UI
Useful as a trust-boundary design pattern: remote agent sends declarative intent, host renders trusted components.

HOUSE already follows that law. Do not accept remote HTML/JS.

## Delegation packet for another coding/research worker

Give the worker only:

```text
SOURCE
  /house/crew-card.json
  current house-crew-frame/v0.1

HOLD
  exact HOUSE address
  current intent
  constraints
  human gate

TURN
  one of RESEARCH / PROPOSE / CHECK / DRAFT / NAVIGATE
  ≤3 proposals

TRACE
  source/evidence refs
  what assumption was falsified or strengthened

RETURN
  house-crew-offer/v0.1
  authority OFFER_ONLY
```

Do not send the entire conversation unless the task actually requires it.

## Promotion / falsification

Keep Crew Seam only if ordinary use shows at least one of:
- less repeated briefing between workers;
- fewer unnecessary human questions;
- faster detection of wrong framing;
- cleaner re-entry after interruption;
- easier delegation to a different worker without loss of object/intent/authority.

Narrow or remove it if:
- users must manage the crew state manually;
- the frame becomes another verbose status dashboard;
- adapters require dumping arbitrary metadata into the frame;
- KEEP begins to be interpreted as effect permission;
- workers still need the entire transcript to continue ordinary bounded tasks;
- the interface increases prompts/attention rather than reducing them.

## Next experiment

Use one real HOUSE design task with two workers/threads:

1. worker A leaves exact locus + intent + next/proof in Crew Seam;
2. worker B receives only the frame and relevant native source;
3. worker B returns ≤3 OFFER_ONLY proposals;
4. operator uses KEEP/PARK/WRONG_FRAME only if useful;
5. compare briefing length, wrong assumptions and time-to-useful-action against an ordinary chat handoff.

**Goal: shared state sufficient for coordinated action, not maximal shared context.**
