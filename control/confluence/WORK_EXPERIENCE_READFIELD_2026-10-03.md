# WORK EXPERIENCE / READFIELD / PHONE

**Date:** 2026-10-03  
**Status:** RECOVERED CURRENT STATE + CONVERGENCE CONTRACT  
**Scope:** existing FIELD / READFIELD / LISTEN / LIVE / LOCI / INTERPHASE surfaces. No new app, store, ontology, authority layer, or route is proposed here.

## 0. Why this exists

User observation on phone: several controls/surfaces now *kind of work*, but the practical job and consequence are still too easy to miss.

This note recovers what is actually present, separates it from proposed work, and defines a smaller work-experience contract.

The central correction is:

> **Do not present mechanisms as products. Present a held object + a job + a visible consequence + RETURN.**

A ring, aperture, mode, lens, pulse, glyph or projection is useful only when it changes what the person can do with the currently held object.

---

## 1. OBSERVED / EXACT CURRENT STATE

### READFIELD 0.8.5 · Phone Work

Current `/docs/` already implements a real one-source work surface:

- one canonical source + one addressed cursor;
- PLAIN / FOCUS / MIN projections;
- RSVP across unequal scales;
- ORP-style fixed recognition point;
- punctuation-aware dwell;
- VOICE using the same source cursor;
- source-local marks / next-mark navigation;
- local file and pasted-text intake;
- RAW/source return;
- exact caller RETURN;
- optional FIELD PULSE clock borrowing;
- a phone-sticky WORK rail:
  - FAST
  - REVIEW
  - PULSE
  - VOICE
  - LOCI
  - REPO
- explicit use-case cards and workflow chains.

The modes are already more than labels:

- **FAST** → PLAIN + 900 WPM + RSVP running;
- **REVIEW** → FOCUS + SENTENCE + 300 WPM + stopped;
- **PULSE** → ×4 borrowed tempo when a lawful transport exists;
- **VOICE** → speech at the same cursor;
- **LOCI** → bounded source/focus handoff to the existing LOCI course;
- **REPO** → operational reading of CURRENT.

This is the strongest current proof of a general FIELD work law: **same object, unequal jobs, preserved address**.

### LISTEN 0.5

Current `/fold-bloom/listen/` is no longer merely a waveform/ring visualizer. It is an addressed-stream host:

`SOURCE → ADDRESS → APERTURE → PROJECTION → ANNOTATION → RETURN`

It currently supports:

- local audio as canonical authority path;
- best-effort Suno/direct-address resolution;
- immediate PREVIEW then deeper analysis;
- BEAT / PHRASE / SECTION / TRACK aperture;
- polar + relative address scrubbing;
- source-bound BOOKMARK / FLAG / ARC annotations;
- IDLE witnessing without authorship;
- deterministic source glyph;
- AUDIO MAP + addressed-message export;
- FIELD PULSE publication;
- READ LYRICS / RSVP handoff;
- LIVE/DRIVE landmark transfer for the same source;
- Beat Saber event-tape/export machinery in the current runtime.

### FIELD PULSE

`/lib/field-pulse.js` is the existing bounded cross-surface seam. LISTEN and LAB can lend clocks; READFIELD, LIVE/DRIVE and TWO DIAL can consume context without inheriting source authorship.

Law already recovered and still correct:

> **borrowed clock != borrowed authorship**

### INTERPHASE

Do not make a universal shell around these surfaces. INTERPHASE already provides the right smaller host law:

`OBJECT → ADDRESS → RELATIONS → OPERATORS → CONSEQUENCE → RETURN`

The missing work is mostly **projection and affordance quality**, not canonical state.

---

## 2. RESEARCH SIGNAL / WHY RSVP SHOULD REMAIN A MODE

External reading research does **not** support treating high-speed RSVP as a universal replacement for ordinary reading.

Relevant evidence:

- Acklin & Papesh, *Modern Speed-Reading Apps Do Not Foster Reading Comprehension* (2017): static reading outperformed 700/1000 WPM RSVP on comprehension. https://pubmed.ncbi.nlm.nih.gov/29461715/
- Schotter et al., *Don't believe what you read (only once)* (2014): removing natural regressions harmed comprehension. https://pubmed.ncbi.nlm.nih.gov/24747167/
- Gannon et al., *RSVP Reading on a Smart Watch* (2016): RSVP can be viable on constrained screens, but traditional reading was strongly preferred as a primary mode. https://journals.sagepub.com/doi/10.1177/1541931213601265
- Ishimori & Kiritani (2024) likewise report comfort/understanding trade-offs around RSVP versus ordinary horizontal reading. https://www.jstage.jst.go.jp/article/jssd/71/0/71_46/_article/-char/en

This reinforces the current READFIELD direction:

**FAST RSVP → detect friction → REVIEW / regress / mark → optionally resume FAST.**

The regression path is not an accessory. It is a comprehension mechanism.

---

## 3. THE WORK EXPERIENCE LAW

A useful FIELD work surface should expose only:

1. **HELD OBJECT** — what source/state am I actually acting on?
2. **JOB** — what am I trying to accomplish with it now?
3. **OPERATION** — the 1–3 lawful moves that matter for that job.
4. **VISIBLE CONSEQUENCE** — what changed, immediately?
5. **WITNESS / MARK** — what should survive the moment?
6. **RETURN** — how do I get back to the same object/address or caller?

Everything else is support machinery.

### Phone-specific corollary

A phone is not a shrunken desktop control room. It is a **serial work instrument**.

At any moment the UI should answer, without interpretation:

> **What am I holding? What job am I in? What happens if I touch this?**

Controls whose consequences are unavailable must expose the missing condition, not merely appear inert.

Examples:

- `PULSE` with no clock → **PULSE WAIT · OPEN/START LISTEN OR LAB**
- `VOICE` unavailable → **VOICE UNAVAILABLE ON THIS DEVICE/CONTEXT**
- `LOCI` without text → **NEEDS TEXT SOURCE**
- remote Suno blocked → **ADDRESS KEPT · LOAD LOCAL AUDIO**

---

## 4. READFIELD USE CASES — EXPANDED WITHOUT ADDING MODES

These are **recipes over the existing six jobs**, not new sovereign modes.

### A. CHAT / THREAD CATCH-UP

**Job:** regain state across long chat/export/log material.

`FAST 900 → MARK surprising/decision-bearing lines → REVIEW difficult paragraph → NEXT MARK → RETURN`

Why it matters: RSVP is useful for coverage; marks and REVIEW preserve regressions and decision points.

### B. REPO / CURRENT TRIAGE

**Job:** orient to CURRENT / RETURNs / contracts / JSON without turning the control plane into a backlog UI.

`REPO → FOCUS sentence/branch → MARK unresolved claim → RAW/XREF as needed → RETURN`

Best target material:

- CURRENT current_heads;
- RETURN receipts;
- release contracts;
- small JSON state records;
- exact recovered source notes.

### C. CODE / DIFF / CONTRACT REVIEW

**Job:** inspect dense material where speed is subordinate to exactness.

`REVIEW → SENTENCE/PHRASE → regress freely → MARK defect/question → optionally VOICE for awkward prose → RETURN`

Do **not** force RSVP while the user is resolving syntax or cross-reference structure.

### D. LYRICS / CADENCE / MUSIC STUDY

**Job:** perceive text against an external temporal field without pretending timing metadata is authorship.

`LISTEN source → READ LYRICS → PULSE ×2/×4/×8 → VOICE or eyes-only → MARK phrase → RETURN`

Good for:

- lyric revision;
- phonetic pleasure / hook work;
- multilingual cadence;
- speech/song scansion;
- reading a transcript alongside music;
- comparing textual phrase structure with musical phrase witnesses.

### E. LANGUAGE / PRONUNCIATION

**Job:** keep visual focus, speech and source position aligned.

`REVIEW → PHRASE/WORD → VOICE → replay/regress → MARK hard item → LOCI if worth rehearsal`

The important invariant is **one cursor**, not speech quality theater.

### F. MEMORY / PROCEDURE REHEARSAL

**Job:** turn selected source positions into a rehearsal path without copying the whole document into another authority.

`READ / REVIEW → MARK key positions → LOCI at the current address → rehearse → RETURN`

Potential material:

- technical procedures;
- checklists;
- vocabulary;
- names;
- short speeches;
- physical build sequences;
- movement/training cues.

### G. RESEARCH SOURCE HARVEST

**Job:** move quickly through a source while preserving exact evidence-bearing locations.

`FAST → MARK claims → REVIEW surrounding context → XREF/RAW → NEXT MARK → RETURN`

This is closer to an evidence instrument than a speed-reader.

### H. FATIGUE / LOW-ATTENTION READING

**Job:** reduce eye-search and page-navigation burden temporarily.

Use slower RSVP/VOICE, short sessions and easy regressions. Do not present FAST as inherently superior.

### I. PHONE / WATCH CONTINUITY

The portable object is:

`source identity + cursor + scale + pace + mark/return witness`

A watch need not reproduce READFIELD. It can project only the current unit + pause/back/mark, then RETURN the cursor to phone. This is a later device projection, not a second reader architecture.

---

## 5. CROSS-SURFACE RECIPES

### READ → LISTEN → READ

A source passage can become a musical/cadence exploration, but source text authority remains READFIELD.

Useful bounded transfer:

- current source identity/address;
- selected text excerpt;
- optional mark label;
- RETURN path.

LISTEN may lend clock/features back; it must not rewrite the source cursor history.

### LISTEN → READFIELD

Already partially implemented and should remain the preferred lyrics/transcript seam.

Transfer:

- recovered text only if available;
- source identity/provenance;
- explicit `UNALIGNED` timing status unless genuine alignment exists;
- optional tempo snapshot / live FIELD PULSE;
- exact RETURN to LISTEN address.

### READFIELD → LOCI

Already implemented as a bounded handoff. Future improvements should preserve a set of selected marks, not duplicate the whole source corpus.

### READFIELD ↔ AXIAL / FOCUS

AXIAL geometry is useful only insofar as it answers a concrete focus question: whole/source position, structural neighborhood, lawful scale change, or branch relation. It should stay a projection of the same cursor and recede in PLAIN/FAST mode.

### READFIELD ↔ FOLD//BLOOM / TWO DIAL

Potential composition seam:

- addressed text phrase supplies **material**, not clock;
- LISTEN/PULSE may supply **clock**, not authorship;
- TWO DIAL supplies **transform grammar**;
- output receives a new identity + provenance back to the source span;
- RETURN restores the original text address.

This is a lawful composition chain only when the transformed object is explicitly new. Do not pretend the source text itself was mutated.

---

## 6. UI / USABILITY DELTAS WORTH BUILDING NEXT

### 6.1 State-aware job buttons — highest value

The six WORK buttons should state whether the operation is immediately live:

- FAST · READY/RUNNING
- REVIEW · READY
- PULSE · LIVE 112 BPM / WAIT
- VOICE · READY / UNAVAILABLE
- LOCI · READY / NEEDS TEXT
- REPO · READY

A mode that cannot produce consequence should explain why in the same tap.

### 6.2 FAST ↔ REVIEW should feel like one reversible gesture

Current mechanics already preserve the cursor. Make that transition the primary mental model:

`FAST → friction → REVIEW → resolved → FAST`

Do not add a separate comprehension subsystem.

### 6.3 The sticky phone rail should show consequence, not only mode name

For the current job, keep one terse status line:

`FAST · WORD · 42% · 900 WPM · RUNNING`

or

`PULSE WAIT · NO CLOCK · OPEN LISTEN`

### 6.4 Marks are first-class work residue

Surface count + next-mark access during every mode. A mark is not a note-taking app; it is **addressed re-entry evidence**.

### 6.5 Cross-app handoffs should be one-tap recipes

Avoid “integration settings.” Prefer verbs:

- LISTEN → READ LYRICS
- READ → LOCI
- READ → PULSE
- MARK → NEXT
- RETURN

### 6.6 Reduced mobile chrome

On narrow screens, use the current source/job/action status as the persistent layer. Put source shelves, explanations and configuration behind deliberate reveals. Do not make the ring or geometry compete with the reading object.

---

## 7. HIGH-VALUE EXPERIMENTS / NOT YET CLAIMED

### Adaptive dwell beyond punctuation

Current APERTURE already lengthens punctuation dwell. A later bounded trial could compare:

- fixed WPM;
- existing punctuation-aware dwell;
- punctuation + word-length / linguistic-complexity delay.

Recent adaptive-RSVP work continues to explore linguistic delay, but do not assume benefit without our own comprehension/comfort evidence.

### Regressive RSVP

A particularly strong direction for phone/watch use is a **single back gesture that rewinds to the previous semantic unit**, not merely one token. Prior RSVP/watch research suggests interruption/recovery is a central failure mode. The useful design question is not “how fast can we display?” but “how cheaply can the user recover after attention breaks?”

### Work recipes as portable policies

A job recipe may eventually be a tiny, non-authoritative descriptor:

```json
{
  "job": "CATCH_UP",
  "projection": "PLAIN",
  "scale": "WORD",
  "pace": 900,
  "on_friction": "REVIEW_SENTENCE",
  "residue": "MARK",
  "return": "SOURCE_CURSOR"
}
```

This is a candidate interface policy, **not canonical user state** and not justification for a new registry.

---

## 8. NEXT BOUNDED IMPLEMENTATION

**READFIELD Phone Work 0.8.6 — consequence-legibility pass**

Change only existing `/docs/` behavior/presentation:

1. make WORK buttons state-aware (`LIVE / WAIT / READY / RUNNING`);
2. make PULSE failure actionable instead of inert;
3. make FAST ↔ REVIEW the obvious reversible pair;
4. keep MARK count/next-mark reachable in the phone work layer;
5. preserve current source/cursor/RETURN/authority exactly;
6. no new route, store, mode, ontology or universal shell.

### Verification

Machine-verifiable:

- FAST starts RSVP at the current cursor and 900 WPM;
- REVIEW stops and lands on SENTENCE around the same cursor;
- switching FAST→REVIEW→FAST preserves source progress within the existing cursor law;
- PULSE without a lawful clock visibly reports WAIT and does not alter text authority;
- PULSE with a lawful clock reports source/BPM and changes pace only;
- marks remain source-bound across job changes;
- phone viewport keeps the current job + consequence reachable without hiding the reading object;
- RETURN remains exact.

Human/device claim left open:

- whether the revised rail *feels* materially clearer/faster on the actual phone.

---

## 9. COMPRESSION

The larger vision is not “more interfaces.”

It is:

> **one addressed object can move through reading, listening, reviewing, remembering, composing and playing without losing identity or forcing the human to reconstruct context.**

READFIELD is currently the cleanest proof because the object is obvious: one text source, one cursor. LISTEN proves the same law for time-addressed audio. The next convergence step is to make the *job and consequence* as obvious as the address.
