// Typography. Hanken Grotesk is loaded in App.tsx; each weight is its own
// font file, so styles pick a family instead of setting fontWeight (Android
// can't derive weights from one custom family).

export const FONT = {
  w400: "HankenGrotesk_400Regular",
  w500: "HankenGrotesk_500Medium",
  w600: "HankenGrotesk_600SemiBold",
  w700: "HankenGrotesk_700Bold",
  w800: "HankenGrotesk_800ExtraBold",
  w900: "HankenGrotesk_900Black",
} as const;

/** The type scale. New UI should use these instead of ad-hoc sizes. */
export const TYPE = {
  /** Hero numbers and countdowns ("Tomorrow"). */
  display: { fontFamily: FONT.w800, fontSize: 34, letterSpacing: -1, lineHeight: 38 },
  /** Screen titles. */
  title: { fontFamily: FONT.w800, fontSize: 28, letterSpacing: -0.8, lineHeight: 33 },
  /** Sheet titles, card titles. */
  heading: { fontFamily: FONT.w800, fontSize: 20, letterSpacing: -0.4, lineHeight: 25 },
  /** Row labels, buttons. */
  label: { fontFamily: FONT.w700, fontSize: 16, letterSpacing: -0.2, lineHeight: 21 },
  /** Running text. */
  body: { fontFamily: FONT.w500, fontSize: 15, letterSpacing: -0.1, lineHeight: 21 },
  /** Secondary lines, meta. */
  caption: { fontFamily: FONT.w600, fontSize: 13, letterSpacing: 0, lineHeight: 17 },
  /** Chips, badges. */
  micro: { fontFamily: FONT.w700, fontSize: 11.5, letterSpacing: 0.1, lineHeight: 14 },
} as const;
