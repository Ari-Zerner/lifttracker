import type { NextRequest } from "next/server";
import { BROKER_STATE_PREFIX } from "@/lib/broker";

// Google -> https://auth.arizerner.com/callback -> here (query unchanged). Strip the broker's state
// prefix and hand the callback to Auth.js, which checks state and PKCE against its own cookies.
export function GET(req: NextRequest) {
  const params = new URLSearchParams(req.nextUrl.search);
  const state = params.get("state") ?? "";
  if (!state.startsWith(BROKER_STATE_PREFIX) || state.length === BROKER_STATE_PREFIX.length) {
    return new Response("Invalid sign-in state.", { status: 400 });
  }
  params.set("state", state.slice(BROKER_STATE_PREFIX.length));
  const target = req.nextUrl.clone();
  target.pathname = "/api/auth/callback/google";
  target.search = params.toString();
  return Response.redirect(target, 302);
}
