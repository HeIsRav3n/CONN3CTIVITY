/**
 * CONN3CTIVITY Discord Gateway Bot
 *
 * Connects to Discord via WebSocket Gateway for REAL-TIME events.
 * Writes to Neon (API source of truth) AND mirrors to Supabase so the
 * website can subscribe with Realtime postgres_changes.
 *
 * Required .env:
 *   DISCORD_BOT_TOKEN    — bot token
 *   DISCORD_GUILD_ID     — server snowflake
 *   NEON_DATABASE_URL    — Neon Postgres
 *   SUPABASE_URL         — https://xxx.supabase.co (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_KEY — service-role key (Settings → API)
 *
 * IMPORTANT: Enable these Privileged Gateway Intents in Discord Developer Portal:
 *   → Server Members Intent
 *   → Presence Intent
 *
 * Deploy: node discord-bot.cjs
 * Recommend: Railway, Render, or any always-on Node host
 */

'use strict'

const https     = require('https')
const WebSocket = require('ws')
const { Pool }  = require('pg')
require('dotenv').config()

// ── Config ────────────────────────────────────────────────────────────────────
const BOT_TOKEN        = process.env.DISCORD_BOT_TOKEN
const GUILD_ID         = process.env.DISCORD_GUILD_ID          || '1265954062789120050'
const CONN3CTOR_ROLE   = process.env.CONN3CTOR_ROLE_ID         || '1266023149359599617'
const MVC_ROLE         = process.env.MVC_ROLE_ID               || '1350853857701269534'
const NEON_URL         = process.env.NEON_DATABASE_URL
const SUPABASE_URL     = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const SERVICE_KEY_RAW  = process.env.SUPABASE_SERVICE_KEY || ''
// Headers must be Latin-1; strip accidental corruption from shell/.env encoding
const SERVICE_KEY      = [...SERVICE_KEY_RAW].filter(ch => ch.charCodeAt(0) <= 255).join('').trim()
const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || '60000', 10)

// Discord Gateway intents
// GUILDS(1) | GUILD_MEMBERS(2) | GUILD_PRESENCES(256)
const INTENTS = 1 | 2 | 256

const COLOURS = ['#22c55e','#ef4444','#3b82f6','#f59e0b','#a855f7','#ec4899','#06b6d4','#f97316','#8b5cf6','#14b8a6']

if (!BOT_TOKEN) { console.error('[Bot] DISCORD_BOT_TOKEN missing'); process.exit(1) }
if (!NEON_URL)   { console.warn('[Bot] NEON_DATABASE_URL missing — Neon writes disabled') }
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.warn('[Bot] SUPABASE_URL / SUPABASE_SERVICE_KEY missing — Realtime mirror disabled')
}

const pool = NEON_URL ? new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } }) : null

// ── In-memory state ──────────────────────────────────────────────────────────
let onlineCount   = 0
let memberCount   = 0
let conn3ctorCount = 0

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function discordGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'discord.com',
      path: `/api/v10${path}`,
      headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' }
    }, res => {
      let body = ''
      res.on('data', c => body += c)
      res.on('end', () => {
        if (res.statusCode === 429) {
          const retryAfter = (JSON.parse(body).retry_after || 1) * 1000
          setTimeout(() => discordGet(path).then(resolve).catch(reject), retryAfter)
          return
        }
        res.statusCode < 200 || res.statusCode >= 300
          ? reject(new Error(`Discord ${path} → ${res.statusCode}`))
          : resolve(JSON.parse(body))
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function dbUpsert(table, rows) {
  if (!pool) return
  const arr = Array.isArray(rows) ? rows : [rows]
  try {
    const promises = arr.map(row => {
      const keys   = Object.keys(row)
      const vals   = Object.values(row)
      const cols   = keys.map(k => `"${k}"`).join(', ')
      const params = vals.map((_, i) => `$${i + 1}`).join(', ')
      const update = keys.filter(k => k !== 'id').map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')
      return pool.query(
        `INSERT INTO ${table} (${cols}) VALUES (${params}) ON CONFLICT (id) DO UPDATE SET ${update}`,
        vals
      )
    })
    await Promise.all(promises)
  } catch (e) {
    console.warn(`[Neon] ${table} error:`, e.message)
  }
}

async function dbDeleteMissing(table, keepIds) {
  if (!pool || !keepIds.length) return
  try {
    await pool.query(
      `DELETE FROM ${table} WHERE id <> ALL($1::text[])`,
      [keepIds]
    )
  } catch (e) {
    console.warn(`[Neon] ${table} cleanup error:`, e.message)
  }
}

async function supabaseUpsert(table, rows) {
  if (!SUPABASE_URL || !SERVICE_KEY) return
  const arr = Array.isArray(rows) ? rows : [rows]
  if (!arr.length) return
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=id`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(arr),
    })
    if (!res.ok) {
      const text = await res.text()
      console.warn(`[Supabase] ${table} upsert ${res.status}: ${text}`)
    }
  } catch (e) {
    console.warn(`[Supabase] ${table} error:`, e.message)
  }
}

async function supabaseDeleteMissing(table, keepIds) {
  if (!SUPABASE_URL || !SERVICE_KEY || !keepIds.length) return
  try {
    const listRes = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    })
    if (!listRes.ok) return
    const existing = await listRes.json()
    const keep = new Set(keepIds)
    const orphans = existing.map(r => r.id).filter(id => !keep.has(id))
    for (let i = 0; i < orphans.length; i += 50) {
      const batch = orphans.slice(i, i + 50)
      const filter = batch.map(id => `"${id}"`).join(',')
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=in.(${filter})`, {
        method: 'DELETE',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      })
    }
  } catch (e) {
    console.warn(`[Supabase] ${table} cleanup error:`, e.message)
  }
}

async function dualUpsert(table, rows) {
  await Promise.all([dbUpsert(table, rows), supabaseUpsert(table, rows)])
}

async function dualDeleteById(table, id) {
  if (!id) return
  if (pool) {
    try {
      await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id])
    } catch (e) {
      console.warn(`[Neon] ${table} delete error:`, e.message)
    }
  }
  if (SUPABASE_URL && SERVICE_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      })
    } catch (e) {
      console.warn(`[Supabase] ${table} delete error:`, e.message)
    }
  }
}

function buildConn3ctorRow(member, colorIndex = 0) {
  const u = member.user
  if (!u?.id) return null
  const avatar = u.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) % 6n)}.png`
  const nick = member.nick || u.global_name || u.username
  const xMatch = nick.match(/@([a-zA-Z0-9_]{1,15})/)
  return {
    id: u.id,
    name: nick,
    discord_handle: `@${u.username}`,
    avatar,
    color: COLOURS[colorIndex % COLOURS.length],
    group: (colorIndex % 8) + 1,
    x_handle: xMatch ? xMatch[1] : null,
    updated_at: new Date().toISOString(),
  }
}

function buildMvcRow(member) {
  const u = member.user
  if (!u?.id) return null
  const avatar = u.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) % 6n)}.png`
  const nick = member.nick || u.global_name || u.username
  const xMatch = nick.match(/@([a-zA-Z0-9_]{1,15})/)
  return {
    id: u.id,
    username: nick,
    avatar_url: avatar,
    twitter: xMatch ? xMatch[1] : null,
    updated_at: new Date().toISOString(),
  }
}

// ── Push live stats to Neon + Supabase ───────────────────────────────────────
async function pushStats() {
  const row = {
    id:                         GUILD_ID,
    name:                       'CONN3CTIVITY',
    conn3ctor_count:            conn3ctorCount,
    approximate_presence_count: onlineCount,
    total_members:              memberCount,
    updated_at:                 new Date().toISOString(),
  }
  await dualUpsert('server_stats', row)
  console.log(`[Bot] Stats pushed — online:${onlineCount} conn3ctors:${conn3ctorCount} total:${memberCount}`)
}

// ── Full sync (members + MVC + conn3ctors table) ─────────────────────────────
async function fullSync() {
  console.log('[Bot] Full sync…')
  try {
    const [members, guild] = await Promise.all([
      fetchAllMembers(),
      discordGet(`/guilds/${GUILD_ID}?with_counts=true`),
    ])

    memberCount    = guild.approximate_member_count   || members.length
    onlineCount    = guild.approximate_presence_count || onlineCount

    const conn3ctors = members.filter(m => m.roles.includes(CONN3CTOR_ROLE))
    const mvc        = members.find(m  => m.roles.includes(MVC_ROLE))
    conn3ctorCount   = conn3ctors.length

    const nodes = conn3ctors.map((m, i) => {
      const u = m.user
      const avatar = u.avatar
        ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) % 6n)}.png`
      const nick = m.nick || u.global_name || u.username
      const xMatch = nick.match(/@([a-zA-Z0-9_]{1,15})/)
      return {
        id: u.id, name: nick,
        discord_handle: `@${u.username}`,
        avatar, color: COLOURS[i % COLOURS.length],
        group: (i % 8) + 1,
        x_handle: xMatch ? xMatch[1] : null,
        updated_at: new Date().toISOString(),
      }
    })

    for (let i = 0; i < nodes.length; i += 100) {
      await dualUpsert('conn3ctors', nodes.slice(i, i + 100))
    }

    const keepIds = nodes.map(n => n.id)
    await Promise.all([
      dbDeleteMissing('conn3ctors', keepIds),
      supabaseDeleteMissing('conn3ctors', keepIds),
    ])

    if (mvc) {
      const u = mvc.user
      const avatar = u.avatar
        ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=256`
        : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) % 6n)}.png`
      const nick = mvc.nick || u.global_name || u.username
      const xMatch = nick.match(/@([a-zA-Z0-9_]{1,15})/)
      await dualUpsert('mvc_profile', {
        id: u.id, username: nick, avatar_url: avatar,
        twitter: xMatch ? xMatch[1] : null,
        updated_at: new Date().toISOString(),
      })
      console.log(`[Bot] MVC: ${nick} (${u.id})`)
    }

    await pushStats()
    console.log(`[Bot] Full sync done — ${conn3ctors.length} Conn3ctors`)
  } catch (err) {
    console.error('[Bot] Full sync error:', err.message)
  }
}

async function fetchAllMembers() {
  const all = []
  let after = '0'
  while (true) {
    const batch = await discordGet(`/guilds/${GUILD_ID}/members?limit=1000&after=${after}`)
    if (!batch.length) break
    all.push(...batch)
    after = batch[batch.length - 1].user.id
    if (batch.length < 1000) break
    await new Promise(r => setTimeout(r, 600))
  }
  return all
}

// ── Discord Gateway WebSocket ─────────────────────────────────────────────────
let ws = null
let heartbeatInterval = null
let lastSeq = null
let sessionId = null
let resumeUrl = null

function connectGateway() {
  const url = resumeUrl || 'wss://gateway.discord.gg/?v=10&encoding=json'
  console.log(`[Gateway] Connecting to ${url}…`)
  ws = new WebSocket(url)

  ws.on('open', () => console.log('[Gateway] Connected'))

  ws.on('message', (raw) => {
    const payload = JSON.parse(raw.toString())
    const { op, d, s, t } = payload
    if (s) lastSeq = s

    switch (op) {
      case 10: {
        const interval = d.heartbeat_interval
        heartbeatInterval = setInterval(() => {
          ws.send(JSON.stringify({ op: 1, d: lastSeq }))
        }, interval)

        if (sessionId && lastSeq) {
          ws.send(JSON.stringify({
            op: 6,
            d: { token: BOT_TOKEN, session_id: sessionId, seq: lastSeq }
          }))
        } else {
          ws.send(JSON.stringify({
            op: 2,
            d: {
              token: BOT_TOKEN,
              intents: INTENTS,
              properties: { os: 'linux', browser: 'conn3ctivity', device: 'conn3ctivity' },
              large_threshold: 250,
            }
          }))
        }
        break
      }

      case 11: break

      case 0: handleEvent(t, d); break

      case 7: reconnect(); break

      case 9: {
        sessionId = null; lastSeq = null; resumeUrl = null
        setTimeout(connectGateway, 5000)
        break
      }
    }
  })

  ws.on('close', (code) => {
    clearInterval(heartbeatInterval)
    console.warn(`[Gateway] Closed (${code}) — reconnecting in 5s…`)
    setTimeout(code === 4004 ? () => process.exit(1) : reconnect, 5000)
  })

  ws.on('error', (err) => {
    console.error('[Gateway] WS error:', err.message)
  })
}

function reconnect() {
  if (ws) { try { ws.terminate() } catch {} }
  clearInterval(heartbeatInterval)
  connectGateway()
}

async function handleEvent(type, data) {
  if (!data) return

  switch (type) {
    case 'READY':
      sessionId = data.session_id
      resumeUrl = data.resume_gateway_url
      memberCount = data.guilds?.[0]?.member_count || memberCount
      console.log(`[Gateway] READY as ${data.user?.username}`)
      break

    case 'GUILD_CREATE':
      if (data.id === GUILD_ID) {
        memberCount = data.member_count || memberCount
        onlineCount = (data.presences || []).filter(p => p.status !== 'offline').length
        conn3ctorCount = (data.members || []).filter(m => (m.roles || []).includes(CONN3CTOR_ROLE)).length
        console.log(`[Gateway] Guild ready — ${memberCount} members, ${onlineCount} online, ${conn3ctorCount} conn3ctors`)
        await pushStats()
      }
      break

    case 'GUILD_MEMBER_ADD':
      if (data.guild_id === GUILD_ID) {
        memberCount++
        const u = data.user
        const nick = data.nick || u?.global_name || u?.username || 'Unknown'
        console.log(`[Gateway] +Member: ${nick} (total: ${memberCount})`)
        await pushStats()
      }
      break

    case 'GUILD_MEMBER_REMOVE':
      if (data.guild_id === GUILD_ID) {
        memberCount = Math.max(0, memberCount - 1)
        const removedId = data.user?.id
        console.log(`[Gateway] -Member: ${data.user?.username} (total: ${memberCount})`)
        if (removedId) {
          await Promise.all([
            dualDeleteById('conn3ctors', removedId),
            dualDeleteById('mvc_profile', removedId),
          ])
        }
        if (pool) {
          try {
            const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM conn3ctors')
            conn3ctorCount = rows[0]?.n ?? conn3ctorCount
          } catch {}
        }
        await pushStats()
      }
      break

    case 'GUILD_MEMBER_UPDATE':
      if (data.guild_id === GUILD_ID) {
        await handleMemberRoleUpdate(data)
      }
      break

    case 'PRESENCE_UPDATE':
      if (data.guild_id === GUILD_ID) {
        debouncedPresenceUpdate()
      }
      break
  }
}

async function handleMemberRoleUpdate(data) {
  const roles = data.roles || []
  const hasConn3ctor = roles.includes(CONN3CTOR_ROLE)
  const hasMvc = roles.includes(MVC_ROLE)
  const u = data.user
  if (!u?.id) return

  // Upsert when role is present; delete when absent (no-op if row never existed).
  if (hasConn3ctor) {
    const row = buildConn3ctorRow(data, Number(BigInt(u.id) % BigInt(COLOURS.length)))
    if (row) {
      await dualUpsert('conn3ctors', row)
      console.log(`[Gateway] Conn3ctor upsert: ${row.name}`)
    }
  } else {
    await dualDeleteById('conn3ctors', u.id)
    console.log(`[Gateway] Conn3ctor removed (if present): ${u.username}`)
  }

  if (hasMvc) {
    const row = buildMvcRow(data)
    if (row) {
      await dualUpsert('mvc_profile', row)
      console.log(`[Gateway] MVC upsert: ${row.username}`)
    }
  }

  try {
    const guild = await discordGet(`/guilds/${GUILD_ID}?with_counts=true`)
    memberCount = guild.approximate_member_count || memberCount
    onlineCount = guild.approximate_presence_count || onlineCount
  } catch {}

  if (pool) {
    try {
      const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM conn3ctors')
      conn3ctorCount = rows[0]?.n ?? conn3ctorCount
    } catch {}
  }

  await pushStats()
}

let presenceDebounce = null
function debouncedPresenceUpdate() {
  clearTimeout(presenceDebounce)
  presenceDebounce = setTimeout(async () => {
    try {
      const guild = await discordGet(`/guilds/${GUILD_ID}?with_counts=true`)
      const newOnline = guild.approximate_presence_count || 0
      if (newOnline !== onlineCount) {
        onlineCount = newOnline
        await pushStats()
      }
    } catch {}
  }, 3000)
}

console.log(
  '[Bot] CONN3CTIVITY Gateway Bot starting…',
  'Neon:', NEON_URL ? 'on' : 'off',
  'Supabase Realtime mirror:', (SUPABASE_URL && SERVICE_KEY) ? 'on' : 'off',
)
fullSync()
setInterval(fullSync, SYNC_INTERVAL_MS)
connectGateway()
