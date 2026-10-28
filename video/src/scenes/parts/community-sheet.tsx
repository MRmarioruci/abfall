// Community scene: the app's community calendars sheet (after
// src/components/CommunityCalendarsSheet.tsx), drawn on a 390×844 phone
// screen and driven by frame numbers passed in from the scene.

import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, EASE_OUT } from "../../kit/kit";
import { FONT, S, ST } from "../../theme";
import type { WasteStreamId } from "../../app/colors";
import { StreamGlyph } from "../../app/StreamGlyph";
import { useCopy, type CommunityRow } from "../../copy";

export const SCREEN = { w: 390, h: 844 };
export const SHEET_TOP = 118;
const PAD = 20;
export const SEARCH_TOP = SHEET_TOP + 104;
export const ROW_TOP = SEARCH_TOP + 52 + 14;
export const ROW_H = 68;
export const ROW_GAP = 10;
export const rowY = (i: number) => ROW_TOP + i * (ROW_H + ROW_GAP);

// Preview layout.
const PREVIEW_TITLE_TOP = SHEET_TOP + 28;
const SOFT_TOP = PREVIEW_TITLE_TOP + 78;
const SOFT_H = 162;
export const PILL_TOP = SOFT_TOP + SOFT_H + 16;
export const PILL_H = 54;

type Row = CommunityRow;

const PREVIEW_TYPES: WasteStreamId[] = ["kehricht", "papier", "karton", "glas", "gruengut", "metall"];

// Same per-place tint as the app.
const ROW_TINTS: WasteStreamId[] = ["papier", "gruengut", "karton", "kehricht", "glas", "textilien", "metall", "verpackung"];
const tintFor = (key: string) => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return ST[ROW_TINTS[Math.abs(h) % ROW_TINTS.length]];
};

const UserIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx={12} cy={8.5} r={3.7} stroke={color} strokeWidth={2.2} />
    <path d="M5 20a7 7 0 0 1 14 0" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
  </svg>
);

const PinIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
    <circle cx={12} cy={10} r={2.3} stroke={color} strokeWidth={2.2} />
  </svg>
);

export const CheckIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 12.5 10 17.5 19 7" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export type SheetTimes = {
  typeFrom: number;
  typeEvery: number;
  rowsFrom: number;
  rowsEvery: number;
  tapRow: number;
  toPreview: number;
  chipsFrom: number;
  press: number;
  toast: number;
};

/** A soft finger: a dot that appears, presses and leaves a ripple. */
export const Finger: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < -8 || t > 22) return null;
  const appear = interpolate(t, [-8, -2], [0, 1], { ...clamp, easing: EASE_OUT });
  const leave = interpolate(t, [8, 16], [1, 0], clamp);
  const press = interpolate(t, [-2, 0, 4], [1, 0.8, 1], clamp);
  const ring = interpolate(t, [0, 18], [0, 1], { ...clamp, easing: EASE_OUT });
  return (
    <>
      {t >= 0 && (
        <div
          style={{
            position: "absolute",
            left: x - 60,
            top: y - 60,
            width: 120,
            height: 120,
            borderRadius: 99,
            border: "3px solid rgba(33,31,28,0.35)",
            scale: String(0.3 + ring * 0.9),
            opacity: 1 - ring,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: x - 24,
          top: y - 24,
          width: 48,
          height: 48,
          borderRadius: 99,
          background: "rgba(33,31,28,0.22)",
          border: "2px solid rgba(255,255,255,0.7)",
          opacity: appear * leave,
          scale: String(press * interpolate(appear, [0, 1], [1.4, 1])),
        }}
      />
    </>
  );
};

const ResultRow: React.FC<{ row: Row; pressed: number; ripple: number; rippleX: number }> = ({ row, pressed, ripple, rippleX }) => {
  const copy = useCopy();
  const tint = tintFor(row.title);
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 14,
        height: ROW_H,
        background: "#fff",
        borderRadius: 22,
        padding: "0 14px",
        overflow: "hidden",
        scale: String(1 - pressed * 0.025),
      }}
    >
      {ripple > 0 && ripple < 1 && (
        <div
          style={{
            position: "absolute",
            left: rippleX - 200,
            top: ROW_H / 2 - 200,
            width: 400,
            height: 400,
            borderRadius: 999,
            background: tint.soft,
            scale: String(ripple),
            opacity: interpolate(ripple, [0, 0.7, 1], [0.9, 0.7, 0]),
          }}
        />
      )}
      <div
        style={{
          position: "relative",
          width: 44,
          height: 44,
          borderRadius: 15,
          background: tint.soft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 800,
          color: tint.ink,
          flexShrink: 0,
        }}
      >
        {row.mark}
      </div>
      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: S.ink, letterSpacing: -0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {row.title}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: S.sec, marginTop: 2, whiteSpace: "nowrap" }}>
          {row.sub}
        </div>
      </div>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 10px",
          borderRadius: 99,
          background: ST.gruengut.soft,
          flexShrink: 0,
        }}
      >
        <UserIcon color={ST.gruengut.ink} size={12} />
        <div style={{ fontSize: 12.5, fontWeight: 800, color: ST.gruengut.ink }}>{copy.community.uses(row.uses)}</div>
      </div>
    </div>
  );
};

export const CommunitySheet: React.FC<{ T: SheetTimes }> = ({ T }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const copy = useCopy();
  const c = copy.community;
  const QUERY = c.query;
  const ROWS = c.rows;

  // Typing.
  const typed = Math.max(0, Math.min(QUERY.length, Math.floor((frame - T.typeFrom) / T.typeEvery) + 1));
  const typing = frame >= T.typeFrom - 6 && frame < T.typeFrom + QUERY.length * T.typeEvery + 4;
  const caretOn = typing || Math.floor(frame / 9) % 2 === 0;
  const focused = frame >= T.typeFrom - 8;

  // List → preview.
  const swap = interpolate(frame, [T.toPreview, T.toPreview + 12], [0, 1], { ...clamp, easing: EASE_OUT });

  const tapX = 150;
  const pressRow = interpolate(frame - T.tapRow, [0, 2, 8], [0, 1, 0], clamp);
  const ripple = interpolate(frame - T.tapRow, [0, 14], [0, 1], { ...clamp, easing: EASE_OUT });

  const pill = spring({ frame: frame - T.press - 3, fps, config: { damping: 9, stiffness: 260, mass: 0.5 } });
  const pillPress = frame < T.press ? 0 : frame < T.press + 3 ? interpolate(frame, [T.press, T.press + 3], [0, 1]) : 1 - pill;
  const added = frame >= T.press + 4;

  const toast = spring({ frame: frame - T.toast, fps, config: { damping: 12, stiffness: 170, mass: 0.7 } });

  const head = ROWS[0];
  const tint = tintFor(head.title);

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT }}>
      {/* the app behind the sheet, dimmed */}
      <div style={{ position: "absolute", inset: 0, background: S.bg }}>
        <div style={{ position: "absolute", left: 20, top: 62, fontSize: 28, fontWeight: 800, color: S.ink, letterSpacing: -0.8 }}>{c.homeTitle}</div>
        <div style={{ position: "absolute", left: 20, right: 20, top: 110, height: 300, borderRadius: 28, background: S.ink }} />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
      <div style={{ position: "absolute", left: 34, top: 18, fontSize: 15, fontWeight: 700, color: "#fff" }}>9:41</div>

      {/* sheet */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: SHEET_TOP,
          bottom: 0,
          background: "#F5F2F7",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", left: SCREEN.w / 2 - 20, top: 8, width: 40, height: 5, borderRadius: 3, background: S.ter }} />
      </div>

      {/* list view */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - swap, translate: `${-swap * 80}px 0px` }}>
        <div style={{ position: "absolute", left: PAD, right: PAD, top: SHEET_TOP + 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: S.ink, letterSpacing: -0.6 }}>{c.title}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: S.sec, marginTop: 4 }}>{c.subtitle}</div>
        </div>
        <div
          style={{
            position: "absolute",
            left: PAD,
            right: PAD,
            top: SEARCH_TOP,
            height: 52,
            borderRadius: 99,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 18px",
            boxShadow: focused ? `0 0 0 2px ${ST.gruengut.c}` : "none",
          }}
        >
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none">
            <circle cx={10.5} cy={10.5} r={6.5} stroke={S.sec} strokeWidth={2.2} />
            <path d="m15.5 15.5 4 4" stroke={S.sec} strokeWidth={2.2} strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 16, fontWeight: 700, color: typed > 0 ? S.ink : S.ter, display: "flex", alignItems: "center" }}>
            {typed > 0 ? QUERY.slice(0, typed) : focused ? "" : c.placeholder}
            {focused && (
              <div style={{ width: 2, height: 20, marginLeft: 1, borderRadius: 1, background: ST.gruengut.ink, opacity: caretOn ? 1 : 0 }} />
            )}
          </div>
        </div>
        {ROWS.map((r, i) => {
          const s = spring({ frame: frame - T.rowsFrom - i * T.rowsEvery, fps, config: { damping: 13, stiffness: 160, mass: 0.7 } });
          return (
            <div
              key={r.title}
              style={{
                position: "absolute",
                left: PAD,
                right: PAD,
                top: rowY(i),
                opacity: interpolate(s, [0, 0.3], [0, 1], clamp),
                translate: `0px ${(1 - s) * 40}px`,
              }}
            >
              <ResultRow row={r} pressed={i === 0 ? pressRow : 0} ripple={i === 0 ? ripple : 0} rippleX={tapX - PAD} />
            </div>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: rowY(3) + 14,
            textAlign: "center",
            fontSize: 14,
            fontWeight: 700,
            color: S.sec,
            opacity: spring({ frame: frame - T.rowsFrom - 3 * T.rowsEvery, fps }),
          }}
        >
          {c.scanOwn}
        </div>
        <Finger x={tapX} y={rowY(0) + ROW_H / 2} at={T.tapRow} />
      </div>

      {/* preview */}
      {swap > 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: swap, translate: `${(1 - swap) * 80}px 0px` }}>
          <div style={{ position: "absolute", left: PAD, right: PAD, top: PREVIEW_TITLE_TOP, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 99,
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <path d="M13 5l-7 7 7 7M7 12h12" stroke={S.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: S.ink, letterSpacing: -0.6, lineHeight: 1.1 }}>{head.title}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: S.sec, marginTop: 4 }}>
                {head.sub}
              </div>
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              left: PAD,
              right: PAD,
              top: SOFT_TOP,
              height: SOFT_H,
              borderRadius: 24,
              background: tint.soft,
              padding: 18,
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PREVIEW_TYPES.map((id, i) => {
                const s = spring({ frame: frame - T.chipsFrom - i * 3, fps, config: { damping: 10, stiffness: 200, mass: 0.6 } });
                return (
                  <div
                    key={id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "5px 12px 5px 5px",
                      borderRadius: 99,
                      background: "#fff",
                      opacity: interpolate(s, [0, 0.3], [0, 1], clamp),
                      scale: String(interpolate(s, [0, 1], [0.5, 1])),
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 99,
                        background: ST[id].c,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <StreamGlyph stream={id} size={16} />
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: S.ink }}>{copy.waste[id]}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 14, opacity: interpolate(frame, [T.chipsFrom + 14, T.chipsFrom + 22], [0, 1], clamp) }}>
              {[
                { icon: <PinIcon color={tint.ink} size={12} />, label: c.zone },
                { icon: <UserIcon color={tint.ink} size={12} />, label: c.uses(head.uses) },
              ].map((f) => (
                <div
                  key={f.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 10px",
                    borderRadius: 99,
                    background: "rgba(255,255,255,0.55)",
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: tint.ink,
                  }}
                >
                  {f.icon}
                  {f.label}
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              left: PAD,
              right: PAD,
              top: PILL_TOP,
              height: PILL_H,
              borderRadius: 99,
              background: S.ink,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "#fff",
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: -0.2,
              scale: String(1 - pillPress * 0.05),
            }}
          >
            {added && <CheckIcon color="#fff" size={18} />}
            {added ? c.added : c.use}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: PILL_TOP + PILL_H + 18, textAlign: "center", fontSize: 14, fontWeight: 700, color: S.sec }}>
            {c.report}
          </div>
          <Finger x={SCREEN.w / 2 + 30} y={PILL_TOP + PILL_H / 2} at={T.press} />
        </div>
      )}

      {/* toast */}
      {frame >= T.toast && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 34 + 96, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: S.ink,
              padding: "12px 18px 12px 12px",
              borderRadius: 99,
              boxShadow: "0 8px 18px rgba(0,0,0,0.25)",
              opacity: interpolate(toast, [0, 0.4], [0, 1], clamp),
              translate: `0px ${(1 - toast) * 40}px`,
              scale: String(interpolate(toast, [0, 1], [0.85, 1])),
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 99,
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckIcon color="#fff" size={13} />
            </div>
            <div style={{ color: "#fff", fontSize: 14.5, fontWeight: 700, letterSpacing: -0.2 }}>{c.toast}</div>
          </div>
        </div>
      )}
    </div>
  );
};
