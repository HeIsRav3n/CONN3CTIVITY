import { sendOk, sendError } from './_lib/neon.js'
import { forceLiveSync } from './_lib/discordSync.js'

function authorized(req) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers?.authorization || ''
  if (req.headers?.['x-vercel-cron'] === '1') return true
  if (secret && auth === `Bearer ${secret}`) return true
  return false
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET' && req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405)
  }
  if (!authorized(req)) {
    return sendError(res, 'Unauthorized', 401)
  }
  try {
    const result = await forceLiveSync()
    return sendOk(res, { data: result }, { maxAge: 0 })
  } catch (err) {
    return sendError(res, err, err.message?.includes('not configured') ? 503 : 500)
  }
}
