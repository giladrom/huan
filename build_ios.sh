#!/usr/bin/env bash

PROJECT_NAME="Huan"
SCHEME_NAME="Huan"
STARTTIME=$(date +%s);

set -e
set -x

### Build
echo "--- Build [Time Elapsed $(($(date +%s) - $STARTTIME))s]"

#ionic cordova build ios --prod --release
ionic cordova build ios --release --aot false --environment prod --output-hashing all --sourcemaps false --extract-css true --named-chunks false --build-optimizer true --minifyjs=true --minifycss=true --optimizejs=true

### Moving to ios build directory
echo "--- Moving to ios build directory [Time Elapsed $(($(date +%s) - $STARTTIME))s]"

cd platforms/ios

### Cleaning Xcode
echo "--- Cleaning Xcode [Time Elapsed $(($(date +%s) - $STARTTIME))s]"

/usr/bin/xcodebuild clean               \
    -project "$PROJECT_NAME.xcodeproj"  \
    -configuration Release              \
    -alltargets

### Archiving
echo "--- Archiving [Time Elapsed $(($(date +%s) - $STARTTIME))s]"

/usr/bin/xcodebuild archive             \
    -project "$PROJECT_NAME.xcodeproj"  \
    -scheme "$SCHEME_NAME"              \
    -archivePath "$PROJECT_NAME"

### Uploading to Hockeyapp
echo "--- Uploading to Hockeyapp [Time Elapsed $(($(date +%s) - $STARTTIME))s]"

#/usr/local/bin/puck                      \
#    -submit=auto                         \
#    -download=true                       \
#    -open=notify                         \
#    -force=true                          \
#    "$PROJECT_NAME.xcarchive"

### Summary
echo "-- Total time $(($(date +%s) - $STARTTIME))s"
