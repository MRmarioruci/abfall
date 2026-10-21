import { useState } from "react";
import { View, Text, Share } from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { ConfirmSheet } from "./ConfirmSheet";
import { PublishDialog } from "./PublishDialog";
import { PillButton, QuietButton, SheetHeader, SoftCard } from "./ui/sheet";
import { NeighboursArt } from "./art/Art";
import { S, ST } from "../theme/colors";
import { ShareIcon, LinkIcon, GlobeIcon } from "./icons/Icons";
import type { SavedCalendar } from "../types/calendar";
import { useCalendars } from "../context/CalendarContext";
import { useToast } from "./ui/Toast";
import { deleteCommunityCalendar } from "../services/api";
import { shareUrlFor } from "../lib/shareLinks";
import { useT } from "../context/LocaleContext";
import { FONT } from "../theme/type";

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
        toast.show(t("share.toast.unpublish_failed"), { variant: "error" });
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

  const subtitle = [calendar.location, t(calendar.events.length === 1 ? "share.dates_one" : "share.dates_other", { n: calendar.events.length })]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 }}>
        <SheetHeader title={calendar.title} subtitle={subtitle} />

        {!isPublished || !shareUrl ? (
          // Not public yet: one picture, one line, one button.
          <SoftCard bg={ST.papier.soft} style={{ alignItems: "center", paddingVertical: 22 }}>
            <NeighboursArt size={132} />
            <Text style={{ fontSize: 19, fontFamily: FONT.w800, color: ST.papier.ink, letterSpacing: -0.4, marginTop: 10 }}>
              {t("share.help_title")}
            </Text>
            <PillButton
              label={t("share.publish_now")}
              icon={<GlobeIcon color="#fff" size={17} />}
              onPress={togglePublish}
              style={{ alignSelf: "stretch", marginTop: 18 }}
            />
          </SoftCard>
        ) : (
          <>
            {/* Live: the QR code is the hero; scanning it is the quickest share. */}
            <SoftCard bg={ST.gruengut.soft} style={{ alignItems: "center", paddingVertical: 22 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 16 }}>
                <View style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: "#5BA86B" }} />
                <Text style={{ fontSize: 13, fontFamily: FONT.w800, color: ST.gruengut.ink }}>{t("share.live_title")}</Text>
              </View>
              <View style={{ padding: 14, borderRadius: 22, backgroundColor: "#fff" }}>
                <QRCode value={shareUrl} size={168} backgroundColor="#ffffff" color={S.ink} ecl="M" />
              </View>
              <Text style={{ fontSize: 13, color: ST.gruengut.ink, fontFamily: FONT.w700, marginTop: 12, opacity: 0.75 }} numberOfLines={1}>
                {shareUrl.replace(/^https?:\/\//, "")}
              </Text>
            </SoftCard>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <PillButton
                label={t("share.copy")}
                variant="secondary"
                icon={<LinkIcon color={S.ink} size={16} />}
                onPress={handleCopyLink}
                style={{ flex: 1 }}
              />
              <PillButton
                label={t("share.share")}
                icon={<ShareIcon color="#fff" size={16} />}
                onPress={handleNativeShare}
                style={{ flex: 1 }}
              />
            </View>
            <QuietButton label={t("share.unpublish.label")} onPress={togglePublish} />
          </>
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
