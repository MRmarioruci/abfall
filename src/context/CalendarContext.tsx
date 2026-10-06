import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import type { SavedCalendar } from "../types/calendar";
import { getCalendars, saveCalendar, setActiveCalendar, deleteCalendar, getActiveCalendar, updateCalendar } from "../services/storage";
import {
  cancelAllNotifications,
  cancelNotificationsForCalendar,
} from "../services/notifications";
import { applyDelivery } from "../services/notificationDelivery";
import { getRefreshClientId } from "../hooks/useGoogleAuth";
import { useToast } from "~/components/ui/Toast";

interface CalendarContextValue {
  calendars: SavedCalendar[];
  active: SavedCalendar | undefined;
  loading: boolean;
  addCalendar: (calendar: SavedCalendar) => Promise<void>;
  switchCalendar: (id: string) => Promise<void>;
  removeCalendar: (id: string) => Promise<void>;
  patchCalendar: (id: string, patch: Partial<SavedCalendar>) => Promise<void>;
  reload: () => Promise<void>;
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [calendars, setCalendars] = useState<SavedCalendar[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await getCalendars();
    setCalendars(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addCalendar = useCallback(async (calendar: SavedCalendar) => {
    await saveCalendar(calendar);
    await reload();
  }, [reload]);

  const switchCalendar = useCallback(async (id: string) => {
    await setActiveCalendar(id);
    await reload();
    if (id !== getActiveCalendar(calendars)?.id) {
      toast.show("Active calendar switched");
    }
  }, [reload]);

  const removeCalendar = useCallback(async (id: string) => {
    await deleteCalendar(id);
    await reload();
  }, [reload]);

  const patchCalendar = useCallback(async (id: string, patch: Partial<SavedCalendar>) => {
    await updateCalendar(id, patch);
    await reload();
  }, [reload]);

  const active = getActiveCalendar(calendars);

  // Track the previously active calendar's id so we can cancel its OS
  // notifications when the user switches away — otherwise stale schedules
  // for the old calendar keep firing AND eat into the OS notification
  // budget (iOS caps ~64 pending, Android varies).
  //
  // The rules themselves live on the SavedCalendar object in AsyncStorage,
  // so canceling the OS-level schedules is non-destructive: switching back
  // re-reads the rules and books fresh notifications from scratch.
  const prevActiveIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const prevId = prevActiveIdRef.current;
    const newId = active?.id;
    prevActiveIdRef.current = newId;

    // Switching away from a real calendar (not first mount, not just a
    // re-render of the same calendar). Cancel the outgoing one's OS-level
    // notifications. Its rules stay persisted on the SavedCalendar.
    if (prevId && prevId !== newId) {
      cancelNotificationsForCalendar(prevId).catch(() => {});
    }

    if (active) {
      // Materialize reminders to whichever destination the user picked
      // (Abfall / phone calendar / Google Calendar / none). The
      // materializer cleans up the unused destinations on every call so
      // we can't drift into duplicate-notifications territory.
      applyDelivery({
        calendar: active,
        googleClientId: getRefreshClientId(),
      }).catch(() => {
        // Background errors are silent — the Reminders tab is the
        // explicit feedback surface.
      });
    } else {
      cancelAllNotifications().catch(() => {});
    }
  }, [active]);

  return (
    <CalendarContext.Provider
      value={{ calendars, active, loading, addCalendar, switchCalendar, removeCalendar, patchCalendar, reload }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendars() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error("useCalendars must be used within CalendarProvider");
  return ctx;
}
