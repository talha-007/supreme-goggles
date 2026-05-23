# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Expo Contacts / Expo Modules Kotlin runtime classes referenced at runtime.
-dontwarn expo.modules.kotlin.records.formatters.FormattedRecord
-dontwarn expo.modules.kotlin.records.formatters.Formatter$Builder
-dontwarn expo.modules.kotlin.records.formatters.Formatter
-dontwarn expo.modules.kotlin.records.formatters.FormatterKt
-dontwarn expo.modules.kotlin.records.formatters.PropertySelector$ActionBuilder
-dontwarn expo.modules.kotlin.runtime.Runtime
-dontwarn expo.modules.kotlin.types.AnyTypeCache
-dontwarn expo.modules.kotlin.types.OptimizedRecord
-dontwarn expo.modules.kotlin.types.descriptors.RawTypeDescriptor
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptor
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptorKt
-dontwarn expo.modules.kotlin.types.descriptors.TypeDescriptorOfKt

# Add any project specific keep options here:
