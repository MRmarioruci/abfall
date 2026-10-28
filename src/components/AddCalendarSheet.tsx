import { useState } from "react";
import { View } from "react-native";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { ArtTile, OptionRow, SheetHeader } from "./ui/sheet";
import { ChevRIcon, QrIcon } from "./icons/Icons";
import { ScanArt, BrowseArt } from "./art/Art";
import { CommunityCalendarsSheet } from "./CommunityCalendarsSheet";
import { useTheme } from "../theme/ThemeContext";
import { useT } from "../context/LocaleContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Opens the camera. Also used when the community sheet pivots to
   *  "scan my own calendar". */
  onScan: () => void;
  /** Opens the camera to scan a shared calendar's QR code. */
  onScanQr: () => void;
}

/**
 * Two picture tiles (scan your paper calendar, or find one someone nearby
 * already shared) and a row for the third way in: a QR code someone shows
 * you. The camera itself is a full screen (ScanCameraScreen), so this
 * sheet is only the choice.
 */
export function AddCalendarSheet({ visible, onClose, onScan, onScanQr }: Props) {
  const { S, ST } = useTheme();
  const { t } = useT();
  const [showCommunity, setShowCommunity] = useState(false);

  return (
    <>
      <CommunityCalendarsSheet
        visible={showCommunity}
        onClose={() => setShowCommunity(false)}
        onScanCalendar={() => {
          setShowCommunity(false);
          onScan();
        }}
      />
      <SlideUpSheet visible={visible} onClose={onClose}>
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14 }}>
          <SheetHeader title={t("add.title")} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <ArtTile
              label={t("add.tile.scan")}
              bg={ST.kehricht.soft}
              onPress={() => {
                onClose();
                onScan();
              }}
            >
              <ScanArt />
            </ArtTile>
            <ArtTile
              label={t("add.tile.browse")}
              bg={ST.papier.soft}
              onPress={() => {
                // Close first: two slide-up sheets stacked feels wrong.
                onClose();
                setShowCommunity(true);
              }}
            >
              <BrowseArt />
            </ArtTile>
          </View>
          <View style={{ marginTop: 10 }}>
            <OptionRow
              label={t("add.qr.row")}
              subtitle={t("add.qr.row_sub")}
              icon={<QrIcon color={ST.metall.ink} size={20} />}
              iconBg={ST.metall.soft}
              onPress={() => {
                onClose();
                onScanQr();
              }}
              right={<ChevRIcon color={S.ter} size={13} />}
            />
          </View>
        </View>
      </SlideUpSheet>
    </>
  );
}
