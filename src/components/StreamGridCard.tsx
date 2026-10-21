import { View, Text, Pressable } from "react-native";
import { ST, type WasteStreamId } from "../theme/colors";
import { StreamGlyph } from "./icons/StreamGlyph";
import { ArrowURIcon } from "./icons/Icons";
import { useT } from "../context/LocaleContext";
import { FONT } from "../theme/type";

interface Props {
  stream: WasteStreamId;
  rel: string;
  date: string;
  tall?: boolean;
  onPress?: () => void;
}

export function StreamGridCard({ stream, rel, date, tall = false, onPress }: Props) {
  const s = ST[stream];
  const { wasteLabel } = useT();

  return (
    <Pressable
      onPress={onPress}
      style={{
        position: "relative",
        backgroundColor: s.c,
        borderRadius: 26,
        padding: 16,
        paddingBottom: 14,
        overflow: "hidden",
        minHeight: tall ? 196 : 170,
      }}
    >
      <View style={{ position: "absolute", right: -16, bottom: -10, opacity: 0.18 }}>
        <StreamGlyph stream={stream} size={tall ? 150 : 124} color={s.ink} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 10.5,
            fontFamily: FONT.w800,
            color: s.ink,
            opacity: 0.62,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {rel}
        </Text>
        <Text
          style={{
            fontSize: 21,
            fontFamily: FONT.w800,
            color: s.ink,
            letterSpacing: -0.5,
            lineHeight: 22,
            marginTop: 5,
          }}
        >
          {wasteLabel(stream)}
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontFamily: FONT.w600,
            color: s.ink,
            opacity: 0.7,
            marginTop: 3,
          }}
        >
          {date}
        </Text>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 99,
            backgroundColor: "rgba(255,255,255,0.55)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowURIcon color={s.ink} size={19} />
        </View>
      </View>
    </Pressable>
  );
}
