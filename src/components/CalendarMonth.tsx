import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated, PanResponder, Dimensions } from "react-native";
import { S, ST, STREAM_ORDER, type WasteStreamId } from "../theme/colors";
import { CircBtn } from "./ui/CircBtn";
import { ChevRIcon } from "./icons/Icons";
import { Recyclops } from "./Recyclops";
import { useT } from "../context/LocaleContext";

interface CollectionMark {
  day: number;
  stream: WasteStreamId;
  // Optional: when present, marks are filtered by the displayed month/year.
  // Month is 1-12 (NOT JS 0-11) for consistency with our date strings.
  // When absent (legacy/sample data), marks apply to whatever month is shown.
  month?: number;
  year?: number;
}

interface Props {
  marks?: CollectionMark[];
  municipality?: string;
  onDayPress?: (day: number, month: number, year: number) => void;
}

// Grid uses Monday-first ordering. Map JS Date.getDay() (Sunday-first) to it
// via the WEEKDAY_INDEX array: Mon=1 → 0, ..., Sun=0 → 6.
const WEEKDAY_INDEX = [1, 2, 3, 4, 5, 6, 0];

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(month: number, year: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

const EMPTY_MARKS: CollectionMark[] = [];

export function CalendarMonth({ marks = EMPTY_MARKS, municipality = "", onDayPress }: Props) {
  const { monthLong, weekdayMin, wasteLabel } = useT();
  // Dark theme tokens. The calendar reads as an inverted card against the
  // light home screen so it stands out and so the colored pickup stripes pop.
  const T = {
    card: S.ink,
    primaryText: "#fff",
    secondaryText: "rgba(255,255,255,0.65)",
    legendText: "rgba(255,255,255,0.75)",
    legendBorder: "rgba(255,255,255,0.12)",
    chevronBg: "rgba(255,255,255,0.12)",
    chevronInk: "#fff",
    // Empty day cells: a touch lighter than the card so they read as buttons.
    dayEmptyBg: "rgba(255,255,255,0.06)",
    dayEmptyText: "rgba(255,255,255,0.55)",
    // Today indicator: white pill with black text, contrasts cleanly on dark.
    todayBg: "#fff",
    todayText: S.ink,
  };

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const today = now.getDate();
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();
  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfWeek(month, year);

  // Collect ALL streams per day (de-duped, in STREAM_ORDER) so a day with
  // multiple collections renders side-by-side color stripes. Only include
  // marks for the currently displayed month/year — marks without month/year
  // info (sample data) apply to whatever's shown.
  const displayedMonth = month + 1; // CollectionMark uses 1-12, JS uses 0-11
  const markMap: Record<number, WasteStreamId[]> = {};
  for (const m of marks) {
    if (!ST[m.stream]) continue;
    if (m.month !== undefined && m.month !== displayedMonth) continue;
    if (m.year !== undefined && m.year !== year) continue;
    if (!markMap[m.day]) markMap[m.day] = [];
    if (!markMap[m.day].includes(m.stream)) markMap[m.day].push(m.stream);
  }
  for (const day of Object.keys(markMap)) {
    markMap[+day].sort(
      (a, b) => STREAM_ORDER.indexOf(a) - STREAM_ORDER.indexOf(b),
    );
  }

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  // Swipe gestures — use latest-ref pattern so the PanResponder created on
  // first render still calls the current prev/next handlers.
  const navRef = useRef({ prev: prevMonth, next: nextMonth });
  navRef.current = { prev: prevMonth, next: nextMonth };

  const translateX = useRef(new Animated.Value(0)).current;
  const slideWidth = Dimensions.get("window").width;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) * 1.5 && Math.abs(g.dx) > 8,
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        const distanceThreshold = 60;
        const velocityThreshold = 0.4;
        const swipeLeft = g.dx < -distanceThreshold || g.vx < -velocityThreshold;
        const swipeRight = g.dx > distanceThreshold || g.vx > velocityThreshold;

        if (swipeLeft) {
          Animated.timing(translateX, {
            toValue: -slideWidth,
            duration: 160,
            useNativeDriver: true,
          }).start(() => {
            navRef.current.next();
            translateX.setValue(slideWidth);
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              speed: 18,
              bounciness: 4,
            }).start();
          });
        } else if (swipeRight) {
          Animated.timing(translateX, {
            toValue: slideWidth,
            duration: 160,
            useNativeDriver: true,
          }).start(() => {
            navRef.current.prev();
            translateX.setValue(-slideWidth);
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              speed: 18,
              bounciness: 4,
            }).start();
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            speed: 20,
            bounciness: 6,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const baseLegendStreams = STREAM_ORDER.filter((id) =>
    marks.some((m) => m.stream === id)
  );

  // Recyclops fiddles with this — picks two adjacent labels to swap
  // every time he turns his back. Anchored on the active set of streams
  // for the currently-displayed month so a month change doesn't leave
  // orphans in the order.
  const [legendOrder, setLegendOrder] = useState<WasteStreamId[]>(baseLegendStreams);
  useEffect(() => {
    // Reconcile when the set of streams changes (e.g. user navigated to
    // a different month). Preserve current relative order for streams
    // that still apply; append any newcomers at the end.
    setLegendOrder((prev) => {
      const surviving = prev.filter((s) => baseLegendStreams.includes(s));
      const additions = baseLegendStreams.filter((s) => !surviving.includes(s));
      return [...surviving, ...additions];
    });
    // baseLegendStreams is rebuilt every render; depend on its join so
    // the effect fires only when the set actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseLegendStreams.join(",")]);

  const handleRecyclopsSwap = () => {
    setLegendOrder((prev) => {
      if (prev.length < 2) return prev;
      const i = Math.floor(Math.random() * (prev.length - 1));
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1]!, next[i]!];
      return next;
    });
  };

  return (
    <View
      style={{
        backgroundColor: T.card,
        borderRadius: 28,
        padding: 20,
        paddingBottom: 18,
        overflow: "hidden",
        shadowColor: S.ink,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.3,
        shadowRadius: 36,
        elevation: 6,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 23,
              fontWeight: "800",
              color: T.primaryText,
              letterSpacing: -0.5,
            }}
          >
            {monthLong(month + 1)}
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: T.secondaryText,
              letterSpacing: 1.5,
              marginTop: 4,
            }}
          >
            {year} · {municipality.toUpperCase()}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <CircBtn size={34} bg={T.chevronBg} shadow={false} onPress={prevMonth}>
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <ChevRIcon color={T.chevronInk} size={13} />
            </View>
          </CircBtn>
          <CircBtn size={34} bg={T.chevronBg} shadow={false} onPress={nextMonth}>
            <ChevRIcon color={T.chevronInk} size={13} />
          </CircBtn>
        </View>
      </View>

      {/* Swipeable area — weekday headers + day grid slide together */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        {/* Weekday headers */}
        <View style={{ flexDirection: "row", marginBottom: 6 }}>
          {WEEKDAY_INDEX.map((dayIdx, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 0.3,
                  color: T.secondaryText,
                }}
              >
                {weekdayMin(dayIdx)}
              </Text>
            </View>
          ))}
        </View>

        {/* Day grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <View key={`empty-${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
          const dayMarks = markMap[d] || [];
          const primary = dayMarks[0];
          const isToday = isCurrentMonth && d === today;

          return (
            <Pressable
              key={d}
              onPress={() => onDayPress?.(d, month, year)}
              style={{
                width: `${100 / 7}%`,
                aspectRatio: 1,
                padding: 2,
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 11,
                  overflow: "hidden",
                  flexDirection: "row",
                  backgroundColor: isToday ? T.todayBg : T.dayEmptyBg,
                }}
              >
                {/* Split background: one segment per collection on this day */}
                {!isToday && dayMarks.map((s) => (
                  <View
                    key={s}
                    style={{
                      flex: 1,
                      backgroundColor: ST[s].soft,
                    }}
                  />
                ))}

                {/* Day number, centered over the (split) background */}
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: isToday ? "800" : "600",
                      color: isToday
                        ? T.todayText
                        : primary
                        ? ST[primary].ink
                        : T.dayEmptyText,
                    }}
                  >
                    {d}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
        </View>
      </Animated.View>

      {/* Legend */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 14,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: T.legendBorder,
        }}
      >
        {legendOrder.map((id) => (
          <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                backgroundColor: ST[id].c,
              }}
            />
            <Text style={{ fontSize: 11, color: T.legendText, fontWeight: "600" }}>
              {wasteLabel(id)}
            </Text>
          </View>
        ))}
      </View>

      {/* Recyclops — lives at the bottom-right of the card. Wanders along
          the bottom, idles, and occasionally turns his back to shuffle a
          legend label (handleRecyclopsSwap). pointerEvents on the
          wrapper avoid swallowing taps for the day cells. */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          right: 6,
          bottom: -6,
        }}
      >
        <Recyclops
          size={54}
          walkRange={130}
          onRequestSwap={handleRecyclopsSwap}
          onPress={() => {}}
        />
      </View>
    </View>
  );
}
