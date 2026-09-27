# INTERPHASE CARRIER — CONTINUATION UNIVERSALISATION 0.1
Date: 2026-09-27
Status: IMPLEMENTED CANDIDATE
Role: thin continuation grammar over existing host-owned state. Not a new app, global store, planner, event bus, ontology or effect authority.

## 0. Refined claim

INTERPHASE universalisation does make sense, but only if the universal part stays smaller than the domains.

The useful universal is not:

- one shared data model;
- one global state machine;
- one universal event schema;
- one shell that contains every app;
- one agent with authority over all hosts.

The useful universal is:

**the shape of a lawful continuation across unequal hosts.**

That shape is:

```
OBJECT
  ↓
FOCUS
  ↓
NEXT 1–3
  ↓
WITNESS
  ↓
RETURN
```

with explicit owner, address, projection, residue and authority boundary.

Everything else remains native.

## 1. Three planes

### A. DOMAIN PLANE — native truth

The host owns:

- canonical state;
- domain vocabulary;
- real effects;
- validation;
- irreversible boundaries;
- durable evidence;
- native RETURN semantics.

Examples:
- Sleeper owns source/world/Gate proof truth.
- Dayline owns local scheduling/RUN/WITNESS/COMPLETE.
- Shopping owns procurement lifecycle.
- HOUSE owns spatial/device/reality state.
- Verse owns authored text/revision ancestry.

INTERPHASE does not replace any of these.

### B. PROJECTION PLANE — interphase-core

`/lib/interphase-core.js` already universalises:

- selection;
- multifocus;
- focus aperture;
- view/projection;
- channel residue;
- projection-local RETURN;
- authority-aware native operations.

The host adapter remains the semantic authority.

### C. CONTINUATION PLANE — interphase-carrier/v0.1

New file: `/lib/interphase-carrier.js`.

The carrier is an ephemeral, authority-free frame for crossing a host boundary.

It carries only:

```
object
focus
next[0..3]
witness
return
projection
sourceRefs
lineage
meta
```

Hard law:

```
carrier.authority = NONE / HANDOFF ONLY
move.dispatch      = HOST_NATIVE_ONLY
```

A move descriptor may state that a native operation is VIEW / NAVIGATION / EDIT / EFFECT / OFFER, but the carrier cannot execute it.

## 2. Identity law

The carrier separates OBJECT from FOCUS.

This is the central move.

Across hosts:

- OBJECT should remain stable when the same thing continues.
- FOCUS is allowed to change.
- PROJECTION is allowed to change.
- NEXT is allowed to change.
- WITNESS is allowed to accumulate/evolve.
- RETURN must remain explicit.
- authority may stay equal or decrease; it must never silently increase.

Example:

```
SLEEPER
object = sleeper:return:11KF1IO
focus  = transfer instruction

        ↓ explicit handoff

DAYLINE
object = sleeper:return:11KF1IO     // SAME
focus  = t:work-...                 // CHANGED
view   = FOVEA                      // CHANGED
witness= concrete consequence       // EVOLVED
return = /sleeper/project/?world=…  // PRESERVED
```

This is more precise than saying “the apps are integrated.”

## 3. First closed proof: Sleeper → Dayline → Sleeper

Implemented on this branch.

### Entry

`/sleeper/project/` already validates copied Return Artifact v2 by:

- schema/version;
- known verse cell;
- known figure;
- deterministic worldKey recomputation;
- route/world identity if route exists;
- 8/8 Gate names.

After validation it now derives one `interphase-carrier/v0.1` frame whose object is:

`sleeper:return:<worldKey>`

and whose focus is the artifact's own `transferInstruction`.

### Explicit consent gate

New operation:

**CARRY OPERATOR → DAYLINE**

This exists only when `transferInstruction` is present.

No task is created automatically from completing the game.

On activation Sleeper emits the existing `atlas-dayline-handoff/v0.1` envelope and embeds the carrier.

Sleeper contributes:

- exact source object identity;
- transfer instruction;
- dominant operator;
- provenance;
- proof boundary;
- RETURN target.

It deliberately does not choose:

- Dayline time;
- Dayline execution slot;
- urgency;
- scheduling context;
- native Dayline completion semantics.

Those remain Dayline's problem.

### Dayline continuation

Dayline now stores the incoming carrier beside the existing source link.

When the handoff becomes a Dayline task, the continuation frame changes its focus to the Dayline work object but preserves the original source object.

The new Dayline frame therefore means:

> the same Sleeper Return object is currently being worked through a Dayline focus.

Native Dayline actions remain the only effect path.

### Evidence return

When Dayline RETURN emits an `atlas-dayline-source-return/v0.1` offer it now includes the continuation carrier.

On return to `/sleeper/project/`, the exact source object ID must match:

`sleeper:return:<worldKey>`

before the offer appears.

The UI says:

**DAYLINE RETURN OFFER · EVIDENCE ONLY**

The offer may report:

- task state;
- Dayline RETURN class;
- checksum;
- event ids;
- textual witness;
- native effect classification.

It cannot:

- alter the completed Sleeper artifact;
- add a Gate proof;
- change worldKey;
- retroactively satisfy TRANSFER;
- rewrite returnedSource.

This is the first complete continuation loop.

## 4. Second proof: FIELD → Dayline

FIELD already had:

`HELD ROUTE → INTERPHASE → DAYLINE`

but carried an ad-hoc subset of the projection result.

The branch now adds `interphase-carrier/v0.1` to the same existing handoff while preserving the old `interphase` field for compatibility.

The carrier is derived from the actual `FieldInterphase.projectionResult()`.

Object:
- exact FIELD route.

Focus:
- exact held route.

NEXT:
- OPEN NATIVE;
- INTERPHASE → DAYLINE;
- TRACE / VERIFY.

RETURN:
- exact FIELD focus URL.

This matters because the same continuation law now spans two unlike source types:

1. repository route / FIELD object;
2. completed game Return Artifact.

If the abstraction only worked for Sleeper it would not qualify as a useful universal.

## 5. What universalisation now means

A concise formulation:

**INTERPHASE universalises continuity, not meaning.**

Or mechanically:

```
native object
    ↓ adapter
projection witness
    ↓ carrier
cross-host continuity
    ↓ native handoff adapter
recipient focus
    ↓ native operation
native evidence
    ↓ offer / RETURN
source re-entry
```

The carrier is the narrow waist.

Above it: wildly different domains.
Below it: wildly different representations and controls.

The waist carries identity and continuation law, not domain semantics.

## 6. Why not use one universal handoff schema?

Because handoff payloads have real semantic differences.

A Verse source handoff, Dayline task, Lens projection, HOUSE context and COMMS message cannot honestly share one effect schema.

So current rule:

- keep native handoff envelopes;
- embed an optional carrier for continuity;
- recipient may ignore carrier safely;
- old hosts continue working;
- no migration flag day.

This gives progressive convergence rather than a flag-day rewrite.

## 7. Agent / Hermes consequence

If an external orchestrator supports subagents, the carrier is a better delegation unit than “here is the whole repo/context.”

A bounded agent task can receive:

```
OBJECT
FOCUS
NEXT 1–3
AUTHORITY = NONE / bounded native tool authority
WITNESS required
RETURN address
```

The subagent should return:

- what it actually touched;
- what changed;
- evidence;
- residue;
- unresolved gate;
- continuation carrier / native RETURN.

This is compatible with stronger or cheaper worker models because the important constraint is not the worker identity; it is the task envelope and proof boundary.

Do not infer any specific Hermes/MiMo runtime behavior from this document. If Hermes can assign models per subagent, this carrier is a plausible work-unit format; that integration remains external and unverified here.

## 8. High-upside strange ideas

These are entertained, not promoted.

### A. Work ghosts

Record a sequence of carrier frames:

`object stable → focus/projection changes → witnesses accumulate`

Then replay that sequence as an attention ghost.

This would show how work moved across FIELD / READ / LENS / DAYLINE without pretending the ghost is canonical history.

Potential payoff:
- interruption recovery;
- agent handover;
- debugging why work got lost;
- compare two solution trajectories.

Do not implement until a real multi-host run produces useful carrier history.

### B. Physical carriers

A QR/NFC/printed glyph could encode only:

- object ID/address;
- owner;
- RETURN;
- optional carrier frame reference.

Scanning a physical tool/fixture could restore focus without giving the tag actuation authority.

This fits HOUSE / workshop / print-proof lineage unusually well.

### C. Carrier-aware route compiler

Given:
- one carrier;
- recipient host capability descriptors;

derive:
- which next operations are actually supported;
- which channels become residue;
- which host can accept the object.

This could reduce route hunting further.

Danger: it can easily become a second planner/router. Do not build until manual carrier use produces repeated routing friction.

### D. Route witness as addressed depth

Sleeper's future RouteWitness should remain Sleeper-owned evidence.

The carrier may point to:

`sleeper://WORLD/return#route`

but should not absorb route samples into the universal schema.

Same principle for audio maps, poem graphs, shopping listings or HOUSE topology.

### E. Agent swarm with one-object law

A coordinator may fork several carriers from the same object, each with a different focus:

- test;
- research;
- implementation;
- falsification.

Each branch returns evidence.
A human or domain host reconciles them.

This resembles branching search without giving workers shared write authority.

Potentially high leverage for the current repo, but only after one-worker carrier delegation is proved.

## 9. Falsifiers

Kill or narrow the carrier if:

1. users still need to reconstruct context after a handoff;
2. recipient hosts require so much opaque `meta` that the carrier becomes another junk drawer;
3. hosts start using carrier move descriptors as authority;
4. the same object's identity cannot survive without domain-specific rewriting;
5. RETURN cannot point back exactly;
6. native envelopes become harder to understand because of the carrier;
7. every feature starts demanding a new carrier field.

A universalisation that keeps growing vocabulary is failing.

## 10. Promotion path

### P0 — this branch
- carrier library;
- tests;
- Sleeper → Dayline → Sleeper loop;
- FIELD → Dayline carrier compatibility;
- no removal of legacy handoff fields.

### P1 — real-use proof
Use one real Sleeper Return:
1. validate;
2. CARRY OPERATOR;
3. accept into Dayline;
4. RUN / record concrete witness;
5. RETURN;
6. return to Sleeper;
7. confirm evidence-only offer appears against same world/object.

### P2 — one non-game native source
Use existing FIELD → Dayline carrier in ordinary work and verify re-entry reduces reconstruction.

### P3 — only if P1/P2 help
Migrate one additional seam, likely COMMS or SHOPPING, because both already implement source-return offers and strong authority boundaries.

Do not mass-migrate hosts.

## 11. Relation to route ghost / Sleeper depth

Route ghost remains worth implementing, but it is no longer the highest-leverage convergence proof.

Recommended ordering:

1. land/real-use continuation carrier;
2. mine remaining ASCII City videos as independent donors;
3. implement optional RouteWitness + replay in Sleeper;
4. let carrier point to route witness as depth;
5. only then test a LIVE/ASCII world-depth transplant.

This keeps the platform law and the game mechanic separate.

## Compression

```
INTERPHASE CORE
= how one host exposes an object through unequal views.

INTERPHASE CARRIER
= how the same object survives a host boundary.

NATIVE HANDOFF
= how domain-specific material enters the recipient.

NATIVE EFFECT
= the only place change is allowed.

WITNESS / RETURN
= how consequence becomes portable without laundering authority.
```

**Universalise the seam, not the world.**
