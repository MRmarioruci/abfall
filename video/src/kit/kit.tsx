// Shared building blocks for every scene: format-aware layout, captions
// that reveal word by word, the phone frame, scene in/out, and sound cues.

import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BG, FONT, S } from "../theme";

/** true for the 9:16 cut. Scenes lay out from this. */
export const useVertical = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

/** A 0→1 spring starting at `from` (frames). */
export const useSpringIn = (from: number, config: { damping?: number; stiffness?: number; mass?: number } = {}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - from, fps, config: { damping: 14, stiffness: 140, mass: 0.8, ...config } });
};

/**
 * The scene shell: page background, a soft fade + scale in at the start
 * and out at the end, so cuts feel like one continuous film.
 */
export const Scene: React.FC<{ children: React.ReactNode; bg?: string; name?: string }> = ({
  children,
  bg = BG,
  name,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const IN = 8;
  const OUT = 8;
  return (
    <AbsoluteFill name={name} style={{ backgroundColor: bg, fontFamily: FONT, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          opacity: interpolate(frame, [0, IN, durationInFrames - OUT, durationInFrames], [0, 1, 1, 0], clamp),
          scale: interpolate(frame, [0, IN, durationInFrames - OUT, durationInFrames], [1.03, 1, 1, 0.985], clamp),
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * Caption + visual, arranged per format. 16:9: caption left, visual right.
 * 9:16: caption on top, visual below. Pass `captionOnly` for title cards.
 */
export const Split: React.FC<{ caption: React.ReactNode; visual: React.ReactNode }> = ({ caption, visual }) => {
  const vertical = useVertical();
  if (vertical) {
    return (
      <AbsoluteFill style={{ padding: "150px 80px 120px", flexDirection: "column", gap: 40 }}>
        <div style={{ flex: "0 0 auto" }}>{caption}</div>
        <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {visual}
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ padding: "100px 120px", flexDirection: "row", alignItems: "center", gap: 80 }}>
      <div style={{ flex: "0 0 40%" }}>{caption}</div>
      <div style={{ flex: 1, position: "relative", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {visual}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Headline that reveals word by word with a little spring. `accent` words
 * (exact match) get the accent colour.
 */
export const Caption: React.FC<{
  text: string;
  from?: number;
  /** Frames between words. */
  stagger?: number;
  size?: number;
  accent?: string[];
  accentColor?: string;
  color?: string;
  align?: "left" | "center";
}> = ({ text, from = 6, stagger = 3, size, accent = [], accentColor = S.ink, color = S.ink, align }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = useVertical();
  const fontSize = size ?? (vertical ? 96 : 84);
  const words = text.split(" ");
  return (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 800,
        fontSize,
        lineHeight: 1.04,
        letterSpacing: -fontSize * 0.035,
        color,
        textAlign: align ?? (vertical ? "center" : "left"),
        textWrap: "balance",
      }}
    >
      {words.map((w, i) => {
        const s = spring({ frame: frame - from - i * stagger, fps, config: { damping: 15, stiffness: 160, mass: 0.7 } });
        const isAccent = accent.includes(w.replace(/[.,!?…]/g, ""));
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: s,
              translate: `0px ${(1 - s) * fontSize * 0.45}px`,
              color: isAccent ? accentColor : undefined,
              marginRight: "0.24em",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** A smaller line under a caption. */
export const SubCaption: React.FC<{ text: string; from?: number }> = ({ text, from = 20 }) => {
  const s = useSpringIn(from);
  const vertical = useVertical();
  return (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 600,
        fontSize: vertical ? 46 : 40,
        lineHeight: 1.2,
        color: S.sec,
        marginTop: 24,
        opacity: s,
        translate: `0px ${(1 - s) * 20}px`,
        textAlign: vertical ? "center" : "left",
      }}
    >
      {text}
    </div>
  );
};

/** The phone: a 390×844 screen in a rounded frame, scaled to `height`. */
export const Phone: React.FC<{ children: React.ReactNode; height: number; bg?: string; style?: React.CSSProperties }> = ({
  children,
  height,
  bg = BG,
  style,
}) => {
  const W = 390;
  const H = 844;
  const scale = height / (H + 28);
  return (
    <div style={{ width: (W + 28) * scale, height, position: "relative", ...style }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W + 28,
          height: H + 28,
          scale: String(scale),
          transformOrigin: "0 0",
          borderRadius: 66,
          background: "#1d1b19",
          padding: 14,
          boxShadow: "0 40px 90px rgba(80,60,40,0.28), 0 8px 24px rgba(80,60,40,0.18)",
        }}
      >
        <div style={{ width: W, height: H, borderRadius: 52, overflow: "hidden", position: "relative", background: bg, fontFamily: FONT }}>
          {children}
          {/* dynamic island */}
          <div style={{ position: "absolute", top: 12, left: W / 2 - 60, width: 120, height: 34, borderRadius: 20, background: "#000" }} />
        </div>
      </div>
    </div>
  );
};

/** Plays a sound from public/sfx at `at` frames into the current scene. */
export const Sfx: React.FC<{ at: number; src: string; volume?: number }> = ({ at, src, volume = 0.6 }) => (
  <Sequence from={Math.max(0, Math.round(at))} layout="none">
    <Audio src={staticFile(`sfx/${src}`)} volume={volume} />
  </Sequence>
);
