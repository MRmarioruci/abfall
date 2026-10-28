// A neighbour's house (the house from the app's NeighboursArt) in a round
// tile. Starts dim; `lit` 0→1 fills it with its stream's tint, warms the
// window, pops a ring and a little "got the calendar" badge.
import { interpolateColors } from "remotion";
import { S, ST } from "../../theme";
import type { WasteStreamId } from "../../app/colors";

export const House: React.FC<{ stream: WasteStreamId; lit: number; ring: number; size: number }> = ({ stream, lit, ring, size }) => {
  const t = ST[stream];
  const l = Math.max(0, Math.min(1, lit));
  const body = interpolateColors(l, [0, 1], ["#E4E0E7", t.c]);
  const roof = interpolateColors(l, [0, 1], ["#B9B3BD", t.ink]);
  const tile = interpolateColors(l, [0, 1], ["rgba(255,255,255,0.55)", t.soft]);
  const win = interpolateColors(l, [0, 1], ["#CFCAD3", "#FFE08A"]);
  return (
    <div style={{ width: size, height: size, position: "relative", scale: String(0.86 + lit * 0.14) }}>
      {/* ping ring */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 999,
          border: `4px solid ${t.c}`,
          scale: String(1 + ring * 0.55),
          opacity: ring > 0 && ring < 1 ? (1 - ring) * 0.9 : 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 999,
          background: tile,
          boxShadow: l > 0 ? `0 ${14 * l}px ${34 * l}px rgba(80,60,40,${0.16 * l})` : undefined,
        }}
      />
      <svg width={size} height={size} viewBox="-10 -12 44 44" style={{ position: "absolute", inset: 0 }}>
        <path d="M0 10l12-10 12 10v14a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V10Z" fill={body} />
        <path d="M-2 11l14-12 14 12" stroke={roof} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x={9} y={15} width={6} height={9} rx={1.5} fill={roof} opacity={0.7} />
        <rect x={3} y={13} width={4.4} height={4.4} rx={1} fill={win} />
        <rect x={16.6} y={13} width={4.4} height={4.4} rx={1} fill={win} />
      </svg>
      {/* badge: a tiny calendar with a tick */}
      <div
        style={{
          position: "absolute",
          right: size * 0.02,
          top: size * 0.02,
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: 999,
          background: "#fff",
          boxShadow: "0 4px 10px rgba(80,60,40,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          scale: String(Math.max(0, lit)),
        }}
      >
        <svg width={size * 0.17} height={size * 0.17} viewBox="0 0 20 20">
          <path d="M4 10.5l4 4 8-9" stroke={S.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
    </div>
  );
};
