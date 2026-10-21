import { Pressable, View } from "react-native";
import { S } from "../../theme/colors";
import { haptics } from "../../lib/haptics";

interface Props {
  on: boolean;
  onChange: (v: boolean) => void;
  /** What the switch turns on or off, for screen readers. */
  accessibilityLabel?: string;
}

export function SoftSwitch({ on, onChange, accessibilityLabel }: Props) {
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
        backgroundColor: on ? S.ink : "rgba(33,31,28,0.14)",
        flexDirection: "row",
        justifyContent: on ? "flex-end" : "flex-start",
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 99,
          backgroundColor: "#fff",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
          elevation: 2,
        }}
      />
    </Pressable>
  );
}
