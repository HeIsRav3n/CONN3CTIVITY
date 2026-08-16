import { getSql } from './neon.js'

const GUILD_ID = process.env.DISCORD_GUILD_ID || '1265954062789120050'
const CONN3CTOR_ROLE = process.env.CONN3CTOR_ROLE_ID || '1266023149359599617'
const MVC_ROLE = process.env.MVC_ROLE_ID || '1350853857701269534'
const FRESH_MS = 45_000
const COLOURS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#f97316', '#8b5cf6', '#14b8a6']

let inflight = null

async function discordGet(path) {
  const token = process.env.DISCORD_BOT_TOKEN
  if (!token) throw new Error('DISCORD_BOT_TOKEN is not configured')
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    headers: { Authorization: `Bot ${token}` },
  })
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}))
    await new Promise((r) => setTimeout(r, (body.retry_after || 1) * 1000))
    return discordGet(path)
  }
  if (!res.ok) throw new Error(`Discord ${path} → ${res.status}`)
  return res.json()
}

async function fetchAllMembers() {
  const all = []
  let after = '0'
  while (true) {
    const batch = await discordGet(`/guilds/${GUILD_ID}/members?limit=1000&after=${after}`)
    if (!Array.isArray(batch) || !batch.length) break
    all.push(...batch)
    after = batch[batch.length - 1]?.user?.id || after
    if (batch.length < 1000) break
  }
  return all
}

function avatarUrl(user, size) {
  if (user?.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`
  }
  const idx = user?.id ? Number(BigInt(user.id) % 6n) : 0
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`
}

async function upsertConn3ctor(sql, row) {
  await sql`
    INSERT INTO conn3ctors (id, name, discord_handle, avatar, color, "group", x_handle, updated_at)
    VALUES (${row.id}, ${row.name}, ${row.discord_handle}, ${row.avatar}, ${row.color}, ${row.group}, ${row.x_handle}, ${row.updated_at})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      discord_handle = EXCLUDED.discord_handle,
      avatar = EXCLUDED.avatar,
      color = EXCLUDED.color,
      "group" = EXCLUDED."group",
      x_handle = EXCLUDED.x_handle,
      updated_at = EXCLUDED.updated_at
  `
}

async function runSync() {
  const sql = getSql()
  const [members, guild] = await Promise.all([
    fetchAllMembers(),
    discordGet(`/guilds/${GUILD_ID}?with_counts=true`),
  ])

  const conn3ctors = members.filter((m) => (m.roles || []).includes(CONN3CTOR_ROLE))
  const mvc = members.find((m) => (m.roles || []).includes(MVC_ROLE))
  const now = new Date().toISOString()

  const nodes = conn3ctors.map((m, i) => {
    const u = m.user
    const nick = m.nick || u.global_name || u.username
    const xMatch = String(nick || '').match(/@([a-zA-Z0-9_]{1,15})/)
    return {
      id: u.id,
      name: nick,
      discord_handle: `@${u.username}`,
      avatar: avatarUrl(u, 128),
      color: COLOURS[i % COLOURS.length],
      group: (i % 8) + 1,
      x_handle: xMatch ? xMatch[1] : null,
      updated_at: now,
    }
  })

  for (let i = 0; i < nodes.length; i += 40) {
    await Promise.all(nodes.slice(i, i + 40).map((row) => upsertConn3ctor(sql, row)))
  }

  const keepIds = nodes.map((n) => n.id)
  if (keepIds.length) {
    await sql`DELETE FROM conn3ctors WHERE NOT (id = ANY(${keepIds}))`
  } else {
    await sql`DELETE FROM conn3ctors`
  }

  if (mvc?.user) {
    const u = mvc.user
    const nick = mvc.nick || u.global_name || u.username
    const xMatch = String(nick || '').match(/@([a-zA-Z0-9_]{1,15})/)
    await sql`
      INSERT INTO mvc_profile (id, username, avatar_url, twitter, updated_at)
      VALUES (${u.id}, ${nick}, ${avatarUrl(u, 256)}, ${xMatch ? xMatch[1] : null}, ${now})
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        avatar_url = EXCLUDED.avatar_url,
        twitter = EXCLUDED.twitter,
        updated_at = EXCLUDED.updated_at
    `
  }

  await sql`
    INSERT INTO server_stats (id, name, conn3ctor_count, approximate_presence_count, total_members, updated_at)
    VALUES (
      ${GUILD_ID},
      ${guild.name || 'CONN3CTIVITY'},
      ${conn3ctors.length},
      ${guild.approximate_presence_count || 0},
      ${guild.approximate_member_count || members.length},
      ${now}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      conn3ctor_count = EXCLUDED.conn3ctor_count,
      approximate_presence_count = EXCLUDED.approximate_presence_count,
      total_members = EXCLUDED.total_members,
      updated_at = EXCLUDED.updated_at
  `

  return { synced: true, conn3ctors: conn3ctors.length, members: members.length }
}

/**
 * Pull Discord → Neon if the last sync is older than 45s.
 * Safe to call on every API request; concurrent callers share one in-flight sync.
 */
export async function ensureLiveData() {
  if (!process.env.DISCORD_BOT_TOKEN || !process.env.NEON_DATABASE_URL) {
    return { synced: false, reason: 'not-configured' }
  }
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const sql = getSql()
      const rows = await sql`SELECT updated_at FROM server_stats ORDER BY updated_at DESC LIMIT 1`
      const updated = rows[0]?.updated_at
      const age = updated ? Date.now() - new Date(updated).getTime() : Infinity
      if (Number.isFinite(age) && age < FRESH_MS) return { synced: false, reason: 'fresh', age }
      return await runSync()
    } finally {
      inflight = null
    }
  })()

  return inflight
}

export async function forceLiveSync() {
  if (!process.env.DISCORD_BOT_TOKEN || !process.env.NEON_DATABASE_URL) {
    throw new Error('Discord sync is not configured')
  }
  if (inflight) return inflight
  inflight = runSync().finally(() => { inflight = null })
  return inflight
}
