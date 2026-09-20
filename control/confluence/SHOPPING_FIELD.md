# SHOPPING FIELD / FI-SHOP-001

## STATUS

Current public head: `/shopping/` v0.1.

This is **not a shopping project or wishlist**. It is the procurement/resource-acquisition adapter between a capability gap and a verified adopted capability.

`NEED → QUERY → FOUND → VERIFY → WATCH → DECIDE → BOUGHT → RECEIVED → TESTED → ADOPTED`

Side paths remain explicit: `HOLD / SKIP / EXPIRED / RETURNED / REPAIR / ABANDONED / ARCHIVE`.

## RECOVERED DONORS

### House OS Shopping / Inventory Console · 2026-09-09
Recovered artifact already had the important execution mechanics:
- distinct recommendation / listing / purchase / receipt / test / adoption truth states;
- verify existing floor inventory before buying;
- six-part gate: duplicate, two-project-or-welfare, storage home, safe 72h test, shared interface, exact seller/SKU;
- local state + import/export;
- bounded agent research packet;
- no autonomous purchase, seller messaging or account mutation.

### FI-SHOP-001 Shopping Field Menu · 2026-09-20
Added the stronger FIELD framing:
- RESOURCE → OPTION → DECISION → RECEIPT → ADOPTION;
- freshness classes for marketplace observations;
- landed-SGD normalization;
- routing into BOM, inventory/capability, spatial/storage anchor, repair queue, or explicit non-action.

### WD-038
Recovery audit says procurement should merge as a CONTROL adapter and specifically warns: **procurement is an adapter from capability gaps, not a project**.

## REFINEMENT

The old console mixed stable owned-item claims, recommendations and market observations in one enum. The current migration is deliberately conservative:

- legacy `FOUND LIVE → FOUND`;
- `RECOMMENDED → WATCH`;
- `VERIFY ON FLOOR → VERIFY`;
- `BOUGHT / RECEIVED / TESTED / ADOPTED` retain their states;
- legacy `CONFIRMED → VERIFY` plus a migration note.

That last rule prevents status laundering: a historical “confirmed” row cannot silently become public/current ownership or adoption.

## ECONOMIC LAW

Normalize in SGD:

`landed = item − discount + CN freight + international freight + local/pickup + GST + FX/payment friction + expected failure cost`

Quantity is retained separately so unit cost remains visible. Multi-quantity frontier comparison (1/2/5/10/20/50) remains a later projection, not a reason to delay the base adapter.

## PRIVACY / AUTHORITY

The public route ships with no personal inventory. Imported inventory stays in browser-local storage unless the user explicitly exports it.

Research agents may prepare evidence. They do not move money, message sellers, change accounts or convert a recommendation into ownership.

## CONNECTIONS

- Parent: Forward Center Mass / Interphase.
- Inputs: project gap, listing, recommendation, receipt, owned-item claim, materialization idea.
- Outputs: BOM candidate, capability/inventory candidate, repair path, storage/spatial anchor, watch item, or explicit non-action.
- HOUSE: physical storage/adoption destination.
- FIELD INTAKE: future generic ingress adapter for receipts/listings.
- RETURN: TEST/ADOPT transition is earned by evidence, not purchase.

## NEXT BOUNDS

Do not add marketplace scraping or autonomous cart execution until the local lifecycle proves useful.

The next meaningful increments are:
1. explicit receipt/listing import adapter;
2. quantity frontier projection for 1/2/5/10/20/50;
3. optional private owned-inventory adapter;
4. project-gap → procurement packet bridge from active FIELD objects.
