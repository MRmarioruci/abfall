import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S, ST, STREAM_ORDER, type WasteStreamId } from "../theme/colors";
import { SlideUpSheet } from "./ui/SlideUpSheet";
import { StreamGlyph } from "./icons/StreamGlyph";
import { XIcon, CheckIcon, SunIcon, MoonIcon, BellIcon, CalIcon } from "./icons/Icons";
import type { ReminderRule } from "../types/calendar";
import { sendTestNotification } from "../services/notifications";
import { useToast } from "./ui/Toast";
import { useT } from "../context/LocaleContext";
import { parseISODate } from "../lib/dates";

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

function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: "800",
        color: S.ter,
        letterSpacing: 1.2,
        marginBottom: 10,
      }}
    >
      {label.toUpperCase()}
    </Text>
  );
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

  return (
    <SlideUpSheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 26, fontWeight: "600", color: S.ink, letterSpacing: -0.6 }}>
            {rule ? t("reminder_edit.title_edit") : t("reminder_edit.title_add")}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityLabel={t("reminder_edit.close")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 99,
              backgroundColor: "#F0EAE4",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <XIcon color={S.sec} size={16} />
          </Pressable>
        </View>

        {/* Mode toggle — disambiguates the two reminder types. */}
        <SectionLabel label={t("reminder_edit.type")} />
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
          <ModeCard
            active={mode === "recurring"}
            title={t("reminder_edit.recurring")}
            subtitle={t("reminder_edit.recurring_desc")}
            icon={<BellIcon color={mode === "recurring" ? "#fff" : S.ink} size={18} />}
            onPress={() => setMode("recurring")}
          />
          <ModeCard
            active={mode === "specific"}
            title={t("reminder_edit.one_off")}
            subtitle={t("reminder_edit.one_off_desc")}
            icon={<CalIcon color={mode === "specific" ? "#fff" : S.ink} size={18} />}
            onPress={() => setMode("specific")}
          />
        </View>

        {/* Stream selector */}
        <SectionLabel label={t("reminder_edit.collection")} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 4, gap: 10 }}
          style={{ marginBottom: 24 }}
        >
          {STREAM_ORDER.map((id) => {
            const cc = ST[id];
            const on = id === selectedStream;
            return (
              <Pressable
                key={id}
                onPress={() => setSelectedStream(id)}
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: 18,
                  backgroundColor: on ? cc.c : "#fff",
                  borderWidth: on ? 0 : 1.5,
                  borderColor: S.line,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingHorizontal: 6,
                  ...(on
                    ? {
                        shadowColor: cc.ink,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.18,
                        shadowRadius: 12,
                        elevation: 3,
                      }
                    : {}),
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: on ? "rgba(255,255,255,0.5)" : cc.soft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <StreamGlyph stream={id} size={20} color={cc.ink} />
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: on ? cc.ink : S.ink,
                    textAlign: "center",
                    lineHeight: 13,
                  }}
                  numberOfLines={2}
                >
                  {wasteLabel(id)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* When selector — only relevant for recurring reminders. */}
        {mode === "recurring" && (
          <>
        <SectionLabel label={t("reminder_edit.when")} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 4, gap: 10 }}
          style={{ marginBottom: 24 }}
        >
          {WHEN_OPTIONS.map((opt) => {
            const on = opt.value === when;
            const icon = whenIcon(opt.value, on ? "#fff" : S.ink, 18);
            return (
              <Pressable
                key={opt.value}
                onPress={() => setWhen(opt.value)}
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: 18,
                  backgroundColor: on ? S.ink : "#fff",
                  borderWidth: on ? 0 : 1.5,
                  borderColor: S.line,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingHorizontal: 10,
                  ...(on
                    ? {
                        shadowColor: S.ink,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.18,
                        shadowRadius: 12,
                        elevation: 3,
                      }
                    : {}),
                }}
              >
                {icon}
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: "800",
                    color: on ? "#fff" : S.ink,
                    textAlign: "center",
                    lineHeight: 13,
                    paddingHorizontal: 6,
                  }}
                  numberOfLines={2}
                >
                  {whenLabel(opt.value)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
          </>
        )}

        {/* Date selector — only for one-off reminders. Moved up here so the
            sheet reads top-to-bottom: type → collection → date → time. */}
        {mode === "specific" && (
          <View style={{ marginBottom: 28 }}>
            <SectionLabel label={t("reminder_edit.date")} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <DateStepper label={t("reminder_edit.day")} value={customDay} onChange={setCustomDay} min={1} max={31} />
              <DateStepper label={t("reminder_edit.month")} value={customMonth} onChange={setCustomMonth} min={1} max={12} />
              <DateStepper
                label={t("reminder_edit.year")}
                value={customYear}
                onChange={setCustomYear}
                min={today.getFullYear()}
                max={today.getFullYear() + 5}
              />
            </View>
          </View>
        )}

        {/* Time selector */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: "800",
            color: S.ter,
            letterSpacing: 1.2,
            marginBottom: 10,
          }}
        >
          {t("reminder_edit.time")}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 28 }}>
          {/* Hours */}
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: S.sec, marginBottom: 6 }}>
              {t("reminder_edit.hour")}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <StepButton label="-" onPress={() => setHour((h) => adjust(h, -1, 0, 23))} />
              <View
                style={{
                  width: 58,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: S.line,
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: "800", color: S.ink }}>{pad(hour)}</Text>
              </View>
              <StepButton label="+" onPress={() => setHour((h) => adjust(h, 1, 0, 23))} />
            </View>
          </View>

          <Text style={{ fontSize: 24, fontWeight: "300", color: S.sec, marginTop: 16 }}>:</Text>

          {/* Minutes */}
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: S.sec, marginBottom: 6 }}>
              {t("reminder_edit.minute")}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <StepButton label="-" onPress={() => setMinute((m) => adjust(m, -1, 0, 59))} />
              <View
                style={{
                  width: 58,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: S.line,
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: "800", color: S.ink }}>
                  {pad(minute)}
                </Text>
              </View>
              <StepButton label="+" onPress={() => setMinute((m) => adjust(m, 1, 0, 59))} />
            </View>
          </View>
        </View>

        {/* Save */}
        <Pressable
          onPress={handleSave}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: S.ink,
            borderRadius: 18,
            paddingVertical: 16,
            shadowColor: S.ink,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          <CheckIcon color="#fff" size={18} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>{t("reminder_edit.save")}</Text>
        </Pressable>

        <Pressable
          onPress={handleSendTest}
          disabled={testing}
          style={{
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 12,
            paddingHorizontal: 16,
            marginTop: 6,
            marginBottom: Math.max(insets.bottom, 8),
            opacity: testing ? 0.7 : 1,
          }}
        >
          {testing && <ActivityIndicator size="small" color={S.sec} />}
          <Text
            style={{
              fontSize: 13.5,
              fontWeight: "700",
              color: S.sec,
              letterSpacing: -0.2,
              textDecorationLine: testing ? "none" : "underline",
            }}
          >
            {testing ? t("reminder_edit.test_waiting") : t("reminder_edit.test_send")}
          </Text>
        </Pressable>
      </View>
    </SlideUpSheet>
  );
}

function ModeCard({
  active,
  title,
  subtitle,
  icon,
  onPress,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 18,
        backgroundColor: active ? S.ink : "#fff",
        borderWidth: active ? 0 : 1.5,
        borderColor: S.line,
        ...(active
          ? {
              shadowColor: S.ink,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.18,
              shadowRadius: 12,
              elevation: 3,
            }
          : {}),
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: active ? "rgba(255,255,255,0.18)" : "#F4EFEA",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "800",
          color: active ? "#fff" : S.ink,
          letterSpacing: -0.3,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 11.5,
          fontWeight: "600",
          color: active ? "rgba(255,255,255,0.7)" : S.sec,
          marginTop: 2,
        }}
        numberOfLines={1}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: "#F0EAE4",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "800", color: S.ink }}>{label}</Text>
    </Pressable>
  );
}

function DateStepper({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  const adjustDate = (delta: number) => {
    let next = value + delta;
    if (next > max) next = min;
    if (next < min) next = max;
    onChange(next);
  };

  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: S.sec, marginBottom: 6 }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <StepButton label="-" onPress={() => adjustDate(-1)} />
        <View
          style={{
            width: 52,
            height: 44,
            borderRadius: 14,
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderColor: S.line,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "800", color: S.ink }}>
            {pad(value)}
          </Text>
        </View>
        <StepButton label="+" onPress={() => adjustDate(1)} />
      </View>
    </View>
  );
}
