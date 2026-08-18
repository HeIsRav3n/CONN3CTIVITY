import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchMvc, statusLabel, statusColor } from '../lib/api'
import { SITE_DATA } from '../data/siteData'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { supabase, profileMatchFilter } from '../lib/supabase'

function normalizeCommunities(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : []
    } catch {
      return value ? [value] : []
    }
  }
  return []
}

function mergeMvcProfile(row, profileExtras) {
  const base = SITE_DATA.fallbackMVC
  const src = row || {}
  const extras = profileExtras || {}
  return {
    id: src.id || extras.id || base.id,
    discord_id: src.id || src.discord_id || extras.discord_id || base.discord_id,
    username: src.username || extras.username || base.username,
    avatar_url: src.avatar_url || extras.avatar_url || base.avatar_url,
    twitter: src.twitter || extras.twitter || base.twitter,
    cm_type: extras.cm_type || src.cm_type || base.cm_type,
    experience: extras.experience || src.experience || base.experience,
    services: extras.services || src.services || base.services,
    communities: normalizeCommunities(extras.communities ?? src.communities ?? base.communities),
  }
}

export function MVCSection() {
  const { data: row, status, realtime } = useLiveQuery({
    fetcher: fetchMvc,
    initial: SITE_DATA.fallbackMVC,
    table: 'mvc_profile',
    applyRealtime: (payload, prev) => payload.new || prev,
  })
  const [profileExtras, setProfileExtras] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function enrich() {
      const filter = profileMatchFilter(row?.id)
      if (!supabase || !filter) {
        setProfileExtras(null)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('id, discord_id, username, avatar_url, twitter, cm_type, experience, services, communities')
        .or(filter)
        .maybeSingle()
      if (!cancelled) setProfileExtras(data || null)
    }
    enrich()
    return () => { cancelled = true }
  }, [row?.id])

  const mvcProfile = mergeMvcProfile(row, profileExtras)
  const badgeColor = statusColor(status)

  return (
    <section id="mvc-spotlight" className="relative py-24 md:py-32 px-4 overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="cinematic-aurora cinematic-aurora-a" style={{ opacity: 0.55 }} />
        <div className="cinematic-aurora cinematic-aurora-b" style={{ opacity: 0.4 }} />
      </div>
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center">
        <div
          className="w-[640px] h-[420px] -mt-24"
          style={{
            background: 'radial-gradient(ellipse at top, rgba(201,169,110,0.12) 0%, transparent 70%)',
            filter: 'blur(48px)',
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-[#C9A96E]/30 bg-[#C9A96E]/10 mb-6 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: badgeColor }} />
            <span className="font-josefin text-[0.65rem] tracking-[0.3em] uppercase" style={{ color: badgeColor }}>
              {statusLabel(status, { realtime })} · Spotlight
            </span>
          </div>
          <h2 className="heading-primary text-cream mb-4" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}>
            MVC of the <span style={{ color: 'var(--gold)' }}>Week</span>
          </h2>
          <p className="font-['Josefin_Sans'] text-cream/50 text-sm max-w-xl mx-auto leading-relaxed font-light">
            Every week we crown the Most Valuable Conn3ctor — the person who brought the most value, connections, and growth to the network.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full max-w-3xl relative"
        >
          <div className="relative bg-[#0B0A08]/85 border border-gold/25 p-8 md:p-12 overflow-hidden" style={{ borderRadius: 2 }}>
            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
              <div className="relative flex-shrink-0">
                <img
                  src={mvcProfile.avatar_url || '/mascot-cm-transparent.png'}
                  alt={mvcProfile.username}
                  className="w-40 h-40 md:w-48 md:h-48 rounded-full border border-gold/40 object-cover"
                />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black border border-gold/40 flex items-center justify-center" style={{ borderRadius: 2 }}>
                  <span className="font-['Josefin_Sans'] text-gold text-[0.6rem] tracking-[0.22em] uppercase">Winner</span>
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h3 className="font-['Josefin_Sans'] text-3xl md:text-4xl text-cream mb-2 tracking-[0.08em] uppercase" style={{ fontWeight: 300 }}>
                  {mvcProfile.username}
                </h3>

                {mvcProfile.twitter && (
                  <a
                    href={`https://x.com/${mvcProfile.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gold hover:text-white transition-colors font-space text-sm mb-6"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    {mvcProfile.twitter.startsWith('@') ? mvcProfile.twitter : `@${mvcProfile.twitter}`}
                  </a>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="font-['Josefin_Sans'] text-[0.55rem] tracking-[0.2em] text-cream/40 uppercase mb-1">CM Type</div>
                    <div className="font-space text-cream/90 text-sm">{mvcProfile.cm_type || 'Spotlight'}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="font-['Josefin_Sans'] text-[0.55rem] tracking-[0.2em] text-cream/40 uppercase mb-1">Experience</div>
                    <div className="font-space text-cream/90 text-sm truncate">{mvcProfile.experience || 'Rising Star'}</div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-left">
                  <div className="font-['Josefin_Sans'] text-[0.55rem] tracking-[0.2em] text-cream/40 uppercase mb-2">Top Services</div>
                  <div className="font-space text-cream/80 text-sm line-clamp-2">
                    {mvcProfile.services || 'Community Building, Engagement'}
                  </div>
                </div>

                {mvcProfile.communities.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="font-['Josefin_Sans'] text-[0.6rem] tracking-[0.2em] text-cream/40 uppercase mr-2">Communities:</span>
                    {mvcProfile.communities.map((comm) => (
                      <span key={comm} className="px-3 py-1 bg-gold/10 border border-gold/20 text-gold rounded text-xs font-space">
                        {comm}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
