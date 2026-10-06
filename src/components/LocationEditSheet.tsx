import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, TextInput, Alert, Linking, Platform, ActivityIndicator, ScrollView, Keyboard, Dimensions } from "react-native";
import * as Location from "expo-location";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { S } from "../theme/colors";
import { PinIcon, XIcon } from "./icons/Icons";
import { searchPlaces, type PlaceSuggestion } from "../services/geocoding";
import { useT } from "../context/LocaleContext";

const SCREEN_HEIGHT = Dimensions.get("window").height;
// Sizes of the fixed parts: header block, input, auto-locate, save, padding.
const FIXED_CONTENT_HEIGHT = 360;
// Smallest dropdown we'd still show — below this we'd just hide it.
const MIN_DROPDOWN_HEIGHT = 120;
// Largest dropdown we'd ever grow to even on big screens.
const MAX_DROPDOWN_HEIGHT = 280;

// Light mapping of Swiss canton full names → 2-letter codes. Reverse geocoding
// returns the full name; we abbreviate so the label stays compact.
const SWISS_CANTONS: Record<string, string> = {
  "Aargau": "AG", "Appenzell Ausserrhoden": "AR", "Appenzell Innerrhoden": "AI",
  "Basel-Landschaft": "BL", "Basel-Stadt": "BS", "Bern": "BE", "Fribourg": "FR",
  "Freiburg": "FR", "Genève": "GE", "Geneva": "GE", "Glarus": "GL",
  "Graubünden": "GR", "Jura": "JU", "Luzern": "LU", "Lucerne": "LU",
  "Neuchâtel": "NE", "Nidwalden": "NW", "Obwalden": "OW", "Schaffhausen": "SH",
  "Schwyz": "SZ", "Solothurn": "SO", "St. Gallen": "SG", "Saint Gallen": "SG",
  "Thurgau": "TG", "Ticino": "TI", "Uri": "UR", "Valais": "VS", "Wallis": "VS",
  "Vaud": "VD", "Zug": "ZG", "Zürich": "ZH", "Zurich": "ZH",
};

function abbreviateRegion(region?: string | null): string | null {
  if (!region) return null;
  return SWISS_CANTONS[region] || region;
}

function formatPlace(place: Location.LocationGeocodedAddress): string {
  const city = place.city || place.subregion || place.district;
  const region = abbreviateRegion(place.region);
  return [city, region].filter(Boolean).join(", ");
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Current location string. */
  current?: string;
  /** Called with the new location string when the user saves. */
  onSave: (location: string) => void;
}

export function LocationEditSheet({ visible, onClose, current, onSave }: Props) {
  const { t } = useT();
  const [value, setValue] = useState(current || "");
  const [autoLocating, setAutoLocating] = useState(false);
  // Cancellation flag — expo-location has no AbortSignal, so we just ignore
  // late results when the user cancels.
  const cancelledRef = useRef(false);

  // Track the keyboard so the sheet can shrink to fit the actually-visible area.
  // Without this, on Android with adjustResize the sheet's bottom anchor stays
  // at the new (smaller) screen bottom and a tall sheet clips off the top.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const onHide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  // Typeahead state
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  // Suppresses the next search effect — used right after picking a suggestion
  // so the suggestion list doesn't refill while we collapse it.
  const suppressNextSearch = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (visible) {
      setValue(current || "");
      setSuggestions([]);
      suppressNextSearch.current = true;
    }
  }, [visible, current]);

  // If the sheet closes mid-flight, treat it as a cancel.
  useEffect(() => {
    if (!visible) cancelledRef.current = true;
  }, [visible]);

  // Debounced place search whenever the input value changes
  useEffect(() => {
    if (suppressNextSearch.current) {
      suppressNextSearch.current = false;
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (abortRef.current) abortRef.current.abort();

    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      const ctl = new AbortController();
      abortRef.current = ctl;
      setSearching(true);
      try {
        const results = await searchPlaces(value, ctl.signal);
        if (!ctl.signal.aborted) setSuggestions(results);
      } catch {
        // ignore — usually abort or network blips
      } finally {
        if (!ctl.signal.aborted) setSearching(false);
      }
    }, 350);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [value]);

  const handlePickSuggestion = (s: PlaceSuggestion) => {
    suppressNextSearch.current = true;
    setValue(s.formatted);
    setSuggestions([]);
    Keyboard.dismiss();
  };

  const handleCancelLocate = () => {
    cancelledRef.current = true;
    setAutoLocating(false);
  };

  const handleAutoLocate = async () => {
    cancelledRef.current = false;
    setAutoLocating(true);
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (cancelledRef.current) return;
      if (status === "undetermined") {
        const req = await Location.requestForegroundPermissionsAsync();
        if (cancelledRef.current) return;
        status = req.status;
      }
      if (status !== "granted") {
        Alert.alert(
          t("location.alert.permission_title"),
          t("location.alert.permission_body"),
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("location.alert.open_settings"),
              onPress: () => {
                if (Platform.OS === "ios") Linking.openURL("app-settings:");
                else Linking.openSettings();
              },
            },
          ],
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (cancelledRef.current) return;
      const places = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (cancelledRef.current) return;
      if (places.length === 0) {
        Alert.alert(
          t("location.alert.read_failed_title"),
          t("location.alert.no_address_body"),
        );
        return;
      }
      const formatted = formatPlace(places[0]);
      if (!formatted) {
        Alert.alert(
          t("location.alert.read_failed_title"),
          t("location.alert.no_city_body"),
        );
        return;
      }
      setValue(formatted);
    } catch (e: any) {
      if (cancelledRef.current) return;
      console.warn("[LocationEditSheet] auto-locate failed:", e?.message || e);
      Alert.alert(
        t("location.alert.detect_failed_title"),
        t("location.alert.detect_failed_body"),
      );
    } finally {
      if (!cancelledRef.current) setAutoLocating(false);
    }
  };

  const handleSave = () => {
    onSave(value.trim());
    onClose();
  };

  const showSuggestionsBox = value.trim().length >= 2 && (searching || suggestions.length > 0);

  // Available vertical space (excludes the keyboard when it's up). Status bar
  // / safe-area top is rough but conservative.
  const TOP_SAFETY = 60;
  const visibleArea = SCREEN_HEIGHT - keyboardHeight - TOP_SAFETY;
  // Hard cap so the sheet never eats the whole screen and the backdrop stays
  // tappable. With keyboard up we cap a bit tighter so the input is comfortable.
  const ABSOLUTE_CAP = Math.floor(SCREEN_HEIGHT * 0.82);
  const MAX_SHEET_HEIGHT = Math.max(320, Math.min(ABSOLUTE_CAP, visibleArea));

  const wantedDropdown = showSuggestionsBox ? MAX_DROPDOWN_HEIGHT : 0;
  const wantedSheet = FIXED_CONTENT_HEIGHT + (wantedDropdown ? wantedDropdown + 16 : 0);
  const sheetHeight = Math.min(wantedSheet, MAX_SHEET_HEIGHT);
  const dropdownMaxHeight = showSuggestionsBox
    ? Math.max(MIN_DROPDOWN_HEIGHT, sheetHeight - FIXED_CONTENT_HEIGHT - 16)
    : 0;

  return (
    <SlideUpSheet visible={visible} onClose={onClose} height={sheetHeight}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: "800", color: S.ter, letterSpacing: 1.2 }}>
          {t("location.eyebrow")}
        </Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: S.ink, letterSpacing: -0.5, marginTop: 4 }}>
          {t("location.title")}
        </Text>
        <Text style={{ fontSize: 13, color: S.sec, fontWeight: "600", marginTop: 6 }}>
          {t("location.body")}
        </Text>

        <View
          style={{
            marginTop: 18,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 14,
            paddingVertical: 4,
            borderRadius: 14,
            backgroundColor: "#fff",
            borderWidth: 1.5,
            borderColor: S.line,
          }}
        >
          <PinIcon color={S.sec} size={16} />
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={t("location.placeholder")}
            placeholderTextColor={S.ter}
            autoFocus
            autoCorrect={false}
            autoCapitalize="words"
            style={{
              flex: 1,
              fontSize: 17,
              fontWeight: "700",
              color: S.ink,
              letterSpacing: -0.2,
              paddingVertical: 12,
            }}
          />
          {searching && <ActivityIndicator size="small" color={S.ter} />}
          {!searching && value.length > 0 && (
            <Pressable
              onPress={() => {
                suppressNextSearch.current = true;
                setValue("");
                setSuggestions([]);
              }}
              hitSlop={10}
              accessibilityLabel={t("location.clear")}
              style={{ width: 22, height: 22, borderRadius: 99, backgroundColor: "#F0EAE4", alignItems: "center", justifyContent: "center" }}
            >
              <XIcon color={S.sec} size={11} />
            </Pressable>
          )}
        </View>

        {/* Suggestions dropdown */}
        {showSuggestionsBox && (
          <View
            style={{
              marginTop: 8,
              borderRadius: 14,
              backgroundColor: "#fff",
              borderWidth: 1.5,
              borderColor: S.line,
              maxHeight: dropdownMaxHeight,
              overflow: "hidden",
            }}
          >
            {suggestions.length === 0 && searching && (
              <View style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ActivityIndicator size="small" color={S.sec} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: S.sec }}>
                  {t("location.searching")}
                </Text>
              </View>
            )}
            {suggestions.length === 0 && !searching && (
              <View style={{ padding: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: S.sec }}>
                  {t("location.no_matches_place")}
                </Text>
              </View>
            )}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {suggestions.map((s, i) => (
                <Pressable
                  key={s.id}
                  onPress={() => handlePickSuggestion(s)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 11,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: S.line,
                  }}
                >
                  <PinIcon color={S.sec} size={14} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: S.ink, letterSpacing: -0.2 }} numberOfLines={1}>
                      {s.primary}
                    </Text>
                    <Text style={{ fontSize: 12, color: S.sec, fontWeight: "600", marginTop: 1 }} numberOfLines={1}>
                      {s.secondary}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {autoLocating ? (
          <View
            style={{
              marginTop: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 8,
              paddingLeft: 16,
              paddingRight: 8,
              borderRadius: 99,
              backgroundColor: "#E5E6F6",
            }}
          >
            <ActivityIndicator size="small" color="#2C2E61" />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: "800", color: "#2C2E61", letterSpacing: 0.2 }}>
              {t("location.locating")}
            </Text>
            <Pressable
              onPress={handleCancelLocate}
              hitSlop={10}
              accessibilityLabel={t("common.cancel")}
              style={{
                width: 32,
                height: 32,
                borderRadius: 99,
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <XIcon color="#2C2E61" size={14} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handleAutoLocate}
            style={{
              marginTop: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 12,
              borderRadius: 99,
              backgroundColor: "#E5E6F6",
            }}
          >
            <PinIcon color="#2C2E61" size={14} />
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#2C2E61", letterSpacing: 0.2 }}>
              {t("location.use_current")}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleSave}
          style={{
            marginTop: 18,
            height: 54,
            borderRadius: 99,
            backgroundColor: S.ink,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#fff" }}>{t("location.save")}</Text>
        </Pressable>
      </View>
    </SlideUpSheet>
  );
}
