import type { WasteStreamId } from "../theme/colors";

export interface CollectionEvent {
  date: string;
  type: WasteStreamId;
  zone: string;
  time?: string;
  note?: string;
}

export interface ReminderRule {
  id: string;
  when: string;
  time: string;
  on: boolean;
  /** ISO date string (YYYY-MM-DD) for one-off "specific date" reminders. */
  customDate?: string;
}

export interface SavedCalendar {
  id: string;
  title: string;
  /** User-facing location string (e.g. "Schlieren, ZH"). Free-text. */
  location?: string;
  municipality: string;
  canton?: string;
  zone?: string;
  zones?: string[];
  year: number;
  half?: 1 | 2;
  events: CollectionEvent[];
  source: "scan" | "manual" | "community";
  active: boolean;
  createdAt: string;
  /**
   * Reminder rules per waste stream. Only the active calendar's rules are
   * scheduled as local notifications.
   */
  reminders?: Record<WasteStreamId, ReminderRule[]>;
  /** Sharing — stubbed for future Supabase backend. */
  shared?: boolean;
  shareCode?: string;
  shareUrl?: string;
}

export interface ParsedCalendarResult {
  title: string;
  municipality: string;
  canton?: string;
  /** Postal code printed on the calendar (e.g. "8001"). Helpful when a city
   *  has multiple districts with different collection schedules. */
  postcode?: string;
  zones: string[];
  events: CollectionEvent[];
}
