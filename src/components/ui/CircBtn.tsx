import { Pressable, type ViewStyle } from "react-native";
import { haptics } from "../../lib/haptics";
import { useTheme } from "../../theme/ThemeContext";
import { HAIRLINE } from "../../theme/layout";

interface Props {
  size?: number;
  bg?: string;
  /** Hairline edge; off for buttons on a filled or tinted background. */
  outline?: boolean;
  onPress?: () => void;
  /** Read out by screen readers; icon-only buttons need one. */
  accessibilityLabel?: string;
  style?: ViewStyle;
  children: React.ReactNode;
}

export function CircBtn({
  size = 48,
  bg,
  outline = true,
  onPress,
  accessibilityLabel,
  style,
  children,
}: Props) {
  const { S } = useTheme();
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
        backgroundColor: bg ?? S.card,
        borderWidth: outline ? HAIRLINE : 0,
        borderColor: S.line,
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
