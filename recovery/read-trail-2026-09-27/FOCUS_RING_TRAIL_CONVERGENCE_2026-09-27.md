# FOCUS / RING / TRAIL — USABILITY CONVERGENCE HANDOFF
## 2026-09-27

Status: **IMPLEMENTED CANDIDATE — proof in progress**
PR: #461

This packet exists because the system had accumulated several individually good mechanisms whose interfaces were starting to obscure the object of attention.

The repair is deliberately smaller than the accumulated theory.

# 0. Working law

~~~text
CENTER = the thing I am actually attending to now
RING   = position / scale / rhythm / route around it
MARK   = human evidence that I visited or annotated it
LENS   = optional interpretation, never the center
RETURN = preserve enough identity + position to re-enter
~~~

This is not a new framework.

It is a usability constraint over existing:
- AXIAL;
- APERTURE;
- READFIELD;
- FIELD LAB;
- LIVE READ/RIDE;
- REPLAY;
- LOCI;
- CHANGE CALCULUS;
- INTERPHASE.

# 1. Why this cut exists

Observed friction from direct use:

1. JSON in READFIELD was technically addressable but visually behaved too much like prose/string output.
2. FIELD LAB PULSE had accumulated VOICE microphone/spectrum training inside the same panel and had become overloaded.
3. The radial grammar visually promised “focus at center” while READ/DATA sometimes put the useful object elsewhere or hid the center.
4. REPLAY put the active word above the concentric field even though the rings imply that the current word is the foveal object.
5. READ/RIDE had exact addressed traversal but no durable, modest human evidence that a source had been visited or marked.
6. DATA exposed six-bit/I Ching/J-space machinery too prominently for ordinary object inspection.
7. Library/source recognition needs thumbnails/glyphs, but a thumbnail must not become source authority.

# 2. Recovered donor laws

## AXIAL

Keep:
- one foveal gate;
- unequal vocabularies around it;
- explicit no-fake-focus law.

Do not import:
- AXIAL as another app shell;
- geometric decoration without a navigation job.

## APERTURE

Canonical semantics remain:

~~~text
outer ring = position
inner ring = scale / granularity
center     = current focused value / address
time       = advances the same position
voice      = may drive the same position
~~~

The strongest existing law remains:

> SAME SOURCE / MANY TRAVERSALS

and:

> SCALE CHANGE MUST NOT INVENT A NEW SOURCE.

This candidate adds:

> THE CENTER MUST NOT STOP BEING THE OBJECT JUST BECAUSE THE PROJECTION CHANGED.

## READFIELD

READFIELD still owns:
- exact source;
- cursor;
- RSVP;
- TTS/voice cursor;
- focus scale.

READFIELD does not own:
- LIVE game effects;
- LAB pulse rhythm;
- Atlas source identity;
- I Ching truth;
- J-space effect authority.

## INTERPHASE

Carrier law remains:

~~~text
same object
→ focus may change
→ projection may change
→ witness may change
→ RETURN remains explicit
→ authority never silently increases
~~~

# 3. JSON / DATA repair

## Before

JSON was parsed internally, but visible use could collapse toward:
- a giant string;
- generic node dots;
- unclear current object;
- tool machinery before object comprehension.

## Candidate READFIELD behavior

A JSON focus snapshot now exposes:

~~~text
path
key
type
depth
leaf?
child count
bounded value summary
parent
immediate children
~~~

The visual reading surface presents:
- current exact path;
- current key/value summary;
- parent button;
- immediate child cards;
- child type/count;
- ring hover preview.

The APERTURE center presents:
- current key;
- current type;
- child count;
- exact path → bounded value.

Thus:

~~~text
JSON OBJECT
→ addressed node
→ current key/value in center
→ parent / children around it
→ ring = scale / position
~~~

This is intentionally closer to an object inspector than a prose reader.

## LAB DATA

DATA remains:

> object → path → aperture → focus

The useful ordinary flow is:

~~~text
LOAD
→ HOVER / TAP ONE NODE
→ CENTER = CURRENT NODE
→ WHEEL = DEPTH
→ OPTIONAL LENS
~~~

The exact object is primary.

The graph is a route over the object, not a semantic copy.

# 4. I Ching / J-space in DATA

These are now explicitly optional lenses.

Use them only when there is an actual state comparison or model readout.

## Exact state

The native before/after or Fold/Bloom exact form is what is known.

## Δ / STEP

Changed coordinates do not specify temporal order.

If two or more coordinates changed:

~~~text
ENDPOINTS
≠
ONE UNIQUE HISTORY
~~~

STEP enumerates exact lawful orders instead of pretending one was observed.

This is the partial-order connection.

It is also why LOCI, reading order, routes and replay traces can rhyme without sharing one ontology:
- a set of locations/items does not necessarily determine visitation order;
- a final state does not determine the path that produced it;
- path evidence is information.

## I Ching

The six-bit state is a quotient/lens.

Traditional hexagram/trigram names can provide a compact human-readable change vocabulary.

They do **not** replace:
- exact Fold/Bloom verbs;
- full data state;
- temporal order;
- effect authority.

No random cast is implied by a supplied before/after state.

## J-space

J-space may say that an exported model readout lends more support to one already-lawful host verb than another.

It does not:
- author the data;
- supply hidden effect authority;
- convert a token label into a causal residual direction;
- commit the operation.

The useful combined reading is:

~~~text
EXACT = what is actually represented
STEP  = which exact histories remain possible
I CHING = compact lossy relation/change label
J-SPACE = candidate support among host-lawful actions
~~~

# 5. PULSE / VOICE split

The user-facing split is restored.

## PULSE

PULSE owns:
- rhythm clock;
- M / A / B lanes;
- ratio;
- BPM;
- taps;
- signed timing error;
- bounded tap/event evidence.

Default candidate mode:

~~~text
FREE RING
~~~

Behavior:
- click a ring to select M / A / B;
- tap gives immediate signed timing feedback;
- tap gives local sound/haptic consequence;
- FREE does not advance the training curriculum.

Optional:

~~~text
TRAIN
~~~

TRAIN keeps the prior:
- LOCK;
- CROSS;
- RETURN

curriculum.

The current ring count deliberately remains fixed at three.

Do **not** build an arbitrary-ring editor merely because ring manipulation is conceivable.

Current manipulation is:
- choose lane;
- change ratio subdivisions;
- change tempo;
- tap against selected clock.

That is enough to test the interaction.

## VOICE

VOICE is a separate instrument again:

- /fold-bloom/voice/

VOICE owns:
- microphone;
- pitch;
- spectrum;
- temporal vocal evidence;
- target note/pattern.

VOICE may borrow PULSE through FIELD PULSE.

Law:

> borrowed clock != borrowed authorship.

The previous embedded LAB VOICE implementation may remain temporarily as dormant compatibility code during this candidate cut, but it is no longer a user-facing PULSE panel or PULSE RETURN payload. If regression evidence stays green, successor may remove dormant code rather than re-expose it.

# 6. Center law across current surfaces

## READFIELD / APERTURE

~~~text
CENTER = word / sentence / paragraph focus
or JSON key/value
RING = source position + scale
~~~

## FIELD LAB READ

~~~text
CENTER = current reader focus
RING / field = source progress / comparison
~~~

## FIELD LAB DATA

~~~text
CENTER = current addressed node
FIELD = object topology / parent-child route
~~~

## FIELD LAB PULSE

~~~text
CENTER = current rhythm interaction state
RINGS = M / A / B clocks
~~~

## REPLAY

~~~text
CENTER = current active word
RINGS = source/message temporal field
~~~

## LIVE READ/RIDE

~~~text
CENTER / POV = current passage
COURSE = global source position
~~~

## LOCI

~~~text
CENTER / current locus = current mnemonic item
PATH = authored/derived visitation order
~~~

A literal identical graphic is not required.

The shared requirement is foveal consistency.

# 7. Trail / bookmark semantics

New shared primitive:

- /lib/read-trail.js
- schema: field-source-trail/v0.1

It records bounded device-local evidence:

~~~text
source key
last position
neutral character coordinate when available
furthest observed progress
bounded visit samples
human marks
~~~

Hard law:

> VISITED / MARKED records human traversal evidence only; it never means read, understood, agreed, verified or complete.

This distinction is essential.

A browser cannot infer:
- comprehension;
- attention;
- agreement;
- research quality

from cursor progression.

But it can responsibly say:
- this device traversed to here;
- the human explicitly placed a mark here.

That is analogous to:
- a bookmark;
- margin annotation;
- “last opened here”;
- route residue.

# 8. Unequal address law

READFIELD may address:

~~~text
para://...
word://...
section://...
~~~

LIVE READ/RIDE may address:

~~~text
read://source/paragraph/N@start-end
~~~

Do not force these into one address namespace.

They are unequal projections.

The neutral bridge is the exact character coordinate when one exists.

Thus:

~~~text
READFIELD para://...
      ↓ charIndex
LIVE read://...
      ↓ charIndex
READFIELD re-entry
~~~

Same source, unequal route grammars.

# 9. Fortress / Sleeper connection

The useful Fortress transfer remains:

> trajectory modifies future affordance / visibility.

The useful Sleeper precedent remains:

> path is evidence; RETURN preserves the path without replacing the source.

The read trail is the smallest real version of that idea:

~~~text
source
→ traversal
→ bounded path residue
→ re-entry
~~~

No combat metaphor is needed.

No decorative TRON skin is needed.

Future route residue may become:
- marks on course ring;
- faint visited arcs;
- prior-session ghost;
- Atlas “visited / untouched” witness.

Only add those if the current numeric/textual trail improves actual re-entry first.

# 10. Document thumbnails

Documents may have thumbnails.

Current candidate adds deterministic identity thumbnails to the READFIELD repository shelf.

Truth boundary:

- these are recognition glyphs;
- they are not document screenshots;
- they are not semantic embeddings;
- similarity does not prove related content.

A future typed source adapter may provide native thumbnails:
- PDF first-page render;
- EPUB cover;
- image/document preview.

That should remain source-derived and typed.

# 11. Partial order / mnemonic order

The user’s intuition about LOCI is useful.

A mnemonic path adds order to otherwise weakly ordered material.

In general:

~~~text
ITEM SET
+ ROUTE
= VISITABLE SEQUENCE
~~~

But:
- the item set is not the route;
- the route is not the source;
- changing a route does not mutate the source;
- multiple lawful routes may exist.

This is the same reason:
- STEP needs explicit temporal ordering;
- Sleeper route samples add evidence;
- reading trails matter;
- LOCI works by placing material into a recoverable traversal order.

Do not turn this into a universal partial-order engine yet.

The shared concept is sufficient.

# 12. Current candidate implementation

Added:
- /lib/read-trail.js
- /tools/read-trail-selftest.cjs
- /tools/readfield-focus-usability-smoke.mjs

Changed:
- /field-aperture.js
- /docs/index.html
- /fold-bloom/read-course.js
- /fold-bloom/live/index.html
- /fold-bloom/live/app.js
- /fold-bloom/lab/index.html
- /fold-bloom/lab/app.js
- /fold-bloom/replay/app.js
- /fold-bloom/convergence/change-calculus/index.html
- /tools/fold-bloom-live-read-ride-smoke.mjs
- /tools/fold-bloom-lab-mobile-smoke.mjs
- /tools/fold-bloom-replay-step-smoke.mjs
- /.github/workflows/public-surface-check.yml

# 13. Proof requirements

Before promotion, require:

## READFIELD JSON
- JSON kind is real.
- structured current path/value renders.
- parent/child structure exists.
- ring hover produces bounded preview.
- child focus changes exact address.

## Documents
- shelf exposes recognition thumbnails.

## Trail
- furthest is monotonic.
- mark is explicit.
- duplicate mark is bounded.
- char coordinate survives unequal address grammars.
- law explicitly rejects comprehension inference.

## LIVE READ/RIDE
- visit updates shared trail.
- explicit mark updates shared trail.
- raw source remains absent from public bounded state.

## PULSE
- FREE is default.
- lane M/A/B can be selected.
- TRAIN remains opt-in.
- embedded VOICE panel is absent.
- standalone VOICE route remains available.

## LAB center
- READ center reflects focus, not the mode name.
- DATA center reflects addressed node.

## REPLAY
- active word anchor is CENTER.

## Regressions
- prior READ/LOCI/VERSE continuity remains green.
- J-space/change-calculus proofs remain green.
- LIVE and Sleeper regressions remain green.

# 14. Falsifiers

Remove/reduce these changes if:

- JSON structural view takes more effort than ordinary tree inspection.
- hover preview creates visual noise or obscures pointer intent.
- deterministic document glyphs do not help source recognition.
- automatic VISITED tracking feels like dishonest completion pressure.
- FREE PULSE does not make rhythm exploration easier.
- centering the current REPLAY word makes temporal context harder to perceive.
- DATA center changes make graph navigation less legible.
- trail persistence makes privacy expectations unclear.

# 15. Next human experiment

Do not add another architecture layer.

Use:

1. one real JSON file that was previously annoying in READFIELD;
2. one long article/book-like local text;
3. PULSE FREE for 2–5 minutes;
4. REPLAY with a real message.

Observe:

- can the current object be identified instantly?
- does ring motion provide context rather than competition?
- after leaving and returning, is prior position useful?
- does a MARK feel like a bookmark rather than a fake task completion?
- is DATA understandable before opening Change Calculus?

# 16. Short recovery

If a successor has almost no context:

~~~text
CENTER = object now.
RING = where/scale/rhythm around it.
MARK = human visit/annotation evidence.
LENS = optional interpretation.
RETURN = re-entry.

JSON: inspect, don’t stringify.
PULSE: FREE first; TRAIN optional.
VOICE: separate, may borrow clock.
REPLAY: word belongs in center.
READ/RIDE: record visit, never claim comprehension.
DATA: exact object first; I Ching/J-space later.
~~~
