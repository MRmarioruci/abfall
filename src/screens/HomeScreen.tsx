import { useMemo, useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, Pressable, Alert, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S, ST, type WasteStreamId } from "../theme/colors";
import { BrandMark } from "../components/ui/BrandMark";
import { CircBtn } from "../components/ui/CircBtn";
import { CalendarMonth } from "../components/CalendarMonth";
import { StreamGlyph } from "../components/icons/StreamGlyph";
import { PinIcon, ChevRIcon, ShareIcon, PencilIcon, CheckIcon, BellIcon, XIcon } from "../components/icons/Icons";
import { useCalendars } from "../context/CalendarContext";
import { useT } from "../context/LocaleContext";
import { ShareSheet } from "../components/ShareSheet";
import { LocationEditSheet } from "../components/LocationEditSheet";
import { ReminderEditSheet } from "../components/ReminderEditSheet";
import { DayEventsEditSheet } from "../components/DayEventsEditSheet";
import { useToast } from "../components/ui/Toast";
import { requestNotificationPermissions, getNextTriggerForRule } from "../services/notifications";
import { isReminderNudgeDismissed, dismissReminderNudge } from "../services/nudges";
import { getFunFactPool } from "../services/funFacts";
import type { ReminderRule, CollectionEvent } from "../types/calendar";

interface Props {
  onCalendarPress?: () => void;
  onLocationPress?: () => void;
  /** Callback fired when the user taps the "Set up reminders" nudge card.
   *  Lets the parent (TabNavigator) switch tabs to Reminders. */
  onGoToReminders?: () => void;
  navigation?: any;
}

export function HomeScreen({ onCalendarPress, onGoToReminders }: Props) {
  const insets = useSafeAreaInsets();
  const { active, patchCalendar } = useCalendars();
  const { t, wasteLabel, weekdayShort, monthShort } = useT();
  const toast = useToast();
  const [shareVisible, setShareVisible] = useState(false);
  const [locationVisible, setLocationVisible] = useState(false);
  const [reminderSheet, setReminderSheet] = useState<{
    visible: boolean;
    stream: WasteStreamId;
    date?: string;
    when?: string;
  }>({ visible: false, stream: "papier" });
  // Edit mode toggle — when on, tapping a calendar day opens the day-events
  // editor instead of the reminder editor. Pencil icon top-right of the home
  // header flips this.
  const [editMode, setEditMode] = useState(false);
  const [dayEditSheet, setDayEditSheet] = useState<{ visible: boolean; date?: string }>(
    { visible: false },
  );
  // Reminder nudge — tracked per-calendar so each new calendar re-triggers
  // the prompt. Start with `true` (suppressed) to avoid a flash before the
  // AsyncStorage lookup resolves; re-checked whenever the active calendar id
  // changes.
  const [nudgeDismissed, setNudgeDismissed] = useState(true);
  useEffect(() => {
    if (!active?.id) {
      setNudgeDismissed(true);
      return;
    }
    isReminderNudgeDismissed(active.id).then(setNudgeDismissed);
  }, [active?.id]);

  const hasAnyEnabledReminder = useMemo(() => {
    if (!active?.reminders) return false;
    for (const id of Object.keys(active.reminders) as WasteStreamId[]) {
      const list = active.reminders[id] || [];
      if (list.some((r) => r.on)) return true;
    }
    return false;
  }, [active]);

  const showReminderNudge = !!active && !hasAnyEnabledReminder && !nudgeDismissed;

  // Bell-ring animation: rotates the icon ±18° in a sequence (-, +, -, +)
  // and pauses ~2.5s between rings. Pulls attention without being obnoxious.
  // Driven by Animated, so it runs on the UI thread (60fps even while JS is
  // busy with calendar reloads or scrolling).
  const ringAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!showReminderNudge) {
      ringAnim.stopAnimation();
      ringAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: -1, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 1, duration: 160, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: -1, duration: 160, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 1, duration: 160, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 0, duration: 90, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(2500),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [showReminderNudge, ringAnim]);

  const bellRotation = ringAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-18deg", "0deg", "18deg"],
  });

  const handleDismissNudge = async () => {
    if (!active?.id) return;
    setNudgeDismissed(true);
    await dismissReminderNudge(active.id);
  };

  const handleNudgeCTA = () => {
    onGoToReminders?.();
  };

  const marks = useMemo(() => {
    // Empty array — never undefined — so CalendarMonth's default-param
    // fallback is never triggered. Returning undefined here used to fall
    // through to SAMPLE_MARKS, polluting the grid with fake Schlieren data.
    if (!active) return [];
    // Pass ALL events with month/year so CalendarMonth filters internally
    // when the user navigates between months.
    return active.events.map((e) => {
      const d = new Date(e.date);
      return {
        day: d.getDate(),
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        stream: e.type,
      };
    });
  }, [active]);

  // Sorted list of every future event for the active calendar. The visible
  // window starts at 5 unique days and expands by 5 each time the user taps
  // "Show more days".
  const allUpcoming = useMemo(() => {
    if (!active) return [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return active.events
      .filter((e) => new Date(e.date) >= now)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [active]);

  const uniqueUpcomingDates = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of allUpcoming) {
      if (!seen.has(e.date)) {
        seen.add(e.date);
        out.push(e.date);
      }
    }
    return out;
  }, [allUpcoming]);

  const [dayLimit, setDayLimit] = useState(5);
  // Reset window whenever the active calendar changes so a freshly switched
  // calendar always starts at the first 5 days.
  useEffect(() => {
    setDayLimit(5);
  }, [active?.id]);

  const upcoming = useMemo(() => {
    const visibleDates = new Set(uniqueUpcomingDates.slice(0, dayLimit));
    return allUpcoming.filter((e) => visibleDates.has(e.date));
  }, [allUpcoming, uniqueUpcomingDates, dayLimit]);

  const hasMoreDays = uniqueUpcomingDates.length > dayLimit;
  const remainingDays = Math.max(0, uniqueUpcomingDates.length - dayLimit);

  // "Did you know" facts — rotate through the merged pool (stream-relevant
  // tips first, then generic recycling facts) every 10 seconds with a
  // crossfade. Pool is memoized on the next-upcoming stream so it stays
  // stable across renders; only changes when a different pickup comes up.
  const funFactPool = useMemo(
    () => getFunFactPool(allUpcoming[0]?.type),
    [allUpcoming],
  );
  const [factIndex, setFactIndex] = useState(0);
  const factOpacity = useRef(new Animated.Value(1)).current;

  // Reset to the first fact whenever the pool changes (e.g. user switches
  // calendar or the next pickup's stream changes) so they always see the
  // most relevant tip first.
  useEffect(() => {
    setFactIndex(0);
    factOpacity.setValue(1);
  }, [funFactPool, factOpacity]);

  useEffect(() => {
    if (funFactPool.length <= 1) return;
    const iv = setInterval(() => {
      // Fade out → swap → fade in. Sequence keeps each phase short so the
      // user perceives a soft transition, not a blank pause.
      Animated.timing(factOpacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start(() => {
        setFactIndex((n) => (n + 1) % funFactPool.length);
        Animated.timing(factOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }).start();
      });
    }, 10000);
    return () => clearInterval(iv);
  }, [funFactPool, factOpacity]);

  const funFact = funFactPool[factIndex] ?? "";

  const municipality = active?.municipality || "";
  const locationLabel = active?.location || active?.municipality || t("home.set_location");

  const handleLocationSave = async (newLocation: string) => {
    if (!active) return;
    await patchCalendar(active.id, { location: newLocation || undefined });
  };

  const handleDayPress = (day: number, month: number, year: number) => {
    if (!active) return;
    // `month` from CalendarMonth is 0-indexed (JS Date convention). Event
    // dates are 1-indexed ISO strings, so shift by +1 when building dateStr.
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    // Edit mode: tap a day → open the day-events editor regardless of whether
    // anything's scheduled. Lets the user add or remove pickups for any day.
    if (editMode) {
      setDayEditSheet({ visible: true, date: dateStr });
      return;
    }

    const streams = active.events
      .filter((e) => e.date === dateStr)
      .map((e) => e.type);
    const unique = Array.from(new Set(streams));

    if (unique.length === 0) {
      // Empty day — let the user add a one-off "specific date" reminder for
      // the day they tapped. Stream defaults to the calendar's first known
      // stream (or papier as a fallback); they can swap in the editor.
      const fallback = (active.events[0]?.type as WasteStreamId | undefined) ?? "papier";
      setReminderSheet({
        visible: true,
        stream: fallback,
        date: dateStr,
        when: "specific date",
      });
      return;
    }

    // Day has pickups — open the editor with the first matching stream
    // pre-selected; user can swap streams inside the sheet's chip row.
    setReminderSheet({ visible: true, stream: unique[0], date: dateStr });
  };

  const handleSaveDayEvents = async (date: string, nextDayEvents: CollectionEvent[]) => {
    if (!active) return;
    // Replace all events on `date` with the edited set. Events for other days
    // are kept as-is.
    const others = active.events.filter((e) => e.date !== date);
    const combined = [...others, ...nextDayEvents].sort((a, b) => a.date.localeCompare(b.date));
    await patchCalendar(active.id, { events: combined });
    toast.show(t("home.toast.day_updated"));
  };

  const handleSaveReminder = async (stream: WasteStreamId, rule: ReminderRule) => {
    if (!active) return;
    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert(t("common.permission_needed"), t("common.permission_body"));
      return;
    }

    const reminders = active.reminders || ({} as Record<WasteStreamId, ReminderRule[]>);
    const next = { ...reminders };
    const streamRules = [...(next[stream] || [])];
    const idx = streamRules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      streamRules[idx] = rule;
    } else {
      streamRules.push(rule);
    }
    next[stream] = streamRules;
    await patchCalendar(active.id, { reminders: next });

    const verb = idx >= 0 ? t("home.toast.updated") : t("home.toast.saved");
    const nextTrigger = getNextTriggerForRule(active, stream, rule);
    toast.show(
      nextTrigger
        ? `${verb} · ${formatTriggerLabel(nextTrigger, monthShort)}`
        : `${verb} · ${t("home.toast.no_match")}`,
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F2F7" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar: brand · location · share */}
        <View
          style={{
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <BrandMark size={40} />

          <Pressable
            onPress={() => setLocationVisible(true)}
            style={{
              flexShrink: 1,
              minWidth: 0,
              marginHorizontal: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 9,
              paddingHorizontal: 14,
              borderRadius: 99,
              backgroundColor: "#fff",
              shadowColor: "rgb(150,118,96)",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 2,
              maxWidth: 220,
            }}
          >
            <PinIcon color={S.ink} size={14} />
            <Text
              style={{
                flexShrink: 1,
                minWidth: 0,
                fontSize: 14,
                fontWeight: "800",
                color: S.ink,
                letterSpacing: -0.2,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {locationLabel}
            </Text>
            <ChevRIcon color={S.ter} size={11} />
          </Pressable>

          <View style={{ flexDirection: "row", gap: 8 }}>
            {active && (
              <>
                <CircBtn
                  size={44}
                  bg={editMode ? S.ink : "#fff"}
                  onPress={() => setEditMode((v) => !v)}
                >
                  {editMode ? (
                    <CheckIcon color="#fff" size={17} />
                  ) : (
                    <PencilIcon color={S.ink} size={17} />
                  )}
                </CircBtn>
                <CircBtn size={44} onPress={() => setShareVisible(true)}>
                  <ShareIcon color={S.ink} size={18} />
                </CircBtn>
              </>
            )}
          </View>
        </View>

        {/* Edit-mode banner — soft hint that taps now go to day editor */}
        {editMode && active && (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 14,
              paddingVertical: 9,
              paddingHorizontal: 14,
              borderRadius: 14,
              backgroundColor: S.ink,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <PencilIcon color="#fff" size={13} />
            <Text style={{ flex: 1, color: "#fff", fontWeight: "700", fontSize: 13 }}>
              {t("home.edit_banner")}
            </Text>
          </View>
        )}

        {/* Calendar title row — tap to switch calendars. Flat on the page
            background (no card, no shadow) so the calendar grid below feels
            like the visual anchor instead of competing with this row. */}
        {active && (
          <Pressable
            onPress={onCalendarPress}
            style={{
              marginHorizontal: 20,
              marginTop: 22,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: S.ter, letterSpacing: 1.2 }}>
                {t("home.calendar")}
              </Text>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "800",
                  color: S.ink,
                  letterSpacing: -0.3,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {active.title}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 99,
                backgroundColor: "#F0EAE4",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "800", color: S.sec, letterSpacing: 0.2 }}>
                {t("home.switch")}
              </Text>
              <ChevRIcon color={S.sec} size={11} />
            </View>
          </Pressable>
        )}

        {/* Monthly calendar */}
        <View style={{ paddingHorizontal: 16, paddingTop: active ? 12 : 20 }}>
          <CalendarMonth
            marks={marks}
            municipality={municipality}
            onDayPress={handleDayPress}
          />
        </View>

        {/* Reminder nudge — gentle prompt to set up notifications, shown
            once after adding a calendar until the user dismisses or acts. */}
        {showReminderNudge && (
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <Pressable
              onPress={handleNudgeCTA}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                backgroundColor: "#fff",
                borderRadius: 22,
                padding: 14,
                paddingRight: 12,
                shadowColor: "rgb(150,118,96)",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.14,
                shadowRadius: 20,
                elevation: 4,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 13,
                  backgroundColor: ST.papier.soft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Animated.View style={{ transform: [{ rotate: bellRotation }] }}>
                  <BellIcon color={ST.papier.ink} size={22} />
                </Animated.View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: S.ink, letterSpacing: -0.3 }}>
                  {t("home.nudge_title")}
                </Text>
                <Text
                  style={{
                    fontSize: 12.5,
                    color: S.sec,
                    marginTop: 2,
                    fontWeight: "500",
                    lineHeight: 17,
                  }}
                >
                  {t("home.nudge_body")}
                </Text>
              </View>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  handleDismissNudge();
                }}
                hitSlop={8}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  backgroundColor: "#F2ECE6",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <XIcon color={S.sec} size={12} />
              </Pressable>
            </Pressable>
          </View>
        )}

        {/* Next up section */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 10 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "800",
              color: S.ter,
              letterSpacing: 1.2,
            }}
          >
            {t("home.next_up")}
          </Text>
        </View>

        <ScrollView
          // Inner scroll container — caps Next Up at a fixed height so a
          // long calendar (many "Show more" taps) stays scannable. The
          // outer ScrollView still handles the rest of the screen; we just
          // need nestedScrollEnabled on Android so this one can also scroll.
          style={{ maxHeight: 420 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {upcoming.map((evt, i) => {
            const s = ST[evt.type];
            if (!s) return null;
            const d = new Date(evt.date);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000);
            const weekday = weekdayShort(d.getDay());
            const monthAbbr = monthShort(d.getMonth() + 1);
            const tag = diffDays === 0 ? t("home.today") : diffDays === 1 ? t("home.tomorrow") : undefined;
            const isFirst = i === 0;
            const isLast = i === upcoming.length - 1;
            // Only render the date stack for the first pickup of each day.
            // Subsequent same-day items show an empty date column so the
            // timeline keeps flowing without repeating the date label.
            const isFirstOfDay = i === 0 || upcoming[i - 1].date !== evt.date;

            const subParts: string[] = [];
            if (evt.time) subParts.push(evt.time);
            if (evt.zone && evt.zone !== "all") subParts.push(evt.zone);

            return (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  // No vertical padding here — any gap between rows would
                  // break the continuous timeline line. Use minHeight to give
                  // each row breathing room so the line shows above/below the
                  // 44px dot instead.
                  minHeight: 72,
                }}
              >
                {/* Date column — only populated on the first item of each
                    day; same-day continuations leave it blank but keep the
                    width so the timeline + content stay aligned. */}
                <View
                  style={{
                    width: 52,
                    alignItems: "center",
                  }}
                >
                  {isFirstOfDay && (
                    <>
                      <Text
                        style={{
                          fontSize: 26,
                          fontWeight: "800",
                          color: S.ink,
                          letterSpacing: -0.7,
                          lineHeight: 28,
                        }}
                      >
                        {d.getDate()}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "800",
                          color: S.sec,
                          letterSpacing: 0.4,
                          marginTop: 2,
                        }}
                      >
                        {weekday.toUpperCase()}
                      </Text>
                      <Text
                        style={{
                          fontSize: 9.5,
                          fontWeight: "700",
                          color: S.ter,
                          letterSpacing: 0.5,
                          marginTop: 1,
                        }}
                      >
                        {monthAbbr.toUpperCase()}
                      </Text>
                    </>
                  )}
                </View>

                {/* Timeline column — the connecting hairline runs full row
                    height behind the dot. First/last items clip the line to
                    the dot's vertical center so it doesn't trail beyond. */}
                <View
                  style={{
                    width: 50,
                    alignItems: "center",
                    justifyContent: "center",
                    alignSelf: "stretch",
                    position: "relative",
                  }}
                >
                  <View
                    style={{
                      position: "absolute",
                      width: 2,
                      top: isFirst ? "50%" : 0,
                      bottom: isLast ? "50%" : 0,
                      backgroundColor: "rgba(33,31,28,0.12)",
                    }}
                  />
                  {/* Dot with stream icon inside */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 99,
                      backgroundColor: s.c,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 3,
                      borderColor: "#F5F2F7",
                    }}
                  >
                    <StreamGlyph stream={evt.type} size={26} color={s.ink} />
                  </View>
                </View>

                {/* Plain content — no card background, no shadow. Label on
                    top, optional time/zone subtitle, tag inline. */}
                <View style={{ flex: 1, paddingLeft: 10 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16.5,
                        fontWeight: "800",
                        color: S.ink,
                        letterSpacing: -0.3,
                      }}
                    >
                      {wasteLabel(evt.type)}
                    </Text>
                    {tag && (
                      <View
                        style={{
                          backgroundColor: S.ink,
                          paddingVertical: 3,
                          paddingHorizontal: 8,
                          borderRadius: 99,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9.5,
                            fontWeight: "800",
                            color: "#fff",
                            letterSpacing: 0.3,
                          }}
                        >
                          {tag}
                        </Text>
                      </View>
                    )}
                  </View>
                  {subParts.length > 0 && (
                    <Text
                      style={{
                        fontSize: 12.5,
                        color: S.sec,
                        marginTop: 2,
                        fontWeight: "600",
                      }}
                    >
                      {subParts.join(" · ")}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
          {upcoming.length === 0 && !active && (
            <View style={{ alignItems: "center", paddingVertical: 30 }}>
              <Text style={{ fontSize: 15, color: S.sec, fontWeight: "600", textAlign: "center" }}>
                {t("home.empty_hint")}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Show-more button — expands the upcoming window by 5 days at a time
            until every future pickup in the calendar is on screen. */}
        {hasMoreDays && (
          <View style={{ alignItems: "center", paddingTop: 16 }}>
            <Pressable
              onPress={() => setDayLimit((n) => n + 5)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 10,
                paddingHorizontal: 18,
                borderRadius: 99,
                backgroundColor: "#fff",
                shadowColor: "rgb(150,118,96)",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 14,
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: "800", color: S.ink, letterSpacing: -0.2 }}>
                {t("home.show_more", { n: Math.min(5, remainingDays) })}
              </Text>
              <ChevRIcon color={S.sec} size={11} />
            </Pressable>
          </View>
        )}

        {/* Did-you-know card — contextual recycling tip, rotates daily. Only
            shows when there's an active calendar so empty-state stays clean. */}
        {active && (
          <View style={{ paddingHorizontal: 16, paddingTop: 28 }}>
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 22,
                padding: 18,
                paddingTop: 16,
                shadowColor: "rgb(150,118,96)",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.1,
                shadowRadius: 18,
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 99,
                    backgroundColor: ST.gruengut.soft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "800", color: ST.gruengut.ink }}>!</Text>
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: S.ter,
                    letterSpacing: 1.2,
                  }}
                >
                  {t("home.did_you_know")}
                </Text>
              </View>
              <Animated.Text
                style={{
                  fontSize: 14.5,
                  fontWeight: "500",
                  color: S.ink,
                  lineHeight: 21,
                  letterSpacing: -0.1,
                  opacity: factOpacity,
                }}
              >
                {funFact}
              </Animated.Text>
            </View>
          </View>
        )}
      </ScrollView>

      <ShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        calendar={active || null}
      />

      <LocationEditSheet
        visible={locationVisible}
        onClose={() => setLocationVisible(false)}
        current={active?.location}
        onSave={handleLocationSave}
      />

      <ReminderEditSheet
        visible={reminderSheet.visible}
        onClose={() => setReminderSheet((s) => ({ ...s, visible: false }))}
        stream={reminderSheet.stream}
        initialDate={reminderSheet.date}
        initialWhen={reminderSheet.when}
        onSave={handleSaveReminder}
      />

      <DayEventsEditSheet
        visible={dayEditSheet.visible}
        onClose={() => setDayEditSheet({ visible: false })}
        date={dayEditSheet.date}
        events={
          active && dayEditSheet.date
            ? active.events.filter((e) => e.date === dayEditSheet.date)
            : []
        }
        defaultZone={active?.zone || active?.zones?.[0] || "all"}
        onSave={handleSaveDayEvents}
      />
    </View>
  );
}

function formatTriggerLabel(d: Date, monthShort: (m: number) => string): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${monthShort(d.getMonth() + 1)} ${hh}:${mm}`;
}
