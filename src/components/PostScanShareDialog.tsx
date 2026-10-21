import { View, Text } from "react-native";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { PillButton, QuietButton, SheetHeader, SoftCard } from "./ui/sheet";
import { NeighboursArt } from "./art/Art";
import { ST } from "../theme/colors";
import { CheckIcon, GlobeIcon } from "./icons/Icons";
import type { SavedCalendar } from "../types/calendar";
import { useT } from "../context/LocaleContext";
import { FONT } from "../theme/type";

interface Props {
  visible: boolean;
  calendar: SavedCalendar | null;
  onShare: () => void;
  onSkip: () => void;
}

/**
 * Shown right after a scan is saved. Publishing is the default, so the
 * sheet is one picture of neighbours, one line, and a single button;
 * keeping it private is the quiet option underneath.
 */
export function PostScanShareDialog({ visible, calendar, onShare, onSkip }: Props) {
  const { t } = useT();
  if (!calendar) return null;

  return (
    <SlideUpSheet visible={visible} onClose={onSkip}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 }}>
        <SheetHeader
          title={t("share.post_scan.saved")}
          subtitle={calendar.title}
          right={
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 99,
                backgroundColor: ST.gruengut.soft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  backgroundColor: "#5BA86B",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckIcon color="#fff" size={14} />
              </View>
            </View>
          }
        />

        {/* The pitch is a picture: neighbours finding this calendar. */}
        <SoftCard bg={ST.papier.soft} style={{ alignItems: "center", paddingVertical: 22 }}>
          <NeighboursArt size={132} />
          <Text
            style={{
              fontSize: 19,
              fontFamily: FONT.w800,
              color: ST.papier.ink,
              letterSpacing: -0.4,
              marginTop: 10,
              textAlign: "center",
            }}
          >
            {t("share.post_scan.title")}
          </Text>
          <PillButton
            label={t("share.post_scan.confirm")}
            icon={<GlobeIcon color="#fff" size={17} />}
            onPress={onShare}
            style={{ alignSelf: "stretch", marginTop: 18 }}
          />
        </SoftCard>

        <QuietButton label={t("share.post_scan.keep_private")} onPress={onSkip} />
      </View>
    </SlideUpSheet>
  );
}
