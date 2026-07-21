-- CONN3CTIVITY database schema notes
-- Live Discord stats / map / MVC live in Neon (written by discord-bot.cjs).
-- Auth + profiles live in Supabase.
-- Run the profiles section in the Supabase SQL editor.
-- Neon tables are created/assumed by the bot (see below for reference DDL).

-- ══════════════════════════════════════════════════════
--  NEON (reference — already present in production)
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.server_stats (
  id                         TEXT PRIMARY KEY,
  name                       TEXT,
  conn3ctor_count            INTEGER DEFAULT 0,
  approximate_presence_count INTEGER DEFAULT 0,
  total_members              INTEGER DEFAULT 0,
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conn3ctors (
  id              TEXT PRIMARY KEY,
  name            TEXT,
  discord_handle  TEXT,
  avatar          TEXT,
  color           TEXT,
  "group"         INTEGER DEFAULT 1,
  x_handle        TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mvc_profile (
  id          TEXT PRIMARY KEY,
  username    TEXT,
  avatar_url  TEXT,
  twitter     TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
--  SUPABASE — profiles (Auth users)
--  Run in: https://supabase.com/dashboard → SQL Editor
-- ══════════════════════════════════════════════════════

-- NOTE: profiles.id is TEXT (stores auth.users UUID as text).
-- The existing live schema has id TEXT with RLS policies already applied.
-- This block is idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS public.profiles (
  id           TEXT PRIMARY KEY,
  username     TEXT,
  discord_id   TEXT UNIQUE,
  avatar_url   TEXT,
  twitter      TEXT,
  telegram     TEXT,
  cm_type      TEXT,
  services     TEXT,
  experience   TEXT,
  communities  JSONB DEFAULT '[]',
  role         TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_discord_id_idx ON public.profiles (discord_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Public can read profiles (map panel)
DROP POLICY IF EXISTS "public read profiles" ON public.profiles;
CREATE POLICY "public read profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Authenticated users can insert/update only their own row
-- auth.uid() returns uuid so we cast to text to match profiles.id
DROP POLICY IF EXISTS "users upsert own profile" ON public.profiles;
CREATE POLICY "users upsert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid()::text = id);

DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- ══════════════════════════════════════════════════════
--  SUPABASE — live Discord mirrors (Realtime)
--  Written by discord-bot.cjs (service role). Public read.
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.server_stats (
  id                         TEXT PRIMARY KEY,
  name                       TEXT,
  conn3ctor_count            INTEGER DEFAULT 0,
  approximate_presence_count INTEGER DEFAULT 0,
  total_members              INTEGER DEFAULT 0,
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conn3ctors (
  id              TEXT PRIMARY KEY,
  name            TEXT,
  discord_handle  TEXT,
  avatar          TEXT,
  color           TEXT,
  "group"         INTEGER DEFAULT 1,
  x_handle        TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mvc_profile (
  id          TEXT PRIMARY KEY,
  username    TEXT,
  avatar_url  TEXT,
  twitter     TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.server_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conn3ctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvc_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read server_stats" ON public.server_stats;
CREATE POLICY "public read server_stats"
  ON public.server_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "public read conn3ctors" ON public.conn3ctors;
CREATE POLICY "public read conn3ctors"
  ON public.conn3ctors FOR SELECT USING (true);

DROP POLICY IF EXISTS "public read mvc_profile" ON public.mvc_profile;
CREATE POLICY "public read mvc_profile"
  ON public.mvc_profile FOR SELECT USING (true);

-- Realtime: clients subscribe via supabase.channel + postgres_changes
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.server_stats;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conn3ctors;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mvc_profile;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
