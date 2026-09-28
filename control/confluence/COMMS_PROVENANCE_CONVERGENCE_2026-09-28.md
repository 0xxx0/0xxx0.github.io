# COMMS PROVENANCE CONVERGENCE
## three classes of origin · a rejected vocabulary collapse · what was preserved instead

Date: 2026-09-28
Status: IMPLEMENTED (`/port/comms/` 0.1.3.0) + ONE DELIBERATE NON-CONVERGENCE

This concerns the existing COMMS SPINE, not a new framework. It records a real
convergence that landed and, more importantly, a convergence that was **refused**.

---

## 0. The two objects

**The COMMS SPINE** (`/port/comms/`) is a public instrument: one exact conversation
stays canonically addressable while signal extraction, human annotation, obligation
state, response coverage and RETURN become unequal projections beside it. Its standing
law is `DERIVED != HUMAN AUTHORED`.

**A private obligation ledger** (outside this repository) tracks inbound messages
classified as `NEED` / `CHECK` / `ESCALATION`, with an urgency axis and nag state.

Both describe *obligations*. Both use words like *ask*, *promise*, *waiting*. They
rhyme. That rhyme is exactly the hazard this shelf exists to prevent.

---

## 1. What converged

The spine modelled only two origins: a weak heuristic guess at one end and an authored
human mark at the other. Machine analysis at high confidence is **neither**, so it could
not cross the boundary without misrepresenting where it came from.

Resolved by adding a third class, ordered as follows:

~~~text
        DERIVED            MACHINE              HUMAN
        weak guess         agent claim          authored

   ─────────────────────────────────────────────────────────
   upper band,         lower band           full height
   dimmed

   LOCATE · TARGET     LOCATE ·             LOCATE · TARGET ·
                       CONFIRM · DISMISS    REMOVE MARK
   ─────────────────────────────────────────────────────────

        ← increasing provenance strength →  never silent in either direction
~~~

- `CONFIRM` promotes a `MACHINE` item to `HUMAN`. The machine suggested; the human
  now owns it.
- `DISMISS` retires it to `DROPPED`. Nothing is deleted.
- Neither action is reachable on a `HUMAN` or `DERIVED` item.

The three classes are separated by **geometry**, not colour, so the distinction
survives greyscale and colour-blindness. The law is now stated as:

> **DERIVED != MACHINE != HUMAN AUTHORED**
> and **MACHINE BECOMES HUMAN ONLY BY EXPLICIT CONFIRM**

The original spine law is preserved exactly; a class was added, not a meaning folded.

---

## 2. What was REFUSED

The obvious move was to translate the ledger's three obligation words directly onto the
spine's six — `NEED→ASK`, `CHECK→WAITING`, `ESCALATION→ASK`. It was built, then tested
against the target system's own derivation, and it **failed on execution**:

| probe | proposed | what the spine actually derives |
|---|---|---|
| `need more churu` | `ASK` | **no signal at all** — mapping would fabricate an ask |
| `Any update on the render job?` | `WAITING` | **`ASK`** — never `WAITING` |

The failure is structural, not lexical. The two systems derive from **different planes**:

~~~text
   SPINE      reads UTTERANCE TEXT      → regex over clauses, in the message
   LEDGER     reads MESSAGE INTENT      → classification + urgency, about the message

              same word, different plane
              ↓
              a 1:1 map does not translate; it LAUNDERS
~~~

The ledger also carries an **urgency axis** (a wants-attention-now item and a
whenever item are not the same thing). The spine has no field for it, so collapsing
both onto `ASK` would destroy an ordering that cannot be recovered afterwards.

**Corrected shape:** many-to-many, per-clause, two planes, with a per-edge
`lossy: true` marker and a mandatory sidecar carrying the intent, urgency, stakes and
identifiers — so nothing is lost *silently*. A bridge that is quiet about what it drops
is worse than no bridge.

The rhythm of "please don't do X" is the clearest case: the ledger reads it as a
*need*, the spine reads it as a *constraint*. Both are right. Neither is the other.

---

## 3. Why this belongs on this shelf

This is the confluence law applied to itself:

> **Do not collapse vocabularies merely because two projects rhyme.**

Two obligation systems rhymed. The cheap convergence was available and attractive. It
was tested rather than assumed, and it was refused. What ships instead is an **explicit
preserved relation**: the two systems remain unequal, the difference is recorded, and
the crossing — when it comes — carries its own losses in the open.

A convergence that erases the distinction that made each side useful is not a
convergence. It is a deletion with better manners.

---

## 4. Return paths

- `DERIVED != HUMAN AUTHORED` — standing spine law, preserved
- `DERIVED != MACHINE != HUMAN AUTHORED` — extended 2026-09-28
- the refused vocabulary map — preserved as a negative result, with its two
  executed counterexamples, so it is not re-proposed from the same rhyme
- pending non-convergence: the urgency axis is **not yet crossable**; it must either
  be carried explicitly or accepted as a stated loss, never dropped quietly

## 5. What is still unequal (do not unify)

- **Utterance-derived kinds vs intent-derived intents** — different planes; see §2.
- **`CHECK` vs `WAITING`** — the spine derives status questions as `ASK`; the ledger's
  `CHECK` is an obligation *state*, not an utterance kind. Arguable at the state plane,
  settled at the utterance plane.
- **DERIVED vs MACHINE** — the spine guessing about its own text is not the same act as
  an external agent reporting what it inferred. Same field, different trust.