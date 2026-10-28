// A stylised town map for the Map scene (no tiles, no real data): beige
// land, white streets, a park, a lake and a railway, plus waste-type pins.
// Coordinates are the phone's 390×844 screen.

import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { StreamGlyph } from "../../app/StreamGlyph";
import type { WasteStreamId } from "../../app/colors";
import { clamp } from "../../kit/kit";
import { FONT, S, ST } from "../../theme";
import { useCopy } from "../../copy";

const LAND = "#EFE7DA";
const BLOCK = "#E8DECF";

export const MapWorld: React.FC = () => (
  <svg width={390} height={844} viewBox="0 0 390 844" style={{ position: "absolute", left: 0, top: 0 }}>
    <rect x={-200} y={-200} width={790} height={1244} fill={LAND} />
    {/* building blocks, a touch darker than the land */}
    {[
      [20, 140, 90, 70],
      [150, 120, 70, 60],
      [250, 290, 60, 80],
      [30, 330, 70, 90],
      [140, 420, 110, 60],
      [280, 520, 90, 70],
      [40, 620, 80, 80],
      [170, 640, 100, 70],
      [300, 650, 80, 90],
    ].map(([x, y, w, h], i) => (
      <rect key={i} x={x} y={y} width={w} height={h} rx={8} fill={BLOCK} />
    ))}
    {/* lake */}
    <path
      d="M250 40c40-20 110-10 150 20v170c-30 20-70 22-100 4-26-15-28-40-50-60-30-28-42-108 0-134Z"
      fill={ST.glas.soft}
      stroke={ST.glas.c}
      strokeOpacity={0.5}
      strokeWidth={2}
    />
    {/* park */}
    <path
      d="M-20 470c30-24 90-30 120-6 26 20 36 58 18 86-20 32-70 40-104 28-34-12-56-80-34-108Z"
      fill={ST.gruengut.soft}
      stroke={ST.gruengut.c}
      strokeOpacity={0.6}
      strokeWidth={2}
    />
    {[
      [30, 510],
      [62, 540],
      [80, 500],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r={9} fill={ST.gruengut.c} opacity={0.7} />
    ))}
    {/* streets: minor, then main roads on top */}
    <g stroke="#fff" strokeLinecap="round" fill="none">
      <g strokeWidth={7}>
        <path d="M-10 250 L400 300" />
        <path d="M130 -10 L120 860" />
        <path d="M-10 600 L400 560" />
        <path d="M270 260 L330 860" />
        <path d="M120 400 L400 470" />
      </g>
      <g strokeWidth={13}>
        <path d="M-10 390 C120 360 260 380 400 340" />
        <path d="M230 -10 C220 200 200 420 230 860" />
      </g>
    </g>
    {/* railway */}
    <path d="M-10 720 C120 700 260 700 400 690" stroke="#CFC3B2" strokeWidth={6} fill="none" />
    <path d="M-10 720 C120 700 260 700 400 690" stroke="#fff" strokeWidth={2} strokeDasharray="6 8" fill="none" />
  </svg>
);

export type PinSpec = {
  id: string;
  stream: WasteStreamId;
  x: number;
  y: number;
  at: number;
};

/** A round waste-colour marker with a tail; its tip sits on (x, y). */
export const Pin: React.FC<{
  pin: PinSpec;
  selectedAt?: number;
  dimFrom?: number;
}> = ({ pin, selectedAt, dimFrom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({
    frame: frame - pin.at,
    fps,
    config: { damping: 9, stiffness: 180, mass: 0.7 },
  });
  const sel =
    selectedAt === undefined
      ? 0
      : spring({
          frame: frame - selectedAt,
          fps,
          config: { damping: 8, stiffness: 160, mass: 0.7 },
        });
  const dim = dimFrom === undefined ? 0 : interpolate(frame, [dimFrom, dimFrom + 10], [0, 0.35], clamp);
  // Squash a little as it lands.
  const land = interpolate(frame - pin.at, [4, 7, 12], [0, 1, 0], clamp);
  const D = 46;
  const ringT = selectedAt === undefined || frame < selectedAt ? -1 : ((frame - selectedAt) % 26) / 26;
  return (
    <div
      style={{
        position: "absolute",
        left: pin.x - D / 2,
        top: pin.y - D - 10,
        width: D,
        height: D + 10,
        opacity: interpolate(drop, [0, 0.2], [0, 1 - dim], clamp),
        translate: `0px ${(1 - drop) * -260}px`,
        scale: `${(1 + sel * 0.28) * (1 + land * 0.08)} ${(1 + sel * 0.28) * (1 - land * 0.1)}`,
        transformOrigin: "50% 100%",
        zIndex: selectedAt === undefined ? 1 : 2,
      }}
    >
      {/* landing shadow */}
      <div
        style={{
          position: "absolute",
          left: D / 2 - 10,
          top: D + 6,
          width: 20,
          height: 7,
          borderRadius: "50%",
          background: "rgba(60,40,20,0.22)",
          opacity: drop,
          translate: `0px ${(1 - drop) * 260}px`,
        }}
      />
      {ringT >= 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: D,
            height: D,
            borderRadius: "50%",
            border: `3px solid ${ST[pin.stream].c}`,
            scale: String(1 + ringT * 1.3),
            opacity: (1 - ringT) * 0.9,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: D / 2 - 7,
          top: D - 12,
          width: 14,
          height: 14,
          rotate: "45deg",
          background: "#fff",
          borderRadius: 3,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: D,
          height: D,
          borderRadius: "50%",
          background: ST[pin.stream].c,
          border: "3.5px solid #fff",
          boxSizing: "border-box",
          boxShadow: "0 4px 10px rgba(80,55,30,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <StreamGlyph stream={pin.stream} size={30} />
      </div>
    </div>
  );
};

/** The search pill at the top of the map screen. */
export const MapTopBar: React.FC = () => {
  const copy = useCopy();
  return (
    <div
      style={{
        position: "absolute",
        top: 62,
        left: 16,
        right: 16,
        height: 50,
        borderRadius: 25,
        background: "rgba(255,255,255,0.94)",
        boxShadow: "0 6px 18px rgba(150,118,96,0.18)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 18px",
        fontFamily: FONT,
      }}
    >
      <svg width={18} height={18} viewBox="0 0 24 24">
        <circle cx={10.5} cy={10.5} r={6.5} stroke={S.sec} strokeWidth={2.4} fill="none" />
        <path d="M15.5 15.5 20 20" stroke={S.sec} strokeWidth={2.4} strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: 16, fontWeight: 600, color: S.sec }}>{copy.map.search}</span>
    </div>
  );
};

/** You-are-here dot. */
export const HereDot: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const frame = useCurrentFrame();
  const t = (frame % 40) / 40;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 10,
        top: y - 10,
        width: 20,
        height: 20,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "#4C8DF6",
          opacity: (1 - t) * 0.35,
          scale: String(1 + t * 1.8),
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "#4C8DF6",
          border: "3.5px solid #fff",
          boxSizing: "border-box",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
};
