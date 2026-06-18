// Plain fetch-based Neon HTTP SQL client — no Node.js builtins, works in browser
const CONN_STR = import.meta.env.VITE_NEON_DATABASE_URL

function getEndpoint(connStr) {
  try {
    const u = new URL(connStr.replace(/^postgresql:\/\//, 'https://'))
    return `https://${u.hostname}/sql`
  } catch {
    return null
  }
}

async function neonFetch(query, params = []) {
  if (!CONN_STR) return []
  const endpoint = getEndpoint(CONN_STR)
  if (!endpoint) return []
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': CONN_STR,
    },
    body: JSON.stringify({ query, params }),
  })
  if (!res.ok) throw new Error(`Neon ${res.status}`)
  const data = await res.json()
  return data.rows ?? []
}

// Tagged template literal — same API as @neondatabase/serverless neon()
export function sql(strings, ...values) {
  let query = ''
  const params = []
  strings.forEach((str, i) => {
    query += str
    if (i < values.length) {
      params.push(values[i])
      query += `$${params.length}`
    }
  })
  return neonFetch(query, params)
}
