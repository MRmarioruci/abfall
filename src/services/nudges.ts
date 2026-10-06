// Persistent flags for in-app nudges (CTAs that appear once per context
// until the user dismisses them). Tracked per-calendar so adding a new
// calendar always re-triggers the prompt — dismissing it on calendar A
// doesn't hide it on calendar B.

import AsyncStorage from "@react-native-async-storage/async-storage";

const REMINDER_NUDGE_KEY = "abfall_nudge_reminders_dismissed_v2";

async function getDismissedIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_NUDGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function isReminderNudgeDismissed(calendarId: string): Promise<boolean> {
  const ids = await getDismissedIds();
  return ids.includes(calendarId);
}

export async function dismissReminderNudge(calendarId: string): Promise<void> {
  const ids = await getDismissedIds();
  if (ids.includes(calendarId)) return;
  try {
    await AsyncStorage.setItem(REMINDER_NUDGE_KEY, JSON.stringify([...ids, calendarId]));
  } catch {}
}

export async function resetReminderNudge(): Promise<void> {
  try {
    await AsyncStorage.removeItem(REMINDER_NUDGE_KEY);
  } catch {}
}
