/**
 * One-shot: copy Neon live tables → Supabase so Realtime has an initial snapshot.
 *
 * Requires:
 *   NEON_DATABASE_URL
 *   SUPABASE_URL (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_KEY
 *
 * Usage: node scripts/seed-supabase-live.cjs
 */
'use strict'

const { Pool } = require('pg')
require('dotenv').config()

const NEON_URL = process.env.NEON_DATABASE_URL
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!NEON_URL || !SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEON_DATABASE_URL, SUPABASE_URL/VITE_SUPABASE_URL, or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

async function upsert(table, rows, onConflict = 'id') {
  if (!rows?.length) return
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${table} upsert failed (${res.status}): ${text}`)
  }
}

async function main() {
  const pool = new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } })
  try {
    const stats = (await pool.query('SELECT * FROM server_stats')).rows
    const conn3ctors = (await pool.query('SELECT * FROM conn3ctors')).rows
    const mvc = (await pool.query('SELECT * FROM mvc_profile')).rows

    console.log(`Seeding Supabase — stats:${stats.length} conn3ctors:${conn3ctors.length} mvc:${mvc.length}`)

    await upsert('server_stats', stats)
    for (let i = 0; i < conn3ctors.length; i += 100) {
      await upsert('conn3ctors', conn3ctors.slice(i, i + 100))
      process.stdout.write(`.`)
    }
    console.log('')
    await upsert('mvc_profile', mvc)

    console.log('Done — Supabase live tables seeded.')
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
