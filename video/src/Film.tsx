// The whole film: the scenes back to back over the music bed.
import { Audio } from "@remotion/media";
import { AbsoluteFill, interpolate, Series, staticFile, useVideoConfig } from "remotion";
import { BEAT, SCENES, type SceneId } from "./theme";
import { CopyProvider, type LangProps } from "./copy";
import { Intro } from "./scenes/Intro";
import { Problem } from "./scenes/Problem";
import { Scan } from "./scenes/Scan";
import { Read } from "./scenes/Read";
import { Community } from "./scenes/Community";
import { Reminder } from "./scenes/Reminder";
import { Map } from "./scenes/Map";
import { Share } from "./scenes/Share";
import { Outro } from "./scenes/Outro";

export const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  Intro,
  Problem,
  Scan,
  Read,
  Community,
  Reminder,
  Map,
  Share,
  Outro,
};

/** A scene on its own, for the per-scene compositions in Root. */
export const withCopy = (C: React.FC): React.FC<LangProps> => {
  const Wrapped: React.FC<LangProps> = ({ lang }) => (
    <CopyProvider lang={lang}>
      <C />
    </CopyProvider>
  );
  Wrapped.displayName = `WithCopy(${C.displayName ?? C.name})`;
  return Wrapped;
};

export const Film: React.FC<LangProps> = ({ lang }) => {
  const { durationInFrames } = useVideoConfig();
  return (
    <CopyProvider lang={lang}>
      <AbsoluteFill>
        <Series>
          {SCENES.map(({ id, beats }) => {
            const C = SCENE_COMPONENTS[id];
            return (
              <Series.Sequence key={id} name={id} durationInFrames={beats * BEAT}>
                <C />
              </Series.Sequence>
            );
          })}
        </Series>
        <Audio
          src={staticFile("music.wav")}
          volume={(f) =>
            interpolate(f, [0, 10, durationInFrames - 20, durationInFrames], [0, 0.55, 0.55, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      </AbsoluteFill>
    </CopyProvider>
  );
};
