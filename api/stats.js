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
      SELECT name, conn3ctor_count, approximate_presence_count, total_members, updated_at
      FROM server_stats
      ORDER BY updated_at DESC
      LIMIT 1
    `
    return sendOk(res, { data: rows[0] ?? null })
  } catch (err) {
    return sendError(res, err, err.message?.includes('not configured') ? 503 : 500)
  }
}
