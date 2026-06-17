/**
 * CONN3CTIVITY Discord Bot
 *
 * Syncs live Discord guild data to Supabase so the website
 * always shows real member counts and a live Conn3ction Map.
 *
 * SETUP:
 *   1. Copy .env.example → .env and fill in your secrets.
 *   2. npm install   (uses the @supabase/supabase-js already in package.json)
 *   3. node discord-bot.cjs
 *
 * DEPLOY:
 *   Railway → New Project → "Deploy from GitHub Repo"
 *   Set the start command to: node discord-bot.cjs
 *   Add environment variables from .env
 */

'use strict'

const https  = require('https')
require('dotenv').config()

// ──────────────────────────────────────────────────────
//  Config (all secrets from .env)
// ──────────────────────────────────────────────────────
const BOT_TOKEN         = process.env.DISCORD_BOT_TOKEN
const GUILD_ID          = process.env.DISCORD_GUILD_ID          || '1265954062789120050'
const CONN3CTOR_ROLE    = process.env.CONN3CTOR_ROLE_ID         || '1266023149359599617'
const MVC_ROLE          = process.env.MVC_ROLE_ID               || '1350853857701269534'
const SUPABASE_URL      = process.env.VITE_SUPABASE_URL         || 'https://odmctbgjjonlhyfojfva.supabase.co'
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_KEY       // Must be the service-role key (not anon)
const SYNC_INTERVAL_MS  = parseInt(process.env.SYNC_INTERVAL_MS || '600000', 10) // default: 10 min

if (!BOT_TOKEN) {
  console.error('[Bot] DISCORD_BOT_TOKEN is required. Check your .env file.')
  process.exit(1)
}
if (!SUPABASE_KEY) {
  console.error('[Bot] SUPABASE_SERVICE_KEY is required. Check your .env file.')
  process.exit(1)
}

// ──────────────────────────────────────────────────────
//  Minimal HTTP helpers (no extra deps)
// ──────────────────────────────────────────────────────

function discordGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'discord.com',
      path: `/api/v10${path}`,
      method: 'GET',
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CONN3CTIVITY-Bot/2.0',
      }
    }
    const req = https.request(options, res => {
      let body = ''
      res.on('data', c => { body += c })
      res.on('end', () => {
        if (res.statusCode === 429) {
          const retry = (JSON.parse(body).retry_after || 1) * 1000
          console.warn(`[Bot] Rate limited. Retrying in ${retry}ms…`)
          setTimeout(() => discordGet(path).then(resolve).catch(reject), retry)
          return
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Discord ${path} → ${res.statusCode}: ${body}`))
          return
        }
        resolve(JSON.parse(body))
      })
    })
    req.on('error', reject)
    req.end()
  })
}

function supabaseUpsert(table, rows) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(Array.isArray(rows) ? rows : [rows])
    const options = {
      hostname: new URL(SUPABASE_URL).hostname,
      path: `/rest/v1/${table}`,
      method: 'POST',
      headers: {
        apikey:          SUPABASE_KEY,
        Authorization:   `Bearer ${SUPABASE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'resolution=merge-duplicates,return=minimal',
        'Content-Length': Buffer.byteLength(body),
      }
    }
    const req = https.request(options, res => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve()
        } else {
          reject(new Error(`Supabase upsert to ${table} failed (${res.statusCode}): ${data}`))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// ──────────────────────────────────────────────────────
//  Member pagination (up to Discord's 1000/page limit)
// ──────────────────────────────────────────────────────

async function fetchAllMembers() {
  const all = []
  let after = '0'
  while (true) {
    const batch = await discordGet(`/guilds/${GUILD_ID}/members?limit=1000&after=${after}`)
    if (!batch.length) break
    all.push(...batch)
    after = batch[batch.length - 1].user.id
    if (batch.length < 1000) break
    await new Promise(r => setTimeout(r, 600)) // respect Discord rate limits
  }
  return all
}

// ──────────────────────────────────────────────────────
//  Colour palette for map nodes
// ──────────────────────────────────────────────────────
const COLOURS = ['#22c55e','#ef4444','#3b82f6','#f59e0b','#a855f7','#ec4899','#06b6d4','#f97316','#8b5cf6','#14b8a6']

// ──────────────────────────────────────────────────────
//  Main sync function
// ──────────────────────────────────────────────────────

async function sync() {
  const started = Date.now()
  console.log(`[Bot] ${new Date().toISOString()} — Sync started…`)

  try {
    // 1. Guild info (member count + presence count)
    const guild = await discordGet(`/guilds/${GUILD_ID}?with_counts=true`)
    console.log(`[Bot] Guild: ${guild.name} | Members: ${guild.approximate_member_count} | Online: ${guild.approximate_presence_count}`)

    // 2. All members (paginated)
    const members = await fetchAllMembers()
    const conn3ctors = members.filter(m => m.roles.includes(CONN3CTOR_ROLE))
    const mvc        = members.find(m => m.roles.includes(MVC_ROLE))
    console.log(`[Bot] Conn3ctors: ${conn3ctors.length} | MVC: ${mvc ? (mvc.nick || mvc.user.username) : 'none'}`)

    // 3. Upsert server_stats
    await supabaseUpsert('server_stats', {
      id:                        GUILD_ID,
      name:                      guild.name,
      conn3ctor_count:           conn3ctors.length,
      approximate_presence_count: guild.approximate_presence_count,
      total_members:             guild.approximate_member_count,
      updated_at:                new Date().toISOString(),
    })
    console.log('[Bot] server_stats updated.')

    // 4. Upsert conn3ctors table (map nodes)
    const nodes = conn3ctors.map((m, i) => {
      const u = m.user
      const avatar = u.avatar
        ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) % 6n)}.png`
      const nick = m.nick || u.global_name || u.username
      const xMatch = nick.match(/@([a-zA-Z0-9_]{1,15})/)
      return {
        id:             u.id,
        name:           nick,
        discord_handle: `@${u.username}`,
        avatar,
        color:          COLOURS[i % COLOURS.length],
        group:          (i % 8) + 1,
        x_handle:       xMatch ? xMatch[1] : null,
        updated_at:     new Date().toISOString(),
      }
    })

    // Batch in groups of 100 to stay under Supabase payload limits
    for (let i = 0; i < nodes.length; i += 100) {
      await supabaseUpsert('conn3ctors', nodes.slice(i, i + 100))
    }
    console.log(`[Bot] conn3ctors table synced (${nodes.length} rows).`)

    // 5. Upsert MVC profile
    if (mvc) {
      const u = mvc.user
      const avatar = u.avatar
        ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=256`
        : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) % 6n)}.png`
      const nick = mvc.nick || u.global_name || u.username
      const xMatch = nick.match(/@([a-zA-Z0-9_]{1,15})/)
      await supabaseUpsert('mvc_profile', {
        id:         u.id,
        username:   nick,
        avatar_url: avatar,
        twitter:    xMatch ? xMatch[1] : null,
        updated_at: new Date().toISOString(),
      })
      console.log(`[Bot] MVC profile updated: ${nick}`)
    }

    console.log(`[Bot] Sync complete in ${((Date.now() - started) / 1000).toFixed(1)}s`)
  } catch (err) {
    console.error('[Bot] Sync error:', err.message)
  }
}

// ──────────────────────────────────────────────────────
//  Run on startup and on every SYNC_INTERVAL_MS
// ──────────────────────────────────────────────────────
sync()
setInterval(sync, SYNC_INTERVAL_MS)
console.log(`[Bot] Running. Will sync every ${SYNC_INTERVAL_MS / 60000} min.`)
