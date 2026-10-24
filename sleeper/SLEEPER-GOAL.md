# SLEEPER — LONG-HORIZON GOAL (paste-ready)

**id:** SLEEPER-CONVERGE-01 · status: ACTIVE · authored 2026-10-24 (kestrel, subagent lane sleeper-conformance-2026-10-24) · contract: [`/sleeper/CONTRACT.md`](./CONTRACT.md)

## GOAL (paste this)

> **SLEEPER — converge sleeper and prove it in the world, or shrink it honestly.**
>
> Multi-session. Each session: ONE bounded move → RETURN → replan. A move counts only as a
> **consequence outside the control plane**: another human uses it, something physical happens, or a
> surface gets simpler. Receipts alone — this contract, this harness, green gates, new vocabulary —
> **do not count**.
>
> **Progress metric (the only one):** a human enters the painting on a phone and gets a
> **deterministic artifact back** — same phrase, same city, replayable from the artifact's own
> inputs in a fresh session. Counted by that person's own report plus two matching artifact shas.
> Nothing else moves the percentage.
>
> **Leverage (reuse only — no new cores, daemons, dashboards):**
> - `recovery/sleeper/site-source-2026-09-18/` frozen v2 source + its 21-test suite (the law)
> - `/sleeper/` native port — measured byte-identical to canonical (city grid sha `33fb1d0a…`, artifact sha `414046ce…`)
> - `/sleeper/one-return/` donor — playable loop + `sleeper.route-witness/v0.1` (evidence-only, by its own law)
> - `/sleeper/borrowed-river/` — replay-validating voyage validator (forged-leg rejection already tested)
> - `/sleeper/ladder/` — hash32 identity chain, recomposition, decode overlay, 34/34 selftest
> - `/sleeper/archive/` spine — 1138 inventoried rows → 201 unique sha256 → 24 published derivatives, ten-field order
> - `lib/sleeper-return-v2.js` — the shared v2 validator (accepts the canonical artifact, rejects forgeries by name)
> - `lib/moire-ambient.js` `hash32` (house hash — absorb, never fork); `/calls` (decision queue);
>   `showcase-manifest` + `fi-mutation-contract` (route stamping); `scripts/check-route-registration.mjs`
>
> **Phases (evidence-gated, not time-boxed):**
> 1. **P0 — decisions (human, parked in /calls).** (a) *Which single surface does the first human
>    enter — `/sleeper/` or `/sleeper/ladder/`?* (the one unlock). (b) Does the nine-gate donor stay
>    published as a labelled non-conforming predecessor, or become a redirect? (deletion is forbidden;
>    deprecation is the operator's call). (c) Which text becomes the city's districts when the
>    archive spine becomes substrate — the spine's own source shelf, `ONE_RETURN_V2.md`, or an
>    operator-chosen corpus?
> 2. **P1 — contract + conformance (DONE 2026-10-24).** `/sleeper/CONTRACT.md` +
>    `sleeper/conformance/conformance.mjs`, measured against the six live lineages.
>    Done-state already met: harness exits 0 on a fresh checkout; verdicts 2 CONFORMS / 2 PROJECTION /
>    2 NON-CONFORMING, every deviation carrying evidence.
> 3. **P2 — corpus-as-substrate.** The archive spine's source becomes the city's districts on ONE
>    lineage only (native port or ladder — never a fork). Drawn counts must assert against the real
>    source at render time (districts == paragraphs, buildings == sentences).
>    Done-state: a public URL **and** a blind reader locating one quoted line by walking.
> 4. **P3 — outside consequence.** One human, one phone, one phrase: enter, walk, return, receive the
>    v2 artifact, then replay it from a **fresh session** and get the identical city.
>    Done-state: that person's report + two identical artifact shas. **New fields LAST** — nothing
>    new lands before this.
> 5. **P4 — shrink-or-keep (human).** Keep as spine, or apply F1 and demote.
>
> **Falsifiers (kill/shrink):**
> - **F1** no second consumer of a v2 artifact within 2 moves after P1 → demote the contract to a note; stop calling it a spine.
> - **F2** 3 moves without an outside consequence → **STOP**; report the goal as "not proven", keep surfaces, write nothing new.
> - **F3** P2 fails the blind-reader test → shrink to "deterministic resolution ladder over one document"; drop all districts language.
> - **F4** any new field or route lands before P3 completes → revert it (new fields LAST, in writing).
> - **F5** a projection's identity chain breaks (e.g. ladder tag changes with unchanged painting bytes) → freeze that surface until re-proven.
> - **F6** operator withdraws the paintings or closes the goal → shrink to archive-only stewardship; no new builds.
>
> **Guards:** `recovery/` is read-only (frozen source of record); frozen shelves (`workfield-v1.2`
> etc.) are contracts with verifiers — never restructure them; no lineage is ever deleted to make a
> table smaller; published mismatches stay published and stay labelled; P0 decisions are human and
> are never machine-solved; per-move RETURN = RESULT / PRESERVED / EVIDENCE / OPEN / NEXT.

## Execution protocol

1. Read live control + this goal + the falsifiers.
2. Pick ONE move for the current phase with a plausible outside consequence.
3. Execute; verify; receipt.
4. Report RESULT / PRESERVED / EVIDENCE / OPEN / NEXT; if a falsifier fired, apply the shrink rule on the first line.
5. Replan. No automatic sequel — a second move needs a fresh decision.

## Counterarguments (strongest first, each with its cheap test)

1. **Nobody will ever walk it.** The loop has never had a consumer outside the control plane; every
   prior "done" was a receipt. *Cheap test:* P3 is exactly this — one human, one phone, one phrase.
   If P0(a) cannot be answered by the operator, F1 fires and this becomes a note.
2. **It is a museum of six surfaces, not a system.** Conformance proves shared *law*, not shared
   *purpose*; convergence can be vocabulary only. *Cheap test:* P2 must make one surface simpler or
   delete one real duplication (e.g. donor route becomes a labelled redirect, or a v2 import seam is
   actually wired). If nothing simplifies, F2 fires.
3. **The thesis — painting and city are the same object at different resolutions — is asserted, not
   proven.** The ladder proves determinism, not that claim. *Cheap test:* a person who did not build
   it must retell FAR → NEAR → ENTERED → EXITED in their own words after five minutes. Failure shrinks
   the claim to "deterministic resolution ladder" (F3).
4. **Corpus-as-substrate becomes text soup.** The design spec names this failure itself. *Cheap test:*
   before wiring, the drawn-district count must equal the source's paragraph count at render time, and
   the blind-reader test must pass. No prose exemptions.
5. **Hash-derived marks drift into decoration** (measured-not-seeded law). *Cheap test:* every new mark
   in P2 names its measured field in the decode overlay; a mark that cannot is deleted, not prettified.
6. **The outside consequence needs the operator's actual leisure time and cannot be engineered.**
   True — which is why P0 is human and F1/F2 are honest rather than optimistic. *Cheap test:* if P0(a)
   sits unanswered across two sessions, that *is* the answer.
7. **It duplicates other return consumers** (`/interphase/`, field returns). *Cheap test:* who reads a
   `sleeper.one-return` v2 artifact today? Measured 2026-10-24: `lib/sleeper-return-v2.js` validates
   it, the smoke tools check it, and the native port emits it — but the donor **refuses** it and no
   second human-facing consumer exists. If nothing outside `/sleeper/` consumes it after P1, F1 is
   already half-fired — say so rather than building another reader.

**Honest pro-side:** the law is finally measured instead of claimed — two independent lineages now
produce byte-identical cities and artifacts from one phrase, the projections are named, and the
mismatches are published rather than smoothed. That is the first moment a human outside this repo can
be handed one URL and get a deterministic object back. It deserves exactly one outside-consequence
test before anyone builds more; if that test fails, the honest result is a smaller Sleeper, not a
bigger one.

## Machine companion

See `SLEEPER-GOAL.json` (schema `0xxx0/hermes-long-goals/v0.1`) beside this file.
