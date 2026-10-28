import { Composition, Folder, Still } from "remotion";
import { AdaptiveBackground, AdaptiveForeground, AdaptiveMonochrome, AppIcon, FeatureGraphic, HomeShot, SplashIcon } from "./store/Store";
import { Film, SCENE_COMPONENTS, withCopy } from "./Film";
import type { Lang, LangProps } from "./copy";
import { BEAT, DURATION, FPS, SCENES, type SceneId } from "./theme";

const FORMATS = [
  { id: "16x9", width: 1920, height: 1080 },
  { id: "9x16", width: 1080, height: 1920 },
] as const;

/** Film compositions per language: "" is English (Film16x9), "DE" German (FilmDE16x9). */
const LANGS: { lang: Lang; prefix: string }[] = [
  { lang: "en", prefix: "" },
  { lang: "de", prefix: "DE" },
];

// Scenes on their own; they take the same `lang` prop (English by default),
// e.g. --props='{"lang":"de"}'.
const SCENE_WITH_COPY = Object.fromEntries(
  Object.entries(SCENE_COMPONENTS).map(([id, C]) => [id, withCopy(C)]),
) as Record<SceneId, React.FC<LangProps>>;

export const RemotionRoot: React.FC = () => (
  <>
    {LANGS.map(({ lang, prefix }) =>
      FORMATS.map((f) => (
        <Composition
          key={`${lang}-${f.id}`}
          id={`Film${prefix}${f.id}`}
          component={Film}
          width={f.width}
          height={f.height}
          fps={FPS}
          durationInFrames={DURATION}
          defaultProps={{ lang }}
        />
      )),
    )}
    {FORMATS.map((f) => (
      <Folder key={f.id} name={`Scenes-${f.id}`}>
        {SCENES.map(({ id, beats }) => (
          <Composition
            key={id}
            id={`${id}-${f.id}`}
            component={SCENE_WITH_COPY[id]}
            width={f.width}
            height={f.height}
            fps={FPS}
            durationInFrames={beats * BEAT}
            defaultProps={{ lang: "en" as Lang }}
          />
        ))}
      </Folder>
    ))}
    <Folder name="Store">
      <Still id="AppIcon" component={AppIcon} width={1024} height={1024} />
      <Still id="AdaptiveForeground" component={AdaptiveForeground} width={1024} height={1024} />
      <Still id="AdaptiveBackground" component={AdaptiveBackground} width={1024} height={1024} />
      <Still id="AdaptiveMonochrome" component={AdaptiveMonochrome} width={1024} height={1024} />
      <Still id="SplashIcon" component={SplashIcon} width={1024} height={1024} />
      {LANGS.map(({ lang, prefix }) => (
        <Composition key={`shot-${lang}`} id={`HomeShot${prefix}`} component={HomeShot} width={1080} height={1920} fps={FPS} durationInFrames={90} defaultProps={{ lang }} />
      ))}
      {LANGS.map(({ lang, prefix }) => (
        <Composition key={lang} id={`FeatureGraphic${prefix}`} component={FeatureGraphic} width={1024} height={500} fps={FPS} durationInFrames={120} defaultProps={{ lang }} />
      ))}
    </Folder>
  </>
);
