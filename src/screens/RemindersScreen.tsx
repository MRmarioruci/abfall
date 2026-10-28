import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STREAM_ORDER, type WasteStreamId } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { StreamGlyph } from "../components/icons/StreamGlyph";
import { SoftSwitch } from "../components/ui/SoftSwitch";
import { SunIcon, MoonIcon, BellIcon, PlusIcon, XIcon, ChevRIcon, CalIcon, GoogleIcon } from "../components/icons/Icons";
import { ArtTile, OptionRow, SoftCard } from "../components/ui/sheet";
import { HAIRLINE, RADIUS } from "../theme/layout";
import { EmptyState } from "../components/ui/EmptyState";
import { WhenArt } from "../components/reminders/ReminderArt";
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
} from "../services/notifications";
import {
  getNotificationDestination,
  setNotificationDestination,
  type NotificationDestination,
} from "../services/notificationDelivery";
import { getRefreshClientId, useGoogleAuth } from "../hooks/useGoogleAuth";
import { applyDelivery } from "../services/notificationDelivery";
import type { ReminderRule } from "../types/calendar";
import { NUMS, TYPE } from "../theme/type";

type RemindersMap = Record<WasteStreamId, ReminderRule[]>;

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
  const { S, ST } = useTheme();
  const insets = useSafeAreaInsets();
  const { active, patchCalendar } = useCalendars();
  const { t, wasteLabel, whenLabel, monthShort, weekdayShort } = useT();
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
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<ReminderRule | null>(null);
  const [editingStream, setEditingStream] = useState<WasteStreamId>("papier");

  const reminders = active?.reminders || EMPTY_REMINDERS;

  // Next pickup per bin, for the line under its name.
  const nextPickup = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: Partial<Record<WasteStreamId, Date>> = {};
    for (const e of active?.events ?? []) {
      const d = parseISODate(e.date);
      if (d < today) continue;
      const cur = out[e.type];
      if (!cur || d < cur) out[e.type] = d;
    }
    return out;
  })();

  // One card per bin this calendar collects (plus any bin that still has
  // reminders), soonest pickup first; a bin Home sent us to goes on top.
  const bins = (() => {
    const list = STREAM_ORDER.filter(
      (id) => (reminders[id] || []).length > 0 || active?.events.some((e) => e.type === id),
    ).sort((x, y) => (nextPickup[x]?.getTime() ?? Infinity) - (nextPickup[y]?.getTime() ?? Infinity));
    if (preselectedStream && list.includes(preselectedStream)) {
      return [preselectedStream, ...list.filter((id) => id !== preselectedStream)];
    }
    return list;
  })();

  // The header's summary: how many are on, and when the next one fires.
  const activeRules = STREAM_ORDER.flatMap((id) => (reminders[id] || []).filter((r) => r.on).map((r) => ({ id, r })));
  const nextFire = activeRules
    .map(({ id, r }) => (active ? getNextTriggerForRule(active, id, r) : null))
    .filter((d): d is Date => !!d)
    .sort((x, y) => x.getTime() - y.getTime())[0];
  const hasAnyRule = STREAM_ORDER.some((id) => (reminders[id] || []).length > 0);

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

  const openAdd = (stream: WasteStreamId) => {
    setEditingStream(stream);
    setEditingRule(null);
    setEditorVisible(true);
  };

  // Quick start: the same rule for every bin, in one go. "Evening before"
  // and "morning of" fire at fixed times (20:00 / 07:00), so the stored time
  // just mirrors that.
  const quickAddAll = async (when: "evening before" | "morning of") => {
    if (!active || bins.length === 0) return;
    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert(t("common.permission_needed"), t("common.permission_body"));
      return;
    }
    const next = { ...reminders };
    for (const id of bins) {
      const list = next[id] || [];
      if (list.some((r) => r.when === when)) continue;
      next[id] = [
        ...list,
        { id: `${Date.now()}_${id}_${Math.random().toString(36).slice(2, 6)}`, when, time: when === "evening before" ? "20:00" : "07:00", on: true },
      ];
    }
    updateReminders(next);
    haptics.success();
    toast.show(t("home.toast.saved"));
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
              ? { label: t("add.title"), onPress: onAddCalendar, icon: <PlusIcon color={S.onInk} size={18} /> }
              : undefined
          }
        />
      </View>
    );
  }

  const destLabel = t(`destination.${destination}.label` as StringKey);
  const whenText = (r: ReminderRule) =>
    r.when === "specific date" && r.customDate ? formatCustomDate(r.customDate, monthShort) : whenLabel(r.when);
  const ruleLabel = (stream: WasteStreamId, r: ReminderRule) => `${wasteLabel(stream)} · ${whenText(r)} · ${r.time}`;

  const destIcon =
    destination === "abfall" ? (
      <BellIcon color={ST.papier.ink} size={18} />
    ) : destination === "google" ? (
      <GoogleIcon size={18} />
    ) : destination === "phone" ? (
      <CalIcon color={ST.papier.ink} size={18} />
    ) : (
      <XIcon color={S.sec} size={14} />
    );

  return (
    <View style={{ flex: 1, backgroundColor: S.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title, and in one line where things stand */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={[TYPE.title, { color: S.ink }]}>{t("tabs.reminders")}</Text>
          <Text style={[TYPE.caption, { color: S.sec, marginTop: 4 }]} numberOfLines={1}>
            {activeRules.length === 0
              ? t("reminders.summary_none")
              : t(activeRules.length === 1 ? "reminders.summary_one" : "reminders.summary", {
                  n: activeRules.length,
                  when: nextFire ? formatTriggerLabel(nextFire, monthShort) : t("reminders.no_upcoming"),
                })}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 18, gap: 10 }}>
          {/* Nothing set up yet: one tap covers every bin */}
          {!hasAnyRule && bins.length > 0 && (
            <View style={{ marginBottom: 14 }}>
              <Text style={[TYPE.heading, { color: S.ink, paddingHorizontal: 4 }]}>{t("reminders.quick_title")}</Text>
              <Text style={[TYPE.caption, { color: S.sec, marginTop: 4, paddingHorizontal: 4 }]}>
                {t("reminders.quick_body")}
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <ArtTile label={whenLabel("evening before")} bg={ST.papier.soft} onPress={() => quickAddAll("evening before")}>
                  <WhenArt kind="evening" ink={ST.papier.ink} />
                </ArtTile>
                <ArtTile label={whenLabel("morning of")} bg={ST.karton.soft} onPress={() => quickAddAll("morning of")}>
                  <WhenArt kind="morning" ink={ST.karton.ink} />
                </ArtTile>
              </View>
            </View>
          )}

          {/* One card per bin: when it's next collected, and its reminders */}
          {bins.map((id) => {
            const cc = ST[id];
            const rules = reminders[id] || [];
            const next = nextPickup[id];
            return (
              <SoftCard key={id} style={{ padding: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: RADIUS.well,
                      backgroundColor: cc.c,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <StreamGlyph stream={id} size={22} color={cc.onC} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[TYPE.label, { color: S.ink }]} numberOfLines={1}>
                      {wasteLabel(id)}
                    </Text>
                    <Text style={[TYPE.caption, { color: S.sec, marginTop: 1 }]} numberOfLines={1}>
                      {next
                        ? t("reminders.next_pickup", {
                            date: `${weekdayShort(next.getDay())} ${next.getDate()} ${monthShort(next.getMonth() + 1)}`,
                          })
                        : t("reminders.no_pickups")}
                    </Text>
                  </View>
                </View>

                {rules.map((r) => {
                  const label = ruleLabel(id, r);
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => openEdit(r, id)}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderTopWidth: HAIRLINE,
                        borderTopColor: S.line,
                        backgroundColor: pressed ? S.fill : "transparent",
                      })}
                    >
                      <View style={{ width: 38, alignItems: "center" }}>
                        {getWhenIcon(r.when, r.on ? S.ink : S.ter, 18)}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[TYPE.label, { color: r.on ? S.ink : S.sec, fontSize: 15 }]} numberOfLines={1}>
                          {whenText(r)}
                        </Text>
                        <Text style={[TYPE.caption, NUMS, { color: S.sec, marginTop: 1 }]}>{r.time}</Text>
                      </View>
                      <Pressable onPress={(e) => e.stopPropagation()}>
                        <SoftSwitch on={r.on} onChange={() => handleToggle(r, id)} accessibilityLabel={label} />
                      </Pressable>
                    </Pressable>
                  );
                })}

                <Pressable
                  onPress={() => {
                    haptics.tap();
                    openAdd(id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("reminders.add_short")}: ${wasteLabel(id)}`}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 13,
                    paddingHorizontal: 14,
                    borderTopWidth: HAIRLINE,
                    borderTopColor: S.line,
                    backgroundColor: pressed ? S.fill : "transparent",
                  })}
                >
                  <View style={{ width: 38, alignItems: "center" }}>
                    <PlusIcon color={S.sec} size={16} />
                  </View>
                  <Text style={[TYPE.label, { color: S.sec, fontSize: 15 }]}>{t("reminders.add_short")}</Text>
                </Pressable>
              </SoftCard>
            );
          })}

          {/* Where they're delivered: a setting, so it sits at the end */}
          <View style={{ marginTop: 8 }}>
            <OptionRow
              label={t("reminders.where")}
              icon={destIcon}
              iconBg={destination === "google" ? S.white : ST.papier.soft}
              onPress={() => {
                haptics.tap();
                setDestinationPickerVisible(true);
              }}
              right={
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[TYPE.caption, { color: S.sec }]} numberOfLines={1}>
                    {destLabel}
                  </Text>
                  <ChevRIcon color={S.ter} size={13} />
                </View>
              }
            />
          </View>
        </View>
      </ScrollView>

      <ReminderEditSheet
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        stream={editingStream}
        rule={editingRule}
        onSave={handleSave}
        fixedStream
        onDelete={(stream, rule) => handleDelete(rule.id, stream)}
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
