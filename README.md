# Jaigaon Quality Enterprise · Dashboard

Trading, export, inventory and business management web application.

| Folder      | What it is                                  | Stack                              |
| ----------- | ------------------------------------------- | ---------------------------------- |
| `frontend/` | The web app staff sign in to                | Next.js 16, React 19, Tailwind CSS |
| `backend/`  | The REST API and database access            | NestJS 12, Prisma 7, PostgreSQL 17 |

The browser only ever talks to the frontend. Requests to `/api/*` are forwarded
by Next.js to the backend, so the session cookie stays same-origin.

## What works today

- Sign in and sign out, with lockout after 5 failed attempts
- User settings: change name, display name, phone and password
- Signed-in devices: list them and sign any of them out
- Collapsible sidebar listing every module in the Scope of Work
- Recording WhatsApp opt-ins sent by the company website

The Dashboard, Rate enquiry and OCR inbox screens are built but show **sample
data** (each says so on screen). The other modules open a "Not built yet" page.

## Run it locally

Needs Node.js 24+ and Docker.

```bash
docker compose up -d
```

Backend, in `backend/`:

```bash
cp .env.example .env
```

Fill in `WEBSITE_API_KEY` (32+ random characters) and the `SEED_ADMIN_*`
values in `.env`, then:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

Frontend, in `frontend/`:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 and sign in with the seeded administrator.

## Checks

| Where       | Command                                              |
| ----------- | ---------------------------------------------------- |
| `backend/`  | `npm run build`, `npm test`, `npm run lint`          |
| `frontend/` | `npm run build`, `npm run lint`, `npm run typecheck` |

## Folder guide

```
backend/
  prisma/            schema.prisma (data model), seed.ts (first admin)
  src/
    config/          environment variable validation
    database/        Prisma client as a NestJS service
    common/          guards, decorators and types shared by all modules
    auth/            login, sessions, password hashing and policy
    users/           the signed-in user's own profile and password
    whatsapp-optins/ consent records sent by the public website
    health/          GET /api/health

frontend/src/
  app/               routes: (auth)/login and everything under (app)/
  components/ui/     small reusable pieces: button, text field, glass card
  components/layout/ app shell, sidebar, top bar
  config/            navigation list, auth constants, security headers
  features/<name>/   everything belonging to one screen or module
  lib/               API client, formatting, server-side session lookup
  types/             shapes shared with the backend
```
