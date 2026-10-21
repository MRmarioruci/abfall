import "./global.css";
import { useEffect, useState } from "react";
import { Notifications } from "./src/services/notificationsModule";
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
import { deviceLocale, loadStoredLocale, type Locale } from "./src/i18n";
import {
  useFonts,
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
  HankenGrotesk_900Black,
} from "@expo-google-fonts/hanken-grotesk";
import { S } from "./src/theme/colors";

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  // Bootstrap waits for the onboarding flag, the stored locale and the
  // fonts, in parallel; an empty placeholder shows until all resolve so we
  // never flash the wrong screen, language or font.
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [initialLocale, setInitialLocale] = useState<Locale | null>(null);
  // A font that fails to load falls back to the system font rather than
  // blocking the app.
  const [fontsLoaded, fontError] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
    HankenGrotesk_900Black,
  });

  useEffect(() => {
    hasOnboarded().then((done) => setShowOnboarding(!done));
    loadStoredLocale().then((l) => setInitialLocale(l ?? deviceLocale()));
  }, []);

  const handleOnboardingDone = () => {
    markOnboarded().catch(() => {});
    setShowOnboarding(false);
  };

  const ready = showOnboarding !== null && initialLocale !== null && (fontsLoaded || !!fontError);

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
        <View style={{ flex: 1, backgroundColor: S.bg }} />
      )}
    </SafeAreaProvider>
  );
}
