// Shape tokens for the crisp look: one hairline, three radii.

import { StyleSheet } from "react-native";

/** Width of every border and divider. */
export const HAIRLINE = StyleSheet.hairlineWidth;

export const RADIUS = {
  /** Cards, sheets' inner panels, the calendar. */
  card: 18,
  /** Buttons, inputs, list rows, the add button. */
  control: 14,
  /** Icon wells, day cells, small chips. */
  well: 10,
} as const;
