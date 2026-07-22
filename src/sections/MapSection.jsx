import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import STATIC_DATA from '../data/conn3ctors.json'
import { fetchConn3ctors, statusLabel, statusColor } from '../lib/api'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { useDeviceCapability } from '../hooks/useDeviceCapability'
import { supabase } from '../lib/supabase'
import { Conn3ctorOrb } from '../components/map/Conn3ctorOrb'

const FALLBACK_ROWS = (STATIC_DATA?.nodes || [])
  .filter(n => n.id !== 'main')
  .map(n => ({
    id: n.id,
    name: n.name,
    discord_handle: n.discordHandle || n.discord_handle,
    avatar: n.avatar,
    color: n.color,
    group: n.group || 1,
    x_handle: n.xHandle || n.x_handle || null,
    updated_at: null,
  }))

function rowsToMembers(rows) {
  return (rows || []).map(r => ({
    id: r.id,
    name: r.name,
    discordHandle: r.discord_handle,
    xHandle: r.x_handle || null,
    group: r.group || 1,
    color: r.color || '#C9A96E',
    avatar: r.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png',
  }))
}

function applyConn3ctorChange(payload, prev) {
  const list = Array.isArray(prev) ? [...prev] : []
  if (payload.eventType === 'DELETE') {
    return list.filter(r => r.id !== payload.old?.id)
  }
  const row = payload.new
  if (!row) return list
  const idx = list.findIndex(r => r.id === row.id)
  if (idx >= 0) list[idx] = row
  else list.push(row)
  return list
}

function normalizeCommunities(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function MapSection() {
  const containerRef = useRef(null)
  const device = useDeviceCapability()

  const [members, setMembers] = useState(() => rowsToMembers(FALLBACK_ROWS))
  const [hoveredNode, setHoveredNode] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [profileState, setProfileState] = useState('idle')
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
  const [focusId, setFocusId] = useState(null)
  const [inView, setInView] = useState(true)

  const {
    data: liveRows,
    status,
    realtime,
  } = useLiveQuery({
    fetcher: fetchConn3ctors,
    initial: FALLBACK_ROWS,
    table: 'conn3ctors',
    applyRealtime: applyConn3ctorChange,
    getUpdatedAt: (rows) => {
      if (!Array.isArray(rows) || !rows.length) return null
      return rows.reduce((max, r) => {
        const t = r.updated_at ? new Date(r.updated_at).getTime() : 0
        return t > max ? t : max
      }, 0) || null
    },
  })

  // Sync live rows → members (preserve selected/hovered object identity when possible)
  useEffect(() => {
    if (!liveRows?.length) return
    const next = rowsToMembers(liveRows)
    setMembers(old => {
      if (!old.length) return next
      const oldMap = new Map(old.map(m => [m.id, m]))
      return next.map(m => {
        const prev = oldMap.get(m.id)
        if (!prev) return m
        return {
          ...prev,
          name: m.name,
          discordHandle: m.discordHandle,
          xHandle: m.xHandle,
          group: m.group,
          color: m.color,
          avatar: m.avatar,
        }
      })
    })
  }, [liveRows])

  // Pause WebGL when map section is off-screen
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio > 0.08),
      { threshold: [0, 0.08, 0.2] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Profile from Supabase (+ Realtime while card is open)
  useEffect(() => {
    if (!selectedNode) {
      setSelectedProfile(null)
      setProfileState('idle')
      return
    }
    let active = true
    let channel = null

    const mapProfile = (data) => ({
      username: data.username || null,
      twitter: data.twitter || null,
      telegram: data.telegram || null,
      cm_type: data.cm_type || null,
      services: data.services || null,
      experience: data.experience || null,
      communities: normalizeCommunities(data.communities),
      role: data.role || null,
    })

    async function loadProfile() {
      setProfileState('loading')
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`discord_id.eq.${selectedNode.id},id.eq.${selectedNode.id}`)
            .maybeSingle()

          if (error) console.warn('Profile lookup:', error.message)

          if (active && data) {
            setSelectedProfile(mapProfile(data))
            setProfileState('ready')
            return
          }
        } catch (err) {
          console.warn('Error loading profile from Supabase:', err)
        }
      }

      if (!active) return
      try {
        const raw = localStorage.getItem(`profile_${selectedNode.id}`)
        if (raw) {
          const p = JSON.parse(raw)
          setSelectedProfile({
            username: p.username || null,
            twitter: p.twitter || null,
            telegram: p.telegram || null,
            cm_type: p.cmType || p.cm_type || null,
            services: p.services || null,
            experience: p.experience || null,
            communities: normalizeCommunities(p.communities),
            role: p.role || null,
          })
          setProfileState('ready')
        } else {
          setSelectedProfile(null)
          setProfileState('empty')
        }
      } catch {
        setSelectedProfile(null)
        setProfileState('error')
      }
    }

    loadProfile()

    if (supabase) {
      channel = supabase
        .channel(`profile:${selectedNode.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          (payload) => {
            const row = payload.new || payload.old
            if (!row) return
            if (row.discord_id !== selectedNode.id && row.id !== selectedNode.id) return
            if (payload.eventType === 'DELETE') {
              setSelectedProfile(null)
              setProfileState('empty')
              return
            }
            setSelectedProfile(mapProfile(payload.new))
            setProfileState('ready')
          },
        )
        .subscribe()
    }

    return () => {
      active = false
      if (channel) supabase?.removeChannel(channel)
    }
  }, [selectedNode])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectedNode(null)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.cursor = 'default'
    }
  }, [])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return (liveRows || [])
      .filter(r =>
        r.name?.toLowerCase().includes(q) ||
        r.discord_handle?.toLowerCase().includes(q) ||
        r.x_handle?.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [liveRows, query])

  const focusNodeById = useCallback((id) => {
    const node = members.find(n => n.id === id)
    if (!node) return
    setCollapsed(false)
    setSelectedNode(node)
    setFocusId(id)
    setQuery('')
  }, [members])

  const toggleCollapse = useCallback(() => {
    setCollapsed(c => !c)
    setSelectedNode(null)
    setFocusId(null)
  }, [])

  const handleSelect = useCallback((member) => {
    if (!member) return
    setCollapsed(false)
    setSelectedNode(prev => (prev?.id === member.id ? null : member))
    setFocusId(member.id)
  }, [])

  const handleHover = useCallback((member) => {
    setHoveredNode(member)
  }, [])

  const badgeLabel = statusLabel(status, { realtime })

  return (
    <section id="map" className="relative py-24 px-4 overflow-hidden" style={{ background: '#07070b' }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 45%, rgba(201,169,110,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-5">
            <div
              className="inline-flex px-3 py-1 rounded-full font-['Josefin_Sans'] text-[0.6rem] tracking-[0.35em] uppercase"
              style={{ background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)', color: '#C9A96E' }}
            >
              ROLE: CONN3CTOR
            </div>
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-['Josefin_Sans'] text-[0.55rem] tracking-widest uppercase"
              style={{
                background: `${statusColor(status)}14`,
                border: `1px solid ${statusColor(status)}40`,
                color: statusColor(status),
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusColor(status) }} />
              {badgeLabel}
            </div>
          </div>

          <h2
            className="font-['Josefin_Sans'] font-light tracking-[0.25em] text-4xl md:text-5xl mb-4"
            style={{ color: 'var(--cream)' }}
          >
            CONN3CTION MAP
          </h2>
          <p
            className="font-['Josefin_Sans'] text-[0.65rem] tracking-[0.3em] uppercase max-w-lg mx-auto mb-6"
            style={{ color: 'rgba(237,232,220,0.3)' }}
          >
            Drag to orbit · Scroll to zoom · Click logo to collapse · Click avatar to inspect
          </p>

          <div className="relative max-w-md mx-auto">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Conn3ctors…"
              aria-label="Search Conn3ctors"
              className="w-full px-4 py-2.5 rounded-full font-['Josefin_Sans'] text-sm outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(201,169,110,0.22)',
                color: 'var(--cream)',
              }}
            />
            {matches.length > 0 && (
              <div
                className="absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden z-20 text-left"
                style={{
                  background: 'rgba(11,10,8,0.96)',
                  border: '1px solid rgba(201,169,110,0.2)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.55)',
                }}
              >
                {matches.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => focusNodeById(m.id)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 text-left"
                  >
                    <img src={m.avatar} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    <span className="min-w-0">
                      <span className="block font-['Josefin_Sans'] text-sm truncate" style={{ color: 'var(--cream)' }}>
                        {m.name}
                      </span>
                      <span className="block font-['Josefin_Sans'] text-[0.55rem] tracking-widest uppercase truncate" style={{ color: 'rgba(237,232,220,0.4)' }}>
                        {m.discord_handle}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay: 0.15, type: 'spring', stiffness: 80, damping: 18 }}
          ref={containerRef}
          className="w-full relative map-jelly"
          style={{
            height: 'clamp(520px, 78vh, 880px)',
            overflow: 'hidden',
            background: 'radial-gradient(ellipse at center, rgba(18,18,30,0.95) 0%, #050508 100%)',
            border: '1px solid rgba(201,169,110,0.12)',
          }}
        >
          <Conn3ctorOrb
            members={members}
            collapsed={collapsed}
            selectedId={selectedNode?.id || null}
            hoveredId={hoveredNode?.id || null}
            focusId={focusId}
            onHover={handleHover}
            onSelect={handleSelect}
            onHubClick={toggleCollapse}
            active={inView}
            isMobile={device.isMobile}
            pixelRatio={device.pixelRatio}
          />

          <AnimatePresence>
            {collapsed && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full pointer-events-none"
                style={{
                  background: 'rgba(201,169,110,0.1)',
                  border: '1px solid rgba(201,169,110,0.3)',
                  color: '#C9A96E',
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontSize: '0.55rem',
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                }}
              >
                Tap logo to expand orbit
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className="absolute top-4 left-4 pointer-events-none"
            style={{
              fontFamily: "'Josefin Sans', sans-serif",
              fontSize: '0.45rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(201,169,110,0.35)',
            }}
          >
            {members.length} Conn3ctors · Orbital Rings
          </div>

          <div
            className="absolute bottom-4 left-4 pointer-events-none hidden sm:block"
            style={{
              fontFamily: "'Josefin Sans', sans-serif",
              fontSize: '0.42rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(237,232,220,0.22)',
            }}
          >
            Orbital shells · live roster
          </div>

          <AnimatePresence>
            {selectedNode && !collapsed && (
              <motion.div
                key={selectedNode.id}
                role="dialog"
                aria-modal="true"
                aria-label={`${selectedNode.name} profile`}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                className="absolute bottom-6 right-6 z-50 w-[288px] max-w-[calc(100%-2rem)]"
              >
                <div
                  className="rounded-[20px] relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.018) 100%)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    boxShadow: `0 24px 48px rgba(0,0,0,0.75), 0 0 28px ${selectedNode.color}18`,
                    backdropFilter: 'blur(24px)',
                  }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }}
                  />

                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative flex-shrink-0">
                        <img
                          src={selectedNode.avatar}
                          alt={selectedNode.name}
                          className="w-14 h-14 rounded-xl object-cover"
                          style={{ border: `2px solid ${selectedNode.color}55` }}
                        />
                        <div
                          className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full"
                          style={{ background: '#22c55e', border: '2px solid #07070b' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-['Josefin_Sans'] font-semibold text-base tracking-wide truncate"
                          style={{ color: 'var(--cream)' }}
                        >
                          {selectedNode.name}
                        </div>
                        <div
                          className="font-['Josefin_Sans'] text-[0.58rem] tracking-[0.2em] uppercase truncate"
                          style={{ color: 'rgba(237,232,220,0.38)' }}
                        >
                          {selectedNode.discordHandle}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedNode(null)}
                        aria-label="Close profile"
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <div
                        className="px-2.5 py-1 rounded-full font-['Josefin_Sans'] text-[0.48rem] tracking-[0.28em] uppercase"
                        style={{
                          background: `${selectedNode.color}14`,
                          border: `1px solid ${selectedNode.color}38`,
                          color: selectedNode.color,
                        }}
                      >
                        Conn3ctor
                      </div>
                      <a
                        href={`https://discord.com/users/${selectedNode.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{
                          background: 'rgba(88,101,242,0.12)',
                          border: '1px solid rgba(88,101,242,0.35)',
                          color: '#9aa3ff',
                          fontSize: '0.48rem',
                          letterSpacing: '0.15em',
                          fontFamily: "'Josefin Sans', sans-serif",
                          textDecoration: 'none',
                        }}
                      >
                        Discord
                      </a>
                      {(selectedNode.xHandle || selectedProfile?.twitter) && (
                        <a
                          href={`https://x.com/${(selectedNode.xHandle || selectedProfile.twitter).replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.09)',
                            color: 'rgba(237,232,220,0.65)',
                            fontSize: '0.48rem',
                            letterSpacing: '0.15em',
                            fontFamily: "'Josefin Sans', sans-serif",
                            textDecoration: 'none',
                          }}
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                          @{(selectedNode.xHandle || selectedProfile.twitter).replace('@', '')}
                        </a>
                      )}
                    </div>

                    {profileState === 'loading' && (
                      <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div
                          className="font-['Josefin_Sans'] text-[0.52rem] tracking-widest uppercase"
                          style={{ color: 'rgba(237,232,220,0.45)' }}
                        >
                          Loading profile...
                        </div>
                      </div>
                    )}

                    {selectedProfile && (
                      <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {selectedProfile.role && (
                          <div className="font-['Josefin_Sans'] text-[0.53rem] tracking-widest" style={{ color: 'rgba(237,232,220,0.45)' }}>
                            <span style={{ color: '#C9A96E' }}>ROLE </span>
                            {selectedProfile.role}
                          </div>
                        )}
                        {selectedProfile.cm_type && (
                          <div className="font-['Josefin_Sans'] text-[0.53rem] tracking-widest" style={{ color: 'rgba(237,232,220,0.45)' }}>
                            <span style={{ color: '#C9A96E' }}>CM TYPE </span>
                            {selectedProfile.cm_type}
                          </div>
                        )}
                        {selectedProfile.experience && (
                          <div className="font-['Josefin_Sans'] text-[0.53rem] tracking-widest" style={{ color: 'rgba(237,232,220,0.45)' }}>
                            <span style={{ color: '#C9A96E' }}>EXP </span>
                            {selectedProfile.experience}
                          </div>
                        )}
                        {selectedProfile.services && (
                          <div className="font-['Josefin_Sans'] text-[0.53rem] tracking-widest" style={{ color: 'rgba(237,232,220,0.45)' }}>
                            <span style={{ color: '#C9A96E' }}>SERVICES </span>
                            {selectedProfile.services}
                          </div>
                        )}
                        {selectedProfile.telegram && (
                          <a
                            href={`https://t.me/${selectedProfile.telegram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 font-['Josefin_Sans'] text-[0.5rem] tracking-widest"
                            style={{ color: '#0088cc', textDecoration: 'none' }}
                          >
                            TG {selectedProfile.telegram}
                          </a>
                        )}
                        {selectedProfile.communities.filter(Boolean).length > 0 && (
                          <div className="pt-1 flex flex-wrap gap-1.5">
                            {selectedProfile.communities.filter(Boolean).slice(0, 5).map((community, idx) => (
                              <span
                                key={`${community}-${idx}`}
                                className="px-2 py-0.5 rounded-full font-['Josefin_Sans'] text-[0.42rem] tracking-widest uppercase"
                                style={{
                                  color: '#C9A96E',
                                  border: '1px solid rgba(201,169,110,0.35)',
                                  background: 'rgba(201,169,110,0.08)',
                                }}
                              >
                                {community}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {profileState !== 'loading' && !selectedProfile && (
                      <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div
                          className="font-['Josefin_Sans'] text-[0.52rem] tracking-widest uppercase"
                          style={{ color: 'rgba(237,232,220,0.35)' }}
                        >
                          No extended profile yet
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}
