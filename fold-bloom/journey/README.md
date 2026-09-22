# FOLD//BLOOM — JOURNEY RIDE 0.1.2

Route: `/fold-bloom/set/journey.html`

Journey Ride is a traversal mode behind SET, not another top-level Fold/Bloom app. It consumes the existing `fold-bloom-experience-set/v0.1` object and exact local media bindings from the same-origin local vault.

## One-selection continuity

1. Select owned/local audio once in SET or LISTEN.
2. The browser stores the blob locally in IndexedDB under its exact SHA-256 source ID.
3. SET remains byte-free and stores source references only.
4. LISTEN may open `?source=sha256:…` and resolve the local blob without another picker interaction.
5. JOURNEY resolves every set entry from the same vault.

The hash-only seed demo cannot contain the audio itself. After the real files are selected once in the same browser/site origin, SET → LISTEN → JOURNEY can reuse them until site data is cleared or browser storage evicts them.

Nothing is uploaded. Clearing site data removes the local blobs. Browser storage quotas still apply.

## Runtime law

- each source retains its native clock and identity;
- Journey adds a derived continuous address beside those source clocks;
- `CUT` advances immediately;
- `CARRY` advances immediately while retaining a continuity witness;
- `DISSOLVE` performs a bounded 2.4 second overlap without rewriting either source clock;
- `RESET` inserts a bounded 0.65 second gap;
- final `RETURN` closes the journey and emits reference/address evidence only.

## Boundaries

- no beatmatching;
- no tempo warping;
- no concatenated audio export;
- no new Experience Set fields;
- no replacement for LISTEN analysis or LIVE terrain/gameplay;
- no raw source bytes in RETURN.

## Evidence

- runtime core: `/fold-bloom/journey/journey-core.js`
- core tests: `/fold-bloom/journey/tests/journey-core.test.mjs`
- local vault: `/fold-bloom/local-media-store.js`
- cross-surface browser proof: `/tools/fold-bloom-spine-smoke.mjs`
- exact recovered seed witness: `/fold-bloom/set/journey.html?demo=seed&auto=1`
- pure seed builder: `/fold-bloom/journey/demo-seed.js`
- seed test: `/fold-bloom/journey/tests/demo-seed.test.mjs`

## Shareable seed witness

The default public demo is the exact recovered three-track proposal:

1. `preforme` — GHOST — 230.592 s — CARRY
2. `THROUGH THE FIRE` — FORGE — 424.8 s — DISSOLVE
3. `BY YOUR WILL / 遺志` — WILL — 364.872 s — RETURN

The witness uses the exact SHA-256 identities, durations, roles and authored seam law from `/fold-bloom/test-packs/catalog.json`.

It intentionally contains **no audio bytes**. On a browser where those exact files were explicitly selected once, the same source IDs can resolve from the local vault for real playback. On any other browser, the demo compresses time into a mute visual traversal and labels itself as such.

## Stop

0.1 core/local-vault promotion passed via PR #166 and CI run 1670. 0.1.2 adds only the shareable exact-seed witness and first-touch framing. The remaining authority is lived use: does GHOST → FORGE → WILL feel like one authored journey with actual local audio, and can a context-free person understand the byte-private public demo quickly?
