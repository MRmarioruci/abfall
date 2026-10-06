import { View, Text, Pressable } from "react-native";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { S } from "../theme/colors";
import { CheckIcon, GlobeIcon } from "./icons/Icons";
import type { SavedCalendar } from "../types/calendar";

interface Props {
  visible: boolean;
  calendar: SavedCalendar | null;
  onShare: () => void;
  onSkip: () => void;
}

export function PostScanShareDialog({ visible, calendar, onShare, onSkip }: Props) {
  if (!calendar) return null;

  return (
    <SlideUpSheet visible={visible} onClose={onSkip} height={500}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8, alignItems: "center" }}>
        {/* Success badge */}
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 99,
            backgroundColor: "#DCE9CE",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 6,
            shadowColor: "#273913",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.18,
            shadowRadius: 18,
            elevation: 6,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 99,
              backgroundColor: "#5BA86B",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckIcon color="#fff" size={22} />
          </View>
        </View>

        <Text style={{ fontSize: 26, fontWeight: "800", color: S.ink, letterSpacing: -0.6, marginTop: 16 }}>
          Calendar saved
        </Text>
        <Text
          style={{ fontSize: 14, color: S.sec, fontWeight: "600", marginTop: 4, textAlign: "center" }}
          numberOfLines={1}
        >
          {calendar.title}
        </Text>
        <Text style={{ fontSize: 12, color: S.ter, fontWeight: "600", marginTop: 2 }}>
          {calendar.events.length} dates
          {calendar.location ? ` · ${calendar.location}` : ""}
        </Text>

        {/* Community pitch — publish is the default */}
        <View
          style={{
            marginTop: 22,
            padding: 18,
            borderRadius: 22,
            backgroundColor: "#fff",
            width: "100%",
            borderWidth: 2,
            borderColor: S.ink,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                backgroundColor: S.ink,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GlobeIcon color="#fff" size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: S.ter, letterSpacing: 1.2 }}>
                WILL PUBLISH TO COMMUNITY
              </Text>
              <Text style={{ fontSize: 15, fontWeight: "800", color: S.ink, letterSpacing: -0.2, marginTop: 2 }}>
                Neighbours nearby can find this
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 12.5, color: S.sec, fontWeight: "600", marginTop: 10, lineHeight: 17 }}>
            By default, calendars you add are shared so people in your area can use them too. You can change this anytime from the share menu.
          </Text>
        </View>

        {/* Buttons */}
        <Pressable
          onPress={onShare}
          style={{
            marginTop: 18,
            height: 54,
            width: "100%",
            borderRadius: 99,
            backgroundColor: S.ink,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            shadowColor: S.ink,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.22,
            shadowRadius: 20,
            elevation: 6,
          }}
        >
          <CheckIcon color="#fff" size={16} />
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#fff" }}>
            Sounds good
          </Text>
        </Pressable>

        <Pressable
          onPress={onSkip}
          style={{
            marginTop: 10,
            height: 48,
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "700", color: S.sec }}>
            Actually, keep private
          </Text>
        </Pressable>
      </View>
    </SlideUpSheet>
  );
}
