# FixMate Server

Express 5 + MongoDB API for FixMate. It provides credentials authentication with BetterAuth and JWT role middleware, the service catalogue, the booking status pipeline, Stripe Checkout/webhook handling, and server-side image uploads.

## Requirements

- Node.js >= 24.13.1
- npm >= 11.10.1
- MongoDB (local `mongod` or MongoDB Atlas)

## Setup

```bash
npm install
cp .env.example .env
# Fill in MONGODB_URI, secrets, Stripe and ImgBB keys in .env
npm run dev
```

The API listens on `http://localhost:4000` by default. `GET /api/health` returns the service status.

## Environment

See `.env.example` for the full list. Key values:

- `MONGODB_URI` — MongoDB connection string. For Atlas use `mongodb+srv://<user>:<password>@<cluster-host>/fixmate?retryWrites=true&w=majority`.
- `BETTER_AUTH_URL` / `BETTER_AUTH_SECRET` — BetterAuth configuration.
- `JWT_SECRET` — signing secret for the role-middleware cookie.
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Stripe Checkout and signed webhook.
- `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` — Checkout redirects.
- `IMGBB_API_KEY` — optional; uploads are disabled when empty.
- `CLIENT_URL` / `CORS_ALLOWED_ORIGINS` — allowed browser origins.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — seeded admin credentials.

Do not wrap `.env` values in quotes; Node's `--env-file` keeps the quotes as part of the value.

## Seed data

```bash
npm run seed
```

Creates an admin, two technicians, a customer, 13 approved services across categories, and bookings in several statuses. The `fixmate` database is created automatically on first successful connection.

Default accounts:

- Admin: `admin@fixmate.test` / `ChangeMe123!`
- Technician: `technician@fixmate.test` / `FixMate123!`
- Customer: `customer@fixmate.test` / `FixMate123!`

## Stripe webhook

Locally:

```bash
stripe listen --forward-to localhost:4000/api/payments/webhook
```

Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.

In production, create a Dashboard endpoint at `https://<api-host>/api/payments/webhook` subscribed to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.

## Scripts

- `npm run dev` — nodemon + tsx development server
- `npm run build` — TypeScript build
- `npm start` — production server
- `npm run lint` — ESLint
- `npm run type-check` / `npm run typecheck` — TypeScript verification
- `npm run test:unit` — Vitest unit tests
- `npm run seed` — seed demo data
