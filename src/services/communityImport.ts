// Turning a community calendar into a local one, shared by the browse
// sheet and the shared-link handler.

import { ST_STATIC as ST } from "../theme/colors";
import { parseISODate } from "../lib/dates";
import { generateCalendarId } from "./storage";
import type { CommunityCalendarDetail } from "./api";
import type { SavedCalendar } from "../types/calendar";

export function communityToSaved(detail: CommunityCalendarDetail): SavedCalendar {
  return {
    // Always a fresh unique id — re-importing the same community calendar
    // must produce a NEW local row, otherwise deleting one copy would
    // delete the other.
    id: generateCalendarId(),
    title: detail.title,
    municipality: detail.city,
    canton: detail.region ?? undefined,
    zone: detail.zones[0],
    zones: detail.zones,
    year: detail.year,
    half: (detail.half as 1 | 2 | undefined) ?? undefined,
    // The server accepts any type string and date; keep only events this
    // build can render and schedule.
    events: detail.events.filter(
      (e) => e.type in ST && !isNaN(parseISODate(e.date).getTime()),
    ),
    source: "community",
    active: true,
    createdAt: new Date().toISOString(),
  };
}
