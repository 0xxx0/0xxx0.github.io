# CREW SEAM — human / agent coordination with low compliance burden

Date: 2026-10-03  
Status: **RESEARCH → BOUNDED HOUSE TRANSFER**  
Recipient: `/house/crew-seam.js`

## One line

**Do not make the human operate the coordination machinery. Derive what is already known, let workers continue non-effectful work, interrupt only for irreducible preference/world evidence, and close every consequential handoff through an explicit witness / RETURN.**

---

## Problem

Human-agent systems often push integration cost back onto the human:

- repeat the same context to another worker;
- approve steps that carry no authority or risk;
- translate between agent vocabularies;
- inspect verbose intermediate reasoning;
- discover late that two workers held different models of the same object;
- perform clerical updates so the system can know what its own interfaces already know.

That is not meaningful human control. It is coordination tax.

The HOUSE recipient already has exact object identity, selected spatial address, design phase, runtime witness age, local intent/constraints and RETURN paths. The crew layer should derive these rather than ask for them again.

---

## 1. Aviation / NASA crew coordination

Sources:
- NASA Human Integration Design Handbook, Revision 1: https://www.nasa.gov/wp-content/uploads/2023/03/human-integration-design-handbook-revision-1.pdf
- NASA flight-deck communication / closed-loop coordination: https://humanfactors.arc.nasa.gov/flightcognition/Publications/NASA_TM_2017-219565.pdf

Mechanism-level transfer:

- Shared mental models matter because members need a common understanding of system state, roles, information distribution and likely next actions.
- Shared awareness cannot safely be assumed merely because people have access to the same data.
- Effective crews update situation awareness as conditions change rather than continuing a stale plan.
- Closed-loop communication lets a receiver reveal whether a contribution was actually understood; this can surface comprehension errors early without requiring long explanations.

HOUSE transfer:

```text
shared object / locus
→ current intent
→ who owns what
→ next ≤3
→ human/world gate
→ witness
→ RETURN
```

The equivalent of a read-back should be a **small structured delta**, not a paraphrase of the whole conversation.

The useful negative signal is `WRONG_FRAME`: the receiver can invalidate the current framing without having to supply a complete replacement immediately.

---

## 2. Calm technology / peripheral coordination

Sources:
- https://calmtech.com/papers/designing-calm-technology
- https://calmtech.com/gallery/periphery/

Mechanism-level transfer:

- Information can live at the periphery until it needs central attention.
- A system should move a signal into focus when action is warranted, then let it recede.
- The minimum technology that solves the problem is preferable to permanent foreground demand.

HOUSE transfer:

Most coordination state should remain ambient:
- current crew gate;
- stale/current runtime witness;
- current design phase;
- pending offer count.

Only an irreducible gate should demand focus.

Therefore `CREW / AGENT` lives inside `REALITY ◎`; it is not a permanent chat panel.

---

## 3. A2A 1.0 — agent ↔ agent interoperability

Sources:
- https://a2a-protocol.org/v1.0.0/
- https://a2a-protocol.org/dev/specification/
- https://www.linuxfoundation.org/press/a2a-protocol-surpasses-150-organizations-lands-in-major-cloud-platforms-and-sees-enterprise-production-use-in-first-year

Current useful mechanism:

A2A is now a stable cross-agent protocol for capability discovery, task collaboration and exchange across opaque agent systems. It explicitly avoids requiring one agent to expose its internal memory or tools to another.

HOUSE transfer:

Do **not** make HOUSE speak A2A natively yet.

Instead provide one narrow adapter target:

`remote task/artifact → exact HOUSE locus → house-crew-offer/v0.1 → human/host response`.

The remote agent remains opaque. HOUSE needs only:
- sender identity;
- exact target locus;
- summary;
- ≤3 proposal artifacts;
- return address.

Effects remain native to their owning host.

---

## 4. AG-UI 1.0 — agent ↔ user application event seam

Source:
- https://www.copilotkit.ai/blog/ag-ui-1.0

Current useful mechanism:

AG-UI 1.0 defines a stable event/schema layer between agents and user-facing applications, including state synchronization, subagent support, custom metadata and human-in-the-loop interrupts.

HOUSE transfer:

Again, do not import the protocol wholesale.

Crew Seam already has the local concepts an adapter would need:
- current frame;
- changed fields;
- human gate;
- external offer;
- lightweight human response.

Future bridge:

```text
house:crew-frame delta
↔ AG-UI state/custom event
house human_gate
↔ AG-UI interrupt
house:crew-response
↔ resumed agent task
```

Promotion gate: only build this adapter when a real external agent needs it.

---

## 5. A2UI — remote UI intent across a trust boundary

Sources:
- https://developers.googleblog.com/en/introducing-a2ui-an-open-project-for-agent-driven-interfaces/
- https://developers.googleblog.com/en/a2ui-and-mcp-apps/

Mechanism-level transfer:

A2UI treats remote UI as declarative data rendered through a host-controlled component catalog instead of executing arbitrary remote HTML/JavaScript.

HOUSE transfer:

This validates a strong boundary:

**External workers may offer intent/data. HOUSE owns rendering.**

`house-crew-offer/v0.1` therefore contains proposal data only. The `REALITY ◎` host renders its own controls (`KEEP / PARK / WRONG FRAME`). Remote code never owns the HOUSE interface.

---

## 6. Fine-grained appropriate reliance

Research reference:
- https://arxiv.org/abs/2501.10909

A useful direction in human-AI collaboration is to decompose complex work into inspectable steps rather than demanding one coarse trust decision over a whole opaque result.

HOUSE transfer:

Do not ask “trust this agent?”

Expose the exact seam:
- what is held;
- what is proposed;
- what authority it would require;
- what is still unknown;
- what evidence would close it.

Reliance can differ step by step.

---

## 7. Human control in multi-agent conversation

Reference:
- https://research.google/blog/beyond-one-on-one-authoring-simulating-and-testing-dynamic-human-ai-group-conversations/

A 2026 DialogLab study found its human-control condition more engaging and generally more effective/realistic than autonomous or purely reactive group-agent modes for the tested simulation tasks.

Transfer, cautiously:

The human need not micromanage every turn, but the system should expose compact steering operations that can redirect the group.

Crew Seam uses:
- `KEEP` — framing is useful; retain it. Not effect approval.
- `PARK` — preserve as residue/later possibility.
- `WRONG_FRAME` — repair the shared model before continuing.

These are coordination signals, not workflow buttons disguised as consent.

---

# Derived design laws

## A. Human gate, not human checkpoint

Human involvement is classified:

### `NONE`
Crew can inspect, research, compare, draft or propose without interruption.

### `PING`
One lightweight acknowledgement materially selects continuation.

### `CHOOSE`
The preference/framing/adoption decision belongs to the human.

### `WORLD_RETURN`
Fresh physical or subjective evidence must come from the world/human. Simulation cannot close it.

A worker should continue lawful non-effectful work until it reaches one of these real gates.

## B. Derive before asking

Before requesting anything from the human:

1. read the held object/address;
2. recover existing intent/constraints;
3. inspect existing witness/RETURN;
4. identify what changed;
5. ask only for the missing irreducible variable.

## C. Delta, not transcript

Crew synchronization should exchange changed operational fields, not replay conversation history.

No whole-state fingerprint is added. Stable object identity + explicit changed-field names are enough for this seam.

## D. Shared mental model ≠ shared internal state

Crew members do not need identical memory or reasoning.

They need agreement on:
- object;
- goal/intention;
- constraints;
- role/authority;
- next moves;
- evidence;
- return point.

## E. Offers are not effects

A remote worker can offer:
- RESEARCH;
- PROPOSE;
- CHECK;
- DRAFT;
- NAVIGATE.

It cannot smuggle an effect through the coordination protocol.

## F. Closed loop without chatter

The minimal closed loop is:

```text
WORKER OFFER
→ KEEP | PARK | WRONG_FRAME
→ worker updates shared model
→ continue
```

No prose acknowledgement is required when the structured response already resolves the ambiguity.

---

# Recipient implementation

Files:
- `/house/crew-seam.js`
- `/house/crew-card.json`
- `/tools/house-crew-seam-selftest.mjs`
- `/control/confluence/CREW_SEAM_HANDOFF_2026-10-03.md`

Visual host:
- `/house/reality-harness.js` → `CREW / AGENT`

Existing transport reused:
- `/lib/interphase-carrier.js`

No new sovereign bus, scheduler, agent runtime, global memory store or effect authority is introduced.

# Compression

```text
crew alignment
= stable object
+ shared minimum
+ explicit delta
+ role/authority
+ irreducible human gate
+ witness
+ RETURN
```

**Reduce the gap between crew mates by synchronizing what action depends on, not by making everyone carry the same conversation.**
