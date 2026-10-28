// Two palettes with the same keys. Components read the active one through
// useTheme() (src/theme/ThemeContext.tsx); nothing in the UI should
// hard-code a colour.
//
// The look is crisp and editorial: a warm off-white page, white cards
// edged with a hairline (`line`) instead of shadows, solid greys for
// secondary text, and the waste colours used as markers (squares, bars,
// icon wells) rather than as big panels. Dark mode is the same layout on
// deep plum neutrals.
const LIGHT_NEUTRALS = {
  /** Screen background. */
  bg: "#F6F4F1",
  /** Background of sheets and pushed screens. */
  sheet: "#F6F4F1",
  /** Raised surfaces: cards, rows, inputs. Always edged with `line`. */
  card: "#FFFFFF",
  /** Neutral icon well / quiet chip. */
  chip: "#EFEBE5",
  /** Translucent card for overlays on maps and photos. */
  float: "rgba(255,255,255,0.96)",
  /** The page colour, translucent, for docks over scrolling content. */
  sheetFloat: "rgba(246,244,241,0.96)",
  /** Frosted badge on top of a tinted panel. */
  glass: "rgba(255,255,255,0.7)",
  /** Solid white pill on a tinted panel; frosted in dark mode. */
  onTint: "#FFFFFF",
  ink: "#1C1B19",
  sec: "#8A857E",
  ter: "#B9B3AA",
  /** Hairline borders and dividers. */
  line: "#E4DFD7",
  /** Faint ink wash: tracks, inactive dots. */
  fill: "rgba(28,27,25,0.06)",
  fillStrong: "rgba(28,27,25,0.16)",
  /** Text and icons on an `ink` filled control (primary buttons, today). */
  onInk: "#FFFFFF",
  /** Content on vivid fills that stay the same in both modes. */
  white: "#FFFFFF",
  /** Only for things that float over other content (menus, map cards). */
  shadow: "rgb(60,48,40)",
  scrim: "rgba(0,0,0,0.3)",
  skeleton: "#ECE7E0",
  /** Empty day dots in the little calendar illustrations. */
  dot: "#E4DFD7",
  danger: "#C8341A",
  dangerSurface: "#7A2414",
  success: "#4E9A5E",
};

export type Neutrals = { [K in keyof typeof LIGHT_NEUTRALS]: string };

const DARK_NEUTRALS: Neutrals = {
  bg: "#131115",
  sheet: "#18161B",
  card: "#1F1C23",
  chip: "#2A262E",
  float: "rgba(31,28,35,0.96)",
  sheetFloat: "rgba(19,17,21,0.96)",
  glass: "rgba(255,255,255,0.10)",
  onTint: "rgba(255,255,255,0.10)",
  ink: "#F4EFF3",
  sec: "#9A93A1",
  ter: "#5F5967",
  line: "#2E2A33",
  fill: "rgba(255,255,255,0.08)",
  fillStrong: "rgba(255,255,255,0.20)",
  onInk: "#131115",
  white: "#FFFFFF",
  shadow: "#000000",
  scrim: "rgba(0,0,0,0.6)",
  skeleton: "#25212A",
  dot: "rgba(255,255,255,0.14)",
  danger: "#E5583B",
  dangerSurface: "#8A2C1A",
  success: "#6DBE7D",
};

export type WasteStreamId =
  | "papier"
  | "karton"
  | "kehricht"
  | "gruengut"
  | "metall"
  | "bio"
  | "sperrgut"
  | "altmetall"
  | "textilien"
  | "sonderabfall"
  /** Packaging / plastic / mixed recycling: Gelber Sack, PMD, plastica. */
  | "verpackung"
  | "glas"
  /** Any other collection; the printed name is kept in the event's note. */
  | "sonstiges";

// `label` is the user-facing name. It is populated from the i18n module's
// current locale (English by default). When we add a real locale switcher
// later, components should migrate to `wasteLabel(id)` from `src/i18n` so
// they re-render on locale change. For now, ST_STATIC.label keeps working as an
// English-default constant.
export interface WasteStream {
  label: string;
  /** The stream's colour: pastel in both modes. */
  c: string;
  /** Text and icons on `soft` (and on neutral surfaces). */
  ink: string;
  /** A tinted panel: light in light mode, deep in dark mode. */
  soft: string;
  /** Text and icons on `c`. Always dark, since `c` is always pastel. */
  onC: string;
}

const LIGHT_VISUAL: Record<WasteStreamId, Omit<WasteStream, "label" | "onC">> = {
  papier:       { c: "#C3C6EC", ink: "#2C2E61", soft: "#E5E6F6" },
  karton:       { c: "#EFCB49", ink: "#42340A", soft: "#FAEEC4" },
  kehricht:     { c: "#E69A80", ink: "#4A1B10", soft: "#F6DDD2" },
  gruengut:     { c: "#AECB93", ink: "#273913", soft: "#DCE9CE" },
  metall:       { c: "#9CC9C2", ink: "#103330", soft: "#D4E8E4" },
  bio:          { c: "#AECB93", ink: "#273913", soft: "#DCE9CE" },
  sperrgut:     { c: "#D4B896", ink: "#3D2B14", soft: "#EDE3D5" },
  altmetall:    { c: "#9CC9C2", ink: "#103330", soft: "#D4E8E4" },
  textilien:    { c: "#D4A5C9", ink: "#3D1435", soft: "#EEDCE9" },
  sonderabfall: { c: "#E8B4B4", ink: "#4A1010", soft: "#F6DEDE" },
  verpackung:   { c: "#F2B65A", ink: "#4A2E05", soft: "#FCE7C6" },
  glas:         { c: "#9DBBE0", ink: "#13304F", soft: "#DCE7F4" },
  sonstiges:    { c: "#BDB6AE", ink: "#2E2A26", soft: "#E9E5E0" },
};


const DARK_VISUAL: Record<WasteStreamId, Omit<WasteStream, "label" | "onC">> = {
  papier:       { c: "#A9ADE3", ink: "#CDD0F3", soft: "#21244D" },
  karton:       { c: "#E7C547", ink: "#F6E6AE", soft: "#4D4321" },
  kehricht:     { c: "#E0957B", ink: "#F5CDBE", soft: "#4D2C21" },
  gruengut:     { c: "#A9C58E", ink: "#D6E8C6", soft: "#364D21" },
  metall:       { c: "#97C3BC", ink: "#C8E6E1", soft: "#214D46" },
  bio:          { c: "#A9C58E", ink: "#D6E8C6", soft: "#364D21" },
  sperrgut:     { c: "#CEB391", ink: "#EADDCC", soft: "#453829" },
  altmetall:    { c: "#97C3BC", ink: "#C8E6E1", soft: "#214D46" },
  textilien:    { c: "#CE9FC3", ink: "#EECDE6", soft: "#4D2142" },
  sonderabfall: { c: "#DA9494", ink: "#F2C6C6", soft: "#4D2121" },
  verpackung:   { c: "#EBB157", ink: "#F8DDB3", soft: "#4D3B21" },
  glas:         { c: "#95B3D9", ink: "#C6D8F0", soft: "#21354D" },
  sonstiges:    { c: "#B7B1A9", ink: "#E0DCD7", soft: "#3C3731" },
};

// English defaults — kept in sync with src/i18n WASTE_LABELS.en. When we wire
// a locale switcher, swap this constant for a `wasteLabel(id)` call site.
const DEFAULT_LABELS: Record<WasteStreamId, string> = {
  kehricht: "Refuse",
  bio: "Organic",
  gruengut: "Green waste",
  papier: "Paper",
  karton: "Cardboard",
  metall: "Metal",
  altmetall: "Scrap metal",
  sperrgut: "Bulky waste",
  textilien: "Textiles",
  sonderabfall: "Hazardous waste",
  verpackung: "Recycling",
  glas: "Glass",
  sonstiges: "Other",
};

function buildStreams(visual: typeof LIGHT_VISUAL): Record<WasteStreamId, WasteStream> {
  const out = {} as Record<WasteStreamId, WasteStream>;
  for (const id of Object.keys(visual) as WasteStreamId[]) {
    out[id] = { label: DEFAULT_LABELS[id], ...visual[id], onC: LIGHT_VISUAL[id].ink };
  }
  return out;
}

export interface Palette {
  S: Neutrals;
  ST: Record<WasteStreamId, WasteStream>;
}

export const LIGHT: Palette = { S: LIGHT_NEUTRALS, ST: buildStreams(LIGHT_VISUAL) };
export const DARK: Palette = { S: DARK_NEUTRALS, ST: buildStreams(DARK_VISUAL) };

/**
 * The light waste palette for code outside React (notifications, native
 * calendar colours, labels). UI code reads `useTheme().ST` instead.
 */
export const ST_STATIC = LIGHT.ST;

export const STREAM_ORDER: WasteStreamId[] = [
  "kehricht",
  "verpackung",
  "papier",
  "karton",
  "glas",
  "gruengut",
  "bio",
  "metall",
  "altmetall",
  "sperrgut",
  "textilien",
  "sonderabfall",
  "sonstiges",
];
