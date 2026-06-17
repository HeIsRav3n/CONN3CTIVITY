-- CONN3CTIVITY Supabase Schema
-- Run this in the Supabase SQL editor (https://supabase.com/dashboard)

-- ──────────────────────────────────────────────────────
--  server_stats
--  Written by discord-bot.cjs, read by DiscordPrism.jsx
-- ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.server_stats (
  id                        TEXT PRIMARY KEY,          -- Discord guild snowflake
  name                      TEXT,
  conn3ctor_count           INTEGER DEFAULT 0,
  approximate_presence_count INTEGER DEFAULT 0,
  total_members             INTEGER DEFAULT 0,
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public read, deny public write (bot uses service-role key)
ALTER TABLE public.server_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read server_stats"
  ON public.server_stats FOR SELECT
  USING (true);

-- ──────────────────────────────────────────────────────
--  conn3ctors
--  Written by discord-bot.cjs, read by MapSection.jsx
-- ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conn3ctors (
  id              TEXT PRIMARY KEY,   -- Discord user snowflake
  name            TEXT,
  discord_handle  TEXT,
  avatar          TEXT,
  color           TEXT,
  "group"         INTEGER DEFAULT 1,
  x_handle        TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conn3ctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read conn3ctors"
  ON public.conn3ctors FOR SELECT
  USING (true);

-- ──────────────────────────────────────────────────────
--  mvc_profile
--  Written by discord-bot.cjs, read by MVCSection.jsx
-- ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mvc_profile (
  id          TEXT PRIMARY KEY,   -- Discord user snowflake
  username    TEXT,
  avatar_url  TEXT,
  twitter     TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mvc_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read mvc_profile"
  ON public.mvc_profile FOR SELECT
  USING (true);

-- ──────────────────────────────────────────────────────
--  Enable Realtime on both bot-synced tables
--  (allows supabase.channel() subscriptions to fire)
-- ──────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conn3ctors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mvc_profile;
