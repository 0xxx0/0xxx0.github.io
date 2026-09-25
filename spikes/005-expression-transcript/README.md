# SPIKE 005 / EXPRESSION TRANSCRIPT

Status: **EXPERIMENT / DONOR, NOT NEW CANON**

## Question

Can FIELD make the Φ / φ distinction executable without creating another store?

This spike tests one borrowed biological mechanism: **selective, transient expression**.

It does **not** claim FIELD is a genome, that software literally behaves like a cell, or that biology should become a universal ontology.

## Mapping under test

- **canonical host** — the domain state that already exists once.
- **Φ** — a *derived host frame*: host identity, authority, source pointer, channel boundary and canonical revision. It carries no duplicate domain objects.
- **φ** — an addressed locus: focus + selection inside that host.
- **transcript** — a disposable context-selected bundle of only the channels and operation support available at φ.
- **splice** — remove channels from a transcript while recording what was omitted as residue.
- **translate** — project a transcript into an unequal view; unsupported channels become residue, never invented semantics.
- **commit** — only the host can mutate canonical state; stale transcripts and unsupported operations are refused.
- **rewind** — restore an earlier expression/attention frame. It never rewinds canonical host history.
- **counterfactual branch** — fork an earlier transcript for comparison without mutating the host.

## Why this is worth testing

Earlier INTERPHASE work proved:

1. one canonical object can support multiple projections;
2. residue must remain explicit;
3. view state can RETURN without becoming canonical data;
4. one-store / many-view synchronisation is trivial when views never own copies.

What remains weak in FIELD is the capital/lowercase distinction itself. φ is real runtime focus. Φ is mostly notation spread across CURRENT, manifest, Git and host adapters.

This spike asks whether Φ can become a small executable **boundary contract** without becoming a second authority.

## Laws

1. Φ contains boundary metadata, never canonical node copies.
2. Transcript creation requires Φ revision == host revision.
3. Transcript carries only addressed objects.
4. Requested-but-unavailable channels become residue.
5. Splicing cannot silently discard channels.
6. Translation cannot change host revision or host data.
7. Operation support is carried with the transcript, but authority stays with the host.
8. Stale transcript commits are refused.
9. Unsupported operations are refused.
10. Rewind restores expression context only; canonical host revision/value remain current.

## Files

- `core.mjs` — dependency-free expression kernel.
- `selftest.mjs` — synthetic falsification of the ten laws.
- `index.html` — real-manifest read-only probe over FIELD routes.

## Lineage

This is downstream of:

- SPIKE 001 — canonical projection
- SPIKE 002 — heterogeneous residue
- HET12 — support / law harness
- SPIKE 003 — one instrument
- SPIKE 004 — one thing, four views, no sync
- INTERPHASE 0.2 — shared host protocol

The RNA analogy is a **donor mechanism**, not recovered historical canon. Exact earlier user wording has not been recovered.

## Stop

Do not move this grammar into FIELD root merely because the selftest passes.

Promote only if the probe reduces a real problem: stale projections, unclear authority, over-copied context, or unsafe replay.
