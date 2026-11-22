# FixMate

FixMate is a role-based, on-demand device and home-appliance repair booking platform. Customers browse repair services, request a job, follow its progress and pay after completion. Technicians publish and manage services and jobs. Admins moderate services and oversee users, bookings and payments.

> **Assignment / demo project.** FixMate is an original repair-booking product built from the 2026 TypeScript/React boilerplate. The public site is dark by default with a light-theme toggle. All public copy, data and interactions describe FixMate services, technicians, customers, bookings and payments. The seeded accounts, Stripe test keys and ImgBB configuration are for local development and demos only. Harden secrets, rate limits and credentials before any real deployment.

**Live URL:** <https://fixmate-client-lemon.vercel.app><br />
**API URL:** <https://fixmate-server-flame.vercel.app>

## Features

- **Public site** — a dark-by-default, themeable FixMate landing page with a repair tracker preview, popular repair links, a four-step booking guide, trust and service-area details, a repair journey view, common questions, community stories, category cards and a final search, plus the service catalogue with server-side search/filter/sort/pagination, service detail pages with a booking request form, sign-in/sign-up, and payment success/cancel pages. A visible toggle switches the public site to a light palette.
- **Three role dashboards** — customer (bookings, payments), technician (services, incoming requests, completion and final price), admin (users, roles, service approval, all bookings, transactions and stats).
- **Enforced workflow** — booking status pipeline and payment gate are validated on the server; clients cannot skip steps or act on another user's records.
- **Payments** — all prices and charges are in BDT (৳) with the Stripe amount converted to the smallest unit; Checkout sessions include a signed webhook with amount validation, booking-level idempotency, paid timeline history and an explicit "pay only after completed" rule. Paid bookings and Pro subscriptions have downloadable PDF invoices.
- **Optional differentiators** — Pro Technician Plan (3 free services, unlimited Pro services and a verified badge), customer ratings/reviews with cached service averages and published review text on service detail pages, a job timeline tracker, server-side pagination, and a public light/dark theme toggle.
- **Auth & roles** — BetterAuth credentials with MongoDB persistence, a signed JWT cookie, and `customer` / `technician` / `admin` middleware guards. Destructive admin and technician actions require explicit confirmation.
- **Moderation** — technician-created services start `pending`; only approved, available services are publicly visible.
- **Image uploads** — browser sends a data URL to the API; the ImgBB key never leaves the server.
- **DX & testing** — npm workspaces, TypeScript, ESLint, Vitest unit tests, Playwright E2E, GitHub Actions CI, and OpenAPI-driven type generation.

## Tech stack

| Layer | Technology |
|---|---|
| Client | Next.js 16 (App Router), React 19, TypeScript 5.9, Redux Toolkit, React Hook Form + Zod 4, Chakra UI, CSS motion, next-themes, Sonner, Lucide |
| Server | Express 5, MongoDB + Mongoose 9, BetterAuth, jsonwebtoken, Stripe, Zod 4, Helmet, express-rate-limit |
| Tooling | npm workspaces, Vitest, Playwright, ESLint 10, openapi-typescript, concurrently, tsx/nodemon |

## Architecture overview

Two independent npm workspaces run side by side:

```
fixmate/
├── client/                 Next.js 16 App Router app (http://localhost:3000)
│   ├── src/app/(public)/   Landing, services, auth, payment result pages
│   ├── src/app/public.css  Scoped dark-by-default FixMate public styles with light overrides
│   ├── src/app/dashboard/  Customer / technician / admin dashboards
│   ├── src/components/     UI, layout, auth, dashboard and service components
│   ├── src/hooks/          Session guard + data hooks
│   ├── src/lib/            API client, constants, types, schemas, upload helper
│   └── src/store/          Redux Toolkit store (auth + UI slices)
├── server/                 Express 5 API (http://localhost:4000)
│   ├── src/routes/         /api route table
│   ├── src/controllers/    Route handlers
│   ├── src/models/         Mongoose schemas (User, Service, Booking, Payment)
│   ├── src/middleware/     verifyToken / verifyCustomer / verifyTechnician / verifyAdmin
│   ├── src/lib/            BetterAuth, JWT, Stripe, DB, status rules, validation
│   ├── src/config/         Env parsing, roles and status constants
│   └── src/seed/           Demo users, services, bookings and payment
├── docs/                   Architecture, API, auth, scripts and other guides
├── playwright/             E2E specs
└── package.json            Root workspace scripts
```

Request flow: **browser → Next.js client → Express API (`/api/*`) → MongoDB**. The client calls the API with `credentials: "include"`; the API sets a `fixmate_token` cookie and enforces roles/server-side ownership on every protected route. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Prerequisites

- Node.js **>= 24.13.1** and npm **>= 11.10.1**
- MongoDB: a local `mongod` on `127.0.0.1:27017` or a MongoDB Atlas connection string
- Stripe test-mode keys and a webhook signing secret (payments; [Stripe CLI](https://docs.stripe.com/stripe-cli) works locally)
- ImgBB API key (service image uploads; uploads fail with `503` until it is set)
- Playwright browser binaries only if running E2E tests: `npx playwright install chromium`

## Setup

```bash
npm install
cp server/.env.example server/.env
cp client/.env.local.example client/.env.local
# Fill in MongoDB, BetterAuth/JWT secrets, Stripe and ImgBB keys in server/.env
npm run seed -w server   # optional but recommended: demo users, services, bookings
npm run dev
```

- Client: <http://localhost:3000>
- API health check: <http://localhost:4000/api/health>
- Sign in with one of the demo accounts below.

Use strong, distinct random values for `BETTER_AUTH_SECRET` and `JWT_SECRET`. Do not wrap `.env` values in quotes — Node's `--env-file` keeps the quotes as part of the value.

## Available scripts

Root scripts (see [docs/SCRIPTS.md](docs/SCRIPTS.md) for workspace-level details):

| Script | Description |
|---|---|
| `npm run dev` | Start client and server together with hot reload (ports 3000 / 4000) |
| `npm run dev:client` | Start only the Next.js client |
| `npm run dev:server` | Start only the Express API |
| `npm run build` | Build the server, then the Next.js client |
| `npm start` | Start both workspaces in production mode |
| `npm run lint` | ESLint across both workspaces |
| `npm run lint:fix` | ESLint with automatic fixes |
| `npm run type-check` | TypeScript check for both workspaces (no emit) |
| `npm run test:unit` | Vitest unit tests (no dev server needed) |
| `npm run test:e2e` | Playwright E2E suite (starts the app automatically) |
| `npm run test` | Full chain: lint → type-check → unit → E2E |
| `npm run gen:api-types` | Regenerate TS types from `docs/openapi.yaml` in both workspaces |
| `npm run seed -w server` | Seed demo users, services, bookings and a payment |

## Demo accounts

Created by `npm run seed -w server`: two technicians (Rahim on Pro, Karim on Free), 12 approved services across the seven categories, and bookings in requested/accepted/in-progress/completed/cancelled states. One completed booking is paid and reviewable, with a matching transaction in the admin ledger.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@fixmate.test` | `ChangeMe123!` |
| Technician (Rahim) | `technician@fixmate.test` | `FixMate123!` |
| Technician (Karim Ahmed) | `tech2@fixmate.test` | `FixMate123!` |
| Customer | `customer@fixmate.test` | `FixMate123!` |

Karim Ahmed's account is ready for the technician request flow. Change these credentials for any shared environment.

## Role capabilities

| Role | Can do |
|---|---|
| Customer | Browse/search services, request a repair (one active request per service), cancel a `requested` job, view the timeline/progress, rate a completed paid job once, create Stripe Checkout only after completion, view payment history and download PDF invoices, edit own profile |
| Technician | Add/edit/delete own services (3 free, unlimited on Pro), toggle availability, see request status in `pending` → `approved` moderation, accept/reject requests, move jobs through `in-progress` → `completed`, set the final amount, view assigned jobs and status history, upgrade to Pro and download subscription invoices |
| Admin | View all users and change roles (not their own), approve/reject/pend services, view all bookings and transactions/revenue, see platform stats |

## API

- Production base URL: <https://fixmate-server-flame.vercel.app> (all routes are under `/api`)
- Local base URL: **http://localhost:4000**
- Auth: `fixmate_token` JWT cookie issued on signup/signin; send cookies with requests (`credentials: "include"`). A `Bearer` token is also accepted by the middleware.
- Human-friendly endpoint reference: [docs/API.md](docs/API.md)
- Machine-readable contract: [docs/openapi.yaml](docs/openapi.yaml)
- Auth details: [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)

## Environment variables

Server — `server/.env` (see `server/.env.example`):

| Variable | Purpose | Default / example |
|---|---|---|
| `NODE_ENV` | Runtime mode | `development` |
| `PORT` | API port | `4000` |
| `CLIENT_URL` | Client origin for CORS and auth callbacks | `http://localhost:3000` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated extra allowed origins | `http://localhost:3000` |
| `MONGODB_URI` | MongoDB connection string (Atlas `mongodb+srv://…/fixmate` in production) | `mongodb://127.0.0.1:27017/fixmate` |
| `BETTER_AUTH_URL` | Public API URL used by BetterAuth | `http://localhost:4000` |
| `BETTER_AUTH_SECRET` | BetterAuth signing secret | set a long random string |
| `GOOGLE_CLIENT_ID` | Optional Google OAuth client id | placeholder (feature hidden) |
| `GOOGLE_CLIENT_SECRET` | Optional Google OAuth client secret | placeholder (feature hidden) |
| `JWT_SECRET` | Secret for the role-middleware JWT | set a different long random string |
| `JWT_EXPIRES_IN` | JWT lifetime | `7d` |
| `IMGBB_API_KEY` | Server-side ImgBB upload key | set for service/profile photo uploads |
| `STRIPE_SECRET_KEY` | Stripe test secret key | empty |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (CLI `whsec_…` locally, Dashboard secret in production) | empty |
| `STRIPE_SUCCESS_URL` | Checkout success redirect | `http://localhost:3000/payment/success` |
| `STRIPE_CANCEL_URL` | Checkout cancel redirect | `http://localhost:3000/payment/cancel` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeded admin credentials | `admin@fixmate.test` / `ChangeMe123!` |

Client — `client/.env.local` (see `client/.env.local.example`):

| Variable | Purpose | Default / example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Express API base URL | `http://localhost:4000` |
| `NEXT_PUBLIC_SITE_URL` | Public client origin | `http://localhost:3000` |
| Image uploads | No client key; images are posted to `POST /api/uploads/image` and ImgBB is called by the server | — |

## Deployment notes

This submission is deployed to Vercel in two projects: `fixmate-server` (Express API) and `fixmate-client` (Next.js client). Deploy the API first, then the client; both use Node.js 24.x.

- **Client:** deployed from `client/` at <https://fixmate-client-lemon.vercel.app>. Set `NEXT_PUBLIC_API_URL=https://fixmate-server-flame.vercel.app` and `NEXT_PUBLIC_SITE_URL=https://fixmate-client-lemon.vercel.app`.
- **Server:** deployed from `server/` at <https://fixmate-server-flame.vercel.app>. `server/vercel.json` builds a bundled ESM entry (`api/index.mjs`) with `npm run build:vercel` and routes every request to it; `server/.env` values are configured as Vercel project environment variables with `NODE_ENV=production`.
- **Database:** MongoDB Atlas. `MONGODB_URI` is set on the API project; `CORS_ALLOWED_ORIGINS` contains the production client origin.
- **CORS/auth origins:** `CLIENT_URL`, `CORS_ALLOWED_ORIGINS` and `BETTER_AUTH_URL` use the deployed origins. The cross-site `fixmate_token` cookie is `httpOnly`, `secure` and `sameSite=none` in production. Roles are read from MongoDB on every request, so role changes take effect immediately; a raw ObjectId lookup fallback supports BetterAuth-created user ids.
- **Stripe:** the webhook endpoint is <https://fixmate-server-flame.vercel.app/api/payments/webhook> and listens for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Its signing secret is stored as `STRIPE_WEBHOOK_SECRET` on the API project. Success/cancel redirects point to `https://fixmate-client-lemon.vercel.app/payment/success` and `/payment/cancel`. Locally: `stripe listen --forward-to localhost:4000/api/payments/webhook`.
- **Google login (optional):** placeholder `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` values keep the button hidden. Replace them on the API project and register `https://fixmate-server-flame.vercel.app/api/auth/callback/google` in Google Cloud Console to enable it; Google users get the `customer` role by default.
- **Secrets & seed:** never commit `.env` files. Do not run the seed command in production, and rotate the seeded admin password via `ADMIN_EMAIL` / `ADMIN_PASSWORD` before seeding shared environments. `server/.env` and `client/.env.local` in this workspace contain the production field values for reference; keep the webhook secret out of source control.

### Submission configuration checklist

- [x] MongoDB: `MONGODB_URI`
- [x] Auth: `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `JWT_SECRET`
- [x] Uploads: `IMGBB_API_KEY` (service and profile photo uploads)
- [x] Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`
- [x] Domains: `CLIENT_URL`, `CORS_ALLOWED_ORIGINS`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, plus BetterAuth trusted origins on the deployed API host
- [x] Admin seed: `ADMIN_EMAIL`, `ADMIN_PASSWORD` (change before seeding a shared environment)
- [x] Stripe Dashboard: webhook subscribed to `checkout.session.completed` and `checkout.session.async_payment_succeeded` at `https://fixmate-server-flame.vercel.app/api/payments/webhook`
- [ ] Optional Google login: paste real `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` values and register the callback URI above; placeholders are installed by default

## Documentation

- [Architecture](docs/ARCHITECTURE.md) · [API guide](docs/API.md) · [Authentication](docs/AUTHENTICATION.md) · [Technology](docs/TECHNOLOGY.md)
- [Contributing](docs/CONTRIBUTING.md) · [Scripts](docs/SCRIPTS.md) · [Changelog](CHANGELOG.md)
- Retired boilerplate topics: [Feature flags](docs/FEATURE_FLAGS.md), [i18n](docs/I18N.md), [Redirects](docs/REDIRECTS.md), [Auth profiles](docs/AUTH_PROFILES.md), [Security headers](docs/SECURITY_HEADERS.md)

## License

MIT
