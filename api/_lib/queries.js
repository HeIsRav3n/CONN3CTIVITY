/**
 * Shared Neon read queries used by Vercel `/api/*` handlers and the Vite local API plugin.
 */
export async function queryServerStats(sql) {
  const rows = await sql`
    SELECT name, conn3ctor_count, approximate_presence_count, total_members, updated_at
    FROM server_stats
    ORDER BY updated_at DESC
    LIMIT 1
  `
  return rows[0] ?? null
}

export async function queryConn3ctors(sql) {
  return sql`
    SELECT id, name, discord_handle, avatar, color, "group", x_handle, updated_at
    FROM conn3ctors
    ORDER BY name
  `
}

export async function queryMvcProfile(sql) {
  const rows = await sql`
    SELECT id, username, avatar_url, twitter, updated_at
    FROM mvc_profile
    ORDER BY updated_at DESC
    LIMIT 1
  `
  return rows[0] ?? null
}
