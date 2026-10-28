// Evening nudges for leaderboard players: at 19:30 the evening before a
// pickup, "Bins out tonight? Tick them off for points", with the streak.
// On the last pickup of a week the nudge warns that the streak is at
// stake, since the weekly streak breaks after a week with no check-in.
//
// Kept apart from the pickup reminders (their own ids), and rescheduled
// whenever the player, the streak or the calendar changes.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Notifications } from "./notificationsModule";
import { t, wasteLabel } from "../i18n";
import { parseISODate } from "../lib/dates";
import type { SavedCalendar } from "../types/calendar";
import type { WasteStreamId } from "../theme/colors";

const IDS_KEY = "abfall_checkin_nudge_ids";
const NUDGE_HOUR = 19;
const NUDGE_MINUTE = 30;
/** How many pickup evenings ahead to schedule. */
const AHEAD = 12;

/** Weeks counted from 1970, starting on Monday (same as the API). */
function weekOf(d: Date): number {
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
  return Math.floor((days + 3) / 7);
}

async function cancelPrevious() {
  const N = Notifications;
  const raw = await AsyncStorage.getItem(IDS_KEY);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  if (N) await Promise.all(ids.map((id) => N.cancelScheduledNotificationAsync(id).catch(() => {})));
  await AsyncStorage.removeItem(IDS_KEY);
}

/** Replace the scheduled nudges; `null` (not a player) just clears them. */
export async function rescheduleCheckinNudges(
  args: { calendar: SavedCalendar; streak: number } | null,
): Promise<void> {
  const N = Notifications;
  await cancelPrevious();
  if (!N || !args) return;
  const { status } = await N.getPermissionsAsync();
  if (status !== "granted") return;

  // Pickup days ahead, with their bins.
  const byDate = new Map<string, WasteStreamId[]>();
  for (const e of args.calendar.events) {
    const list = byDate.get(e.date) ?? [];
    if (!list.includes(e.type)) list.push(e.type);
    byDate.set(e.date, list);
  }
  const now = new Date();
  const dates = [...byDate.keys()].sort().filter((iso) => {
    const eve = parseISODate(iso);
    eve.setDate(eve.getDate() - 1);
    eve.setHours(NUDGE_HOUR, NUDGE_MINUTE, 0, 0);
    return eve > now;
  });

  const ids: string[] = [];
  for (let i = 0; i < Math.min(AHEAD, dates.length); i++) {
    const iso = dates[i]!;
    const pickup = parseISODate(iso);
    const eve = new Date(pickup);
    eve.setDate(eve.getDate() - 1);
    eve.setHours(NUDGE_HOUR, NUDGE_MINUTE, 0, 0);

    const bins = byDate.get(iso)!.map((id) => wasteLabel(id)).join(", ");
    // The last pickup of its week is the last chance to keep the streak.
    const next = dates[i + 1] ? parseISODate(dates[i + 1]!) : null;
    const lastOfWeek = !next || weekOf(next) !== weekOf(pickup);
    let body = t("nudge.body", { bins });
    if (args.streak >= 2) {
      body += " " + (lastOfWeek ? t("nudge.last_chance", { n: args.streak }) : t("nudge.streak", { n: args.streak }));
    }
    try {
      const id = await N.scheduleNotificationAsync({
        content: { title: t("nudge.title"), body, data: { kind: "checkin", date: iso } },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: eve },
      });
      ids.push(id);
    } catch (err) {
      console.warn("[nudges] schedule failed", err);
    }
  }
  await AsyncStorage.setItem(IDS_KEY, JSON.stringify(ids));
}
