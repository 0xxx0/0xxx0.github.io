# SHOPPING LOOTER / ADVENTURE INTAKE — bounded watch contract

Updated: 2026-10-02

## Purpose

Recover the visual, exploratory and recurring-market parts of earlier Shopping work without creating another Shopping app.

One canonical browser-local Shopping ledger remains authority. Three additions sit around it:

1. **THUMBNAIL / IMAGE PROVENANCE** — one lightweight recognition image per held item. It is a provenance and recognition aid, never recommendation evidence.
2. **ADVENTURE PACK** — an additive merge format for old raids, chat extractions, Carousell hunts, IKEA runs, food/material runs, images and future agent returns. Importing an adventure never erases current local truth.
3. **SHOP LOOTER** — a cron/Hermes-friendly WATCH packet over explicitly enabled pre-purchase items. It returns market evidence into MARKET TAPE; it never purchases, messages sellers, logs in or changes lifecycle.

## Loop

```
SHOPPING item
  -> WATCH enabled
  -> EXPORT LOOTER PACKET
  -> Hermes / cron / browser worker checks exact source/query
  -> shopping-looter-return/v0.1
  -> explicit IMPORT RETURN
  -> exact id + source state revalidation
  -> MARKET TAPE + observed_at + optional thumbnail evidence
  -> Shopping reducer recomputes phase
  -> exact RETURN
```

## Cron gate

Borrow the MEDIA CURATOR discipline:

- no cron until one small bounded manual cycle returns cleanly;
- scheduler runs evidence refresh only;
- failure/unknown produces HOLD/UNKNOWN evidence, never synthetic price/availability;
- recurring work is restricted to items with `watch.enabled=true`;
- cadence is item-owned and exported in the packet;
- no background purchase, cart mutation, account change or seller contact.

Suggested first proof: 3 items, one 24-hour cycle, then inspect the returned MARKET TAPE before scheduling recurrence.

## Visual law

Images must answer “what exact thing/source did this evidence refer to?”

- remote listing/product image: retain source URL and observation time;
- local thumbnail: browser-local compressed preview only;
- generated/decorative image: may illustrate an aspiration, but must be marked as such and never stand in for listing identity;
- a thumbnail does not prove SKU, seller, condition, possession, fit or adoption.

## Adventure merge law

`shopping-adventure-pack/v0.1` is additive.

- new stable ids are added;
- matching ids keep current non-empty local truth and gain adventure provenance;
- the adventure summary is retained in `state.adventures[]`;
- every participating item gains `adventure_ids[]`;
- no merge action changes money/ownership/adoption truth by implication.

## Connection map

- FIELD: same held object/action-surface; LOOTER is an evidence operation, not a new owner.
- HOUSE: exact item still leaves Shopping only for fit/place evidence.
- DAYLINE: physical verification/proof tasks still return witness evidence.
- HUMAN PORT: screenshots/text/URLs can become adventure/candidate inputs.
- MARKET TAPE: canonical bounded history for returned offer snapshots.
- MEDIA REFINERY: optional future helper for local screenshot/image dedupe; source media remains outside public repo.
- Hermes: supervisor/worker for scheduled evidence refresh after bounded proof.
