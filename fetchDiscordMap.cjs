'use strict'
const fs     = require('fs')
const https  = require('https')
const { Pool } = require('pg')
require('dotenv').config()

const BOT_TOKEN     = process.env.DISCORD_BOT_TOKEN
const GUILD_ID      = process.env.DISCORD_GUILD_ID
const NEON_URL      = process.env.NEON_DATABASE_URL
const ROLE_ID       = '1266023149359599617'
const MVC_ROLE_ID   = '1350853857701269534'
const JSON_NODES    = './src/data/conn3ctors.json'
const JSON_MVC      = './src/data/mvc.json'
const JSON_INSIGHTS = './src/data/serverInsights.json'

if (!BOT_TOKEN || !GUILD_ID) {
  console.error('[Sync] DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are required in .env')
  process.exit(1)
}

const pool = NEON_URL ? new Pool({ connectionString: NEON_URL, ssl: { rejectUnauthorized: false } }) : null

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
        if (res.statusCode !== 200) reject(new Error(`Discord ${path} → ${res.statusCode}: ${body}`))
        else resolve(JSON.parse(body))
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function neonUpsert(table, rows) {
  if (!pool) return
  const arr = Array.isArray(rows) ? rows : [rows]
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
  console.log(`  [Neon] ✓ ${table} (${arr.length} rows)`)
}

async function run() {
  console.log('[Sync] Fetching Discord members…')
  const members = await discordGet(`/guilds/${GUILD_ID}/members?limit=1000`)
  console.log(`[Sync] ${members.length} total members fetched.`)

  const conn3ctors = members.filter(m => m.roles.includes(ROLE_ID))
  console.log(`[Sync] ${conn3ctors.length} Conn3ctors found.`)

  const mvc = members.find(m => m.roles.includes(MVC_ROLE_ID))

  // Build graph + Neon rows
  const graphData = {
    nodes: [{ id: 'main', name: 'CONN3CTIVITY', group: 0, color: '#C9A96E', avatar: '/map-logo.png' }],
    links: []
  }
  const neonNodes = []

  conn3ctors.forEach((member, i) => {
    const u = member.user
    const color = COLOURS[i % COLOURS.length]
    const avatarUrl = u.avatar
      ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) % 6n)}.png`
    const username = u.discriminator === '0' ? `@${u.username}` : `${u.username}#${u.discriminator}`
    const nick = member.nick || u.global_name || u.username
    const xMatch = nick.match(/@([a-zA-Z0-9_]{1,15})/)
    const xHandle = xMatch ? xMatch[1] : null
    const isLeft = i % 2 === 0

    graphData.nodes.push({ id: u.id, name: nick, discordHandle: username, xHandle, group: isLeft ? 1 : 2, color, avatar: avatarUrl })
    graphData.links.push({ source: 'main', target: u.id, color: isLeft ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)' })
    neonNodes.push({ id: u.id, name: nick, discord_handle: username, avatar: avatarUrl, color, group: isLeft ? 1 : 2, x_handle: xHandle, updated_at: new Date().toISOString() })
  })

  fs.writeFileSync(JSON_NODES, JSON.stringify(graphData, null, 2))
  console.log(`[Sync] Saved ${JSON_NODES}`)

  let mvcData = null
  if (mvc) {
    const u = mvc.user
    const avatarUrl = u.avatar
      ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=256`
      : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(u.id) % 6n)}.png`
    const nick = mvc.nick || u.global_name || u.username
    const xMatch = nick.match(/@([a-zA-Z0-9_]{1,15})/)
    mvcData = { id: u.id, username: nick, avatar_url: avatarUrl, twitter: xMatch ? xMatch[1] : null }
    fs.writeFileSync(JSON_MVC, JSON.stringify(mvcData, null, 2))
    console.log(`[Sync] MVC: ${nick} → ${JSON_MVC}`)
  }

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

  if (!pool) {
    console.warn('\n[Neon] Skipped — NEON_DATABASE_URL not set in .env')
  } else {
    console.log('\n[Neon] Pushing to database…')
    await neonUpsert('server_stats', {
      id: GUILD_ID, name: insights.name,
      conn3ctor_count: insights.conn3ctor_count,
      approximate_presence_count: insights.approximate_presence_count,
      total_members: insights.total_members,
      updated_at: new Date().toISOString()
    })
    for (let i = 0; i < neonNodes.length; i += 100) {
      await neonUpsert('conn3ctors', neonNodes.slice(i, i + 100))
    }
    if (mvcData) {
      await neonUpsert('mvc_profile', { ...mvcData, updated_at: new Date().toISOString() })
    }
    console.log('[Neon] Done.')
    await pool.end()
  }

  console.log('\n✓ Sync complete.')
}

run().catch(err => {
  console.error('[Sync] Fatal error:', err.message)
  process.exit(1)
})
