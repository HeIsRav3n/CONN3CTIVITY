// Shared URL sanitizer for links built from user data, handles and config.
// Only http(s) destinations are ever returned. Anything else (javascript:,
// data:, vbscript:, file:, unparseable input) resolves to null so callers
// can omit the link instead of rendering an unsafe href.

const TWITTER_HANDLE = /^[A-Za-z0-9_]{1,15}$/
const TELEGRAM_HANDLE = /^[A-Za-z0-9_]{5,32}$/
const UNSAFE_SCHEME = /^(javascript|data|vbscript|file):/i
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

function cleanHandle(raw) {
  if (typeof raw !== 'string') return null
  const handle = raw.trim().replace(/^@/, '')
  return handle || null
}

/** Canonical X profile URL for a handle, with or without a leading @. */
export function twitterProfileUrl(handle) {
  const clean = cleanHandle(handle)
  if (!clean || !TWITTER_HANDLE.test(clean)) return null
  return `https://x.com/${clean}`
}

/** Canonical Telegram profile URL for a handle, with or without a leading @. */
export function telegramProfileUrl(handle) {
  const clean = cleanHandle(handle)
  if (!clean || !TELEGRAM_HANDLE.test(clean)) return null
  return `https://t.me/${clean}`
}

/** Canonical profile URL for a bare handle on the given platform. */
export function socialProfileUrl(handle, platform = 'twitter') {
  return platform === 'telegram' ? telegramProfileUrl(handle) : twitterProfileUrl(handle)
}

/**
 * Return a safe absolute http(s) URL, or null when the input is not one.
 * Bare handles (with or without @) become their canonical X profile URL.
 * Bare domains gain https. Protocol relative URLs gain https.
 */
export function sanitizeUrl(raw) {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (!value) return null
  if (UNSAFE_SCHEME.test(value)) return null
  if (value.startsWith('@')) return twitterProfileUrl(value)
  if (value.startsWith('//')) return sanitizeUrl(`https:${value}`)
  if (!HAS_SCHEME.test(value)) {
    // A bare token with no dot or slash is a handle, not a domain.
    if (!value.includes('.') && !value.includes('/')) return twitterProfileUrl(value)
    return sanitizeUrl(`https://${value}`)
  }

  let url
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  return url.href
}
