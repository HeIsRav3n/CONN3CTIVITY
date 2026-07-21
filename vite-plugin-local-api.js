import { neon } from '@neondatabase/serverless'
import { queryServerStats, queryConn3ctors, queryMvcProfile } from './api/_lib/queries.js'

async function handleStats() {
  const sql = neon(process.env.NEON_DATABASE_URL)
  return { data: await queryServerStats(sql) }
}

async function handleConn3ctors() {
  const sql = neon(process.env.NEON_DATABASE_URL)
  return { data: await queryConn3ctors(sql) }
}

async function handleMvc() {
  const sql = neon(process.env.NEON_DATABASE_URL)
  return { data: await queryMvcProfile(sql) }
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
          const expose = process.env.NODE_ENV !== 'production'
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            ok: false,
            error: expose ? String(err?.message || err) : 'Internal server error',
          }))
        }
      })
    },
  }
}
