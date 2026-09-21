# BODY / Health Connect Reader 0.1

A deliberately small Android boundary for the existing BODY / FIT sensor envelope.

```
Health Connect
  ↓ explicit foreground READ_SLEEP + READ_HEART_RATE
BODY Bridge
  ↓ explicit SAVE JSON
0xxx0/body-sensor-bundle/v0.1
  ↓ user imports
/body/fit/
```

## What it does

- checks Health Connect availability;
- requests **read-only** access to `SleepSessionRecord` and `HeartRateRecord`;
- reads the last 36 hours only after an explicit tap;
- preserves Health Connect data origin, device, recording method, record ID and modification time;
- emits one `sleep.duration` observation per sleep session;
- emits source heart-rate samples without averaging;
- caps heart-rate export at the **5,000 newest samples**, declaring truncation in bundle metadata;
- saves through Android's document picker.

## What it deliberately does not do

- no `INTERNET` permission;
- no background health-data permission;
- no historical-data permission;
- no Health Connect write permission or API call;
- no Samsung-specific SDK dependency;
- no cloud/account;
- no automatic BODY / FIT mutation;
- no readiness/stress/sleep-score interpretation.

## Build

Pinned build line (2026-09-22):

- Android Gradle Plugin 9.4.0
- Gradle 9.6.0
- JDK 17
- compileSdk / targetSdk 36
- `androidx.health.connect:connect-client:1.1.0`
- `androidx.activity:activity-ktx:1.13.0`

Open this directory in current Android Studio, or with Gradle 9.6 available:

```sh
gradle :app:assembleDebug
```

Debug APK: `app/build/outputs/apk/debug/app-debug.apk`.

## First real proof

1. Install on the Android phone.
2. Open BODY Bridge.
3. Grant **Sleep** and **Heart rate** only.
4. Build the last-36-hours bundle.
5. Save JSON.
6. Open `/body/fit/` → **SENSE** → **IMPORT JSON FILE**.
7. Verify source/device attribution, timestamps, plausible counts and successful import.

No promotion beyond CANDIDATE until this real-device RETURN exists.

## Sources

- https://developer.android.com/health-and-fitness/health-connect/get-started
- https://developer.android.com/health-and-fitness/health-connect/read-data
- https://developer.android.com/reference/kotlin/androidx/health/connect/client/HealthConnectClient
- `/body/fit/health-connect.adapter.json`
- `/body/fit/sensor-observation.schema.json`
