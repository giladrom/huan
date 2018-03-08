if [ -d "platforms/android" ]; then
  echo '
configurations.all {
    resolutionStrategy.eachDependency { DependencyResolveDetails details ->
        def requested = details.requested
        if (requested.group == "com.facebook.android") {
          details.useVersion "4.25.0"
        }
    }
}
' > platforms/android/build-extras.gradle
fi
