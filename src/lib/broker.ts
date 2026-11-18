// Google sign-in goes through Keel's shared callback, https://auth.arizerner.com/callback, which is
// registered on the "Keel Apps" Google OAuth client. The broker (a Caddy redirect on Ari's box) sends
// a callback whose `state` starts with "lifts." on to https://lifts.arizerner.com/auth/callback with the
// query unchanged. Auth.js still creates and checks its own state and PKCE cookies; we only add the
// prefix on the way out (api/auth/[...nextauth]/route.ts) and strip it on the way back
// (auth/callback/route.ts).
export const BROKER_REDIRECT_URI = "https://auth.arizerner.com/callback";
export const BROKER_STATE_PREFIX = "lifts.";

const GOOGLE_ORIGIN = "https://accounts.google.com";

/** Add the broker prefix to the state of a Google authorize URL; any other URL is returned as is. */
export function prefixGoogleState(u: string): string {
  let url: URL;
  try {
    url = new URL(u);
  } catch {
    return u;
  }
  if (url.origin !== GOOGLE_ORIGIN) return u;
  const state = url.searchParams.get("state");
  if (!state || state.startsWith(BROKER_STATE_PREFIX)) return u;
  url.searchParams.set("state", BROKER_STATE_PREFIX + state);
  return url.toString();
}
