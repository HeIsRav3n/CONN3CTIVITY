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

-- Lock discord_id to the authenticated Discord identity.
-- Clients must never be able to claim another Conn3ctor's snowflake.
CREATE OR REPLACE FUNCTION public.enforce_profile_discord_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider_discord_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  NEW.id := auth.uid()::text;

  SELECT identity_data->>'provider_id'
  INTO provider_discord_id
  FROM auth.identities
  WHERE user_id = auth.uid()
    AND provider = 'discord'
  LIMIT 1;

  IF provider_discord_id IS NULL THEN
    provider_discord_id := COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'provider_id',
      auth.jwt() -> 'app_metadata' ->> 'provider_id'
    );
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.discord_id := provider_discord_id;
  ELSE
    -- Never allow client override; keep existing binding if provider id unavailable
    NEW.discord_id := COALESCE(provider_discord_id, OLD.discord_id);
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_enforce_discord_id ON public.profiles;
CREATE TRIGGER profiles_enforce_discord_id
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_discord_id();

-- Public map panel should prefer a narrow column set (documented for clients).
-- Full SELECT remains allowed for authenticated self-edit UX; map UI selects explicitly.

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
