/**
 * Parse a calendar date ("2026-10-05") as local midnight. `new Date(iso)`
 * treats a date-only string as UTC midnight, which shifts the day for
 * anyone not on UTC and makes "is this pickup today?" checks wrong.
 * Returns an Invalid Date for malformed input, like `new Date()` does.
 */
export function parseISODate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return new Date(NaN);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
