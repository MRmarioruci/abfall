// OAuth 2.0 sign-in flow for Google Calendar.
//
// Wraps expo-auth-session's Google provider to get an authorization
// code, exchange it for access + refresh tokens, and stash them via
// saveTokens(). The hook is "fire and forget" — you call `signIn()`
// from a button onPress and watch `connected` flip to true.
//
// Requires the EXPO_PUBLIC_GOOGLE_CLIENT_ID_* env vars to be set —
// one OAuth client id per platform from the Google Cloud console.

import { useEffect, useState } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { isConnectedToGoogle, saveTokens, disconnectGoogle } from "../services/googleCalendar";

// Required so the auth pop-up dismisses cleanly on iOS Safari.
WebBrowser.maybeCompleteAuthSession();

const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? "";
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ?? "";
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ?? "";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

// Placeholder used when the env var isn't set so Google.useAuthRequest
// doesn't throw at module load. signIn() checks for a real id before
// firing the OAuth flow and surfaces a helpful toast instead.
const PLACEHOLDER_CLIENT_ID = "1.apps.googleusercontent.com";

function isOAuthConfigured(): boolean {
  if (Platform.OS === "ios") return !!IOS_CLIENT_ID;
  if (Platform.OS === "android") return !!ANDROID_CLIENT_ID;
  return !!WEB_CLIENT_ID;
}

/**
 * The client id we use for refresh-token exchanges. Google's token
 * endpoint refreshes against the same client that issued the refresh
 * token. On mobile the native client (iOS/Android) is used; we expose
 * it so the calendar service can pass it into `getValidAccessToken`.
 */
export function getRefreshClientId(): string {
  if (Platform.OS === "ios") return IOS_CLIENT_ID;
  if (Platform.OS === "android") return ANDROID_CLIENT_ID;
  return WEB_CLIENT_ID;
}

export function useGoogleAuth() {
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);

  // We request the authorization code (not an implicit access token) so
  // we can do offline access — `access_type: offline` + `prompt: consent`
  // ensures Google issues a refresh_token on first consent.
  // Fall back to a syntactically-valid placeholder id when the env var
  // isn't set so the hook doesn't throw at construction time. We block
  // the actual sign-in below with a clear error if nothing real exists.
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: IOS_CLIENT_ID || PLACEHOLDER_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID || PLACEHOLDER_CLIENT_ID,
    webClientId: WEB_CLIENT_ID || PLACEHOLDER_CLIENT_ID,
    scopes: SCOPES,
    // Use offline access so we get a refresh_token.
    extraParams: {
      access_type: "offline",
      prompt: "consent",
    },
    responseType: "code",
  });

  useEffect(() => {
    isConnectedToGoogle().then(setConnected);
  }, []);

  // When the OAuth flow returns a code, exchange it for tokens.
  useEffect(() => {
    if (!response) return;
    if (response.type !== "success") return;
    const code = (response.params as { code?: string }).code;
    if (!code) return;
    (async () => {
      try {
        setBusy(true);
        const clientId = getRefreshClientId();
        // Use a code_verifier flow (PKCE) — expo-auth-session already
        // generated it on the request; we read it back to exchange.
        const codeVerifier = request?.codeVerifier;
        const redirectUri = request?.redirectUri;
        if (!codeVerifier || !redirectUri) {
          throw new Error("OAuth state missing — try again");
        }
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            grant_type: "authorization_code",
            code,
            code_verifier: codeVerifier,
            redirect_uri: redirectUri,
          }).toString(),
        });
        if (!tokenRes.ok) {
          const text = await tokenRes.text();
          throw new Error(`Token exchange failed (${tokenRes.status}): ${text}`);
        }
        const json = (await tokenRes.json()) as {
          access_token: string;
          refresh_token?: string;
          expires_in?: number;
        };
        await saveTokens({
          accessToken: json.access_token,
          refreshToken: json.refresh_token,
          expiresInSeconds: json.expires_in,
        });
        setConnected(true);
      } catch (err) {
        console.warn("[googleAuth] token exchange failed", err);
      } finally {
        setBusy(false);
      }
    })();
  }, [response, request]);

  const signIn = async () => {
    if (busy) return;
    if (!isOAuthConfigured()) {
      throw new Error(
        "Google OAuth not configured — set EXPO_PUBLIC_GOOGLE_CLIENT_ID_* in .env",
      );
    }
    setBusy(true);
    try {
      await promptAsync();
    } finally {
      // setBusy(false) happens in the response effect once the exchange
      // completes — leaving it here as a safety net for cancellations.
      setTimeout(() => setBusy(false), 1500);
    }
  };

  const signOut = async () => {
    setBusy(true);
    try {
      await disconnectGoogle();
      setConnected(false);
    } finally {
      setBusy(false);
    }
  };

  return { connected, busy, signIn, signOut, request };
}
