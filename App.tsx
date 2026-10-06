import "./global.css";
import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";
import { TabNavigator } from "./src/navigation/TabNavigator";
import { CalendarProvider } from "./src/context/CalendarContext";
import { ToastProvider } from "./src/components/ui/Toast";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { hasOnboarded, markOnboarded } from "./src/services/onboarding";
import { LocaleProvider } from "./src/context/LocaleContext";
import { loadStoredLocale, type Locale } from "./src/i18n";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  // Bootstrap is two awaits: onboarding flag + stored locale. Both load in
  // parallel; we render an empty placeholder until both resolve so we never
  // flash the wrong screen or the wrong language.
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [initialLocale, setInitialLocale] = useState<Locale | null>(null);

  useEffect(() => {
    hasOnboarded().then((done) => setShowOnboarding(!done));
    loadStoredLocale().then((l) => setInitialLocale(l ?? "en"));
  }, []);

  const handleOnboardingDone = () => {
    markOnboarded().catch(() => {});
    setShowOnboarding(false);
  };

  const ready = showOnboarding !== null && initialLocale !== null;

  return (
    <SafeAreaProvider>
      {ready ? (
        <LocaleProvider initialLocale={initialLocale}>
          <ToastProvider>
            <CalendarProvider>
              <NavigationContainer>
                {showOnboarding ? (
                  <OnboardingScreen onDone={handleOnboardingDone} />
                ) : (
                  <TabNavigator />
                )}
                <StatusBar style="dark" />
              </NavigationContainer>
            </CalendarProvider>
          </ToastProvider>
        </LocaleProvider>
      ) : (
        <View style={{ flex: 1, backgroundColor: "#F5F2F7" }} />
      )}
    </SafeAreaProvider>
  );
}
