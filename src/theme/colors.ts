export const S = {
  bg: "#F3EFF4",
  card: "#FFFFFF",
  cardWarm: "#FBF6F1",
  ink: "#211F1C",
  sec: "rgba(33,31,28,0.50)",
  ter: "rgba(33,31,28,0.32)",
  line: "rgba(40,28,18,0.07)",
} as const;

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
// they re-render on locale change. For now, ST.label keeps working as an
// English-default constant.
export interface WasteStream {
  label: string;
  c: string;
  ink: string;
  soft: string;
}

const VISUAL: Record<WasteStreamId, Omit<WasteStream, "label">> = {
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

export const ST: Record<WasteStreamId, WasteStream> = {
  papier: { label: DEFAULT_LABELS.papier, ...VISUAL.papier },
  karton: { label: DEFAULT_LABELS.karton, ...VISUAL.karton },
  kehricht: { label: DEFAULT_LABELS.kehricht, ...VISUAL.kehricht },
  gruengut: { label: DEFAULT_LABELS.gruengut, ...VISUAL.gruengut },
  metall: { label: DEFAULT_LABELS.metall, ...VISUAL.metall },
  bio: { label: DEFAULT_LABELS.bio, ...VISUAL.bio },
  sperrgut: { label: DEFAULT_LABELS.sperrgut, ...VISUAL.sperrgut },
  altmetall: { label: DEFAULT_LABELS.altmetall, ...VISUAL.altmetall },
  textilien: { label: DEFAULT_LABELS.textilien, ...VISUAL.textilien },
  sonderabfall: { label: DEFAULT_LABELS.sonderabfall, ...VISUAL.sonderabfall },
  verpackung: { label: DEFAULT_LABELS.verpackung, ...VISUAL.verpackung },
  glas: { label: DEFAULT_LABELS.glas, ...VISUAL.glas },
  sonstiges: { label: DEFAULT_LABELS.sonstiges, ...VISUAL.sonstiges },
};

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
