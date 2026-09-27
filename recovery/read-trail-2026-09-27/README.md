# READ TRAIL donor recovery — 2026-09-27

Source: PR #461 `fix/readfield-lab-focus-usability`.

Disposition: **FROZEN DONOR / NOT CURRENT AUTHORITY**.

Recovered exactly:
- `lib/read-trail.js` — `field-source-trail/v0.1`
- `tools/read-trail-selftest.cjs`
- the branch's convergence handoff

The kernel's hard law is retained verbatim:

> VISITED / MARKED records human traversal evidence only; it never means read, understood, agreed, verified or complete.

Why only this residue was promoted:
- current `master` already has newer descendants of READFIELD, READ/RIDE, LAB, REPLAY, read-course and Change Calculus;
- PR #464 landed the overlapping object-at-center / MARK UI repair and passed current CI;
- wholesale PR #461 is therefore not a lawful current delta;
- the source-trail kernel and its selftest were the branch-only executable mechanism not present on current master.

Do not copy the old integration wholesale. A future adoption must start from current master and explicitly solve local mark-store migration/privacy/re-entry semantics.
