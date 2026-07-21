/** Max age (ms) before live data is treated as stale */
export const STALE_MS = 15 * 60 * 1000
export const LIVE_POLL_MS = 10000
export const LIVE_BACKGROUND_POLL_MS = 20000

/**
 * @returns {'live' | 'stale' | 'cached' | 'offline'}
 */
export function resolveDataStatus(updatedAt, { fetchedOk = false, hasData = false } = {}) {
  if (!fetchedOk) return hasData ? 'cached' : 'offline'
  if (!updatedAt) return hasData ? 'live' : 'offline'
  const age = Date.now() - new Date(updatedAt).getTime()
  if (Number.isNaN(age)) return hasData ? 'live' : 'offline'
  if (age > STALE_MS) return 'stale'
  return 'live'
}

export function statusLabel(status, { realtime = false } = {}) {
  if (realtime && (status === 'live' || status === 'cached')) return 'Realtime'
  switch (status) {
    case 'live': return 'Live'
    case 'stale': return 'Last synced'
    case 'offline': return 'Offline'
    default: return 'Cached'
  }
}

export function statusColor(status) {
  switch (status) {
    case 'live': return '#22c55e'
    case 'stale': return '#C9A96E'
    case 'offline': return '#ef4444'
    default: return '#C9A96E'
  }
}

async function getJson(path) {
  const res = await fetch(path)
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.ok === false) {
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return body
}

export async function fetchStats() {
  const body = await getJson('/api/stats')
  return body.data ?? null
}

export async function fetchConn3ctors() {
  const body = await getJson('/api/conn3ctors')
  return Array.isArray(body.data) ? body.data : []
}

export async function fetchMvc() {
  const body = await getJson('/api/mvc')
  return body.data ?? null
}
