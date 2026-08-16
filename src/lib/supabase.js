import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

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
