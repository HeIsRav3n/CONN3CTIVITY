# CONN3CTIVITY

Cinematic Web3 community landing page — Discord-centric CM network. Built with React 19, Vite, Framer Motion, and a custom radial Conn3ctor map.

## Prerequisites

- Node.js 20+
- npm

## Getting Started

1. Copy `.env.example` → `.env` and fill in values:
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — Discord OAuth + profiles
   - `NEON_DATABASE_URL` — server-side only (APIs + Discord bot). Never use a `VITE_` prefix for Neon.
   - Discord bot vars if you run the sync bot
2. Install and run:
   ```bash
   npm install
   npm run dev
   ```
   Local `/api/*` routes are served by Vite via `vite-plugin-local-api.js` (needs `NEON_DATABASE_URL`).

## Live data architecture

| Data | Writer | Reader |
|------|--------|--------|
| Server stats, Conn3ctors map, MVC | Discord bot **and** `/api/*` live pull (every ~45s while the site is used) plus Vercel cron `/api/sync` | Frontend via **`/api/stats`**, **`/api/conn3ctors`**, **`/api/mvc`** (polls every 5s) |
| Auth + profiles | Supabase Auth | Supabase client |
| MVC enrichment (CM type, services, etc.) | Profile upserts in Supabase | MVC section merges Neon winner + `profiles` row |
| Detectivity threats | `npm run update-scammers` → `scammers.json` | Static import (redeploy to refresh) |

Set `DISCORD_BOT_TOKEN` + `NEON_DATABASE_URL` on Vercel so the website keeps pulling Discord → Neon even if the bot host is down. Optional `CRON_SECRET` authenticates `GET /api/sync`. Keep `discord-bot.cjs` running for instant Gateway events (joins/leaves/roles).

### One-shot map sync

```bash
node fetchDiscordMap.cjs
```

### Scammer snapshot

```bash
npm run update-scammers
```

### Profiles schema

Run the `profiles` section of [`supabase-schema.sql`](supabase-schema.sql) in the Supabase SQL editor.

## Deploy (Vercel)

1. Set project env vars: `NEON_DATABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
2. Add your production + preview origins to Supabase Auth redirect URLs (OAuth uses `window.location.origin`)
3. Push to `main` — Vite build + `/api` serverless functions deploy together

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite + local `/api` |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest smoke tests |
| `npm run update-scammers` | Refresh Detectivity JSON |
| `npm run bot` | Discord gateway bot (Neon + Supabase Realtime mirror) |
| `npm run seed:live` | One-shot Neon → Supabase live table seed |

## Stack

- React 19 + Vite 8
- Tailwind CSS v4
- Framer Motion + Lenis
- Custom 2D radial bubble map (`RadialBubbleMap`)
- Neon Postgres (API source of truth for Discord data)
- Supabase (Auth / profiles / Realtime live mirrors)
- Vercel Analytics

## Realtime

The site subscribes to Supabase Realtime on `server_stats`, `conn3ctors`, `mvc_profile`, and `profiles`.
Keep `discord-bot.cjs` running with `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` so Discord events dual-write to Neon and Supabase.
