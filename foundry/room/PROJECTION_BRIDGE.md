# ROOM — projection bridge 0.4.2 (candidate)

Date: 2026-10-20. Scope: `/foundry/room/` only. Separate branch; no landing-page, manifest, CURRENT, or routing changes.

## Hypothesis

The same executable DOM program becomes **more usable** when it can be read as a standard vertically scrolling document (**PLAIN**), inspected as a six-relation spatial object (**ROOM**), and physically transformed through the original horizontal cassette editor (**RAIL**) without copying, losing or reinterpreting its identity.

The semantic property is the six relations, not a spinning cube. No second canonical model.

## What was changed

- Existing `#program` is still the sole structural runtime: `details.block`, `rel=next` seams, FOLD/ENTER/DISSOLVE/RUN, SOURCE, RETURN, binding.
- Add `projection-bridge.js` (read-only derived ROOM view) and `projection-bridge.css` (PLAIN, ROOM, original RAIL layout).
- Initial view is **PLAIN** and initial focus is **intent**.
- View selector: PLAIN (read), RAIL (compose), ROOM (relations). PLAIN is a normal readable column with nested cassettes; RAIL retains the original horizontal program editor.
- ROOM has exactly six *derived* face readings for the currently focused block:
  - +Z PRESENT: held block / operator / type
  - −X INPUT: predecessor or containing cassette
  - +X OUTPUT: declared successor and a live type-match verdict
  - +Y INTENTION: containing cassette or program entry
  - −Y GROUND: actual VERIFY operator or explicitly absent evidence
  - −Z RETURN: RUN receipt or explicitly not run
- Physical axes and quarter-turn orientations are consistent: `+Y` ceiling uses `rotateX(-90deg)`, viewed with `+90deg` counter-rotation; `-Y` is its opposite.
- Face action **UNFOLD AT #id** switches to the real plain DOM, focused at the actual addressed node. No duplicate DOM object is edited.
- Keyboard in ROOM: left/right cycle; 1–6 faces; P plain. Other modes preserve existing navigation.

## Contracts / test

The bridge exports `window.RoomProjection` with `snapshot()`, `inspect()`, `audit()`, `roundTrip()`, `setView()`, `setFace()`.

Manual entry: `/foundry/room/?view=plain`, `?view=rail`, `?view=room`.

Non-destructive browser check: `/foundry/room/?projectiontest=1` invokes `roundTrip()` and prints PASS/FAIL for same DOM and focus after PLAIN → ROOM → RAIL → initial view. `audit()` checks unique block IDs, missing successor targets, and output/input type mismatches.

Additional human proof (NOT YET RUN):
1. Start PLAIN. Read the live intent/constraint and nested SEARCH/COMPILE/VERIFY sequence without horizontal scrolling on a 390px phone.
2. Focus `compiler`. Enter ROOM. Compare +Z present, -X input, +X output, +Y intention, -Y evidence, -Z return. Every reference must point to an actual node or say absent.
3. UNFOLD at VERIFY. Change the predicted/measured/tolerance inputs; run; inspect EVIDENCE and RETURN. ROOM should read the new result, not a stale placeholder.
4. Switch to RAIL, MARK two siblings, FOLD, run; switch PLAIN. Verify preserved child IDs, seams, trace and binding; DISSOLVE and compare original.
5. Use built-in `?selftest=1` only on disposable copies: existing 0.4 selftest mutates the program.
6. Inspect on a real Android device: reachable controls, no clipped text, visible room faces, motion-respect and keyboard accessibility.

## Known limitations / hold

- No real-device or browser screenshot test has been executed for this new branch. JS syntax was parsed at author time and exact index insertion verified. Treat as review candidate, **NOT a shipped usability PASS**.
- ROOM is a derived readonly reading of the same program, but it currently maps six relations to named faces; there is no literal cube-net ↔ flat-program morph, no face-based spatial docking, and no physical connector.
- Existing editor accepts loosely typed SOURCE markup and the RUN interpreter does not block every invalid seam. `audit()` reveals mismatches; enforcement remains a separate narrow repair.
- No actuation / HOUSE control, load-bearing claim, or material success.
- The old ROOM 0.1 six-route reader and the independent ROOM-0 held-object probe remain donors; neither replaces this composition engine.

## Promotion / kill criterion

Give one real task to both PLAIN and ROOM. Retain ROOM only if the six-sided traversal produces faster retrieval of INPUT/OUTPUT/PROOF/RETURN or fewer wrong hops than PLAIN after an interruption; otherwise keep the relation law and remove the extra geometry. Never claim benefit from aesthetics alone.

## Return / ownership

Branch owns only `foundry/room/index.html`, `foundry/room/projection-bridge.js`, `foundry/room/projection-bridge.css`, and this note. Hermes may independently work on the landing page. PR should remain draft until practical browser/mobile evidence and route/static checks pass.
