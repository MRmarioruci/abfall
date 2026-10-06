// expo-notifications registers a push-token listener as soon as it's
// imported. In Expo Go on Android (SDK 53+) that throws, since Expo Go
// there has no push support, which would take the whole app down even
// though Abfall only uses local notifications. So it's loaded defensively:
// in that one environment it's null and in-app reminders are off; in
// development and release builds it's the real module.

type NotificationsModule = typeof import("expo-notifications");

let mod: NotificationsModule | null = null;
try {
  mod = require("expo-notifications") as NotificationsModule;
} catch (err) {
  console.warn(
    "[notifications] expo-notifications can't load here (Expo Go on Android); " +
      "in-app reminders are off. Use a development build to test them.",
    err,
  );
}

export const Notifications = mod;
