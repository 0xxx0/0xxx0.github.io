# FOLD//BLOOM — PRODUCT / WORKFLOW ROADMAP
## 2026-09-25 successor · useful doors before more machinery

**Status:** current successor note; preserves the 2026-09-22 execution roadmap as historical design state.

## Current recovered head

FOLD//BLOOM is no longer just the ring or the visualizer. The current family already contains:

- **LISTEN 0.6** — local/source-aware audio map, beat/phrase/section/track scope, BOOKMARK / FLAG / editable ARC marks, source-local memory, source-safe annotation share/import, Beat Saber v4 mapper-pack export.
- **LIVE 0.13** — source-aware ride / embodied terrain with authored FOLD / BLOOM / SPLIT / RETURN.
- **READFIELD / RSVP 0.8.2** — exact source cursor across scale, RSVP, voice, regress, context and RETURN.
- **FIELD LAB 0.2.1** — RIDE / PULSE / READ / LOCI / INK / DATA with explicit source/focus carry.
- **FIELD PULSE** — ephemeral same-origin timing/focus/operation bridge. Authority NONE.
- **TWO DIAL 0.10.3** — composition engine that may borrow timing while keeping harmony/form authorship.
- **SET 0.1.1** — ordered source/seam authorship.
- **VOICE 0.1** and **INK 0.2** — bounded practice projections.
- **Beat Saber export** — generated mapper/test pack, distinct from **FOLD//BLOOM SABER 0.1**, whose dual-phone runtime is implemented and waiting on two-real-phone evidence.
- **REPLAY 0.2** — LISTEN-linked expressive message score with exact addressed interval, word-level cue/hold/emphasis shaping, existing experience controls, compact self-contained share links, JSON authority and visual WebM export.

The limiting factor is now **experience coherence and lived reuse**, not missing architecture.

## Product law for the next passes

A person should start from a job, not from our ontology.

**JOB → SOURCE → ADDRESS → PROJECTION → ACTION → RETURN**

The public family should expose concrete jobs first. Deep engines remain unequal and inspectable.

## Primary use cases

### 1. READ / WORK — move quickly through long text without losing place

Use READFIELD when the object is a document, note, thread, repo file, transcript or pasted long text.

What it adds beyond ordinary scrolling:

- one canonical source cursor across WORD / PHRASE / SENTENCE / PARAGRAPH / SECTION;
- RSVP pace without replacing the source;
- exact regress / resume;
- VOICE and visual focus on the same cursor;
- addressed URL/RETURN for repository sources;
- optional PULSE pacing.

The valuable transfer from Fold/Bloom is not “make text musical.” It is **keep one addressed object while changing how attention moves through it**.

### 2. READ × RHYTHM — use pulse as an attention scaffold

FIELD LAB PULSE or LISTEN may lend BPM/phase to READFIELD.

- PULSE ×4 maps BPM to WPM.
- The clock is optional.
- The clock never owns text position, meaning or annotation.
- Stop pulse and READFIELD remains complete.

Use for repetitive review, memorization, cadence experiments, timed passages, or alternating listen/read sessions.

### 3. LISTEN / MARK — turn a track into an addressable working surface

Use LISTEN to:

- map local audio;
- move BEAT ↔ PHRASE ↔ SECTION ↔ TRACK;
- BOOKMARK a point;
- FLAG a point with explicit human intent;
- ARC a bounded span;
- share marks while retaining source identity and not exporting source bytes.

This is useful for production notes, choreography cues, lyric/transcript alignment, rehearsal, “show me this drop,” and downstream game/event-tape authoring.

### 4. RIDE / PLAY — embody source structure

LIVE converts the same mapped source into traversable terrain and event timing.

Use when the goal is bodily perception, play, groove, section contrast, or making structure felt rather than inspected.

Measured events may constrain timing. FOLD/BLOOM/SPLIT/RETURN remain authored operations.

### 5. READ → LOCI — spatial memory without losing source address

Carry the same text and focus from READ into LOCI.

Use for:

- speeches;
- poetry;
- dense conceptual passages;
- ordered lists;
- revision;
- source-position recall.

The course is a projection over the source, not a replacement text.

### 6. PULSE → COMPOSE / VOICE / RIDE

One bounded pulse can coordinate several unequal activities:

- **READ** — pace;
- **RIDE** — beat/phase witness;
- **TWO DIAL** — tempo/energy context;
- **VOICE** — practice timing.

This is the first genuinely cross-app Fold/Bloom capability. Do not replace it with a larger universal bus.

## Next three fronts

### FRONT 1 — TASK-FIRST DOORWAY · SHIP NOW

- surface concrete use cases on `/fold-bloom/`;
- deep-link directly into READ / LOCI / LIVE / LISTEN / COMPOSE;
- make `?mode=READ&pulse=4` meaningful on phone;
- remove public copy artifacts and keep the first minute non-ontological.

**Pass:** a phone user can choose a job in one tap and explain why the chosen surface is useful.

### FRONT 2 — SHARED SESSION STRIP · ONLY AFTER USE

If repeated use shows re-entry friction, add one compact source/session witness shared across selected surfaces:

- source identity;
- position;
- active projection;
- pulse state;
- marks/return availability.

Do **not** merge tool UIs. This strip is a witness/router only.

**Pass:** switching READ ↔ LISTEN ↔ LIVE reduces re-entry cost without creating competing state authority.

### FRONT 3 — DUAL-PHONE SABER PROOF

Implemented 0.1 runtime; current proof gate:

- phone A hosts + one local hand;
- phone B pairs as the opposite hand over direct WebRTC;
- existing EVENT TAPE supplies scheduled note events;
- bounded ping/pong clock offset estimation aligns controller motion;
- motion reduces immediately to swing witnesses and local HIT/GRAZE/MISS outcomes;
- RETURN stores source/event-tape identity + bounded hit trace;
- no permanent backend and no raw continuous motion archive;
- repository proof is complete; two-real-phone feel/latency remains the human gate.

Keep this distinct from Beat Saber pack export.

## Parked until evidence asks

- provider proliferation;
- full Spotify/YouTube synchronization;
- a new audio bus;
- universal dashboard;
- new reader architecture;
- semantic auto-labeling;
- multiplayer platform;
- scoring economy;
- opaque “AI world generation.”

## Measurement

Each pass must improve at least one:

- **time-to-useful-action**
- **phone legibility**
- **source continuity**
- **cross-projection re-entry**
- **human authorship clarity**
- **repeat use**
- **RETURN quality**

If a feature cannot name the job it improves, park it.

## Recovered follow-ups / do not lose

These are preserved continuations, not active-front inflation.

- **PWA / LOCAL PLAYLIST INTAKE** — desired future convenience layer. Target: installable/offline shell + browser-local vault + user-selected files/folders/playlists. Do not claim arbitrary access to a device music library or replace exact source identity with playlist metadata. Existing M3U/M3U8/PLS intake is donor evidence, not yet a consumer-grade playlist browser.
- **VOICE FOLLOW-UPS** — VOICE 0.1 is working enough to continue, but real singing/practice feedback remains the promotion gate. Improve target/pattern/session feedback only from observed use; do not drift into opaque quality scoring.
- **REPLAY 0.2** — the previously requested LISTEN sync, word-level shaping with context, experience controls, compact payload-bearing share link and animation-like export are now shipped. Future replay work must extend this canonical surface, not revive the H1 spike as a competing lineage.
- **EXPERIMENT SURFACES** — LAB / LOCI / INK / ATLAS / TWO DIAL remain donor-capable and have follow-ups, but a new feature becomes active only when it improves a named job or closes a recovered user friction.

