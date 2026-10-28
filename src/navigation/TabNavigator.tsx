import { useState, useCallback, useMemo, useEffect } from "react";
import { BackHandler, View } from "react-native";
import { BottomTabBar } from "../components/BottomTabBar";
import { AddCalendarSheet } from "../components/AddCalendarSheet";
import { CalendarSwitcher } from "../components/CalendarSwitcher";
import { SharedLinkHandler } from "../components/SharedLinkHandler";
import { HomeScreen } from "../screens/HomeScreen";
import { CollectionCentersScreen } from "../screens/CollectionCentersScreen";
import { RemindersScreen } from "../screens/RemindersScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ScanReviewScreen } from "../screens/ScanReviewScreen";
import { ScanCameraScreen } from "../screens/ScanCameraScreen";
import { LeaderboardScreen } from "../screens/LeaderboardScreen";
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
  // Full-screen camera: shooting calendar pages, or a shared calendar's QR code.
  const [cameraMode, setCameraMode] = useState<"paper" | "qr" | null>(null);
  const cameraOpen = cameraMode !== null;
  const [scanImages, setScanImages] = useState<ImageInput[] | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

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
    setCameraMode(null);
    if (images.length === 0) return;
    setScanImages(images);
  }, []);

  const handleScanComplete = useCallback(() => {
    setScanImages(null);
    setActiveTab("Home");
  }, []);

  // Android hardware back. Sheets are Modals and handle it themselves;
  // here back leaves the scan review (same as its on-screen back button),
  // then returns to Home, and only exits the app from Home.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (scanImages) {
        setScanImages(null);
        return true;
      }
      if (cameraOpen) {
        setCameraMode(null);
        return true;
      }
      if (leaderboardOpen) {
        setLeaderboardOpen(false);
        return true;
      }
      if (activeTab !== "Home") {
        setActiveTab("Home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [scanImages, cameraOpen, leaderboardOpen, activeTab]);

  if (scanImages) {
    return (
      <ScanReviewScreen
        images={scanImages}
        onComplete={handleScanComplete}
        onBack={() => setScanImages(null)}
      />
    );
  }

  if (cameraOpen) {
    return <ScanCameraScreen mode={cameraMode} onClose={() => setCameraMode(null)} onDone={handleScanConfirm} />;
  }

  if (leaderboardOpen) {
    return (
      <View style={{ flex: 1 }}>
        <LeaderboardScreen onBack={() => setLeaderboardOpen(false)} />
        <SharedLinkHandler />
      </View>
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
          onOpenMap={() => setActiveTab("Map")}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onAddPress={handleAddPress}
        />
      )}
      {activeTab === "Map" && <CollectionCentersScreen />}
      {activeTab === "Reminders" && <RemindersScreen onAddCalendar={handleAddPress} />}
      {activeTab === "Profile" && <ProfileScreen onOpenLeaderboard={() => setLeaderboardOpen(true)} />}

      <BottomTabBar
        activeTab={activeTab}
        onTabPress={(tab) => setActiveTab(tab as TabId)}
        onAddPress={handleAddPress}
        badges={{ Reminders: reminderBadge }}
      />

      <AddCalendarSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
        onScan={() => setCameraMode("paper")}
        onScanQr={() => setCameraMode("qr")}
      />
      <SharedLinkHandler />
      <CalendarSwitcher
        visible={switcherVisible}
        onClose={() => {
          setSwitcherVisible(false)
        }}
      />
    </View>
  );
}
