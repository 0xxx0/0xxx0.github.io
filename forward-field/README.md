# Forward Field // Locus 1.0

A local-first semantic painting for real-world planning.

## Current laws

- Atlas and moving aperture are two projections over the same stable task IDs.
- Red = hard fact / commitment / return.
- Blue = forecast / proposal / derived relation.
- Mist = uncertainty in measured terrain.
- START → PAUSE → RESUME → FINISH learns duration cost only, not priority.
- PLACE creates a proposal; COMMIT is a separate human action.
- TAIL suggests same-bearing follow-ons that fit the current free horizon; it never commits them.
- ROOM is a boundary audit over the selected task, not a second task model.
- RETURN preserves a durable residue explicitly.

## 1.0 evolution rounds

1. **Convergence** — hard-edge Atlas + mobile moving aperture became one responsive projection model.
2. **Usefulness** — WHY NOW / FRICTION, same-context TAIL routing, event receipts, faster capture.
3. **Phone reality** — installable offline PWA, Android/Web Share Target capture, safe-area handling, swipe task traversal and vertical semantic depth.
4. **Restraint** — no inferred priority, no ambient animation, no auto-commit, no hidden cloud state.

## GrapheneOS

Open the GitHub Pages URL in Vanadium, then install/add it to the home screen. Once installed, text/URLs can be shared into Forward Field when the browser supports Web Share Target.
