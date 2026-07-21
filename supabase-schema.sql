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

CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT,
  discord_id   TEXT UNIQUE,
  avatar_url   TEXT,
  twitter      TEXT,
  telegram     TEXT,
  cm_type      TEXT,
  services     TEXT,
  experience   TEXT,
  communities  TEXT[] DEFAULT '{}',
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
DROP POLICY IF EXISTS "users upsert own profile" ON public.profiles;
CREATE POLICY "users upsert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
