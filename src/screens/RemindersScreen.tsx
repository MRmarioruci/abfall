import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { S, ST, STREAM_ORDER, type WasteStreamId } from "../theme/colors";
import { StreamGlyph } from "../components/icons/StreamGlyph";
import { SoftSwitch } from "../components/ui/SoftSwitch";
import { SunIcon, MoonIcon, BellIcon, PlusIcon, XIcon, ChevRIcon, CalIcon, GoogleIcon } from "../components/icons/Icons";
import { ReminderEditSheet } from "../components/ReminderEditSheet";
import { DestinationPicker } from "../components/DestinationPicker";
import { useToast } from "../components/ui/Toast";
import { useCalendars } from "../context/CalendarContext";
import { useT } from "../context/LocaleContext";
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
};

function getWhenIcon(when: string, color: string, size = 19) {
  const w = when.toLowerCase();
  if (w.includes("morning")) return <SunIcon color={color} size={size} />;
  if (w.includes("evening")) return <MoonIcon color={color} size={size} />;
  return <BellIcon color={color} size={size} />;
}

export function RemindersScreen({ preselectedStream }: { preselectedStream?: WasteStreamId }) {
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
        toast.show(t("reminders.toast.delivery_failed", { dest: destLabel }));
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
        toast.show(t("reminders.toast.google_failed", { error: msg }));
      }
      // Safety net: if `connected` never flips within 30s (user cancelled
      // on Google's consent screen, dismissed the system browser, etc.),
      // give up and revert.
      setTimeout(() => {
        if (pendingGoogleAuthRef.current && !google.connected) {
          setPendingGoogleAuth(false);
          if (previousDestinationRef.current) {
            setDestination(previousDestinationRef.current);
            previousDestinationRef.current = null;
            toast.show(t("reminders.toast.google_cancelled"));
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

  const handleDelete = (ruleId: string, stream: WasteStreamId) => {
    if (!active) return;
    const next = { ...reminders };
    next[stream] = (next[stream] || []).filter((r) => r.id !== ruleId);
    updateReminders(next);
    toast.show(t("reminders.toast.removed"));
  };

  const openAdd = () => {
    // From "All" view, default to the first stream that has events in the
    // calendar (most likely to actually fire), or papier as fallback. From a
    // stream view, use that stream.
    const fallback =
      (active?.events[0]?.type as WasteStreamId | undefined) ?? "papier";
    setEditingStream(sel === "all" ? fallback : sel);
    setEditingRule(null);
    setEditorVisible(true);
  };

  const openEdit = (rule: ReminderRule, stream: WasteStreamId) => {
    setEditingStream(stream);
    setEditingRule(rule);
    setEditorVisible(true);
  };

  if (!active) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F5F2F7",
          paddingTop: insets.top + 40,
          paddingHorizontal: 30,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800", color: S.ink, textAlign: "center" }}>
          {t("reminders.no_calendar_title")}
        </Text>
        <Text style={{ marginTop: 8, fontSize: 14, color: S.sec, textAlign: "center" }}>
          {t("reminders.no_calendar_body")}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F2F7" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 12.5, color: S.sec, fontWeight: "600", marginBottom: 6 }}>
            {t("reminders.notifications")}
          </Text>
          <Text style={{ fontSize: 34, fontWeight: "500", color: S.ink, letterSpacing: -0.8 }}>
            {t("reminders.title_lead")} <Text style={{ fontWeight: "800" }}>{t("reminders.title_bold")}</Text>
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: S.sec,
              lineHeight: 21,
              fontWeight: "500",
              marginTop: 10,
            }}
          >
            {t("reminders.subtitle", { name: active.title })}
          </Text>
        </View>

        {/* Destination strip — single tap to change where reminders go.
            Always visible so the user knows exactly where the next ping
            will come from. */}
        <Pressable
          onPress={() => setDestinationPickerVisible(true)}
          style={{
            marginHorizontal: 16,
            marginTop: 18,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 12,
            paddingHorizontal: 14,
            backgroundColor: S.card,
            borderRadius: 18,
            shadowColor: "rgb(150,118,96)",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              backgroundColor: destination === "google" ? "#fff" : "#F4EFEA",
              borderWidth: destination === "google" ? 1.5 : 0,
              borderColor: S.line,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {destination === "abfall" ? (
              <BellIcon color={S.ink} size={17} />
            ) : destination === "google" ? (
              <GoogleIcon size={18} />
            ) : destination === "phone" ? (
              <CalIcon color={S.ink} size={17} />
            ) : (
              <XIcon color={S.sec} size={15} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10.5, fontWeight: "800", color: S.ter, letterSpacing: 0.6 }}>
              {t("reminders.delivered_via")}
            </Text>
            <Text style={{ fontSize: 14.5, fontWeight: "800", color: S.ink, marginTop: 1, letterSpacing: -0.2 }}>
              {t(`destination.${destination}.label` as StringKey)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 99,
              backgroundColor: "#F0EAE4",
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: "800", color: S.sec }}>{t("common.change")}</Text>
            <ChevRIcon color={S.sec} size={10} />
          </View>
        </Pressable>

        {/* Stream chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: 4,
            gap: 10,
          }}
        >
          {/* "All" chip — selected by default */}
          {(() => {
            const on = sel === "all";
            return (
              <Pressable
                key="all"
                onPress={() => setSel("all")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 9,
                  paddingVertical: 8,
                  paddingRight: 14,
                  paddingLeft: 14,
                  borderRadius: 99,
                  backgroundColor: on ? S.ink : "#fff",
                  ...(on
                    ? {}
                    : {
                        shadowColor: "rgb(150,118,96)",
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.12,
                        shadowRadius: 18,
                        elevation: 3,
                      }),
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "800",
                    color: on ? "#fff" : S.ink,
                    letterSpacing: -0.3,
                  }}
                >
                  {t("reminders.all")}
                </Text>
                {totalActiveCount > 0 && (
                  <View
                    style={{
                      minWidth: 19,
                      height: 19,
                      paddingHorizontal: 5,
                      borderRadius: 99,
                      backgroundColor: on ? "rgba(255,255,255,0.18)" : "#F0EAE4",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "800",
                        color: on ? "#fff" : S.sec,
                      }}
                    >
                      {totalActiveCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })()}
          {STREAM_ORDER.map((id) => {
            const on = id === sel;
            // Defensive `|| []`: a saved calendar's reminders map may be a
            // partial shape (missing some stream keys) if it was created
            // before this stream existed. Avoid crashing on .filter().
            const n = (reminders[id] || []).filter((r) => r.on).length;
            const cc = ST[id];
            return (
              <Pressable
                key={id}
                onPress={() => setSel(id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 9,
                  paddingVertical: 8,
                  paddingRight: 14,
                  paddingLeft: 8,
                  borderRadius: 99,
                  backgroundColor: on ? cc.c : "#fff",
                  ...(on
                    ? {}
                    : {
                        shadowColor: "rgb(150,118,96)",
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.12,
                        shadowRadius: 18,
                        elevation: 3,
                      }),
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    backgroundColor: on ? "rgba(255,255,255,0.55)" : cc.soft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <StreamGlyph stream={id} size={19} color={cc.ink} />
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "800",
                    color: on ? cc.ink : S.ink,
                    letterSpacing: -0.3,
                  }}
                >
                  {wasteLabel(id)}
                </Text>
                {n > 0 && (
                  <View
                    style={{
                      minWidth: 19,
                      height: 19,
                      paddingHorizontal: 5,
                      borderRadius: 99,
                      backgroundColor: on ? cc.ink : "#F0EAE4",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "800",
                        color: on ? "#fff" : S.sec,
                      }}
                    >
                      {n}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Section header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: S.ter, letterSpacing: 1.2 }}>
            {sel === "all"
              ? visibleEntries.length === 1
                ? t("reminders.section_all_one")
                : t("reminders.section_all", { n: visibleEntries.length })
              : visibleEntries.length === 1
              ? t("reminders.section_stream_one", { name: wasteLabel(sel).toUpperCase() })
              : t("reminders.section_stream", { name: wasteLabel(sel).toUpperCase(), n: visibleEntries.length })}
          </Text>
        </View>

        {/* Reminder list */}
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {visibleEntries.length === 0 && (
            <View
              style={{
                backgroundColor: S.card,
                borderRadius: 22,
                padding: 28,
                alignItems: "center",
                shadowColor: "rgb(150,118,96)",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.12,
                shadowRadius: 18,
                elevation: 3,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: S.ink,
                  letterSpacing: -0.3,
                }}
              >
                {t("reminders.empty_title")}
              </Text>
              <Text
                style={{
                  fontSize: 13.5,
                  color: S.sec,
                  marginTop: 4,
                  fontWeight: "500",
                  textAlign: "center",
                }}
              >
                {sel === "all"
                  ? t("reminders.empty_all")
                  : t("reminders.empty_stream", { name: wasteLabel(sel).toLowerCase() })}
              </Text>
            </View>
          )}

          {visibleEntries.map(({ stream, rule: r }) => {
            const cc = ST[stream];
            const upcoming = active ? getUpcomingTriggersForRule(active, stream, r) : [];
            const isRecurring = r.when !== "specific date";
            return (
              <Pressable
                key={`${stream}-${r.id}`}
                onPress={() => openEdit(r, stream)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 13,
                  backgroundColor: S.card,
                  borderRadius: 22,
                  padding: 13,
                  paddingRight: 14,
                  shadowColor: "rgb(150,118,96)",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.12,
                  shadowRadius: 18,
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 13,
                    backgroundColor: r.on ? cc.soft : "#F2ECE6",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {getWhenIcon(r.when, r.on ? cc.ink : S.ter)}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {sel === "all" && (
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 99,
                          backgroundColor: r.on ? cc.c : "#F2ECE6",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: "800",
                            color: r.on ? cc.ink : S.sec,
                            letterSpacing: -0.1,
                          }}
                        >
                          {wasteLabel(stream)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: r.on ? S.ink : S.sec,
                      marginTop: sel === "all" ? 3 : 0,
                    }}
                  >
                    {r.when === "specific date" && r.customDate
                      ? r.customDate
                      : whenLabel(r.when)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: S.sec,
                      marginTop: 1,
                      fontWeight: "600",
                    }}
                  >
                    {t("reminders.at_time", { time: r.time })}
                  </Text>
                  {/* Show the scheduling reality for this rule: number of
                      upcoming firings + the next one, so users see at a glance
                      that a recurring rule books many notifications. */}
                  {r.on && (
                    <Text
                      style={{
                        fontSize: 11.5,
                        color: S.ter,
                        marginTop: 4,
                        fontWeight: "700",
                        letterSpacing: 0.2,
                      }}
                    >
                      {upcoming.length === 0
                        ? t("reminders.no_upcoming")
                        : isRecurring
                        ? t("reminders.upcoming_recurring", {
                            n: upcoming.length,
                            when: formatTriggerLabel(upcoming[0], monthShort),
                          })
                        : t("reminders.upcoming_once", {
                            when: formatTriggerLabel(upcoming[0], monthShort),
                          })}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(r.id, stream);
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 99,
                    backgroundColor: "#F2ECE6",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 4,
                  }}
                >
                  <XIcon color={S.sec} size={14} />
                </Pressable>
                <Pressable onPress={(e) => e.stopPropagation()}>
                  <SoftSwitch on={r.on} onChange={() => handleToggle(r, stream)} />
                </Pressable>
              </Pressable>
            );
          })}

          {/* Add button */}
          <Pressable
            onPress={openAdd}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              borderWidth: 1.6,
              borderStyle: "dashed",
              borderColor: S.ter,
              borderRadius: 22,
              padding: 16,
            }}
          >
            <PlusIcon color={S.ink} size={19} />
            <Text style={{ fontSize: 15.5, fontWeight: "700", color: S.ink }}>
              {t("reminders.add")}
            </Text>
          </Pressable>
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

function formatTriggerLabel(d: Date, monthShort: (m: number) => string): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${monthShort(d.getMonth() + 1)} ${hh}:${mm}`;
}
