import { Pressable, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { haptics } from "../../lib/haptics";

interface Props {
  on: boolean;
  onChange: (v: boolean) => void;
  /** What the switch turns on or off, for screen readers. */
  accessibilityLabel?: string;
}

export function SoftSwitch({ on, onChange, accessibilityLabel }: Props) {
  const { S } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onChange(!on);
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={{
        width: 50,
        height: 30,
        borderRadius: 99,
        padding: 2,
        backgroundColor: on ? S.ink : S.fillStrong,
        flexDirection: "row",
        justifyContent: on ? "flex-end" : "flex-start",
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 99,
          backgroundColor: on ? S.onInk : S.white,
        }}
      />
    </Pressable>
  );
}
