// Single reusable dialog for publishing a calendar to the community
// catalog. Opened from anywhere a "publish" action lives (ShareSheet,
// the post-scan flow, future entry points). Collects an editable
// title and an optional sharer name, shows the city/region/country
// locator the calendar will be filed under, and does the API call
// in one place.
//
// Keeping this in its own component means the field layout, copy,
// loading state, toast feedback, and persistence of the sharer name
// stay consistent everywhere the user is asked to publish.

import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { S } from "../theme/colors";
import { CheckIcon, GlobeIcon, PinIcon, XIcon } from "./icons/Icons";
import type { SavedCalendar } from "../types/calendar";
import { ApiError, shareCalendar, type CommunityCalendarDetail } from "../services/api";
import { useToast } from "./ui/Toast";

const SHARE_NAME_KEY = "abfall_share_name";
const DEFAULT_COUNTRY = "CH";

interface Props {
  visible: boolean;
  onClose: () => void;
  calendar: SavedCalendar | null;
  /** Fired after a successful publish with the server-assigned record so
   *  the caller can persist the community id, mark `shared: true`, etc. */
  onPublished?: (detail: CommunityCalendarDetail) => void;
}

// Derive the city/region the server will tag this calendar under.
// Falls back through structured fields → free-text location → empty.
function derivePublishCity(c: SavedCalendar): string {
  const muni = c.municipality?.trim();
  if (muni) return muni;
  if (c.location) {
    const first = c.location.split(",")[0]?.trim();
    if (first) return first;
  }
  return "";
}

function derivePublishRegion(c: SavedCalendar): string {
  const canton = c.canton?.trim();
  if (canton) return canton;
  if (c.location) {
    const second = c.location.split(",")[1]?.trim();
    if (second) return second;
  }
  return "";
}

export function PublishDialog({ visible, onClose, calendar, onPublished }: Props) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [publishTitle, setPublishTitle] = useState("");
  const [shareName, setShareName] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(SHARE_NAME_KEY).then((v) => {
      if (v) setShareName(v);
    });
    setPublishTitle(calendar?.title ?? "");
  }, [visible, calendar?.title]);

  if (!calendar) return null;

  const pubCity = derivePublishCity(calendar);
  const pubRegion = derivePublishRegion(calendar);
  const locator = [pubCity, pubRegion, DEFAULT_COUNTRY].filter(Boolean).join(" · ");

  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      // If user edited the title, send a shallow copy with the override.
      // Local calendar.title stays untouched.
      const overrideTitle = publishTitle.trim();
      const effectiveCalendar =
        overrideTitle && overrideTitle !== calendar.title.trim()
          ? { ...calendar, title: overrideTitle }
          : calendar;
      const detail = await shareCalendar({
        calendar: effectiveCalendar,
        country: DEFAULT_COUNTRY,
        sharedByName: shareName.trim() || undefined,
      });
      if (shareName.trim()) {
        AsyncStorage.setItem(SHARE_NAME_KEY, shareName.trim()).catch(() => {});
      }
      toast.show("Published to community");
      onPublished?.(detail);
      onClose();
    } catch (err) {
      console.warn("[publish] failed", err);
      if (err instanceof ApiError) {
        toast.show(
          err.status === 401 ? "API key mismatch" : `Publish failed · ${err.message}`,
        );
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        toast.show(`Publish failed · ${msg}`);
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 22, paddingTop: 4 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              backgroundColor: S.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <GlobeIcon color="#fff" size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 21,
                fontWeight: "800",
                color: S.ink,
                letterSpacing: -0.5,
              }}
            >
              Publish calendar
            </Text>
            <Text
              style={{
                fontSize: 12.5,
                color: S.sec,
                fontWeight: "600",
                marginTop: 1,
              }}
            >
              Share with people nearby
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            disabled={publishing}
            hitSlop={10}
            style={{
              width: 32,
              height: 32,
              borderRadius: 99,
              backgroundColor: "#F0EAE4",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <XIcon color={S.sec} size={14} />
          </Pressable>
        </View>

        {/* Editable title */}
        <View
          style={{
            paddingHorizontal: 14,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: S.line,
            backgroundColor: "#fff",
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: 10.5,
              fontWeight: "800",
              color: S.ter,
              letterSpacing: 0.6,
              marginTop: 10,
            }}
          >
            TITLE
          </Text>
          <TextInput
            value={publishTitle}
            onChangeText={setPublishTitle}
            placeholder="Give it a clear name"
            placeholderTextColor={S.ter}
            editable={!publishing}
            maxLength={120}
            style={{
              paddingTop: 2,
              paddingBottom: 12,
              fontSize: 17,
              color: S.ink,
              fontWeight: "800",
              letterSpacing: -0.3,
            }}
          />
        </View>

        {/* Optional sharer name */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 14,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: S.line,
            backgroundColor: "#fff",
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "800",
              color: S.ter,
              letterSpacing: 0.6,
            }}
          >
            YOU
          </Text>
          <TextInput
            value={shareName}
            onChangeText={setShareName}
            placeholder="Your name (optional)"
            placeholderTextColor={S.ter}
            editable={!publishing}
            maxLength={40}
            style={{
              flex: 1,
              paddingVertical: 12,
              fontSize: 14,
              color: S.ink,
              fontWeight: "700",
            }}
          />
        </View>

        {/* Locator + event count */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 6,
            paddingHorizontal: 4,
            marginBottom: 14,
          }}
        >
          <PinIcon color={S.sec} size={13} />
          <Text
            style={{
              flex: 1,
              fontSize: 12.5,
              color: S.sec,
              fontWeight: "700",
              letterSpacing: -0.1,
            }}
            numberOfLines={1}
          >
            {locator || "(set your city on the home screen first)"}
          </Text>
          <Text style={{ fontSize: 12, color: S.ter, fontWeight: "700" }}>
            {calendar.events.length} dates
          </Text>
        </View>

        {/* CTA + cancel */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: Math.max(insets.bottom, 10) }}>
          <Pressable
            onPress={onClose}
            disabled={publishing}
            style={{
              flex: 1,
              paddingVertical: 15,
              borderRadius: 18,
              backgroundColor: "#F0EAE4",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "800", color: S.ink }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handlePublish}
            disabled={publishing}
            style={{
              flex: 1.6,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 15,
              borderRadius: 18,
              backgroundColor: S.ink,
              opacity: publishing ? 0.7 : 1,
              shadowColor: S.ink,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.22,
              shadowRadius: 14,
              elevation: 4,
            }}
          >
            {publishing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <CheckIcon color="#fff" size={15} />
            )}
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#fff" }}>
              {publishing ? "Publishing…" : "Publish"}
            </Text>
          </Pressable>
        </View>
      </View>
    </SlideUpSheet>
  );
}
