import NextAuth, { customFetch } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { BROKER_REDIRECT_URI } from "@/lib/broker";
import { eq } from "drizzle-orm";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  providers: [
    // Signs in with the "Keel Apps" Google client through the shared callback (see lib/broker.ts).
    // Google's `sub` is the same for a user across clients, so existing accounts rows still match.
    Google({
      clientId: process.env.GOOGLE_KEEL_CLIENT_ID,
      clientSecret: process.env.GOOGLE_KEEL_CLIENT_SECRET,
      checks: ["pkce", "state"],
      // Fallback if Google ever gave this client a different `sub`: link by (Google-verified) email
      // instead of failing with OAuthAccountNotLinked. Single-user app; users.email is unique.
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { redirect_uri: BROKER_REDIRECT_URI } },
      // The code exchange must send the same redirect_uri as the authorize request.
      [customFetch]: (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url === GOOGLE_TOKEN_URL && init?.body instanceof URLSearchParams) {
          init.body.set("redirect_uri", BROKER_REDIRECT_URI);
        }
        return fetch(input, init);
      },
    }),
  ],
  callbacks: {
    // Ari-only app on the shared Keel Apps client: only an existing user's Google-verified email may
    // sign in, so no one else can create an account (and email linking above can't attach a stranger).
    async signIn({ profile }) {
      const email = typeof profile?.email === "string" ? profile.email.toLowerCase() : "";
      if (!email || profile?.email_verified !== true) return false;
      const found = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      return found.length > 0;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
