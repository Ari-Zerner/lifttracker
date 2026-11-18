import type { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import { prefixGoogleState } from "@/lib/broker";

// Starting a Google sign-in returns the authorize URL either as a Location header or, for
// next-auth/react's signIn(), as JSON {url}. Prefix its state for the auth broker (see lib/broker.ts).
async function withBrokerState(res: Response): Promise<Response> {
  const headers = new Headers(res.headers);
  const loc = res.headers.get("Location");
  if (loc) headers.set("Location", prefixGoogleState(loc));
  if (res.headers.get("content-type")?.includes("application/json")) {
    const body = await res.clone().json().catch(() => null);
    if (body && typeof body.url === "string") {
      headers.delete("content-length");
      return Response.json(
        { ...body, url: prefixGoogleState(body.url) },
        { status: res.status, headers }
      );
    }
  }
  if (!loc) return res;
  return new Response(res.body, { status: res.status, headers });
}

function isGoogleSignIn(req: NextRequest) {
  return req.nextUrl.pathname.endsWith("/signin/google");
}

export async function GET(req: NextRequest) {
  const res = await handlers.GET(req);
  return isGoogleSignIn(req) ? withBrokerState(res) : res;
}

export async function POST(req: NextRequest) {
  const res = await handlers.POST(req);
  return isGoogleSignIn(req) ? withBrokerState(res) : res;
}
