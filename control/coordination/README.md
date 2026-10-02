# PUBLIC COORDINATION / COLLISION CONTROL

Role: **non-authoritative merge guard**.

This directory does not own project state, priority, runtime truth, or execution permission. Those remain with `control/CURRENT.json`, `showcase-manifest.json`, native release metadata, and `returns/`.

## Failure classes this guard addresses

The repository is active enough that collisions are not only textual Git conflicts:

- two PRs can mutate one serialized authority/runtime boundary through different files;
- a branch can remain green against an old base while `master` changes underneath it;
- repository-global checks can fail for reasons outside a candidate diff, including stale expectations, timing, compound-probe order/state, or current-head drift;
- private ancestry can be mistaken for newer public runtime truth;
- coordination prose or receipts can accidentally become a second control plane.

## Collision classes

1. **Base drift — FAIL.** At PR-check time, the head must not be behind its current target branch.
2. **Exact-file collision — FAIL.** Two open PRs change the same file.
3. **Hard-domain collision — FAIL.** Two open PRs mutate one serialized boundary (`CURRENT`, public registries, FIELD root/shared carrier).
4. **Soft-domain collision — WARN.** Two PRs touch the same native host family but may still be independent.
5. **Public-boundary violation — FAIL.** A PR introduces a path reserved for private/secret material.
6. **Missing transaction claim — WARN**, except on hard domains where it fails.

Configuration: `COLLISION_MAP.json`  
Executable check: `/tools/collision-preflight.mjs`  
PR workflow: `/.github/workflows/collision-preflight.yml`

## Transaction block

Substantial PRs carry one machine-readable claim in their description:

```text
<!-- FIELD-TRANSACTION
authority-owner: public-runtime
surface: readfield
class: DELTA
publication: public-native
return: /returns/example.json
stop: exact-head checks pass and the named capability is exposed
-->
```

The claim is not a lock. It cannot mint priority or authority. It makes intended ownership inspectable before merge and gives the guard something explicit to compare.

## Cross-repo law

### Public repository
Owns current release-safe runtime, generic public contracts, public evidence, and public heads. It receives scrubbed release artifacts, not private archaeology wholesale.

### Private repository
Owns private source, ancestry, unpublished lineage, private evidence, and private coordination. It references newer public runtime truth rather than mechanically mirroring it.

### Capture / donor repositories
Preserve their bounded source role. They do not become current merely because they contain older or richer context.

Cross-repo movement is a **transaction**, not synchronization:

```text
SOURCE OWNER
→ exact artifact / identity
→ privacy + authority review
→ bounded transform or scrub
→ target-native verification
→ receipt
→ RETURN pointer to source owner
```

No bidirectional bulk mirror is implied.

## Merge discipline

- Keep change branches short-lived and single-purpose.
- Inspect open PRs before starting another mutation of the same host.
- Bring the candidate onto current `master` before final exact-head proof when `master` has moved.
- Hard-domain overlap means converge, sequence, supersede, or close; do not race two truths.
- Soft-domain overlap means inspect the actual functional boundary; do not invent a global lock.
- Unique receipts and confluence notes do not collide merely because they share a directory.
- A coordination artifact that changes no capability and resolves no live ambiguity remains non-authoritative support material.

## Enforcement boundary

The workflow can detect and report violations. It becomes **preventive** only when the target branch requires it.

Observed when this guard was designed:

- `master` was unprotected;
- repository rulesets were empty.

Therefore the repository-admin target state is deliberately small:

1. require a pull request before merging to `master`;
2. require status checks `collision-preflight`, `gitleaks`, and `public-surface-check`;
3. require branches to be up to date before merging;
4. block force-push/deletion of `master` unless a consciously chosen emergency bypass is required.

Until that repository-level rule is active, a red check is a strong decision signal but can still be bypassed by a writer/admin. Do not call this layer self-enforcing before that changes.

## Global-check diagnosis rule

A failing repository-global smoke/check is evidence that the candidate cannot yet merge; it is **not automatically evidence that the candidate caused the failure**.

Classify before modifying the harness or product:

1. candidate-reachable regression;
2. target-master regression or drift;
3. stale expectation;
4. timing/browser variance;
5. state/order coupling inside the failing probe;
6. unknown.

Reproduce on current target state where possible. Do not weaken assertions, raise timeouts, or redesign isolation merely to make a candidate green.

## Stop condition

This layer is sufficient when it prevents or clearly names the next real collision. Do not grow it into a scheduler, universal lock service, second queue, or new project-management surface.
