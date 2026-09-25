# FOLD//BLOOM SABER — CRYSTAL / 2026-09-24

Status: **0.1 IMPLEMENTED · WAITING ON TWO REAL PHONES**
Authority: FOLD//BLOOM AUDIO MAP + EVENT TAPE + exact source identity
Implemented in 0.1: LISTEN handoff → SABER course → host+local hand → direct WebRTC opposite-hand controller → bounded HIT TRACE. Real-device play quality remains unproven.

## Correction preserved

Beat Saber export is not the same thing as Beat Saber **inside FOLD//BLOOM**.

The intended in-family game is:

**SOURCE → AUDIO MAP → EVENT TAPE → SABER COURSE → PHONE MOTION → HIT TRACE → RETURN**

Two ordinary phones may act as LEFT / RIGHT sabers. A laptop/TV/browser may render the shared course, but is not required as a new source authority.

## Non-negotiable boundaries

- No second audio/source store.
- Do not infer absolute 3-D position from phone IMUs; use bounded swing/orientation evidence.
- Source timing comes from the existing transport/event tape.
- Controller motion is ephemeral input; HIT TRACE is the durable authored/performance evidence.
- Beat Saber pack export remains a separate external adapter.
- No cloud relay is required for the first proof.
- Do not claim gameplay quality until two real phones are used.

## Controller envelope v0

Each phone emits a small monotonic stream:

```
SABER_SAMPLE {
  sessionId
  hand: LEFT | RIGHT
  seq
  clientTime
  orientation: { alpha, beta, gamma }?
  rotationRate: { alpha, beta, gamma }?
  acceleration: { x, y, z }?
  accelerationIncludingGravity: { x, y, z }?
}
```

The host/session clock estimates offset/drift. Raw motion need not be retained after deriving bounded swing witnesses.

## Play law

A note is an addressed event, not a decoration.

```
EVENT_TAPE note
  → expected hand / lane / direction
  → local motion witness
  → time-window + direction relation
  → HIT / GRAZE / MISS
  → haptic / visual / sound consequence
  → bounded HIT TRACE
```

Do not score “skill” globally from one motion heuristic. First prove that swings feel causally aligned with source events.

## Pairing

Preferred first implementation:

1. One browser becomes HOST.
2. LEFT and RIGHT phone pages join a short-lived session.
3. Pairing exchanges only session/clock/controller data.
4. WebRTC DataChannel is preferred for motion after pairing.
5. If static GitHub Pages cannot provide ergonomic signaling without another service, use an explicit temporary pairing exchange rather than smuggling in a permanent backend.
6. Hermes/private relay may later simplify signaling, but is not required by the instrument law.

## First playable proof

Use one mapped local/source-backed track.

Acceptance:

- two phones can identify LEFT / RIGHT;
- both motion streams reach one session clock;
- at least 30 scheduled note events render from the existing EVENT TAPE;
- visible/haptic hit response occurs within a tolerable human window;
- pausing/resuming transport does not corrupt note address;
- disconnecting one phone degrades to one-saber mode rather than corrupting source state;
- RETURN records source id, event-tape id/version, controller roles, hit timestamps and misses without raw continuous sensor retention.

## Later, only if the proof works

- phone-as-saber calibration gesture;
- local latency calibration;
- haptic pulse grammar;
- arc/chain note projection;
- FOLD / BLOOM / SPLIT / RETURN special note grammar;
- one-phone fallback;
- headset / desktop / TV projection;
- PWA install and user-selected local playlists/folders;
- shared session packets for friends.

## PWA / local music boundary

A future installable PWA can make local use much smoother: user-selected files, multiple-file/playlist intake, browser-local remembered media, offline shell, and optional folder/playlist handles where the browser grants them.

It must not claim silent access to a person's device music library. User permission remains the source boundary.

## Stop condition

Do not build a multiplayer backend, new media catalogue, or elaborate scoring system before the two-phone motion + shared-clock proof works.


## 0.1 implementation receipt

- Route: `/fold-bloom/saber/`
- LISTEN `USE TRACK → SABER · TWO PHONES` carries exact source identity, existing EVENT TAPE and addressed marks in a session-local handoff.
- Host reopens exact local source bytes only through the existing `fold-bloom-local-media-v1` vault.
- Phone A may be HOST+LEFT or HOST+RIGHT.
- Phone B joins as the opposite hand using direct WebRTC DataChannel with explicit manual offer/answer exchange. Public STUN may assist peer discovery; no permanent application relay is introduced.
- Ping/Pong estimates controller→host monotonic clock offset/RTT.
- DeviceMotion samples are never appended to durable state. The runtime derives bounded swing witness → HIT/GRAZE/MISS and discards the raw sample.
- JSON RETURN records source/event-tape/course identity, roles, counts and bounded hit trace only.

The next gate is physical, not architectural.
