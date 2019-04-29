#!/usr/bin/env bash

PROJECT_NAME="Huan"
SCHEME_NAME="com.gethuan.huanapp"
UNSIGNED_PATH='./platforms/android/app/build/outputs/apk/debug/app-debug.apk'
SIGNED_PATH='./platforms/android/app/build/outputs/apk/debug/app-debug-signed.apk'
BUILD_TOOLS_VERSION='28.0.0-rc1'
STARTTIME=$(date +%s);

set -e
set -x

### Clear Previous Builds
echo "--- Clear Previous [Time Elapsed $(($(date +%s) - $STARTTIME))s]"

[ -e $UNSIGNED_PATH ] && rm $UNSIGNED_PATH
[ -e $SIGNED_PATH ] && rm $SIGNED_PATH

### Build
echo "--- Build [Time Elapsed $(($(date +%s) - $STARTTIME))s]"

ionic cordova build android 

### Sign APK
echo "--- Signing The Android APK [Time Elapsed $(($(date +%s) - $STARTTIME))s]"
echo Fear Of The Dark | jarsigner                   \
    -verbose                                           \
    -sigalg SHA1withRSA                                \
    -digestalg SHA1                                    \
    -keystore certificates/debug.keystore       \
    $UNSIGNED_PATH                                     \
    android

adb install -r $SIGNED_PATH
adb shell am start -n com.gethuan.huanapp/com.gethuan.huanapp.MainActivity

adb logcat | grep `adb shell ps | grep $SCHEME_NAME | cut -c10-15`
