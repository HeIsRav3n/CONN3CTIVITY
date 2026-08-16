import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchMvc, statusLabel, statusColor } from '../lib/api'
import { SITE_DATA } from '../data/siteData'
import { use3DTilt } from '../hooks/use3DTilt'
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
  const { ref, rotateX, rotateY, handleMouseMove, handleMouseLeave } = use3DTilt({ damping: 20, stiffness: 200, mass: 0.5 }, 10)
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
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center">
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--gold)_0%,_transparent_60%)] opacity-30 blur-[100px] -mt-40"
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
          <h2 className="font-orbitron font-black text-4xl md:text-6xl text-cream tracking-wide mb-4 drop-shadow-[0_0_20px_rgba(201,169,110,0.3)]">
            MVC OF THE WEEK
          </h2>
          <p className="font-['Josefin_Sans'] text-cream/50 text-sm max-w-xl mx-auto leading-relaxed font-light">
            Every week we crown the Most Valuable Conn3ctor — the person who brought the most value, connections, and growth to the network.
          </p>
        </motion.div>

        <motion.div
          ref={ref}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 1200 }}
          initial={{ opacity: 0, scale: 0.9, rotateX: 15 }}
          whileInView={{ opacity: 1, scale: 1, rotateX: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="w-full max-w-3xl relative group cursor-pointer"
        >
          <div className="absolute -inset-1 bg-gradient-to-br from-gold via-[#C9A96E]/60 to-cream/30 rounded-[32px] opacity-20 group-hover:opacity-60 blur-xl transition-opacity duration-700" />

          <div className="relative bg-[#0B0A08]/80 backdrop-blur-3xl border border-gold/30 rounded-[30px] p-8 md:p-12 overflow-hidden shadow-2xl">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(201,169,110,0.4) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10" style={{ transform: 'translateZ(40px)' }}>
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gold blur-2xl opacity-20 rounded-full animate-pulse" />
                <img
                  src={mvcProfile.avatar_url || '/mascot-cm-transparent.png'}
                  alt={mvcProfile.username}
                  className="w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-gold/50 object-cover shadow-[0_0_40px_rgba(201,169,110,0.3)]"
                />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black border border-gold/50 rounded-full flex items-center justify-center shadow-lg">
                  <span className="font-orbitron text-gold text-xs font-bold tracking-widest uppercase">WINNER</span>
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h3 className="font-orbitron font-bold text-3xl md:text-4xl text-cream mb-2 drop-shadow-md">
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
