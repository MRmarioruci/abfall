// First-launch gate for the onboarding flow. Persists a flag in AsyncStorage
// so the user only sees the introduction screens once, ever. Bumping the
// suffix ("_v1") forces a re-show — handy if we revamp the flow later.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "abfall_onboarded_v1";

export async function hasOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "true";
  } catch {
    return false;
  }
}

export async function markOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, "true");
  } catch {
    // Persistence failure is non-fatal — worst case the user sees onboarding
    // again next launch. Silent for now; surface if we ever see this hit.
  }
}

/**
 * Clears the onboarded flag so the next cold launch shows onboarding again.
 * Used by the Profile screen's "Replay onboarding" action.
 */
export async function resetOnboarded(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
