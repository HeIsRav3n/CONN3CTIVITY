import { neon } from '@neondatabase/serverless'

export function getSql() {
  const url = process.env.NEON_DATABASE_URL
  if (!url) {
    throw new Error('NEON_DATABASE_URL is not configured')
  }
  return neon(url)
}

export function sendOk(res, data, { maxAge = 5 } = {}) {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', `s-maxage=${maxAge}, stale-while-revalidate=30`)
  res.statusCode = 200
  res.end(JSON.stringify({ ok: true, ...data }))
}

/**
 * Never leak raw DB / stack messages to clients in production.
 */
export function sendError(res, error, status = 500) {
  const raw = String(error?.message || error)
  const isConfig = raw.includes('not configured')
  const expose =
    status === 405
    || isConfig
    || process.env.NODE_ENV !== 'production'
    || process.env.VERCEL_ENV === 'development'

  res.setHeader('Content-Type', 'application/json')
  res.statusCode = status
  res.end(JSON.stringify({
    ok: false,
    error: expose ? raw : 'Internal server error',
  }))
}
