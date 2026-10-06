// Minimal i18n layer. Locale data lives in src/i18n/locales/*. React rerenders
// on locale change come from the LocaleProvider in src/context/LocaleContext
// — this module just holds the data, exposes t()/wasteLabel()/month*()/
// weekday*() helpers, and handles persistence.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { type WasteStreamId } from "../theme/colors";
import { en, type StringKey } from "./locales/en";
import { de } from "./locales/de";
import { fr } from "./locales/fr";
import { it } from "./locales/it";

export type Locale = "en" | "de" | "fr" | "it";
export type { StringKey };

export const SUPPORTED_LOCALES: Locale[] = ["en", "de", "fr", "it"];

export interface LocaleMeta {
  id: Locale;
  endonym: string;
}

// Endonyms only — the secondary "English name" label is generated via
// t("language.<id>") so it localizes alongside everything else.
export const LOCALES: LocaleMeta[] = [
  { id: "en", endonym: "English" },
  { id: "de", endonym: "Deutsch" },
  { id: "fr", endonym: "Français" },
  { id: "it", endonym: "Italiano" },
];

// ─── persistence ────────────────────────────────────────────────────────

const STORAGE_KEY = "abfall_locale_v1";

export async function loadStoredLocale(): Promise<Locale | null> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    if (v && SUPPORTED_LOCALES.includes(v as Locale)) return v as Locale;
  } catch {}
  return null;
}

/**
 * The first of the phone's preferred languages that we support, or
 * English. Used until the user picks a language themselves.
 */
export function deviceLocale(): Locale {
  try {
    for (const l of getLocales()) {
      const code = l.languageCode?.toLowerCase();
      if (code && SUPPORTED_LOCALES.includes(code as Locale)) return code as Locale;
    }
  } catch {}
  return "en";
}

export async function persistLocale(locale: Locale): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, locale);
  } catch {}
}

export async function clearStoredLocale(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// ─── string tables ──────────────────────────────────────────────────────

type Table = Record<StringKey, string>;
const TABLES: Record<Locale, Table> = { en, de, fr, it };

// ─── waste-stream labels ────────────────────────────────────────────────

const WASTE_LABELS: Record<Locale, Record<WasteStreamId, string>> = {
  en: {
    kehricht: "Refuse",
    bio: "Organic",
    gruengut: "Green waste",
    papier: "Paper",
    karton: "Cardboard",
    metall: "Metal",
    altmetall: "Scrap metal",
    sperrgut: "Bulky waste",
    textilien: "Textiles",
    sonderabfall: "Hazardous waste",
  },
  de: {
    kehricht: "Kehricht",
    bio: "Bioabfall",
    gruengut: "Grüngut",
    papier: "Papier",
    karton: "Karton",
    metall: "Metall",
    altmetall: "Altmetall",
    sperrgut: "Sperrgut",
    textilien: "Textilien",
    sonderabfall: "Sonderabfall",
  },
  fr: {
    kehricht: "Ordures",
    bio: "Déchets bio",
    gruengut: "Déchets verts",
    papier: "Papier",
    karton: "Carton",
    metall: "Métal",
    altmetall: "Ferraille",
    sperrgut: "Encombrants",
    textilien: "Textiles",
    sonderabfall: "Déchets spéciaux",
  },
  it: {
    kehricht: "Rifiuti",
    bio: "Organico",
    gruengut: "Sfalci e potature",
    papier: "Carta",
    karton: "Cartone",
    metall: "Metalli",
    altmetall: "Rottami",
    sperrgut: "Ingombranti",
    textilien: "Tessili",
    sonderabfall: "Rifiuti speciali",
  },
};

// ─── calendar names ─────────────────────────────────────────────────────

type CalendarStrings = {
  monthsLong: string[];    // length 13, index 0 unused
  monthsShort: string[];   // length 13, index 0 unused
  weekdaysLong: string[];  // length 7, index 0 = Sunday
  weekdaysShort: string[]; // length 7, Sunday-first
  weekdaysMin: string[];   // length 7, Sunday-first (calendar grid headers)
};

const CALENDAR: Record<Locale, CalendarStrings> = {
  en: {
    monthsLong: ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    monthsShort: ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    weekdaysLong: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    weekdaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    weekdaysMin: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  },
  de: {
    monthsLong: ["", "Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
    monthsShort: ["", "Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
    weekdaysLong: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
    weekdaysShort: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
    weekdaysMin: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  },
  fr: {
    monthsLong: ["", "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
    monthsShort: ["", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"],
    weekdaysLong: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"],
    weekdaysShort: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
    weekdaysMin: ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"],
  },
  it: {
    monthsLong: ["", "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"],
    monthsShort: ["", "Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"],
    weekdaysLong: ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"],
    weekdaysShort: ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"],
    weekdaysMin: ["Do", "Lu", "Ma", "Me", "Gi", "Ve", "Sa"],
  },
};

/** Localized full month name (1-12). */
export function monthLong(m: number): string {
  return CALENDAR[currentLocale].monthsLong[m] || "";
}
/** Localized short month name (1-12). */
export function monthShort(m: number): string {
  return CALENDAR[currentLocale].monthsShort[m] || "";
}
/** Localized full weekday name. Sunday-first, matching JS Date.getDay(). */
export function weekdayLong(d: number): string {
  return CALENDAR[currentLocale].weekdaysLong[d] || "";
}
/** Localized short weekday name. Sunday-first. */
export function weekdayShort(d: number): string {
  return CALENDAR[currentLocale].weekdaysShort[d] || "";
}
/** Localized 2-letter weekday for calendar grid headers. Sunday-first. */
export function weekdayMin(d: number): string {
  return CALENDAR[currentLocale].weekdaysMin[d] || "";
}

// ─── current locale + string lookup ─────────────────────────────────────

let currentLocale: Locale = "en";

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/** Get a localized waste-stream label. Falls back to English, then to the id. */
export function wasteLabel(id: WasteStreamId): string {
  return WASTE_LABELS[currentLocale]?.[id] || WASTE_LABELS.en[id] || id;
}

// Reminder rules store their trigger as an English phrase ("evening before",
// "3 days before", ...). Older rules and the onboarding preview use
// capitalised variants, so matching is case-insensitive.
const WHEN_KEYS: Record<string, StringKey> = {
  "same day": "when.same_day",
  "morning of": "when.morning_of",
  "evening before": "when.evening_before",
  "1 day before": "when.day_before",
  "2 days before": "when.two_days_before",
  "3 days before": "when.three_days_before",
  "1 week before": "when.week_before",
  "specific date": "when.specific_date",
};

/** Localized label for a stored ReminderRule.when value. Unknown values pass through. */
export function whenLabel(when: string): string {
  const key = WHEN_KEYS[when.trim().toLowerCase()];
  return key ? t(key) : when;
}

/**
 * Resolve a translation key with optional {placeholder} interpolation.
 * Falls back to English, then to the key itself, so a missing translation
 * never produces a blank string at runtime.
 */
export function t(key: StringKey, params?: Record<string, string | number>): string {
  const template = TABLES[currentLocale]?.[key] || TABLES.en[key] || key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    const v = params[name];
    return v === undefined || v === null ? `{${name}}` : String(v);
  });
}
