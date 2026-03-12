# LiftTracker

Workout tracking web app deployed to https://arilifts.vercel.app

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: Neon Postgres via `@vercel/postgres` + Drizzle ORM
- **Auth**: NextAuth v5 beta (`next-auth@beta`) with Google OAuth, Drizzle adapter
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

## Vercel / Deployment

- **Scope**: `ari-zerners-projects`
- **Domain**: `arilifts.vercel.app`
- GitHub repo: `Ari-Zerner/lifttracker` (connected, auto-deploys on push to main)
- DB schema changes: run `POSTGRES_URL=... npm run db:push` (pull URL from `.env.local` via `vercel env pull`)
- Env vars set via `vercel env add` — use `printf '%s' 'value'` to pipe values (avoids trailing newline issues with `<<<`)

## Shell Commands

- Avoid using `$()` command substitution in shell commands
- When setting Vercel env vars, pipe with `printf '%s'` not `<<<` (heredoc adds trailing newline)
- `npx` is broken on this machine — use `./node_modules/.bin/<cmd>` or `npm run` instead
