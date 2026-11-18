# FixMate Server

Express + MongoDB backend for FixMate.

## Live URL
https://fixmate-server.onrender.com

## Setup
```bash
cp .env.example .env
# fill values
npm install
npm run dev
npm run seed
```

## Tech Stack
Express 5, TypeScript, Mongoose, BetterAuth (seeding), Stripe, pdfkit, jose (JWKS), zod.

## Scripts
- dev: tsx watch src/index.ts
- build: tsc
- start: node dist/index.js
- seed: tsx src/seed.ts
- typecheck: tsc --noEmit
