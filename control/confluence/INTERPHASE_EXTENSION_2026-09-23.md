# INTERPHASE 0.2 — shared host + browser extension cut

Status: **EXPERIMENTAL CONVERGENCE CUT**

This is not a new sovereign app.

It extracts one small host protocol from the existing INTERPHASE / Lens / APERTURE / READFIELD / FIELD / projection-contract lineage, then proves that the same protocol can sit over an ordinary website.

## Plain rule

**Data exists once. INTERPHASE keeps selection/focus/view state outside the data, composes lawful paths into data, and lets unequal projections expose only the channels they actually carry.**

Current channels:

- identity
- address
- content
- depth
- time
- authority
- raster
- evidence

A projection declares which channels it can carry. Anything omitted becomes explicit `residue`; it is not silently discarded.

## Files

- `/lib/interphase-core.js` — dependency-free core, multifocus, projection state, RETURN frames, edit receipts, tiny composable optics.
- `/lib/interphase-dom.js` — generic browser DOM adapter.
- `/lib/interphase-field.js` — FIELD route adapter over existing `FieldLensHost`; no second FIELD selection authority.
- `/lib/interphase-readfield.js` — READFIELD adapter over the existing `field-aperture` cursor; no second text cursor.\n- `/lib/interphase-lens.js` — Scale Lens adapter over its existing snapshot/focus/aperture/project/RETURN API; LensState remains authority.\n- `/lib/interphase-listen.js` — LISTEN source/address/aperture adapter; LISTEN remains audio cartographer.
- `/manifest.json` + `/interphase-extension.js` — Manifest V3 load-unpacked browser extension.
- `/tools/interphase-selftest.cjs` — core law check.

## Extension

Load the repository root as an unpacked extension.

The extension adds one tiny `◎` control to ordinary pages.

When active:

- click = select + focus;
- shift-click = multifocus;
- PAGE / FOVEA / LINE / RING / SIX / GLYPH are views over the same DOM objects;
- editable native form controls may be changed through the instrument;
- all generic button/link effects remain disabled;
- projection residue is shown rather than hidden;
- MARK RETURN / RETURN restore INTERPHASE view/attention state;
- Escape releases the overlay.

The generic DOM adapter is deliberately modest. Canvas/WebGL/cross-origin/opaque application state requires a richer site adapter rather than invented semantics.

## FIELD / READFIELD convergence

FIELD now exposes the current route focus through the same host protocol, but `FieldLensHost` remains authoritative.

READFIELD now exposes the current Aperture snapshot through the same host protocol, but `field-aperture` remains authoritative.

This is the intended convergence law:

```
host owns domain truth
        ↓
INTERPHASE adapter
        ↓
shared select / multifocus / projection / operation / RETURN
        ↓
host-specific or generic views
```

No state is copied into another canonical store.

## Recovered donor authority\n\n`/spikes/003-one-instrument/` remains the direct proof donor for the six-office carrier and explicit `CONTENT / AUTHORITY / DEPTH / TIME` residue. INTERPHASE 0.2 does not supersede that spike; it extracts the reusable host protocol and carries the same six panel elements across `FLOWER_KEY ↔ ROOM` in the browser extension.\n\nThe six offices `SOURCE / FRAME / FOCUS / OPERATE / WITNESS / RETURN` are a reusable preset, not a universal ontology.\n\n## FOLD//BLOOM reduction\n\nThe current family is treated as three operational roles rather than many state systems:\n\n1. **SOURCE / CARTOGRAPH** — SET + LISTEN + Atlas: exact source refs, maps, paths, memory.\n2. **COMPOSE** — Two Dial / operator algebra: authored transformations and parameter relations.\n3. **RIDE / EMBODY** — Journey + LIVE: traversal/play/embodied projection over source + authored operation state.\n\nLISTEN is the first role bound to INTERPHASE in this cut. No claim is made that the other surfaces are already migrated.\n\n## What this proves

This cut is successful if:

1. the same core can sit over FIELD, READFIELD and arbitrary DOM;
2. projection changes cannot mutate host data by themselves;
3. multifocus is core state, not a special UI feature;
4. an edit through the generic DOM adapter changes the native host element itself;
5. unsupported channels appear as residue;
6. exact view/attention state can RETURN without reverting committed data.

It does **not** prove that every projection can show every object.

The heterogeneous collapse spike already falsified that stronger claim.

## Physical MAKE consequence

The same protocol can later address physical objects, fixtures and assemblies if the physical host supplies:

- stable object identity;
- containment / mating / routing relations;
- measured state;
- lawful operations;
- explicit irreversible-effect boundaries.

A cube net, rotary carrier, panel, cassette, rail or printed glyph can therefore become a physical projection/controller over the same address graph. Physical geometry is canonical only when the user/build declares that geometry as real structure; renderer coordinates are not.

## Stop

Do not build another dashboard around this.

Next useful proof is real use of the extension on unrelated websites plus one richer host adapter where generic DOM is insufficient.
