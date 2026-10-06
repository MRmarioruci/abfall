// Dynamic Expo config so the Google Maps API key (and any future build-time
// secrets) can be sourced from .env instead of being committed in app.json.
// Read at prebuild time and baked into AndroidManifest as
// `com.google.android.geo.API_KEY` meta-data.

module.exports = ({ config }) => ({
  ...config,
  name: "abfall",
  slug: "abfall",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  // Used by expo-auth-session as the OAuth redirect scheme so Google's
  // callback can reach the app on iOS/Android.
  scheme: "abfall",
  // NativeWind v4 → react-native-css-interop → reanimated 4 + worklets
  // all hard-require the new architecture. Every other dep here (Expo SDK 54
  // modules, react-native-maps, react-native-svg, react-native-screens,
  // safe-area-context, react-navigation 7) is new-arch ready, so flipping
  // this on is the path of least resistance.
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Abfall uses your location to set the waste calendar for your area.",
      NSCalendarsUsageDescription:
        "Abfall can add your upcoming waste pickups to your phone's calendar so they show up alongside your other events.",
      NSCalendarsWriteOnlyAccessUsageDescription:
        "Abfall can add your upcoming waste pickups to your phone's calendar so they show up alongside your other events.",
    },
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
      // Required so expo-notifications uses setExactAndAllowWhileIdle on
      // Android 12+. Without this, alarms fall back to inexact mode and can
      // be delayed by 15-30 min while the device is in Doze.
      "android.permission.SCHEDULE_EXACT_ALARM",
      // Android 13+ alarm-clock-style permission that doesn't need a runtime
      // prompt — fine for pickup reminders since users explicitly request a
      // specific minute. Allows exact scheduling without user friction.
      "android.permission.USE_EXACT_ALARM",
      // expo-calendar — write pickup events into the device calendar.
      "android.permission.READ_CALENDAR",
      "android.permission.WRITE_CALENDAR",
    ],
    package: "com.anonymous.abfall",
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
      },
    },
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-font",
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Abfall uses your location to set the waste calendar for your area.",
      },
    ],
    [
      "expo-notifications",
      {
        color: "#211F1C",
      },
    ],
    [
      "expo-calendar",
      {
        calendarPermission:
          "Abfall can add your upcoming waste pickups to your phone's calendar so they show up alongside your other events.",
      },
    ],
  ],
});
