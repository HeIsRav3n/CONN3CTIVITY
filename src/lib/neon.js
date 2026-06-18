import { neon } from '@neondatabase/serverless'

// Read-only HTTP client — safe to expose (web_reader role: SELECT only)
const sql = neon(import.meta.env.VITE_NEON_DATABASE_URL)

export { sql }
