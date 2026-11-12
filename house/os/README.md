# HOUSE OS — minimal seam

HOUSE OS is not another home-automation runtime. Home Assistant / HOUSEBUS remains the private device/runtime layer. HOUSE owns only the durable semantic and evidence layer above it.

## Six nouns

1. **OBJECT** — stable HOUSE identity.
2. **RELATION** — spatial/semantic relationship between objects.
3. **CAPABILITY** — typed readable or actionable affordance.
4. **OBSERVATION** — timestamped evidence about a capability/world state.
5. **INTENT** — requested transformation, separate from observed state.
6. **RECEIPT** — evidence describing what an attempted transformation actually did.

Everything else is either runtime machinery or a projection/plugin.

```text
SOURCE
  -> OBSERVATION
  -> HOUSE STATE
  -> PROJECTION
  -> INTENT
  -> POLICY
  -> ADAPTER
  -> WORLD
  -> OBSERVATION + RECEIPT
  -> RETURN
```

## Files

- `manifest.json` — normative boundary and module map.
- `core.js` — pure zero-dependency kernel. No network or UI.
- `core.test.js` — identity/state/freshness/reconnect/replay/receipt tests.
- `ha-adapter.contract.json` — required behavior of the HA boundary.
- `ha-adapter.js` — injected HA transport shell; defaults to `shadow`.
- `ha-adapter.test.js` — proves read, shadow, act and explicit confirmation behavior.
- `handoff.json` — resumable second-operator/agent packet.

Run:

```sh
node house/os/core.test.js
node house/os/ha-adapter.test.js
```

No package install is required.

## Existing HOUSE assets

Keep `/house/` as the canonical human entry. Keep `/house/expert.html` for deep maintenance/runtime inspection and `/house/spatial/model.json` as the spatial substrate.

Treat DESIGN, REALITY, CARE, CREW, HUMAN HARNESS and CONFLUENCE as optional projections, coordination plugins or lineage maps. They may read/transform kernel state but do not enlarge kernel authority.

This allows deletion or replacement of any one projection without changing HOUSE identity or runtime bindings.

## Home Assistant binding

A private binding is explicit:

```js
{
  house_id: 'house.study.fan',
  capability: 'power',
  entity_id: 'fan.study',
  decode: state => state.state === 'on',
  command: intent => ({
    domain: 'fan',
    service: intent.value ? 'turn_on' : 'turn_off',
    entity_id: 'fan.study'
  })
}
```

The `entity_id` is an adapter alias. `house.study.fan` is the durable identity.

The public repository must not contain HA tokens, LAN endpoints, sensitive topology or presence history. A private runtime supplies an injected `transport` implementing the small operations needed by `ha-adapter.js`.

## Promotion path

### 1. READ

Bind 10 existing devices/capabilities. Normalize runtime state into observations and availability. Record private replay fixtures.

Pass condition: restart/reconnect reconstructs the same HOUSE projection without semantic repair.

### 2. SHADOW

Compile a few low-risk light/fan intents. Emit `WOULD_SEND`; send nothing.

Pass condition: exact intended HA operation is inspectable, deterministic and receipt-backed.

### 3. ACT

Explicitly allowlist individual capabilities. An HA service acknowledgement becomes `SENT`, not `CONFIRMED`; confirmation requires subsequent runtime/world evidence.

Pass condition: manual controls and HOUSE actions converge rather than fight, and failure is explainable from one trace.

## Second operator / agent takeover

Give the next operator or agent this repository/branch and tell it to read `house/os/handoff.json` first.

It can continue public-code work without private conversational context. To inspect or operate the actual home, the runtime owner must separately grant the agent appropriate private HA/HOUSEBUS access; this repository deliberately cannot confer that authority.

The desired operator behavior is:

```text
read handoff
-> preserve six-noun kernel
-> locate first unproven next_move
-> inspect/test/implement
-> return evidence + blockers + changed files
-> request a human/world input only when the handoff marks a real gate
```

Do not re-explain the entire HOUSE lineage before every task.

## Compression rule

Before adding any subsystem, ask:

> Can this be a binding, observation, intent, receipt, relation, or projection?

If yes, do that. If no, prove why the kernel is insufficient before expanding it.
