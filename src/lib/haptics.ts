// Light haptic feedback. Every call is fire-and-forget: devices or
// platforms without haptics just stay silent.

import * as Haptics from "expo-haptics";

const quiet = (p: Promise<unknown>) => {
  p.catch(() => {});
};

export const haptics = {
  /** Buttons, tiles, tabs. */
  tap: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Toggles and picking an option. */
  select: () => quiet(Haptics.selectionAsync()),
  /** Something was saved or completed. */
  success: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Something failed or was removed. */
  warn: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
