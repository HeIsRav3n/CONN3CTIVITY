import { getSql, sendOk, sendError } from './_lib/neon.js'
import { queryMvcProfile } from './_lib/queries.js'

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    return sendError(res, 'Method not allowed', 405)
  }
  try {
    const sql = getSql()
    const data = await queryMvcProfile(sql)
    return sendOk(res, { data })
  } catch (err) {
    return sendError(res, err, err.message?.includes('not configured') ? 503 : 500)
  }
}
