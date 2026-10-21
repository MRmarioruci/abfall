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
import { View, Text, TextInput, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { PillButton, QuietButton, SheetHeader, SoftCard } from "./ui/sheet";
import { NeighboursArt } from "./art/Art";
import { useTheme } from "../theme/ThemeContext";
import { GlobeIcon, UserIcon, XIcon } from "./icons/Icons";
import type { SavedCalendar } from "../types/calendar";
import { ApiError, shareCalendar } from "../services/api";
import { useCalendars } from "../context/CalendarContext";
import { useToast } from "./ui/Toast";
import { useT } from "../context/LocaleContext";
import { FONT } from "../theme/type";

const SHARE_NAME_KEY = "abfall_share_name";
const DEFAULT_COUNTRY = "CH";

interface Props {
  visible: boolean;
  onClose: () => void;
  calendar: SavedCalendar | null;
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

export function PublishDialog({ visible, onClose, calendar }: Props) {
  const { S, ST } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t } = useT();
  const { patchCalendar } = useCalendars();
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
      // Only mark the local copy as published once the server has it.
      await patchCalendar(calendar.id, {
        shared: true,
        shareCode: detail.id,
      });
      toast.show(t("publish.toast.published"));
      onClose();
    } catch (err) {
      console.warn("[publish] failed", err);
      if (err instanceof ApiError) {
        toast.show(
          err.status === 429
            ? t("publish.toast.rate_limited")
            : t("publish.toast.failed"),
        );
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        toast.show(t("publish.toast.failed_detail", { error: msg }), { variant: "error" });
      }
    } finally {
      setPublishing(false);
    }
  };

  const datesLabel = t(calendar.events.length === 1 ? "share.dates_one" : "share.dates_other", {
    n: calendar.events.length,
  });
  // One line under the title: where it will be filed, and how many dates.
  const subtitle = locator ? `${locator} · ${datesLabel}` : t("publish.no_city");
  const initial = shareName.trim().charAt(0).toUpperCase();

  return (
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: Math.max(insets.bottom, 12) }}>
        <SheetHeader
          title={t("publish.title")}
          subtitle={subtitle}
          right={
            <Pressable
              onPress={onClose}
              disabled={publishing}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t("publish.close")}
              style={({ pressed }) => ({
                width: 34,
                height: 34,
                borderRadius: 99,
                backgroundColor: S.card,
                alignItems: "center",
                justifyContent: "center",
                transform: [{ scale: pressed ? 0.92 : 1 }],
              })}
            >
              <XIcon color={S.sec} size={14} />
            </Pressable>
          }
        />

        {/* The calendar as neighbours will see it: picture + editable name. */}
        <SoftCard bg={ST.papier.soft} style={{ alignItems: "center", paddingTop: 16, paddingBottom: 14 }}>
          <NeighboursArt size={104} />
          <TextInput
            value={publishTitle}
            onChangeText={setPublishTitle}
            placeholder={t("publish.title_placeholder")}
            placeholderTextColor={ST.papier.ink + "66"}
            editable={!publishing}
            maxLength={120}
            accessibilityLabel={t("publish.title_placeholder")}
            textAlign="center"
            style={{
              alignSelf: "stretch",
              marginTop: 10,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 18,
              backgroundColor: S.card,
              fontSize: 18,
              color: S.ink,
              fontFamily: FONT.w800,
              letterSpacing: -0.3,
            }}
          />
        </SoftCard>

        {/* Optional sharer name, shown with the calendar in the catalog. */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginTop: 10,
            paddingLeft: 10,
            paddingRight: 14,
            minHeight: 60,
            borderRadius: 20,
            backgroundColor: S.card,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              backgroundColor: ST.karton.soft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {initial ? (
              <Text style={{ fontSize: 17, fontFamily: FONT.w800, color: ST.karton.ink }}>{initial}</Text>
            ) : (
              <UserIcon color={ST.karton.ink} size={20} />
            )}
          </View>
          <TextInput
            value={shareName}
            onChangeText={setShareName}
            placeholder={t("publish.name_placeholder")}
            placeholderTextColor={S.ter}
            editable={!publishing}
            maxLength={40}
            accessibilityLabel={t("publish.name_placeholder")}
            style={{
              flex: 1,
              paddingVertical: 12,
              fontSize: 16,
              color: S.ink,
              fontFamily: FONT.w800,
              letterSpacing: -0.2,
            }}
          />
        </View>

        <PillButton
          label={publishing ? t("publish.publishing") : t("publish.publish")}
          icon={<GlobeIcon color={S.onInk} size={17} />}
          loading={publishing}
          onPress={handlePublish}
          style={{ marginTop: 18 }}
        />
        <QuietButton
          label={t("common.cancel")}
          onPress={() => {
            if (!publishing) onClose();
          }}
        />
      </View>
    </SlideUpSheet>
  );
}
