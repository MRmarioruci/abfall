import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S, ST, STREAM_ORDER, type WasteStreamId } from "../theme/colors";
import { StreamGlyph } from "../components/icons/StreamGlyph";
import { SoftSwitch } from "../components/ui/SoftSwitch";
import { SunIcon, MoonIcon, BellIcon, PlusIcon, XIcon, ChevRIcon, CalIcon, GoogleIcon } from "../components/icons/Icons";
import { ArtTile, PillButton } from "../components/ui/sheet";
import { EmptyState } from "../components/ui/EmptyState";
import { BellArt, WhenArt } from "../components/reminders/ReminderArt";
import { haptics } from "../lib/haptics";
import { ReminderEditSheet } from "../components/ReminderEditSheet";
import { DestinationPicker } from "../components/DestinationPicker";
import { useToast } from "../components/ui/Toast";
import { useCalendars } from "../context/CalendarContext";
import { useT } from "../context/LocaleContext";
import { parseISODate } from "../lib/dates";
import type { StringKey } from "../i18n";
import {
  requestNotificationPermissions,
  getNextTriggerForRule,
  getUpcomingTriggersForRule,
} from "../services/notifications";
import {
  getNotificationDestination,
  setNotificationDestination,
  DESTINATIONS,
  type NotificationDestination,
} from "../services/notificationDelivery";
import { getRefreshClientId, useGoogleAuth } from "../hooks/useGoogleAuth";
import { applyDelivery } from "../services/notificationDelivery";
import type { ReminderRule } from "../types/calendar";
import { FONT, TYPE } from "../theme/type";

type RemindersMap = Record<WasteStreamId, ReminderRule[]>;
type SelKey = "all" | WasteStreamId;

// Empty per-stream map used as the fallback whenever an active calendar has
// no `reminders` field yet. Newly scanned calendars start clean — users opt in
// to each reminder they want rather than getting auto-seeded notifications.
const EMPTY_REMINDERS: RemindersMap = {
  papier: [],
  karton: [],
  kehricht: [],
  gruengut: [],
  metall: [],
  bio: [],
  sperrgut: [],
  altmetall: [],
  textilien: [],
  sonderabfall: [],
  verpackung: [],
  glas: [],
  sonstiges: [],
};

function getWhenIcon(when: string, color: string, size = 19) {
  const w = when.toLowerCase();
  if (w.includes("morning")) return <SunIcon color={color} size={size} />;
  if (w.includes("evening")) return <MoonIcon color={color} size={size} />;
  return <BellIcon color={color} size={size} />;
}

export function RemindersScreen({
  preselectedStream,
  onAddCalendar,
}: {
  preselectedStream?: WasteStreamId;
  /** Opens the add-calendar flow; the no-calendar state shows a button for it when given. */
  onAddCalendar?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { active, patchCalendar } = useCalendars();
  const { t, wasteLabel, whenLabel, monthShort } = useT();
  const toast = useToast();

  // Notification destination — read on mount, picker overwrites on change.
  const [destination, setDestination] = useState<NotificationDestination>("abfall");
  const [destinationPickerVisible, setDestinationPickerVisible] = useState(false);
  useEffect(() => {
    getNotificationDestination().then(setDestination);
  }, []);

  // Google auth hook — used when the user picks "Google Calendar" but
  // isn't signed in yet. We trigger the OAuth flow, watch for the
  // connection to land, then run the materializer.
  const google = useGoogleAuth();
  // While true, the next time `google.connected` flips to true we
  // finalize the destination switch (apply delivery + toast). Cleared
  // on cancel/error.
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState(false);
  // Remember what destination we were on before optimistically switching
  // to "google", so we can roll back if the auth flow gets cancelled.
  const previousDestinationRef = useRef<NotificationDestination | null>(null);

  const finalizeDestination = async (next: NotificationDestination) => {
    const previous = await getNotificationDestination();
    await setNotificationDestination(next);
    const destLabel = t(`destination.${next}.label` as StringKey);
    if (active) {
      try {
        await applyDelivery({
          calendar: active,
          googleClientId: getRefreshClientId(),
        });
      } catch (err) {
        // The previous destination's reminders are still in place, so
        // just point the setting back at it.
        console.warn("[reminders] applyDelivery failed", err);
        await setNotificationDestination(previous);
        setDestination(previous);
        toast.show(t("reminders.toast.delivery_failed", { dest: destLabel }), { variant: "error" });
        return;
      }
    }
    toast.show(t("reminders.toast.delivered_to", { dest: destLabel }));
  };

  // When the user picks Google but isn't signed in yet, kick off the
  // OAuth flow. We watch the hook's `connected` state and finalize once
  // it lands. If the user cancels (`response` becomes non-success and
  // we haven't connected), roll back to the previous destination.
  useEffect(() => {
    if (!pendingGoogleAuth) return;
    if (google.connected) {
      setPendingGoogleAuth(false);
      previousDestinationRef.current = null;
      finalizeDestination("google");
    }
    // Watching `connected` is enough for the success path. The cancel
    // path is handled inside handlePickDestination's catch + a timeout
    // safety net below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [google.connected, pendingGoogleAuth]);

  const handlePickDestination = async (next: NotificationDestination) => {
    if (next === "google" && !google.connected) {
      // Optimistically update the strip so the user sees their choice
      // immediately. Remember the previous destination for rollback if
      // the auth flow fails or is dismissed.
      previousDestinationRef.current = destination;
      setDestination("google");
      setPendingGoogleAuth(true);
      try {
        await google.signIn();
        // signIn() returns as soon as the system browser opens — the
        // token exchange happens later via the response effect inside
        // useGoogleAuth. The `connected` effect above will finalize.
      } catch (err) {
        // Rollback if signIn itself threw (e.g., OAuth not configured).
        setPendingGoogleAuth(false);
        if (previousDestinationRef.current) {
          setDestination(previousDestinationRef.current);
          previousDestinationRef.current = null;
        }
        const msg = err instanceof Error ? err.message : String(err);
        toast.show(t("reminders.toast.google_failed", { error: msg }), { variant: "error" });
      }
      // Safety net: if `connected` never flips within 30s (user cancelled
      // on Google's consent screen, dismissed the system browser, etc.),
      // give up and revert.
      if (googleTimeoutRef.current) clearTimeout(googleTimeoutRef.current);
      googleTimeoutRef.current = setTimeout(() => {
        googleTimeoutRef.current = null;
        if (pendingGoogleAuthRef.current && !google.connected) {
          setPendingGoogleAuth(false);
          if (previousDestinationRef.current) {
            setDestination(previousDestinationRef.current);
            previousDestinationRef.current = null;
            toast.show(t("reminders.toast.google_cancelled"), { variant: "error" });
          }
        }
      }, 30_000);
      return;
    }

    setDestination(next);
    await finalizeDestination(next);
  };

  // Mirror state into a ref so the setTimeout in handlePickDestination
  // sees the latest value (closures would capture the stale value).
  const pendingGoogleAuthRef = useRef(pendingGoogleAuth);
  // The 30s "Google sign-in never finished" fallback; cleared when the
  // screen goes away so it can't fire on another tab.
  const googleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (googleTimeoutRef.current) clearTimeout(googleTimeoutRef.current);
  }, []);
  pendingGoogleAuthRef.current = pendingGoogleAuth;
  const [sel, setSel] = useState<SelKey>(preselectedStream || "all");
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<ReminderRule | null>(null);
  // When the user opens the editor from the "All" view, they need to pick a
  // stream first; this holds that pick so handleSave knows where to write.
  const [editingStream, setEditingStream] = useState<WasteStreamId>("papier");

  useEffect(() => {
    if (preselectedStream) setSel(preselectedStream);
  }, [preselectedStream]);

  const reminders = active?.reminders || EMPTY_REMINDERS;
  // Filter chips only for the waste types this calendar collects (or that
  // already have reminders), so a calendar with three bins shows three.
  const chipStreams = STREAM_ORDER.filter(
    (id) => id === sel || (reminders[id] || []).length > 0 || active?.events.some((e) => e.type === id),
  );
  // Flat list of {stream, rule} entries for whichever filter is active.
  // For "all" we sort by upcoming-soonest so the most relevant pickup floats
  // to the top; for a specific stream we keep insertion order.
  const visibleEntries: { stream: WasteStreamId; rule: ReminderRule }[] = (() => {
    if (sel === "all") {
      const all: { stream: WasteStreamId; rule: ReminderRule; next: Date | null }[] = [];
      for (const id of STREAM_ORDER) {
        for (const r of reminders[id] || []) {
          all.push({
            stream: id,
            rule: r,
            next: active ? getNextTriggerForRule(active, id, r) : null,
          });
        }
      }
      all.sort((a, b) => {
        if (a.next && b.next) return a.next.getTime() - b.next.getTime();
        if (a.next) return -1;
        if (b.next) return 1;
        return 0;
      });
      return all.map(({ stream, rule }) => ({ stream, rule }));
    }
    return (reminders[sel] || []).map((rule) => ({ stream: sel, rule }));
  })();
  const totalActiveCount = STREAM_ORDER.reduce(
    (n, id) => n + (reminders[id] || []).filter((r) => r.on).length,
    0,
  );

  const updateReminders = (next: RemindersMap) => {
    if (!active) return;
    patchCalendar(active.id, { reminders: next }).catch(() => {});
  };

  const handleSave = async (stream: WasteStreamId, rule: ReminderRule) => {
    if (!active) return;

    // If we're turning a rule on (new or previously off), ensure we have permission.
    if (rule.on) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(t("common.permission_needed"), t("common.permission_body"));
        return;
      }
    }

    const next = { ...reminders };
    const streamRules = [...(next[stream] || [])];
    const idx = streamRules.findIndex((r) => r.id === rule.id);
    const updating = idx >= 0;
    if (updating) {
      streamRules[idx] = rule;
    } else {
      streamRules.push(rule);
    }
    next[stream] = streamRules;
    updateReminders(next);

    const verb = updating ? t("home.toast.updated") : t("home.toast.saved");
    const nextTrigger = getNextTriggerForRule(active, stream, rule);
    toast.show(
      nextTrigger
        ? `${verb} · ${formatTriggerLabel(nextTrigger, monthShort)}`
        : `${verb} · ${t("home.toast.no_match")}`,
    );
  };

  const handleToggle = async (rule: ReminderRule, stream: WasteStreamId) => {
    if (!active) return;

    const turningOn = !rule.on;
    if (turningOn) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(t("common.permission_needed"), t("common.permission_body"));
        return;
      }
    }

    const next = { ...reminders };
    const updatedRule = { ...rule, on: turningOn };
    next[stream] = (next[stream] || []).map((r) => (r.id === rule.id ? updatedRule : r));
    updateReminders(next);

    if (turningOn) {
      const nextTrigger = getNextTriggerForRule(active, stream, updatedRule);
      toast.show(
        nextTrigger
          ? t("reminders.toast.on", { when: formatTriggerLabel(nextTrigger, monthShort) })
          : t("reminders.toast.on_no_match"),
      );
    } else {
      toast.show(t("reminders.toast.off"));
    }
  };

  // Latest calendar + reminders for the Undo callback, which runs after
  // later renders and must not restore over newer edits.
  const activeRef = useRef(active);
  activeRef.current = active;

  const handleDelete = (ruleId: string, stream: WasteStreamId) => {
    if (!active) return;
    const calendarId = active.id;
    const before = reminders;
    const index = (before[stream] || []).findIndex((r) => r.id === ruleId);
    if (index < 0) return;
    const removed = (before[stream] || [])[index];
    const next = { ...before };
    next[stream] = (next[stream] || []).filter((r) => r.id !== ruleId);
    updateReminders(next);
    haptics.warn();

    const restore = () => {
      const current = activeRef.current;
      if (!current || current.id !== calendarId) {
        // The user switched calendars meanwhile; put the deleted one's map back as it was.
        patchCalendar(calendarId, { reminders: before }).catch(() => {});
        return;
      }
      const map = { ...(current.reminders || EMPTY_REMINDERS) };
      const list = [...(map[stream] || [])];
      if (list.some((r) => r.id === removed.id)) return;
      list.splice(Math.min(index, list.length), 0, removed);
      map[stream] = list;
      patchCalendar(calendarId, { reminders: map }).catch(() => {});
    };

    toast.show(t("reminders.toast.removed"), {
      variant: "info",
      action: { label: t("common.undo"), onPress: restore },
    });
  };

  // The stream a new reminder is for: the selected one, or (from "All") the
  // first stream that has events in the calendar, or papier as fallback.
  const defaultStream = (): WasteStreamId =>
    sel === "all" ? ((active?.events[0]?.type as WasteStreamId | undefined) ?? "papier") : sel;

  const openAdd = () => {
    setEditingStream(defaultStream());
    setEditingRule(null);
    setEditorVisible(true);
  };

  // Quick start from the empty state: the same rule the editor would save.
  // "evening before" and "morning of" fire at fixed times (20:00 / 07:00),
  // so the stored time just mirrors that.
  const quickAdd = (when: "evening before" | "morning of") => {
    handleSave(defaultStream(), {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      when,
      time: when === "evening before" ? "20:00" : "07:00",
      on: true,
    });
  };

  const openEdit = (rule: ReminderRule, stream: WasteStreamId) => {
    setEditingStream(stream);
    setEditingRule(rule);
    setEditorVisible(true);
  };

  if (!active) {
    return (
      <View style={{ flex: 1, backgroundColor: S.bg, paddingTop: insets.top + 12, paddingHorizontal: 16 }}>
        <Text style={[TYPE.title, { color: S.ink, paddingHorizontal: 4, marginBottom: 16 }]}>
          {t("tabs.reminders")}
        </Text>
        <EmptyState
          title={t("reminders.no_calendar_title")}
          subtitle={t("reminders.no_calendar_body")}
          bg={ST.papier.soft}
          action={
            onAddCalendar
              ? { label: t("add.title"), onPress: onAddCalendar, icon: <PlusIcon color="#fff" size={18} /> }
              : undefined
          }
        />
      </View>
    );
  }

  const destLabel = t(`destination.${destination}.label` as StringKey);
  const ruleLabel = (stream: WasteStreamId, r: ReminderRule) =>
    `${wasteLabel(stream)} · ${
      r.when === "specific date" && r.customDate ? formatCustomDate(r.customDate, monthShort) : whenLabel(r.when)
    } · ${r.time}`;
  const quickStream = defaultStream();
  const qc = ST[quickStream];

  return (
    <View style={{ flex: 1, backgroundColor: S.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact header: title, then calendar name · destination. The
            destination is the tap target for the picker. */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={[TYPE.title, { color: S.ink }]}>{t("tabs.reminders")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, minHeight: 32 }}>
            <Text style={[TYPE.caption, { color: S.sec, flexShrink: 1 }]} numberOfLines={1}>
              {active.title}
              {"  ·  "}
            </Text>
            <Pressable
              onPress={() => {
                haptics.tap();
                setDestinationPickerVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${t("destination_picker.title")}: ${destLabel}`}
              hitSlop={8}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 5,
                paddingLeft: 6,
                paddingRight: 10,
                borderRadius: 99,
                backgroundColor: "#fff",
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 99,
                  backgroundColor: destination === "google" ? "#fff" : ST.papier.soft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {destination === "abfall" ? (
                  <BellIcon color={ST.papier.ink} size={13} />
                ) : destination === "google" ? (
                  <GoogleIcon size={14} />
                ) : destination === "phone" ? (
                  <CalIcon color={ST.papier.ink} size={13} />
                ) : (
                  <XIcon color={S.sec} size={11} />
                )}
              </View>
              <Text style={[TYPE.caption, { color: S.ink, fontFamily: FONT.w700 }]} numberOfLines={1}>
                {destLabel}
              </Text>
              <ChevRIcon color={S.sec} size={10} />
            </Pressable>
          </View>
        </View>

        {/* Stream chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14, gap: 8 }}
        >
          {(() => {
            const on = sel === "all";
            return (
              <Pressable
                key="all"
                onPress={() => {
                  haptics.select();
                  setSel("all");
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 44,
                  paddingHorizontal: 16,
                  borderRadius: 99,
                  backgroundColor: on ? S.ink : "#fff",
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Text style={[TYPE.label, { color: on ? "#fff" : S.ink }]}>{t("reminders.all")}</Text>
                {totalActiveCount > 0 && (
                  <View
                    style={{
                      minWidth: 20,
                      height: 20,
                      paddingHorizontal: 5,
                      borderRadius: 99,
                      backgroundColor: on ? "rgba(255,255,255,0.18)" : S.bg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={[TYPE.micro, { color: on ? "#fff" : S.sec }]}>{totalActiveCount}</Text>
                  </View>
                )}
              </Pressable>
            );
          })()}
          {chipStreams.map((id) => {
            const on = id === sel;
            // Defensive `|| []`: a saved calendar's reminders map may be a
            // partial shape (missing some stream keys) if it was created
            // before this stream existed. Avoid crashing on .filter().
            const n = (reminders[id] || []).filter((r) => r.on).length;
            const cc = ST[id];
            return (
              <Pressable
                key={id}
                onPress={() => {
                  haptics.select();
                  setSel(id);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 44,
                  paddingRight: 14,
                  paddingLeft: 7,
                  borderRadius: 99,
                  backgroundColor: on ? cc.c : "#fff",
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 99,
                    backgroundColor: on ? "rgba(255,255,255,0.55)" : cc.soft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <StreamGlyph stream={id} size={18} color={cc.ink} />
                </View>
                <Text style={[TYPE.label, { color: on ? cc.ink : S.ink }]}>{wasteLabel(id)}</Text>
                {n > 0 && (
                  <View
                    style={{
                      minWidth: 20,
                      height: 20,
                      paddingHorizontal: 5,
                      borderRadius: 99,
                      backgroundColor: on ? cc.ink : cc.soft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={[TYPE.micro, { color: on ? "#fff" : cc.ink }]}>{n}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Reminder list */}
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {visibleEntries.length === 0 && (
            <>
              <EmptyState
                title={t("reminders.empty_title")}
                subtitle={
                  sel === "all"
                    ? t("reminders.empty_all")
                    : t("reminders.empty_stream", { name: wasteLabel(sel) })
                }
                art={<BellArt />}
                bg={sel === "all" ? ST.papier.soft : ST[sel].soft}
                action={{ label: t("reminders.add"), onPress: openAdd, icon: <PlusIcon color="#fff" size={18} /> }}
              />
              {/* Quick start: one tap creates the two most common rules. */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <ArtTile label={whenLabel("evening before")} bg={qc.soft} onPress={() => quickAdd("evening before")}>
                  <WhenArt kind="evening" ink={qc.ink} />
                </ArtTile>
                <ArtTile label={whenLabel("morning of")} bg={qc.soft} onPress={() => quickAdd("morning of")}>
                  <WhenArt kind="morning" ink={qc.ink} />
                </ArtTile>
              </View>
            </>
          )}

          {visibleEntries.map(({ stream, rule: r }) => {
            const cc = ST[stream];
            const upcoming = getUpcomingTriggersForRule(active, stream, r);
            const isRecurring = r.when !== "specific date";
            const label = ruleLabel(stream, r);
            return (
              <Pressable
                key={`${stream}-${r.id}`}
                onPress={() => openEdit(r, stream)}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: S.card,
                  borderRadius: 24,
                  paddingVertical: 12,
                  paddingLeft: 12,
                  paddingRight: 14,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 15,
                    backgroundColor: cc.soft,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: r.on ? 1 : 0.6,
                  }}
                >
                  {getWhenIcon(r.when, cc.ink)}
                </View>
                <View style={{ flex: 1 }}>
                  {sel === "all" && (
                    <View
                      style={{
                        alignSelf: "flex-start",
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 99,
                        backgroundColor: r.on ? cc.c : cc.soft,
                        marginBottom: 3,
                      }}
                    >
                      <Text style={[TYPE.micro, { color: cc.ink }]}>{wasteLabel(stream)}</Text>
                    </View>
                  )}
                  <Text style={[TYPE.label, { color: r.on ? S.ink : S.sec }]} numberOfLines={1}>
                    {r.when === "specific date" && r.customDate
                      ? formatCustomDate(r.customDate, monthShort)
                      : whenLabel(r.when)}
                  </Text>
                  {/* Time, then the scheduling reality for this rule: number
                      of upcoming firings + the next one. */}
                  <Text style={[TYPE.caption, { color: S.sec, marginTop: 1 }]} numberOfLines={1}>
                    {t("reminders.at_time", { time: r.time })}
                    {r.on &&
                      `  ·  ${
                        upcoming.length === 0
                          ? t("reminders.no_upcoming")
                          : isRecurring
                          ? t("reminders.upcoming_recurring", {
                              n: upcoming.length,
                              when: formatTriggerLabel(upcoming[0], monthShort),
                            })
                          : t("reminders.upcoming_once", {
                              when: formatTriggerLabel(upcoming[0], monthShort),
                            })
                      }`}
                  </Text>
                </View>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(r.id, stream);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("common.delete")}: ${label}`}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ scale: pressed ? 0.9 : 1 }],
                  })}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 99,
                      backgroundColor: S.bg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <XIcon color={S.sec} size={13} />
                  </View>
                </Pressable>
                <Pressable onPress={(e) => e.stopPropagation()}>
                  <SoftSwitch on={r.on} onChange={() => handleToggle(r, stream)} accessibilityLabel={label} />
                </Pressable>
              </Pressable>
            );
          })}

          {visibleEntries.length > 0 && (
            <PillButton
              label={t("reminders.add")}
              variant="secondary"
              icon={<PlusIcon color={S.ink} size={18} />}
              onPress={openAdd}
              style={{ marginTop: 6 }}
            />
          )}
        </View>
      </ScrollView>

      <ReminderEditSheet
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        stream={editingStream}
        rule={editingRule}
        onSave={handleSave}
      />

      <DestinationPicker
        visible={destinationPickerVisible}
        onClose={() => setDestinationPickerVisible(false)}
        current={destination}
        onPick={handlePickDestination}
      />
    </View>
  );
}

function formatCustomDate(iso: string, monthShort: (m: number) => string): string {
  const d = parseISODate(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${monthShort(d.getMonth() + 1)} ${d.getFullYear()}`;
}

function formatTriggerLabel(d: Date, monthShort: (m: number) => string): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${monthShort(d.getMonth() + 1)} ${hh}:${mm}`;
}
