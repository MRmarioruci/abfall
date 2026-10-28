// The card for a selected collection point: name, one line (type · distance),
// what it accepts as soft waste-colour chips, opening hours, and Directions.
// Slides up from below when a place is picked and back down when cleared.

import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { type WasteStreamId } from "../../theme/colors";
import { useTheme } from "../../theme/ThemeContext";
import { HAIRLINE, RADIUS } from "../../theme/layout";
import { TYPE } from "../../theme/type";
import { StreamGlyph } from "../icons/StreamGlyph";
import { ArrowURIcon, ChevRIcon, XIcon } from "../icons/Icons";
import { CircBtn } from "../ui/CircBtn";
import { PillButton, SheetHeader } from "../ui/sheet";
import { haptics } from "../../lib/haptics";
import type { StringKey } from "../../i18n";
import type { CollectionCenter } from "../../types/collectionCenters";

// OSM recycling:* material → app waste stream, where one fits. Materials
// without a stream still show, as plain chips.
const MATERIALS: Array<{ tag: string; key: StringKey; stream?: WasteStreamId }> = [
  { tag: "glass", key: "material.glass", stream: "glas" },
  { tag: "glass_bottles", key: "material.glass_bottles", stream: "glas" },
  { tag: "clothes", key: "material.clothes", stream: "textilien" },
  { tag: "PET", key: "material.PET", stream: "verpackung" },
  { tag: "plastic", key: "material.plastic", stream: "verpackung" },
  { tag: "cans", key: "material.cans", stream: "metall" },
  { tag: "scrap_metal", key: "material.scrap_metal", stream: "altmetall" },
  { tag: "paper", key: "material.paper", stream: "papier" },
  { tag: "cardboard", key: "material.cardboard", stream: "karton" },
  { tag: "green_waste", key: "material.green_waste", stream: "gruengut" },
  { tag: "batteries", key: "material.batteries", stream: "sonderabfall" },
  { tag: "oil", key: "material.oil", stream: "sonderabfall" },
  { tag: "electrical_appliances", key: "material.electrical_appliances" },
  { tag: "wood", key: "material.wood" },
  { tag: "cooking_oil", key: "material.cooking_oil" },
];

type Chip = { label: string; stream?: WasteStreamId };

function materialChips(center: CollectionCenter, t: (k: StringKey) => string): Chip[] {
  const chips: Chip[] = [];
  for (const m of MATERIALS) {
    const v = center.tags[`recycling:${m.tag}`];
    if (v !== "yes" && v !== "true") continue;
    const label = t(m.key);
    if (!chips.some((c) => c.label === label)) chips.push({ label, stream: m.stream });
  }
  return chips.length ? chips : [{ label: center.materialsLabel }];
}

function MaterialChip({ chip }: { chip: Chip }) {
  const { S, ST } = useTheme();
  const s = chip.stream ? ST[chip.stream] : null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingLeft: s ? 6 : 11,
        paddingRight: 11,
        paddingVertical: 5,
        borderRadius: RADIUS.well,
        backgroundColor: s ? s.soft : S.chip,
      }}
    >
      {chip.stream && <StreamGlyph stream={chip.stream} size={20} />}
      <Text style={[TYPE.micro, { color: s ? s.ink : S.ink }]}>{chip.label}</Text>
    </View>
  );
}

const HIDDEN_Y = 420;

export function PlaceCard({
  center,
  subtitle,
  bottom,
  t,
  closeLabel,
  onClose,
  onDirections,
}: {
  /** null slides the card away. */
  center: CollectionCenter | null;
  subtitle: string;
  bottom: number;
  t: (k: StringKey) => string;
  closeLabel: string;
  onClose: () => void;
  onDirections: (c: CollectionCenter) => void;
}) {
  const { S } = useTheme();
  // Keep showing the last place while the card slides out.
  const [shown, setShown] = useState<CollectionCenter | null>(center);
  const [lastSubtitle, setLastSubtitle] = useState(subtitle);
  const [expanded, setExpanded] = useState(false);
  const y = useRef(new Animated.Value(HIDDEN_Y)).current;

  useEffect(() => {
    if (center) {
      setShown(center);
      setLastSubtitle(subtitle);
      Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 190, mass: 0.9 }).start();
    } else {
      Animated.timing(y, { toValue: HIDDEN_Y, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(
        ({ finished }) => finished && setShown(null),
      );
    }
  }, [center, subtitle, y]);

  useEffect(() => setExpanded(false), [center?.id]);

  if (!shown) return null;

  const chips = materialChips(shown, t);
  // Hours lead; address, operator and notes sit behind the expander.
  const extras = [shown.address, shown.operator, shown.description].filter(Boolean) as string[];
  const firstLine = shown.openingHours ?? extras[0];
  const more = shown.openingHours ? extras : extras.slice(1);
  const canExpand = more.length > 0 || (firstLine?.length ?? 0) > 38;

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: 14,
        right: 14,
        bottom,
        padding: 20,
        paddingTop: 18,
        backgroundColor: S.card,
        borderWidth: HAIRLINE,
        borderColor: S.line,
        borderRadius: RADIUS.card,
        shadowColor: S.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 22,
        elevation: 6,
        transform: [{ translateY: y }],
      }}
    >
      <SheetHeader
        title={shown.name || t("map.default_name")}
        subtitle={lastSubtitle}
        right={
          <CircBtn size={36} bg={S.chip} outline={false} onPress={onClose} accessibilityLabel={closeLabel}>
            <XIcon color={S.ink} size={15} />
          </CircBtn>
        }
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: -6 }}>
        {chips.map((c) => (
          <MaterialChip key={c.label} chip={c} />
        ))}
      </View>

      {!!firstLine && (
        <Pressable
          disabled={!canExpand}
          onPress={() => {
            haptics.select();
            setExpanded((e) => !e);
          }}
          accessibilityRole={canExpand ? "button" : undefined}
          accessibilityState={canExpand ? { expanded } : undefined}
          accessibilityLabel={shown.openingHours ? `${t("map.info.opening_hours")}: ${firstLine}` : firstLine}
          style={({ pressed }) => ({
            marginTop: 14,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 8,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          })}
        >
          <View style={{ flex: 1 }}>
            <Text style={[TYPE.caption, { color: S.ink }]} numberOfLines={expanded ? undefined : 1}>
              {shown.openingHours && <Text style={{ color: S.sec }}>{t("map.info.opening_hours")} · </Text>}
              {firstLine}
            </Text>
            {expanded &&
              more.map((line) => (
                <Text key={line} style={[TYPE.caption, { color: S.sec, marginTop: 4 }]}>
                  {line}
                </Text>
              ))}
          </View>
          {canExpand && (
            <View style={{ marginTop: 1, transform: [{ rotate: expanded ? "270deg" : "90deg" }] }}>
              <ChevRIcon color={S.ter} size={14} />
            </View>
          )}
        </Pressable>
      )}

      <PillButton
        label={t("map.directions")}
        icon={<ArrowURIcon color={S.onInk} size={16} />}
        onPress={() => onDirections(shown)}
        style={{ marginTop: 18 }}
      />
    </Animated.View>
  );
}
