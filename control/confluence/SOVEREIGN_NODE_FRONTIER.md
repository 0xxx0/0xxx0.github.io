# SOVEREIGN NODE / PROVIDER FRONTIER

Status: **PARKED / EXECUTABLE DONOR CONTRACT**  
Updated: 2026-09-21  
Recipient surfaces: **CONFLUENCE agent roles / Router-Policy / future sovereign-node execution**

## Why this packet exists

The useful residue from the Frontier Stack Watch / Mac mini local-cloud AI thread is not a new active project or another agent framework.

It is one bounded capability:

> **Own the contracts, policy, receipts and canonical state; keep models, media systems and agent runtimes replaceable.**

The current repo law still wins: CURRENT owns attention, RETURN closes authority, and provider/session state is never canonical truth.

## Transfer unit

Three provider boundaries are sufficient for the current architecture:

```text
DecisionProvider
MediaProvider
AgentExecutor
```

They share:

```text
typed request
→ provider adapter
→ typed result
→ ExecutionReceipt
→ durable filesystem / Git / event evidence
```

The interfaces are frozen under:

- `/control/contracts/sovereign-node/receipt.ts`
- `/control/contracts/sovereign-node/provider.ts`
- `/control/contracts/sovereign-node/decision.ts`
- `/control/contracts/sovereign-node/media.ts`
- `/control/contracts/sovereign-node/agent.ts`
- `/control/contracts/sovereign-node/index.ts`

These contracts contain no vendor imports.

## Provider readings

### DecisionProvider

Candidate adapters:

- local Ollama/Qwen
- rule engine / deterministic guard
- hosted decision systems when useful

Invariant:

**A model decision never equals permission.** Destructive or external action still crosses Router/Policy.

Fallback floor:

```text
hosted decision
→ local model
→ deterministic rules
→ ABSTAIN / REVIEW
```

Security and invalid-request failures must stop; they do not trigger automatic provider hopping.

### MediaProvider

Candidate adapters:

- Higgsfield or another remote media API
- local image/video generation
- deterministic ffmpeg/transcode/passthrough

Invariant:

**The artifact transformation is canonical; vendor job state is not.**

Fallback may degrade quality, but must return an explicit PARTIAL/ERROR receipt rather than silently changing semantics.

### AgentExecutor

OpenClaw and Hermes are treated as unequal adapters behind one boundary, not as project identity.

```text
AgentRunRequest
→ OpenClaw | Hermes | future worker
→ AgentRunResponse
→ proposed actions / artifacts / receipt
```

Current authority law:

- OpenClaw/Hermes may inspect, reason and propose within the granted scope.
- Irreversible actions require explicit policy authority.
- Canonical continuity remains files / Git / receipts.
- Deleting or replacing an agent framework must not erase project identity or learned durable state.
- A deterministic LocalTaskRunner remains the degraded floor beneath autonomous runtimes.

## Frontier Stack Watch role

The automated watch is a **scout**, not an execution queue.

It should report only developments that materially alter:

- compatibility;
- security;
- runtime behavior;
- deployment architecture;
- licensing/data boundaries;
- interoperability;
- pin/upgrade/rollback decisions;
- local-vs-cloud placement.

Useful watch output should compile into:

```text
WHAT CHANGED
→ WHY IT MATTERS HERE
→ ADOPT / TEST / WATCH / IGNORE
→ smallest bounded test
→ RETURN
```

Routine version churn stays suppressed.

## 72-hour proof donor

A previously specified proof sequence remains useful but is **not CURRENT**:

1. freeze machine/runtime/Nix state and record hashes/generations;
2. run OpenClaw and Hermes against the same sacrificial workspace/model/task corpus;
3. endurance-test the same Qwen serving path under increasing context;
4. kill/restart providers and prove continuity reconstructs from canonical files;
5. deliberately remove inference and verify visible failure with no silent cloud fallback.

This sequence should reopen only when a present control-plane decision requires evidence.

## Current disposition

**PARK / KEEP EXECUTABLE.**

Do not displace the current HUMAN PORT real-intake proof or other CURRENT work merely because AI-stack research is available.

Reopen when at least one is true:

1. Frontier Stack Watch reports a security/compatibility change that affects the installed node;
2. OpenClaw/Hermes must be selected or replaced for a real operation;
3. a current surface needs a decision/media/agent capability and the provider must be swappable;
4. canonical state is being trapped inside framework memory;
5. a local-vs-cloud inference decision needs measured latency/memory/tool-use evidence.

## Relation to CONFLUENCE

This is a donor packet, not ontology.

```text
FROM: Frontier Stack / sovereign-node research
TRANSFER: typed provider boundary + fallback + receipt law
TO: Router/Policy / executable local-cloud substrate
PRESERVE: canonical external state, explicit authority, graceful degradation
CHANGE: adapters/models/vendors may change freely
TEST: bounded bake-off or real recipient operation
RETURN: measured receipt / repo evidence
```

## RETURN

This thread has succeeded when future runtimes can be replaced without changing upstream project semantics, and a provider failure degrades capability without erasing state, fabricating success, or silently broadening authority.
