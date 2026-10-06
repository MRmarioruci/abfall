import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, Keyboard } from "react-native";
import { S } from "../theme/colors";
import { PinIcon, XIcon } from "./icons/Icons";
import { searchPlaces, type PlaceSuggestion } from "../services/geocoding";
import { useT } from "../context/LocaleContext";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Optional max height for the suggestions card. Defaults to 240. */
  suggestionsMaxHeight?: number;
  /** Disable autoFocus by default to avoid keyboard pop-ups on screen load. */
  autoFocus?: boolean;
}

/**
 * Standalone, embeddable location search input with debounced Nominatim
 * suggestions appearing right below the field. Used inline in places where
 * opening a separate sheet would be one tap too many.
 */
export function LocationSearchInput({
  value,
  onChange,
  placeholder,
  suggestionsMaxHeight = 240,
  autoFocus = false,
}: Props) {
  const { t } = useT();
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const suppressNextSearch = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
        // ignore aborts and network blips
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
    onChange(s.formatted);
    setSuggestions([]);
    Keyboard.dismiss();
  };

  const showSuggestionsBox =
    focused && value.trim().length >= 2 && (searching || suggestions.length > 0);

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 4,
          borderRadius: 14,
          backgroundColor: "#fff",
          borderWidth: 1.5,
          borderColor: focused ? S.ink : S.line,
        }}
      >
        <PinIcon color={value ? S.ink : S.sec} size={16} />
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() =>
            // Delay so a suggestion tap registers before we hide the list
            setTimeout(() => setFocused(false), 120)
          }
          placeholder={placeholder ?? t("location.placeholder")}
          placeholderTextColor={S.ter}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoCapitalize="words"
          style={{
            flex: 1,
            fontSize: 16,
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
              onChange("");
              setSuggestions([]);
            }}
            hitSlop={10}
            accessibilityLabel={t("location.clear")}
            style={{
              width: 22,
              height: 22,
              borderRadius: 99,
              backgroundColor: "#F0EAE4",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <XIcon color={S.sec} size={11} />
          </Pressable>
        )}
      </View>

      {showSuggestionsBox && (
        <View
          style={{
            marginTop: 8,
            borderRadius: 14,
            backgroundColor: "#fff",
            borderWidth: 1.5,
            borderColor: S.line,
            maxHeight: suggestionsMaxHeight,
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
                {t("location.no_matches_spelling")}
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
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "800",
                      color: S.ink,
                      letterSpacing: -0.2,
                    }}
                    numberOfLines={1}
                  >
                    {s.primary}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: S.sec,
                      fontWeight: "600",
                      marginTop: 1,
                    }}
                    numberOfLines={1}
                  >
                    {s.secondary}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
