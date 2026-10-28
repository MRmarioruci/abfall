// Public links for shared calendars. They open a landing page served by
// abfall-api (GET /c/:id) whose button deep-links into the app as
// abfall://c/<id>.

const SHARE_BASE_URL = (
  process.env.EXPO_PUBLIC_SHARE_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "https://abfall-api.vercel.app"
).replace(/\/+$/, "");

export function shareUrlFor(communityId: string): string {
  return `${SHARE_BASE_URL}/c/${communityId}`;
}

const SHARED_ID_RE =
  /(?:^|[/:])c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[/?#]|$)/i;

/**
 * The community calendar id in a shared link, or null. Accepts the app
 * scheme (abfall://c/<id>), the web link (https://…/c/<id>) and Expo Go's
 * dev form (exp://…/--/c/<id>).
 */
export function sharedCalendarIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return SHARED_ID_RE.exec(url)?.[1]?.toLowerCase() ?? null;
}

// Links that come from inside the app (a QR code scanned with the in-app
// camera) go through the same "add this calendar?" flow as links that
// open the app. SharedLinkHandler listens.
type Listener = (url: string) => void;
const listeners = new Set<Listener>();

// The full-screen camera replaces the tab UI, so the listener may not be
// mounted at the moment a code is scanned; the link waits here for it.
let waiting: string | null = null;

/** Hand a scanned link to the shared-calendar flow. False when it isn't one. */
export function openSharedLink(url: string): boolean {
  if (!sharedCalendarIdFromUrl(url)) return false;
  if (listeners.size === 0) waiting = url;
  else listeners.forEach((l) => l(url));
  return true;
}

export function onSharedLink(listener: Listener): () => void {
  listeners.add(listener);
  if (waiting) {
    const url = waiting;
    waiting = null;
    listener(url);
  }
  return () => listeners.delete(listener);
}
