// Empty, error and "nothing yet" states: a picture (Recyclops by default),
// one line of title, at most one short line under it, and one button.

import { View, Text } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { TYPE } from "../../theme/type";
import { Recyclops } from "../Recyclops";
import { PillButton, SoftCard } from "./sheet";

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
  /** Card tint; a soft palette colour fits most states. Defaults to a card. */
  bg?: string;
}) {
  const { S } = useTheme();
  return (
    <SoftCard bg={bg ?? S.card} style={{ alignItems: "center", paddingVertical: 26, paddingHorizontal: 22 }}>
      <View style={{ height: 120, alignItems: "center", justifyContent: "center" }}>
        {art ?? <Recyclops size={92} walkRange={0} />}
      </View>
      <Text style={[TYPE.heading, { color: S.ink, textAlign: "center", marginTop: 10 }]}>{title}</Text>
      {!!subtitle && (
        <Text style={[TYPE.caption, { color: S.sec, textAlign: "center", marginTop: 4 }]} numberOfLines={2}>
          {subtitle}
        </Text>
      )}
      {action && (
        <PillButton
          label={action.label}
          icon={action.icon}
          onPress={action.onPress}
          style={{ alignSelf: "stretch", marginTop: 18 }}
        />
      )}
    </SoftCard>
  );
}
