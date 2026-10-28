import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type WasteStreamId } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { CircBtn } from "../components/ui/CircBtn";
import { StreamGlyph } from "../components/icons/StreamGlyph";
import { BackIcon, HeartIcon, BellIcon, CheckIcon } from "../components/icons/Icons";
import { FONT } from "../theme/type";

const LEADS = [
  { v: 3, t: "3d" },
  { v: 2, t: "2d" },
  { v: 1, t: "1d" },
  { v: 0, t: "AM" },
  { v: -1, t: "Eve" },
];

export function DetailScreen({ route, navigation }: any) {
  const { S, ST } = useTheme();
  const stream: WasteStreamId = route?.params?.stream ?? "papier";
  const s = ST[stream];
  const insets = useSafeAreaInsets();
  const [lead, setLead] = useState(1);
  const [reminderOn, setReminderOn] = useState(true);

  return (
    <View style={{ flex: 1, backgroundColor: S.sheet }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View
          style={{
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <CircBtn size={44} onPress={() => navigation.goBack()}>
            <BackIcon color={S.ink} size={20} />
          </CircBtn>
          <Text style={{ fontSize: 17, fontFamily: FONT.w800, color: S.ink, letterSpacing: -0.3 }}>
            {s.label}
          </Text>
          <CircBtn size={44}>
            <HeartIcon color={S.ink} size={19} />
          </CircBtn>
        </View>

        {/* Hero circle */}
        <View style={{ alignItems: "center", paddingTop: 22, paddingBottom: 4 }}>
          <View
            style={{
              width: 224,
              height: 224,
              borderRadius: 112,
              backgroundColor: s.c,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <StreamGlyph stream={stream} size={120} color={s.onC} />
          </View>
        </View>

        <View style={{ alignItems: "center", paddingTop: 14, paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 28, fontFamily: FONT.w500, color: S.ink, letterSpacing: -0.8, textAlign: "center" }}>
            {s.label}, every <Text style={{ fontFamily: FONT.w800 }}>two weeks</Text>
          </Text>
          <Text style={{ fontSize: 13.5, color: S.sec, fontFamily: FONT.w600, marginTop: 6 }}>
            Flatten boxes · no plastic windows
          </Text>
        </View>

        {/* Reminder lead dial */}
        <View style={{ paddingTop: 24 }}>
          <Text
            style={{
              textAlign: "center",
              fontSize: 11,
              fontFamily: FONT.w800,
              color: S.ter,
              letterSpacing: 1.5,
              marginBottom: 8,
            }}
          >
            REMIND ME
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>
            {LEADS.map((l) => {
              const sel = lead === l.v;
              return (
                <Pressable
                  key={l.v}
                  onPress={() => setLead(l.v)}
                  style={{ alignItems: "center", minWidth: 56, padding: 4 }}
                >
                  {sel ? (
                    <View
                      style={{
                        backgroundColor: S.ink,
                        borderRadius: 99,
                        paddingVertical: 13,
                        paddingHorizontal: 8,
                        alignItems: "center",
                        minWidth: 52,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 21,
                          fontFamily: FONT.w800,
                          color: S.onInk,
                          letterSpacing: -0.5,
                        }}
                      >
                        {l.t}
                      </Text>
                      <Text
                        style={{
                          fontSize: 9,
                          fontFamily: FONT.w700,
                          color: S.onInk,
                          opacity: 0.6,
                          marginTop: 4,
                          letterSpacing: 0.5,
                        }}
                      >
                        BEFORE
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 18, fontFamily: FONT.w700, color: S.ter }}>
                      {l.t}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Bottom dock */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 30,
          paddingTop: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: S.float,
        }}
      >
        <View>
          <Text style={{ fontSize: 11, fontFamily: FONT.w800, color: S.ter, letterSpacing: 1 }}>
            NEXT PICKUP
          </Text>
          <Text
            style={{ fontSize: 26, fontFamily: FONT.w800, color: S.ink, letterSpacing: -0.6, marginTop: 3 }}
          >
            Tomorrow
          </Text>
          <Text style={{ fontSize: 13, color: S.sec, fontFamily: FONT.w600 }}>
            Thu 11 Jun · 07:00
          </Text>
        </View>

        <Pressable
          onPress={() => setReminderOn(!reminderOn)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            padding: 5,
            borderRadius: 99,
            backgroundColor: reminderOn ? S.ink : S.card,
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 99,
              backgroundColor: reminderOn ? S.onInk + "29" : S.fill,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BellIcon color={reminderOn ? S.onInk : S.ter} size={19} />
          </View>
          <View style={{ flexDirection: "row", gap: 3, paddingHorizontal: 2 }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 99,
                  backgroundColor: reminderOn ? S.onInk + "80" : S.ter,
                }}
              />
            ))}
          </View>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 99,
              backgroundColor: reminderOn ? S.onInk : S.fill,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckIcon color={reminderOn ? S.ink : S.ter} size={19} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
