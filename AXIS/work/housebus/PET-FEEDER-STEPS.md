# PET FEEDER → HOME ASSISTANT
Your own walkthrough · 2026-09-25 · read standing up, do it on your phone

Heads-up on evidence: [S#] markers point to the Sources list at the end. Claims are tagged
OBSERVED (measured on your machines), INFERRED (a reasonable assumption, not yet proven), or
UNRESOLVED (nobody knows yet). Nothing here touched your devices, and none of these steps
needs a Tuya developer account, a wiring kit, or a router setting.

---

## 0. THE STOP CONDITION — do this FIRST (under 2 minutes)

Before anything else, answer one question: **does the feeder pair in the Smart Life app?**

1. Install "Smart Life – Smart Living" (App Store / Play Store) if you don't have it.
   Sign in with **amyten@gmail.com** — the password is saved in your Hermes password vault
   ([S8]: "entry `tuya | amyten@gmail.com` loaded").
2. Put the feeder in pairing mode (per its manual — usually hold the button / open the lid
   until the light blinks) and tap **+ / Add device** in Smart Life.

Then, depending on what happens:

| What happens | Meaning | Go to |
|---|---|---|
| It pairs and shows online | It is Tuya-family. This whole walkthrough applies | Section 2 ✅ |
| It is found but the app says **"already registered to another account"** | The previous owner's binding — the exact CATLINK trap. NO cloud route works, including this one. Fix = the serial/device number printed on the unit or box → seller or vendor support un-binds it ([S5]) | STOP, Section 4 |
| It only works in a **different app** (name on the box) | NOT a Tuya device | STOP, Section 4 |
| No app finds it at all | It may not be Wi-Fi at all — its own buttons/timer are the whole story | STOP, Section 4 |

Also glance at: on any device on your home Wi-Fi, open a browser and go to
**http://homeassistant.local** — if nothing loads, the Home Assistant machine is switched off
(check VirtualBox); the rest of this walkthrough needs it on.

---

## 1. WHAT YOU HAVE

**The three feeders (recorded, not yet proven):** one **6-meal automatic feeder** and two
**dry-food feeders**, "being commissioned now" — that is the premise your own earlier
reconnaissance was started on ([S2]). That's it. No box, manual, or photo exists on disk that
names them, so:

- **"Tuya-branded" is an assumption** (INFERRED — "commissioned from the same vendor family as
  the existing litter boxes", [S1]). It is probably right and is NOT yet proven.
- **The only named candidate anywhere:** the 6-meal unit *might* be a Catit Pixi 6-Meal or a
  rebadge of it — a hypothesis, not a fact ([S3, line 154]).
- **Nothing feeder-shaped has EVER appeared on your home network**: 143 Tuya LAN scans across
  July 9 – Sep 25, 2026, found 6 device types, none of them a feeder ([S3, line 137], [S2
  feeder_evidence]). They have never been powered on and paired, so their true identity is
  decided at the moment of first pairing — which is exactly what Section 0 does.

**What makes this nearly free for you (all OBSERVED):**
- Home Assistant is **running right now**: the "Home Assistant" virtual machine is up on your
  Mac ([S9]); the Tuya connection in it is already signed in as amyten@gmail.com with **41
  devices** already imported ([S8]).
- HA already understands feeders on this account type: **"set feeder meal plan"** and **"get
  feeder meal plan"** are built-in actions ([S3, lines 146-147], [S6, lines 16-17]).

---

## 2. THE FASTEST PATH — pair once, then Home Assistant just sees it

Why this is the shortest route: zero new accounts, zero installs, zero wiring. Home Assistant's
Tuya connection only ever shows devices that are already in the Smart Life account ([S6, line
11]) — so the app is needed **once, for pairing, and never again for daily use** ([S4]). Steps:

**Step 1 — Pair each feeder in Smart Life** (logged in as amyten@gmail.com).
Do this for all three, one at a time.
- SEE IF IT WORKED: each feeder appears in the Smart Life app's device list, marked online.
- IF NOT: see the STOP CONDITION table (Section 0) — this is where a non-Tuya or
  bound-to-someone-else unit reveals itself.

**Step 2 — Refresh Home Assistant's device list.**
On the HA screen: **Settings → Devices & Services → Tuya → ⋮ (three dots) → Reload** ([S3,
lines 144-145], [S6, lines 13-15]).
- SEE IF IT WORKED: the device count on the Tuya card goes up; the feeder appears, named as you
  named it in the app. Usually within seconds; scenes arrive later on their own.
- IF NOT: wait ~1 minute, Reload again. If still absent, confirm the feeder shows "online"
  in Smart Life (a phone on different Wi-Fi or with low battery can hide it). If it is online
  in the app but still missing after two reloads: delete the Tuya entry (three-dot → Delete)
  and re-add it (Add Integration → Tuya → sign in with the same email). This is safe and
  reversible — it re-reads the same account; nothing gets re-paired.

**Step 3 — Find your feeder in HA.**
Use the search bar at the top of any HA screen and type its name (or part of it).
- SEE IF IT WORKED: the feeder's card shows things like battery, last meal, meal plan, and a
  manual-feed control for units that have one.
- IF NOT: it's in the account but HA shows **"Feeder not supported"** or the card is empty →
  that's a coverage gap in the cloud route, not your mistake → Section 3, option A.

**Step 4 — Prove it once, supervised.**
First real test: from Home Assistant, use the feeder's manual-feed control with a small
portion, standing next to it — or set a meal plan via **Developer Tools → Actions →
"set feeder meal plan"** ([S3, lines 146-147]). Watch it actually dispense before trusting any
automation with it. (House rule: mechanisms are only ever told to act when you're around to
watch, at least at first.)

That's the whole route. Afterwards: when you want schedules/notifications wired in, tell the
housebus people the feeders are in — nothing else is needed from you.

---

## 3. THE ALTERNATIVES — honest costs, and when each is worth it

**A. Local control (tuya-local) — same pairing, no cloud dependency for daily use.**
Cost: this HA install has no add-on tooling installed yet (no HACS, no SSH/Samba — [S7, line
25], [S10]), so installing this custom component is an afternoon's work plus a HA backup first.
It then reads each feeder directly on your Wi-Fi (needs a one-time handshake with the Smart
Life QR tool — no developer account, [S7, line 108]). Good news: it has ready-made support for
43 dry-pet-feeder types and the Catit Pixi 6-Meal ([S3, lines 153-157]).
**Do not do this unless:** the cloud route said "Feeder not supported", or you specifically
want feeding to work when the internet is down. (Caveats: one local connection per device; a
future re-pair silently changes the handshake key.)

**B. ESPHome module swap — fully local forever, and REVERSIBLE.**
Open the feeder, silence its Wi-Fi chip with a single jumper wire (EN pin to ground — no
desoldering), and connect a ~S$15 ESP32 board to the feeder's two brain-wires, powered from the
feeder's own USB port. Proven recipe on a real Tuya cat feeder ([S3, lines 160-162]); the
feeder's built-in schedule keeps working even with no network.
Cost/risk: opening the unit, 1-2 hours per feeder, some fiddly wiring, an ESP32 each;
if your feeder's chip is a different generation the recipe needs adapting. Fully reversible —
remove the jumper and the feeder is stock again ([S4]).
**Do not do this unless:** you're comfortable opening the feeder AND both routes above are
unsatisfactory. It is the durable endgame if you ever want zero dependence on Tuya's cloud.

**C. tuya-cloudcutter — do not.**
A tool that strips the vendor cloud off the chip **permanently** — you forfeit the official
app and cloud for that unit forever, no going back ([S3, line 163]). It also needs a Linux
machine with a second Wi-Fi adapter and Docker, plus old (pre-2022, unpatched) firmware in the
unit; **a Mac cannot do this** ([S4]).
**Do not do this unless:** you are certain you never want the vendor app/cloud for that unit
again AND you have a Linux box for the job. Never as a first step.

---

## 4. THE STOP CONDITION, stated once

Everything above assumes one fact, checked in under two minutes: **the feeder pairs in the
Smart Life app under amyten@gmail.com.** If it refuses:
- **"Already registered to another account"** → it belongs to someone else's Cloud record; no
  app or tool in this walkthrough will ever see it. The only door is the device number on the
  unit/box → seller or vendor support ([S5]).
- **It only uses a different vendor's app** → it is not Tuya; the whole approach is wrong for
  it. Stop, note the brand from the box, and ask for that vendor's route — many have their own
  Home Assistant plug-in, which would be the new fastest path.
- Do NOT reset-loop, re-pair repeatedly, or power-cycle it hunting for a fix — those don't
  clear a binding ([S4]) and they waste your evening.

---

## 5. WHAT COULD NOT BE DETERMINED (UNRESOLVED)

- **Brand/model of the three feeders.** Only candidate: 6-meal ≈ Catit Pixi family (hypothesis,
  [S3:154]). The two dry feeders have no candidate at all. Nothing on disk names them.
- **That they are genuinely Tuya.** "Almost certainly Tuya" (INFERRED, [S1]) is unproven — the
  LAN has never seen them because they've never been powered on. First pairing settles it.
- **Where the "three feeders" count came from.** No message from you about the feeder exists in
  the saved sessions I searched ([S2] is the earliest record). If it's actually one feeder, or
  four, the steps are identical — only the count changes.
- **HA's exact current address.** `homeassistant.local` now resolves to 192.168.68.60
  (measured this session) while the housebus ledger records .57 verified the same day
  ([S7:99]). Use the *name*, never an IP — and the port is 80, not 8123 ([S3 §6]). I could not
  re-probe the page myself (network probing needs your approval and none was granted), so
  confirm reachability with the Section 0 glance.
- **A small landmine found on disk:** the VM's saved disk path points at an emptied folder; the
  live disk is actually being served from `void-anchor/delete/crushed-20260923/` ([S9]). HA
  runs fine now, but if it's ever powered off it may refuse to start until that path is
  re-attached. Not your job today — flagged so it isn't a surprise.
- **Which product codes the feeders will report** — unknown until pairing; so whether cloud
  support will be complete ("Feeder not supported") can't be pre-answered. Pairing + Step 2
  answers it.
- **Scope note:** the MQTT question from earlier was resolved separately (integration loaded,
  entities declared, [S7:101-102]) and is not part of the feeder route — MQTT is not used here.

---

## Sources

- [S1] `~/.hermes/profiles/kestrel/cache/delegation/subagent-summary-3-20260925_143146_089305.txt:3` — lane report: three feeders, "almost certainly Tuya-branded".
- [S2] `~/.hermes/profiles/kestrel/cache/delegation/live/deleg_3a62f9f5/task-3.log:6` — kickoff premise: 6-meal feeder + two dry-food feeders "being commissioned now".
- [S3] `~/void-anchor/AXIS/work/SURVEY-2026-09-25-household-integration.md` — §5 (lines 135-164): LAN absence, route, Catit Pixi config, alternatives; §6 (167-190): MQTT.
- [S4] `~/src/housebus/receipts/2026-09-25/Q-catlink-answer-and-live-presence.md` — lines 150-156 binding trap; 170 cloudcutter (Linux-only, irreversible); 171 ESPHome EN→GND reversible.
- [S5] `~/src/housebus/STATUS.md:29` — CATLINK-style binding: factory reset does not clear it; unbind via printed device number.
- [S6] `~/.hermes/profiles/kestrel/skills/consumer-iot-adoption/references/tuya-routes.md:11-21` — cloud route coverage, reload sequence, feeder actions, "Feeder not supported" meaning.
- [S7] `~/src/housebus/STATUS.md` — :15 login cleared; :25 HACS blocked; :83 gate cleared, 41 devices; :99 address .57 verified; :100 feeder route (no new gate); :101-102 MQTT resolved; :108 QR local-key tool, no developer account.
- [S8] `~/src/housebus/STATUS.md:83` (+ housebus skill notes) — Tuya gate cleared, 41 devices.
- [S9] measured this session (2026-09-25): `VBoxManage list runningvms` → VM `Home Assistant` running; `lsof` → 4.76 GB disk open at `~/void-anchor/delete/crushed-20260923/Downloads__housebus__haos_generic-aarch64-18.3.vdi`; `Home Assistant.vbox` still points at the emptied `~/Downloads/housebus/` path; `dscacheutil` → `homeassistant.local` = 192.168.68.60.
- [S10] `~/src/housebus/receipts/2026-09-25/Q-catlink-answer-and-live-presence.md:111-116` — no HACS / SSH / Samba on this HAOS, so custom components carry a real install cost.