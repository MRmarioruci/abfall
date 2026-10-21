// Placeholder shaped like the hero card and the month grid, shown while
// calendars load so the empty state doesn't flash on launch.

import { View } from "react-native";
import { Skeleton } from "../ui/Skeleton";

export function HomeSkeleton() {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 18, gap: 18 }}>
      <Skeleton style={{ height: 148, borderRadius: 28 }} />
      <Skeleton style={{ height: 20, width: 160, borderRadius: 10, marginLeft: 4 }} />
      <Skeleton style={{ height: 360, borderRadius: 28 }} />
    </View>
  );
}
