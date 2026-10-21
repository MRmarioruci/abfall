import { useState } from "react";
import { View } from "react-native";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { ArtTile, SheetHeader } from "./ui/sheet";
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
}

/**
 * Two picture tiles: scan your paper calendar, or find one someone nearby
 * already shared. The camera itself is a full screen (ScanCameraScreen),
 * so this sheet is only the choice.
 */
export function AddCalendarSheet({ visible, onClose, onScan }: Props) {
  const { ST } = useTheme();
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
        </View>
      </SlideUpSheet>
    </>
  );
}
