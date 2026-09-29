# GAME DONOR → FIELD TRANSFER MAP

**Date:** 2026-09-29  
**Status:** BOUNDED DONOR MAP / NO NEW APP  
**Law:** GAME DONOR ≠ GAME SKIN. Transfer the invariant; leave fiction, branded UI, economy and content behind.

## 1 — OUTER WILDS → KNOWLEDGE PROGRESSION

**Observed donor:** a repeating world in which exploration reveals information; the ship computer/journal records discoveries and was deliberately redesigned as a visual “detective board.”

**Transferable rule:**  
**PROGRESS MAY BE KNOWLEDGE WITHOUT WORLD MUTATION.**  
When the world/object has not changed but our model has, preserve the discovered relation/gap rather than manufacturing a task or completion state.

**FIELD host:** root CATCH + ACT / manifest evolution.question / open_gaps / non-AVAILABLE exit paths; CONTINUITY for exact unresolved distinctions.

**Current implementation:** 0.8.15 MORE HERE already projects declared knowledge gaps without creating quest debt or a second store.

**Next implementation idea:** a derived RUMOR/KNOWLEDGE reading over existing declared gaps/relations only, if the current per-card projection becomes insufficient. No new canonical graph.

**Do not transfer:** time-loop fiction, “quest” semantics, completion badges, mystery-board aesthetic.

## 2 — HADES → FAILURE AS CONTINUITY MATERIAL

**Observed donor:** each escape attempt can advance strength, context, relationships and story; the game also maintains a permanent record of attempts.

**Transferable rule:**  
**FAILED ATTEMPT ≠ ZERO PROGRESS.**  
If an attempt changes what is known, changes a constraint, exposes a failure signature or alters the next lawful move, preserve that delta as residue.

**FIELD host:** packet egress RESIDUE, RETURN receipts, verification failures, CURRENT replan.

**Implementation idea:** verification/tool failures emit one bounded ATTEMPT_RESIDUE record: exact failed operation + failure fingerprint + assumption falsified + changed condition required before retry. Exact rerun without a changed condition should be visibly redundant, not “progress.”

**Do not transfer:** grind, currencies, power creep, repeated combat, narrative content.

## 3 — DEATH STRANDING → ASYNCHRONOUS USEFUL TRACE

**Observed donor:** player-built structures, signs, donated resources and dropped cargo can help later players without synchronous coordination.

**Transferable rule:**  
**LEAVE HELP IN THE TERRAIN, NOT IN CHAT.**  
A useful action may leave a low-authority trace that makes a later traversal easier without commanding the later actor or requiring live synchronization.

**FIELD host:** RETURN receipts, repo fixtures, exact handoff packets, recovered donor tissue, Git route history.

**Implementation idea:** derive a route-local TRAIL from already-durable proofs/fixtures: “what prior traversal left that can be reused now.” Promote a repeated trace into native infrastructure only when multiple unequal traversals actually consume it.

**Do not transfer:** likes/reputation, social scoring, forced connectivity, branded strand metaphor.

## 4 — INTO THE BREACH → FORECAST BEFORE COMMIT

**Observed donor:** enemy attacks are telegraphed before the player commits a turn, making consequence inspection part of the move itself.

**Transferable rule:**  
**SHOW CONSEQUENCE BEFORE COMMIT.**  
For each currently lawful move, expose the immediate predicted effect and authority/reversal boundary before mutation.

**FIELD host:** root held-object action aperture / INTERPHASE carrier / native host authority.

**Implemented in 0.8.24:** the existing ≤3 move aperture now shows a visible FORECAST. OPEN is navigation only; DAYLINE is OFFER_ONLY until explicit ADD TO DAY; COPY is clipboard-only; TRACE is view/evidence-only. Native direct intents are identified as handoff/navigation with target-host authority.

**Invariant:** FORECAST ≠ EFFECT ≠ WITNESS. A prediction never proves the result.

**Do not transfer:** turn grid, combat framing, optimization score, “perfect turn” pressure.

## 5 — HARDSPACE: SHIPBREAKER → INTERFACE-AWARE DECONSTRUCTION

**Observed donor:** ships are layered systems with fuel, electrical, radiation and other hazards; useful salvage requires surveying subsystems before cutting them apart.

**Transferable rule:**  
**SURVEY INTERFACES BEFORE CUTTING STRUCTURE.**  
Deletion/refactoring should preserve or deliberately terminate authority, provenance, dependency and return interfaces before the container disappears.

**FIELD host:** COAXIALITY audit, route registration, recovery lineage, host/adapter contracts, deprecation/deletion work.

**Implementation idea:** a DECOMMISSION / CUT audit for any route/module proposed for removal:
1. dependents/readers;
2. authority owned here;
3. durable source/provenance;
4. return paths;
5. transferable mechanisms;
6. safe replacement/archive address;
7. only then delete.

The output is a repair/delete decision, not a backlog.

**Do not transfer:** debt/economy, hazardous-industrial fiction, salvage scoring.

## 6 — TERRA NIL → SCAFFOLD RETIREMENT

**Observed donor:** ecological restoration is not complete when the machinery works; the player recycles the infrastructure and leaves the restored environment behind.

**Transferable rule:**  
**A TOOL IS NOT FINISHED UNTIL ITS TEMPORARY SCAFFOLD CAN LEAVE.**  
Successful infrastructure should disappear, fold, or demote once the host has absorbed the surviving capability.

**FIELD host:** TZIMTZUM / root contraction, experimental routes, donors, adapters, one-off migration/recovery machinery.

**Implementation idea:** temporary surfaces declare:
- `survivor` — capability/invariant that must remain;
- `retire_when` — proof condition for folding/deletion;
- `residue_address` — where exact history remains recoverable.

A later audit may flag temporary routes whose survivor has transferred but whose scaffold still occupies the active surface.

**Do not transfer:** ecological skin, resource economy, purity/completion score.

---

# COMPOSITE FIELD LOOP

These donors compose without becoming one game:

```
OUTER WILDS    discover what changed in knowledge
      ↓
HADES          preserve failed-attempt residue
      ↓
DEATH STRANDING leave reusable trace in the terrain
      ↓
INTO THE BREACH forecast consequence before next commit
      ↓
HARDSPACE      cut obsolete structure only after interface survey
      ↓
TERRA NIL      remove the scaffold after capability survives
      ↓
RETURN
```

This is not a mandatory lifecycle. Each donor applies only when its invariant fits the host.

## CURRENT DECISION

Ship only the Into-the-Breach forecast now because:
- FIELD already exposes ≤3 lawful moves;
- the missing information is immediate consequence/authority, not another route;
- the forecast can be derived from existing contracts;
- it is self-verifiable;
- it reduces accidental action without expanding canonical state.

Keep the other five as donor constraints until an actual host mutation needs them.
