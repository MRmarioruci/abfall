// Every user-visible string in the film, per language. Scenes read them with
// useCopy(); the composition's `lang` prop picks the language.
//
// To add a language: add an object of type Copy below, list it in COPY, and
// register two compositions for it in Root.tsx.
//
// Phone UI text follows the app's own wording (../src/i18n/locales/*.ts).
// The Read scene's drifting calendar-title chips are the one deliberate
// exception: they stay multilingual in every version ("Any language").
import { createContext, createElement, useContext } from "react";
import type { WasteStreamId } from "./app/colors";

export type Lang = "en" | "de";

/** A headline and the words (exact, punctuation stripped) drawn in accent colour. */
export type Line = { text: string; accent: string[] };

export type CommunityRow = {
  title: string;
  /** "Town, region · year" line under the title. */
  sub: string;
  /** Letter in the row's round avatar. */
  mark: string;
  uses: number;
};

export type Copy = {
  brand: string;
  /** Short name per waste stream (app: WASTE_LABELS). */
  waste: Record<WasteStreamId, string>;

  intro: { caption: Line };

  problem: {
    /** Three lines, in order: paper, cardboard, the penny drops. */
    lines: [Line, Line, Line];
  };

  /** The dense printed year calendar (Problem and Scan). */
  printed: {
    title: string;
    subtitle: string;
    months: string[];
    footnote: string;
  };

  scan: {
    caption: Line;
    topTitle: string;
    hint: string;
    onePage: string;
    stages: [string, string, string];
    cancel: string;
  };

  read: {
    caption: Line;
    /** The single-month paper page. */
    paperTitle: string;
    paperSub: string;
    paperWeekdays: string[];
    /** The app's month card. */
    month: string;
    monthSub: string;
    weekdays: string[];
  };

  community: {
    caption: Line;
    homeTitle: string;
    title: string;
    subtitle: string;
    placeholder: string;
    query: string;
    rows: CommunityRow[];
    uses: (n: number) => string;
    scanOwn: string;
    zone: string;
    use: string;
    added: string;
    report: string;
    toast: string;
  };

  reminder: {
    caption: Line;
    date: string;
    now: string;
    first: string;
    second: string;
  };

  map: {
    caption: Line;
    search: string;
    place: string;
    type: string;
    chips: { glass: string; batteries: string; cans: string };
    hoursLabel: string;
    hours: string;
    directions: string;
  };

  share: {
    caption: Line;
    sub: string;
    live: string;
    link: string;
    copy: string;
    share: string;
  };

  outro: {
    tomorrow: string;
    heroStream: string;
    heroWhen: string;
    location: string;
    calendarTitle: string;
    switch: string;
    month: string;
    monthSub: string;
    weekdays: string[];
    /**
     * The four legend labels Recyclops swaps (Refuse, Green waste, Paper,
     * Cardboard order), each with its width in phone px (dot + label), so
     * the swap knows where every label sits.
     */
    legend: { refuse: number; gruengut: number; papier: number; karton: number };
    funFact: string;
    tagline: Line;
  };
};

export const en: Copy = {
  brand: "Abfall",
  waste: {
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
  },

  intro: { caption: { text: "Hi, I'm Recyclops.", accent: ["Recyclops"] } },

  problem: {
    lines: [
      { text: "Paper this week?", accent: ["Paper"] },
      { text: "Or cardboard?", accent: ["cardboard"] },
      { text: "Wait… was that yesterday?", accent: ["yesterday"] },
    ],
  },

  printed: {
    title: "Waste Collection Calendar 2026",
    subtitle: "City of Zurich · Collection days, District 3 · please keep",
    months: ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"],
    footnote: "Holiday changes: see overleaf. Green waste March–November only. Put cardboard out bundled.",
  },

  scan: {
    caption: { text: "Just snap your paper calendar.", accent: ["snap"] },
    topTitle: "SCAN CALENDAR",
    hint: "Fit the whole page in the frame",
    onePage: "1 page",
    stages: ["Preparing your photo", "Reading the collection dates", "Organising your calendar"],
    cancel: "Cancel",
  },

  read: {
    caption: { text: "Every date. Any calendar. Any language.", accent: [] },
    paperTitle: "Waste Collection Calendar 2026",
    paperSub: "City of Zurich · June",
    paperWeekdays: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
    month: "June",
    monthSub: "2026 · Zurich",
    weekdays: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  },

  community: {
    caption: { text: "No paper? Your neighbours already shared it.", accent: ["neighbours"] },
    homeTitle: "Home",
    title: "Community calendars",
    subtitle: "Shared by other Abfall users",
    placeholder: "City, region, or calendar name",
    query: "Zurich",
    rows: [
      { title: "Zurich Wiedikon", sub: "Zurich, ZH · 2026", mark: "W", uses: 128 },
      { title: "Zurich Oerlikon", sub: "Zurich, ZH · 2026", mark: "O", uses: 37 },
      { title: "Zurich Altstetten", sub: "Zurich, ZH · 2026", mark: "A", uses: 12 },
    ],
    uses: (n) => (n === 1 ? "1 use" : `${n} uses`),
    scanOwn: "Don't see yours? Scan your own",
    zone: "Zone 2",
    use: "Use this calendar",
    added: "Added",
    report: "Report this calendar",
    toast: "Calendar added",
  },

  reminder: {
    caption: { text: "A nudge the evening before.", accent: ["evening"] },
    date: "Tuesday, 3 March",
    now: "now",
    first: "Paper goes out tomorrow",
    second: "Cardboard too",
  },

  map: {
    caption: { text: "Glass? Batteries? Find where they go.", accent: ["Find"] },
    search: "Collection points nearby",
    place: "Recycling point Hardbrücke",
    type: "Collection point · 350 m",
    chips: { glass: "Glass", batteries: "Batteries", cans: "Cans" },
    hoursLabel: "Opening hours",
    hours: "Mon–Sat 07:00–20:00",
    directions: "Directions",
  },

  share: {
    caption: { text: "Share it in one tap.", accent: ["one", "tap"] },
    sub: "Neighbours scan it and they're set.",
    live: "Live for neighbours",
    link: "abfall.app/c/K7QX2",
    copy: "Copy",
    share: "Share",
  },

  outro: {
    tomorrow: "Tomorrow",
    heroStream: "Paper",
    heroWhen: "Thu 22 Oct · 7:00",
    location: "District 6, Zurich",
    calendarTitle: "District 6 · 2026",
    switch: "Switch",
    month: "October",
    monthSub: "2026 · Zurich",
    weekdays: ["M", "T", "W", "T", "F", "S", "S"],
    legend: { refuse: 54, gruengut: 84, papier: 49, karton: 72 },
    funFact: "A recycled aluminium can can be back on the shelf in about 60 days.",
    tagline: { text: "Never miss a waste pickup again.", accent: ["waste", "pickup"] },
  },
};

export const de: Copy = {
  brand: "Abfall",
  waste: {
    kehricht: "Kehricht",
    bio: "Bioabfall",
    gruengut: "Grüngut",
    papier: "Papier",
    karton: "Karton",
    metall: "Metall",
    altmetall: "Altmetall",
    sperrgut: "Sperrgut",
    textilien: "Textilien",
    sonderabfall: "Sonderabfall",
    verpackung: "Verpackungen",
    glas: "Glas",
    sonstiges: "Sonstiges",
  },

  intro: { caption: { text: "Hoi, ich bin Recyclops.", accent: ["Recyclops"] } },

  problem: {
    lines: [
      { text: "Diese Woche Papier?", accent: ["Papier"] },
      { text: "Oder Karton?", accent: ["Karton"] },
      { text: "Moment… war das gestern?", accent: ["gestern"] },
    ],
  },

  printed: {
    title: "Abfallkalender 2026",
    subtitle: "Stadt Zürich · Sammeltage Kreis 3 · bitte aufbewahren",
    months: ["JANUAR", "FEBRUAR", "MÄRZ", "APRIL", "MAI", "JUNI", "JULI", "AUGUST", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DEZEMBER"],
    footnote: "Verschiebungen an Feiertagen siehe Rückseite. Grüngut nur März–November. Karton gebündelt bereitstellen.",
  },

  scan: {
    caption: { text: "Fotografier einfach deinen Papierkalender.", accent: ["Fotografier"] },
    topTitle: "KALENDER SCANNEN",
    hint: "Ganze Seite in den Rahmen bringen",
    onePage: "1 Seite",
    stages: ["Foto wird vorbereitet", "Abfuhrdaten werden gelesen", "Kalender wird erstellt"],
    cancel: "Abbrechen",
  },

  read: {
    caption: { text: "Jedes Datum. Jeder Kalender. Jede Sprache.", accent: [] },
    paperTitle: "Abfallkalender 2026",
    paperSub: "Stadt Zürich · Juni",
    paperWeekdays: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
    month: "Juni",
    monthSub: "2026 · Zürich",
    weekdays: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  },

  community: {
    caption: { text: "Kein Kalender? Deine Nachbarn haben ihn schon geteilt.", accent: ["Nachbarn"] },
    homeTitle: "Start",
    title: "Community-Kalender",
    subtitle: "Geteilt von anderen Abfall-Nutzern",
    placeholder: "Ort, Region oder Kalendername",
    query: "Zürich",
    rows: [
      { title: "Zürich Wiedikon", sub: "Zürich, ZH · 2026", mark: "W", uses: 128 },
      { title: "Zürich Oerlikon", sub: "Zürich, ZH · 2026", mark: "O", uses: 37 },
      { title: "Zürich Altstetten", sub: "Zürich, ZH · 2026", mark: "A", uses: 12 },
    ],
    uses: (n) => (n === 1 ? "1 Nutzung" : `${n} Nutzungen`),
    scanOwn: "Deiner fehlt? Scanne deinen eigenen",
    zone: "Zone 2",
    use: "Diesen Kalender verwenden",
    added: "Hinzugefügt",
    report: "Diesen Kalender melden",
    toast: "Kalender hinzugefügt",
  },

  reminder: {
    caption: { text: "Ein Stupser am Vorabend.", accent: ["Vorabend"] },
    date: "Dienstag, 3. März",
    now: "jetzt",
    first: "Morgen ist Papierabfuhr",
    second: "Karton auch",
  },

  map: {
    caption: { text: "Glas? Batterien? Finde heraus, wohin damit.", accent: ["Finde"] },
    search: "Sammelstellen in der Nähe",
    place: "Recyclingstelle Hardbrücke",
    type: "Sammelstelle · 350 m",
    chips: { glass: "Glas", batteries: "Batterien", cans: "Dosen" },
    hoursLabel: "Öffnungszeiten",
    hours: "Mo–Sa 07:00–20:00",
    directions: "Route",
  },

  share: {
    caption: { text: "Mit einem Tipp teilen.", accent: ["einem", "Tipp"] },
    sub: "Nachbarn scannen – fertig.",
    live: "Online für deine Nachbarschaft",
    link: "abfall.app/c/K7QX2",
    copy: "Kopieren",
    share: "Teilen",
  },

  outro: {
    tomorrow: "Morgen",
    heroStream: "Papier",
    heroWhen: "Do 22. Okt. · 7:00",
    location: "Kreis 6, Zürich",
    calendarTitle: "Kreis 6 · 2026",
    switch: "Wechseln",
    month: "Oktober",
    monthSub: "2026 · Zürich",
    weekdays: ["M", "D", "M", "D", "F", "S", "S"],
    legend: { refuse: 66, gruengut: 64, papier: 54, karton: 55 },
    funFact: "Eine recycelte Alu-Dose kann nach rund 60 Tagen wieder im Regal stehen.",
    tagline: { text: "Nie mehr den Abfuhrtag verpassen.", accent: ["Abfuhrtag"] },
  },
};

export const COPY: Record<Lang, Copy> = { en, de };

const CopyContext = createContext<Copy>(en);

export const CopyProvider: React.FC<{ lang: Lang; children: React.ReactNode }> = ({ lang, children }) =>
  createElement(CopyContext.Provider, { value: COPY[lang] ?? en }, children);

/** The current language's strings. English outside a provider. */
export const useCopy = () => useContext(CopyContext);

/** Props every composition takes. */
export type LangProps = { lang: Lang };
