import { Pressable, type ViewStyle } from "react-native";

interface Props {
  size?: number;
  bg?: string;
  shadow?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  children: React.ReactNode;
}

export function CircBtn({
  size = 48,
  bg = "#fff",
  shadow = true,
  onPress,
  style,
  children,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={{
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
        ...style,
      }}
    >
      {children}
    </Pressable>
  );
}
