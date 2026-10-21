// The active colour palette. Follows the system appearance by default; the
// user can pin Light or Dark in Profile. The choice is persisted and also
// handed to Appearance so native pieces (keyboard, alerts, date pickers)
// match the app.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import { DARK, LIGHT, type Palette } from "./colors";

export type ThemeMode = "system" | "light" | "dark";

const MODE_KEY = "abfall_theme_mode";

interface ThemeValue extends Palette {
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export async function loadStoredThemeMode(): Promise<ThemeMode> {
  try {
    const v = await AsyncStorage.getItem(MODE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function applyAppearance(mode: ThemeMode) {
  // Not available on every platform (web); the palette follows `mode`
  // regardless, this only syncs native UI.
  Appearance.setColorScheme?.(mode === "system" ? "unspecified" : mode);
}

export function ThemeProvider({ initialMode, children }: { initialMode: ThemeMode; children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  // With an override in place useColorScheme reports the override, so it
  // is the single source of truth for what is on screen.
  const scheme = useColorScheme();

  useEffect(() => {
    applyAppearance(mode);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    applyAppearance(next);
    AsyncStorage.setItem(MODE_KEY, next).catch(() => {});
  }, []);

  const isDark = mode === "dark" || (mode === "system" && scheme === "dark");

  // The root view shows behind modals and the keyboard; keep it on theme.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync((isDark ? DARK : LIGHT).S.bg).catch(() => {});
  }, [isDark]);

  const value = useMemo<ThemeValue>(
    () => ({ ...(isDark ? DARK : LIGHT), isDark, mode, setMode }),
    [isDark, mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** The active palette. Outside a provider (bootstrap) it follows the system. */
export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  const scheme = useColorScheme();
  if (ctx) return ctx;
  const isDark = scheme === "dark";
  return { ...(isDark ? DARK : LIGHT), isDark, mode: "system", setMode: () => {} };
}
