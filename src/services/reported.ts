// Community calendars this device has reported. They're hidden from this
// device's browse results straight away, before the server's report
// threshold hides them for everyone.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "abfall_reported_calendars";

export async function getReportedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export async function addReportedId(id: string): Promise<void> {
  const ids = await getReportedIds();
  ids.add(id);
  await AsyncStorage.setItem(KEY, JSON.stringify([...ids]));
}
