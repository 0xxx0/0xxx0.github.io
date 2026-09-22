# CONVERGENCE NEXUS — SLEEPER CITY ENGINE

**Date:** 2026-09-22  
**Status:** KEY FINDING — current head exists outside the repo

## The situation

The repo's `/sleeper/` (37KB, ASCII Sleeper 0.8) is a **parallel branch**, not the current head.  
The actual current head is the live **City Engine v0.2** at `https://sleeper-one-return.metaname.chatgpt.site/`.

## Features in the live City Engine NOT in the repo

| Feature | Live URL | Repo /sleeper/ | Gap |
|---|---|---|---|
| Field Atlas (10 playable fields) | ✅ /atlas | ❌ | 10 distinct playable worlds |
| Prototype Lab (RSVP/Kite/Switchyard/Proofs/Operators) | ✅ /lab | ❌ | Full instrument suite |
| Interphase tile interface | ✅ /interphase | ❌ | Alternative interaction mode |
| Painting Path viewer | ✅ /painting | ❌ | Region-marked painting interaction |
| Music/sound binding | ✅ designed | ❌ | Lullaby/Codex alignment spec exists |
| Nine Gates operators (Conch/Keris/W8/Spiral) | ✅ designed | ❌ | Operator grammar exists |
| Kite game mechanics | ✅ /lab | ❌ | Full kite simulation |
| F DataDisc fold | ✅ designed | ❌ | Radial city projection |

## What the repo /sleeper/ has that the live City doesn't

| Feature | Repo /sleeper/ | Live City |
|---|---|---|
| ASCII POV maze rendering | ✅ | ✅ (different engine) |
| 4-gate cartridge system | ✅ | ❌ (uses 9-gate system instead) |
| PLAIN/POV projection switching | ✅ | ❌ (different UX model) |
| RETURN seal with witness JSON | ✅ | ✅ (Nine Gates system) |
| Self-test suite | ✅ | Not checked |

## Design origin

Both implementations trace to the **Brainstorm ASCII Sleeper City** conversations (Aug 24 + Sep 10, 2026 — 1,909 total messages across 2 threads). The repo /sleeper/ was built first; the live City Engine was built second with a richer feature set. The Brainstorm conversations document the ENTIRE design evolution — they ARE the missing design docs.

## Action

1. Document the live City Engine as the current head in MIGRATION.json
2. Keep repo /sleeper/ as a retained reference donor (not obsolete — represents a valid design constraint: "what fits in 37KB")
3. If convergence is desired, import specific mechanisms (Prototype Lab instruments, Field Atlas structure) rather than porting the whole app
4. The 8.2MB of downloaded assets at `void-anchor/_recovered/sleeper-city/` serve as the local reference copy

## Cross-references

- Brainstorm conversation 1: `conversations-007.json` (945 msgs, Aug 24)
- Brainstorm conversation 2: `conversations-008.json` (964 msgs, Sep 10)
- Live URL: https://sleeper-one-return.metaname.chatgpt.site/
- Local copy: `/Users/mcvoid/void-anchor/_recovered/sleeper-city/`
- Repo sleeper: `/sleeper/`
- Repo recovery sleeper: `/recovery/sleeper/workfield-v1.2/`