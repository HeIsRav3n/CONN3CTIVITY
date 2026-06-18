/**
 * CONN3CTIVITY Discord Gateway Bot
 *
 * Connects to Discord via WebSocket Gateway for REAL-TIME events.
 * Updates Supabase INSTANTLY when members join/leave or go online/offline.
 * Also runs a full sync every SYNC_INTERVAL_MS for consistency.
 *
 * Required .env:
 *   DISCORD_BOT_TOKEN    — bot token
 *   DISCORD_GUILD_ID     — server snowflake
 *   SUPABASE_SERVICE_KEY — service-role key (Settings → API in Supabase dashboard)
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
const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || '300000', 10)

// Discord Gateway intents
// GUILDS(1) | GUILD_MEMBERS(2) | GUILD_PRESENCES(256)
const INTENTS = 1 | 2 | 256

const COLOURS = ['#22c55e','#ef4444','#3b82f6','#f59e0b','#a855f7','#ec4899','#06b6d4','#f97316','#8b5cf6','#14b8a6']

if (!BOT_TOKEN) { console.error('[Bot] DISCORD_BOT_TOKEN missing'); process.exit(1) }
if (!NEON_URL)   { console.warn('[Bot] NEON_DATABASE_URL missing — DB writes disabled') }

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
    for (const row of arr) {
      const keys   = Object.keys(row)
      const vals   = Object.values(row)
      const cols   = keys.map(k => `"${k}"`).join(', ')
      const params = vals.map((_, i) => `$${i + 1}`).join(', ')
      const update = keys.filter(k => k !== 'id').map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')
      await pool.query(
        `INSERT INTO ${table} (${cols}) VALUES (${params}) ON CONFLICT (id) DO UPDATE SET ${update}`,
        vals
      )
    }
  } catch (e) {
    console.warn(`[Neon] ${table} error:`, e.message)
  }
}

// ── Push live stats to Supabase ───────────────────────────────────────────────
async function pushStats() {
  await dbUpsert('server_stats', {
    id:                         GUILD_ID,
    name:                       'CONN3CTIVITY',
    conn3ctor_count:            conn3ctorCount,
    approximate_presence_count: onlineCount,
    total_members:              memberCount,
    updated_at:                 new Date().toISOString(),
  })
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

    // Build conn3ctors rows
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
      await dbUpsert('conn3ctors', nodes.slice(i, i + 100))
    }

    // MVC
    if (mvc) {
      const u = mvc.user
      const avatar = u.avatar
        ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=256`
        : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) % 6n)}.png`
      const nick = mvc.nick || u.global_name || u.username
      const xMatch = nick.match(/@([a-zA-Z0-9_]{1,15})/)
      await dbUpsert('mvc_profile', {
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
      case 10: { // HELLO — start heartbeating
        const interval = d.heartbeat_interval
        heartbeatInterval = setInterval(() => {
          ws.send(JSON.stringify({ op: 1, d: lastSeq }))
        }, interval)

        // Identify or Resume
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

      case 11: break // Heartbeat ACK — ignore

      case 0: handleEvent(t, d); break // Dispatch

      case 7: reconnect(); break // Reconnect

      case 9: { // Invalid Session
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

// ── Event handlers ─────────────────────────────────────────────────────────────
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
        // Count online from presences
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
        console.log(`[Gateway] -Member: ${data.user?.username} (total: ${memberCount})`)
        await pushStats()
      }
      break

    case 'GUILD_MEMBER_UPDATE':
      if (data.guild_id === GUILD_ID) {
        // Recalculate conn3ctorCount if roles changed
        const hadRole = data.roles?.includes(CONN3CTOR_ROLE)
        // We'll let the full sync catch this — too complex to track incrementally
        _ = hadRole // used to suppress lint
      }
      break

    case 'PRESENCE_UPDATE':
      if (data.guild_id === GUILD_ID) {
        // Discord sends these for every status change; debounce stats push
        debouncedPresenceUpdate()
      }
      break
  }
}

// Debounce presence updates — they fire rapidly, no need to push every one
let presenceDebounce = null
let onlineDelta = 0
function debouncedPresenceUpdate() {
  clearTimeout(presenceDebounce)
  presenceDebounce = setTimeout(async () => {
    // Re-fetch guild for accurate count rather than tracking individually
    try {
      const guild = await discordGet(`/guilds/${GUILD_ID}?with_counts=true`)
      const newOnline = guild.approximate_presence_count || 0
      if (newOnline !== onlineCount) {
        onlineCount = newOnline
        await pushStats()
      }
    } catch {}
  }, 3000) // 3-second debounce
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
console.log('[Bot] CONN3CTIVITY Gateway Bot starting… (Neon DB:', NEON_URL ? 'connected' : 'disabled', ')')
fullSync()
setInterval(fullSync, SYNC_INTERVAL_MS)
connectGateway()
