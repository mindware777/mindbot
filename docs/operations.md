# Mindbot Operations

## Current Static Deployment

- Cloudflare Worker: `mindbot`; production branch: `main`; build root: `/`.
- Build: `bun run build:workers` (`build:pages` is a compatibility alias).
- Deploy: `npx wrangler deploy`, using the pinned version and `wrangler.jsonc`.
- Next.js exports to `out/`; Workers serves trailing-slash routes and real 404s.
- Commit required runtime source before deploying: Cloudflare cannot see untracked files.
- Static builds validate content without database writes. Supabase variables are optional for reading; login/comments are unavailable without configuration.
- The legacy `scripts/register-articles.ts` is not invoked by the build and is incompatible with the forum upgrade.

## Database and Authentication Handoff

- The initial migration defines legacy article comments. `202611070002_forum.sql` adds discussions/posts, forum state, moderation, and RPCs; it has only been applied to disposable test databases.
- The UI and `lib/database.types.ts` still use legacy comments. Switch them to the forum RPCs and `lib/forum-database.types.ts` before using the upgrade in the application.
- Local SQL verification used PostgreSQL 18.3 with an Auth fixture. Full Supabase 17/PostgREST/forum integration checks remain pending; hosted Google Auth can be checked independently using the local app below.
- Inspect migration history, back up existing data, and verify policies before remote application. See [SCHEMA.md](../SCHEMA.md) for contracts and migration details.
- Google OAuth redirects to `https://<project-ref>.supabase.co/auth/v1/callback`. Supabase permits trusted site URLs ending in `/auth/callback/`, including localhost during development.
- Browser PKCE sessions persist locally. Configure the production Site URL and explicitly allow trusted callback origins.
- Public build keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Keep `SUPABASE_PUBLISHING_KEY` restricted to publishing, never browser code or ordinary SSR.
- Article/comment data makes no Supabase requests until comments open. The header restores the browser session and optionally reads the signed-in profile. Comments load 20 at a time, with manual refresh and no polling; database failures must not block static reading or login.

## Local Google Login with Hosted Supabase

1. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the ignored `.env.local`. These point to the hosted project; a local Supabase stack and publishing key are not needed for login. Restart the dev server after changing these values.
2. Keep Supabase's production Site URL and existing redirect entries. In Authentication -> URL Configuration, allow these exact additional URLs:
   - `http://localhost:3000/auth/callback/`
   - `http://127.0.0.1:3000/auth/callback/`
3. In the Google Web OAuth client, authorize `https://<project-ref>.supabase.co/auth/v1/callback`. The Google provider in Supabase must use that client's ID and existing secret. The browser uses a redirect flow; Google JavaScript origins and a Google client secret in the app are not required.
4. Run `bun dev` and open `http://localhost:3000`. Keep port 3000 available; another port requires its own Supabase callback entry. `127.0.0.1:3000` is also enabled through Next.js `allowedDevOrigins`, but it has separate browser storage. Complete each login in the same browser and origin where it started.
5. Select `Continue with Google`. After consent, expect the original Home, News, Community, or Jobs path, including query filters and anchors, with a name and `Sign out` in the header. Refresh and navigate to confirm persistence, then sign out and refresh again.

The callback exchanges the PKCE code once, including during development effect replay. Cancellation, missing/expired codes, and provider failures show an English error with `Try again`. Session loading errors offer `Retry session`; failed logout remains retryable. Return URLs outside the supported site sections fall back to `/`.

The header prefers `profiles.display_name`, then the Google name, then `Member`. An unavailable profile table does not block authentication. The hosted project returned `PGRST205` for `public.profiles` during the November 8, 2026 inspection. Login verification does not establish that comment/forum tables or policies are deployed; do not run `supabase db push` as a login prerequisite.

If Supabase returns `Unsupported provider: missing OAuth secret`, Google may be enabled with a Client ID but no saved Client Secret. Enter and save the Google Web client's secret in the Supabase provider settings; it does not belong in the app's environment variables.

Verified November 8, 2026 with `bun dev` and hosted Supabase in Chrome:

- Real Google login from localhost News returned to the original path, query filter, and anchor, with the Google name and `Sign out` visible despite the unavailable profile table.
- Session persistence was checked after refresh and on Community. Logout returned the header to `Continue with Google` and persisted after refresh.
- An independent login from `127.0.0.1:3000` returned to the original Jobs path, query, and anchor. Refresh retained its session, and logout cleared it.
- Reopening an already-used callback showed the restart instruction; `Try again` completed a fresh login and returned home.
- Query/hash cancellation and missing-code/verifier screens were checked in the local browser. Automated tests cover expired-code errors and unsafe return paths. Simulated session-read/logout network failures were not browser-tested.
- `bun test` (16 tests), `bun run lint`, and `bun run build:workers` passed. No remote schema migration or deployment was performed.

## Planned Hybrid Delivery

One Next.js app will use OpenNext on Workers for community SSR while generating article/company/job HTML at build time. Company/job data stays in Git; jobs have no comments. This requires replacing application-wide `output: "export"`; it is not implemented yet.

Future publication prepares article references, deploys, then activates the successful manifest. Retire withdrawn articles without deleting discussion history. Preview builds never write production data. Local comment testing uses explicit local article registration; see [SCHEMA.md](../SCHEMA.md).

## Verification

- Run `bun test`, `bun run lint`, and `bun run build:workers` for relevant application changes.
- Run `bun run test:db` for migrations/RPCs; regenerate forum types with `bun run test:db:update-types`.
- Use `bun run preview:workers` to check article deep links, draft/unknown 404s, and OAuth query parameters through trailing-slash redirects.
- With configured Auth, verify login/cancellation, persistence, ownership, pagination, cooldowns/concurrency, moderation, and outages.
- Next.js instruction generation and agent feedback are disabled in `next.config.ts` to keep `AGENTS.md` short.

Design rules live in [DESIGN.md](../DESIGN.md); remaining work is tracked in [TODO.txt](../TODO.txt).
