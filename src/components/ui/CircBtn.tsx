import { Pressable, type ViewStyle } from "react-native";
import { haptics } from "../../lib/haptics";

interface Props {
  size?: number;
  bg?: string;
  shadow?: boolean;
  onPress?: () => void;
  /** Read out by screen readers; icon-only buttons need one. */
  accessibilityLabel?: string;
  style?: ViewStyle;
  children: React.ReactNode;
}

export function CircBtn({
  size = 48,
  bg = "#fff",
  shadow = true,
  onPress,
  accessibilityLabel,
  style,
  children,
}: Props) {
  return (
    <Pressable
      onPress={
        onPress &&
        (() => {
          haptics.tap();
          onPress();
        })
      }
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      // Small circles still get a 44pt touch area.
      hitSlop={Math.max(0, (44 - size) / 2)}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: 99,
        backgroundColor: bg,
        ...(shadow
          ? {
              shadowColor: "rgb(150,118,96)",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.12,
              shadowRadius: 18,
              elevation: 4,
            }
          : {}),
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale: pressed ? 0.94 : 1 }],
        ...style,
      })}
    >
      {children}
    </Pressable>
  );
}
