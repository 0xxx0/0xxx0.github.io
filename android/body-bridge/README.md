# BODY BRIDGE 0.1 — Health Connect proof reader

One job only:

```
Health Connect
→ READ_SLEEP + READ_HEART_RATE
→ last 48h SleepSessionRecord
→ HeartRateRecord only inside those sleep intervals
→ 0xxx0/health-connect-export/v0.1
→ explicit local JSON file
→ BODY / FIT IMPORT JSON / HEALTH CONNECT
```

No account, server, background worker, analytics, cloud transport, diagnosis, scoring or Health Connect write permission.

## Build

Pinned toolchain:

- Android Gradle Plugin 9.4.0
- Kotlin support: built into Android Gradle Plugin 9.4.0
- JDK 17
- compile/target SDK 36
- `androidx.health.connect:connect-client:1.1.0`

The repository does not commit the binary Gradle wrapper JAR. With Gradle 9.6 available:

```sh
cd android/body-bridge
gradle wrapper --gradle-version 9.6.0
./gradlew :app:assembleDebug
```

Or open this directory in current Android Studio and create/use a Gradle 9.6 wrapper.

APK after a successful debug build:

`app/build/outputs/apk/debug/app-debug.apk`

## Phone proof

1. In Samsung Health, enable its Health Connect synchronization.
2. Install BODY BRIDGE.
3. Tap **GRANT SLEEP + HEART RATE READ** and grant only those two categories.
4. Tap **READ 48H SLEEP + HR INSIDE SLEEP**.
5. If the summary looks plausible, tap **EXPORT LOCAL JSON**.
6. Open FIELD → BODY / FIT → SENSE → **IMPORT JSON / HEALTH CONNECT** and select the exported file.
7. Verify the imported rows retain source package, device/watch identity, effective timestamps, units and provenance.

If no sleep sessions appear, first verify Samsung Health → Settings → Health Connect is syncing; do not broaden permissions as a debugging shortcut.

## Stop condition

The proof is complete when one real export imports into BODY / FIT with:

- ≥1 sleep session,
- associated heart-rate samples when Health Connect has them,
- source package retained,
- watch/phone device class retained when Health Connect supplies it,
- no write permission,
- no raw personal data committed to this public repository.

Only after that proof should automatic local relay or additional record types be considered.
