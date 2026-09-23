# HET12 — PROJECTION CONTRACT HARNESS v2

The falsification target the collapse protocol asked for: **twelve heterogeneous nodes,
five projections, multi-focus, fault injection, GetPut/PutGet, exact RETURN.**

Machine-readable PASS/FAIL matrix. Diagnostic manifests, not interfaces.

## RESULT

```
19 / 19 laws hold                                    PASS
 8 / 9 kill criteria clear · 1 untested · 0 HIT
12/12 nodes × 5 projections × 10 properties           ALL OK
```

## THE FIXTURE (N01–N12)

`TOKEN · PARAGRAPH · IMAGE · NUMBER · BOOLEAN · ENUM · FREE_TEXT_INPUT · RELATION ·
EXECUTABLE_ACTION · TIMED_AUDIO_EVENT · NESTED_COLLECTION · EXTERNAL_EVIDENCE`

Each carries `id · type · source_ref · canonical_address · parent · relations[] ·
capabilities[] · payload · provenance · clock? · revision`. **`id` is not derived from payload.**

Initial attention is deliberately awkward — **multi-select plus MULTI-FOCUS**:

```
selection = [N03, N07]
focus     = [ N03: DETAIL , N07: EDIT ]     ← two apertures at once
cursor    = N07
```

## THE LAWS THAT HELD

| law | evidence |
|---|---|
| **projection purity** | canon hash identical after every projection |
| **12/12 IDs recoverable** | `locate(renderKey) → node_id` on all 12, all 5 |
| **12/12 addresses unchanged** | address is not identity and is not re-derived from geometry |
| **hierarchy survives** | N11 children `[N04,N05,N06]` intact |
| **relation survives** | N08 still `N01 --supports--> N02` |
| **selection survives** | `[N03,N07]` after every edge |
| **MULTI-FOCUS survives** | both targets and both apertures held through all five |
| **clock survives** | `AUDIO-1 @ 12.500s` unchanged |
| **provenance survives** | `source_ref` + `observed_at` on all 12 |
| **support map survives** | `supports()` output stable across projections |
| **GetPut / no-op** | `put(S,get(S)) == S`, no mutation receipt emitted |
| **PutGet** | N05 `false → true` visible after reprojecting every view |
| **GLYPH refuses EDIT with a reason** | `SUPPORT=0` — a handle, not an encoding |
| **LINE supports the same EDIT** | expansion and editing belong to the projection that declares them |
| **action refuses EDIT, supports INVOKE** | authority ceiling `TEST\|COMMIT` preserved |
| **authority monotonicity** | projection is not a privilege escalation |
| **RETURN law** | view-only excursion restores a **byte-identical ReturnFrame** |
| **fault injection** | all 5 injected faults detected |

### Traversal — after every edge, all ten properties

```
→ LINE       ALL 10 PROPERTIES OK
→ RING       ALL 10 PROPERTIES OK
→ SIX_PANEL  ALL 10 PROPERTIES OK
→ ROOM       ALL 10 PROPERTIES OK
→ GLYPH      ALL 10 PROPERTIES OK
```

## KILL CRITERIA

```
CLEAR     ROOM requires a second semantic graph
CLEAR     GLYPH cannot preserve a recoverable node handle
CLEAR     multiple focus cannot survive projection switching
CLEAR     RSVP/time needs hidden cursor state
CLEAR     view editing violates GetPut/PutGet
CLEAR     meaning disappears in LINE
UNTESTED  FOLD_VIEW and FOLD_OP cannot be separated
CLEAR     RETURN requires resetting rather than restoring context
CLEAR     authority changes as a side effect of projection

0 HIT
```

**`UNTESTED` is not `CLEAR`.** HET12 does not fold DOM, so it cannot exercise the
FOLD_VIEW / FOLD_OP split. Reporting an unexamined property as passed would be the exact
failure this harness exists to catch.

## TWO BUGS THE HARNESS FOUND IN ITSELF

Both are recorded because each would have produced a **false result**:

1. **A detector weaker than the assertions.** The first fault-injection pass checked only
   identity and address, so it silently missed a corrupted support map and a stolen
   selection. *A detector must be as strong as the properties being asserted*, or it will
   report faults as clean. Fixed: every asserted property is now checked.
2. **A typo reporting a false HIT.** `addressUnchanged` vs `addressesUnchanged` made the
   ROOM criterion read HIT. **A kill criterion firing on a typo would have been reported as
   an architectural finding.** Fixed, and the criteria are now derived from law results
   rather than typed by hand.

## WHAT THIS DOES NOT PROVE

1. **No rendering.** These are diagnostic manifests. The *behaviour* is tested; the claim
   that a projection can *look* right while carrying these properties is untested.
2. **The DOM claim is untouched.** `structural DOM = program` is not exercised. Hence the
   one untested kill criterion.
3. **No real source adapters.** All twelve nodes are hand-built. READFIELD / LISTEN / CODE
   as adapters remain unproven.
4. **12 nodes, one instance each.** No scale test.
5. **`opsFor()` is a declaration**, not a measurement — it encodes which types get which
   operations. Falsifiable, not yet falsified.
6. **The six faces are not used here.** This harness tests LINE/RING/SIX_PANEL/ROOM/GLYPH as
   *coordinate policies*. The six-face semantic naming from `room-core.js` is not in play,
   which is consistent with the protocol's warning to keep roles rebindable.

## AGAINST THE PROTOCOL'S OWN VERDICT

The protocol predicted the collapse would "substantially survive, but not in its original
smallest form." **HET12 supports that and sharpens it:**

- The **kernel holds**: identity, address, attention (multi-focus included), hierarchy,
  relation, clock, provenance, support, authority, evidence and exact RETURN all survive
  projection changes on heterogeneous material.
- The **boundary is now measured, not argued**: GLYPH is a *handle*, not an encoding; editing
  requires the projection that declares it; unsupported operations return `SUPPORT=0` with a
  reason rather than silently coercing.
- The **residue from spike 002 is reduced but not eliminated.** CONTENT, AUTHORITY and DEPTH
  now have explicit representations and survive. **TIME is the one still leaning on a
  capability (`SEEK`) rather than a coordinate that every projection can carry** — it passed,
  but by declaration rather than by derivation.

## RUN IT

```
python3 -m http.server 8099 --bind 127.0.0.1
# http://127.0.0.1:8099/spikes/003-het12-harness/
```

`window.HET12` exposes `run()`, `summarise()`, `canon()`, `attention()`, `supports()`,
`canonHash()`.
