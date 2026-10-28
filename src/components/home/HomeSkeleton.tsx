// Placeholder shaped like the headline, the week strip and the month card,
// shown while calendars load so the empty state doesn't flash on launch.

import { View } from "react-native";
import { Skeleton } from "../ui/Skeleton";
import { RADIUS } from "../../theme/layout";

export function HomeSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
      <Skeleton style={{ height: 12, width: 84, borderRadius: 6 }} />
      <Skeleton style={{ height: 44, width: 220, borderRadius: 10, marginTop: 10 }} />
      <Skeleton style={{ height: 16, width: 150, borderRadius: 8, marginTop: 12 }} />
      <Skeleton style={{ height: 62, borderRadius: RADIUS.control, marginTop: 24 }} />
      <Skeleton style={{ height: 340, borderRadius: RADIUS.card, marginTop: 28 }} />
    </View>
  );
}
