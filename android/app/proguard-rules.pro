# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# ML Kit's on-device text recognition loads model/OCR classes reflectively,
# so R8 must not strip or rename them.
-keep class com.google.mlkit.vision.text.** { *; }
-keep class com.google.mlkit.vision.common.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_text_common.** { *; }

# react-native-contacts and react-native-view-shot marshal plain data objects
# across the bridge by field name; keep those from being renamed.
-keep class com.rt2zz.reactnativecontacts.** { *; }
-keep class fr.greweb.reactnativeviewshot.** { *; }
