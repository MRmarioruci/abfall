// The user's location when they have no calendar yet. Once a calendar
// exists its own `location` field takes over; this is the fallback so
// setting a location on an empty Home screen isn't thrown away, and the
// first scan can start from it.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "abfall_home_location";

export async function getHomeLocation(): Promise<string | undefined> {
  try {
    return (await AsyncStorage.getItem(KEY)) || undefined;
  } catch {
    return undefined;
  }
}

export async function setHomeLocation(location: string | undefined): Promise<void> {
  if (location) await AsyncStorage.setItem(KEY, location);
  else await AsyncStorage.removeItem(KEY);
}
