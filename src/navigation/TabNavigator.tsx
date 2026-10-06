import { useState, useCallback, useMemo } from "react";
import { View } from "react-native";
import { BottomTabBar } from "../components/BottomTabBar";
import { AddCalendarSheet } from "../components/AddCalendarSheet";
import { CalendarSwitcher } from "../components/CalendarSwitcher";
import { HomeScreen } from "../screens/HomeScreen";
import { CollectionCentersScreen } from "../screens/CollectionCentersScreen";
import { RemindersScreen } from "../screens/RemindersScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ScanReviewScreen } from "../screens/ScanReviewScreen";
import { useCalendars } from "../context/CalendarContext";
import { STREAM_ORDER, type WasteStreamId } from "../theme/colors";
import type { ImageInput } from "../services/parseCalendar";

const TABS = ["Home", "Map", "Reminders", "Profile"] as const;

type TabId = (typeof TABS)[number];

export function TabNavigator() {
  const { active } = useCalendars();
  const [activeTab, setActiveTab] = useState<TabId>("Home");
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [scanImages, setScanImages] = useState<ImageInput[] | null>(null);

  // Count of reminders currently turned on across all streams of the active
  // calendar — drives the badge on the Reminders tab icon.
  const reminderBadge = useMemo(() => {
    if (!active?.reminders) return 0;
    let n = 0;
    for (const id of STREAM_ORDER as WasteStreamId[]) {
      for (const r of active.reminders[id] || []) {
        if (r.on) n++;
      }
    }
    return n;
  }, [active]);

  const handleAddPress = useCallback(() => {
    setAddSheetVisible(true);
  }, []);

  const handleSwitcherOpen = useCallback(() => {
    setSwitcherVisible(true);
  }, []);

  const handleScanConfirm = useCallback((images: ImageInput[]) => {
    if (images.length === 0) return;
    setScanImages(images);
  }, []);

  const handleScanComplete = useCallback(() => {
    setScanImages(null);
    setActiveTab("Home");
  }, []);

  if (scanImages) {
    return (
      <ScanReviewScreen
        images={scanImages}
        onComplete={handleScanComplete}
        onBack={() => setScanImages(null)}
      />
    );
  }

  // Conditional render: only the active tab's screen is mounted at any one
  // time. This ensures heavy native modules (Google Maps on the Map tab)
  // are fully torn down when the user navigates away — so other tabs
  // don't pay any background cost.
  return (
    <View style={{ flex: 1 }}>
      {activeTab === "Home" && (
        <HomeScreen
          onCalendarPress={handleSwitcherOpen}
          onGoToReminders={() => setActiveTab("Reminders")}
        />
      )}
      {activeTab === "Map" && <CollectionCentersScreen />}
      {activeTab === "Reminders" && <RemindersScreen />}
      {activeTab === "Profile" && <ProfileScreen />}

      <BottomTabBar
        activeTab={activeTab}
        onTabPress={(tab) => setActiveTab(tab as TabId)}
        onAddPress={handleAddPress}
        badges={{ Reminders: reminderBadge }}
      />

      <AddCalendarSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        onScanConfirm={handleScanConfirm}
        onRequestReopen={() => setAddSheetVisible(true)}
      />
      <CalendarSwitcher
        visible={switcherVisible}
        onClose={() => {
          setSwitcherVisible(false)
        }}
      />
    </View>
  );
}
