# Abfall — Product Specification

## Overview

A mobile app (iOS + Android) for managing waste collection schedules in Switzerland. Replaces paper calendars distributed by municipalities with a unified, notification-enabled experience powered by community contributions.

## Principles

- **No account required** — local-first, data stored on device
- **Community-powered** — users can contribute and upvote calendars for their area
- **Progressive permissions** — works without location, improves with it
- **Offline-first** — calendar cached locally, works without network
- **Multilingual** — DE, FR, IT, EN from day one

---

## Data Model

### Municipality

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| name | string | e.g. "Schlieren" |
| canton | string | e.g. "ZH" |
| zones | string[] | e.g. ["West", "Ost"] or ["Zone A", "Zone B", "Zone C"] |
| bag_info | string? | e.g. "Züri-Sack required for Kehricht" |

### Calendar

Stored as JSONB document in Supabase. Multiple calendars can exist per municipality+zone, sorted by likes.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| municipality_id | uuid | FK |
| zone | string? | null = applies to whole municipality |
| year | number | e.g. 2026 |
| half | number? | 1 or 2, for municipalities that publish 6-month calendars. null = full year |
| events | CollectionEvent[] | JSONB array |
| likes | number | community upvotes, default 0 |
| source | enum | "scan" \| "manual" \| "official" |
| created_at | timestamp | |
| updated_at | timestamp | |
| device_id | string | anonymous contributor identifier |

### CollectionEvent

```typescript
{
  date: string           // ISO date "2026-10-05"
  type: WasteType        // canonical waste type ID
  zone: string | "all"   // which zone, or "all" for city-wide
  time?: string          // optional time window e.g. "8:00-11:30"
  note?: string          // optional note e.g. "ganze Stadt Ost + West"
}
```

### WasteType (canonical set)

| ID | Label (DE) | Label (FR) | Label (IT) | Color | Description |
|----|-----------|-----------|-----------|-------|-------------|
| `kehricht` | Kehricht | Ordures ménagères | Rifiuti domestici | #6B7280 (gray) | Regular household waste |
| `bio` | Bioabfall / Grüngut | Déchets verts | Rifiuti organici | #22C55E (green) | Organic / garden waste |
| `papier` | Papier | Papier | Carta | #3B82F6 (blue) | Paper collection |
| `karton` | Karton | Carton | Cartone | #A16207 (brown) | Cardboard (when separate from paper) |
| `sperrgut` | Sperrgut | Encombrants | Ingombranti | #F97316 (orange) | Bulky waste |
| `altmetall` | Altmetall | Vieux métaux | Metalli vecchi | #9CA3AF (silver) | Scrap metal |
| `textilien` | Textilien | Textiles | Tessili | #A855F7 (purple) | Clothing and textiles |
| `sonderabfall` | Sonderabfall | Déchets spéciaux | Rifiuti speciali | #EF4444 (red) | Hazardous / chemical waste |
| `werkhof` | Werkhof | Déchetterie | Centro di raccolta | #14B8A6 (teal) | Collection center open hours |

Municipalities may use different names — the LLM parser and manual entry map local names to these canonical IDs.

### ReminderRule (local on device)

```typescript
{
  wasteType: WasteType
  triggers: ReminderTrigger[]
  enabled: boolean
}

type ReminderTrigger = {
  type: "evening_before" | "morning_of" | "custom"
  hour?: number    // for custom, e.g. 18
  minute?: number  // for custom, e.g. 0
  daysBefore?: number // for custom, e.g. 1
}
```

### CollectionPoint (future)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| type | enum | "glass" \| "pet" \| "plastic" \| "oil" \| "batteries" \| "sammelstelle" |
| latitude | number | |
| longitude | number | |
| name | string? | e.g. "Migros Schlieren" |
| source | enum | "user" \| "official" |
| municipality_id | uuid? | |

---

## User Flows

### Onboarding (new user)

```
1. Welcome screen
   - Value prop: "Never miss a collection day"
   - Language selector (DE/FR/IT/EN)

2. "How do you want to set up your calendar?"
   ├─ [A] Use my location
   │    → Request location permission
   │    → Reverse geocode → identify municipality
   │    → Search Supabase for calendars in that municipality
   │    → Found? → Show list sorted by likes → User picks one → Select zone
   │    → Not found? → Offer options B or C
   │
   ├─ [B] Enter manually
   │    → Canton picker → Municipality picker → Zone picker (if applicable)
   │    → Same DB lookup as above
   │
   └─ [C] Scan your paper calendar
        → Camera capture (1+ images)
        → Send to OpenAI Vision API → parse into CollectionEvent[]
        → User reviews parsed result (editable — secondary priority)
        → Save locally
        → "Share with your area?" → if yes, upload to Supabase

3. Calendar saved to device (AsyncStorage or expo-secure-store)

4. Reminder setup
   → Show list of waste types found in calendar
   → Per type: toggle reminders, pick trigger times
   → Schedule local notifications via expo-notifications
```

### Returning user (home screen)

```
- "Today" view: what's being collected today (if anything)
- "This week" view: upcoming collections for the week
- Monthly calendar view: overview with colored dots per waste type
- Tap a collection → detail card showing waste type, zone, time, notes, bag info
```

### Settings

```
- Change municipality / zone
- Re-scan calendar
- Reminder preferences (per waste type)
- Language
- About / legal
```

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54, React Native |
| Language | TypeScript (strict) |
| Styling | NativeWind v4 (Tailwind CSS) |
| Components | React Native Reusables (shadcn-style) |
| Navigation | expo-router (file-based) or React Navigation |
| i18n | i18next + react-i18next |
| Local storage | AsyncStorage (calendar cache, preferences) |
| Notifications | expo-notifications (local scheduled) |
| Backend | Supabase (Postgres + JSONB, Auth anonymous, Edge Functions) |
| LLM parsing | OpenAI Vision API (via Edge Function) |
| State | React Context + useReducer (lightweight, no Redux) |

---

## Notifications Architecture (MVP)

Local-only using `expo-notifications`:

1. User sets reminder rules per waste type
2. App iterates calendar events, schedules local notifications
3. On calendar update, cancel old notifications and reschedule
4. iOS limit: ~64 scheduled notifications — sufficient for waste calendar (~20-30 active at a time)

Future: add remote push via Supabase + Expo Push for "calendar updated" alerts.

---

## Calendar Year Transition

- In November/December, show banner: "Next year's calendar not available yet"
- When new calendar is uploaded for next year, notify users in that municipality (future, requires remote push)
- User can re-scan or re-fetch when new calendar is published

---

## Bag Requirements

Stored as metadata on the municipality level:

```typescript
{
  municipality: "Zürich",
  bagInfo: {
    kehricht: { required: true, name: "Züri-Sack", note: "Available at most retailers" },
    bio: { required: false }
  }
}
```

Shown in collection detail card and optionally in reminder notification text.

---

## Future Features (post-MVP)

- **Collection points map** — glass, PET, plastic, Sammelstelle locations
- **Home screen widget** — "Next: Papier, tomorrow"
- **Remote push notifications** — calendar update alerts
- **Calendar sharing / export** — share via link, export to phone calendar
- **Street-level zone mapping** — for municipalities like Zürich with Kreis-based schedules
- **User accounts** — optional, for syncing across devices
- **Analytics** — anonymous usage data (PostHog) for coverage tracking

---

## MVP Scope

1. ✅ Onboarding flow (location, manual entry, scan)
2. ✅ Calendar view (today, week, month)
3. ✅ Local push notification reminders
4. ✅ i18n (DE, FR, IT, EN)
5. ✅ Offline-first (calendar cached locally)
6. ❌ Map / collection points (v2)
7. ❌ User accounts (v2)
8. ❌ Remote push (v2)
9. ❌ Widget (v2)
