import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SavedCalendar } from "../types/calendar";

const CALENDARS_KEY = "abfall_calendars";

/**
 * Unique identifier for a locally-saved calendar. Collision-resistant
 * even when the user creates multiple calendars in the same millisecond
 * (fast taps, batch imports) — random suffix gives ~10^12 combinations
 * per ms, more than enough.
 *
 * Use this whenever a new SavedCalendar is created: scan, manual entry,
 * community import. NEVER derive a local id from the calendar's content
 * (title, server id, etc.) — duplicate imports must produce distinct
 * local rows so deletion of one doesn't affect the other.
 */
export function generateCalendarId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 12);
  return `cal_${ts}_${rand}`;
}

export async function getCalendars(): Promise<SavedCalendar[]> {
  const raw = await AsyncStorage.getItem(CALENDARS_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function saveCalendar(calendar: SavedCalendar): Promise<void> {
  const calendars = await getCalendars();

  if (calendar.active) {
    for (const c of calendars) {
      c.active = false;
    }
  }

  calendars.push(calendar);
  await AsyncStorage.setItem(CALENDARS_KEY, JSON.stringify(calendars));
}

export async function setActiveCalendar(id: string): Promise<void> {
  const calendars = await getCalendars();
  for (const c of calendars) {
    c.active = c.id === id;
  }
  await AsyncStorage.setItem(CALENDARS_KEY, JSON.stringify(calendars));
}

export async function deleteCalendar(id: string): Promise<void> {
  const calendars = await getCalendars();
  const filtered = calendars.filter((c) => c.id !== id);
  await AsyncStorage.setItem(CALENDARS_KEY, JSON.stringify(filtered));
}

export async function updateCalendar(id: string, patch: Partial<SavedCalendar>): Promise<void> {
  const calendars = await getCalendars();
  const next = calendars.map((c) => (c.id === id ? { ...c, ...patch, id: c.id } : c));
  await AsyncStorage.setItem(CALENDARS_KEY, JSON.stringify(next));
}

export function getActiveCalendar(calendars: SavedCalendar[]): SavedCalendar | undefined {
  return calendars.find((c) => c.active);
}

/**
 * Wipes saved calendars. Caller is responsible for also cancelling any
 * scheduled notifications (cancelAllNotifications) since those live under
 * a separate key.
 */
export async function clearAllCalendars(): Promise<void> {
  await AsyncStorage.removeItem(CALENDARS_KEY);
}
