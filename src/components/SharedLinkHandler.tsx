// Handles shared-calendar links that open the app (abfall://c/<id>, from
// the landing page's "Open in Abfall" button or a QR code scanned with the
// phone's camera) and QR codes scanned inside the app: fetches the
// calendar and asks whether to add it. Renders nothing until a link comes in.

import { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import { ConfirmSheet } from "./ConfirmSheet";
import { useToast } from "./ui/Toast";
import { useCalendars } from "../context/CalendarContext";
import { useT } from "../context/LocaleContext";
import {
  getCommunityCalendar,
  markCommunityCalendarUsed,
  type CommunityCalendarDetail,
} from "../services/api";
import { communityToSaved } from "../services/communityImport";
import { onSharedLink, sharedCalendarIdFromUrl } from "../lib/shareLinks";

// The initial URL survives remounts (e.g. after onboarding), so remember
// which ids were already offered this session.
const handled = new Set<string>();

export function SharedLinkHandler() {
  const { t } = useT();
  const toast = useToast();
  const { addCalendar } = useCalendars();
  const [pending, setPending] = useState<CommunityCalendarDetail | null>(null);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    // `again`: scanned on purpose in the app, so offer it even if this
    // session already saw it (the user may have said no the first time).
    const open = async (url: string | null | undefined, again = false) => {
      const id = sharedCalendarIdFromUrl(url);
      if (!id || (handled.has(id) && !again)) return;
      handled.add(id);
      try {
        const detail = await getCommunityCalendar(id);
        if (detail) setPending(detail);
        else toastRef.current.show(t("link.not_found"));
      } catch {
        toastRef.current.show(t("link.failed"));
      }
    };
    Linking.getInitialURL().then(open).catch(() => {});
    const sub = Linking.addEventListener("url", ({ url }) => open(url));
    const unsubscribe = onSharedLink((url) => open(url, true));
    return () => {
      sub.remove();
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const place = pending ? [pending.city, pending.region].filter(Boolean).join(", ") : "";

  return (
    <ConfirmSheet
      visible={!!pending}
      onClose={() => setPending(null)}
      title={t("link.import.title", { title: pending?.title ?? "" })}
      body={t("link.import.body", { place, n: pending?.events.length ?? 0 })}
      confirmLabel={t("link.import.confirm")}
      onConfirm={async () => {
        if (!pending) return;
        try {
          await addCalendar(communityToSaved(pending));
          markCommunityCalendarUsed(pending.id);
          toast.show(t("community.toast.imported"));
        } catch {
          toast.show(t("community.toast.import_failed"), { variant: "error" });
        }
      }}
    />
  );
}
