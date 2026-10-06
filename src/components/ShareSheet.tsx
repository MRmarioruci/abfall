import { useState } from "react";
import { View, Text, Pressable, Share } from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { ConfirmSheet } from "./ConfirmSheet";
import { PublishDialog } from "./PublishDialog";
import { S } from "../theme/colors";
import { ShareIcon, LinkIcon, GlobeIcon, PinIcon, CheckIcon } from "./icons/Icons";
import type { SavedCalendar } from "../types/calendar";
import { useCalendars } from "../context/CalendarContext";
import { useToast } from "./ui/Toast";
import { deleteCommunityCalendar } from "../services/api";
import { shareUrlFor } from "../lib/shareLinks";
import { useT } from "../context/LocaleContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  calendar: SavedCalendar | null;
}

export function ShareSheet({ visible, onClose, calendar }: Props) {
  const { patchCalendar } = useCalendars();
  const toast = useToast();
  const { t } = useT();
  // Publish UI lives in its own dialog now — this just controls its
  // visibility. Same dialog is used everywhere a "publish" action lives.
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  // Controls the unpublish ConfirmSheet — keeps us out of native Alert
  // territory so the UI stays consistent with the rest of the app.
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);

  if (!calendar) return null;

  // shareCode is the server id, set once the calendar is published. The
  // link is rebuilt from it rather than read from the stored shareUrl,
  // which older builds pointed at a domain that isn't ours.
  const shareUrl = calendar.shareCode ? shareUrlFor(calendar.shareCode) : null;
  const isPublished = !!calendar.shared;
  const collectionDates = t(
    calendar.events.length === 1 ? "share.collection_dates_one" : "share.collection_dates_other",
    { n: calendar.events.length },
  );

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    try {
      const message = [
        calendar.title,
        calendar.location ? `📍 ${calendar.location}` : null,
        collectionDates,
        "",
        t("share.message.open", { url: shareUrl }),
      ]
        .filter(Boolean)
        .join("\n");
      await Share.share({ message, title: calendar.title });
    } catch {
      // user cancelled or share unavailable — no-op
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await Clipboard.setStringAsync(shareUrl);
    toast.show(t("share.toast.copied"));
  };

  const handleConfirmUnpublish = async () => {
    // shareCode holds the server id once published. Calendars marked
    // shared by older builds may not have one; those were never uploaded.
    if (calendar.shareCode) {
      try {
        await deleteCommunityCalendar(calendar.shareCode);
      } catch (err) {
        console.warn("[share] unpublish failed", err);
        toast.show(t("share.toast.unpublish_failed"));
        return;
      }
    }
    await patchCalendar(calendar.id, {
      shared: false,
      shareCode: undefined,
      shareUrl: undefined,
    });
    toast.show(t("share.toast.unpublished"));
  };

  const togglePublish = () => {
    if (isPublished) {
      setConfirmUnpublish(true);
      return;
    }
    // Hand off to the reusable PublishDialog, which marks the calendar
    // as published once the server accepts it.
    setShowPublishDialog(true);
  };

  return (
    <>
    <SlideUpSheet visible={visible} onClose={onClose} height={760}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 }}>
        {/* Header */}
        <Text style={{ fontSize: 11, fontWeight: "800", color: S.ter, letterSpacing: 1.2 }}>
          {t("share.eyebrow")}
        </Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: S.ink, letterSpacing: -0.5, marginTop: 4 }} numberOfLines={1}>
          {calendar.title}
        </Text>
        {calendar.location && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 }}>
            <PinIcon color={S.sec} size={13} />
            <Text style={{ fontSize: 13, color: S.sec, fontWeight: "600" }}>
              {calendar.location}
            </Text>
          </View>
        )}
        <Text style={{ fontSize: 13, color: S.ter, fontWeight: "600", marginTop: 4 }}>
          {collectionDates}
        </Text>

        {/* HERO — Community publish */}
        <View
          style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 24,
            backgroundColor: "#fff",
            borderWidth: 2,
            borderColor: isPublished ? S.ink : S.line,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: isPublished ? S.ink : "#F0EAE4",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GlobeIcon color={isPublished ? "#fff" : S.ink} size={26} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: S.ter, letterSpacing: 1.2 }}>
                {isPublished ? t("share.published_eyebrow") : t("share.publish_eyebrow")}
              </Text>
              <Text style={{ fontSize: 17, fontWeight: "800", color: S.ink, letterSpacing: -0.3, marginTop: 3 }}>
                {isPublished ? t("share.live_title") : t("share.help_title")}
              </Text>
              <Text style={{ fontSize: 12.5, color: S.sec, fontWeight: "600", marginTop: 3, lineHeight: 17 }}>
                {isPublished
                  ? t("share.live_body")
                  : t("share.help_body")}
              </Text>
            </View>
          </View>


          <Pressable
            onPress={togglePublish}
            style={{
              marginTop: 14,
              height: 48,
              borderRadius: 99,
              backgroundColor: isPublished ? "#fff" : S.ink,
              borderWidth: 1.5,
              borderColor: isPublished ? S.ink : "transparent",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
            }}
          >
            {isPublished ? (
              <CheckIcon color={S.ink} size={14} />
            ) : (
              <GlobeIcon color="#fff" size={15} />
            )}
            <Text
              style={{
                fontSize: 15,
                fontWeight: "800",
                color: isPublished ? S.ink : "#fff",
                letterSpacing: 0.2,
              }}
            >
              {isPublished ? t("share.unpublish_button") : t("share.publish_now")}
            </Text>
          </Pressable>
        </View>

        {/* Secondary: QR + link */}
        <Text style={{ fontSize: 11, fontWeight: "800", color: S.ter, letterSpacing: 1.2, marginTop: 22 }}>
          {t("share.direct")}
        </Text>

        {/* QR + link combined card — only once there's a real link */}
        {!shareUrl ? (
          <Text style={{ marginTop: 8, fontSize: 13, color: S.sec, fontWeight: "600" }}>
            {t("share.link_after_publish")}
          </Text>
        ) : (
        <View
          style={{
            marginTop: 8,
            padding: 16,
            borderRadius: 18,
            backgroundColor: "#fff",
            borderWidth: 1.5,
            borderColor: S.line,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View
            style={{
              padding: 6,
              borderRadius: 12,
              backgroundColor: "#fff",
            }}
          >
            <QRCode
              value={shareUrl}
              size={84}
              backgroundColor="#ffffff"
              color={S.ink}
              ecl="M"
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <LinkIcon color={S.sec} size={13} />
              <Text style={{ fontSize: 11, fontWeight: "800", color: S.ter, letterSpacing: 1.2 }}>
                {t("share.link")}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: S.ink, fontWeight: "700", marginTop: 4 }} numberOfLines={1}>
              {shareUrl}
            </Text>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
              <Pressable
                onPress={handleCopyLink}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 99,
                  backgroundColor: "#F0EAE4",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "800", color: S.ink }}>{t("share.copy")}</Text>
              </Pressable>
              <Pressable
                onPress={handleNativeShare}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  gap: 5,
                  paddingVertical: 8,
                  borderRadius: 99,
                  backgroundColor: S.ink,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShareIcon color="#fff" size={12} />
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#fff" }}>{t("share.share")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
        )}
      </View>
    </SlideUpSheet>

    <PublishDialog
      visible={showPublishDialog}
      onClose={() => setShowPublishDialog(false)}
      calendar={calendar}
    />

    <ConfirmSheet
      visible={confirmUnpublish}
      onClose={() => setConfirmUnpublish(false)}
      title={t("share.unpublish.title")}
      body={t("share.unpublish.body")}
      confirmLabel={t("share.unpublish.label")}
      variant="danger"
      onConfirm={handleConfirmUnpublish}
    />
    </>
  );
}
