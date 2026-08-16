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

export function sendError(res, error, status = 500) {
  const message = String(error?.message || error)
  // Never echo raw DB/driver errors to clients — they can leak
  // connection details. Log server-side, return a generic message.
  const masked = status === 500
  if (masked) console.error('[api]', message)
  res.setHeader('Content-Type', 'application/json')
  res.statusCode = status
  res.end(JSON.stringify({ ok: false, error: masked ? 'Internal server error' : message }))
}
