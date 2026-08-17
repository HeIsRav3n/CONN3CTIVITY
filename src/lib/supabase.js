import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
    : null

export function userFromSession(session) {
  const user = session?.user
  if (!user) return null
  const meta = user.user_metadata || {}
  const discord = user.identities?.find((identity) => identity.provider === 'discord')
  return {
    id: user.id,
    discord_id: meta.provider_id || discord?.id || meta.sub || null,
    username:
      meta.custom_claims?.global_name
      || meta.full_name
      || meta.name
      || meta.user_name
      || discord?.identity_data?.full_name
      || discord?.identity_data?.name
      || user.email
      || 'Conn3ctor',
    avatar_url: meta.avatar_url || meta.picture || discord?.identity_data?.avatar_url || null,
  }
}

export async function signInWithDiscord() {
  if (!supabase || !supabaseUrl) {
    return { data: null, error: new Error('Supabase is not configured') }
  }
  try {
    const health = await fetch(`${supabaseUrl}/auth/v1/health`, { method: 'GET' })
    if (!health.ok) {
      return {
        data: null,
        error: new Error('Auth is paused. Restore the CONN3CTIVITY project in Supabase, then try Login again.'),
      }
    }
  } catch {
    return {
      data: null,
      error: new Error('Auth is offline. Restore the CONN3CTIVITY project in the Supabase dashboard, then try Login again.'),
    }
  }
  return supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${window.location.origin}/`,
      scopes: 'identify email',
    },
  })
}

/** Strip PostgREST filter metacharacters so `.or()` cannot be injected. */
export function profileMatchFilter(id) {
  const safe = String(id ?? '').replace(/[^a-zA-Z0-9_-]/g, '')
  return safe ? `discord_id.eq.${safe},id.eq.${safe}` : null
}

export function userAvatarSrc(user) {
  if (user?.avatar_url) return user.avatar_url
  if (user?.avatar && user?.discord_id) {
    return `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`
  }
  return 'https://cdn.discordapp.com/embed/avatars/0.png'
}
