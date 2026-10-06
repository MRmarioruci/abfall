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
import type { StringKey } from "../i18n";
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
  /** i18n key for the display name — resolve with t() at render. */
  labelKey: StringKey;
  /** i18n key for the one-line description — resolve with t() at render. */
  descKey: StringKey;
}

// Selectable destinations. "none" is still a valid stored value (used by
// the materializer's cleanup branch) but isn't exposed in the picker —
// users turn off individual reminder rules in the editor instead, which
// gives them more precise control than a global mute.
export const DESTINATIONS: DestinationMeta[] = [
  {
    id: "abfall",
    labelKey: "destination.abfall.label",
    descKey: "destination.abfall.desc",
  },
  {
    id: "phone",
    labelKey: "destination.phone.label",
    descKey: "destination.phone.desc",
  },
  {
    id: "google",
    labelKey: "destination.google.label",
    descKey: "destination.google.desc",
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

// Runs are serialized: the context effect and the Reminders screen can both
// trigger a sync at once, and two overlapping cancel-then-schedule passes
// would each book a full set and lose track of the other's IDs.
let deliveryQueue: Promise<void> = Promise.resolve();

/**
 * Materialize the active calendar's reminders to whichever destination
 * the user chose, then clean up the *other* destinations so switching
 * mode never leaves duplicate alarms behind. If the chosen destination
 * fails (e.g. calendar permission denied), the error propagates and the
 * previous destination's reminders are left in place.
 *
 * Pass `googleClientId` even if the user isn't on Google — it's only
 * used when destination === "google" or when cleaning up a previous
 * Google sync. Use an empty string if you don't have one yet (the
 * cleanup is fail-soft).
 */
export function applyDelivery(args: {
  calendar: SavedCalendar;
  googleClientId: string;
}): Promise<void> {
  const run = deliveryQueue.then(() => deliver(args));
  deliveryQueue = run.catch(() => {});
  return run;
}

async function deliver(args: {
  calendar: SavedCalendar;
  googleClientId: string;
}): Promise<void> {
  const destination = await getNotificationDestination();

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
      break;
  }

  // Only once the new destination is in place, tear down the ones we're
  // NOT using so a switch (e.g., abfall → phone) doesn't leave the abfall
  // notifications scheduled in addition to the new phone calendar alarms.
  await cleanupNonActive(args.calendar.id, destination, args.googleClientId);
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
