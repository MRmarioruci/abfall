import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated, PanResponder, Dimensions, type LayoutRectangle } from "react-native";
import Reanimated, { LinearTransition } from "react-native-reanimated";
import { STREAM_ORDER, type WasteStreamId } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { CircBtn } from "./ui/CircBtn";
import { ChevRIcon } from "./icons/Icons";
import { Recyclops, type SwapPlan } from "./Recyclops";
import { useT } from "../context/LocaleContext";
import { FONT, NUMS, TYPE } from "../theme/type";
import { HAIRLINE, RADIUS } from "../theme/layout";

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
  /** The day shown in the details below (YYYY-MM-DD): ringed. */
  selected?: string;
  /** Recyclops on the card. Off where he already stands elsewhere on the
   *  screen (Home shows him next to the next pickup). */
  mascot?: boolean;
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

// Recyclops' size and where his box sits against the card's bottom-right
// corner (he overhangs the bottom edge a little, as if standing on it).
const RECYCLOPS_SIZE = 54;
const RECYCLOPS_RIGHT = 6;
const RECYCLOPS_BOTTOM_OVERHANG = 6;

export function CalendarMonth({ marks = EMPTY_MARKS, municipality = "", onDayPress, selected, mascot = true }: Props) {
  const { S, ST } = useTheme();
  const { t, monthLong, weekdayMin, weekdayLong, wasteLabel } = useT();
  // A white card with a hairline edge. Pickup days are bold, with a short
  // bar per bin under the number; today is filled in ink.
  const T = {
    card: S.card,
    primaryText: S.ink,
    secondaryText: S.sec,
    legendText: S.sec,
    legendBorder: S.line,
    dayEmptyText: S.sec,
    todayBg: S.ink,
    todayText: S.onInk,
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

  // Where things are, so Recyclops can walk to the exact spot between two
  // labels and put a hand on each. All in the card's coordinates.
  const cardLayout = useRef<LayoutRectangle | null>(null);
  // State too: his walk range depends on it.
  const [cardWidth, setCardWidth] = useState<number | null>(null);
  const legendLayout = useRef<LayoutRectangle | null>(null);
  const chipLayouts = useRef(new Map<WasteStreamId, LayoutRectangle>());
  const legendOrderRef = useRef(legendOrder);
  legendOrderRef.current = legendOrder;

  const planSwap = (): SwapPlan | null => {
    const card = cardLayout.current;
    const row = legendLayout.current;
    if (!card || !row) return null;
    // Neighbouring labels on the same line; a pair split over a line wrap
    // can't be swapped by hand.
    const order = legendOrderRef.current;
    const pairs: [WasteStreamId, WasteStreamId][] = [];
    for (let i = 0; i < order.length - 1; i++) {
      const a = chipLayouts.current.get(order[i]!);
      const b = chipLayouts.current.get(order[i + 1]!);
      if (a && b && Math.abs(a.y - b.y) < 4 && b.x > a.x) pairs.push([order[i]!, order[i + 1]!]);
    }
    // His home: bottom-right corner of the card (see the wrapper below).
    // He only walks left from there, so pairs right of home are out.
    const homeCenterX = card.width - RECYCLOPS_RIGHT - RECYCLOPS_SIZE / 2;
    const homeTop = card.height + RECYCLOPS_BOTTOM_OVERHANG - Math.round(RECYCLOPS_SIZE * 1.08);
    const gapOf = ([idA, idB]: [WasteStreamId, WasteStreamId]) => {
      const a = chipLayouts.current.get(idA)!;
      const b = chipLayouts.current.get(idB)!;
      return row.x + (a.x + a.width + b.x) / 2;
    };
    const reachable = pairs.filter((pair) => gapOf(pair) <= homeCenterX);
    if (reachable.length === 0) return null;
    const pair = reachable[Math.floor(Math.random() * reachable.length)]!;
    const [idA, idB] = pair;
    const a = chipLayouts.current.get(idA)!;
    const gapCenterX = gapOf(pair);
    const labelCenterY = row.y + a.y + a.height / 2;
    return {
      dx: gapCenterX - homeCenterX,
      reachY: labelCenterY - homeTop,
      commit: () =>
        setLegendOrder((prev) => {
          const i = prev.indexOf(idA);
          const j = prev.indexOf(idB);
          if (i < 0 || j < 0) return prev;
          const next = [...prev];
          [next[i], next[j]] = [next[j]!, next[i]!];
          return next;
        }),
    };
  };

  return (
    <View
      onLayout={(e) => {
        cardLayout.current = e.nativeEvent.layout;
        setCardWidth(e.nativeEvent.layout.width);
      }}
      style={{
        backgroundColor: T.card,
        borderRadius: RADIUS.card,
        borderWidth: HAIRLINE,
        borderColor: S.line,
        paddingHorizontal: 12,
        paddingTop: 14,
        paddingBottom: 14,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          paddingHorizontal: 4,
        }}
      >
        <View>
          <Text style={[TYPE.heading, { color: T.primaryText }]}>
            {monthLong(month + 1)}
          </Text>
          <Text style={[TYPE.caption, { color: T.secondaryText, marginTop: 2 }]} numberOfLines={1}>
            {municipality ? `${year} · ${municipality}` : year}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <CircBtn
            size={34}
            onPress={prevMonth}
            accessibilityLabel={monthLong(month === 0 ? 12 : month)}
          >
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <ChevRIcon color={T.primaryText} size={13} />
            </View>
          </CircBtn>
          <CircBtn
            size={34}
            onPress={nextMonth}
            accessibilityLabel={monthLong(month === 11 ? 1 : month + 2)}
          >
            <ChevRIcon color={T.primaryText} size={13} />
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
              <Text style={[TYPE.cap, { color: T.secondaryText }]}>
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
          const isSel =
            !isToday && selected === `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const dateLabel = t("day_edit.date_long", {
            weekday: weekdayLong(new Date(year, month, d).getDay()),
            day: d,
            month: monthLong(month + 1),
            year,
          });
          const a11yLabel = dayMarks.length
            ? `${dateLabel}, ${dayMarks.map((id) => wasteLabel(id)).join(", ")}`
            : dateLabel;

          return (
            <Pressable
              key={d}
              onPress={() => onDayPress?.(d, month, year)}
              accessibilityRole="button"
              accessibilityLabel={a11yLabel}
              accessibilityState={isToday ? { selected: true } : undefined}
              style={({ pressed }) => ({
                width: `${100 / 7}%`,
                aspectRatio: 1,
                padding: 2,
                transform: [{ scale: pressed ? 0.92 : 1 }],
              })}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: RADIUS.well,
                  backgroundColor: isToday ? T.todayBg : "transparent",
                  borderWidth: 1.5,
                  borderColor: isSel ? T.primaryText : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <Text
                  style={[
                    NUMS,
                    {
                      fontSize: 14,
                      lineHeight: 17,
                      fontFamily: isToday || primary ? FONT.w700 : FONT.w500,
                      color: isToday ? T.todayText : primary ? T.primaryText : T.dayEmptyText,
                    },
                  ]}
                >
                  {d}
                </Text>
                {/* One short bar per bin collected that day */}
                <View style={{ flexDirection: "row", gap: 2, height: 3 }}>
                  {dayMarks.slice(0, 3).map((id) => (
                    <View
                      key={id}
                      style={{
                        width: dayMarks.length > 1 ? 6 : 12,
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: ST[id].c,
                      }}
                    />
                  ))}
                </View>
              </View>
            </Pressable>
          );
        })}
        </View>
      </Animated.View>

      {/* Legend */}
      <View
        onLayout={(e) => {
          legendLayout.current = e.nativeEvent.layout;
        }}
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
          rowGap: 8,
          marginTop: 12,
          marginHorizontal: 4,
          paddingTop: 12,
          borderTopWidth: HAIRLINE,
          borderTopColor: T.legendBorder,
        }}
      >
        {legendOrder.map((id) => (
          // Animated layout: when Recyclops swaps two labels they slide
          // past each other instead of jumping.
          <Reanimated.View
            key={id}
            layout={LinearTransition.springify().damping(16).stiffness(140)}
            onLayout={(e) => {
              chipLayouts.current.set(id, e.nativeEvent.layout);
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 2.5,
                backgroundColor: ST[id].c,
              }}
            />
            <Text style={[TYPE.cap, { color: T.legendText }]}>
              {wasteLabel(id)}
            </Text>
          </Reanimated.View>
        ))}
      </View>

      {/* Recyclops — lives at the bottom-right of the card. Wanders along
          the bottom, idles, and occasionally turns his back to shuffle a
          legend label (handleRecyclopsSwap). pointerEvents on the
          wrapper avoid swallowing taps for the day cells. */}
      {mascot && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            right: RECYCLOPS_RIGHT,
            bottom: -RECYCLOPS_BOTTOM_OVERHANG,
          }}
        >
          <Recyclops
            size={RECYCLOPS_SIZE}
            walkRange={Math.max(0, (cardWidth ?? 0) - RECYCLOPS_SIZE)}
            planSwap={planSwap}
            onPress={() => {}}
          />
        </View>
      )}
    </View>
  );
}
