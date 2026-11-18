# LiftTracker

Ari's workout tracking web app at https://lifts.arizerner.com (hosted on Vercel; https://arilifts.vercel.app
redirects there). Ari, keel-chat #general 2026-11-18: move it to lifts.arizerner.com (hosting stays on Vercel) and
"just use the https://auth.arizerner.com/ callback" for Google sign-in.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: Neon Postgres via `@vercel/postgres` + Drizzle ORM
- **Auth**: NextAuth v5 beta (`next-auth@beta`) with Google OAuth, Drizzle adapter, JWT sessions, through Keel's shared sign-in callback (below)
- **Styling**: Tailwind CSS v4
- **Deployment**: Vercel (auto-deploys from `main` branch on GitHub)

## Key Files

- `src/config/workouts.ts` — exercise definitions (programmatic, not in-app configurable)
- `src/db/schema.ts` — Drizzle schema (NextAuth tables + workout_sessions + workout_sets)
- `src/lib/auth.ts` — NextAuth config (Google provider, credentials passed explicitly due to beta env var bug)
- `src/app/workout/page.tsx` — workout tracker (client component, state persisted to localStorage)
- `src/app/stats/page.tsx` — stats view with personal bests and CSV export
- `src/app/api/stats/route.ts` — max weights (completed sets only) and last weights per exercise+set
- `src/app/api/workouts/route.ts` — list/create workout sessions
- `src/app/api/export/route.ts` — CSV export

## Architecture Notes

- Workout state is persisted to `localStorage` (key: `lifttracker-workout`) to survive mobile tab kills. Cleared on "Finish Workout".
- Weight is stored as integer (no decimal precision needed).
- The `incomplete` field was removed — actual reps vs target reps captures this.
- Google OAuth credentials must be passed explicitly to the provider (`Google({ clientId, clientSecret })`) because the NextAuth v5 beta doesn't reliably auto-detect `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` env vars.
- `trustHost: true` is required in the NextAuth config for Vercel deployment.

## Sign-in through the auth broker (2026-11-18)

- Google client: the "Keel Apps" OAuth client (Vercel env `GOOGLE_KEEL_CLIENT_ID` / `GOOGLE_KEEL_CLIENT_SECRET`,
  Production; on Ari's box the values are in `/root/.config/google-keel-apps/fields.env`). The old
  `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` (the app's own client) are unused but kept for rollback.
- redirect_uri is `https://auth.arizerner.com/callback` (only that URI is registered on the Keel Apps client). The
  broker, a Caddy redirect on Ari's box (`/root/ops/auth-broker/apps.conf`, ops owns it), forwards a callback whose
  `state` starts with `lifts.` to `https://lifts.arizerner.com/auth/callback` with the query unchanged.
- `src/lib/broker.ts` holds the constants. `api/auth/[...nextauth]/route.ts` prefixes Auth.js's own state with
  `lifts.` in the Google authorize URL; `app/auth/callback/route.ts` strips it and hands off to
  `/api/auth/callback/google`, where Auth.js checks state and PKCE against its cookies. `lib/auth.ts` sets the
  authorize redirect_uri and, via `customFetch`, the token exchange's redirect_uri.
- Google's `sub` is the same across clients, so the existing `accounts` row still matches;
  `allowDangerousEmailAccountLinking` is a fallback (single user).

## Vercel / Deployment

- **Scope**: `ari-zerners-projects`
- **Domain**: `lifts.arizerner.com` (DNS A 76.76.21.21 in Netlify DNS); `arilifts.vercel.app` redirects to it
- GitHub repo: `Ari-Zerner/lifttracker` (connected, auto-deploys on push to main)
- DB schema changes: run `POSTGRES_URL=... npm run db:push` (pull URL from `.env.local` via `vercel env pull`)
- Env vars set via `vercel env add` — use `printf '%s' 'value'` to pipe values (avoids trailing newline issues with `<<<`)

## Shell Commands

- Avoid using `$()` command substitution in shell commands
- When setting Vercel env vars, pipe with `printf '%s'` not `<<<` (heredoc adds trailing newline)
- `npx` is broken on this machine — use `./node_modules/.bin/<cmd>` or `npm run` instead
