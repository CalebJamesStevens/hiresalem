# HireSalem MVP

Monorepo for a Salem-local job board using Next.js (App Router), Bun workspaces, Postgres, Drizzle ORM, Tailwind, and Auth.js with Keycloak.

## Auth and Role Model

This app expects an existing cloud Keycloak realm (no local Keycloak service in this repo).
Keycloak stays behind the scenes: users only interact with app-hosted `/signin` and `/signup` pages.

Required roles:

- `admin`: full moderation access (`/admin/*`, all jobs/applications)
- `business`: create/manage own jobs (`/post-job`, `/dashboard/jobs`)
- `user`: apply to onsite jobs and view own applications (`/dashboard/applications`)

Default role recommendation in Keycloak:

- new signups -> `user`
- app flow can upgrade signed-in users to `business`
- assign `admin` manually via Keycloak admin

## Environment

Copy `.env.example` to `.env` and set real values:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_KEYCLOAK_ISSUER`
- `AUTH_KEYCLOAK_ID`
- `AUTH_KEYCLOAK_SECRET`
- `AUTH_KEYCLOAK_ADMIN_ID` (optional, recommended for signup/admin actions)
- `AUTH_KEYCLOAK_ADMIN_SECRET` (optional, recommended for signup/admin actions)
- `AUTH_KEYCLOAK_DEFAULT_ROLE` (defaults to `user`)
- `NEXT_PUBLIC_APP_URL` (recommended for Stripe redirects)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GOOGLE_INDEXING_API_SERVICE_ACCOUNT_JSON` or both `GOOGLE_INDEXING_API_CLIENT_EMAIL` + `GOOGLE_INDEXING_API_PRIVATE_KEY` (optional, recommended for job URL indexing)
- `CRON_SECRET` (required if you want cron endpoints protected)

Keycloak requirements for signup:

- `AUTH_KEYCLOAK_ISSUER` must point at a real realm, for example `https://sso.example.com/realms/hiresalem`.
- Prefer a dedicated confidential admin client via `AUTH_KEYCLOAK_ADMIN_ID` / `AUTH_KEYCLOAK_ADMIN_SECRET`.
- If the admin variables are omitted, signup falls back to `AUTH_KEYCLOAK_ID` / `AUTH_KEYCLOAK_SECRET`.
- The admin client must have service accounts enabled.
- That client's service account needs realm-management permissions to create users and map roles.

Business upgrade flow:

- signed-in `user` accounts can visit `/become-business`
- the app creates a company profile, grants the Keycloak `business` role, and refreshes the app session
- business-posted jobs are automatically linked to the account's company profile

Paid listings:

- business job listings use Stripe Checkout
- listings are billed at `$5/day`
- a listing stays hidden until the Stripe payment succeeds
- configure your Stripe webhook endpoint to post `checkout.session.completed`, `checkout.session.expired`, and `checkout.session.async_payment_failed` to `/api/stripe/webhooks`
- if Google Indexing API credentials are configured, live job pages automatically notify Google when they are published, closed, deleted, or expired
- schedule `/api/cron/job-expirations` with `x-cron-secret: $CRON_SECRET` so expired listings are marked closed and sent to Google as removals

Business plans foundation:

- employer/company accounts now persist a base `plan` plus an optional `planOverride`
- the effective plan and entitlements live in [`packages/db/plans.ts`](/Users/caleb/repos/hiresalem/packages/db/plans.ts)
- existing companies default safely to `free`
- the `free` plan currently allows up to 3 active jobs, standard visibility, and basic profile fields only
- Free-plan onboarding lives at `/become-business` and captures the basic public company profile fields: name, logo URL, short description, website, and city/area
- the employer-facing profile editor lives at `/dashboard/company`, and the public company page continues to render at `/jobs/company/[slug]`
- Free-plan employers can save drafts, publish up to 3 live jobs at once, close/reopen eligible jobs from `/dashboard/jobs`, and use the standard listing duration without billing
- Enhanced Profile unlocks social links, expanded about content, why work here, benefits/perks, and hosted cover/gallery image URLs on company pages
- public company pages only render those richer sections when the effective plan allows them; stored enhanced fields stay hidden on Free
- Featured Job and Business Pro unlock a featured checkbox on employer job forms, a featured quick action in `/dashboard/jobs`, and boosted ordering on supported public job-listing surfaces
- featured visibility stays controlled by the company entitlement at render time, so jobs lose public boosting automatically if the business is downgraded later
- employers can review their current plan, included capabilities, and upgrade-only capabilities at `/dashboard/plan`
- admins can manually assign pilot plans and override notes for businesses at `/admin/businesses`
- upgrade prompts are intentionally simple and point back to manual/internal enablement until billing is integrated

## Commands

- `bun install`
- `bun run dev`
- `bun run build`
- `bun run db:generate`
- `bun run db:migrate`
- `bun run db:seed`

## Docker / Coolify

- For local Docker usage, run `docker compose up` from the repo root. The root [`compose.yml`](/Users/caleb/repos/hiresalem/compose.yml) keeps build paths correct for standard Compose.
- For Coolify, point the service at [`docker/docker-compose.yml`](/Users/caleb/repos/hiresalem/docker/docker-compose.yml). That file is written for Coolify's `--project-directory` behavior.
- The compose files do not publish fixed host ports.
- The web container exposes `3000` internally.
- The Postgres container exposes `5432` internally for other services on the Docker network.
- In Coolify, let the platform publish the web service and assign the external port or domain.

## SEO Host Redirects

Production should enforce canonical host redirects at the edge or CDN before traffic reaches the app:

- `http://hiresalem.com/*` -> `https://hiresalem.com/*` with `308`
- `http://www.hiresalem.com/*` -> `https://hiresalem.com/*` with `308`
- `https://www.hiresalem.com/*` -> `https://hiresalem.com/*` with `308`

Preserve the full path and query string on each redirect.

The app also contains a fallback normalization layer for `www` and `http`, but the edge rule should remain the primary enforcement point for bots and users.
