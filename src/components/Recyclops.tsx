// Recyclops — the app's mascot (the team calls him Basti). Lives inside
// the calendar card, idles, does little tricks, talks, and every so often
// walks over to the legend, turns around (tushie!) and puts a hand on each
// of two colour labels to swap them.
//
// He's a rig, not a flat drawing: body, arms, legs, eye, lid, brow, mouth
// and the leaf on his head are separate parts computed from a pose
// (./recyclops/rig.ts) and redrawn every frame on the UI thread with
// Reanimated. Breathing, walk steps, arm swing, mouth flaps while talking
// and the leaf's spring all run in one frame callback; everything else
// is tweened by a single routine that does one thing at a time:
//   idle beat (sometimes a glance) → trick | talk | wander → idle → …
// Never the same action twice in a row; he only talks at home, facing you.
//
// The parent supplies:
//   • `planSwap` — asked before each wander: where to stand, how high to
//     reach, and the swap to run when his hands touch (CalendarMonth swaps
//     two legend labels there)
//   • `walkRange` — how far left he can roam, in px (0 keeps him at home)
//   • `antics` — lets him use that room for bigger bits: strolls, a
//     moonwalk, tripping over nothing, and leaving the screen on the right
//     to come back in from the left (Home turns this on)
//   • `onPress` — tap handler; he also does a happy hop

import { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type EasingFunction,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import { ST_STATIC } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { useT } from "../context/LocaleContext";
import { t as translate, type StringKey } from "../i18n";
import { REST_POSE, rig, type Pose, type Rig } from "./recyclops/rig";
import { FONT } from "../theme/type";

const APath = Animated.createAnimatedComponent(Path);
const ACircle = Animated.createAnimatedComponent(Circle);
const AEllipse = Animated.createAnimatedComponent(Ellipse);
const AG = Animated.createAnimatedComponent(G);

// Stuff Recyclops occasionally pipes up with, shown in a speech bubble
// above his head. Mood is mixed: grumpy/passive-aggressive about your
// recycling habits, weird and surreal asides, occasionally chipper, a
// healthy dose of fourth-wall-break. Keep them short (fits the bubble),
// punchy, and varied so consecutive picks don't feel samey.
//
// Entries are string keys (English copy in src/i18n/locales/en.ts); the
// bubble translates at render so a language switch updates it.
//
// The picker downweights recent lines — see RECENT_HISTORY_LEN below.
const RECYCLOPS_LINES: StringKey[] = [
  // ── Grumpy / passive-aggressive ──────────────────────────────────
  "recyclops.line_01",
  "recyclops.line_02",
  "recyclops.line_03",
  "recyclops.line_04",
  "recyclops.line_05",
  "recyclops.line_06",
  "recyclops.line_07",
  "recyclops.line_08",
  "recyclops.line_09",
  "recyclops.line_10",
  "recyclops.line_11",
  "recyclops.line_12",
  "recyclops.line_13",
  "recyclops.line_14",
  "recyclops.line_15",
  "recyclops.line_16",
  "recyclops.line_17",
  "recyclops.line_18",
  // ── Weird / surreal / quirky ─────────────────────────────────────
  "recyclops.line_19",
  "recyclops.line_20",
  "recyclops.line_21",
  "recyclops.line_22",
  "recyclops.line_23",
  "recyclops.line_24",
  "recyclops.line_25",
  "recyclops.line_26",
  "recyclops.line_27",
  "recyclops.line_28",
  "recyclops.line_29",
  "recyclops.line_30",
  "recyclops.line_31",
  "recyclops.line_32",
  "recyclops.line_33",
  "recyclops.line_34",
  "recyclops.line_35",
  // ── Cheerful but unexpected ──────────────────────────────────────
  "recyclops.line_36",
  "recyclops.line_37",
  "recyclops.line_38",
  "recyclops.line_39",
  "recyclops.line_40",
  "recyclops.line_41",
  "recyclops.line_42",
  "recyclops.line_43",
  // ── Meta / self-aware / fourth-wall ──────────────────────────────
  "recyclops.line_44",
  "recyclops.line_45",
  "recyclops.line_46",
  "recyclops.line_47",
  "recyclops.line_48",
  "recyclops.line_49",
  "recyclops.line_50",
  "recyclops.line_51",
  "recyclops.line_52",
  "recyclops.line_53",
  "recyclops.line_54",
  // ── Dark-humor / suspicious ──────────────────────────────────────
  "recyclops.line_55",
  "recyclops.line_56",
  "recyclops.line_57",
  "recyclops.line_58",
];

// How many of the most-recent lines to avoid re-picking. Prevents the
// "you just said that two seconds ago" feeling without needing a full
// shuffle deck.
const RECENT_HISTORY_LEN = 8;

// Wide bubble — covers about half the screen so longer lines fit
// comfortably. Right-anchored to Recyclops's wrapper so it can only
// grow leftward (never spills past his right edge → never out of
// bounds, even on narrow phones).
const BUBBLE_WIDTH = Math.round(Dimensions.get("window").width * 0.5);

// He keeps his own colours in both modes; on dark he stands on his pastel
// body, and the outline stays his dark green ink.
const BODY = ST_STATIC.gruengut.c;
const INK = ST_STATIC.gruengut.ink;
// On a dark background his dark-green limbs would vanish, so in dark mode
// they take a mid green that reads against the plum surfaces.
const LIMB_ON_DARK = "#7FA864";
const BELLY = "#C9DDB5";
const LEAF = "#7FB069";
const CHEEK = "rgba(232,128,120,0.45)";
const TAU = Math.PI * 2;

// Speech bubble: an ink bubble, so it reads against the white calendar card.
// The tail slides along the bottom edge to stay over his head as he walks.
function SpeechBubble({ text, tailStyle }: { text: string; tailStyle: object }) {
  const { S } = useTheme();
  return (
    <View style={{ width: BUBBLE_WIDTH }}>
      <View
        style={{
          alignSelf: "stretch",
          backgroundColor: S.ink,
          paddingHorizontal: 13,
          paddingVertical: 10,
          borderRadius: 14,
        }}
      >
        <Text
          style={{
            color: S.onInk,
            fontSize: 10.5,
            fontFamily: FONT.w700,
            lineHeight: 14,
            textAlign: "center",
            letterSpacing: -0.1,
          }}
        >
          {text}
        </Text>
      </View>
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: -7,
            right: 0,
            width: 0,
            height: 0,
            borderLeftWidth: 7,
            borderRightWidth: 7,
            borderTopWidth: 8,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: S.ink,
          },
          tailStyle,
        ]}
      />
    </View>
  );
}

/** Where to go and what to do there, decided by the parent. */
export interface SwapPlan {
  /** Horizontal offset (px) from his home spot to stand at; negative = left. */
  dx: number;
  /** Height (px, from the top of his box at home) his hands should be at. */
  reachY: number;
  /** Runs the moment his hands touch, e.g. swaps the two labels. */
  commit: () => void;
}

interface Props {
  size?: number;
  /** Tap handler — he also does a happy hop. */
  onPress?: () => void;
  /** Asked before each wander: where the two things to swap are. Returning
   *  null skips the wander (nothing measurable to swap yet). */
  planSwap?: () => SwapPlan | null;
  /** How far left (px) he may wander from home. 0 keeps him stationary. */
  walkRange?: number;
  /** Bigger bits that use `walkRange`: strolls, moonwalk, tripping, and
   *  walking off-screen and back. Needs room to his left and right. */
  antics?: boolean;
}

// Rig geometry (viewBox units; see recyclops/rig.ts): shoulders sit at
// y≈55.7 and arms are 21 long; the viewBox starts at y = -8.
const SHOULDER_Y = 55.7;
const ARM_LEN = 21;
const VIEWBOX_TOP = -8;
const RAISED_ARM = 165;

type PoseValues = { [K in keyof Pose]: SharedValue<number> };
const POSE_KEYS = Object.keys(REST_POSE) as (keyof Pose)[];

function usePoseValues(): PoseValues {
  const values = {} as PoseValues;
  // Fixed key list, so the hook order never changes between renders.
  for (const k of POSE_KEYS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    values[k] = useSharedValue(REST_POSE[k]);
  }
  return values;
}

type PathPart = "body" | "belly" | "armL" | "armR" | "legL" | "legR" | "upperLid" | "happyEye" | "brow" | "mouth" | "leafStem" | "leafBlade" | "tushSeam";
type PointPart = "handL" | "handR" | "footL" | "footR" | "pupil" | "shine" | "cheekL" | "cheekR" | "tushL" | "tushR";

function usePathProps(R: SharedValue<Rig>, part: PathPart) {
  return useAnimatedProps(() => ({ d: R.value[part] || "M 0 0" }));
}
function usePointProps(R: SharedValue<Rig>, part: PointPart) {
  return useAnimatedProps(() => ({ cx: R.value[part].cx, cy: R.value[part].cy }));
}

export function Recyclops({ size = 76, onPress, planSwap, walkRange = 60, antics = false }: Props) {
  const { t } = useT();
  const { isDark } = useTheme();
  const limb = isDark ? LIMB_ON_DARK : INK;
  const P = usePoseValues();
  // People who ask the system for less motion get a calm, blinking mascot.
  const reduceMotion = useReducedMotion();

  // Whole-body motion (px / degrees), applied to the wrapping view.
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const lean = useSharedValue(0);
  const turnX = useSharedValue(1);
  const back = useSharedValue(0);
  const bob = useSharedValue(0);

  // Drivers read by the frame callback.
  const walking = useSharedValue(0);
  const walkDir = useSharedValue(0);
  const armsBusy = useSharedValue(0);
  const talking = useSharedValue(0);
  const leafVel = useSharedValue(0);

  const bubbleOpacity = useSharedValue(0);
  const bubbleScale = useSharedValue(0.7);
  const [bubbleMsg, setBubbleMsg] = useState<StringKey | null>(null);

  // Read through a ref so the parent's fresh inline callback each render
  // doesn't restart the routine mid-walk.
  const planSwapRef = useRef(planSwap);
  planSwapRef.current = planSwap;

  // ── Continuous motion, every frame on the UI thread ──────────────────
  useFrameCallback((frame) => {
    const now = frame.timestamp;
    const k = Math.min(3, (frame.timeSincePreviousFrame ?? 16.7) / 16.7);

    P.breathe.value = (Math.sin(now / 900) + 1) / 2;

    const walk = walking.value;
    if (walk > 0) P.stepPhase.value = (now / 520) % 1;
    P.stepAmt.value = walk;
    // Arms swing opposite the legs, unless an action is using them.
    if (walk > 0 && armsBusy.value === 0) {
      const swing = Math.sin(P.stepPhase.value * TAU) * 22 * walk;
      P.armL.value = 18 + swing;
      P.armR.value = 18 - swing;
    }
    bob.value = -walk * Math.abs(Math.sin(P.stepPhase.value * TAU)) * 1.6;

    if (talking.value > 0) {
      P.mouthOpen.value = (0.35 + 0.35 * Math.sin(now / 70) * Math.sin(now / 173)) * talking.value;
    }

    // The leaf trails behind: a damped spring toward an angle set by the
    // lean, the walk and squash/stretch.
    const target = -lean.value * 1.6 - walkDir.value * walk * 14 - (P.squash.value - 1) * 60;
    leafVel.value = (leafVel.value + (target - P.leaf.value) * 0.12 * k) * Math.pow(0.82, k);
    P.leaf.value += leafVel.value * k;
  });

  const R = useDerivedValue<Rig>(() => {
    const pose = {} as Pose;
    for (const key of POSE_KEYS) pose[key] = P[key].value;
    return rig(pose);
  });

  const body = usePathProps(R, "body");
  const belly = usePathProps(R, "belly");
  const armL = usePathProps(R, "armL");
  const armR = usePathProps(R, "armR");
  const legL = usePathProps(R, "legL");
  const legR = usePathProps(R, "legR");
  const upperLid = usePathProps(R, "upperLid");
  const happyEyePath = usePathProps(R, "happyEye");
  const brow = usePathProps(R, "brow");
  const mouth = usePathProps(R, "mouth");
  const leafStem = usePathProps(R, "leafStem");
  const leafBlade = usePathProps(R, "leafBlade");
  const tushSeam = usePathProps(R, "tushSeam");
  const handL = usePointProps(R, "handL");
  const handR = usePointProps(R, "handR");
  const footL = usePointProps(R, "footL");
  const footR = usePointProps(R, "footR");
  const pupil = usePointProps(R, "pupil");
  const shine = usePointProps(R, "shine");
  const cheekL = usePointProps(R, "cheekL");
  const cheekR = usePointProps(R, "cheekR");
  const tushL = usePointProps(R, "tushL");
  const tushR = usePointProps(R, "tushR");
  const eye = useAnimatedProps(() => ({ cx: R.value.eye.cx, cy: R.value.eye.cy }));
  const happyEye = useAnimatedProps(() => ({
    opacity: Math.max(0, Math.min(1, (P.happy.value - 0.5) * 3)),
  }));
  const frontSide = useAnimatedProps(() => ({ opacity: back.value > 0.5 ? 0 : 1 }));
  const backSide = useAnimatedProps(() => ({ opacity: back.value > 0.5 ? 1 : 0 }));

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value + bob.value },
      { rotate: `${lean.value}deg` },
      { scaleX: turnX.value },
    ],
  }));
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{ scale: bubbleScale.value }],
  }));
  // Tail centre sits (size/2 - x) from the bubble's right edge; clamped
  // so it never slides off the bubble.
  const tailStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.max(-(BUBBLE_WIDTH - 14), Math.min(0, x.value - (size / 2 - 7))) },
    ],
  }));

  // ── The routine ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = setTimeout(() => {
          timers.delete(id);
          resolve();
        }, ms);
        timers.add(id);
      });
    const between = (min: number, max: number) => min + Math.random() * (max - min);
    const all = (...steps: Promise<void>[]) => Promise.all(steps).then(() => {});

    const EASE = Easing.inOut(Easing.quad);
    /** Tween a value and resolve when it's done. */
    const to = (sv: SharedValue<number>, value: number, ms: number, easing: EasingFunction = EASE) => {
      sv.value = withTiming(value, { duration: ms, easing });
      return wait(ms);
    };
    const settle = Easing.out(Easing.back(1.6));

    // Blinks run on their own, but skip while the lid is already in use.
    const blinkLoop = async () => {
      while (!cancelled) {
        await wait(between(2400, 4400));
        if (cancelled || P.lid.value > 0.05 || P.happy.value > 0.05) continue;
        await to(P.lid, 1, 70);
        await to(P.lid, 0, 110);
      }
    };
    blinkLoop();

    // ── Moves ─────────────────────────────────────────────────────────
    const walkTo = async (toX: number) => {
      const dir = Math.sign(toX - x.value);
      if (dir === 0) return;
      walkDir.value = dir;
      await all(to(P.lookX, dir, 200), to(lean, dir * 4, 250));
      walking.value = 1;
      await to(x, toX, Math.abs(toX - x.value) * 9 + 300);
      walking.value = 0;
      walkDir.value = 0;
      await all(to(lean, 0, 300, settle), to(P.armL, 18, 220), to(P.armR, 18, 220), to(P.lookX, 0, 300));
    };

    const hop = async (height: number) => {
      await to(P.squash, 0.84, 140, Easing.out(Easing.cubic)); // anticipation
      await all(
        to(P.squash, 1.12, 140),
        to(y, -height, 220, Easing.out(Easing.quad)),
        to(P.armL, 70, 200),
        to(P.armR, 70, 200),
      );
      await all(to(P.squash, 1, 120), to(y, 0, 220, Easing.in(Easing.quad)));
      await all(to(P.squash, 0.82, 90, Easing.out(Easing.quad)), to(P.armL, 18, 250), to(P.armR, 18, 250)); // land
      await to(P.squash, 1, 260, settle);
    };

    const turn = async (toBack: boolean) => {
      await all(to(turnX, 0.08, 180, Easing.in(Easing.cubic)), to(y, -5, 180, Easing.out(Easing.quad)));
      if (cancelled) return;
      back.value = toBack ? 1 : 0;
      await all(to(turnX, 1, 220, Easing.out(Easing.cubic)), to(y, 0, 220, Easing.in(Easing.quad)));
    };

    const lookCenter = () => all(to(P.lookX, 0, 300), to(P.lookY, 0, 300));

    // ── Actions ───────────────────────────────────────────────────────
    const idle = async () => {
      const ms = between(1400, 2800);
      if (Math.random() < 0.6) {
        await wait(ms * 0.3);
        if (cancelled) return;
        await all(to(P.lookX, between(-1, 1), 380), to(P.lookY, between(-0.8, 0.6), 380));
        await wait(between(500, 900));
        if (cancelled) return;
        await lookCenter();
        await wait(Math.max(0, ms * 0.7 - 1200));
      } else {
        await wait(ms);
      }
    };

    const happyHop = async () => {
      await all(to(P.happy, 1, 160), to(P.smile, 1, 160), to(P.browUp, 0.6, 160));
      await hop(Math.max(8, size * 0.24));
      await all(to(P.happy, 0, 260), to(P.smile, 0.5, 260), to(P.browUp, 0, 260));
    };

    const wiggle = async () => {
      for (const deg of [8, -8, 6, 0]) await to(lean, deg, 200);
    };

    const yawn = async () => {
      await all(
        to(P.squash, 1.1, 500), to(P.lid, 0.6, 500), to(P.mouthOpen, 1, 500), to(P.smile, 0, 500),
        to(P.browUp, -0.3, 500), to(P.armL, 60, 500), to(P.armR, 60, 500),
      );
      await wait(400);
      await all(
        to(P.squash, 1, 500), to(P.lid, 0, 400), to(P.mouthOpen, 0, 400), to(P.smile, 0.5, 400),
        to(P.browUp, 0, 400), to(P.armL, 18, 500), to(P.armR, 18, 500),
      );
    };

    const wave = async () => {
      armsBusy.value = 1;
      await all(to(P.armR, 150, 260, Easing.out(Easing.cubic)), to(P.happy, 0.7, 200), to(P.smile, 1, 200));
      for (let i = 0; i < 3 && !cancelled; i++) {
        await to(P.armR, 120, 160);
        await to(P.armR, 155, 160);
      }
      await all(to(P.armR, 18, 300), to(P.happy, 0, 300), to(P.smile, 0.5, 300));
      armsBusy.value = 0;
    };

    const doubleBlink = async () => {
      for (let i = 0; i < 2; i++) {
        await to(P.lid, 1, 70);
        await to(P.lid, 0, 90);
        await wait(120);
      }
    };

    const tricks: (() => Promise<void>)[] = [happyHop, wiggle, yawn, wave, doubleBlink];
    let lastTrick = -1;
    const trick = async () => {
      let i = Math.floor(Math.random() * tricks.length);
      if (i === lastTrick) i = (i + 1) % tricks.length;
      lastTrick = i;
      await tricks[i]!();
    };

    const recentIdxs: number[] = [];
    const pickLine = () => {
      let idx = Math.floor(Math.random() * RECYCLOPS_LINES.length);
      for (let i = 0; i < 12 && recentIdxs.includes(idx); i++) {
        idx = Math.floor(Math.random() * RECYCLOPS_LINES.length);
      }
      recentIdxs.push(idx);
      if (recentIdxs.length > RECENT_HISTORY_LEN) recentIdxs.shift();
      return RECYCLOPS_LINES[idx]!;
    };

    /** Show a line in the bubble; `mouth` moves his mouth while it's up. */
    const say = async (line: StringKey, ms?: number, mouth = true) => {
      setBubbleMsg(line);
      bubbleScale.value = 0.7;
      bubbleOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
      bubbleScale.value = withSpring(1, { damping: 8, stiffness: 170 });
      if (mouth) talking.value = 1;
      await wait(ms ?? Math.min(4200, 1700 + translate(line).length * 55));
      talking.value = 0;
      bubbleOpacity.value = withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) });
      bubbleScale.value = withTiming(0.75, { duration: 240 });
      await to(P.mouthOpen, 0, 150);
      if (!cancelled) setBubbleMsg(null);
    };

    // Only called at home, facing front: he looks up at the bubble while
    // he talks.
    const talk = async () => {
      await all(to(P.browUp, 0.5, 220), to(P.lookY, -0.6, 220), to(P.lookX, -0.4, 220));
      if (cancelled) return;
      await say(pickLine());
      await all(to(P.browUp, 0, 300), lookCenter());
    };

    // ── More tricks ───────────────────────────────────────────────────
    /** Two quick spins on the spot (front, back, front, back, front). */
    const pirouette = async () => {
      await all(to(P.happy, 0.8, 160), to(P.armL, 70, 200), to(P.armR, 70, 200));
      for (let i = 0; i < 2 && !cancelled; i++) {
        await turn(true);
        await turn(false);
      }
      await all(to(P.happy, 0, 260), to(P.armL, 18, 260), to(P.armR, 18, 260));
    };

    /** Arms up in turns, a bounce on every beat. */
    const dance = async () => {
      armsBusy.value = 1;
      await all(to(P.happy, 1, 160), to(P.smile, 1, 160));
      for (let i = 0; i < 6 && !cancelled; i++) {
        const left = i % 2 === 0;
        await all(
          to(P.armL, left ? 150 : 30, 180),
          to(P.armR, left ? 30 : 150, 180),
          to(lean, left ? -7 : 7, 180),
          to(y, -size * 0.08, 90, Easing.out(Easing.quad)).then(() => to(y, 0, 90, Easing.in(Easing.quad))),
        );
      }
      await all(to(P.armL, 18, 260), to(P.armR, 18, 260), to(lean, 0, 260), to(P.happy, 0, 260), to(P.smile, 0.5, 260));
      armsBusy.value = 0;
    };

    /** Ah… ah… ACHOO. The leaf takes the hit. */
    const sneeze = async () => {
      for (let i = 0; i < 2 && !cancelled; i++) {
        await all(to(P.lid, 0.55, 380), to(P.browUp, 0.7, 380), to(P.mouthOpen, 0.35, 380), to(lean, -5 - i * 3, 380));
        await wait(160);
      }
      if (cancelled) return;
      leafVel.value += 40;
      await all(
        to(lean, 12, 110, Easing.out(Easing.cubic)),
        to(P.squash, 0.84, 110),
        to(P.lid, 1, 90),
        to(P.mouthOpen, 1, 90),
      );
      say("recyclops.say_achoo", 900, false);
      await all(to(lean, 0, 420, settle), to(P.squash, 1, 420, settle), to(P.mouthOpen, 0, 300), to(P.browUp, 0, 300));
      await to(P.lid, 0, 200);
      await wait(700);
    };

    /** Nods off, snores, wakes with a start. */
    const nap = async () => {
      await all(to(P.lid, 1, 900), to(lean, 5, 900), to(P.browUp, -0.4, 900), to(P.armL, 8, 900), to(P.armR, 8, 900));
      if (cancelled) return;
      await say("recyclops.say_zzz", 2400, false);
      if (cancelled) return;
      await all(to(P.lid, 0, 90), to(P.browUp, 1, 90), to(lean, 0, 200, settle));
      await hop(Math.max(6, size * 0.14));
      await all(to(P.lookX, -1, 150), to(P.armL, 18, 200), to(P.armR, 18, 200));
      await to(P.lookX, 1, 220);
      await all(lookCenter(), to(P.browUp, 0, 300));
    };

    tricks.push(pirouette, dance, sneeze, nap);

    // Arm angle (degrees from straight down) that puts his hands at
    // `reachY` px from the top of his box. Arms stay between "out and a
    // little down" and "straight up"; whatever they can't cover he makes
    // up with his body: a small crouch for low labels, tiptoe for high ones.
    const aimArms = (reachY: number) => {
      const scale = size / 100;
      const targetY = reachY / scale + VIEWBOX_TOP; // viewBox units
      const MIN_ARM = 55;
      const cos = Math.max(-1, Math.min(1, (targetY - SHOULDER_Y) / ARM_LEN));
      const angle = Math.max(MIN_ARM, Math.min(RAISED_ARM, (Math.acos(cos) * 180) / Math.PI));
      const handY = SHOULDER_Y + Math.cos((angle * Math.PI) / 180) * ARM_LEN;
      // Positive = move down (crouch), negative = up (tiptoe).
      const shift = (targetY - handY) * scale;
      return { angle, shift: Math.max(-size * 0.33, Math.min(size * 0.15, shift)) };
    };

    // Walk to the spot between the two labels the parent picked, turn to
    // face them, put a hand on each and swap them, then go home.
    const wander = async () => {
      const plan = planSwapRef.current?.();
      if (!plan) return trick();
      const dx = Math.max(-walkRange, Math.min(0, plan.dx));
      await walkTo(dx);
      if (cancelled) return;
      await wait(200);
      await turn(true);
      if (cancelled) return;
      const { angle, shift } = aimArms(plan.reachY);
      armsBusy.value = 1;
      await all(
        to(P.armL, angle, 320, settle),
        to(P.armR, angle, 320, settle),
        to(y, shift, 320, Easing.out(Easing.quad)),
        // Stretch when rising on tiptoe, squash a little when crouching.
        to(P.squash, shift < -1 ? 1.08 : shift > 1 ? 0.92 : 1, 320),
      );
      if (cancelled) return;
      // Hands on the labels: they trade places under his palms.
      plan.commit();
      for (let i = 0; i < 2 && !cancelled; i++) {
        await all(to(P.armL, angle - 8, 160), to(P.armR, angle + 6, 160));
        await all(to(P.armL, angle + 6, 160), to(P.armR, angle - 8, 160));
      }
      await all(to(P.armL, 18, 280), to(P.armR, 18, 280), to(y, 0, 280, Easing.in(Easing.quad)), to(P.squash, 1, 280));
      armsBusy.value = 0;
      if (cancelled) return;
      await turn(false);
      if (cancelled) return;
      await walkTo(0);
    };

    // ── Antics (only with room to move) ────────────────────────────────
    /** Walk somewhere to his left, have a look around, maybe a trick, back. */
    const stroll = async () => {
      await walkTo(-between(0.35, 1) * walkRange);
      if (cancelled) return;
      await idle();
      if (cancelled) return;
      if (Math.random() < 0.5) await trick();
      if (cancelled) return;
      await walkTo(0);
    };

    /** Slides left while facing right. Smooth. */
    const moonwalk = async () => {
      const toX = -between(0.5, 0.9) * walkRange;
      walkDir.value = 1;
      await all(to(P.lookX, 1, 200), to(lean, -3, 250), to(P.smile, 1, 200));
      walking.value = 1;
      await to(x, toX, Math.abs(toX) * 13 + 400, Easing.linear);
      walking.value = 0;
      walkDir.value = 0;
      await all(to(lean, 0, 300, settle), to(P.armL, 18, 220), to(P.armR, 18, 220));
      if (cancelled) return;
      await say("recyclops.say_smooth", 1300);
      if (cancelled) return;
      await all(to(P.smile, 0.5, 200), to(P.lookX, 0, 200));
      await walkTo(0);
    };

    /** Trips over nothing on the way somewhere, lies there, gets up. */
    const trip = async () => {
      const toX = -between(0.4, 0.8) * walkRange;
      walkDir.value = -1;
      await all(to(P.lookX, -1, 200), to(lean, -4, 250));
      walking.value = 1;
      await to(x, toX * 0.6, Math.abs(toX * 0.6) * 9 + 200);
      walking.value = 0;
      walkDir.value = 0;
      if (cancelled) return;
      // Down he goes, nose first.
      armsBusy.value = 1;
      await all(
        to(lean, -82, 300, Easing.in(Easing.quad)),
        to(P.armL, 160, 260),
        to(P.armR, 160, 260),
        to(P.browUp, 1, 200),
        to(P.mouthOpen, 0.8, 200),
      );
      leafVel.value -= 30;
      await all(to(P.squash, 0.9, 120), to(P.lid, 1, 120));
      await wait(900);
      if (cancelled) return;
      await all(to(lean, 0, 520, settle), to(P.squash, 1, 400), to(P.armL, 18, 400), to(P.armR, 18, 400), to(P.mouthOpen, 0, 300), to(P.lid, 0, 300));
      armsBusy.value = 0;
      await all(to(P.browUp, -0.4, 200), to(P.lookX, 0, 200));
      if (cancelled) return;
      await say("recyclops.say_meant");
      await to(P.browUp, 0, 200);
      await walkTo(0);
    };

    /** Off the right edge of the screen, and back in from the left. */
    const exitStage = async () => {
      await walkTo(size + 60);
      if (cancelled) return;
      await wait(between(1200, 2600));
      if (cancelled) return;
      x.value = -(walkRange + size + 60);
      await walkTo(0);
      if (cancelled) return;
      await say("recyclops.say_back");
    };

    type Action = "trick" | "talk" | "wander" | "stroll" | "moonwalk" | "trip" | "exitStage";
    const ACTIONS: Record<Action, () => Promise<void>> = { trick, talk, wander, stroll, moonwalk, trip, exitStage };
    const roam = antics && walkRange > size;
    const WEIGHTS: [Action, number][] = [
      ["wander", walkRange > 0 && planSwapRef.current ? 4 : 0],
      ["talk", 3],
      ["trick", 3],
      ["stroll", roam ? 3 : 0],
      ["moonwalk", roam ? 1 : 0],
      ["trip", roam ? 1 : 0],
      ["exitStage", roam ? 1 : 0],
    ];
    // Opens with something that shows what he does: the swap where there
    // is one, a stroll on Home, and a line.
    const opening: Action[] = planSwapRef.current && walkRange > 0 ? ["wander", "talk"] : roam ? ["talk", "stroll"] : ["talk"];
    let last: Action | null = null;
    const next = (): Action => {
      const scripted = opening.shift();
      if (scripted) return scripted;
      const options = WEIGHTS.filter(([a, w]) => w > 0 && a !== last);
      const total = options.reduce((sum, [, w]) => sum + w, 0);
      let r = Math.random() * total;
      for (const [a, w] of options) {
        if ((r -= w) < 0) return a;
      }
      return options[0]![0];
    };

    if (reduceMotion) {
      return () => {
        cancelled = true;
        timers.forEach((id) => clearTimeout(id));
      };
    }

    (async () => {
      while (!cancelled) {
        await idle();
        if (cancelled) return;
        last = next();
        await ACTIONS[last]();
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach((id) => clearTimeout(id));
    };
    // Shared values are stable; only walkRange/size should restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkRange, size, reduceMotion, antics]);

  const handlePress = () => {
    onPress?.();
    // A quick happy hop on top of whatever he's doing.
    const h = Math.max(10, size * 0.3);
    P.happy.value = withTiming(1, { duration: 120 });
    P.squash.value = withTiming(0.85, { duration: 110 }, () => {
      P.squash.value = withSpring(1, { damping: 6, stiffness: 180 });
    });
    y.value = withTiming(-h, { duration: 200, easing: Easing.out(Easing.cubic) }, () => {
      y.value = withSpring(0, { damping: 6, stiffness: 180 });
      P.happy.value = withTiming(0, { duration: 500 });
    });
  };

  const height = Math.round(size * 1.08);

  return (
    <View style={{ alignItems: "center" }}>
      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", right: 0, bottom: height - 4 }, bubbleStyle]}
      >
        {bubbleMsg ? <SpeechBubble text={t(bubbleMsg)} tailStyle={tailStyle} /> : null}
      </Animated.View>
      <View>
        <Animated.View style={[{ transformOrigin: "50% 95%" }, bodyStyle]}>
          <Svg width={size} height={height} viewBox="0 -8 100 108" style={{ overflow: "visible" }}>
            <Ellipse cx={50} cy={97} rx={26} ry={2.6} fill="rgba(0,0,0,0.14)" />

            {/* Legs and feet */}
            <APath animatedProps={legL} stroke={limb} strokeWidth={9.5} strokeLinecap="round" />
            <APath animatedProps={legR} stroke={limb} strokeWidth={9.5} strokeLinecap="round" />
            <APath animatedProps={legL} stroke={BODY} strokeWidth={6.5} strokeLinecap="round" />
            <APath animatedProps={legR} stroke={BODY} strokeWidth={6.5} strokeLinecap="round" />
            <AEllipse animatedProps={footL} rx={7.5} ry={3.4} fill={limb} />
            <AEllipse animatedProps={footR} rx={7.5} ry={3.4} fill={limb} />

            {/* Arms, behind the body so the shoulders tuck in */}
            <APath animatedProps={armL} stroke={limb} strokeWidth={11} strokeLinecap="round" />
            <APath animatedProps={armR} stroke={limb} strokeWidth={11} strokeLinecap="round" />
            <APath animatedProps={armL} stroke={BODY} strokeWidth={8} strokeLinecap="round" />
            <APath animatedProps={armR} stroke={BODY} strokeWidth={8} strokeLinecap="round" />
            <ACircle animatedProps={handL} r={5.8} fill={BODY} stroke={INK} strokeWidth={1.6} />
            <ACircle animatedProps={handR} r={5.8} fill={BODY} stroke={INK} strokeWidth={1.6} />

            {/* Leaf */}
            <APath animatedProps={leafStem} stroke={limb} strokeWidth={2.4} fill="none" strokeLinecap="round" />
            <APath animatedProps={leafBlade} fill={LEAF} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />

            <APath animatedProps={body} fill={BODY} stroke={INK} strokeWidth={2.2} />

            {/* Front: belly and face */}
            <AG animatedProps={frontSide}>
              <APath animatedProps={belly} fill={BELLY} />
              <ACircle animatedProps={eye} r={15} fill="#fff" />
              <ACircle animatedProps={pupil} r={7} fill={INK} />
              <ACircle animatedProps={shine} r={2.6} fill="#fff" />
              <APath animatedProps={upperLid} fill={BODY} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
              <ACircle animatedProps={eye} r={15} fill="none" stroke={INK} strokeWidth={2.2} />
              <AG animatedProps={happyEye}>
                <APath animatedProps={happyEyePath} fill="none" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
              </AG>
              <APath animatedProps={brow} fill="none" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
              <AEllipse animatedProps={cheekL} rx={4.2} ry={2.6} fill={CHEEK} />
              <AEllipse animatedProps={cheekR} rx={4.2} ry={2.6} fill={CHEEK} />
              <APath animatedProps={mouth} fill={INK} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
            </AG>

            {/* Back: tushie */}
            <AG animatedProps={backSide}>
              <ACircle animatedProps={tushL} r={9.5} fill={BODY} stroke={INK} strokeWidth={1.6} strokeOpacity={0.35} />
              <ACircle animatedProps={tushR} r={9.5} fill={BODY} stroke={INK} strokeWidth={1.6} strokeOpacity={0.35} />
              <APath animatedProps={tushSeam} stroke={INK} strokeWidth={1.5} strokeLinecap="round" opacity={0.35} />
            </AG>
          </Svg>
        </Animated.View>
        {onPress ? (
          <Pressable
            onPress={handlePress}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            hitSlop={10}
          />
        ) : null}
      </View>
    </View>
  );
}
