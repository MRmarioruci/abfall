# Abfall product film

A 45-second product film for Abfall, rendered from code with
[Remotion](https://www.remotion.dev), in 16:9 and a 9:16 cut. Text and sound,
no voice. Recyclops is the app's own rig (`src/app/rig.ts`, copied from
`../src/components/recyclops/rig.ts`), so he moves and looks exactly like in
the app.

```bash
npm install            # once
npm run dev            # preview and scrub in Remotion Studio
npm run render         # out/abfall-16x9.mp4
npm run render:vertical  # out/abfall-9x16.mp4
npm run render:de        # out/abfall-de-16x9.mp4 (Swiss German)
npm run render:de:vertical  # out/abfall-de-9x16.mp4
npm run render:all       # all four
npm run music          # regenerate public/music.wav
```

## Layout

- `src/theme.ts`: colours (from the app), Hanken Grotesk, and the beat grid.
  The music is 120 BPM, so one beat is exactly 15 frames; every scene's
  length is a whole number of beats (`SCENES`), and cuts land on the beat.
- `src/kit/`: the scene shell, format-aware layout, word-by-word captions,
  the phone frame, sound cues, and the frame-driven Recyclops.
- `src/scenes/`: one file per scene, each also registered as its own
  composition (`Intro-16x9`, `Scan-9x16`, …) for previewing on its own.
- `src/app/`: pieces copied from the app (colours, rig, waste glyphs, logo)
  with a tiny react-native-svg stand-in (`svg.tsx`).

## Languages

The film comes in English (`Film16x9`, `Film9x16`) and Swiss German
(`FilmDE16x9`, `FilmDE9x16`). Every visible string lives in `src/copy.ts`
(captions and their accent words, phone UI, the printed calendar, places);
scenes read it with `useCopy()`, and the composition's `lang` prop picks the
language. The only exception is on purpose: the Read scene's drifting
calendar-title chips stay multilingual in every version.

To add a language:

1. Add an object of type `Copy` to `src/copy.ts`, add its code to `Lang`
   and list it in `COPY`. Reuse the app's wording from
   `../src/i18n/locales/` for phone UI.
2. Add it to `LANGS` in `src/Root.tsx`, which registers the two film
   compositions (16:9 and 9:16), and add render scripts to `package.json`.
3. Check longer text with stills, e.g.
   `npx remotion still src/index.ts Map-9x16 out/check/map.png --frame=120 --props='{"lang":"fr"}'`.
   The scene compositions all take the `lang` prop.

## Sound

- `public/music.wav` is synthesized by `scripts/make-music.py` (standard
  library only), so it needs no license.
- `public/sfx/` holds Kenney's Interface Sounds (CC0, see
  `KENNEY-LICENSE.txt`) and Remotion's sample effects, the same set the
  Sekkei films use.

## Store images

`npm run store` renders everything the Play listing and the app's icons need
into `out/store/` (compositions in `src/store/Store.tsx`, script in
`scripts/store.sh`):

| File | Use |
|---|---|
| `play-icon-512.png` | Play Console app icon (512×512) |
| `app-icon-1024.png` | `assets/icon.png` (iOS / generic icon) |
| `adaptive-foreground.png`, `adaptive-background.png`, `adaptive-monochrome.png` | Android adaptive icon layers (`assets/android-icon-*.png`) |
| `splash-icon.png` | `assets/splash-icon.png` (expo-splash-screen) |
| `en/`, `de/` `feature-graphic-1024x500.png` | Play feature graphic per language |
| `en/`, `de/` `01-home.png` … `07-share.png` | Phone screenshots, 1080×1920 |

After changing the logo, re-run it and copy the icon files into `../assets/`.
