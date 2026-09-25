# UNIFIED HELD-OBJECT RETURN PROOF — 2026-09-25

Status: **DRAFT INTEGRATION PROOF / LIVED GATE OPEN**

Parent:
- `/control/confluence/UNIFIED_INSTRUMENT_PIVOT_2026-09-25.md`
- `/control/confluence/UNIFIED_INTERFACE_CAPABILITY_TREE_2026-09-25.md`

## Trigger

The current repo has real interoperability: COMMS/HOUSE/SHOPPING can explicitly hand addressed material into Atlas Dayline, and FIELD can project a local capability neighborhood.

The remaining mismatch is human-facing continuity. A handoff still feels like leaving one app and entering another; a Dayline RETURN does not yet come back to the source owner as an explicit source-addressed decision.

This proof tests the narrow seam already named by the capability tree:

```
SOURCE OBJECT
→ DAYLINE
→ ACT / RETURN
→ SOURCE RECEIPT OFFER
→ NATIVE OWNER ACCEPT / REJECT
```

It does not create a global bus, canonical store, task authority, or automatic source mutation.

## First consumer: COMMS

COMMS is the first consumer because it already has:
- exact source SHA-256;
- message / clause / character-range addresses;
- explicit OPEN / COVERED / DEFERRED / DROPPED state;
- a current explicit COMMS → Dayline handoff;
- a hard authority law that Dayline cannot mark communication obligations covered.

### Outbound

COMMS emits the existing `atlas-dayline-handoff/v0.1` packet with:
- exact source object id;
- exact signal id and source address;
- task projection;
- `return_to=/port/comms/`.

### Held continuity in Dayline

When the handoff is explicitly accepted, Dayline now keeps a small `sourceLink` on the local task:
- handoff id;
- native source descriptor;
- native return path;
- handoff kind.

This is projection metadata only. Dayline still owns temporal execution state and cannot mutate COMMS.

### RETURN

An explicit Dayline RETURN now derives zero or more:

`atlas-dayline-source-return/v0.1`

offers and stores them session-locally under:

`atlas.dayline.source-return.v01`

Each offer carries:
- exact native source descriptor;
- Dayline task id/title/status;
- Dayline RETURN class/checksum/event ids/clock witness;
- proposed native state only as a hint;
- `authority=OFFER_ONLY`.

Law:

> Dayline offers evidence only; native source explicitly accepts or rejects any source-state change.

### Native acceptance

When COMMS reopens in the same browser session it accepts only an offer whose:
- `source.route === /port/comms/`; and
- `source.object_id === current source SHA`.

COMMS then exposes:

- **LOCATE SOURCE** — jump to the exact original signal;
- **ACCEPT → COVERED** — explicit native mutation;
- **ACCEPT → DEFERRED** — explicit native mutation;
- **KEEP OPEN** — explicitly preserve OPEN;
- **DISMISS OFFER** — consume the offer without source mutation.

No choice is automatic.

## What this proves if browser/lived use passes

The intended unified-interface loop can be implemented as continuity of one addressed object rather than a shared application shell:

```
COMMS source/signal
→ temporal projection in Dayline
→ action / evidence
→ source-addressed witness
→ explicit native decision
→ same COMMS source/signal
```

The operation happens in another host while identity and authority return home.

## What this does NOT prove

- that the interaction feels continuous on a real phone;
- that COVERED should normally follow a completed Dayline task;
- that HOUSE or SHOPPING should consume the same receipt without host-specific semantics;
- that a shared visible carrier should be propagated across every host;
- that sessionStorage is a future cross-device transport;
- that any agent gained send/device/purchase authority.

## Falsifier / lived gate

Use one real COMMS OPEN signal:

1. COMMS → DAYLINE;
2. accept into Dayline;
3. perform or deliberately defer the task;
4. RETURN;
5. RETURN TO SOURCE;
6. verify COMMS locates the exact signal;
7. choose COVERED / DEFERRED / KEEP OPEN;
8. verify no other signal or source was mutated.

Fail / revise if:
- the exact signal cannot be recovered;
- the return offer is ambiguous across sources;
- the decision feels like duplicate bookkeeping rather than closure;
- Dayline semantics are insufficient to explain the witness;
- browser navigation/session lifecycle loses the object unexpectedly.

## Propagation rule

Do not generalize until this first consumer passes lived use.

If it passes:
- SHOPPING may consume a receipt only through its own lifecycle gate;
- HOUSE may consume a receipt only as planning/observation evidence, never actuation truth;
- FIELD may expose the returned witness in the held-object frame without becoming source authority.

If it fails:
- preserve the existing one-way handoff architecture;
- remove or narrow the shared return-offer carrier;
- keep host-native RETURN mechanisms.

## Stop

No new universal shell.
No new canonical session bus.
No automatic source mutation.
No second consumer before the COMMS round-trip is used.
