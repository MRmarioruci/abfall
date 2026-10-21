// Sync upcoming pickups from a SavedCalendar into the device's native
// calendar (iOS Calendar app, Android system calendar → Google
// Calendar). Uses expo-calendar.
//
// Strategy:
//   • All sync goes into a dedicated "Abfall" calendar on the device,
//     created on first sync. Easy to delete in one place if the user
//     ever wants out.
//   • We track native event ids in AsyncStorage keyed by SavedCalendar
//     id so we can do clean re-syncs (delete old → recreate) without
//     leaving orphan events behind.
//   • All-day vs timed: respects the event's `time` field. If absent,
//     defaults to an all-day event so it shows up nicely in users'
//     daily calendar without picking a fake time.

// SDK 57 replaced these functions with an object API (ExpoCalendar /
// event.delete()) and the old names now throw unless imported from the
// legacy entry. We store and delete events by id, which the legacy API
// supports directly, so we stay on it until a planned migration.
import * as Calendar from "expo-calendar/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { SavedCalendar, CollectionEvent, ReminderRule } from "../types/calendar";
import type { WasteStreamId } from "../theme/colors";
import { ST } from "../theme/colors";
import { parseReminderTime } from "./notifications";
import { parseISODate } from "../lib/dates";

const STORAGE_KEY = "abfall_native_calendar_event_ids";
const ABFALL_CALENDAR_TITLE = "Abfall";
const ABFALL_CALENDAR_COLOR = "#AECB93"; // green — matches ST.gruengut.c

// Map of SavedCalendar.id → array of native event ids the service
// created on the device. Lets us clean up precisely.
interface StoredEventIds {
  [savedCalendarId: string]: string[];
}

async function getStored(): Promise<StoredEventIds> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredEventIds) : {};
  } catch {
    return {};
  }
}

async function setStored(value: StoredEventIds): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {}
}

// ─── public api ────────────────────────────────────────────────────────

/**
 * Returns true if the device granted us calendar write access.
 * Prompts on first call if status is undetermined; subsequent calls
 * return the cached status without prompting again.
 */
export async function requestNativeCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === "granted";
}

/**
 * Returns true if a given SavedCalendar currently has events synced to
 * the device. Used by the Profile toggle to reflect actual state.
 */
export async function isSyncedToNative(savedCalendarId: string): Promise<boolean> {
  const stored = await getStored();
  return (stored[savedCalendarId]?.length ?? 0) > 0;
}

/**
 * Push every upcoming pickup from `calendar` into the device's "Abfall"
 * calendar. Wipes any previously-synced events for this SavedCalendar
 * first so re-syncs don't duplicate.
 *
 * Returns the count of events created.
 */
export async function syncCalendarToNative(calendar: SavedCalendar): Promise<number> {
  const granted = await requestNativeCalendarPermission();
  if (!granted) throw new Error("Calendar permission denied");

  // Clean up any pre-existing events for this SavedCalendar before
  // creating new ones — keeps the device calendar tidy if events were
  // edited locally.
  await unsyncCalendarFromNative(calendar.id);

  const abfallCalendarId = await getOrCreateAbfallCalendar();

  // Only push future pickups — past events aren't useful and would
  // clutter the user's calendar history.
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcoming = calendar.events.filter((e) => {
    const d = parseISODate(e.date);
    return !isNaN(d.getTime()) && d >= now;
  });

  const created: string[] = [];
  for (const evt of upcoming) {
    const streamLabel = ST[evt.type]?.label ?? evt.type;
    const title = `♻ ${streamLabel}`;

    // Parse date as local midnight (avoids UTC interpretation that can
    // shift the day in some timezones).
    const [y, m, d] = evt.date.split("-").map(Number);
    if (!y || !m || !d) continue;

    let startDate: Date;
    let endDate: Date;
    let allDay = false;
    if (evt.time && /^\d{2}:\d{2}$/.test(evt.time)) {
      const [hh, mm] = evt.time.split(":").map(Number);
      startDate = new Date(y, m - 1, d, hh ?? 6, mm ?? 0);
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1h slot
    } else {
      // No time → all-day event so it doesn't pretend to know the hour.
      startDate = new Date(y, m - 1, d, 0, 0);
      endDate = new Date(y, m - 1, d, 23, 59);
      allDay = true;
    }

    const notesParts: string[] = [];
    if (evt.zone && evt.zone !== "all") notesParts.push(`Zone ${evt.zone}`);
    if (evt.note) notesParts.push(evt.note);
    notesParts.push(`From Abfall · ${calendar.title}`);

    // Compute one calendar alarm per reminder rule for this event's stream.
    // The notification destination is now "phone calendar", so the calendar
    // app owns the actual ping — and there's no duplicate from the app.
    const alarms = computeAlarmsForEvent(calendar, evt, startDate);

    try {
      const id = await Calendar.createEventAsync(abfallCalendarId, {
        title,
        startDate,
        endDate,
        allDay,
        notes: notesParts.join("\n"),
        alarms,
      });
      created.push(id);
    } catch (err) {
      console.warn("[nativeCalendar] failed to create event", evt.date, err);
    }
  }

  const stored = await getStored();
  stored[calendar.id] = created;
  await setStored(stored);

  return created.length;
}

/**
 * Remove every event this service created for `savedCalendarId`. Safe
 * to call when nothing was synced — it just no-ops.
 */
export async function unsyncCalendarFromNative(savedCalendarId: string): Promise<void> {
  const stored = await getStored();
  const ids = stored[savedCalendarId] ?? [];
  for (const id of ids) {
    try {
      await Calendar.deleteEventAsync(id);
    } catch {
      // Event may have been deleted from the device calendar app
      // directly — that's fine, just keep going.
    }
  }
  delete stored[savedCalendarId];
  await setStored(stored);
}

/**
 * Removes every event this service ever created on the device, across
 * all SavedCalendars. Called from Profile → Reset everything.
 */
export async function unsyncAllFromNative(): Promise<void> {
  const stored = await getStored();
  for (const id of Object.keys(stored)) {
    await unsyncCalendarFromNative(id);
  }
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// ─── rule → alarm translation ──────────────────────────────────────────

/**
 * Build the set of calendar alarms for a single event by applying the
 * user's active reminder rules for that event's stream. Each "on" rule
 * becomes one alarm with `relativeOffset` measured in minutes before the
 * event's start time. Negative = before, positive = after.
 *
 * If the user has no rules enabled for the stream, returns no alarms
 * (the event is in the calendar but won't ring). They can edit the
 * event in the calendar app to add custom alarms if they want.
 */
function computeAlarmsForEvent(
  calendar: SavedCalendar,
  event: CollectionEvent,
  eventStartDate: Date,
): { relativeOffset: number }[] {
  const rules = calendar.reminders?.[event.type as WasteStreamId] ?? [];
  const alarms: { relativeOffset: number }[] = [];
  // Reasonable cap — most calendar apps choke past ~5 alarms per event.
  // Limits the blast radius if a user toggles every reminder option on.
  const MAX_ALARMS = 4;
  for (const rule of rules) {
    if (!rule.on) continue;
    // Specific-date rules don't apply to recurring stream events.
    if (rule.when === "specific date") continue;
    const triggerDate = parseReminderTime(rule.when, eventStartDate, rule.time);
    if (!triggerDate) continue;
    // Negative = before. expo-calendar uses MINUTES.
    const offsetMinutes = Math.round(
      (triggerDate.getTime() - eventStartDate.getTime()) / 60_000,
    );
    alarms.push({ relativeOffset: offsetMinutes });
    if (alarms.length >= MAX_ALARMS) break;
  }
  return alarms;
}

// ─── internal ──────────────────────────────────────────────────────────

/**
 * Returns the id of the device's "Abfall" calendar, creating it if
 * needed. Picks a writable source per-platform.
 */
async function getOrCreateAbfallCalendar(): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === ABFALL_CALENDAR_TITLE);
  if (existing) return existing.id;

  if (Platform.OS === "ios") {
    // iOS: pick a writable local source (Default ≈ "On My iPhone").
    const sources = await Calendar.getSourcesAsync();
    const source =
      sources.find((s) => s.name === "iCloud") ??
      sources.find((s) => s.type === "LOCAL") ??
      sources[0];
    if (!source) throw new Error("No writable calendar source on this device");
    return Calendar.createCalendarAsync({
      title: ABFALL_CALENDAR_TITLE,
      color: ABFALL_CALENDAR_COLOR,
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: source.id,
      name: ABFALL_CALENDAR_TITLE,
      ownerAccount: "personal",
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  }

  // Android: create a local-only calendar (won't sync to Google
  // automatically; user can manually set sync if they want).
  return Calendar.createCalendarAsync({
    title: ABFALL_CALENDAR_TITLE,
    color: ABFALL_CALENDAR_COLOR,
    entityType: Calendar.EntityTypes.EVENT,
    name: ABFALL_CALENDAR_TITLE,
    ownerAccount: "personal",
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
    source: {
      isLocalAccount: true,
      name: "Abfall",
      type: "LOCAL",
    },
  });
}
