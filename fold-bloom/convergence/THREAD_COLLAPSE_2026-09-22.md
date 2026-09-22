# FOLD//BLOOM — THREAD COLLAPSE
## Recent design / LISTEN / READFIELD / SET lineage · 2026-09-22

This note exists because several adjacent chats advanced the same object from different entry points. It is a **recovery surface**, not a new roadmap.

Use it to answer three questions quickly:

1. What was the user trying to make happen?
2. What is actually merged now?
3. Which ideas are only quarry / future calibration problems?

---

## 1. Recovered user intent

Across the recent Fold/Bloom / Design / LISTEN / READFIELD threads, the recurring ask was not “add more music features.”

The user was trying to make one source remain **inhabitable and editable across changing views**.

Repeated direct asks and corrections:

- LISTEN should become an **editor / calibration / annotation surface**, not mainly a workflow launcher.
- The existing lyric/text sync is insufficient when a track has a large offset or timing drift; simply widening a global offset is not the right abstraction.
- LISTEN → READFIELD/RSVP as a plain outbound link is weak. Reading should feel like another projection of the **same addressed source**.
- Position/place should persist across scales or “layers of reality” through a subtle UX element that can **fade into the background**.
- Horizontal ambient visual feedback is especially valuable when it acts as orientation/mood rather than dashboard telemetry.
- Annotation/marks should eventually survive projection changes instead of belonging to one isolated app.
- The ring/lens interaction is a donor beyond music: ADDRESS movement + APERTURE/scale change + marks.
- Ambience, AUTOPILOT, visual-world shaping and Two Dial extraction are valuable because they let a source become an environment without surrendering source authority.
- Future user-authored tracks may be uploaded as local/private defaults or QA fixtures. Public/default repository inclusion requires explicit publication permission.
- Avoid feature-soup, combo/reward detours, provider proliferation and “everything is a racer” transfer.
- The broader mechanism may matter to reading, interfaces, communications, code/repo work, rooms/physical objects and other critical work — but transfer the **contract**, not the music metrics or skin.

---

## 2. Chronology — collapsed from the overlapping threads

### A. Single-source instrument became real enough to inhabit

The family progressed from source analysis into embodied use:

- LISTEN: source intake, AUDIO MAP, address/scope, pins/annotations.
- LIVE: source-derived terrain, section arcs, world-writing, SPLIT/route choice, AUTOPILOT/perf polish.
- READFIELD: canonical text position across scale / RSVP / VOICE.
- FIELD PULSE: optional clock/context bridge; borrowed clock never borrows authorship.
- GLYPH ATLAS: exact-source memory/inspection projection.
- TWO DIAL: composition authority remains separate.
- ECOLOGY: persistent lineage/game authority remains separate.

The important experiential result was that a source could already be **mapped, ridden, read, remembered and shaped** without those projections becoming the same engine.

### B. Source-cell / set pressure appeared

The next need was not another single-source visual mode. It was higher-order curation:

- exact source identity must survive grouping;
- several source refs should form one authored journey;
- boundaries/seams must be explicit;
- set authorship must not acquire source-analysis authority.

This produced:

- **EXPERIENCE SET 0.1** — pure ordered higher-order boundary;
- **SET 0.1** — local-first compositor for order, weight and explicit seam laws.

### C. The missing continuity layer became explicit

A later Design/Fold–Bloom message sharpened the gap:

> one object should preserve position/place while scale, interface and projection change around it.

The recovered mechanism was named **SOURCE SPINE**:

**exact source/set identity + canonical address + aperture + authored calibration/marks + current projection witness**

This was deliberately defined as:

- not a hub;
- not another source;
- not a new timeline authority;
- not a reason to merge LISTEN / LIVE / READFIELD engines.

PR #156 merged this as architecture/authority convergence.

### D. LISTEN-as-editor / lyric alignment / READFIELD merge pressure

The user then made the source-editor implications explicit:

- make LISTEN an editor;
- lyric sync is not adequately solved by ±8s global offset;
- make READFIELD integration structurally useful;
- preserve a fading cross-scale orientation surface;
- keep/expand the ambient horizontal feedback;
- make marks/annotations projection-independent where lawful.

A wrong-path implementation experiment explored:

- anchor-based text alignment;
- a fading source-spine widget;
- READFIELD one-way follow/release;
- cross-projection marks;
- LISTEN horizontal source-horizon feedback.

That work lived in PR #155, but **PR #155 is now closed as superseded and must not be merged wholesale**. It was based on an older branch and conflicts with the newer convergence/SET line.

Treat #155 as a **quarry of tested implementation ideas**, not current authority.

### E. The other thread advanced the current repo

Current merged progression:

- PR #156 — SOURCE SPINE / source-editor intent converged into docs and authority.
- Issue #157 — bounded human gate for LISTEN phone ADDRESS/APERTURE continuity + one real-MP3 cross-surface proof; anchor/warp text calibration explicitly named as later, not required for A/B.
- PR #158 — SET 0.1 compositor implemented.
- PR #159 — SET 0.1 merge/human-gate state sealed.

This is the current line. Do not re-open the old branch merely because it contains useful code.

---

## 3. Current merged truth

### Family roles

| Surface | Owns | Must not acquire |
|---|---|---|
| SOURCE / source bundle | exact identity / provenance | authored meaning |
| LISTEN 0.6 | source cartography, analysis, pins, source-hash RIDE tuning | source-truth mutation from calibration |
| GLYPH ATLAS 0.2 | memory / inspection projection | new source identity |
| LIVE 0.13 | embodied RIDE / source-time projection / world-writing | MAP authority |
| READFIELD 0.7.1 | canonical text focus / scale / RSVP / VOICE | audio/racer authority |
| TWO DIAL 0.10.3 | composition | source-analysis authority |
| ECOLOGY 0.2 | persistent lineage/game world | copied LIVE terrain |
| EXPERIENCE SET 0.1 | pure ordered multi-source boundary | runtime/UI behavior |
| SET 0.1 | order / weight / seam authorship | analysis, DAW, source-byte storage |

### Current human gates

**SET 0.1**
- Use 3–7 meaningful source refs.
- Is reorder/weight/seam authoring fast enough to feel like shaping one journey rather than maintaining a playlist?
- If KEEP: next bounded runtime is JOURNEY RIDE 0.1.
- If not: repair compositor interaction before adding traversal.

**Issue #157 — LISTEN source-editor continuity on phone**
- Gate A: one phone gesture vocabulary for horizontal ADDRESS and vertical APERTURE.
- Gate B: one real-MP3 430×900 proof across LISTEN address/aperture/pin persistence → LIVE grade/speed/SPLIT.
- Lyric anchor/warp is a named later calibration problem, not required to close A/B.

**LIVE 0.13**
- Still subject to direct body QA: reachability, jitter, response, drop coherence, world distinction.

---

## 4. Quarry — useful, not authoritative

Preserve these ideas without promoting them prematurely:

### From superseded PR #155
- one anchor can correct arbitrary lyric offset;
- two or more anchors can correct drift through piecewise mapping;
- original cue timestamps remain immutable evidence;
- a fading source-spine rail can show source head + projection head;
- READFIELD FOLLOW should be one-way and release on manual reader action;
- a READFIELD mark can lawfully return to source time only when the mapping is explicit;
- horizontal low-alpha source traces can act as ambient orientation.

These are good donors for a future bounded implementation after the current gates. They are **not merged current behavior**.

### From discussion, not yet earned
- learned glyph neighborhoods;
- social/shared experience backend;
- provider catalogs;
- semantic song structure claims;
- generic DAW editing;
- automatic cross-domain “smart” transforms;
- a standalone SOURCE SPINE app.

---

## 5. The actual through-line

The recent chats can be compressed to:

```
ONE EXACT OBJECT
→ FIND / PRESERVE AN ADDRESS
→ CHANGE APERTURE
→ PROJECT IT UNEQUALLY
→ LET THE HUMAN MARK / SHAPE / TRAVERSE
→ KEEP PROVENANCE
→ RETURN THE CHANGED STATE
```

Music made this visible because time, rhythm, terrain and body feedback are unusually legible.

The mechanism is larger than music.

The music-specific parts are **not** the abstraction.

---

## 6. Re-entry rule

When returning cold:

1. read `/control/CURRENT.json#current_heads[fold-bloom]`;
2. read `/fold-bloom/convergence/README.md`;
3. read this note;
4. read `ADDRESSED_CONTINUITY_2026-09-22.md`;
5. only then inspect the roadmap/runtime files relevant to the current gate.

Do not recover project state from old chat summaries, screenshots, PR numbers alone, or attractive abandoned code.
