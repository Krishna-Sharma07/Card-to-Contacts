# Generating a release keystore

Play Store releases must be signed with your own keystore, not the shared
debug keystore. **The moment you create it, back up the `.jks` file and the
two passwords somewhere durable** (password manager, encrypted drive). If
you lose them before enrolling in Play App Signing, you can never publish an
update to this app under the same listing again.

Run the commands below yourself in your own PowerShell window, not through
Claude -- `keytool` interactively prompts for passwords and identity details
that only you should be typing.

## 0. Prerequisite: use a JDK Android's tooling actually supports

This machine's default `java` is JDK 24, which is too new for the Android
Gradle Plugin's native build step (`bundleRelease`/`assembleRelease` fail
with a CMake/prefab error on it). Android Studio ships a working JDK 21 you
can point Gradle at instead, without changing your system-wide Java.

This is **not a command you run by itself** -- it's an extra argument you
tack onto the end of every `.\gradlew.bat ...` command in this guide, like
so:

```powershell
.\gradlew.bat bundleRelease "-Dorg.gradle.java.home=C:\Program Files\Android\Android Studio\jbr"
```

Every full `gradlew` command further down already has this included --
just make sure you don't drop it if you retype one. If Android Studio is
installed somewhere else on your machine, adjust that path. `keytool`
itself (step 1) isn't affected by this issue and can use whatever `java`
you already have.

## 1. Generate the keystore

Open PowerShell, `cd` into this project's `android` folder, then run:

```powershell
cd "D:\web projects\Card to Contacts\android"
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -storetype PKCS12 -keystore release.jks -alias card-to-contacts -keyalg RSA -keysize 2048 -validity 10000
```

If plain `keytool` worked for you, that's fine too -- use whichever you have.
If Android Studio is installed elsewhere, adjust the path.

`keytool` will ask you for, in this order:
1. A **keystore password** (used twice, to confirm) -- this becomes `storePassword`.
2. Your name, organizational unit, organization, city, state, and two-letter
   country code -- these go on the public certificate, not into the app
   itself. Answering with just your name and pressing Enter through the
   rest is fine.
3. Whether the details are correct -- type `yes`.
4. A **key password** for the `card-to-contacts` alias -- press **Enter** to
   reuse the keystore password, or type a different one. This becomes
   `keyPassword`.

`-validity 10000` is ~27 years, comfortably past Play Store's minimum
required certificate validity (October 2033). This creates
`android/release.jks` -- it's already covered by `.gitignore` (`*.jks`), so
`git status` should **not** show it as a new file. If it does, stop and
check your `.gitignore` before committing anything.

## 2. Wire it up locally


```powershell
Copy-Item "android\keystore.properties.example" "android\keystore.properties"
```

Open `android/keystore.properties` and fill in the three blanks with what
you just chose in step 1:

```properties
storeFile=release.jks
storePassword=<the keystore password from step 1.1>
keyAlias=card-to-contacts
keyPassword=<the key password from step 1.4 (same as storePassword if you just pressed Enter)>
```

`storeFile` is relative to the `android/` folder, so `release.jks` is
correct as-is if you generated it there like step 1 shows. This file is
also gitignored (`android/keystore.properties` is listed explicitly) --
confirm it doesn't show up in `git status` either.

## 3. Build the release bundle for Play Console

Play Console expects an `.aab` (Android App Bundle), not an APK:

```powershell
cd "D:\web projects\Card to Contacts\android"
.\gradlew.bat bundleRelease "-Dorg.gradle.java.home=C:\Program Files\Android\Android Studio\jbr"
```

The output lands at
`android/app/build/outputs/bundle/release/app-release.aab`.

### Verify it's actually signed with your keystore, not the debug one

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -list -v -keystore release.jks -alias card-to-contacts | Select-String "SHA256"
```

Compare that SHA256 fingerprint against the one Play Console shows for the
upload you make -- they should match. If the build silently fell back to
the debug keystore (e.g. because `keystore.properties` has a typo or wasn't
found), this fingerprint will instead match the well-known public debug
certificate, which Play Console will reject.

## 4. Play App Signing

When you create the app in Play Console, opt into **Play App Signing**
(the default for new apps). You upload your release build signed with the
key above (the "upload key"), and Google re-signs it with a separate key it
manages for distribution. If you ever lose the upload key after that point,
Google support can help you reset it -- losing it is far less catastrophic
than losing an unmanaged signing key.
