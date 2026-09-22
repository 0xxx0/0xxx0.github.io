# SOVEREIGN NODE / RE-ENTRY

Paste this into Hermes, OpenClaw, Codex, Grok Build or another capable worker when the local/cloud stack needs to be resumed.

## ORIENTATION

You are entering an existing system. Do not invent a new sovereign-node architecture.

Read, in order:

1. `/control/CURRENT.json`
2. `/control/QUEUE.json`
3. `/control/SOVEREIGN_NODE_RUNTIME.json`
4. `/control/confluence/SOVEREIGN_NODE_FRONTIER.md`
5. `/control/contracts/sovereign-node/`
6. the exact active recipient surface, if one triggered this re-entry

Current laws:

- CURRENT owns attention.
- Conversion outranks coordination.
- Canonical truth = filesystem + Git + typed receipts + explicit RETURN.
- Provider/session/model memory is non-canonical.
- OpenClaw, Hermes and cloud coding harnesses are replaceable AgentExecutor implementations.
- Model × harness is the executor unit.
- Security / invalid-request / authority-denied failures STOP; never route around them.
- No silent cloud fallback.
- One bounded move → RETURN → replan.
- Do not run heavyweight downloads or migrations just to produce evidence.

## RECOVER

Determine:

```text
TRIGGER:
Why was this substrate reopened?

RECIPIENT:
Which current head / conversion needs it?

LIVE STATE:
What is actually installed/running now?

MISSING DECISION:
What single provider/runtime/configuration choice is unresolved?

MINIMUM PROOF:
What smallest reversible experiment resolves it?
```

Prefer current machine/repo evidence over chat history.

Do not reopen frontier research unless the installed state or recipient requirement makes it necessary.

## AVAILABLE PROOFS

Baseline only:

```bash
bash scripts/sovereign-node-freeze.sh
```

Neutral executor fixture:

```bash
python3 scripts/sovereign-node-bakeoff-init.py /tmp/sovereign-bakeoff
```

Ollama endurance:

```bash
python3 scripts/sovereign-node-qwen-endurance.py \
  --model <EXPLICIT_INSTALLED_TAG> \
  --context 32768 \
  --turns 100 \
  --out /tmp/qwen-endurance.jsonl
```

Do not assume those proofs are all required. Run only the proof that resolves the trigger.

## EXECUTE

Before using an autonomous executor, apply `/control/prompts/SOVEREIGN_NODE_EXECUTOR.md`.

For frontier research, apply `/control/prompts/SOVEREIGN_NODE_SCOUT.md`.

After the bounded move, compress it with `/control/prompts/SOVEREIGN_NODE_CONFLUENCE_RETURN.md`.

## STOP

If the trigger is resolved and no active conversion requires more work, park the substrate.

A successful re-entry may end with "no change required."
