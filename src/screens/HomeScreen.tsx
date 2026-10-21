import { useMemo, useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, Pressable, Alert, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S, ST, type WasteStreamId } from "../theme/colors";
import { BrandMark } from "../components/ui/BrandMark";
import { CircBtn } from "../components/ui/CircBtn";
import { CalendarMonth } from "../components/CalendarMonth";
import { StreamGlyph } from "../components/icons/StreamGlyph";
import { PinIcon, ChevRIcon, ShareIcon, PencilIcon, CheckIcon, BellIcon, XIcon, CalIcon } from "../components/icons/Icons";
import { useCalendars } from "../context/CalendarContext";
import { useT } from "../context/LocaleContext";
import { ShareSheet } from "../components/ShareSheet";
import { LocationEditSheet } from "../components/LocationEditSheet";
import { placeFromLocation } from "../lib/location";
import { ReminderEditSheet } from "../components/ReminderEditSheet";
import { DayEventsEditSheet } from "../components/DayEventsEditSheet";
import { useToast } from "../components/ui/Toast";
import { requestNotificationPermissions, getNextTriggerForRule } from "../services/notifications";
import { isReminderNudgeDismissed, dismissReminderNudge } from "../services/nudges";
import { getFunFactPool } from "../services/funFacts";
import type { ReminderRule, CollectionEvent } from "../types/calendar";
import { parseISODate } from "../lib/dates";
import { TYPE } from "../theme/type";
import { ArtTile, PillButton, SoftCard } from "../components/ui/sheet";
import { EmptyState } from "../components/ui/EmptyState";
import { ScanArt, BrowseArt } from "../components/art/Art";
import { haptics } from "../lib/haptics";
import { NextPickupHero } from "../components/home/NextPickupHero";
import { UpcomingList } from "../components/home/UpcomingList";
import { HomeSkeleton } from "../components/home/HomeSkeleton";
import { HeaderMenu } from "../components/home/HeaderMenu";

interface Props {
  onCalendarPress?: () => void;
  onLocationPress?: () => void;
  /** Opens the add-calendar sheet (empty state's main action). */
  onAddPress?: () => void;
  /** Callback fired when the user taps the "Set up reminders" nudge card.
   *  Lets the parent (TabNavigator) switch tabs to Reminders. */
  onGoToReminders?: () => void;
  navigation?: any;
}

export function HomeScreen({ onCalendarPress, onAddPress, onGoToReminders }: Props) {
  const insets = useSafeAreaInsets();
  const { active, loading, patchCalendar, homeLocation, setHomeLocation } = useCalendars();
  const { t, monthShort, locale } = useT();
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
      const d = parseISODate(e.date);
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
      .filter((e) => parseISODate(e.date) >= now)
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
    () => getFunFactPool(allUpcoming[0]?.type, locale),
    [allUpcoming, locale],
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
  const locationLabel = active ? active.location || active.municipality || t("home.set_location") : homeLocation || t("home.set_location");

  const handleLocationSave = async (newLocation: string) => {
    if (!active) {
      await setHomeLocation(newLocation || undefined);
      return;
    }
    if (!newLocation) {
      await patchCalendar(active.id, { location: undefined });
      return;
    }
    // Keep municipality/canton in step with the new location; publishing
    // and community search read those first.
    await patchCalendar(active.id, { location: newLocation, ...placeFromLocation(newLocation) });
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

  const heroDate = uniqueUpcomingDates[0];
  const heroEvents = useMemo(
    () => (heroDate ? allUpcoming.filter((e) => e.date === heroDate && ST[e.type]) : []),
    [allUpcoming, heroDate],
  );
  const listEvents = upcoming.filter((e) => e.date !== heroDate);
  const factStream: WasteStreamId = allUpcoming[0]?.type && ST[allUpcoming[0].type] ? allUpcoming[0].type : "gruengut";

  const openReminder = (stream: WasteStreamId, date: string) => {
    setReminderSheet({ visible: true, stream, date });
  };

  return (
    <View style={{ flex: 1, backgroundColor: S.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar: logo · location (centred) · menu. The side slots have
            the same width, so the location pill sits in the screen's centre. */}
        <View
          style={{
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View style={{ width: 44, alignItems: "flex-start" }}>
            <BrandMark size={40} />
          </View>

          <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 10 }}>
            <Pressable
              onPress={() => {
                haptics.tap();
                setLocationVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={locationLabel}
              style={({ pressed }) => ({
                maxWidth: "100%",
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                borderRadius: 99,
                backgroundColor: "#fff",
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <PinIcon color={S.ink} size={14} />
              <Text
                style={[TYPE.label, { flexShrink: 1, minWidth: 0, color: S.ink, fontSize: 14 }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {locationLabel}
              </Text>
              <ChevRIcon color={S.ter} size={11} />
            </Pressable>
          </View>

          <View style={{ width: 44, alignItems: "flex-end" }}>
            {active &&
              (editMode ? (
                // While editing, the slot is the way out: one tap to finish.
                <CircBtn size={44} bg={S.ink} shadow={false} accessibilityLabel={t("common.done")} onPress={() => setEditMode(false)}>
                  <CheckIcon color="#fff" size={17} />
                </CircBtn>
              ) : (
                <HeaderMenu
                  accessibilityLabel={t("home.more")}
                  items={[
                    {
                      label: t("home.edit"),
                      icon: <PencilIcon color={ST.karton.ink} size={16} />,
                      tint: ST.karton.soft,
                      onPress: () => setEditMode(true),
                    },
                    {
                      label: t("switcher.share"),
                      icon: <ShareIcon color={ST.papier.ink} size={16} />,
                      tint: ST.papier.soft,
                      onPress: () => setShareVisible(true),
                    },
                  ]}
                />
              ))}
          </View>
        </View>

        {/* Edit-mode banner: a soft pill saying taps now edit days */}
        {editMode && active && (
          <View
            style={{
              alignSelf: "flex-start",
              marginHorizontal: 20,
              marginTop: 14,
              paddingVertical: 8,
              paddingLeft: 10,
              paddingRight: 14,
              borderRadius: 99,
              backgroundColor: ST.karton.soft,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              maxWidth: "90%",
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 99,
                backgroundColor: ST.karton.c,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PencilIcon color={ST.karton.ink} size={12} />
            </View>
            <Text style={[TYPE.caption, { flexShrink: 1, color: ST.karton.ink }]}>
              {t("home.edit_banner")}
            </Text>
          </View>
        )}

        {loading ? (
          <HomeSkeleton />
        ) : !active ? (
          /* No calendar yet: Recyclops, one line, one button, two pictures */
          <View style={{ paddingHorizontal: 16, paddingTop: 18, gap: 12 }}>
            <EmptyState
              title={t("home.empty.title")}
              subtitle={t("add.subtitle")}
              action={{ label: t("tabs.add"), onPress: () => onAddPress?.() }}
            />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <ArtTile label={t("add.tile.scan")} bg={ST.papier.soft} onPress={() => onAddPress?.()}>
                <ScanArt />
              </ArtTile>
              <ArtTile label={t("add.tile.browse")} bg={ST.gruengut.soft} onPress={() => onAddPress?.()}>
                <BrowseArt />
              </ArtTile>
            </View>
          </View>
        ) : (
          <>
            {/* Next pickup: the main fact on the screen */}
            <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
              {heroEvents.length > 0 ? (
                <NextPickupHero events={heroEvents} onPress={openReminder} />
              ) : (
                <SoftCard
                  bg="#fff"
                  style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16 }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 18,
                      backgroundColor: ST.sonstiges.soft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CalIcon color={ST.sonstiges.ink} size={26} />
                  </View>
                  <Text style={[TYPE.label, { flex: 1, color: S.ink }]}>{t("reminders.no_upcoming")}</Text>
                </SoftCard>
              )}
            </View>

            {/* Reminder nudge: one line and one small button */}
            {showReminderNudge && (
              <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                <SoftCard
                  bg={ST.papier.soft}
                  style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 99,
                      backgroundColor: ST.papier.c,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Animated.View style={{ transform: [{ rotate: bellRotation }] }}>
                      <BellIcon color={ST.papier.ink} size={20} />
                    </Animated.View>
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-start" }}>
                    <Text style={[TYPE.label, { color: ST.papier.ink }]} numberOfLines={2}>
                      {t("home.nudge_title")}
                    </Text>
                    <PillButton
                      label={t("home.nudge_cta")}
                      onPress={handleNudgeCTA}
                      style={{ height: 36, paddingHorizontal: 14, marginTop: 8 }}
                    />
                  </View>
                  <CircBtn
                    size={28}
                    bg="rgba(255,255,255,0.7)"
                    shadow={false}
                    accessibilityLabel={t("reminder_edit.close")}
                    onPress={handleDismissNudge}
                  >
                    <XIcon color={ST.papier.ink} size={11} />
                  </CircBtn>
                </SoftCard>
              </View>
            )}

            {/* Calendar title row: tap to switch calendars */}
            <Pressable
              onPress={onCalendarPress}
              accessibilityRole="button"
              accessibilityLabel={`${active.title}, ${t("home.switch")}`}
              style={({ pressed }) => ({
                marginHorizontal: 20,
                marginTop: 24,
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={[TYPE.heading, { flex: 1, color: S.ink, paddingRight: 12 }]} numberOfLines={1}>
                {active.title}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                  borderRadius: 99,
                  backgroundColor: "#fff",
                }}
              >
                <Text style={[TYPE.caption, { color: S.ink }]}>{t("home.switch")}</Text>
                <ChevRIcon color={S.sec} size={11} />
              </View>
            </Pressable>

            {/* Monthly calendar */}
            <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
              <CalendarMonth marks={marks} municipality={municipality} onDayPress={handleDayPress} />
            </View>

            {/* The rest of the upcoming pickups */}
            {listEvents.length > 0 && (
              <View style={{ paddingTop: 20 }}>
                <UpcomingList events={listEvents} />
              </View>
            )}

            {/* Show more: expands the window by 5 days at a time */}
            {hasMoreDays && (
              <View style={{ alignItems: "center", paddingTop: 12 }}>
                <PillButton
                  variant="secondary"
                  label={t("home.show_more", { n: Math.min(5, remainingDays) })}
                  onPress={() => setDayLimit((n) => n + 5)}
                  style={{ height: 46 }}
                />
              </View>
            )}

            {/* Fun fact: a compact tinted card that rotates every 10 s */}
            {!!funFact && (
              <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
                <SoftCard
                  bg={ST[factStream].soft}
                  style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14 }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      backgroundColor: ST[factStream].c,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <StreamGlyph stream={factStream} size={32} color={ST[factStream].ink} />
                  </View>
                  <Animated.Text
                    style={[TYPE.caption, { flex: 1, color: ST[factStream].ink, opacity: factOpacity }]}
                  >
                    {funFact}
                  </Animated.Text>
                </SoftCard>
              </View>
            )}
          </>
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
        current={active ? active.location : homeLocation}
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
