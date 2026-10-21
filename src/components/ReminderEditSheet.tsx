import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STREAM_ORDER, type WasteStreamId } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { StreamGlyph } from "./icons/StreamGlyph";
import { XIcon, CheckIcon, SunIcon, MoonIcon, BellIcon, CalIcon } from "./icons/Icons";
import { PillButton, SheetHeader, SoftCard } from "./ui/sheet";
import type { ReminderRule } from "../types/calendar";
import { sendTestNotification } from "../services/notifications";
import { useToast } from "./ui/Toast";
import { useT } from "../context/LocaleContext";
import { parseISODate } from "../lib/dates";
import { FONT } from "../theme/type";

// Relative-time options for RECURRING reminders only — "specific date" is now
// surfaced via the Mode toggle at the top of the sheet, not buried in this list.
const WHEN_OPTIONS = [
  { value: "same day" },
  { value: "morning of" },
  { value: "evening before" },
  { value: "1 day before" },
  { value: "2 days before" },
  { value: "3 days before" },
  { value: "1 week before" },
];

type Mode = "recurring" | "specific";

function deriveMode(rule: ReminderRule | null | undefined, initialWhen: string | undefined): Mode {
  if (rule?.when === "specific date") return "specific";
  if (!rule && initialWhen === "specific date") return "specific";
  return "recurring";
}

function deriveWhen(rule: ReminderRule | null | undefined, initialWhen: string | undefined): string {
  // The recurring "when" only ever holds relative-time values; never the
  // "specific date" sentinel. When the rule is a specific-date one, fall back
  // to a sensible recurring default so the chip row has something selected
  // if the user flips the mode to Recurring.
  // Lowercased so older capitalised values still match a chip.
  if (rule?.when && rule.when !== "specific date") return rule.when.toLowerCase();
  if (initialWhen && initialWhen !== "specific date") return initialWhen.toLowerCase();
  return "1 day before";
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function whenIcon(when: string, color: string, size = 18) {
  if (when.includes("morning")) return <SunIcon color={color} size={size} />;
  if (when.includes("evening")) return <MoonIcon color={color} size={size} />;
  return <BellIcon color={color} size={size} />;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  stream: WasteStreamId;
  rule?: ReminderRule | null;
  /** Optional date (YYYY-MM-DD) to pre-fill for specific-date reminders. */
  initialDate?: string;
  /** Optional default "when" value (e.g. "specific date") used when creating
   *  a new rule. Ignored if `rule` is provided (we use the rule's own value). */
  initialWhen?: string;
  onSave: (stream: WasteStreamId, rule: ReminderRule) => void;
}

export function ReminderEditSheet({ visible, onClose, stream, rule, initialDate, initialWhen, onSave }: Props) {
  const { S, ST } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t, whenLabel, wasteLabel } = useT();
  const today = initialDate ? parseISODate(initialDate) : new Date();
  const [selectedStream, setSelectedStream] = useState<WasteStreamId>(stream);
  const [mode, setMode] = useState<Mode>(() => deriveMode(rule, initialWhen));
  const [when, setWhen] = useState(() => deriveWhen(rule, initialWhen));
  const [hour, setHour] = useState(() => {
    const h = parseInt(rule?.time.split(":")[0] || "18", 10);
    return isNaN(h) ? 18 : h;
  });
  const [minute, setMinute] = useState(() => {
    const m = parseInt(rule?.time.split(":")[1] || "00", 10);
    return isNaN(m) ? 0 : m;
  });
  const [customYear, setCustomYear] = useState(() => {
    const y = rule?.customDate ? parseInt(rule.customDate.split("-")[0], 10) : today.getFullYear();
    return isNaN(y) ? today.getFullYear() : y;
  });
  const [customMonth, setCustomMonth] = useState(() => {
    const m = rule?.customDate ? parseInt(rule.customDate.split("-")[1], 10) : today.getMonth() + 1;
    return isNaN(m) ? today.getMonth() + 1 : m;
  });
  const [customDay, setCustomDay] = useState(() => {
    const d = rule?.customDate ? parseInt(rule.customDate.split("-")[2], 10) : today.getDate();
    return isNaN(d) ? today.getDate() : d;
  });

  useEffect(() => {
    if (visible) {
      setSelectedStream(stream);
      setMode(deriveMode(rule, initialWhen));
      setWhen(deriveWhen(rule, initialWhen));
      setHour(parseInt(rule?.time.split(":")[0] || "18", 10) || 18);
      setMinute(parseInt(rule?.time.split(":")[1] || "00", 10) || 0);
      setCustomYear(rule?.customDate ? parseInt(rule.customDate.split("-")[0], 10) : today.getFullYear());
      setCustomMonth(rule?.customDate ? parseInt(rule.customDate.split("-")[1], 10) : today.getMonth() + 1);
      setCustomDay(rule?.customDate ? parseInt(rule.customDate.split("-")[2], 10) : today.getDate());
    }
  }, [visible, stream, rule, initialWhen]);

  const handleSave = () => {
    const isSpecific = mode === "specific";
    onSave(selectedStream, {
      id: rule?.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      when: isSpecific ? "specific date" : when,
      time: `${pad(hour)}:${pad(minute)}`,
      on: rule?.on ?? true,
      customDate: isSpecific
        ? `${customYear}-${pad(customMonth)}-${pad(customDay)}`
        : undefined,
    });
    onClose();
  };

  const [testing, setTesting] = useState(false);
  const handleSendTest = async () => {
    if (testing) return;
    setTesting(true);
    try {
      const sent = await sendTestNotification();
      if (sent) {
        toast.show(t("reminder_edit.toast.test_scheduled"));
        // Hold the loader for the full 3s scheduled delay so the user has a
        // clear "waiting for notification" affordance.
        await new Promise((r) => setTimeout(r, 3200));
      } else {
        toast.show(t("reminder_edit.toast.blocked"));
      }
    } finally {
      setTesting(false);
    }
  };

  const adjust = (value: number, delta: number, min: number, max: number) => {
    let next = value + delta;
    if (next > max) next = min;
    if (next < min) next = max;
    return next;
  };


  const tint = ST[selectedStream];

  return (
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <SheetHeader
          title={rule ? t("reminder_edit.title_edit") : t("reminder_edit.title_add")}
          right={
            <Pressable
              onPress={onClose}
              accessibilityLabel={t("reminder_edit.close")}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 99,
                backgroundColor: S.card,
                alignItems: "center",
                justifyContent: "center",
                transform: [{ scale: pressed ? 0.92 : 1 }],
              })}
            >
              <XIcon color={S.sec} size={16} />
            </Pressable>
          }
        />

        {/* Recurring vs one-off: a two-way segmented switch. */}
        <View
          accessibilityRole="tablist"
          style={{ flexDirection: "row", backgroundColor: S.card, borderRadius: 99, padding: 4, marginBottom: 18 }}
        >
          <Segment
            active={mode === "recurring"}
            label={t("reminder_edit.recurring")}
            icon={<BellIcon color={mode === "recurring" ? S.onInk : S.sec} size={16} />}
            onPress={() => setMode("recurring")}
          />
          <Segment
            active={mode === "specific"}
            label={t("reminder_edit.one_off")}
            icon={<CalIcon color={mode === "specific" ? S.onInk : S.sec} size={16} />}
            onPress={() => setMode("specific")}
          />
        </View>

        {/* Which collection: each type in its own colour. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20, marginBottom: 18 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {STREAM_ORDER.map((id) => {
            const cc = ST[id];
            const on = id === selectedStream;
            return (
              <Pressable
                key={id}
                onPress={() => setSelectedStream(id)}
                accessibilityRole="button"
                accessibilityLabel={wasteLabel(id)}
                accessibilityState={{ selected: on }}
                style={({ pressed }) => ({
                  width: 84,
                  height: 88,
                  borderRadius: 22,
                  backgroundColor: on ? cc.c : cc.soft,
                  borderWidth: 2,
                  borderColor: on ? S.ink : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  paddingHorizontal: 6,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <StreamGlyph stream={id} size={34} color={on ? cc.onC : cc.ink} />
                <Text
                  style={{ fontSize: 12, fontFamily: FONT.w800, color: on ? cc.onC : cc.ink, textAlign: "center", lineHeight: 14 }}
                  numberOfLines={2}
                >
                  {wasteLabel(id)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* When, relative to the pickup (recurring only). */}
        {mode === "recurring" && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {WHEN_OPTIONS.map((opt) => {
              const on = opt.value === when;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setWhen(opt.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    height: 40,
                    paddingHorizontal: 14,
                    borderRadius: 99,
                    backgroundColor: on ? S.ink : S.card,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  })}
                >
                  {whenIcon(opt.value, on ? S.onInk : S.sec, 15)}
                  <Text style={{ fontSize: 14, fontFamily: FONT.w800, color: on ? S.onInk : S.ink, letterSpacing: -0.2 }}>
                    {whenLabel(opt.value)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Date (one-off only) and time, together in the collection's colour. */}
        <SoftCard bg={tint.soft} style={{ paddingVertical: 14, marginBottom: 18, gap: 10 }}>
          {mode === "specific" && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              <Spinner
                label={t("reminder_edit.day")}
                value={customDay}
                ink={tint.ink}
                onStep={(d) => setCustomDay((v) => adjust(v, d, 1, 31))}
              />
              <Sep ink={tint.ink} char="." />
              <Spinner
                label={t("reminder_edit.month")}
                value={customMonth}
                ink={tint.ink}
                onStep={(d) => setCustomMonth((v) => adjust(v, d, 1, 12))}
              />
              <Sep ink={tint.ink} char="." />
              <Spinner
                label={t("reminder_edit.year")}
                value={customYear}
                ink={tint.ink}
                wide
                onStep={(d) => setCustomYear((v) => adjust(v, d, today.getFullYear(), today.getFullYear() + 5))}
              />
            </View>
          )}
          {mode === "specific" && <View style={{ height: 1, backgroundColor: S.fill, marginHorizontal: 8 }} />}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <Spinner
              label={t("reminder_edit.hour")}
              value={hour}
              ink={tint.ink}
              onStep={(d) => setHour((h) => adjust(h, d, 0, 23))}
            />
            <Sep ink={tint.ink} char=":" />
            <Spinner
              label={t("reminder_edit.minute")}
              value={minute}
              ink={tint.ink}
              onStep={(d) => setMinute((m) => adjust(m, d, 0, 59))}
            />
          </View>
        </SoftCard>

        <PillButton label={t("reminder_edit.save")} icon={<CheckIcon color={S.onInk} size={18} />} onPress={handleSave} />

        <Pressable
          onPress={handleSendTest}
          disabled={testing}
          accessibilityRole="button"
          hitSlop={10}
          style={({ pressed }) => ({
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 12,
            paddingHorizontal: 18,
            marginTop: 2,
            marginBottom: Math.max(insets.bottom, 8),
            opacity: pressed ? 0.55 : testing ? 0.7 : 1,
          })}
        >
          {testing && <ActivityIndicator size="small" color={S.sec} />}
          <Text style={{ fontSize: 15, fontFamily: FONT.w800, color: S.sec }}>
            {testing ? t("reminder_edit.test_waiting") : t("reminder_edit.test_send")}
          </Text>
        </Pressable>
      </View>
    </SlideUpSheet>
  );
}

function Segment({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  const { S } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flex: 1,
        height: 44,
        borderRadius: 99,
        backgroundColor: active ? S.ink : "transparent",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      {icon}
      <Text style={{ fontSize: 15, fontFamily: FONT.w800, color: active ? S.onInk : S.sec, letterSpacing: -0.2 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function StepButton({ label, onPress, ink }: { label: string; onPress: () => void; ink: string }) {
  const { S } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={4}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: 99,
        backgroundColor: S.glass,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale: pressed ? 0.9 : 1 }],
      })}
    >
      <Text style={{ fontSize: 18, fontFamily: FONT.w800, color: ink, lineHeight: 20 }}>{label}</Text>
    </Pressable>
  );
}

/** A number with + above and − below; wraps around at either end. */
function Spinner({
  label,
  value,
  ink,
  wide,
  onStep,
}: {
  label: string;
  value: number;
  ink: string;
  wide?: boolean;
  onStep: (delta: number) => void;
}) {
  return (
    <View style={{ alignItems: "center", gap: 4, minWidth: wide ? 84 : 60 }}>
      <StepButton label="+" ink={ink} onPress={() => onStep(1)} />
      <Text
        accessibilityLabel={`${label} ${value}`}
        style={{ fontSize: 30, fontFamily: FONT.w800, color: ink, letterSpacing: -0.8, fontVariant: ["tabular-nums"] }}
      >
        {pad(value)}
      </Text>
      <StepButton label="−" ink={ink} onPress={() => onStep(-1)} />
    </View>
  );
}

function Sep({ ink, char }: { ink: string; char: string }) {
  return (
    <Text style={{ fontSize: 28, fontFamily: FONT.w800, color: ink, opacity: 0.4, marginHorizontal: 4 }}>{char}</Text>
  );
}
