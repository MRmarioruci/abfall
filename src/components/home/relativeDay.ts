// Relative-day wording for Home ("Today", "Tomorrow", "in 3 days").

import { parseISODate } from "../../lib/dates";

export function daysFromToday(iso: string): number {
  const d = parseISODate(iso);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

type Tools = {
  locale: string;
  t: (key: any, params?: Record<string, string | number>) => string;
  weekdayLong: (d: number) => string;
  monthShort: (m: number) => string;
};

/** "Today", "Tomorrow", "in N days" (localized), for a date on or after today. */
export function relativeDayLabel(iso: string, tools: Tools): string {
  const diff = daysFromToday(iso);
  if (diff <= 0) return tools.t("home.relative.today");
  if (diff === 1) return tools.t("home.relative.tomorrow");
  return tools.t("home.in_days", { n: diff });
}
