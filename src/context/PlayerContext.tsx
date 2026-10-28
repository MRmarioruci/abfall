// The leaderboard player on this device: no account, just a nickname and
// an avatar the user picked, stored by the API against the anonymous
// device id. Cached on the device so Home can show points offline, and
// kept in the active calendar's town so the town board is the right one.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPlayer, leaveLeaderboard, savePlayer, type CheckinResult, type Player } from "../services/api";
import { useCalendars } from "./CalendarContext";
import { rescheduleCheckinNudges } from "../services/checkinNudges";

const CACHE_KEY = "abfall_player";

export const AVATARS = ["🦊", "🐻", "🐼", "🐸", "🦉", "🐢", "🐝", "🦔", "🐙", "🦄", "🐧", "🐿️"] as const;

interface PlayerValue {
  /** Null when this device hasn't joined. */
  player: Player | null;
  /** Join, or change nickname/avatar. Throws on a rejected nickname. */
  save: (nickname: string, avatar: string) => Promise<Player>;
  leave: () => Promise<void>;
  /** Fold a check-in's result into the cached profile. */
  applyCheckin: (r: CheckinResult) => void;
  /** Add points earned elsewhere (asking "where does this go?"). */
  addPoints: (n: number) => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<PlayerValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { active } = useCalendars();
  const [player, setPlayer] = useState<Player | null>(null);

  const store = useCallback((p: Player | null) => {
    setPlayer(p);
    if (p) AsyncStorage.setItem(CACHE_KEY, JSON.stringify(p)).catch(() => {});
    else AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    try {
      store(await getPlayer());
    } catch {
      // Offline: keep the cached profile.
    }
  }, [store]);

  useEffect(() => {
    AsyncStorage.getItem(CACHE_KEY)
      .then((v) => v && setPlayer(JSON.parse(v)))
      .catch(() => {})
      .finally(refresh);
  }, [refresh]);

  // Follow the active calendar's town, so points count on the right board.
  useEffect(() => {
    if (!player || !active) return;
    const municipality = active.municipality || undefined;
    const canton = active.canton || undefined;
    if ((player.municipality ?? undefined) === municipality && (player.canton ?? undefined) === (canton?.toUpperCase() ?? undefined)) return;
    savePlayer({ nickname: player.nickname, avatar: player.avatar, municipality, canton })
      .then(store)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.municipality, active?.canton, player?.nickname]);

  // Evening nudges to tick the bins off, for players only.
  useEffect(() => {
    rescheduleCheckinNudges(player && active ? { calendar: active, streak: player.streak } : null).catch(() => {});
  }, [player?.streak, !!player, active]);

  const save = useCallback(
    async (nickname: string, avatar: string) => {
      const p = await savePlayer({
        nickname,
        avatar,
        municipality: active?.municipality || undefined,
        canton: active?.canton || undefined,
      });
      store(p);
      return p;
    },
    [active?.municipality, active?.canton, store],
  );

  const leave = useCallback(async () => {
    await leaveLeaderboard();
    store(null);
  }, [store]);

  const applyCheckin = useCallback(
    (r: CheckinResult) => {
      setPlayer((p) => {
        if (!p) return p;
        const next = { ...p, points: r.seasonPoints, streak: r.streak };
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const addPoints = useCallback((n: number) => {
    if (n <= 0) return;
    setPlayer((p) => {
      if (!p) return p;
      const next = { ...p, points: p.points + n };
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ player, save, leave, applyCheckin, addPoints, refresh }),
    [player, save, leave, applyCheckin, addPoints, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer(): PlayerValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlayer outside PlayerProvider");
  return ctx;
}
