// Look and timing of the film. Colours come straight from the app.
import { loadFont } from "@remotion/google-fonts/HankenGrotesk";
import { S, ST } from "./app/colors";

export { S, ST };

export const { fontFamily: FONT } = loadFont("normal", {
  weights: ["500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

export const FPS = 30;
/** 120 BPM: one beat is exactly 15 frames, so cuts can land on the beat. */
export const BEAT = 15;
export const BAR = BEAT * 4;
export const DURATION = 45 * FPS;

/**
 * The film, scene by scene. Start and length in beats (15 frames each);
 * every cut lands on a beat of public/music.wav.
 */
export const SCENES = [
  { id: "Intro", beats: 8 }, //       0.0 – 4.0 s  "Hi, I'm Recyclops."
  { id: "Problem", beats: 10 }, //    4.0 – 9.0 s  "Paper or cardboard? …"
  { id: "Scan", beats: 12 }, //       9.0 – 15.0 s "Just snap your paper calendar."
  { id: "Read", beats: 10 }, //      15.0 – 20.0 s "Every date. Any calendar. Any language."
  { id: "Community", beats: 10 }, // 20.0 – 25.0 s "No paper? Your neighbours shared it."
  { id: "Reminder", beats: 10 }, //  25.0 – 30.0 s "A nudge the evening before."
  { id: "Map", beats: 10 }, //       30.0 – 35.0 s "Glass, batteries? Find where they go."
  { id: "Share", beats: 8 }, //      35.0 – 39.0 s "Share it in one tap."
  { id: "Outro", beats: 12 }, //     39.0 – 45.0 s "Abfall. Never miss a pickup again."
] as const;

export type SceneId = (typeof SCENES)[number]["id"];

export const sceneFrames = (id: SceneId) => SCENES.find((s) => s.id === id)!.beats * BEAT;

export const sceneStart = (id: SceneId) => {
  let f = 0;
  for (const s of SCENES) {
    if (s.id === id) return f;
    f += s.beats * BEAT;
  }
  throw new Error(id);
};

/** The page colour behind everything (the app's background). */
export const BG = S.bg;
