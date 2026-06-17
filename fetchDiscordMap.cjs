/**
 * CONN3CTIVITY — Discord Data Sync Script
 *
 * Fetches live Discord data and saves it BOTH to local JSON files (for build-time fallback)
 * AND to Supabase (for live website reads).
 *
 * Run with:  node fetchDiscordMap.cjs
 *
 * Required .env variables:
 *   DISCORD_BOT_TOKEN      — your Discord bot token
 *   DISCORD_GUILD_ID       — your server ID
 *   SUPABASE_SERVICE_KEY   — Supabase service-role key (from Project Settings → API)
 *
 * The VITE_SUPABASE_URL is read from the hardcoded value below (same as supabase.js).
 */

'use strict'
const fs     = require('fs')
const https  = require('https')
require('dotenv').config()

// ── Config ──────────────────────────────────────────────────────────
const BOT_TOKEN       = process.env.DISCORD_BOT_TOKEN
const GUILD_ID        = process.env.DISCORD_GUILD_ID
const SUPABASE_URL    = 'https://odmctbgjjonlhyfojfva.supabase.co'
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_KEY   // service-role key
const ROLE_ID         = '1266023149359599617'              // Conn3ctor role
const MVC_ROLE_ID     = '1350853857701269534'              // MVC role
const JSON_NODES      = './src/data/conn3ctors.json'
const JSON_MVC        = './src/data/mvc.json'
const JSON_INSIGHTS   = './src/data/serverInsights.json'

if (!BOT_TOKEN || !GUILD_ID) {
  console.error('[Sync] DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are required in .env')
  process.exit(1)
}

// ── Helpers ─────────────────────────────────────────────────────────
const COLOURS = ['#22c55e','#ef4444','#3b82f6','#f59e0b','#a855f7','#ec4899','#06b6d4','#f97316','#8b5cf6','#14b8a6']

function discordGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'discord.com',
      path: `/api/v10${path}`,
      method: 'GET',
      headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' }
    }, res => {
      let body = ''
      res.on('data', c => body += c)
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Discord ${path} → ${res.statusCode}: ${body}`))
        } else {
          resolve(JSON.parse(body))
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

function supabaseUpsert(table, rows) {
  if (!SUPABASE_KEY) return Promise.resolve()  // skip if no key
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(Array.isArray(rows) ? rows : [rows])
    const req = https.request({
      hostname: new URL(SUPABASE_URL).hostname,
      path: `/rest/v1/${table}`,
      method: 'POST',
      headers: {
        apikey:           SUPABASE_KEY,
        Authorization:    `Bearer ${SUPABASE_KEY}`,
        'Content-Type':   'application/json',
        'Prefer':         'resolution=merge-duplicates,return=minimal',
        'Content-Length': Buffer.byteLength(body),
      }
    }, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`  [Supabase] ✓ ${table} (${Array.isArray(rows) ? rows.length : 1} rows)`)
          resolve()
        } else {
          console.warn(`  [Supabase] ✗ ${table} (${res.statusCode}): ${data.slice(0, 200)}`)
          resolve()  // don't crash — local JSON already saved
        }
      })
    })
    req.on('error', e => { console.warn(`  [Supabase] network error: ${e.message}`); resolve() })
    req.write(body)
    req.end()
  })
}

// ── Main ─────────────────────────────────────────────────────────────
async function run() {
  console.log('[Sync] Fetching Discord members…')
  const members = await discordGet(`/guilds/${GUILD_ID}/members?limit=1000`)
  console.log(`[Sync] ${members.length} total members fetched.`)

  // 1. Filter Conn3ctors
  const conn3ctors = members.filter(m => m.roles.includes(ROLE_ID))
  console.log(`[Sync] ${conn3ctors.length} Conn3ctors found.`)

  // 2. Find MVC
  const mvc = members.find(m => m.roles.includes(MVC_ROLE_ID))

  // 3. Build graph data
  const graphData = {
    nodes: [{ id: 'main', name: 'CONN3CTIVITY', group: 0, color: '#C9A96E', avatar: '/map-logo.png' }],
    links: []
  }

  const supabaseNodes = []

  conn3ctors.forEach((member, i) => {
    const u = member.user
    const isLeft = i % 2 === 0
    const color = COLOURS[i % COLOURS.length]
    const avatarHash = u.avatar
    const avatarUrl = avatarHash
      ? `https://cdn.discordapp.com/avatars/${u.id}/${avatarHash}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) % 6n)}.png`
    const username = u.discriminator === '0' ? `@${u.username}` : `${u.username}#${u.discriminator}`
    const nick = member.nick || u.global_name || u.username
    const xMatch = nick.match(/@([a-zA-Z0-9_]{1,15})/)
    const xHandle = xMatch ? xMatch[1] : null

    graphData.nodes.push({
      id: u.id,
      name: nick,
      discordHandle: username,
      xHandle,
      group: isLeft ? 1 : 2,
      color,
      avatar: avatarUrl
    })

    graphData.links.push({
      source: 'main',
      target: u.id,
      color: isLeft ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'
    })

    supabaseNodes.push({
      id: u.id,
      name: nick,
      discord_handle: username,
      avatar: avatarUrl,
      color,
      group: isLeft ? 1 : 2,
      x_handle: xHandle,
      updated_at: new Date().toISOString()
    })
  })

  // 4. Save conn3ctors.json
  fs.writeFileSync(JSON_NODES, JSON.stringify(graphData, null, 2))
  console.log(`[Sync] Saved ${JSON_NODES}`)

  // 5. MVC
  let mvcData = null
  if (mvc) {
    const u = mvc.user
    const avatarHash = u.avatar
    const avatarUrl = avatarHash
      ? `https://cdn.discordapp.com/avatars/${u.id}/${avatarHash}.png?size=256`
      : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) % 6n)}.png`
    const nick = mvc.nick || u.global_name || u.username
    const xMatch = nick.match(/@([a-zA-Z0-9_]{1,15})/)
    mvcData = { id: u.id, username: nick, avatar_url: avatarUrl, twitter: xMatch ? xMatch[1] : null }
    fs.writeFileSync(JSON_MVC, JSON.stringify(mvcData, null, 2))
    console.log(`[Sync] MVC: ${nick} (${u.id}) → ${JSON_MVC}`)
  } else {
    console.warn('[Sync] No MVC role holder found.')
  }

  // 6. Guild insights
  console.log('[Sync] Fetching guild info…')
  const guild = await discordGet(`/guilds/${GUILD_ID}?with_counts=true`)
  const insights = {
    name: guild.name || 'CONN3CTIVITY',
    guild_id: GUILD_ID,
    conn3ctor_count: conn3ctors.length,
    approximate_presence_count: guild.approximate_presence_count || 0,
    total_members: guild.approximate_member_count || 0,
    last_updated: new Date().toISOString()
  }
  fs.writeFileSync(JSON_INSIGHTS, JSON.stringify(insights, null, 2))
  console.log(`[Sync] Saved ${JSON_INSIGHTS} (online: ${insights.approximate_presence_count})`)

  // 7. Push to Supabase (requires SUPABASE_SERVICE_KEY in .env)
  if (!SUPABASE_KEY) {
    console.warn('\n[Supabase] Skipped — SUPABASE_SERVICE_KEY not set in .env')
    console.warn('[Supabase] Add it to push live data to the website.')
  } else {
    console.log('\n[Supabase] Pushing live data…')

    // server_stats
    await supabaseUpsert('server_stats', {
      id: GUILD_ID,
      name: insights.name,
      conn3ctor_count: insights.conn3ctor_count,
      approximate_presence_count: insights.approximate_presence_count,
      total_members: insights.total_members,
      updated_at: new Date().toISOString()
    })

    // conn3ctors in batches of 100
    for (let i = 0; i < supabaseNodes.length; i += 100) {
      await supabaseUpsert('conn3ctors', supabaseNodes.slice(i, i + 100))
    }

    // mvc_profile
    if (mvcData) {
      await supabaseUpsert('mvc_profile', {
        id: mvcData.id,
        username: mvcData.username,
        avatar_url: mvcData.avatar_url,
        twitter: mvcData.twitter,
        updated_at: new Date().toISOString()
      })
    }

    console.log('[Supabase] Done.')
  }

  console.log('\n✓ Sync complete.')
}

run().catch(err => {
  console.error('[Sync] Fatal error:', err.message)
  process.exit(1)
})
