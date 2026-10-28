// Still images for the app and its store listing: app icon, Android
// adaptive-icon layers, splash mark and the Play feature graphic. Rendered
// with `npm run store` (see package.json); outputs go to out/store/.

import { AbsoluteFill, Sequence } from "remotion";
import { S, ST, FONT } from "../theme";
import { Recyclops } from "../kit/Recyclops";
import { CopyProvider, useCopy, type LangProps } from "../copy";
import { HomeScreen } from "../scenes/parts/outro-home";
import { Caption, Phone } from "../kit/kit";

/** The icon's background: warm cream, as the app's cards. */
export const ICON_BG = S.cardWarm;

const COLS = [ST.papier.c, ST.karton.c, ST.kehricht.c, ST.gruengut.c, ST.metall.c];
const W = [20, 30, 24, 32, 18];

/**
 * The BrandMark (src/app/BrandMark.tsx) recentred on its visual bounds (the
 * leaf pokes out to the top right), so it sits in the middle of an icon.
 * `mono` draws every part in one colour for Android's themed icons.
 */
const Mark: React.FC<{ size: number; mono?: string }> = ({ size, mono }) => (
  // Content spans x 8–44.5 and y 2.5–42 in the 48-unit box.
  <svg width={size} height={size} viewBox="2.25 -2.75 48 48">
    {COLS.map((c, i) => (
      <rect key={i} x={24 - W[i] / 2} y={12.5 + i * 6} width={W[i]} height={4.6} rx={2.3} fill={mono ?? c} />
    ))}
    <path d="M44.5 2.5C38 2.5 33.5 6.7 33.5 13.5 40 13.5 44.5 9.3 44.5 2.5Z" fill={mono ?? ST.gruengut.c} />
    {!mono && (
      <path d="M35.1 11.9C37.3 8.9 39.9 6.7 42.9 5.1" fill="none" stroke="#211F1C" strokeWidth={0.9} strokeLinecap="round" opacity={0.45} />
    )}
  </svg>
);

/** iOS / store icon: full-bleed square, the platform rounds the corners. */
export const AppIcon: React.FC = () => (
  <AbsoluteFill style={{ background: ICON_BG, alignItems: "center", justifyContent: "center" }}>
    <Mark size={680} />
  </AbsoluteFill>
);

/**
 * Android adaptive icon foreground: transparent, mark inside the centre
 * 66% safe zone (launchers crop the outer third to circles, squircles…).
 */
export const AdaptiveForeground: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
    <Mark size={560} />
  </AbsoluteFill>
);

export const AdaptiveBackground: React.FC = () => <AbsoluteFill style={{ background: ICON_BG }} />;

/** Android 13+ themed icon: one flat colour, the system tints it. */
export const AdaptiveMonochrome: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
    <Mark size={560} mono="#000000" />
  </AbsoluteFill>
);

/** Splash screen mark: transparent, the splash background is set in config. */
export const SplashIcon: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
    <Mark size={820} />
  </AbsoluteFill>
);

/**
 * Play feature graphic, 1024×500: logo, tagline, Recyclops and the app.
 * A short composition rather than a Still: the Home screen animates in, so
 * the graphic is rendered from a settled frame (see FEATURE_FRAME).
 */
export const FEATURE_FRAME = 110;

const FeatureGraphicInner: React.FC = () => {
  const copy = useCopy();
  return (
    <AbsoluteFill style={{ background: ST.gruengut.soft, fontFamily: FONT, overflow: "hidden" }}>
      {/* soft circles for depth */}
      <div style={{ position: "absolute", width: 620, height: 620, borderRadius: 999, right: -120, top: -150, background: "rgba(255,255,255,0.45)" }} />
      <div style={{ position: "absolute", width: 260, height: 260, borderRadius: 999, left: -90, bottom: -120, background: "rgba(255,255,255,0.35)" }} />

      <div style={{ position: "absolute", left: 64, top: 0, bottom: 0, width: 520, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Mark size={96} />
          <div style={{ fontSize: 88, fontWeight: 900, letterSpacing: -3.5, color: S.ink, lineHeight: 1 }}>Abfall</div>
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.12, color: ST.gruengut.ink, marginTop: 22, maxWidth: 470 }}>
          {copy.outro.tagline.text}
        </div>
      </div>

      {/* the app, tilted slightly, with Recyclops beside it */}
      <div style={{ position: "absolute", right: 210, top: 40, rotate: "5deg" }}>
        <Phone height={470}>
          <HomeScreen />
        </Phone>
      </div>
      <div style={{ position: "absolute", right: 36, bottom: 26 }}>
        <Recyclops size={170} pose={{ armR: 150, happy: 1, smile: 1, browUp: 0.5 }} autoBlink={false} />
      </div>
    </AbsoluteFill>
  );
};

export const FeatureGraphic: React.FC<LangProps> = ({ lang }) => (
  <CopyProvider lang={lang}>
    <FeatureGraphicInner />
  </CopyProvider>
);

/**
 * First store screenshot (1080×1920): the tagline over the Home screen,
 * Recyclops waving. Rendered at SHOT_FRAME, when the caption has revealed;
 * the Home screen runs HOME_LEAD frames ahead so it's settled with
 * Recyclops back in his corner.
 */
export const SHOT_FRAME = 60;
const HOME_LEAD = 50;

const HomeShotInner: React.FC = () => {
  const copy = useCopy();
  return (
    <AbsoluteFill style={{ background: S.bg, fontFamily: FONT, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 150, left: 80, right: 80 }}>
        <Caption text={copy.outro.tagline.text} accent={copy.outro.tagline.accent} accentColor={ST.gruengut.ink} from={0} stagger={2} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 520, display: "flex", justifyContent: "center" }}>
        <Phone height={1290}>
          <Sequence from={-HOME_LEAD} layout="none">
            <HomeScreen />
          </Sequence>
        </Phone>
      </div>
      <div style={{ position: "absolute", left: 40, bottom: 60 }}>
        <Recyclops size={260} pose={{ armR: 150, happy: 1, smile: 1, browUp: 0.5 }} autoBlink={false} />
      </div>
    </AbsoluteFill>
  );
};

export const HomeShot: React.FC<LangProps> = ({ lang }) => (
  <CopyProvider lang={lang}>
    <HomeShotInner />
  </CopyProvider>
);
