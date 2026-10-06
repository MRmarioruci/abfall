// Recyclops — the app's mascot. Lives inside the calendar card, does
// idle animations, occasionally walks over to the legend and asks the
// parent to swap two color labels. When he turns around to do the
// reorder, you see his cute little tushie.
//
// Behaviors:
//   • Bobbing + look-around + blinking — base idle
//   • Random tricks every 6–12s: wiggle, happy jump, yawn, double-blink
//   • Every ~18–28s: walk to a random spot, turn back (tushie!), do the
//     swap, turn back to front, walk home
//   • Tap → happy bounce on top of whatever else is happening
//
// The parent supplies:
//   • `onRequestSwap` — fired during the back-turned phase so the parent
//     can reorder its own data (e.g. CalendarMonth legend order)
//   • `homeX` — pixel offset from his "home position" (defaults to 0)
//   • `walkRange` — how far left/right he can roam (default 60)

import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Pressable, Text, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import { S, ST } from "../theme/colors";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

// Stuff Recyclops occasionally pipes up with, shown in a speech bubble
// above his head. Mood is mixed: grumpy/passive-aggressive about your
// recycling habits, weird and surreal asides, occasionally chipper, a
// healthy dose of fourth-wall-break. Keep them short (fits the bubble),
// punchy, and varied so consecutive picks don't feel samey.
//
// The picker downweights recent lines — see RECENT_HISTORY_LEN below.
const RECYCLOPS_LINES = [
  // ── Grumpy / passive-aggressive ──────────────────────────────────
  "I saw what you put in the bin. We need to talk.",
  "Was that recyclable in the trash? Was it?",
  "Three weeks. Three WEEKS without rinsing a jar.",
  "I'm not mad. I am, actually. A bit.",
  "Recycling truck came. You weren't ready. AGAIN.",
  "Bin day was yesterday. Where were you, hm?",
  "I sigh. Loudly. So you can hear it.",
  "The landfill is laughing. At you. Right now.",
  "Composting is right there. It's RIGHT THERE.",
  "I waited by the door. You forgot.",
  "I'm watching. With my one eye. Always watching.",
  "You and I are going to have a chat about cardboard.",
  "Plastic in paper again. Wow. Bold choice.",
  "The recycling bin texted me. It misses you.",
  "Don't make me come over there. (I can't. But emotionally.)",
  "I keep a list. You're on it. (Mid-tier.)",
  "Just standing here. Quietly disappointed.",
  "I noticed the takeout box. We're addressing it later.",

  // ── Weird / surreal / quirky ─────────────────────────────────────
  "Yesterday I dreamt I was a cardboard box.",
  "Cardboard is, fundamentally, a state of mind.",
  "Worms write me letters. Long ones.",
  "Sometimes I just stand here. Just… standing.",
  "Have you ever truly LOOKED at a plastic spoon?",
  "Bottles whisper at night. They have opinions.",
  "My therapist is a recycling truck. He's great.",
  "I had a cousin once. She became a paper bag.",
  "I exist in negative-seven dimensions.",
  "What if pizza boxes had little feelings?",
  "Glass thinks it's better than us. It is.",
  "Aluminum is my best friend. Don't tell tin.",
  "I do not remember being assembled.",
  "Banana peel: waste or just napping?",
  "A leaf told me a secret today.",
  "Time is a flat compost heap.",
  "Inside every can is another, smaller can.",

  // ── Cheerful but unexpected ──────────────────────────────────────
  "Look at you. Sorting. LOOK AT YOU.",
  "Today is a tin-foil kind of day.",
  "You recycled? I am thrilled. I am screaming.",
  "Hello! I noticed you. Hi.",
  "Imagine being a glass bottle. The FREEDOM.",
  "Crush a can today. Live deliciously.",
  "Tuesday. Recycling Tuesday. I'm vibrating.",
  "Compost: nature's recycling. Also delicious.",

  // ── Meta / self-aware / fourth-wall ──────────────────────────────
  "I'm a blob with feelings, OK?",
  "One eye, infinite opinions.",
  "Contractually obligated to bob. It's in my contract.",
  "Is anyone reading these. Hello?",
  "Watch me carry plot armor across the calendar.",
  "If you scroll, I follow. It's my curse.",
  "I get paid in compost. Don't ask.",
  "I was rendered yesterday. Feels recent.",
  "I rearrange things when you're not looking.",
  "If you ignore me I keep talking. Be warned.",
  "Tap me. Or don't. I'll judge silently.",

  // ── Dark-humor / suspicious ──────────────────────────────────────
  "Someone in this building isn't sorting. I know who.",
  "The bin sees all.",
  "I keep tabs on every bottle. Every. Single. One.",
  "Don't trust the trash compactor. It's snitching.",
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

// Speech bubble: light-on-dark card so it pops against the dark
// calendar. Tail sits near the bubble's right edge so it points down
// at Recyclops's head — he's anchored to the right side of his parent
// and the bubble grows leftward from there.
function SpeechBubble({
  text,
  tailTranslateX,
}: {
  text: string;
  // Tail moves via transform.translateX (not a layout `right` prop) so
  // the native animated driver can animate it. translateX is a negative
  // distance from the bubble's right edge: 0 = at the right, more
  // negative = further left along the bubble bottom.
  tailTranslateX: number | Animated.AnimatedInterpolation<number>;
}) {
  return (
    <View style={{ width: BUBBLE_WIDTH }}>
      <View
        style={{
          // alignSelf: "stretch" makes absolutely sure the white card
          // fills the wrapper's full BUBBLE_WIDTH, so the Text inside
          // — which has textAlign: "center" — actually centers across
          // the bubble instead of sizing to its own content and clinging
          // to one edge.
          alignSelf: "stretch",
          backgroundColor: "#fff",
          paddingHorizontal: 13,
          paddingVertical: 10,
          borderRadius: 14,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.22,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <Text
          style={{
            color: S.ink,
            fontSize: 10.5,
            fontWeight: "700",
            lineHeight: 14,
            // Center the text so short lines aren't pushed against either
            // edge of the wide bubble. With BUBBLE_WIDTH ≈ 50% of the
            // screen, right- or left-alignment makes short one-liners
            // float far from the visual center.
            textAlign: "center",
            letterSpacing: -0.1,
          }}
        >
          {text}
        </Text>
      </View>
      {/* Downward tail — CSS-triangle technique. Pinned to the right
          edge of the bubble (`right: 0`); horizontal motion is via
          transform.translateX which the native animated driver actually
          supports (unlike the `right` layout prop). */}
      <Animated.View
        style={{
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
          borderTopColor: "#fff",
          transform: [{ translateX: tailTranslateX }],
        }}
      />
    </View>
  );
}

interface Props {
  size?: number;
  /** Tap reaction — purely visual flourish. */
  onPress?: () => void;
  /** Called during the back-turned moment so the parent can rearrange
   *  whatever Recyclops is "fiddling with" off-screen. */
  onRequestSwap?: () => void;
  /** How far horizontally Recyclops will wander from his home position
   *  (in viewport px, both directions). Set to 0 to keep him stationary. */
  walkRange?: number;
}

export function Recyclops({ size = 76, onPress, onRequestSwap, walkRange = 60 }: Props) {
  // Transform-side animation values — driven natively for 60fps.
  const bob = useRef(new Animated.Value(0)).current;
  const jump = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const stretch = useRef(new Animated.Value(1)).current;
  const walkX = useRef(new Animated.Value(0)).current;
  const walkBounce = useRef(new Animated.Value(0)).current;
  // Horizontal squash used to fake a 3D turn: 1 → ~0.1 (thin profile,
  // where we swap the drawing) → 1. Native driver (it's a View scaleX).
  const turnScaleX = useRef(new Animated.Value(1)).current;

  // SVG-prop animation values — JS driver, cheap small SVGs so OK.
  const lookX = useRef(new Animated.Value(50)).current;
  const lookY = useRef(new Animated.Value(42)).current;
  const blink = useRef(new Animated.Value(0)).current;
  // Arm raise — 0 = hanging at rest, 1 = both hands raised. He lifts his
  // hands while turned away (reaching up to fiddle with the labels).
  // Drives an SVG rotation, so JS driver.
  const armRaise = useRef(new Animated.Value(0)).current;

  // Speech bubble — pop-in scale + fade, both native.
  const bubbleOpacity = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(0.7)).current;

  // Front/back state — drives whether you see his eye or his tushie.
  const [facing, setFacing] = useState<"front" | "back">("front");
  // Current line in the speech bubble (null = nothing to say right now).
  const [bubbleMsg, setBubbleMsg] = useState<string | null>(null);

  // Held in a ref so the parent passing a fresh inline callback each
  // render (it does — and firing it re-renders the parent) doesn't tear
  // down and restart the whole animation loop mid-walk.
  const onRequestSwapRef = useRef(onRequestSwap);
  onRequestSwapRef.current = onRequestSwap;

  useEffect(() => {
    // Bobbing — gentle sine wave, runs forever.
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    bobLoop.start();

    let lookCancelled = false;
    const animateLook = (x: number, y: number, duration: number) =>
      Animated.parallel([
        Animated.timing(lookX, { toValue: x, duration, useNativeDriver: false }),
        Animated.timing(lookY, { toValue: y, duration, useNativeDriver: false }),
      ]);
    const lookLoop = () => {
      if (lookCancelled) return;
      Animated.sequence([
        Animated.delay(1800),
        animateLook(54, 39, 400),
        Animated.delay(900),
        animateLook(46, 45, 400),
        Animated.delay(900),
        animateLook(50, 42, 350),
      ]).start(() => lookLoop());
    };
    lookLoop();

    let blinkCancelled = false;
    const blinkLoop = () => {
      if (blinkCancelled) return;
      Animated.sequence([
        Animated.delay(2400 + Math.random() * 2000),
        Animated.timing(blink, { toValue: 1, duration: 80, useNativeDriver: false }),
        Animated.timing(blink, { toValue: 0, duration: 110, useNativeDriver: false }),
      ]).start(() => blinkLoop());
    };
    blinkLoop();

    // ── Tricks (idle animations) ──────────────────────────────────────
    let tricksCancelled = false;
    const wiggle = () =>
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(tilt, { toValue: -1, duration: 300, useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]);
    const happyJump = () =>
      Animated.sequence([
        Animated.parallel([
          Animated.timing(jump, { toValue: -14, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(stretch, { toValue: 0.9, duration: 220, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(jump, { toValue: 0, useNativeDriver: true, damping: 6, stiffness: 160 }),
          Animated.timing(stretch, { toValue: 1, duration: 280, useNativeDriver: true }),
        ]),
      ]);
    const yawn = () =>
      Animated.sequence([
        Animated.timing(stretch, { toValue: 1.15, duration: 360, useNativeDriver: true }),
        Animated.delay(180),
        Animated.timing(stretch, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]);
    const doubleBlink = () =>
      Animated.sequence([
        Animated.timing(blink, { toValue: 1, duration: 70, useNativeDriver: false }),
        Animated.timing(blink, { toValue: 0, duration: 90, useNativeDriver: false }),
        Animated.delay(120),
        Animated.timing(blink, { toValue: 1, duration: 70, useNativeDriver: false }),
        Animated.timing(blink, { toValue: 0, duration: 90, useNativeDriver: false }),
      ]);
    const tricks = [wiggle, happyJump, yawn, doubleBlink];

    const tricksLoop = () => {
      if (tricksCancelled) return;
      const pick = tricks[Math.floor(Math.random() * tricks.length)]!;
      Animated.sequence([Animated.delay(6000 + Math.random() * 6000), pick()]).start(
        () => tricksLoop(),
      );
    };
    tricksLoop();

    // ── Speech bubble ─────────────────────────────────────────────────
    // Every so often he pipes up with a random one-liner: pop the bubble
    // in, hold for a length-scaled reading beat, fade out, then schedule
    // the next. First line comes quickly so it's obviously alive.
    let speakCancelled = false;
    let speakTimer: ReturnType<typeof setTimeout> | undefined;
    let firstSpeak = true;
    // Ring buffer of recently-used indices so we don't repeat anything
    // from the last N picks. Way more effective than "avoid the previous
    // one" — that one would alternate A B A B forever with a 2-line list.
    const recentIdxs: number[] = [];
    const pickLine = () => {
      let idx = Math.floor(Math.random() * RECYCLOPS_LINES.length);
      // Try a few times to find an idx not in the recent history. If we
      // somehow can't (history >= pool size, won't happen here), give up
      // and use whatever we landed on.
      for (let i = 0; i < 12 && recentIdxs.includes(idx); i++) {
        idx = Math.floor(Math.random() * RECYCLOPS_LINES.length);
      }
      recentIdxs.push(idx);
      if (recentIdxs.length > RECENT_HISTORY_LEN) recentIdxs.shift();
      return RECYCLOPS_LINES[idx]!;
    };
    const speakCycle = () => {
      if (speakCancelled) return;
      const wait = firstSpeak ? 3000 + Math.random() * 2000 : 9000 + Math.random() * 7000;
      firstSpeak = false;
      speakTimer = setTimeout(() => {
        if (speakCancelled) return;
        const line = pickLine();
        setBubbleMsg(line);
        const hold = Math.min(4200, 1700 + line.length * 55);
        bubbleScale.setValue(0.7);
        Animated.parallel([
          Animated.timing(bubbleOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.spring(bubbleScale, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 170 }),
        ]).start(() => {
          if (speakCancelled) return;
          speakTimer = setTimeout(() => {
            if (speakCancelled) return;
            Animated.parallel([
              Animated.timing(bubbleOpacity, { toValue: 0, duration: 240, easing: Easing.in(Easing.quad), useNativeDriver: true }),
              Animated.timing(bubbleScale, { toValue: 0.75, duration: 240, useNativeDriver: true }),
            ]).start(() => {
              if (speakCancelled) return;
              setBubbleMsg(null);
              speakCycle();
            });
          }, hold);
        });
      }, wait);
    };
    speakCycle();

    // ── Walking + swap routine ────────────────────────────────────────
    //
    // Sequence:
    //   1. Walk to a random offset (with little step-bounces)
    //   2. Pause
    //   3. Jump + turn around → back view (tushie!)
    //   4. Tell the parent to swap (onRequestSwap)
    //   5. Hold the back pose briefly
    //   6. Jump + turn around → front view
    //   7. Walk home, resume idle
    //
    let walkCancelled = false;

    const stepBounce = () =>
      Animated.sequence([
        Animated.timing(walkBounce, { toValue: -3, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(walkBounce, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]);

    const walkTo = (toX: number, durationMs: number) => {
      // Combine smooth X translation with overlapping step bounces.
      const stepCount = Math.max(2, Math.round(durationMs / 280));
      const bounces = Animated.sequence(
        Array.from({ length: stepCount }, () => stepBounce()),
      );
      return Animated.parallel([
        Animated.timing(walkX, {
          toValue: toX,
          duration: durationMs,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        bounces,
      ]);
    };

    const turnAround = (toFacing: "front" | "back") =>
      new Promise<void>((resolve) => {
        // Squash horizontally to a thin sliver (as if rotating edge-on),
        // swap the drawing at the thinnest point, then unfurl the other
        // side. A little hop rides along so it feels springy, not flat.
        Animated.parallel([
          Animated.timing(turnScaleX, { toValue: 0.1, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(jump, { toValue: -8, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start(() => {
          // At the sliver: swap which side is showing.
          setFacing(toFacing);
          Animated.parallel([
            Animated.timing(turnScaleX, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.spring(jump, { toValue: 0, useNativeDriver: true, damping: 6, stiffness: 160 }),
          ]).start(() => resolve());
        });
      });

    let isFirstWalk = true;
    const swapLoop = async () => {
      if (walkCancelled || walkRange <= 0) return;
      // First walk fires fast (1.5–3s) so the behavior is visible
      // shortly after mount; subsequent walks pace at 4–7s.
      const delay = isFirstWalk ? 1500 + Math.random() * 1500 : 4000 + Math.random() * 3000;
      isFirstWalk = false;
      await new Promise<void>((r) => {
        setTimeout(r, delay);
      });
      if (walkCancelled) return;

      // Always negative — Recyclops's home is at the right edge of the
      // calendar, so he walks LEFT into the visible area to visit
      // labels, never right (which would push him off the card).
      const target = -Math.random() * walkRange;

      // 1. Walk to a random spot along the bottom
      await new Promise<void>((r) =>
        walkTo(target, 900 + Math.random() * 400).start(() => r()),
      );
      if (walkCancelled) return;
      // 2. Brief pause "looking around"
      await new Promise<void>((r) => setTimeout(r, 300));
      // 3. Turn around to show the tushie
      await turnAround("back");
      if (walkCancelled) return;
      // 4. Raise both hands — he's reaching up to fiddle with the labels
      await new Promise<void>((r) =>
        Animated.spring(armRaise, { toValue: 1, useNativeDriver: false, damping: 9, stiffness: 140 }).start(() => r()),
      );
      if (walkCancelled) return;
      // 5. Ask the parent to swap two labels — this is the "magic" beat
      onRequestSwapRef.current?.();
      // 6. Hold the raised back pose so the user notices the swap
      await new Promise<void>((r) => setTimeout(r, 900));
      // 7. Lower the hands again before turning back
      await new Promise<void>((r) =>
        Animated.timing(armRaise, { toValue: 0, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(() => r()),
      );
      if (walkCancelled) return;
      // 8. Turn back to front
      await turnAround("front");
      if (walkCancelled) return;
      // 7. Walk home
      await new Promise<void>((r) =>
        walkTo(0, 900 + Math.random() * 400).start(() => r()),
      );
      // Loop indefinitely
      if (!walkCancelled) swapLoop();
    };

    if (walkRange > 0) swapLoop();

    return () => {
      bobLoop.stop();
      lookCancelled = true;
      blinkCancelled = true;
      tricksCancelled = true;
      walkCancelled = true;
      speakCancelled = true;
      if (speakTimer) clearTimeout(speakTimer);
    };
    // Animation values are stable refs; only walkRange should restart the
    // loop. onRequestSwap is read through a ref (above) on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkRange]);

  const handlePress = () => {
    onPress?.();
    Animated.sequence([
      Animated.parallel([
        Animated.timing(jump, { toValue: -18, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(stretch, { toValue: 0.85, duration: 200, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(jump, { toValue: 0, useNativeDriver: true, damping: 5, stiffness: 180 }),
        Animated.timing(stretch, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  };

  const baseTranslateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  const totalTranslateY = Animated.add(Animated.add(baseTranslateY, jump), walkBounce);
  const rotate = tilt.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-10deg", "0deg", "10deg"] });

  // Raising his hands = lift the whole arm mostly straight up (with a
  // small outward splay), driven through an animated `transform` array.
  //
  // We deliberately do NOT use an origin-based rotation here: under the
  // JS driver on the new architecture, the per-frame setNativeProps
  // payload only carries the *animated* keys, so static originX/originY
  // get dropped and the group would pivot about the viewBox corner (0,0)
  // instead of the shoulder — a violent jitter. A translate carries its
  // own values every frame, and a near-vertical lift keeps both hands
  // inside the 0–100 viewBox for the entire motion (no edge clipping).
  const RAISE_UP = 28; // viewBox units the hands travel upward
  const leftArmTX = armRaise.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
  const rightArmTX = armRaise.interpolate({ inputRange: [0, 1], outputRange: [0, 2] });
  const armTY = armRaise.interpolate({ inputRange: [0, 1], outputRange: [0, -RAISE_UP] });

  const bodyColor = ST.gruengut.c;
  const darkInk = ST.gruengut.ink;
  const cheekColor = ST.gruengut.ink + "22"; // tushie cheeks — slightly tinted ring

  // Eyelid drops over the eye on blink.
  const eyelidCY = blink.interpolate({ inputRange: [0, 1], outputRange: [22, 42] });

  const inner = (
    <Animated.View
      style={{
        transform: [
          { translateX: walkX },
          { translateY: totalTranslateY },
          { rotate },
          { scaleX: turnScaleX },
          { scaleY: stretch },
        ],
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Ground shadow */}
        <Ellipse cx={50} cy={98} rx={28} ry={2.5} fill="rgba(0,0,0,0.10)" />

        {/* Legs — body-colored stems poking out from under the body,
            outlined so they read as limbs rather than shadow blobs. */}
        <Ellipse cx={40} cy={86} rx={4.5} ry={7} fill={bodyColor} stroke={darkInk} strokeWidth={1.5} />
        <Ellipse cx={60} cy={86} rx={4.5} ry={7} fill={bodyColor} stroke={darkInk} strokeWidth={1.5} />

        {/* Feet — sit at the ends of the legs as little shoes. */}
        <Ellipse cx={40} cy={94} rx={7} ry={3} fill={darkInk} />
        <Ellipse cx={60} cy={94} rx={7} ry={3} fill={darkInk} />

        {/* Arms — full limbs hanging from the shoulders, each in its own
            group that lifts straight up (with a touch of splay) when he
            raises his hands (see armRaise / armTY). Outlined so they read
            as arms (not shadow) and big enough to see. Drawn before the
            body so the shoulder tucks under the silhouette and only the
            outer limb shows. */}
        <AnimatedG transform={[{ translateX: leftArmTX }, { translateY: armTY }]}>
          <Ellipse cx={13} cy={61} rx={6.5} ry={13} fill={bodyColor} stroke={darkInk} strokeWidth={1.5} transform="rotate(-6 13 61)" />
          <Circle cx={11} cy={73} r={6.5} fill={bodyColor} stroke={darkInk} strokeWidth={1.5} />
        </AnimatedG>
        <AnimatedG transform={[{ translateX: rightArmTX }, { translateY: armTY }]}>
          <Ellipse cx={87} cy={61} rx={6.5} ry={13} fill={bodyColor} stroke={darkInk} strokeWidth={1.5} transform="rotate(6 87 61)" />
          <Circle cx={89} cy={73} r={6.5} fill={bodyColor} stroke={darkInk} strokeWidth={1.5} />
        </AnimatedG>

        {/* Body — round blob, drawn after the arms so it sits in front
            of where the arms attach (cleaner silhouette). */}
        <Path
          d="M 16 56
             C 16 30, 34 16, 50 16
             C 66 16, 84 30, 84 56
             C 84 78, 70 86, 50 86
             C 30 86, 16 78, 16 56 Z"
          fill={bodyColor}
        />

        {/* ── Front-only ───────────────────────────────────────────── */}
        <G opacity={facing === "front" ? 1 : 0}>
          {/* Tiny recycling-arrow trio on the belly */}
          <Path
            d="M 41 70
               L 45 70 L 43 67 Z
               M 50 76
               L 53 73 L 50 70 Z
               M 59 67
               L 55 67 L 57 70 Z"
            fill="rgba(255,255,255,0.55)"
          />

          {/* Eye white */}
          <Circle cx={50} cy={42} r={20} fill="#fff" />
          {/* Eye outline */}
          <Circle cx={50} cy={42} r={20} fill="none" stroke={darkInk} strokeWidth={2.2} />

          {/* Pupil */}
          <AnimatedCircle cx={lookX} cy={lookY} r={9} fill={darkInk} />
          {/* Eye shine */}
          <AnimatedCircle
            cx={Animated.subtract(lookX, 3)}
            cy={Animated.subtract(lookY, 3)}
            r={3}
            fill="#fff"
          />

          {/* Eyelid — slides down over the eye on blink */}
          <AnimatedCircle cx={50} cy={eyelidCY} r={20} fill={bodyColor} />
          <AnimatedCircle
            cx={50}
            cy={eyelidCY}
            r={20}
            fill="none"
            stroke={darkInk}
            strokeWidth={2.2}
          />
        </G>

        {/* ── Back-only ────────────────────────────────────────────── */}
        <G opacity={facing === "back" ? 1 : 0}>
          {/* Tushie cheeks — two cute round bumps at the back-bottom.
              Stroke gives the seam in the middle a soft edge. */}
          <Circle cx={42} cy={72} r={11} fill={bodyColor} stroke={cheekColor} strokeWidth={2} />
          <Circle cx={58} cy={72} r={11} fill={bodyColor} stroke={cheekColor} strokeWidth={2} />
          {/* Small "tail" — the seam between the cheeks, hinting at the
              gluteal cleft without being explicit. Subtle. */}
          <Path
            d="M 50 65 L 50 80"
            stroke={darkInk}
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={0.35}
          />
        </G>
      </Svg>
    </Animated.View>
  );

  // Bubble floats above Recyclops, right-anchored so it never spills
  // past the right edge. The bubble itself stays still; only the *tail*
  // slides along its bottom edge to track Recyclops's head as he walks.
  //
  // The tail is anchored at the bubble's right edge (`right: 0`) and
  // shifted leftward via transform.translateX. Negative translateX =
  // further left. Math:
  //   tail's center should sit (size/2 - walkX) from the bubble's
  //   right edge. The tail is 14px wide, so the left edge of the tail
  //   is at right_offset = (size/2 - 7) - walkX from the bubble's right.
  //   As translateX, that's `-((size/2 - 7) - walkX) = walkX - (size/2 - 7)`.
  //
  // Clamped via interpolate so the tail can't slide past either edge of
  // the bubble (which would look like the tail detached from him).
  const tailTranslateXAnim = Animated.subtract(
    walkX,
    new Animated.Value(size / 2 - 7),
  ).interpolate({
    inputRange: [-(BUBBLE_WIDTH - 14), 0],
    outputRange: [-(BUBBLE_WIDTH - 14), 0],
    extrapolate: "clamp",
  });
  const bubble = (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        right: 0,
        bottom: size - 6,
        opacity: bubbleOpacity,
      }}
    >
      <Animated.View style={{ transform: [{ scale: bubbleScale }] }}>
        {bubbleMsg ? (
          <SpeechBubble text={bubbleMsg} tailTranslateX={tailTranslateXAnim} />
        ) : null}
      </Animated.View>
    </Animated.View>
  );

  return (
    <View style={{ alignItems: "center" }}>
      {bubble}
      <View>
        {inner}
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
