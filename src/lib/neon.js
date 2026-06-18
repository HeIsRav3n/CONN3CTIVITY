import { neon } from '@neondatabase/serverless'

// Tagged-template no-op used when URL is not configured
const noop = () => Promise.resolve([])

let _sql = noop
try {
  const url = import.meta.env.VITE_NEON_DATABASE_URL
  if (url) _sql = neon(url)
} catch {}

export const sql = _sql
