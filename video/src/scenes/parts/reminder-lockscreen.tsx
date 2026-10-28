// The lock screen for the Reminder scene: dusk wallpaper in the app's
// palette, a clock that ticks over to 20:00, and stacked notifications.
// Everything is in the phone's 390×844 screen coordinates.

import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandMark } from "../../app/BrandMark";
import { StreamGlyph } from "../../app/StreamGlyph";
import type { WasteStreamId } from "../../app/colors";
import { clamp, EASE_IN_OUT } from "../../kit/kit";
import { FONT, S, ST } from "../../theme";
import { useCopy } from "../../copy";

const CLOCK_INK = ST.papier.ink;

export const NOTIF_H = 86;
export const NOTIF_GAP = 8;

/** Soft dusk gradient with two blurred colour blobs. */
const Wallpaper: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 40) * 10;
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${ST.papier.c} 0%, ${ST.textilien.soft} 42%, ${ST.kehricht.soft} 72%, ${ST.karton.soft} 100%)` }}>
      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          left: -120 + drift,
          top: 470,
          borderRadius: "50%",
          background: ST.gruengut.c,
          opacity: 0.55,
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          right: -110 - drift,
          top: 330,
          borderRadius: "50%",
          background: ST.verpackung.c,
          opacity: 0.45,
          filter: "blur(60px)",
        }}
      />
    </div>
  );
};

/** Date and big clock; the time rolls from 19:59 to 20:00 at `tickAt`. */
const Clock: React.FC<{ tickAt: number }> = ({ tickAt }) => {
  const frame = useCurrentFrame();
  const copy = useCopy();
  const t = interpolate(frame, [tickAt, tickAt + 8], [0, 1], { ...clamp, easing: EASE_IN_OUT });
  const digit = (text: string, shown: number, dir: 1 | -1) => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        textAlign: "center",
        opacity: shown,
        translate: `0px ${(1 - shown) * 40 * dir}px`,
        filter: `blur(${(1 - shown) * 4}px)`,
      }}
    >
      {text}
    </div>
  );
  return (
    <div style={{ position: "absolute", top: 86, left: 0, right: 0, color: CLOCK_INK, textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 700, opacity: 0.75, letterSpacing: -0.2 }}>{copy.reminder.date}</div>
      <div
        style={{
          position: "relative",
          height: 108,
          marginTop: 2,
          fontSize: 104,
          fontWeight: 800,
          letterSpacing: -4,
          lineHeight: "108px",
          overflow: "hidden",
        }}
      >
        {digit("19:59", 1 - t, -1)}
        {digit("20:00", t, 1)}
      </div>
    </div>
  );
};

/** One notification card: app chip, name, "now", body with a stream glyph. */
const Notification: React.FC<{ stream: WasteStreamId; title: string; body: string; now: string }> = ({ stream, title, body, now }) => (
  <div
    style={{
      height: NOTIF_H,
      borderRadius: 24,
      background: "rgba(255,255,255,0.9)",
      boxShadow: "0 10px 28px rgba(60,40,70,0.16)",
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "0 14px",
      fontFamily: FONT,
    }}
  >
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: 12,
        background: S.card,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        flex: "0 0 auto",
      }}
    >
      <BrandMark size={36} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: S.ink, letterSpacing: -0.2 }}>{title}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: S.sec }}>{now}</span>
      </div>
      <div style={{ fontSize: 17.5, fontWeight: 600, color: S.ink, marginTop: 3, letterSpacing: -0.1 }}>{body}</div>
    </div>
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        background: ST[stream].soft,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
    >
      <StreamGlyph stream={stream} size={30} />
    </div>
  </div>
);

/** A notification that drops in from above with a bounce at `at`. */
const useDrop = (at: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping: 11, stiffness: 170, mass: 0.8 } });
};

export const LockScreen: React.FC<{ tickAt: number; firstAt: number; secondAt: number; nudge: number }> = ({
  tickAt,
  firstAt,
  secondAt,
  nudge,
}) => {
  const copy = useCopy();
  const a = useDrop(firstAt);
  const b = useDrop(secondAt);
  const TOP = 290;
  const step = NOTIF_H + NOTIF_GAP;
  // When the second arrives it takes the top slot; the first slides down.
  const push = b * step;
  const settle = (s: number) => ({
    opacity: interpolate(s, [0, 0.2], [0, 1], clamp),
    translate: `0px ${(1 - s) * -120}px`,
    scale: String(interpolate(s, [0, 1], [0.86, 1])),
  });
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Wallpaper />
      {/* status bar */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 32,
          display: "flex",
          gap: 6,
          alignItems: "center",
          color: CLOCK_INK,
          opacity: 0.8,
        }}
      >
        <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 12 }}>
          {[5, 7, 9, 11].map((h) => (
            <div key={h} style={{ width: 3, height: h, borderRadius: 1, background: CLOCK_INK }} />
          ))}
        </div>
        <div style={{ width: 24, height: 12, borderRadius: 4, border: `1.5px solid ${CLOCK_INK}`, padding: 1.5, boxSizing: "border-box" }}>
          <div style={{ width: "70%", height: "100%", borderRadius: 2, background: CLOCK_INK }} />
        </div>
      </div>
      <Clock tickAt={tickAt} />

      <div style={{ position: "absolute", left: 12, right: 12, top: TOP, translate: `${nudge}px 0px` }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: push, ...settle(a) }}>
          <Notification stream="papier" title={copy.brand} body={copy.reminder.first} now={copy.reminder.now} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, ...settle(b) }}>
          <Notification stream="karton" title={copy.brand} body={copy.reminder.second} now={copy.reminder.now} />
        </div>
      </div>

      {/* flashlight + camera, home indicator */}
      {[42, 390 - 42 - 50].map((x) => (
        <div
          key={x}
          style={{
            position: "absolute",
            left: x,
            bottom: 52,
            width: 50,
            height: 50,
            borderRadius: 25,
            background: "rgba(255,255,255,0.45)",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 130,
          width: 130,
          height: 5,
          borderRadius: 3,
          background: CLOCK_INK,
          opacity: 0.6,
        }}
      />
    </div>
  );
};
