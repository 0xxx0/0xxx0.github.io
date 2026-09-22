# FOLD//BLOOM — JOURNEY RIDE 0.1

Route: `/fold-bloom/journey/`

Journey Ride consumes the existing `fold-bloom-experience-set/v0.1` object and exact local media bindings from the same-origin local vault.

## One-selection continuity

1. Select owned/local audio once in SET or LISTEN.
2. The browser stores the blob locally in IndexedDB under its exact SHA-256 source ID.
3. SET remains byte-free and stores source references only.
4. LISTEN may open `?source=sha256:…` and resolve the local blob without another picker interaction.
5. JOURNEY resolves every set entry from the same vault.

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
- synthetic route: `/fold-bloom/journey/?demo=1`

## Stop

Promote after core tests, phone-sized route smoke and the SET → local vault → LISTEN no-reupload browser proof pass. Human evaluation then determines whether seam execution feels like one journey or a playlist with transitions.
