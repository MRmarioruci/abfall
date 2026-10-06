// Google Calendar sync via OAuth 2.0 + the Calendar v3 REST API.
//
// Flow:
//   1. User taps "Connect Google Calendar" in Profile
//   2. useGoogleAuth() runs the OAuth dance (via expo-auth-session) and
//      receives an access token + refresh token + expiry
//   3. Tokens go into expo-secure-store (sensitive); expiry & synced
//      event ids live in AsyncStorage (just metadata)
//   4. syncToGoogleCalendar(calendar) creates a dedicated "Abfall"
//      calendar on the user's Google account if needed, then POSTs
//      one event per upcoming pickup
//   5. Access token refresh happens automatically when expired
//
// Notes:
//   • All event ids we create are kept in AsyncStorage so we can clean
//     up precisely on unsync.
//   • The dedicated calendar means deleting it on Google's side removes
//     everything in one shot.
//   • Token refresh uses the standard OAuth refresh_token grant.

import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SavedCalendar, CollectionEvent } from "../types/calendar";
import type { WasteStreamId } from "../theme/colors";
import { ST } from "../theme/colors";
import { parseReminderTime } from "./notifications";
import { parseISODate } from "../lib/dates";

const ACCESS_TOKEN_KEY = "abfall_google_access_token";
const REFRESH_TOKEN_KEY = "abfall_google_refresh_token";
const TOKEN_EXPIRY_KEY = "abfall_google_token_expiry"; // ms epoch
const SYNCED_EVENTS_KEY = "abfall_google_synced_events";

const GOOGLE_CALENDAR_TITLE = "Abfall";
const GOOGLE_CALENDAR_COLOR_ID = "10"; // green
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

interface SyncedState {
  /** Google's id for the "Abfall" calendar we created. */
  googleCalendarId: string;
  /** Per-SavedCalendar map of Google event ids we created. */
  bySavedCalendar: Record<string, string[]>;
}

// ─── token storage ─────────────────────────────────────────────────────

export async function saveTokens(args: {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds?: number;
}): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, args.accessToken);
  if (args.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, args.refreshToken);
  }
  if (args.expiresInSeconds) {
    const expiry = Date.now() + args.expiresInSeconds * 1000;
    await AsyncStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
  }
}

export async function isConnectedToGoogle(): Promise<boolean> {
  const t = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  return t !== null && t.length > 0;
}

export async function disconnectGoogle(): Promise<void> {
  // Best-effort revoke at Google (so the user's "Apps with access" page
  // doesn't lie). Failures are non-fatal.
  const t = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (t) {
    try {
      await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(t)}`, {
        method: "POST",
      });
    } catch {}
  }
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await AsyncStorage.removeItem(TOKEN_EXPIRY_KEY);
  await AsyncStorage.removeItem(SYNCED_EVENTS_KEY);
}

async function getValidAccessToken(clientId: string): Promise<string> {
  const expiryStr = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);
  const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;
  // 60s buffer so we don't race with expiry mid-request.
  if (Date.now() < expiry - 60_000) {
    const t = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (t) return t;
  }
  return refreshAccessToken(clientId);
}

async function refreshAccessToken(clientId: string): Promise<string> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error("No Google refresh token — reconnect Google Calendar");
  }
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  await saveTokens({
    accessToken: json.access_token,
    expiresInSeconds: json.expires_in,
  });
  return json.access_token;
}

// ─── sync state storage ───────────────────────────────────────────────

async function getSyncedState(): Promise<SyncedState | null> {
  try {
    const raw = await AsyncStorage.getItem(SYNCED_EVENTS_KEY);
    return raw ? (JSON.parse(raw) as SyncedState) : null;
  } catch {
    return null;
  }
}

async function setSyncedState(state: SyncedState): Promise<void> {
  await AsyncStorage.setItem(SYNCED_EVENTS_KEY, JSON.stringify(state));
}

export async function isGoogleSynced(savedCalendarId: string): Promise<boolean> {
  const state = await getSyncedState();
  return (state?.bySavedCalendar[savedCalendarId]?.length ?? 0) > 0;
}

// ─── Google Calendar API calls ────────────────────────────────────────

/**
 * Returns the Google calendar id for our dedicated "Abfall" calendar,
 * creating it if it doesn't exist yet. Caches the id in SyncedState so
 * we don't list calendars every sync.
 */
async function getOrCreateGoogleCalendar(args: {
  accessToken: string;
}): Promise<string> {
  const state = await getSyncedState();
  if (state?.googleCalendarId) {
    // Verify it still exists — user could have deleted it directly.
    const ok = await fetch(
      `${CALENDAR_API_BASE}/calendars/${state.googleCalendarId}`,
      { headers: { Authorization: `Bearer ${args.accessToken}` } },
    );
    if (ok.ok) return state.googleCalendarId;
  }
  // Find by title in the user's calendar list.
  const list = await fetch(`${CALENDAR_API_BASE}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${args.accessToken}` },
  });
  if (!list.ok) throw new Error(`Google calendar list failed: ${list.status}`);
  const listJson = (await list.json()) as {
    items: { id: string; summary: string }[];
  };
  const existing = listJson.items.find((c) => c.summary === GOOGLE_CALENDAR_TITLE);
  if (existing) return existing.id;

  // Create the calendar.
  const create = await fetch(`${CALENDAR_API_BASE}/calendars`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: GOOGLE_CALENDAR_TITLE,
      description: "Waste pickup schedule from Abfall.",
      timeZone: "Europe/Zurich",
    }),
  });
  if (!create.ok) {
    const text = await create.text();
    throw new Error(`Google calendar create failed (${create.status}): ${text}`);
  }
  const createJson = (await create.json()) as { id: string };

  // Try to give the calendar a green color via the calendarList endpoint
  // (separate from the calendar resource itself). Best effort.
  try {
    await fetch(
      `${CALENDAR_API_BASE}/users/me/calendarList/${createJson.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${args.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ colorId: GOOGLE_CALENDAR_COLOR_ID }),
      },
    );
  } catch {}

  return createJson.id;
}

interface ExistingState {
  googleCalendarId: string;
  bySavedCalendar: Record<string, string[]>;
}

async function deleteGoogleEvents(
  accessToken: string,
  calendarId: string,
  eventIds: string[],
): Promise<void> {
  for (const eventId of eventIds) {
    try {
      await fetch(
        `${CALENDAR_API_BASE}/calendars/${calendarId}/events/${eventId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
    } catch {
      // Event may have been deleted from Google directly; ignore.
    }
  }
}

/**
 * Pushes every upcoming pickup from `calendar` into the user's
 * "Abfall" Google calendar. Clears any prior sync for this SavedCalendar
 * first so re-syncs don't duplicate.
 *
 * Pass the Web (or Android) OAuth client id so token refresh has what
 * it needs. See useGoogleAuth() for where to source it.
 */
export async function syncToGoogleCalendar(args: {
  calendar: SavedCalendar;
  clientId: string;
}): Promise<number> {
  const accessToken = await getValidAccessToken(args.clientId);
  const googleCalendarId = await getOrCreateGoogleCalendar({ accessToken });

  // Delete previously-synced events for THIS SavedCalendar so we don't
  // duplicate. Other SavedCalendars stay synced.
  const prev = await getSyncedState();
  if (prev?.bySavedCalendar[args.calendar.id]) {
    await deleteGoogleEvents(
      accessToken,
      prev.googleCalendarId ?? googleCalendarId,
      prev.bySavedCalendar[args.calendar.id] ?? [],
    );
  }

  // Build event payloads from upcoming pickups.
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcoming = args.calendar.events.filter((e) => {
    const d = parseISODate(e.date);
    return !isNaN(d.getTime()) && d >= now;
  });

  const created: string[] = [];
  for (const evt of upcoming) {
    const streamLabel = ST[evt.type]?.label ?? evt.type;
    const title = `♻ ${streamLabel}`;
    const [y, m, d] = evt.date.split("-").map(Number);
    if (!y || !m || !d) continue;

    let payload: Record<string, unknown>;
    const notesParts: string[] = [];
    if (evt.zone && evt.zone !== "all") notesParts.push(`Zone ${evt.zone}`);
    if (evt.note) notesParts.push(evt.note);
    notesParts.push(`From Abfall · ${args.calendar.title}`);

    if (evt.time && /^\d{2}:\d{2}$/.test(evt.time)) {
      const [hh, mm] = evt.time.split(":").map(Number);
      const start = new Date(y, m - 1, d, hh ?? 6, mm ?? 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      // One reminder per active rule. Google takes minutes before event.
      const reminderMinutes = computeReminderMinutes(args.calendar, evt, start);
      payload = {
        summary: title,
        description: notesParts.join("\n"),
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        reminders: {
          useDefault: false,
          overrides: reminderMinutes.map((minutes) => ({ method: "popup", minutes })),
        },
      };
    } else {
      // All-day event.
      const startDateStr = evt.date;
      const next = new Date(y, m - 1, d + 1);
      const endDateStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
      // For all-day events, Google measures `minutes` from midnight start.
      const fakeStart = new Date(y, m - 1, d, 0, 0);
      const reminderMinutes = computeReminderMinutes(args.calendar, evt, fakeStart);
      payload = {
        summary: title,
        description: notesParts.join("\n"),
        start: { date: startDateStr },
        end: { date: endDateStr },
        reminders:
          reminderMinutes.length > 0
            ? {
                useDefault: false,
                overrides: reminderMinutes.map((minutes) => ({ method: "popup", minutes })),
              }
            : { useDefault: false, overrides: [] },
      };
    }

    try {
      const res = await fetch(
        `${CALENDAR_API_BASE}/calendars/${googleCalendarId}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        console.warn("[googleCalendar] event create failed", res.status, await res.text());
        continue;
      }
      const json = (await res.json()) as { id: string };
      created.push(json.id);
    } catch (err) {
      console.warn("[googleCalendar] event create threw", err);
    }
  }

  const nextState: ExistingState = prev
    ? { ...prev, googleCalendarId, bySavedCalendar: { ...prev.bySavedCalendar, [args.calendar.id]: created } }
    : { googleCalendarId, bySavedCalendar: { [args.calendar.id]: created } };
  await setSyncedState(nextState);

  return created.length;
}

// ─── rule → reminder translation ───────────────────────────────────────

/**
 * Build the list of "minutes before event" values to attach as Google
 * Calendar reminders. One per active reminder rule for the event's
 * stream. Specific-date rules don't apply to recurring streams and are
 * skipped here. Capped to keep Google's per-event reminder limit happy.
 */
function computeReminderMinutes(
  calendar: SavedCalendar,
  event: CollectionEvent,
  eventStartDate: Date,
): number[] {
  const rules = calendar.reminders?.[event.type as WasteStreamId] ?? [];
  const out: number[] = [];
  const MAX = 4;
  for (const rule of rules) {
    if (!rule.on) continue;
    if (rule.when === "specific date") continue;
    const triggerDate = parseReminderTime(rule.when, eventStartDate, rule.time);
    if (!triggerDate) continue;
    const minutes = Math.round(
      (eventStartDate.getTime() - triggerDate.getTime()) / 60_000,
    );
    if (minutes < 0) continue; // Google rejects reminders after the event
    out.push(minutes);
    if (out.length >= MAX) break;
  }
  return out;
}

/** Removes events we created for a single SavedCalendar from Google. */
export async function unsyncFromGoogleCalendar(args: {
  savedCalendarId: string;
  clientId: string;
}): Promise<void> {
  const state = await getSyncedState();
  if (!state) return;
  const ids = state.bySavedCalendar[args.savedCalendarId];
  if (!ids || ids.length === 0) return;
  const accessToken = await getValidAccessToken(args.clientId);
  await deleteGoogleEvents(accessToken, state.googleCalendarId, ids);
  const nextBy = { ...state.bySavedCalendar };
  delete nextBy[args.savedCalendarId];
  await setSyncedState({ ...state, bySavedCalendar: nextBy });
}

/** Removes ALL events we ever created on Google and forgets the calendar. */
export async function unsyncAllFromGoogle(args: { clientId: string }): Promise<void> {
  const state = await getSyncedState();
  if (!state) return;
  const accessToken = await getValidAccessToken(args.clientId).catch(() => null);
  if (!accessToken) {
    await AsyncStorage.removeItem(SYNCED_EVENTS_KEY);
    return;
  }
  // Delete every tracked event id across all SavedCalendars.
  for (const ids of Object.values(state.bySavedCalendar)) {
    await deleteGoogleEvents(accessToken, state.googleCalendarId, ids);
  }
  await AsyncStorage.removeItem(SYNCED_EVENTS_KEY);
}
