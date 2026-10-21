import { Platform } from "react-native";
import { Notifications } from "./notificationsModule";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ST_STATIC as ST } from "../theme/colors";
import { t, wasteLabel, weekdayLong, monthShort } from "../i18n";
import type { WasteStreamId } from "../theme/colors";
import type { ReminderRule, SavedCalendar } from "../types/calendar";
import { parseISODate } from "../lib/dates";

const NOTIFICATION_IDS_KEY = "abfall_notification_ids";
const SCHEDULE_WINDOW_MONTHS = 3;

interface StoredIds {
  [calendarId: string]: string[];
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const N = Notifications;
  if (!N) return false;
  const { status: existingStatus } = await N.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await N.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === "granted";
}

async function ensureAndroidChannel() {
  const N = Notifications;
  if (!N) return;
  if (Platform.OS !== "android") return;
  await N.setNotificationChannelAsync("default", {
    name: t("notif.channel"),
    importance: N.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#211F1C",
  });
}

export function parseReminderTime(when: string, eventDate: Date, timeStr: string): Date | null {
  when = when.toLowerCase();
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;

  const d = new Date(eventDate);
  d.setHours(hours, minutes, 0, 0);

  // "evening before" and "morning of" override the time.
  if (when.includes("evening before")) {
    d.setDate(d.getDate() - 1);
    d.setHours(20, 0, 0, 0);
    return d;
  }

  if (when.includes("morning of")) {
    d.setHours(7, 0, 0, 0);
    return d;
  }

  // "same day" and "specific date" keep the provided date; everything else
  // shifts back N days.
  const daysMatch = when.match(/(\d+)\s+days?\s+before/);
  const weeksMatch = when.match(/(\d+)\s+weeks?\s+before/);
  if (weeksMatch) {
    d.setDate(d.getDate() - Number(weeksMatch[1]) * 7);
  } else if (daysMatch) {
    d.setDate(d.getDate() - Number(daysMatch[1]));
  }

  return d;
}

function buildNotificationContent(
  streamLabel: string,
  eventDate: Date,
  triggerDate: Date,
): { title: string; body: string } {
  // Describe the pickup relative to when the notification fires, so a
  // "3 days before" reminder doesn't claim the pickup is tomorrow.
  const fireDay = new Date(triggerDate);
  fireDay.setHours(0, 0, 0, 0);
  const daysAhead = Math.round((eventDate.getTime() - fireDay.getTime()) / 86400000);
  const params = {
    stream: streamLabel,
    date: `${weekdayLong(eventDate.getDay())} ${eventDate.getDate()} ${monthShort(eventDate.getMonth() + 1)}`,
  };
  const body =
    daysAhead <= 0
      ? t("notif.body.today", params)
      : daysAhead === 1
      ? t("notif.body.tomorrow", params)
      : t("notif.body.on_date", params);
  return { title: t("notif.title", params), body };
}

export async function scheduleRemindersForCalendar(
  calendar: SavedCalendar,
): Promise<number> {
  const N = Notifications;
  if (!N) return 0;
  // Always start fresh for this calendar.
  await cancelNotificationsForCalendar(calendar.id);

  // Check status only — never prompt here. Background scheduling that surfaces
  // the OS permission dialog on app launch is jarring; the prompt should only
  // appear in response to an explicit user action (saving a reminder, toggling
  // one on). If we don't have permission yet, just skip.
  const { status } = await N.getPermissionsAsync();
  if (status !== "granted") {
    console.log("[notifications] permission not granted, skipping schedule");
    return 0;
  }

  await ensureAndroidChannel();

  const rulesByStream = calendar.reminders || ({} as Record<WasteStreamId, ReminderRule[]>);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const windowEnd = new Date();
  windowEnd.setMonth(now.getMonth() + SCHEDULE_WINDOW_MONTHS);

  const identifiers: string[] = [];

  const scheduleOne = async (
    title: string,
    body: string,
    triggerDate: Date,
    data: Record<string, unknown>,
  ) => {
    console.log(
      `[notifications] scheduling "${title}" at ${triggerDate.toISOString()}`,
    );
    const id = await N.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
    identifiers.push(id);
  };

  // Save whatever got scheduled even if a later call throws, so the next
  // run can still cancel it instead of leaving orphaned notifications.
  try {
    // 1. Specific-date (one-off) reminders — not tied to any event.
    for (const streamId of Object.keys(rulesByStream) as WasteStreamId[]) {
      const rules = rulesByStream[streamId] || [];
      const label = wasteLabel(streamId);
      for (const rule of rules) {
        if (!rule.on || rule.when !== "specific date" || !rule.customDate) continue;

        const triggerDate = parseReminderTime("specific date", parseISODate(rule.customDate), rule.time);
        if (!triggerDate || triggerDate <= now) continue;

        await scheduleOne(
          t("notif.title", { stream: label }),
          t("notif.body.reminder", { stream: label }),
          triggerDate,
          { calendarId: calendar.id, stream: streamId, customDate: rule.customDate },
        );
      }
    }

    // 2. Event-based reminders for upcoming pickups.
    for (const event of calendar.events) {
      const eventDate = parseISODate(event.date);
      // Skip past pickups, pickups too far in the future, and anything with
      // a type this build doesn't know (community calendars aren't
      // validated against our stream list).
      if (isNaN(eventDate.getTime()) || eventDate < today || eventDate > windowEnd) continue;
      if (!ST[event.type]) continue;

      const rules = rulesByStream[event.type] || [];
      for (const rule of rules) {
        if (!rule.on || rule.when === "specific date") continue;

        const triggerDate = parseReminderTime(rule.when, eventDate, rule.time);
        if (!triggerDate || triggerDate <= now) continue;

        const { title, body } = buildNotificationContent(wasteLabel(event.type), eventDate, triggerDate);

        await scheduleOne(title, body, triggerDate, {
          calendarId: calendar.id,
          eventDate: event.date,
          stream: event.type,
        });
      }
    }
  } finally {
    await storeNotificationIds(calendar.id, identifiers);
  }
  console.log(`[notifications] scheduled ${identifiers.length} reminders for calendar ${calendar.id}`);
  return identifiers.length;
}

export async function cancelNotificationsForCalendar(calendarId: string): Promise<void> {
  const N = Notifications;
  if (!N) return;
  const ids = await getNotificationIds(calendarId);
  for (const id of ids) {
    await N.cancelScheduledNotificationAsync(id);
  }
  await storeNotificationIds(calendarId, []);
}

export async function cancelAllNotifications(): Promise<void> {
  const N = Notifications;
  if (!N) return;
  await N.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(NOTIFICATION_IDS_KEY);
}

/**
 * Returns every future firing of a given rule within the schedule window,
 * sorted earliest-first. Empty array if the rule is off or nothing matches.
 *
 * Specific-date rules return at most 1 entry. Recurring rules return one
 * entry per matching upcoming pickup — which mirrors what the scheduler
 * actually books with the OS.
 */
export function getUpcomingTriggersForRule(
  calendar: SavedCalendar,
  stream: WasteStreamId,
  rule: ReminderRule,
): Date[] {
  if (!rule.on) return [];
  const now = new Date();

  if (rule.when === "specific date") {
    if (!rule.customDate) return [];
    const trigger = parseReminderTime("specific date", parseISODate(rule.customDate), rule.time);
    return trigger && trigger > now ? [trigger] : [];
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const windowEnd = new Date();
  windowEnd.setMonth(now.getMonth() + SCHEDULE_WINDOW_MONTHS);

  const triggers: Date[] = [];
  for (const event of calendar.events) {
    if (event.type !== stream) continue;
    const eventDate = parseISODate(event.date);
    if (isNaN(eventDate.getTime()) || eventDate < today || eventDate > windowEnd) continue;
    const trigger = parseReminderTime(rule.when, eventDate, rule.time);
    if (!trigger || trigger <= now) continue;
    triggers.push(trigger);
  }
  triggers.sort((a, b) => a.getTime() - b.getTime());
  return triggers;
}

/**
 * Convenience wrapper that returns the next firing (or null). Used by the
 * save toast for the "fires Mon 22 Jun at 18:00" confirmation.
 */
export function getNextTriggerForRule(
  calendar: SavedCalendar,
  stream: WasteStreamId,
  rule: ReminderRule,
): Date | null {
  return getUpcomingTriggersForRule(calendar, stream, rule)[0] ?? null;
}

/**
 * Fires a one-off notification ~3s from now so the user can verify
 * notifications actually reach their device. Used by the "Send a test now"
 * button in the reminder editor.
 */
export async function sendTestNotification(): Promise<boolean> {
  const N = Notifications;
  if (!N) return false;
  const granted = await requestNotificationPermissions();
  if (!granted) return false;
  await ensureAndroidChannel();
  await N.scheduleNotificationAsync({
    content: {
      title: t("notif.test.title"),
      body: t("notif.test.body"),
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
    },
  });
  return true;
}

async function getStoredIds(): Promise<StoredIds> {
  const raw = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
  return raw ? (JSON.parse(raw) as StoredIds) : {};
}

async function getNotificationIds(calendarId: string): Promise<string[]> {
  const all = await getStoredIds();
  return all[calendarId] || [];
}

async function storeNotificationIds(calendarId: string, ids: string[]): Promise<void> {
  const all = await getStoredIds();
  all[calendarId] = ids;
  await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(all));
}
