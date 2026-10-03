# PUBLIC COORDINATION / COLLISION CONTROL

Role: **non-authoritative merge guard**.

This directory does not own project state, priority, runtime truth, or execution permission. Those remain with `control/CURRENT.json`, `showcase-manifest.json`, native release metadata, and `returns/`.

## Failure classes this guard addresses

The repository is active enough that collisions are not only textual Git conflicts:

- two PRs can mutate one serialized authority/runtime boundary through different files;
- a branch can remain green while `master` changes underneath it;
- repository-global checks can fail for reasons outside a candidate diff, including stale expectations, timing, compound-probe order/state, or current-head drift;
- private ancestry can be mistaken for newer public runtime truth;
- coordination prose or receipts can accidentally become a second control plane.

## Collision classes

1. **Moving-base hard candidate — FAIL.** A candidate touching serialized hard authority must rejoin current base before merge.
2. **Moving-base exact-file overlap — FAIL.** The target branch changed a file the candidate also changes.
3. **Moving-base hard-domain overlap — FAIL.** Target movement touched the same serialized authority/runtime boundary through another file.
4. **Ordinary base drift — WARN.** Unrelated target movement is chronology, not automatic invalidation; the merge-result checks still decide correctness.
5. **Moving-base soft-domain overlap — WARN.** Reinspect the native host boundary but do not invent a global lock.
6. **Open-PR exact-file collision — FAIL.** Two open PRs change the same file.
7. **Open-PR hard-domain collision — FAIL.** Two open PRs mutate one serialized boundary (`CURRENT`, public registries, FIELD root/shared carrier).
8. **Open-PR soft-domain collision — WARN.** Two PRs touch the same native host family but may still be independent.
9. **Public-boundary violation — FAIL.** A PR introduces a path reserved for private/secret material.
10. **Missing transaction claim — WARN**, except on hard domains where it fails.

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
stop: merge-result checks pass and the named capability is exposed
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
- When `master` moves, classify what changed before replaying work.
- Rejoin current base when exact files or hard authority overlap; ordinary disjoint movement may remain a warning if the synthetic merge-result checks are green.
- Hard-domain overlap means converge, sequence, supersede, or close; do not race two truths.
- Soft-domain overlap means inspect the actual functional boundary; do not invent a global lock.
- Unique receipts and confluence notes do not collide merely because they share a directory.
- A coordination artifact that changes no capability and resolves no live ambiguity remains non-authoritative support material.

GitHub `pull_request` workflows check out a synthetic merge ref against the PR event's base. That merge-result proof is valuable, but a later target-branch movement can still occur after the check. The guard therefore classifies moving-base impact rather than equating every newer commit with semantic invalidation.

## Enforcement boundary

The workflow can detect and report violations. It becomes **preventive** only when the target branch requires it.

Observed when this guard was designed:

- `master` was unprotected;
- repository rulesets were empty.

Repository-admin target state for this current user-owned high-churn repo:

1. require a pull request before merging to `master`;
2. require status checks `collision-preflight`, `gitleaks`, and `public-surface-check`;
3. do **not** blindly require strict tip equality for every ordinary PR while frequent disjoint receipt/runtime work is landing; serialize the named hard domains and use the impact-aware guard + merge-result checks;
4. block force-push/deletion of `master` unless a consciously chosen emergency bypass is required.

A merge queue would be the cleaner eventual serialization mechanism for a busy branch, but GitHub's current merge-queue availability does not apply to this user-owned public repository. Revisit if repository ownership/topology changes; do not design today's workflow around an unavailable feature.

Until repository-level required checks are active, a red check is a strong decision signal but can still be bypassed by a writer/admin. Do not call this layer self-enforcing before that changes.

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
