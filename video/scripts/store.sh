#!/bin/sh
# Renders every image the Play listing and the app's icons need into
# out/store/. Run from the video folder: npm run store
set -e
OUT=out/store
mkdir -p "$OUT/en" "$OUT/de"
still() { npx remotion still src/index.ts "$@" --log=error; }

# Icons (language-independent)
still AppIcon "$OUT/app-icon-1024.png"
still AppIcon "$OUT/play-icon-512.png" --scale=0.5
still AdaptiveForeground "$OUT/adaptive-foreground.png"
still AdaptiveBackground "$OUT/adaptive-background.png"
still AdaptiveMonochrome "$OUT/adaptive-monochrome.png"
still SplashIcon "$OUT/splash-icon.png"

# Feature graphic and phone screenshots per language.
for lang in en de; do
  P=""; [ "$lang" = de ] && P="DE"
  PROPS="{\"lang\":\"$lang\"}"
  still "FeatureGraphic$P" "$OUT/$lang/feature-graphic-1024x500.png" --frame=110
  still "HomeShot$P" "$OUT/$lang/01-home.png" --frame=60
  still Scan-9x16 "$OUT/$lang/02-scan.png" --frame=140 --props="$PROPS"
  still Read-9x16 "$OUT/$lang/03-any-calendar.png" --frame=120 --props="$PROPS"
  still Community-9x16 "$OUT/$lang/04-community.png" --frame=125 --props="$PROPS"
  still Reminder-9x16 "$OUT/$lang/05-reminders.png" --frame=100 --props="$PROPS"
  still Map-9x16 "$OUT/$lang/06-map.png" --frame=110 --props="$PROPS"
  still Share-9x16 "$OUT/$lang/07-share.png" --frame=100 --props="$PROPS"
done
echo "done: $OUT"
