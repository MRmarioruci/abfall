import { useState } from "react";
import { View, Text, Pressable, Share } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { ConfirmSheet } from "./ConfirmSheet";
import { PublishDialog } from "./PublishDialog";
import { S } from "../theme/colors";
import { ShareIcon, LinkIcon, GlobeIcon, PinIcon, CheckIcon } from "./icons/Icons";
import type { SavedCalendar } from "../types/calendar";
import { useCalendars } from "../context/CalendarContext";
import { useToast } from "./ui/Toast";
import { deleteCommunityCalendar } from "../services/api";

interface Props {
  visible: boolean;
  onClose: () => void;
  calendar: SavedCalendar | null;
}

function makeShareCode(id: string): string {
  // Stable, short share code derived from the calendar id. The real backend
  // (Supabase) will issue these — this is just so the UI has something to show.
  const seed = id + "abfall";
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let n = Math.abs(h);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length);
  }
  return code;
}

export function ShareSheet({ visible, onClose, calendar }: Props) {
  const { patchCalendar } = useCalendars();
  const toast = useToast();
  // Publish UI lives in its own dialog now — this just controls its
  // visibility. Same dialog is used everywhere a "publish" action lives.
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  // Controls the unpublish ConfirmSheet — keeps us out of native Alert
  // territory so the UI stays consistent with the rest of the app.
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);

  if (!calendar) return null;

  // If the calendar has a server-assigned share code (set after publish)
  // use that for the share URL. Otherwise generate a stable local one so
  // the QR/link section shows something meaningful even before publish.
  const shareCode = calendar.shareCode || makeShareCode(calendar.id);
  const shareUrl = calendar.shareUrl || `https://abfall.app/c/${shareCode}`;
  const isPublished = !!calendar.shared;

  const handleNativeShare = async () => {
    try {
      const message = [
        calendar.title,
        calendar.location ? `📍 ${calendar.location}` : null,
        `${calendar.events.length} collection dates`,
        "",
        `Open in Abfall: ${shareUrl}`,
      ]
        .filter(Boolean)
        .join("\n");
      await Share.share({ message, title: calendar.title });
    } catch {
      // user cancelled or share unavailable — no-op
    }
  };

  const handleCopyLink = () => {
    // Clipboard isn't wired yet (expo-clipboard not installed). Show the
    // link in a toast so the user can read it; once we wire clipboard the
    // message becomes accurate.
    toast.show(`Link: ${shareUrl}`);
  };

  const handleConfirmUnpublish = async () => {
    // shareCode holds the server id once published. Calendars marked
    // shared by older builds may not have one; those were never uploaded.
    if (calendar.shareCode) {
      try {
        await deleteCommunityCalendar(calendar.shareCode);
      } catch (err) {
        console.warn("[share] unpublish failed", err);
        toast.show("Couldn't unpublish · try again");
        return;
      }
    }
    await patchCalendar(calendar.id, {
      shared: false,
      shareCode: undefined,
      shareUrl: undefined,
    });
    toast.show("Removed from community");
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
          SHARE CALENDAR
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
          {calendar.events.length} collection dates
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
                {isPublished ? "PUBLISHED" : "PUBLISH TO COMMUNITY"}
              </Text>
              <Text style={{ fontSize: 17, fontWeight: "800", color: S.ink, letterSpacing: -0.3, marginTop: 3 }}>
                {isPublished ? "Live for neighbours" : "Help your neighbours"}
              </Text>
              <Text style={{ fontSize: 12.5, color: S.sec, fontWeight: "600", marginTop: 3, lineHeight: 17 }}>
                {isPublished
                  ? "Anyone nearby can find and import this calendar by location."
                  : "Make this calendar discoverable so people in your area can find it."}
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
              {isPublished ? "Published — tap to unpublish" : "Publish now"}
            </Text>
          </Pressable>
        </View>

        {/* Secondary: QR + link */}
        <Text style={{ fontSize: 11, fontWeight: "800", color: S.ter, letterSpacing: 1.2, marginTop: 22 }}>
          OR SHARE DIRECTLY
        </Text>

        {/* QR + link combined card */}
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
                SHARE LINK
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: S.ink, fontWeight: "700", marginTop: 4 }} numberOfLines={1}>
              {shareUrl}
            </Text>
            <Text style={{ fontSize: 11, color: S.ter, fontWeight: "600", marginTop: 3 }}>
              Code {shareCode}
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
                <Text style={{ fontSize: 12, fontWeight: "800", color: S.ink }}>Copy</Text>
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
                <Text style={{ fontSize: 12, fontWeight: "800", color: "#fff" }}>Share</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
      title="Unpublish this calendar?"
      body="It's removed from the community so nobody new can find it. People who already imported it keep their own copy."
      confirmLabel="Unpublish"
      variant="danger"
      onConfirm={handleConfirmUnpublish}
    />
    </>
  );
}
