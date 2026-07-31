/**
 * Dump Neon live tables into a SQL file for Supabase seeding via CLI.
 * Usage: node scripts/dump-neon-live-sql.cjs > scripts/_seed-live.sql
 */
'use strict'

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const NEON_URL = process.env.NEON_DATABASE_URL
if (!NEON_URL) {
  console.error('NEON_DATABASE_URL missing')
  process.exit(1)
}

function esc(v) {
  if (v == null) return 'NULL'
  if (typeof v === 'number') return String(v)
  if (v instanceof Date) return `'${v.toISOString()}'`
  return `'${String(v).replace(/'/g, "''")}'`
}

async function main() {
  const pool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } })
  const out = []
  try {
    const stats = (await pool.query('SELECT * FROM server_stats')).rows
    const mvc = (await pool.query('SELECT * FROM mvc_profile')).rows
    const conn3ctors = (await pool.query('SELECT * FROM conn3ctors')).rows

    for (const r of stats) {
      out.push(`INSERT INTO public.server_stats (id, name, conn3ctor_count, approximate_presence_count, total_members, updated_at)
VALUES (${esc(r.id)}, ${esc(r.name)}, ${esc(r.conn3ctor_count)}, ${esc(r.approximate_presence_count)}, ${esc(r.total_members)}, ${esc(r.updated_at)})
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  conn3ctor_count = EXCLUDED.conn3ctor_count,
  approximate_presence_count = EXCLUDED.approximate_presence_count,
  total_members = EXCLUDED.total_members,
  updated_at = EXCLUDED.updated_at;`)
    }

    for (const r of mvc) {
      out.push(`INSERT INTO public.mvc_profile (id, username, avatar_url, twitter, updated_at)
VALUES (${esc(r.id)}, ${esc(r.username)}, ${esc(r.avatar_url)}, ${esc(r.twitter)}, ${esc(r.updated_at)})
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  avatar_url = EXCLUDED.avatar_url,
  twitter = EXCLUDED.twitter,
  updated_at = EXCLUDED.updated_at;`)
    }

    for (const r of conn3ctors) {
      out.push(`INSERT INTO public.conn3ctors (id, name, discord_handle, avatar, color, "group", x_handle, updated_at)
VALUES (${esc(r.id)}, ${esc(r.name)}, ${esc(r.discord_handle)}, ${esc(r.avatar)}, ${esc(r.color)}, ${esc(r.group)}, ${esc(r.x_handle)}, ${esc(r.updated_at)})
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  discord_handle = EXCLUDED.discord_handle,
  avatar = EXCLUDED.avatar,
  color = EXCLUDED.color,
  "group" = EXCLUDED."group",
  x_handle = EXCLUDED.x_handle,
  updated_at = EXCLUDED.updated_at;`)
    }

    const file = path.join(__dirname, '_seed-live.sql')
    fs.writeFileSync(file, out.join('\n') + '\n', 'utf8')
    console.log(`Wrote ${out.length} statements to ${file}`)
  } finally {
    await pool.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
