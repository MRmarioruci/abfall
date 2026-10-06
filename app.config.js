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
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
      // Required so expo-notifications uses setExactAndAllowWhileIdle on
      // Android 12+. Without this, alarms fall back to inexact mode and can
      // be delayed by 15-30 min while the device is in Doze. (Not
      // USE_EXACT_ALARM: Play only allows that for alarm-clock apps.)
      "android.permission.SCHEDULE_EXACT_ALARM",
      // expo-calendar — write pickup events into the device calendar.
      "android.permission.READ_CALENDAR",
      "android.permission.WRITE_CALENDAR",
    ],
    // Photos come from the system photo picker, which needs no permission,
    // and the camera never records video. Keep plugins from adding these;
    // Play asks for a justification for broad media access.
    blockedPermissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.READ_MEDIA_AUDIO",
      "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
      // From Expo's template: overlay is only for the dev menu, and
      // storage access isn't needed for the picker or camera.
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
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
      "expo-image-picker",
      {
        cameraPermission:
          "Abfall uses the camera to scan your paper waste calendar.",
        photosPermission:
          "Abfall reads the photo you pick to scan your paper waste calendar.",
        microphonePermission: false,
      },
    ],
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
