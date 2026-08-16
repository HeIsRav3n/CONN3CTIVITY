import { neon } from '@neondatabase/serverless'

async function handleStats() {
  const sql = neon(process.env.NEON_DATABASE_URL)
  const rows = await sql`
    SELECT name, conn3ctor_count, approximate_presence_count, total_members, updated_at
    FROM server_stats
    ORDER BY updated_at DESC
    LIMIT 1
  `
  return { data: rows[0] ?? null }
}

async function handleConn3ctors() {
  const sql = neon(process.env.NEON_DATABASE_URL)
  const rows = await sql`
    SELECT id, name, discord_handle, avatar, color, "group", x_handle, updated_at
    FROM conn3ctors
    ORDER BY name
  `
  return { data: rows }
}

async function handleMvc() {
  const sql = neon(process.env.NEON_DATABASE_URL)
  const rows = await sql`
    SELECT id, username, avatar_url, twitter, updated_at
    FROM mvc_profile
    ORDER BY updated_at DESC
    LIMIT 1
  `
  return { data: rows[0] ?? null }
}

const ROUTES = {
  '/api/stats': handleStats,
  '/api/conn3ctors': handleConn3ctors,
  '/api/mvc': handleMvc,
}

/**
 * Serves /api/* during `vite` using NEON_DATABASE_URL from env.
 * Production uses Vercel serverless functions in /api.
 */
export function localApiPlugin() {
  return {
    name: 'conn3ctivity-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]
        const handler = ROUTES[path]
        if (!handler) return next()

        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }))
          return
        }

        if (!process.env.NEON_DATABASE_URL) {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'NEON_DATABASE_URL is not configured' }))
          return
        }

        try {
          const payload = await handler()
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30')
          res.end(JSON.stringify({ ok: true, ...payload }))
        } catch (err) {
          console.error('[local-api]', err?.message || err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'Internal server error' }))
        }
      })
    },
  }
}
