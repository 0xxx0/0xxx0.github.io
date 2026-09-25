# DAYLINE ↔ SHOPPING CLOSED LOOP — 2026-09-26

Status: **implemented candidate / machine verification pending**.

## Object

One exact Shopping item:

`SHOPPING item → explicit Dayline task → RUN → WITNESS → COMPLETE → RETURN → exact Shopping item → explicit receipt acceptance`.

This is the same unified-instrument law already proved for COMMS, but the native consequence is intentionally different.

## Authority correction

The first Dayline source-return implementation accidentally encoded a COMMS-specific proposal for every completed source-linked task:

`DONE → proposed_native_state: COVERED`.

That is lawful for a COMMS obligation only after native COMMS revalidation/acceptance. It is not lawful for Shopping.

Dayline now classifies the return effect from the source route:

- COMMS → `STATE_PROPOSAL`
- Shopping → `RECEIPT_ONLY`
- other hosts → `EVIDENCE_ONLY`

For Shopping the proposed native state is always `UNCHANGED`.

## Shopping acceptance

Shopping consumes only an offer that still matches:

- source route `/shopping/`;
- exact item id;
- exact item address;
- the item's lifecycle state at handoff time;
- `authority: OFFER_ONLY`;
- `native_effect: RECEIPT_ONLY`;
- completed Dayline task.

If the item state changed while away, the return becomes **STALE / READ ONLY**.

Explicit **ACCEPT RECEIPT** appends a bounded browser-local `shopping-dayline-receipt/v0.1` to the item.

It does **not** change:

- NEED / FOUND / VERIFY / WATCH / BOUGHT / RECEIVED / TESTED / ADOPTED;
- next action;
- price/cost evidence;
- purchase gate;
- seller state;
- HOUSE geometry;
- any money/message/world action.

## Why this is convergence

The carrier is shared but consequence remains host-specific.

The same Dayline execution gesture no longer implies one universal state machine:

`HELD OBJECT → ≤3 MOVES → ACT → WITNESS → RETURN OFFER → NATIVE ACCEPTANCE`.

COMMS can accept an obligation-state proposal. Shopping can accept evidence only.

That is closer to the folding-fan/FAN8 principle: the carrier and gesture stay stable while each leaf/object retains native semantics.

## Machine proof

`tools/dayline-shopping-real-loop-smoke.mjs` drives a 430×900 browser through:

1. load synthetic Shopping WATCH item;
2. hand exact item to Dayline;
3. ADD TO DAY;
4. RUN;
5. record witness;
6. COMPLETE;
7. RETURN;
8. confirm Dayline offer is `RECEIPT_ONLY / UNCHANGED`;
9. RETURN TO SOURCE;
10. ACCEPT RECEIPT in Shopping;
11. assert item remains WATCH;
12. assert one evidence receipt exists;
13. assert the session offer is consumed.

## Stop

Do not generalize native receipt semantics into a universal status vocabulary.

HOUSE may receive a future source receipt only when a concrete HOUSE-native consequence is named. FAN/8 remains passive and parked for physical proof.
