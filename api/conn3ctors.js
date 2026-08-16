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
      SELECT id, name, discord_handle, avatar, color, "group", x_handle, updated_at
      FROM conn3ctors
      ORDER BY name
    `
    return sendOk(res, { data: rows })
  } catch (err) {
    return sendError(res, err, err.message?.includes('not configured') ? 503 : 500)
  }
}
