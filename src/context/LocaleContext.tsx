// React context for the active UI locale. Wraps the module-level
// setLocale/getLocale in src/i18n so React rerenders when the language
// changes — handy for the picker in onboarding and the profile screen.
//
// The initial value is hydrated by App.tsx (which awaits loadStoredLocale
// before rendering), so by the time anything reads useLocale() the right
// language is already active and persistence has no flicker.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  type Locale,
  type StringKey,
  getLocale,
  setLocale as setModuleLocale,
  persistLocale,
  t as tModule,
  wasteLabel as wasteLabelModule,
  monthLong as monthLongModule,
  monthShort as monthShortModule,
  weekdayLong as weekdayLongModule,
  weekdayShort as weekdayShortModule,
  weekdayMin as weekdayMinModule,
} from "../i18n";
import type { WasteStreamId } from "../theme/colors";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Keep the module-level locale in sync with the React state so non-React
  // call sites (services, helpers) see the same value without needing the
  // hook. CRITICAL: sync to `locale` (state), NOT `initialLocale` (prop) —
  // the prop never changes after bootstrap, so syncing to it would revert
  // the module to "en" on every render and silently undo every setLocale().
  setModuleLocale(locale);

  const setLocale = useCallback((next: Locale) => {
    setModuleLocale(next);
    setLocaleState(next);
    // Fire-and-forget — persistence failure isn't worth blocking the UI.
    persistLocale(next).catch(() => {});
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

/**
 * Read the active locale and a setter that updates module + state + storage
 * in one shot. The setter is stable across renders.
 */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Defensive fallback — shouldn't fire in practice because LocaleProvider
    // wraps the whole tree. If it ever does, fall back to the module's
    // current value and a no-op setter so the screen still renders.
    return { locale: getLocale(), setLocale: () => {} };
  }
  return ctx;
}

/**
 * Bundle of locale-bound string helpers for screen components.
 *
 * The returned functions delegate to the module-level helpers (which read
 * the module's `currentLocale`), but the bundle itself is memoized on the
 * React-state locale — so any component that calls `useT()` rerenders on
 * a language switch and every string it produced gets refreshed.
 *
 *   t(key, params?)      — UI string lookup with {placeholder} interpolation
 *   wasteLabel(id)       — localized waste-stream name (Paper / Papier / ...)
 *   monthLong/Short(m)   — month name (1-12), full or abbreviated
 *   weekdayLong/Short/Min(d) — weekday name (0-6, Sunday-first)
 */
export function useT() {
  const { locale } = useLocale();
  // Memo key includes `locale` so the bundle identity changes on switch,
  // letting downstream useMemo/useEffect consumers invalidate cleanly.
  return useMemo(
    () => ({
      locale,
      t: (key: StringKey, params?: Record<string, string | number>) => tModule(key, params),
      wasteLabel: (id: WasteStreamId) => wasteLabelModule(id),
      monthLong: (m: number) => monthLongModule(m),
      monthShort: (m: number) => monthShortModule(m),
      weekdayLong: (d: number) => weekdayLongModule(d),
      weekdayShort: (d: number) => weekdayShortModule(d),
      weekdayMin: (d: number) => weekdayMinModule(d),
    }),
    [locale],
  );
}
