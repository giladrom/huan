#!/usr/bin/env bash

PROJECT_NAME="Huan"
SCHEME_NAME="com.gethuan.huanapp"
UNSIGNED_PATH='./platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk'
SIGNED_PATH='./platforms/android/app/build/outputs/apk/release/app-release-signed.apk'
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

ionic cordova build android --release --prod

### Sign APK
echo "--- Signing The Android APK [Time Elapsed $(($(date +%s) - $STARTTIME))s]"
echo Fz9UjnqwJwiLCJVCzUW | jarsigner                   \
    -verbose                                           \
    -sigalg SHA1withRSA                                \
    -digestalg SHA1                                    \
    -keystore certificates/huan-release.keystore       \
    $UNSIGNED_PATH                                     \
    Huan

### ZipAlign the APK
echo "--- ZipAligning The Android APK [Time Elapsed $(($(date +%s) - $STARTTIME))s]"
~/Library/Android/sdk/build-tools/$BUILD_TOOLS_VERSION/zipalign  \
    -v 4                                                         \
    $UNSIGNED_PATH                                               \
    $SIGNED_PATH

### Uploading to Hockeyapp
#echo "--- Uploading to Hockeyapp [Time Elapsed $(($(date +%s) - $STARTTIME))s]"

#/usr/local/bin/puck                      \
#    -submit=auto                         \
#    -download=true                       \
#    -open=notify                         \
#    -force=true                          \
#    $SIGNED_PATH

### Summary
echo "-- Total time $(($(date +%s) - $STARTTIME))s"
