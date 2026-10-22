# HOUSEOS fold — 2026-10-18

Verdict: `sh ops/selftest.sh` → `RESULT: PASS`, exit 0 — in the working repo AND a fresh `git clone`
(no `.venv`, no `runtime/`, no network). HA 2026.9.3, 121 states (the HAOS VM was powered off; started headless).

## Capabilities — `python3 scripts/capabilities.py` (offline, stdlib; 36 objects, 19 distinct capabilities)

| capability | objs | avail | locality | | capability | objs | avail | locality |
|---|---|---|---|---|---|---|---|---|
| power | 19 | 4 | CLOUD | | preset / speed / timer | 5 ea | 3 | CLOUD |
| brightness / color_temp | 16 ea | 2 | CLOUD | | sensors / telemetry / setting | 3/2/2 | 2/2/2 | MESH |
| scene_trigger | 9 | 9 | CLOUD | | mesh_peer | 2 | 2 | MESH |
| button, button_input, diagnostic, adb, camera, microphone, mqtt_publish, resource_observation | 1–2 ea | mostly 0 | CLOUD/MESH | | kinds | fixture 18 · scene 9 · device 3 · node 3 · mechanism 2 (quarantined) · signal 1 | | |

Headline: **every actuating capability is CLOUD-locality; MESH is observation only.** Dropping cloud
dependency = local keys (DECISIONS D5; receipt Q §8 QR tool, no developer account needed).

## Dependencies
- **Dropped:** `ops/selftest.sh`'s hard requirement on the machine-local, gitignored `.venv` — a fresh
  clone failed every python check before it started. Now `HOUSEBUS_PY` > `.venv` > `python3`.
- **Named:** `requirements.txt` records PyYAML as the repo's ONLY non-stdlib dep (`house-objects.py`,
  `project-public.py`); everything on the critical path is stdlib-only.
- **Kept deliberately:** PyYAML (dropping it = writing a YAML parser = bloat), host Mosquitto (D4),
  tuya-local as the intended control transport (D5).

## Portability moves
- Replay fixtures moved from gitignored `runtime/` to tracked `ops/fixtures/` — policy/intent checks
  had no inputs on a clone.
- `load_projection()`'s live-HA fallback now degrades to an empty projection instead of crashing the
  replay path when the VM is down (it silently hit the network before).
- Existing name-first addressing (`homeassistant.local`, env-overridable, receipt V) held up unchanged.

## Commits (~/src/housebus, `main`)
`4d82dc9` capabilities.py + interpreter fallback + requirements.txt · `0b161e2` tracked replay fixtures ·
`915ba28` offline-safe projection fallback · `b81a3cb` receipt X + STATUS row.

## References (verified 2026-10-18)
- Areas model — https://www.home-assistant.io/docs/organizing/areas/ (floor→area→device→entity spatial grouping; mirrors `house-state/v1` areas block)
- Blueprints — https://www.home-assistant.io/docs/blueprint/ (parameterized reusable automation templates = capability abstraction over device ids)
- ESPHome packages — https://esphome.io/components/packages/ (reusable device-config packages; the provisioning primitive for the deferred ESPHOME_FLEET lane)