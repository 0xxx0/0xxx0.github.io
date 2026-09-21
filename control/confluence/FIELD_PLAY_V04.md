# FIELD / PLAY 0.4 — PUBLIC MISSION LOOP

Status: **DESIGN CANDIDATE / IMPLEMENTABLE NEXT**

Purpose: make FIELD / PLAY usable by a first-time visitor who has no knowledge of FIELD, GitHub, the repository, current heads, route states, or internal vocabulary.

The visitor experience must answer four questions, in order:

1. **What am I being asked to do?**
2. **How do I know when I am done?**
3. **How do I submit only the evidence that matters?**
4. **What happens to my submission next?**

Everything else is progressive disclosure.

---

## 0.4 NORTH STAR

> One understandable mission → one bounded attempt → one bounded evidence packet → one visible receipt → one explicit review outcome.

FIELD / PLAY is not a backlog browser and not a contributor dashboard.

The public surface is a **mission player**.

The repository remains downstream implementation/provenance infrastructure.

---

## 1. VISITOR FLOW

### A. MISSION

Default screen shows one mission only.

No repo path, lifecycle state, route kind, FIELD operation, issue number, or internal status above the fold.

#### Hero

**HELP US TEST WHETHER THIS MAP IS ACTUALLY USEFUL**

> Try the same small task in two views. Tell us which one let you find the answer faster and what confused you.

Badges:

- `TEST · ~10 MIN`
- `NO INSTALL`
- `PUBLIC-SAFE`

Primary action:

**START MISSION**

Secondary:

**SHOW ME ANOTHER**

#### The four things visible before START

**WHY**
One plain sentence describing why the task matters.

**DO**
Maximum three human actions.

**DONE WHEN**
A concrete evidence condition.

**DO NOT**
One compact boundary box.

Example:

> Do not edit the repository, send messages, install software, or include personal/private information.

A visitor must be able to decide whether to participate from this screen alone.

---

### B. DO

After START, the surface enters ACTIVE state and stops behaving like a mission roulette.

Show:

`MISSION 7F3A · ACTIVE`

Then a maximum three-step checklist:

1. Open the test.
2. Perform the named task.
3. Return here with the result.

Persistent side/bottom card:

**WHAT COUNTS AS EVIDENCE**

Examples should be task-specific:

- “I found X in View A in 18 s and View B in 31 s.”
- “This link returned a 404.”
- “The label said X but I expected Y.”
- screenshot optional, not required unless mission contract says so.

Always provide:

**I CAN'T COMPLETE THIS**

This is a valid PARTIAL/FAIL return, not abandonment.

---

### C. RETURN

Replace the current generic JSON-oriented form with a human form.

#### 1. RESULT

Choose one:

- **WORKED**
- **PARTLY WORKED**
- **DID NOT WORK**
- **COULD NOT TEST**

These map internally to PASS / PARTIAL / FAIL / UNTESTED.

#### 2. WHAT HAPPENED?

One required short field.

Prompt is generated from mission contract, e.g.:

> Which view helped more, and what made the difference?

Hard limit: 600 characters.

#### 3. EVIDENCE

Mission declares which evidence kinds are allowed.

v0.4 initial set:

- `TEXT`
- `URL`
- `SCREENSHOT` (optional backend upload only)
- `MEASUREMENT`

Do not expose arbitrary file upload in the first public version.

Evidence list is bounded:

- maximum 3 items
- every item gets a type
- every item gets optional caption
- URLs validated
- images stripped of EXIF before durable storage

#### 4. RESIDUE

Optional:

> What still seems wrong, unclear, or worth trying next?

Hard limit: 400 characters.

#### 5. ATTRIBUTION

Explicit choice:

- **Anonymous**
- **Credit me as:** `name / handle`

No account required for attribution.

#### 6. VISIBILITY

Explicit choice:

- **Evidence may be shown publicly**
- **Use this only for review**

Mission deck is public-safe, but visitor-provided text can still accidentally contain personal information. Default should be **review-only**.

Primary action:

**SUBMIT RETURN**

Secondary:

**SAVE / COPY RECEIPT**

Copy remains the offline/manual fallback.

---

## 2. RETURN INBOX

The next version needs one very narrow write boundary.

### Endpoint

`POST /api/field-return`

It accepts only:

`field-game-return/v0.2`

No generic messages.
No arbitrary commands.
No repo writes.
No issue creation from the browser.
No agent invocation.

### Request

```json
{
  "schema": "field-game-return/v0.2",
  "mission_id": "mission:representation-01:compare-two-views",
  "mission_revision": "2026-09-21.1",
  "result": "PARTIAL",
  "answer": "View A was easier because the address stayed visible.",
  "evidence": [
    {
      "kind": "URL",
      "value": "https://example.test/result",
      "caption": "The failing state"
    }
  ],
  "residue": "The mobile label still wrapped.",
  "attribution": {
    "mode": "ANONYMOUS"
  },
  "visibility": "REVIEW_ONLY",
  "client_receipt_id": "local-opaque-id"
}
```

### Server response

```json
{
  "schema": "field-game-return-ack/v0.1",
  "return_id": "RET-7K4Q2",
  "status": "RECEIVED",
  "status_token": "<opaque unguessable token>",
  "status_url": "/field-play.html#return=RET-7K4Q2.<token>"
}
```

The server validates structure and size only.

It does **not** decide whether evidence is true, useful, sufficient, or accepted.

---

## 3. WHAT HAPPENS NEXT

Immediately after submission, the whole interface becomes a receipt/status screen.

### Receipt screen

# RETURN RECEIVED

`RET-7K4Q2`

> Your evidence is now waiting for review. Nothing else will run automatically.

Show the exact lifecycle:

```
✓ RECEIVED
○ REVIEW
○ OUTCOME
○ INTEGRATION
```

Then plain language:

**RECEIVED**
We have the packet.

**REVIEW**
A human or bounded reviewer checks whether it answers the mission without exceeding scope.

**OUTCOME**
One of:

- **ACCEPTED** — evidence answers the mission.
- **NEEDS MORE** — useful but one named thing is missing.
- **PARKED** — valid evidence; no current action warranted.
- **NOT USED** — does not support the mission or violates its evidence contract.

**INTEGRATION**
If the evidence changes FIELD, the status page links to the public receipt/change that resulted.

No promise that every accepted return becomes a repository mutation.

---

## 4. STATUS PAGE

Same FIELD / PLAY route, keyed by opaque return token.

Example:

`/field-play.html#return=RET-7K4Q2.<token>`

A visitor can bookmark this.

### ACCEPTED example

# YOUR RETURN CHANGED THE FIELD

**Accepted**
Your browser test reproduced the mobile overflow.

**What changed**
Scale Lens importer wrapper was corrected.

**Evidence used**
1 of 2 submitted items.

**Durable result**
`Scale Lens RC11.2 · mobile-importer-wrap-2`

Button:

**SEE THE CHANGE**

Then:

> This mission is complete. You are not automatically assigned another one.

Optional:

**PLAY ANOTHER**

### NEEDS MORE example

# ONE THING IS MISSING

> We can reproduce the behavior, but we cannot tell which browser width caused it.

**ONE FOLLOW-UP**
What was the viewport width?

This must be one named question, not an open-ended conversation.

---

## 5. MISSION CONTRACT v0.2

Internal mission objects need a public presentation layer rather than exposing manifest gaps verbatim.

```json
{
  "schema": "field-game-mission/v0.2",
  "id": "mission:representation-01:compare-two-views",
  "revision": "2026-09-21.1",
  "public": {
    "title": "WHICH VIEW HELPS YOU FIND IT FASTER?",
    "why": "We are testing whether a visual projection improves retrieval rather than merely looking interesting.",
    "time_band": "5–10 min",
    "requirements": ["modern browser"],
    "steps": [
      "Open the comparison.",
      "Find the named item in both views.",
      "Return which view helped and why."
    ],
    "done_when": "You report both outcomes and one concrete difference.",
    "do_not": [
      "Do not edit source files.",
      "Do not include private information."
    ]
  },
  "evidence_contract": {
    "result_required": true,
    "answer_prompt": "Which view helped more, and what made the difference?",
    "answer_max_chars": 600,
    "allowed_evidence": ["TEXT", "URL", "MEASUREMENT", "SCREENSHOT"],
    "max_evidence_items": 3,
    "residue_max_chars": 400
  },
  "source": {
    "kind": "GITHUB_ISSUE",
    "ref": 10,
    "target": "/lens-proof/"
  },
  "authority": "REPORT_ONLY"
}
```

The `source` block belongs under **TECHNICAL DETAILS**, collapsed by default.

---

## 6. MISSION AUTHORING

Current automatic derivation from manifest gaps is useful for discovery but not sufficient for public missions.

A public mission needs a deliberate translation step.

### Internal gap

> `FABRICATION / CANDIDATE / geometry-toolpath adapter`

### Public mission

> **CAN THIS SHAPE SURVIVE A REAL PRINT?**
>
> Export one provided geometry, print it at the specified scale, and tell us whether the key dimensions remain legible.

Therefore:

`GAP → CANDIDATE MISSION → PUBLIC MISSION`

not:

`GAP → PUBLIC COPY`

Only mission records with `public.status = READY` enter the visitor deck.

This keeps the game understandable and prevents accidentally outsourcing under-specified architecture work.

---

## 7. MISSION TYPES

Do not expose FIELD's internal operation taxonomy as the main choice.

Use four visitor-readable classes:

### TEST
Try something and report what happened.

Internal donors: VERIFY / PROOF_REQUIRED / HUMAN_EVIDENCE_REQUIRED.

### FIND
Locate an exact artifact/source/fact under a bounded search contract.

Internal donors: RECOVER.

### MAKE
Produce one bounded artifact from a supplied specification.

Internal donors: selected BRIDGE / IMPLEMENT gaps only.

### COMPARE
Use two lawful alternatives and return a discriminating observation.

Internal donors: projection/lens/ablation experiments.

These classes can retain small glyph differences without becoming another menu hierarchy.

---

## 8. GAME LAYER

The game should reward **closure**, not volume.

Avoid:

- XP for submissions
- leaderboards by count
- streak pressure
- random mission completion badges detached from evidence quality

Useful playful signals:

### FIELD MARKS

A completed reviewed mission yields one mark with its real outcome:

`TEST / ACCEPTED`
`FIND / PARKED`
`MAKE / INTEGRATED`

A contributor's local collection becomes a small constellation of actual transformations.

### WORLD CHANGE

The strongest reward is:

> **YOUR RETURN CHANGED THIS**

with a link to the resulting public artifact/receipt.

### UNSOLVED EDGES

Visitors can see how many bounded missions remain in each public class, but not a giant backlog.

Example:

`TEST 4 · FIND 2 · MAKE 1 · COMPARE 3`

---

## 9. SAFETY / AUTHORITY

Public FIELD / PLAY must never generate missions requiring:

- account credentials
- access to private files
- health/medical judgment
- messaging other people
- purchases
- physical danger
- home/device access
- security testing outside explicitly provided safe fixtures
- repository write access as a prerequisite

Submission must reject secrets/private tokens heuristically and warn before sending.

Visitor evidence is **observation**, not authority.

Review is required before:

- changing mission truth
- changing route state
- closing a proof gate
- creating downstream work
- publishing visitor evidence

---

## 10. IMPLEMENTATION CUT

### v0.4A — public mission player

Ship first:

- mission v0.2 schema
- 3–5 hand-authored public missions derived from current play-safe gaps/issues
- UNDERSTAND → DO → RETURN state machine
- technical details collapsed
- bounded evidence form
- local draft persistence
- offline COPY RETURN fallback
- post-submit receipt UI mocked against fixture responses

This can be fully static and validates the UX.

### v0.4B — RETURN INBOX

Then add the narrow write boundary:

- `POST /api/field-return`
- schema validation
- rate limit / abuse protection
- opaque receipt token
- status read endpoint
- review queue
- no automatic repo mutation

### v0.4C — consequence bridge

After the inbox proves useful:

- accepted return can reference a durable repo receipt / issue / commit
- status page projects that consequence back to visitor
- no automatic next mission

---

## 11. ACCEPTANCE TEST

A fresh visitor who has never heard of FIELD should be able to answer these after 30 seconds:

1. What is this mission asking me to do?
2. What am I not allowed/expected to do?
3. What counts as completion?
4. How do I submit evidence?
5. What will happen after I submit?

Then they should be able to complete one TEST mission without seeing a repository path or internal FIELD state unless they deliberately open **TECHNICAL DETAILS**.

### Success criterion

At least 3 first-time users can complete one mission and correctly predict the review lifecycle without verbal explanation from us.

---

## DESIGN LAW

**THE VISITOR PLAYS THE MISSION. FIELD PLAYS THE PROVENANCE.**

Public interaction stays plain.

Identity, authority, lineage, issue linkage, route state and durable RETURN remain underneath.
