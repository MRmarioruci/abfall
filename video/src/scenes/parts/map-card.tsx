// The place card from the app's map (src/components/map/PlaceCard.tsx):
// name, "type · distance", material chips, and a dark Directions pill.

import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { StreamGlyph } from "../../app/StreamGlyph";
import type { WasteStreamId } from "../../app/colors";
import { clamp, EASE_OUT } from "../../kit/kit";
import { FONT, S, ST } from "../../theme";
import { useCopy } from "../../copy";

const CHIPS: Array<{ key: "glass" | "batteries" | "cans"; stream: WasteStreamId }> = [
  { key: "glass", stream: "glas" },
  { key: "batteries", stream: "sonderabfall" },
  { key: "cans", stream: "metall" },
];

export const CARD_H = 276;

export const PlaceCard: React.FC<{ at: number; pressAt: number }> = ({ at, pressAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const m = useCopy().map;
  const up = spring({ frame: frame - at, fps, config: { damping: 15, stiffness: 150, mass: 0.9 } });
  const item = (i: number) => {
    const s = spring({ frame: frame - at - 5 - i * 3, fps, config: { damping: 14, stiffness: 170, mass: 0.6 } });
    return { opacity: s, translate: `0px ${(1 - s) * 18}px` };
  };
  // Press: dip, then spring back.
  const press = interpolate(frame, [pressAt - 3, pressAt, pressAt + 2, pressAt + 10], [0, 1, 1, 0], { ...clamp, easing: EASE_OUT });
  const glow = interpolate(frame, [pressAt, pressAt + 12], [0, 1], { ...clamp, easing: EASE_OUT });

  return (
    <div
      style={{
        position: "absolute",
        left: 14,
        right: 14,
        bottom: 30,
        height: CARD_H,
        padding: "22px 20px 20px",
        boxSizing: "border-box",
        background: "#fff",
        borderRadius: 28,
        boxShadow: "0 8px 26px rgba(150,118,96,0.24)",
        translate: `0px ${(1 - up) * (CARD_H + 60)}px`,
        fontFamily: FONT,
        zIndex: 5,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", ...item(0) }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 25, fontWeight: 800, color: S.ink, letterSpacing: -0.7, lineHeight: 1.1 }}>
            {m.place}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: S.sec, marginTop: 6 }}>{m.type}</div>
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: "#F4EFEA",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
        >
          <svg width={14} height={14} viewBox="0 0 14 14">
            <path d="M2 2l10 10M12 2 2 12" stroke={S.ink} strokeWidth={2} strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <div style={{ display: "flex", gap: 7, marginTop: 16 }}>
        {CHIPS.map((c, i) => (
          <div
            key={c.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 13px 6px 7px",
              borderRadius: 99,
              background: ST[c.stream].soft,
              ...item(1 + i),
            }}
          >
            <StreamGlyph stream={c.stream} size={24} />
            <span style={{ fontSize: 14, fontWeight: 700, color: ST[c.stream].ink }}>{m.chips[c.key]}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, color: S.ink, marginTop: 16, ...item(4) }}>
        <span style={{ color: S.sec }}>{m.hoursLabel} · </span>
        {m.hours}
      </div>

      <div
        style={{
          position: "relative",
          marginTop: 18,
          height: 56,
          borderRadius: 99,
          background: S.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          overflow: "hidden",
          scale: String(1 - press * 0.05),
          ...item(5),
        }}
      >
        {/* ripple from the press */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 700,
            height: 700,
            marginLeft: -350,
            marginTop: -350,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.18)",
            scale: String(glow),
            opacity: glow > 0 ? 1 - glow : 0,
          }}
        />
        <svg width={18} height={18} viewBox="0 0 24 24">
          <path d="M7 17 17 7M8.5 7H17v8.5" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <span style={{ fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: -0.2 }}>{m.directions}</span>
      </div>
    </div>
  );
};
