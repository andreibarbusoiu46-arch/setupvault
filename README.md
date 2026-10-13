# SetupVault

**Your Personal Trading Setup Library.**

SetupVault is a searchable, private library of the trading setups you actually
take — the screenshot, the strategy, the levels, the tags and the outcome, kept
together in one record. It is deliberately not another trading journal: a
journal answers *what happened last month*, a library answers *which of my
setups works*.

This repository contains **Phase 1** (the production foundation) and
**Phase 2** (the setup library itself).

---

## What is in this phase

Working today:

- Supabase authentication — signup, login, logout, forgot password, full
  password reset flow, persistent sessions
- Route protection at the proxy layer and re-verified server-side in every
  protected layout
- PostgreSQL schema for profiles and setups, with Row Level Security
- Application shell — desktop sidebar, top bar, mobile drawer
- Full setup CRUD — create, read, edit and delete trading setups
- Screenshot upload to a private Supabase Storage bucket, served through
  short-lived signed URLs
- Automatic risk-to-reward calculation, with the invalid cases refused rather
  than stored
- Favourites, persisted and optimistic with rollback
- Dashboard statistics computed from real rows, never hardcoded
- Profile page with validated, persisted editing
- Settings — theme, notification preferences, and real account deletion
- A complete marketing landing page
- Dark-first design system with strategic glassmorphism

Deliberately **not** built yet: search and filtering, analytics, AI, Stripe,
calendar, TradingView and broker integrations. Analytics exists as an honest
placeholder that says what is coming — no button in this app pretends to work.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Language | TypeScript, `strict` |
| Styling | Tailwind CSS v4 with CSS-variable design tokens |
| Components | Radix primitives, shadcn/ui conventions |
| Backend | Supabase — Postgres, Auth, RLS |
| Forms | React Hook Form + Zod 4 |
| Server state | TanStack Query 5 |
| Animation | Framer Motion |
| Icons | lucide-react |
| Fonts | Geist Sans and Geist Mono, self-hosted |

---

## Architecture

```
app/
  (auth)/            login, signup, forgot-password, reset-password
  (app)/             protected shell: dashboard, setups (list, new,
                     detail, edit), favorites, analytics, profile,
                     settings
  auth/              email-link and PKCE route handlers
  api/account/       DELETE — account deletion (service role)
components/
  ui/                design-system primitives
  layout/            sidebar, top bar, mobile drawer, user menu
  providers/         theme, react-query, toaster
  brand/             logo
features/            vertical slices: marketing, auth, dashboard,
                     profile, settings
hooks/               React Query hooks
lib/                 supabase clients, env, routes, navigation, utils
services/            data access — every Supabase query lives here
types/               database types mirroring the SQL
supabase/migrations/ the SQL you run in your project
```

Three rules hold this together:

1. **Business logic stays out of components.** Queries live in `services/`,
   which take a Supabase client and work identically on server and client.
2. **Authorisation is never a frontend concern.** The proxy redirects,
   `requireUser()` gates each protected layout, and Row Level Security is the
   layer that actually decides which rows exist.
3. **Server Components by default.** `"use client"` appears only where there is
   real interaction: forms, menus, the drawer, theme controls.

---

## Installation

Requirements: Node.js 20.9+ and a Supabase account.

```bash
git clone <your-repo-url>
cd setupvault
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

Open <http://localhost:3000>.

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key; safe in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | For account deletion | **Secret.** Bypasses RLS. Server-only |
| `NEXT_PUBLIC_SITE_URL` | Production | Origin used to build auth email links |

`.env.local` is gitignored. Missing variables produce a named error rather than
a stack trace.

---

## Supabase setup

Full walkthrough, including verification steps: **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**.

The short version:

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` in the SQL Editor.
3. Run `supabase/migrations/0002_storage.sql` for the screenshot bucket.
4. Add `/auth/confirm` and `/auth/callback` to your allowed redirect URLs.
5. Copy your keys into `.env.local`.

---

## Development commands

```bash
npm run dev        # development server
npm run build      # production build
npm start          # serve the production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

Run `npm run typecheck && npm run lint && npm run build` before every commit.

---

## Production build

```bash
npm run build
npm start
```

Deploying to Vercel: import the repository, add the four environment variables,
and deploy. Then update **Site URL** and **Redirect URLs** in Supabase to your
production domain, and set `NEXT_PUBLIC_SITE_URL` to match — otherwise auth
emails will keep linking to localhost.

---

## Design system

Dark-first, defined as CSS custom properties in `app/globals.css` and exposed to
Tailwind through `@theme inline`.

- **Canvas** `#07080a`, with two surfaces above it for layering
- **Accent** a single restrained indigo (`#5b7cfa`), never used for results
- **Green and red** reserved exclusively for trading outcomes, so a colour in
  the interface always means the same thing
- **Glass** is opt-in via `.glass` and `.glass-strong`, applied to the navbar,
  sidebar, dashboard cards, modals and floating surfaces — not to everything
- **Type** Geist Sans throughout; Geist Mono with tabular figures for every
  number, because numbers in a trading product get read in columns
- A full light theme ships alongside, selectable in Settings and stored on the
  user's profile

Motion is deliberate: one orchestrated hero entrance, the drawer transition, and
interaction feedback. `prefers-reduced-motion` is respected globally.

---

## Roadmap

**Phase 3 — finding things.** Full-text and tag search, filters by market,
direction, result and strategy, saved views.

**Phase 4 — what the library tells you.** Performance by strategy, tag, market
and session; risk-to-reward distribution; expectancy.

**Phase 5 — accounts and billing.** Stripe, subscription tiers, plan
enforcement.

**Later.** Calendar view, AI-assisted pattern insights, TradingView embeds,
export.

---

## Licence

Private and unreleased.
