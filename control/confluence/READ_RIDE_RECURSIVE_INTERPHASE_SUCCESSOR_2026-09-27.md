# READ / RIDE / RETURN — RECURSIVE INTERPHASE SUCCESSOR HANDOFF
## 2026-09-27

Status: **ACTIVE CANDIDATE / CONVERGENCE HANDOFF**

This document is deliberately larger than a normal implementation note. It preserves the current conceptual compression across READFIELD, LIVE, Glyph Atlas, Sleeper, FIELD LAB, J-space, I Ching, LOCI, Verse/Poem, FIELD INDEX and the Fortress donor so a successor does not have to reconstruct the same ideas from scattered threads.

---

# 0. One-line thesis

> **Treat books, files, songs, cities, poems, routes and model states as locally owned addressed objects; give them a few unequal apertures; traverse them without moving authority; preserve the path; RETURN.**

The reusable grammar is:

~~~text
OBJECT
  → STABLE ADDRESS
  → APERTURE
  → LAWFUL TRANSFORM / STEP
  → WITNESS
  → RETURN
~~~

The important recursive property is:

> an aperture may itself open another addressed object that exposes the same small grammar.

That is the useful “fractal” quality of INTERPHASE.

The recursion belongs to the **contract**, not to a universal ontology.

---

# 1. What the user is actually trying to do

The practical problem is not “make another reader.”

It is closer to:

> I have a growing corpus of books, files, notes, glyphs, media, projects and strange objects. I need to get through them, recognize them, move through them, revisit them, connect them, and leave useful residue without continually losing place or rebuilding context.

The system should therefore optimize for:

- fast source intake;
- exact source identity;
- exact current position;
- low-friction re-entry;
- multiple useful ways to perceive one source;
- human-authored paths and marks;
- bounded machine assistance;
- replayable progress;
- source authority preservation;
- RETURN.

The goal is not to maximize dashboards, modes, metadata, taxonomies or “AI features.”

The goal is to make material **traversable**.

---

# 2. Role separation

## FIELD INDEX

Best interpretation:

> **address registry / composition map**

Owns:
- public route identity;
- parentage;
- discoverability;
- navigation between objects.

A route should answer:

~~~text
WHAT IS THIS?
WHO OWNS ITS STATE?
WHAT CAN I DO HERE?
WHAT DOES IT OPEN INTO?
HOW DO I RETURN?
~~~

FIELD INDEX must not become:
- the state owner for every domain;
- a flat catalogue of every experiment.

Desired evolution:
- show composition and parentage;
- reduce apparent project count;
- expose the primary usable object before its donor lineage.

---

## GLYPH ATLAS

Best interpretation:

> **recognition / library / constellation aperture**

Owns:
- bounded source cells;
- source hash;
- deterministic source glyph;
- human-authored path/order;
- collection-level recognition.

Useful questions:
- what do I have?
- which thing was that?
- where was I?
- what should I enter next?
- which sources belong on this human-authored route?

Current document direction:
- local text-like files become document cells;
- raw document bytes remain session-bound rather than embedded into Atlas packets;
- a bound document can open READFIELD;
- this candidate adds **RIDE DOCUMENT** into LIVE through the same READ/RIDE contract.

The glyph is a thumbnail, not the source.

Similarity of glyphs does not prove semantic, causal or historical relationship.

---

## READFIELD

Best interpretation:

> **address / cursor / attention aperture**

Owns:
- exact text source;
- exact cursor/focus;
- structural scale;
- RSVP state;
- voice cursor;
- addressed reading projections.

Important correction recovered from the repo:

READFIELD 0.8.5 already has practical local-file intake for:
- TXT;
- Markdown;
- JSON;
- CSV;
- LOG;
- YAML / YML;
- JS / MJS;
- CSS;
- HTML;
- SVG;
- browser-declared text;
- application/json.

Local and pasted bytes are session-local and are not uploaded.

Existing work modes:
- FAST;
- REVIEW;
- PULSE;
- VOICE;
- LOCI;
- REPO.

Important existing law:

~~~text
ONE SOURCE
+ ONE CURSOR
→ several unequal reading jobs
~~~

This candidate adds:

~~~text
READFIELD
  → RIDE LIVE
~~~

The handoff carries:
- exact session text;
- bounded source identity;
- current focus/cursor;
- return address.

READFIELD remains the text/read authority.

---

## LIVE / RIDE

Best interpretation:

> **embodied local traversal / POV aperture**

LIVE owns:
- Fold/Bloom native game state;
- legal releases;
- ride state;
- field response;
- authored FOLD / BLOOM / SPLIT / RETURN trace;
- source/map/immersion presentation.

It already supports audio as terrain:

~~~text
AUDIO SOURCE
→ AUDIO MAP
→ BEAT / PHRASE / SECTION
→ RIDE
~~~

This candidate generalizes the existing addressed-course seam:

~~~text
TEXT SOURCE
→ READ COURSE
→ SENTENCE / PARAGRAPH / SECTION
→ LIVE POV
→ STEP
~~~

The design deliberately gives text **no fake clock** in LIVE.

Text enters STEP mode.

If temporal RSVP, voice timing or reading speed is desired, READFIELD remains the proper authority.

LIVE may embody the source; it does not silently become another RSVP engine.

---

## SLEEPER

Best interpretation:

> **world / path / gate / return aperture**

Core shape:

~~~text
SOURCE + VERSE CELL + FIGURE
→ DETERMINISTIC WORLD
→ ROUTE
→ ENACTED GATES
→ TRACE
→ RETURN ARTIFACT
~~~

Strongest transferable mechanism:

> **path as evidence**

The newly merged Return Artifact boundary-object work is canonical and must remain so.

Sleeper should not become a Fold/Bloom skin.

Fold/Bloom should not become Sleeper.

They share a useful structural rhyme:

~~~text
addressed world/material
→ local traversal
→ global path
→ witness
→ RETURN
~~~

---

# 3. The POV / SPIRAL analogy

The user’s intuition here is strong and should be preserved.

Do not turn it into a claim that the implementations are identical.

| Sleeper-ish view | Reading/material analogue |
|---|---|
| POV / local world view | LIVE embodied traversal of current source unit |
| SPIRAL / global route view | whole-source course strip / scale / structural progress |
| city cell / location | addressed sentence / paragraph / section |
| movement through world | stepping through source |
| Gate / encounter | marked passage / explicit operation / task |
| route trace | reading path / visited addresses / marks |
| Return Artifact | bounded reading/traversal witness |

The important idea is:

> **local experience and global structure are complementary apertures over one source.**

A literal spiral rendering is optional.

The useful requirement is not “draw a spiral.”

It is:
- make local position legible;
- make whole-source shape legible;
- allow movement between them;
- preserve address;
- RETURN.

---

# 4. Current READ/RIDE implementation candidate

## Shared source/course contract

File:

- /fold-bloom/read-course.js

Schemas:

~~~text
field-read-ride/v0.1
fold-bloom-read-course/v0.1
fold-bloom-read-witness/v0.1
fold-bloom-live-read-ride/v0.1
~~~

Session handoff key:

~~~text
fold-bloom.read-ride.handoff.v01
~~~

A READ/RIDE packet carries:
- exact session text;
- label;
- bounded source identity;
- source authority;
- current focus/cursor;
- caller;
- return address.

LIVE consumes it into runtime memory and removes the handoff packet.

LIVE public state exposes:
- source identity;
- current grain;
- current address;
- progress;
- bounded current witness;
- return address.

It does **not** expose the complete raw source through its public API/state snapshot.

---

## Text course grains

Current set:

~~~text
SENTENCE
PARAGRAPH
SECTION
~~~

Default in LIVE:

~~~text
PARAGRAPH
~~~

Reason:
- sentence may be too twitchy for embodied traversal;
- section is often too coarse;
- paragraph is a useful first falsifiable middle scale.

This is an empirical default, not doctrine.

Test it on real books/files.

---

## READFIELD → LIVE

READFIELD now exposes:

~~~text
RIDE LIVE
~~~

The action carries current source plus exact aperture snapshot into LIVE.

Thus:

~~~text
local file
→ READFIELD
→ move to current/difficult passage
→ RIDE LIVE
→ arrive near same source position
~~~

No source re-selection should be required.

---

## Direct local file → LIVE

LIVE candidate adds:

~~~text
READ / RIDE FILE
~~~

for the same practical text-like family.

This does not create another persistent source store.

The file is:
- read in-browser;
- converted to a READ/RIDE packet;
- held in runtime/session scope;
- projected into addressed course structure.

Authority is labeled LOCAL_FILE rather than falsely claiming READFIELD supplied it.

---

## Glyph Atlas → LIVE

For a bound local document cell:

~~~text
GLYPH ATLAS
→ RIDE DOCUMENT
→ LIVE READ/RIDE
~~~

The source hash survives.

Atlas remains identity/recognition authority.

LIVE receives a projection.

Document bytes remain session-bound.

---

## Atlas document family

This candidate widens the old TXT/MD-only Atlas boundary to:

~~~text
TXT
MD / MARKDOWN
JSON
CSV
LOG
YAML / YML
JS / MJS
CSS
HTML
SVG
~~~

PDF / EPUB / DOCX are **not** claimed.

Those require explicit typed source adapters.

Do not fake arbitrary binary-file support by decoding opaque containers as UTF-8 garbage.

---

# 5. The “library digestion” loop

A useful practical model for the whole stack:

~~~text
ACQUIRE
  ↓
ATLAS
recognize / select / path
  ↓
READFIELD
address / skim / review / voice
  ↓
LIVE RIDE
embody / step / encounter
  ↓
LOCI / MAP / SCALE
rehearse / see whole-source structure
  ↓
MARK / VERSE / NOTE
human-authored residue
  ↓
RETURN
preserve exact path / current address
  ↓
ATLAS / INDEX
re-enter later
~~~

Potential source classes:
- books;
- technical documents;
- source code;
- chat exports;
- research notes;
- regulatory material;
- poetry corpora;
- project archives;
- local private files;
- media-linked transcripts.

Do not force every source through every stage.

Each stage is an aperture, not a mandatory pipeline.

---

# 6. Why LIVE might help reading

This is a hypothesis, not a claim.

A difficult source may become easier to continue when:
- progress is spatial/structural rather than only scroll position;
- every unit has a stable address;
- movement has tactile/embodied rhythm;
- local POV can alternate with a global map;
- the user can leave route residue and re-enter later.

Potential benefits:
- attention re-engagement;
- lower re-entry cost;
- clearer chunk boundaries;
- embodied pacing;
- less “wall of document” feeling;
- memory tied to route/position.

Potential failure:
- game motion distracts from reading;
- source becomes decoration;
- steering takes more attention than reading;
- paragraph stepping feels arbitrary;
- the field invents false salience;
- interaction cost exceeds the benefit.

Test against ordinary READFIELD rather than assuming success.

---

# 7. What LIVE must NOT do to text

Do not let embodiment launder authority.

Rules:

1. LIVE does not rewrite the source.
2. LIVE does not infer that a Fold/Bloom verb is a semantic property of the text.
3. LIVE game score is not reading comprehension.
4. RELEASE does not automatically mean “understood.”
5. A completed route does not mean “finished learning.”
6. Structural course position is not semantic interpretation.
7. Source text remains recoverable from its owner/session.
8. No model silently chooses “important” passages with effect authority.
9. Generated world geometry may not overwrite source address.
10. RETURN must retain source identity + addressed position.

---

# 8. Should Fold/Bloom RELEASE advance the reading cursor?

Current answer:

> **No, not yet.**

Source navigation has explicit STEP controls.

Reason:

~~~text
FOLD / BLOOM / SPLIT / RETURN
~~~

are native LIVE authored operations.

Automatically turning a release into “next paragraph” would conflate:
- game action;
- reading progression;
- comprehension;
- source authority.

A later experiment may test:

~~~text
EXPLICIT READ-RIDE MODE
successful release
→ advance exactly one addressed unit
~~~

but only as a declared, reversible mode with a witness.

Do not slip it into default behavior.

---

# 9. J-space connection

J-space becomes increasingly interesting here.

Current general law:

~~~text
MODEL STATE
→ DISPOSITION / READOUT
→ HOST-OWNED MAPPING
→ LAWFUL NATIVE OPTIONS
→ PREVIEW
~~~

For reading/material traversal, a future co-driver could suggest which existing aperture may help next:

~~~text
current passage
→ model-side disposition
→ candidate apertures:
   CONTINUE
   REVIEW
   LOCI
   COMPARE XREF
   MARK
~~~

But:
- J-space must not silently turn pages;
- J-space must not claim semantic truth from a decoded token;
- decoded token label is not a causal residual steering direction;
- host mappings remain explicit;
- effect authority remains with the host/user;
- READ ≠ CAUSE.

A useful reading co-driver probably recommends **an aperture**, not an authored interpretation.

---

# 10. I Ching connection

I Ching remains useful as a finite ambiguity-preserving relation/change lens.

Potential reading use:

~~~text
native reading state / route witness
→ explicit projection Q
→ finite relation/change address
→ candidate correspondences
→ RETURN to native evidence
~~~

Possible value:
- compact change-state labels;
- compare before/after route structures;
- study transitions;
- ambiguous reflection prompts.

Must preserve:
- projection rule;
- information loss;
- unresolved alternatives;
- structural vs conventional correspondences;
- no body/health inference;
- no claim that a hexagram is sufficient native control state.

Do not make I Ching the reading engine.

---

# 11. Fortress / TRON connection

The useful donor remains:

> **trajectory modifies future affordance**

For reading/library traversal this suggests a bounded future experiment:

~~~text
passage visited / marked
→ leaves route residue
→ future navigation presentation changes
~~~

Examples:
- visited sections become faint trails;
- repeated traversal produces a stronger route;
- bookmarks become intersections;
- Atlas path shows travelled vs untouched regions;
- two reading sessions can be overlaid as ghosts.

Important boundary:

> route residue may alter navigation/visibility, not the source.

This is likely a better transfer than importing combat, TRON visuals or a full physics system.

---

# 12. LOCI connection

LOCI is a natural downstream aperture.

READFIELD already has:

~~~text
READ → LOCI → RETURN
~~~

A useful future pattern:

~~~text
READ
→ RIDE difficult section
→ select 3–7 addresses
→ LOCI
→ rehearse
→ RETURN to exact text
~~~

LOCI owns mnemonic spatial arrangement.

READFIELD owns source/cursor.

LIVE owns embodied traversal.

Do not merge them into one state.

---

# 13. Verse / Poem connection

Verse/Poem remains authorial.

Useful seam:

~~~text
source focus / marked passage
→ Poem Map / Verse
→ authored transformation
→ RETURN
~~~

LIVE may provide route context.

J-space may preview.

Neither acquires poem authorship.

Poetry is especially interesting because:
- order may be authored;
- route can differ from page order;
- multiple readings can coexist.

---

# 14. FIELD LAB connection

LAB remains the composition bench.

Do not add READ/RIDE as an eighth mode.

The existing seven projections already include:

~~~text
RIDE
PULSE
VERSE
READ
LOCI
INK
DATA
~~~

READ/RIDE composes the existing READ and RIDE apertures.

LAB’s useful question remains:

> can one addressed object survive re-projection across unequal views without losing source identity or laundering authority?

---

# 15. Stronger shared composition primitive

Across recent work a clearer form is emerging:

~~~text
SOURCE
  ↓
ADDRESS
  ↓
LOCAL VIEW  ←→  GLOBAL VIEW
  ↓              ↓
STEP          MAP / SCALE
  └──────┬───────┘
         ↓
      RESIDUE
         ↓
      RETURN
~~~

Examples:

## Audio

~~~text
track
→ time address
→ current ride
↔ beat/phrase/section map
→ authored release trace
→ RETURN
~~~

## Text

~~~text
book/file
→ char/paragraph address
→ current passage / LIVE POV
↔ sentence/paragraph/section course
→ marks / route
→ RETURN
~~~

## Sleeper

~~~text
world
→ cell/gate address
→ POV
↔ route/world overview
→ Gate trace
→ Return Artifact
~~~

## Atlas

~~~text
collection
→ source hash
→ focused source cell
↔ constellation/path
→ authored path
→ RETURN
~~~

This may be the cleanest generalization so far.

---

# 16. “Spiral” should mean scale + traversal, not decoration

The recurring spiral intuition is useful because a spiral can simultaneously suggest:
- progression;
- recurrence;
- revisiting;
- local position;
- whole-course position;
- changing scale;
- same center / different radius.

But do not hard-code a spiral renderer merely to satisfy the metaphor.

Functional requirements:
- exact local focus;
- whole-source position;
- multi-scale structure;
- step/navigation;
- visible history;
- reversible return.

If a literal spiral later proves best, use it.

If a strip/ring/Atlas constellation is clearer, preserve the function instead.

---

# 17. What “arbitrary file” means right now

Truthful phrase:

> **arbitrary text-like local file**

Current practical family:
- TXT;
- MD;
- JSON;
- CSV;
- LOG;
- YAML;
- JS;
- MJS;
- CSS;
- HTML;
- SVG;
- browser-declared text.

Not yet:
- PDF;
- EPUB;
- DOCX;
- scanned image;
- binary archive.

Correct future pattern:

~~~text
PDF / EPUB / DOCX
→ exact source identity
→ typed text/structure extraction
→ provenance
→ addressed READ source
~~~

Do not simply OCR or UTF-8 decode and claim fidelity.

---

# 18. Privacy / storage law

This matters especially for a real personal library.

Current design keeps:
- local/pasted READFIELD bytes session-local;
- direct LIVE read-file bytes runtime/session-local;
- Glyph Atlas packets free of raw document text;
- Atlas document runtime bytes in sessionStorage;
- source identity distinct from public projection;
- no upload claim;
- no cross-device sync claim.

Do not add a persistent raw-file store casually.

If a persistent device-local library is later required:
- make retention explicit;
- keep it device-local by default;
- expose clear/forget behavior;
- preserve exact hashes;
- do not silently promote every opened private file into a permanent corpus.

---

# 19. Current proof targets

## Pure course law

/fold-bloom/tests/read-course.test.mjs

Must prove:
- packet schema;
- stable source ID;
- focus → progress;
- paragraph addressing;
- forward/back stepping;
- sentence course;
- section course;
- current witness;
- deterministic fallback identity.

## Browser continuity

/tools/fold-bloom-live-read-ride-smoke.mjs

Must prove:

1. READFIELD packet begins in sessionStorage.
2. LIVE consumes it.
3. source identity survives.
4. authority remains READFIELD.
5. carried cursor lands in intended paragraph.
6. course mode is STEP.
7. course address uses read://.
8. stepping changes exact address.
9. grain changes to SECTION.
10. direct local File enters same READ/RIDE path.
11. direct file authority is LOCAL_FILE.
12. LIVE public state does not contain unrelated/full raw source tail.
13. READ/RIDE dataset is explicit.

---

# 20. Falsification experiments

## READ-RIDE-01 — Does embodiment help?

Use one real 20–80 page technical/text source.

Compare:
- READFIELD alone;
- READFIELD → LIVE READ/RIDE.

Measure:
- time to re-enter after a break;
- sections actually covered;
- lost-place events;
- subjective distraction;
- whether source position remains understandable;
- whether the user voluntarily returns to the mode.

Failure:
- LIVE adds interaction without improving continuation or re-entry.

If failure:
- keep the useful address/course contract;
- reduce or remove embodied presentation.

---

## READ-RIDE-02 — Grain

Same source.

Try:
- SENTENCE;
- PARAGRAPH;
- SECTION.

Question:

> Which scale feels like movement without turning the source into confetti?

Current hypothesis:
- PARAGRAPH is a good default.

Do not preserve that default if ordinary use disagrees.

---

## READ-RIDE-03 — RELEASE coupling

Only after 01 succeeds.

A/B:

A:
- explicit course NEXT/PREV only.

B:
- declared READ-RIDE mode where a successful RELEASE advances one source unit.

Observe:
- comprehension;
- pacing;
- frustration;
- source/game authority confusion.

Default remains uncoupled until useful evidence exists.

---

## READ-RIDE-04 — Atlas re-entry

Build a small real corpus:
- 10–30 documents;
- distinct glyphs;
- human path.

After a day:
- can the desired source be found faster from glyph/path than filenames alone?
- does document → READ/RIDE preserve re-entry?
- are glyphs actually memorable?

Failure:
- glyph wall is decorative and ordinary filename search is better.

---

## READ-RIDE-05 — Route residue

Only after normal route use exists.

Render:
- visited sections;
- marked sections;
- untouched sections.

No source mutation.

Question:
- does route residue make continuation obvious?
- or merely add noise?

This is the first sensible Fortress donor experiment for reading.

---

# 21. High-value future connections

## A. Atlas PATH as a human reading queue

Potentially:

~~~text
Atlas PATH
= ordered human reading queue
~~~

A source might be:
- OPEN;
- IN PROGRESS;
- RETURNED;
- PARKED.

Avoid turning this into another full task manager unless actual use demands it.

The path itself may be sufficient.

---

## B. Cross-source STEP

A chapter, paper, note and code file could be composed as one explicit set:

~~~text
SOURCE A
→ SOURCE B
→ SOURCE C
~~~

Existing Fold/Bloom SET / JOURNEY machinery is a better donor than creating a new playlist engine.

---

## C. Progress ghosts

A previous reading route can become a ghost:

~~~text
last session path
vs
current session path
~~~

This fits Sleeper/Fortress lineage.

Useful only if it improves re-entry.

---

## D. J-space aperture recommendation

After a passage:

~~~text
CONTINUE
REVIEW
LOCI
COMPARE
MARK
~~~

J-space may rank/preview existing options if real model-side evidence exists.

Host/user still decides.

---

## E. Source-linked questions

Potential bounded object:

~~~text
addressed passage
+ explicit question
+ return address
~~~

This may hand to an agent/research surface without losing source position.

Do not ship a universal Q&A layer before one concrete workflow needs it.

---

# 22. Successor stop rules

Before adding anything, ask:

1. What exact source/object owns truth?
2. What address identifies current position?
3. Is this a new object or merely a new aperture?
4. Can an existing host own the transform?
5. What authority is borrowed?
6. What information is lost?
7. What residue should remain?
8. What is the RETURN?
9. Does this reduce or increase exposed surface area?
10. Can one real task falsify its value?

Do not add:
- another universal bus;
- another global source store;
- another reader engine;
- another LAB mode;
- another ontology;
- semantic meaning to glyph similarity;
- effect authority to J-space readout;
- physical/medical truth to symbolic I Ching correspondence;
- Fortress mechanics without a concrete missing function.

---

# 23. Current implementation files

Core:
- /fold-bloom/read-course.js
- /fold-bloom/live/app.js
- /fold-bloom/live/index.html

READFIELD bridge:
- /docs/index.html

Glyph Atlas:
- /fold-bloom/atlas/app.js
- /fold-bloom/atlas/document-source.js
- /fold-bloom/atlas/index.html

Proof:
- /fold-bloom/tests/read-course.test.mjs
- /fold-bloom/atlas/document-source.test.mjs
- /tools/fold-bloom-live-read-ride-smoke.mjs
- /.github/workflows/public-surface-check.yml

Prior conceptual anchors:
- /docs/INTERPHASE_RECURSIVE_COMPOSITION_2026-09-27.md
- /docs/TRON_FORTRESS_TRANSFER_BRIEF_2026-09-27.md
- /control/HERMES_ICHING_CORRESPONDENCE_2026-09-27.json
- /fold-bloom/convergence/jspace-steering/RESEARCH_HANDOFF.md
- /control/confluence/SLEEPER_SYSTEM_FOLD_2026-09-27.md

---

# 24. Current truth boundary at initial write

- READFIELD text-like local-file intake: **already shipped before this branch**.
- READFIELD → LIVE READ/RIDE: **implemented on candidate branch**.
- direct local text-like file → LIVE READ/RIDE: **implemented on candidate branch**.
- Glyph Atlas document → LIVE READ/RIDE: **implemented on candidate branch**.
- Atlas text-like file family widening: **implemented on candidate branch**.
- pure READ course tests: **implemented; evidence gate pending at initial write**.
- browser READ/RIDE proof: **implemented; evidence gate pending at initial write**.
- PDF / EPUB / DOCX adapter: **NOT IMPLEMENTED**.
- persistent private book/file vault for READ/RIDE: **NOT IMPLEMENTED**.
- RELEASE → reading STEP coupling: **NOT IMPLEMENTED by design**.
- reading route ghosts/residue: **NOT IMPLEMENTED**.
- J-space reading aperture recommendation: **NOT IMPLEMENTED**.
- real-book lived comparison: **NOT RUN**.

Do not promote candidate claims past evidence.

---

# 25. Recommended successor order

If this branch becomes green and merged:

## First

Use one real local book/document-like text source:

~~~text
FILE
→ READFIELD
→ move to nonzero cursor
→ RIDE LIVE
→ step 5–20 paragraphs
→ change to SECTION
→ RETURN
~~~

Check whether source/cursor continuity feels real.

## Second

Repeat from a Glyph Atlas document cell.

Question:
- does Atlas genuinely improve source selection/re-entry?

## Third

Only if useful:
- add route residue/ghost;
- or test explicit RELEASE → STEP coupling.

## Fourth

Only after repeated use:
- add PDF/EPUB adapters;
- consider an explicit durable device-local library.

---

# 26. Distillation for a future session with almost no context

~~~text
ATLAS     = what source?
READFIELD = where in it?
LIVE      = move through it.
LOCI      = rehearse it.
SLEEPER   = path / gate / return precedent.
J-SPACE   = bounded co-driver.
I CHING   = ambiguity-preserving relation lens.
FORTRESS  = path residue donor.
RETURN    = never lose the source.
~~~

And:

> **Do not map everything to everything. Keep the source local, keep the address exact, make apertures small, let composition recurse, and preserve the path back.**


---

# 27. Repository proof seal — 2026-09-27

Code/proof head:

- 58d18ecc6565085fc25c6e999b1d03754c42a51a
- PR #459

Evidence:

- Route Registration 36302101373 — PASS.
- public-surface-check 36302101438 — PASS.
- pure addressed READ course law — PASS.
- existing LIVE audio STEP/FLOW course — PASS.
- READFIELD → LIVE READ/RIDE browser continuity — PASS.
- direct browser File → LIVE READ/RIDE — PASS.
- LIVE J-space co-driver browser seam — PASS.
- FIELD LAB mobile + cross-projection continuity — PASS.
- LIVE mobile regression — PASS.
- critical browser smoke — PASS.
- recovered source/media verification — PASS.
- frozen Sleeper City/Painting regressions — PASS.

The READ/RIDE browser witness proved, in one same-origin session:

~~~text
READFIELD packet
→ BOOK TEST
→ carried nonzero cursor
→ PARAGRAPH address read://sha256%3Abook-test/paragraph/2@27-70
→ witness “Second paragraph carries the cursor target.”
→ STEP NEXT
→ new exact read:// address
→ SECTION grain
→ exact section witness
→ browser File direct.md
→ same READ/RIDE machinery
→ LOCAL_FILE authority
~~~

The proof also asserts that LIVE public state does not expose the unrelated/full source tail.

This promotes the repository claim from “implemented, CI pending” to:

> **repository-proven candidate**

It does **not** prove:
- that embodied reading is better than ordinary READFIELD;
- comprehension improvement;
- a durable personal library;
- PDF/EPUB/DOCX support;
- RELEASE→STEP usefulness;
- route-residue usefulness.

The next gate is now ordinary real-source use, not more architecture.


---

# 28. Axial usability correction — 2026-09-27

Canonical constraint:

- /control/confluence/AXIAL_APERTURE_CONSTRAINT_2026-09-27.md

The READ/RIDE stack now has a stricter perceptual law:

~~~text
OBJECT AT CENTER
RING = ADDRESS / ORDER / CLOCK / SCALE
CONTROLS ORBIT
MARKS = HUMAN RESIDUE
RETURN PRESERVES SOURCE
~~~

This emerged from actual use of READFIELD JSON, FIELD LAB PULSE/DATA, and REPLAY. It is a usability constraint over the existing recursive INTERPHASE grammar, not another kernel.

Important corrections:
- JSON inspection must present exact node/path/children before derived lenses.
- READFIELD marks mean intentionally marked/visited, never understood.
- PULSE is a free rhythm clock first; staged timing TRAIN is optional.
- VOICE is independent again and borrows PULSE only by explicit link.
- REPLAY active text belongs at the geometric center.
- DATA selected object remains primary; I Ching/J-space/Change Calculus remain optional lenses.
- document thumbnails are bounded exact-source recognition cues, not summaries.
- Fortress route residue is the next falsifiable experiment only after ordinary marks prove useful.
