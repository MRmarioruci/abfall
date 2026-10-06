// Notification delivery — the single source of truth for HOW reminders
// reach the user. Replaces the previous "Abfall reminders AND optional
// calendar sync (which sets its own duplicate alarms)" architecture.
//
// One global setting decides where reminders are delivered:
//   • abfall  — local OS notifications via expo-notifications (default)
//   • phone   — events on the device's native calendar, with alarms
//               computed from the user's reminder rules
//   • google  — events on the user's Google Calendar, same alarm rules
//   • none    — no notifications anywhere
//
// The materializer takes (calendar's reminder rules + events + chosen
// destination) and produces exactly ONE delivery path. Switching
// destinations cleans up the old path automatically so you can't end
// up with both local notifications AND calendar alarms firing for the
// same pickup.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SavedCalendar } from "../types/calendar";
import {
  scheduleRemindersForCalendar,
  cancelNotificationsForCalendar,
  cancelAllNotifications,
} from "./notifications";
import {
  syncCalendarToNative,
  unsyncCalendarFromNative,
  unsyncAllFromNative,
} from "./nativeCalendar";
import {
  syncToGoogleCalendar,
  unsyncFromGoogleCalendar,
  unsyncAllFromGoogle,
} from "./googleCalendar";

export type NotificationDestination = "abfall" | "phone" | "google" | "none";

const DESTINATION_KEY = "abfall_notification_destination";

export interface DestinationMeta {
  id: NotificationDestination;
  label: string;
  description: string;
}

// Selectable destinations. "none" is still a valid stored value (used by
// the materializer's cleanup branch) but isn't exposed in the picker —
// users turn off individual reminder rules in the editor instead, which
// gives them more precise control than a global mute.
export const DESTINATIONS: DestinationMeta[] = [
  {
    id: "abfall",
    label: "Inside Abfall",
    description: "Get push notifications from the app itself.",
  },
  {
    id: "phone",
    label: "Phone calendar",
    description: "Pickups appear on your iOS / Android calendar with alarms.",
  },
  {
    id: "google",
    label: "Google Calendar",
    description: "Pushes events to your Google account; alarms set there.",
  },
];

// ─── destination read/write ────────────────────────────────────────────

export async function getNotificationDestination(): Promise<NotificationDestination> {
  try {
    const v = await AsyncStorage.getItem(DESTINATION_KEY);
    if (v === "abfall" || v === "phone" || v === "google" || v === "none") return v;
  } catch {}
  return "abfall";
}

export async function setNotificationDestination(d: NotificationDestination): Promise<void> {
  await AsyncStorage.setItem(DESTINATION_KEY, d);
}

// ─── the materializer ──────────────────────────────────────────────────

/**
 * Materialize the active calendar's reminders to whichever destination
 * the user chose. Cleans up the *other* destinations first so switching
 * mode never leaves duplicate alarms behind.
 *
 * Pass `googleClientId` even if the user isn't on Google — it's only
 * used when destination === "google" or when cleaning up a previous
 * Google sync. Use an empty string if you don't have one yet (the
 * cleanup is fail-soft).
 */
export async function applyDelivery(args: {
  calendar: SavedCalendar;
  googleClientId: string;
}): Promise<void> {
  const destination = await getNotificationDestination();

  // Always tear down the destinations we're NOT using so a switch
  // (e.g., abfall → phone) doesn't leave the abfall notifications
  // scheduled in addition to the new phone calendar alarms.
  await cleanupNonActive(args.calendar.id, destination, args.googleClientId);

  switch (destination) {
    case "abfall":
      await scheduleRemindersForCalendar(args.calendar);
      break;
    case "phone":
      await syncCalendarToNative(args.calendar);
      break;
    case "google":
      if (args.googleClientId) {
        await syncToGoogleCalendar({
          calendar: args.calendar,
          clientId: args.googleClientId,
        });
      }
      break;
    case "none":
      // explicit no-op; cleanupNonActive already wiped everything
      break;
  }
}

async function cleanupNonActive(
  calendarId: string,
  active: NotificationDestination,
  googleClientId: string,
): Promise<void> {
  if (active !== "abfall") {
    await cancelNotificationsForCalendar(calendarId).catch(() => {});
  }
  if (active !== "phone") {
    await unsyncCalendarFromNative(calendarId).catch(() => {});
  }
  if (active !== "google" && googleClientId) {
    await unsyncFromGoogleCalendar({
      savedCalendarId: calendarId,
      clientId: googleClientId,
    }).catch(() => {});
  }
}

/**
 * Nuke EVERYTHING this user ever had delivered, across every destination.
 * Used by Profile → Reset everything.
 */
export async function clearAllDeliveries(googleClientId: string): Promise<void> {
  await cancelAllNotifications().catch(() => {});
  await unsyncAllFromNative().catch(() => {});
  await unsyncAllFromGoogle({ clientId: googleClientId }).catch(() => {});
  await AsyncStorage.removeItem(DESTINATION_KEY).catch(() => {});
}
