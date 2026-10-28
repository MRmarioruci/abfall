// Empty, error and "nothing yet" states: a picture (Recyclops by default),
// one line of title, at most one short line under it, and one button.

import { View, Text } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { TYPE } from "../../theme/type";
import { Recyclops } from "../Recyclops";
import { PillButton, SoftCard } from "./sheet";
import { RADIUS } from "../../theme/layout";

export function EmptyState({
  title,
  subtitle,
  art,
  action,
  bg,
}: {
  title: string;
  subtitle?: string;
  /** Picture above the title; Recyclops when omitted. */
  art?: React.ReactNode;
  action?: { label: string; onPress: () => void; icon?: React.ReactNode };
  /** Tint of the picture's well; a soft palette colour fits most states. */
  bg?: string;
}) {
  const { S } = useTheme();
  return (
    <SoftCard style={{ alignItems: "center", padding: 8, paddingBottom: 20 }}>
      <View
        style={{
          alignSelf: "stretch",
          height: 136,
          borderRadius: RADIUS.control,
          backgroundColor: bg ?? S.chip,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {art ?? <Recyclops size={92} walkRange={0} />}
      </View>
      <Text style={[TYPE.heading, { color: S.ink, textAlign: "center", marginTop: 16, paddingHorizontal: 14 }]}>{title}</Text>
      {!!subtitle && (
        <Text style={[TYPE.caption, { color: S.sec, textAlign: "center", marginTop: 4, paddingHorizontal: 14 }]} numberOfLines={2}>
          {subtitle}
        </Text>
      )}
      {action && (
        <PillButton
          label={action.label}
          icon={action.icon}
          onPress={action.onPress}
          style={{ alignSelf: "stretch", marginTop: 18, marginHorizontal: 12 }}
        />
      )}
    </SoftCard>
  );
}
