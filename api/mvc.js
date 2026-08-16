import { getSql, sendOk, sendError } from './_lib/neon.js'
import { ensureLiveData } from './_lib/discordSync.js'

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    return sendError(res, 'Method not allowed', 405)
  }
  try {
    await ensureLiveData().catch((err) => console.error('[sync]', err?.message || err))
    const sql = getSql()
    const rows = await sql`
      SELECT id, username, avatar_url, twitter, updated_at
      FROM mvc_profile
      ORDER BY updated_at DESC
      LIMIT 1
    `
    return sendOk(res, { data: rows[0] ?? null })
  } catch (err) {
    return sendError(res, err, err.message?.includes('not configured') ? 503 : 500)
  }
}
