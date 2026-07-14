# Generating a release keystore

Play Store releases must be signed with your own keystore, not the shared
debug keystore. **Back this keystore and its passwords up somewhere durable
(password manager, encrypted drive) the moment you create it.** If you lose
it before enrolling in Play App Signing, you cannot publish an update to this
app under the same listing ever again.

## 1. Generate the keystore

From the `android/` directory:

```
keytool -genkeypair -v -storetype PKCS12 -keystore release.jks -alias card-to-contacts -keyalg RSA -keysize 2048 -validity 10000
```

`keytool` will prompt for a store password, a key password, and your
name/org details (these go on the certificate, not into the app). Keep the
`.jks` file itself out of git -- it's already gitignored.

## 2. Wire it up locally

Copy `android/keystore.properties.example` to `android/keystore.properties`
(also gitignored) and fill in the real `storePassword` / `keyPassword` you
just chose, plus the `storeFile` path (`release.jks` if you generated it
directly in `android/`).

Once that file exists, `./gradlew bundleRelease` / `assembleRelease` will
sign with it automatically -- `android/app/build.gradle` falls back to the
debug keystore when `keystore.properties` is absent, so local debug builds
are unaffected either way.

## 3. Building the release bundle for Play Console

Play Console expects an Android App Bundle, not an APK:

```
cd android
./gradlew bundleRelease
```

The output lands at `android/app/build/outputs/bundle/release/app-release.aab`.

## 4. Play App Signing

When you create the app in Play Console, opt into **Play App Signing**
(the default for new apps). You upload your release build signed with the
key above (the "upload key"), and Google re-signs it with a separate key it
manages for distribution. If you ever lose the upload key after that point,
Google support can help you reset it -- losing it is far less catastrophic
than losing an unmanaged signing key.
