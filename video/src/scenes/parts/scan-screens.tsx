// The app's scan flow, redrawn for the film at 390×844 (inside <Phone>):
// the camera (ScanCameraScreen) and the reading screen (ScanProgress).
// Everything takes explicit frame numbers so the scene can choreograph it.
import { interpolate } from "remotion";
import { clamp, EASE_IN_OUT, EASE_OUT } from "../../kit/kit";
import { FONT, S, ST } from "../../theme";
import { PaperPage, PAGE_H, PAGE_W } from "./problem-paper";
import { useCopy } from "../../copy";

export const SCREEN_W = 390;
export const SCREEN_H = 844;

// Frame guide, as in the app: insets.top + 84 … insets.bottom + 236.
const FRAME_TOP = 47 + 84;
const FRAME_BOTTOM = SCREEN_H - (34 + 236);
const FRAME_CX = SCREEN_W / 2;
const FRAME_CY = (FRAME_TOP + FRAME_BOTTOM) / 2;
const SHOT_PAPER_W = 292;

/**
 * What the camera sees: the page pinned to a dim wall. `t` is the
 * handheld time; `settle` 0–1 brings the page from askew into the guides.
 */
export const CameraFeed: React.FC<{ t: number; settle: number }> = ({ t, settle }) => {
  const s = settle;
  const jx = Math.sin(t / 7.3) * 2.2 + Math.sin(t / 3.1) * 0.8;
  const jy = Math.cos(t / 8.1) * 2 + Math.sin(t / 2.7) * 0.7;
  const h = (SHOT_PAPER_W * PAGE_H) / PAGE_W;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#2a2521" }}>
      <div
        style={{
          position: "absolute",
          inset: -60,
          background: "radial-gradient(70% 55% at 50% 42%, #7a6e62 0%, #574d44 45%, #2e2823 100%)",
          translate: `${jx * 0.6}px ${jy * 0.6}px`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: FRAME_CX - SHOT_PAPER_W / 2,
          top: FRAME_CY - h / 2,
          width: SHOT_PAPER_W,
          height: h,
          translate: `${jx + (1 - s) * 46}px ${jy + (1 - s) * -38}px`,
          rotate: `${1.2 + (1 - s) * 9}deg`,
          scale: String(1 + (1 - s) * 0.28),
          filter: "brightness(0.9) saturate(0.92)",
        }}
      >
        <PaperPage width={SHOT_PAPER_W} pin={1} shadow={false} />
      </div>
      {/* vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(90% 70% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)" }} />
    </div>
  );
};

const Round: React.FC<{ size?: number; children: React.ReactNode; light?: boolean; style?: React.CSSProperties }> = ({
  size = 44,
  children,
  light,
  style,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 99,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: light ? "#fff" : "rgba(20,18,16,0.5)",
      border: light ? "none" : "1px solid rgba(255,255,255,0.14)",
      boxSizing: "border-box",
      ...style,
    }}
  >
    {children}
  </div>
);

const icon = (d: React.ReactNode, size: number) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

/**
 * The camera screen. `f` is the scene frame; `shot` the frame the shutter
 * fires; `tickPress` the frame the tick is tapped.
 */
export const CameraScreen: React.FC<{ f: number; shot: number; tickPress: number; settleFrom: number; settleTo: number }> = ({
  f,
  shot,
  tickPress,
  settleFrom,
  settleTo,
}) => {
  const copy = useCopy();
  const t = Math.min(f, shot);
  const settle = interpolate(f, [settleFrom, settleTo], [0, 1], { ...clamp, easing: EASE_OUT });
  const press = interpolate(f, [shot - 4, shot, shot + 6], [1, 0.82, 1], clamp);
  const after = f >= shot;
  const thumbIn = interpolate(f, [shot + 3, shot + 11], [0, 1], { ...clamp, easing: EASE_OUT });
  const tickIn = interpolate(f, [shot + 6, shot + 10, shot + 14], [0, 1.18, 1], clamp);
  const tickScale = interpolate(f, [tickPress - 3, tickPress, tickPress + 4], [1, 0.88, 1], clamp);
  const corner = (pos: React.CSSProperties, r: string) => (
    <div style={{ position: "absolute", width: 34, height: 34, borderColor: "#fff", borderStyle: "solid", borderWidth: 0, ...pos, [r]: 18 }} />
  );
  const guidePulse = 1 + Math.sin(f / 5) * 0.012 * (1 - settle);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#000", fontFamily: FONT }}>
      <CameraFeed t={t} settle={settle} />

      {/* Frame guide */}
      <div style={{ position: "absolute", left: 28, right: 28, top: FRAME_TOP, height: FRAME_BOTTOM - FRAME_TOP, scale: String(guidePulse) }}>
        {corner({ top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }, "borderTopLeftRadius")}
        {corner({ top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }, "borderTopRightRadius")}
        {corner({ bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }, "borderBottomLeftRadius")}
        {corner({ bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }, "borderBottomRightRadius")}
      </div>

      {/* Top bar */}
      <div style={{ position: "absolute", top: 59, left: 20, right: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Round>{icon(<path d="M6 6l12 12M18 6 6 18" stroke="#fff" strokeWidth={2} />, 16)}</Round>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", letterSpacing: 1.4 }}>{copy.scan.topTitle}</div>
        <Round>{icon(<path d="M13 3 5.5 13.2h5.6L10 21l7.5-10.2h-5.6L13 3Z" stroke="#fff" strokeWidth={1.9} />, 18)}</Round>
      </div>

      {/* Bottom panel */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingTop: 16,
          paddingBottom: 34 + 28,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ padding: "8px 16px", borderRadius: 99, background: "rgba(20,18,16,0.65)", fontSize: 13, fontWeight: 700, color: "#fff" }}>
          {after ? copy.scan.onePage : copy.scan.hint}
        </div>
        <div style={{ height: 78, alignSelf: "stretch", paddingLeft: 24, paddingTop: 8 }}>
          {after && (
            <div
              style={{
                width: 52,
                height: 66,
                borderRadius: 10,
                border: "2px solid #fff",
                overflow: "hidden",
                background: "#3b342e",
                position: "relative",
                opacity: thumbIn,
                scale: String(0.6 + 0.4 * thumbIn),
                translate: `${(1 - thumbIn) * 120}px ${(1 - thumbIn) * -60}px`,
              }}
            >
              <div style={{ position: "absolute", left: 5, top: 5 }}>
                <PaperPage width={38} shadow={false} />
              </div>
            </div>
          )}
        </div>
        <div style={{ alignSelf: "stretch", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 36px", marginTop: 8 }}>
          <Round size={54}>
            {icon(
              <>
                <rect x={3.5} y={4.5} width={17} height={15} rx={3} stroke="#fff" strokeWidth={1.9} />
                <circle cx={9} cy={9.5} r={1.6} stroke="#fff" strokeWidth={1.7} />
                <path d="m4 17 4.6-4.3a1.5 1.5 0 0 1 2 0L15 16.5l1.9-1.7a1.5 1.5 0 0 1 2 0l1.6 1.5" stroke="#fff" strokeWidth={1.9} />
              </>,
              22,
            )}
          </Round>
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: 99,
              border: "4px solid #fff",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              scale: String(0.94 + 0.06 * press),
            }}
          >
            <div style={{ width: 62, height: 62, borderRadius: 99, background: "#fff", scale: String(press) }} />
          </div>
          <div style={{ width: 54, height: 54, position: "relative" }}>
            {after && (
              <Round size={54} light style={{ scale: String(tickIn * tickScale), position: "relative" }}>
                {icon(<path d="M5 12.5 10 17.5 19 7" stroke={S.ink} strokeWidth={2.6} />, 22)}
                <div
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    minWidth: 20,
                    height: 20,
                    borderRadius: 99,
                    background: ST.kehricht.c,
                    fontSize: 11,
                    fontWeight: 800,
                    color: S.ink,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  1
                </div>
              </Round>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SEGMENT_COLORS = [ST.kehricht.c, ST.papier.c, ST.gruengut.c];

// Reading screen geometry (fixed so the photo can be framed exactly).
const CARD_TOP = 64;
const CARD_X = 24;
const CARD_W = SCREEN_W - CARD_X * 2;
const CARD_H = 596;

/**
 * The reading screen. `f` is frames since it appeared (scan line time);
 * `seg` are the [start, end] frames (scene time, via `sf`) of each segment.
 */
export const ReadingScreen: React.FC<{ sf: number; sweepFrom: number; segs: Array<[number, number]> }> = ({ sf, sweepFrom, segs }) => {
  const copy = useCopy();
  // Scan line: down and back, eased like the app's loop (1.8 s each way).
  const sweep = sweepAt(sf, sweepFrom);
  const bandTop = interpolate(sweep, [0, 1], [-0.12, 0.88]) * CARD_H;

  const stage = sf < segs[1][0] ? 0 : sf < segs[2][0] ? 1 : 2;
  const switchAt = stage === 0 ? -99 : segs[stage][0];
  const fade = interpolate(sf, [switchAt, switchAt + 8], [0, 1], clamp);

  // The captured photo, framed on the page like the app's "cover".
  const scale = 1.06;
  const photoLeft = CARD_W / 2 - FRAME_CX * scale;
  const photoTop = CARD_H / 2 - FRAME_CY * scale;

  return (
    <div style={{ position: "absolute", inset: 0, background: S.bg, fontFamily: FONT }}>
      <div style={{ position: "absolute", left: CARD_X, top: CARD_TOP, width: CARD_W, height: CARD_H, borderRadius: 28, overflow: "hidden", background: "#E9E1D8" }}>
        <div style={{ position: "absolute", left: photoLeft, top: photoTop, width: SCREEN_W, height: SCREEN_H, scale: String(scale), transformOrigin: "0 0" }}>
          <CameraFeed t={45} settle={1} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "rgba(245,242,247,0.18)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: bandTop, height: 90, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, background: "linear-gradient(rgba(230,154,128,0), rgba(230,154,128,0.32))" }} />
          <div style={{ height: 3, background: ST.kehricht.c, boxShadow: `0 0 12px ${ST.kehricht.c}` }} />
        </div>
      </div>

      <div style={{ position: "absolute", left: 28, right: 28, top: CARD_TOP + CARD_H + 24 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {segs.map(([a, b], i) => {
            const fill = interpolate(sf, [a, b], [0, 1], { ...clamp, easing: EASE_OUT });
            return (
              <div key={i} style={{ flex: 1, height: 6, borderRadius: 99, background: "#E6DED6", overflow: "hidden" }}>
                <div style={{ width: `${fill * 100}%`, height: "100%", borderRadius: 99, background: SEGMENT_COLORS[i] }} />
              </div>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 18,
            minHeight: 58,
            fontSize: 22,
            fontWeight: 800,
            color: S.ink,
            letterSpacing: -0.5,
            opacity: fade,
            translate: `0px ${(1 - fade) * 6}px`,
          }}
        >
          {copy.scan.stages[stage]}
        </div>
        <div style={{ textAlign: "center", marginTop: 4, fontSize: 15, fontWeight: 800, color: S.sec }}>{copy.scan.cancel}</div>
      </div>
    </div>
  );
};

/** Where the scan line is (0 top … 1 bottom of the photo), for his eyes. */
export const sweepAt = (sf: number, sweepFrom: number) => {
  const tt = Math.max(0, sf - sweepFrom);
  const leg = Math.floor(tt / 54);
  const e = EASE_IN_OUT((tt % 54) / 54);
  return leg % 2 === 0 ? e : 1 - e;
};
