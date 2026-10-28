// 35–39 s. "Share it in one tap." Recyclops presents the live share card;
// the QR code builds in, Share is tapped, and dotted lines run out to three
// neighbours' houses, which light up one by one.
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption, Scene, Sfx, Split, SubCaption, clamp, EASE_IN_OUT, EASE_OUT, useVertical } from "../kit/kit";
import { Recyclops } from "../kit/Recyclops";
import { S, ST } from "../theme";
import type { WasteStreamId } from "../app/colors";
import { useCopy } from "../copy";
import { QrCode } from "./parts/share-qr";
import { House } from "./parts/share-house";

/** Stage in design units, laid out per format; scaled to fit. */
type Layout = {
  w: number;
  h: number;
  card: { x: number; y: number };
  houses: { x: number; y: number }[];
  rec: { x: number; y: number; size: number };
};
const CARD_W = 340;
const CARD_H = 470;
const HOUSE = 150;
const LAYOUT_H: Layout = {
  w: 820,
  h: 820,
  card: { x: 262, y: 150 },
  houses: [
    { x: 96, y: 112 },
    { x: 730, y: 128 },
    { x: 724, y: 690 },
  ],
  rec: { x: 50, y: 548, size: 248 },
};
const LAYOUT_V: Layout = {
  w: 800,
  h: 1140,
  card: { x: 230, y: 250 },
  houses: [
    { x: 110, y: 96 },
    { x: 690, y: 120 },
    { x: 680, y: 1000 },
  ],
  rec: { x: 64, y: 770, size: 300 },
};

const HOUSE_STREAMS: { stream: WasteStreamId; at: number }[] = [
  { stream: "karton", at: 62 },
  { stream: "kehricht", at: 77 },
  { stream: "gruengut", at: 92 },
];
const LINE_FRAMES = 11;
const TAP = 48;
const QR_START = 18;

const ShareIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 12v6.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V12" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
  </svg>
);

const LinkIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
    />
  </svg>
);

const ShareCard: React.FC = () => {
  const frame = useCurrentFrame();
  const copy = useCopy();
  const { fps } = useVideoConfig();
  const badge = spring({ frame: frame - 40, fps, config: { damping: 12, stiffness: 170, mass: 0.7 } });
  const pulse = frame > 40 ? (Math.sin((frame - 40) / 4) + 1) / 2 : 0;
  // The Share pill gets pressed: a quick dip and a ripple.
  const press = interpolate(frame, [TAP - 3, TAP, TAP + 6], [0, 1, 0], clamp);
  const ripple = interpolate(frame, [TAP, TAP + 14], [0, 1], { ...clamp, easing: EASE_OUT });
  const pills = spring({ frame: frame - 30, fps, config: { damping: 14, stiffness: 150 } });

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 34,
        background: ST.gruengut.soft,
        boxShadow: "0 30px 70px rgba(60,80,40,0.22), 0 6px 18px rgba(60,80,40,0.12)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "22px 24px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, height: 22, opacity: badge, scale: String(0.7 + badge * 0.3) }}>
        <div style={{ position: "relative", width: 11, height: 11 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 99, background: "#5BA86B" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: 99, background: "#5BA86B", opacity: 0.35 * (1 - pulse), scale: String(1 + pulse * 1.4) }} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: ST.gruengut.ink, letterSpacing: -0.2 }}>{copy.share.live}</div>
      </div>
      <div style={{ marginTop: 16, padding: 16, borderRadius: 26, background: "#fff" }}>
        <QrCode size={236} start={QR_START} />
      </div>
      <div style={{ marginTop: 13, fontSize: 15, fontWeight: 700, color: ST.gruengut.ink, opacity: 0.75 * badge }}>{copy.share.link}</div>
      <div style={{ display: "flex", gap: 10, marginTop: 17, width: "100%", opacity: pills, translate: `0px ${(1 - pills) * 14}px` }}>
        <div
          style={{
            flex: 1,
            height: 50,
            borderRadius: 99,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 17,
            fontWeight: 800,
            color: S.ink,
          }}
        >
          <LinkIcon color={S.ink} size={18} />
          {copy.share.copy}
        </div>
        <div
          style={{
            flex: 1,
            height: 50,
            borderRadius: 99,
            background: S.ink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 17,
            fontWeight: 800,
            color: "#fff",
            position: "relative",
            scale: String(1 - press * 0.09),
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 99,
              border: `3px solid ${ST.gruengut.c}`,
              scale: String(1 + ripple * 0.35),
              opacity: ripple > 0 ? 1 - ripple : 0,
            }}
          />
          <ShareIcon color="#fff" size={18} />
          {copy.share.share}
        </div>
      </div>
    </div>
  );
};

const Stage: React.FC<{ L: Layout }> = ({ L }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card lands with a slight tilt and overshoot.
  const card = spring({ frame: frame - 6, fps, config: { damping: 11, stiffness: 120, mass: 0.8 } });

  // Recyclops pops up from below, ta-das, then presents the card.
  const pop = spring({ frame: frame - 4, fps, config: { damping: 10, stiffness: 140, mass: 0.7 } });
  const squash = 1 - 0.12 * interpolate(frame, [10, 13, 18], [0, 1, 0], clamp);
  const taDa = interpolate(frame, [10, 16, 28, 36], [0, 1, 1, 0], { ...clamp, easing: EASE_IN_OUT });
  const present = interpolate(frame, [28, 38], [0, 1], { ...clamp, easing: EASE_OUT });
  const cheer = interpolate(frame, [96, 102, 112, 120], [0, 1, 1, 0.6], { ...clamp, easing: EASE_IN_OUT });
  const armBob = Math.sin(frame / 5) * 5 * present;
  const armL = 18 + taDa * 130 + cheer * 100;
  const armR = 18 + taDa * 132 + present * (1 - taDa) * 106 + armBob * (1 - cheer);
  // Hands flick up a touch when he taps the Share pill.
  const tapNod = interpolate(frame, [TAP - 4, TAP, TAP + 6], [0, 1, 0], clamp);

  // Look: card, then each house as it lights.
  const lookIdx = interpolate(
    frame,
    [36, HOUSE_STREAMS[0].at - 8, HOUSE_STREAMS[0].at - 2, HOUSE_STREAMS[1].at - 8, HOUSE_STREAMS[1].at - 2, HOUSE_STREAMS[2].at - 8, HOUSE_STREAMS[2].at - 2, 100, 106],
    [0, 0, 1, 1, 2, 2, 3, 3, 0],
    clamp,
  );
  // Look at the QR, then each house as it lights (unit vector from his eye).
  const eye = { x: L.rec.x + L.rec.size / 2, y: L.rec.y + L.rec.size * 0.42 };
  const LOOKS = [{ x: L.card.x + CARD_W / 2, y: L.card.y + 170 }, ...L.houses].map((t) => {
    const dx = t.x - eye.x;
    const dy = t.y - eye.y;
    const len = Math.hypot(dx, dy);
    return [dx / len, dy / len] as const;
  });
  const lo = Math.floor(lookIdx);
  const hi = Math.min(LOOKS.length - 1, lo + 1);
  const fr = EASE_IN_OUT(lookIdx - lo);
  const lookX = LOOKS[lo][0] + (LOOKS[hi][0] - LOOKS[lo][0]) * fr;
  const lookY = LOOKS[lo][1] + (LOOKS[hi][1] - LOOKS[lo][1]) * fr;
  const happy = Math.max(taDa, cheer);
  const browKick = HOUSE_STREAMS.reduce((a, h) => a + interpolate(frame, [h.at - 1, h.at + 3, h.at + 12], [0, 1, 0], clamp), 0);

  const HOUSES = HOUSE_STREAMS.map((h, i) => ({ ...h, ...L.houses[i] }));
  const CARD_C = { x: L.card.x + CARD_W / 2, y: L.card.y + CARD_H / 2 };

  return (
    <div style={{ width: L.w, height: L.h, position: "relative" }}>
      {/* dotted lines out to the houses */}
      <svg width={L.w} height={L.h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {HOUSES.map((h, i) => {
          const p = interpolate(frame, [h.at - LINE_FRAMES, h.at], [0, 1], { ...clamp, easing: EASE_OUT });
          if (p <= 0) return null;
          const dx = h.x - CARD_C.x;
          const dy = h.y - CARD_C.y;
          const len = Math.hypot(dx, dy);
          // Start at the card's edge, stop at the tile's rim.
          const s0 = Math.min(CARD_W / 2 / Math.abs(dx), CARD_H / 2 / Math.abs(dy)) + 14 / len;
          const s1 = 1 - (HOUSE / 2 + 10) / len;
          const s = s0 + (s1 - s0) * p;
          const x2 = CARD_C.x + dx * s;
          const y2 = CARD_C.y + dy * s;
          return (
            <g key={i}>
              <line
                x1={CARD_C.x + dx * s0}
                y1={CARD_C.y + dy * s0}
                x2={x2}
                y2={y2}
                stroke={ST[h.stream].ink}
                strokeOpacity={0.5}
                strokeWidth={6}
                strokeDasharray="0.1 16"
                strokeLinecap="round"
              />
              <circle cx={x2} cy={y2} r={9 * (p < 1 ? 1 : interpolate(frame, [h.at, h.at + 5], [1, 0], clamp))} fill={ST[h.stream].c} />
            </g>
          );
        })}
      </svg>

      {HOUSES.map((h, i) => {
        const appear = spring({ frame: frame - 10 - i * 4, fps, config: { damping: 14, stiffness: 150 } });
        const lit = spring({ frame: frame - h.at, fps, config: { damping: 9, stiffness: 190, mass: 0.6 } });
        const ring = interpolate(frame, [h.at, h.at + 16], [0, 1], { ...clamp, easing: EASE_OUT });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: h.x - HOUSE / 2,
              top: h.y - HOUSE / 2,
              opacity: appear,
              scale: String(0.6 + appear * 0.4),
              translate: `0px ${-Math.sin(Math.min(1, lit) * Math.PI) * 14}px`,
            }}
          >
            <House stream={h.stream} lit={lit} ring={ring} size={HOUSE} />
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: L.card.x,
          top: L.card.y,
          opacity: interpolate(card, [0, 0.3], [0, 1], clamp),
          scale: String(0.55 + card * 0.45),
          rotate: `${(1 - card) * -10}deg`,
          translate: `0px ${(1 - card) * 120}px`,
        }}
      >
        <ShareCard />
      </div>

      {/* Recyclops, presenting the card from its lower-left corner */}
      <div
        style={{
          position: "absolute",
          left: L.rec.x,
          top: L.rec.y,
          translate: `0px ${(1 - pop) * 320}px`,
          rotate: `${(1 - pop) * -12}deg`,
        }}
      >
        <Recyclops
          size={L.rec.size}
          lean={-taDa * 3 + present * 4 - cheer * 6}
          pose={{
            squash: squash + taDa * 0.04,
            armL,
            armR: armR + tapNod * 12,
            happy,
            smile: 0.6 + happy * 0.4,
            mouthOpen: taDa * 0.6 + cheer * 0.5,
            browUp: happy * 0.4 + Math.min(1, browKick) * 0.7,
            lookX: happy > 0.5 ? 0 : lookX,
            lookY: happy > 0.5 ? 0 : lookY,
          }}
        />
      </div>
    </div>
  );
};

export const Share: React.FC = () => {
  const vertical = useVertical();
  const copy = useCopy();
  const L = vertical ? LAYOUT_V : LAYOUT_H;
  const scale = vertical ? 1.15 : 1.04;
  return (
    <Scene name="Share">
      <Split
        caption={
          <div>
            <Caption text={copy.share.caption.text} from={4} accent={copy.share.caption.accent} accentColor={ST.gruengut.ink} />
            <SubCaption text={copy.share.sub} from={56} />
          </div>
        }
        visual={
          <div style={{ width: L.w * scale, height: L.h * scale, position: "relative", flex: "0 0 auto" }}>
            <div style={{ position: "absolute", left: 0, top: 0, scale: String(scale), transformOrigin: "0 0" }}>
              <Stage L={L} />
            </div>
          </div>
        }
      />

      <Sfx at={3} src="swoosh.wav" volume={0.35} />
      <Sfx at={13} src="drop_002.ogg" volume={0.5} />
      <Sfx at={QR_START + 2} src="tick_001.ogg" volume={0.4} />
      <Sfx at={QR_START + 14} src="tick_002.ogg" volume={0.35} />
      <Sfx at={TAP} src="click_001.ogg" volume={0.6} />
      <Sfx at={HOUSE_STREAMS[0].at} src="pluck_001.ogg" volume={0.55} />
      <Sfx at={HOUSE_STREAMS[1].at} src="pluck_002.ogg" volume={0.55} />
      <Sfx at={HOUSE_STREAMS[2].at} src="pluck_001.ogg" volume={0.6} />
    </Scene>
  );
};
