// A small two-or-three-way switch: hairline track, the chosen option
// filled in ink. For picking a view, not for actions.

import { View, Text, Pressable } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { TYPE } from "../../theme/type";
import { HAIRLINE, RADIUS } from "../../theme/layout";
import { haptics } from "../../lib/haptics";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { S } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        padding: 3,
        borderRadius: RADIUS.well + 2,
        backgroundColor: S.card,
        borderWidth: HAIRLINE,
        borderColor: S.line,
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (on) return;
              haptics.select();
              onChange(o.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            hitSlop={4}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: RADIUS.well - 2,
              backgroundColor: on ? S.ink : "transparent",
            }}
          >
            <Text style={[TYPE.cap, { color: on ? S.onInk : S.sec }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
