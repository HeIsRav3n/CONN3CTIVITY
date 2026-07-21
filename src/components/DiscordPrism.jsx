import { useState } from 'react'
import { motion } from 'framer-motion'
import { fetchStats, statusLabel, statusColor } from '../lib/api'
import { useCountUp } from '../hooks/useCountUp'
import { useLiveQuery } from '../hooks/useLiveQuery'
import serverInsights from '../data/serverInsights.json'

function StatBlock({ label, value, color = '#EDE8DC', accent = false }) {
  const display = useCountUp(value)
  return (
    <div className="flex flex-col items-center gap-1 relative">
      {accent && (
        <div className="absolute -inset-2 rounded-xl opacity-20 blur-md" style={{ background: color }} />
      )}
      <span
        className="font-['Josefin_Sans'] font-light tabular-nums relative z-10"
        style={{ fontSize: '1.55rem', color, letterSpacing: '-0.02em', lineHeight: 1 }}
      >
        {display.toLocaleString()}
      </span>
      <span
        className="font-['Josefin_Sans'] text-[0.48rem] tracking-[0.25em] uppercase relative z-10"
        style={{ color: `${color}80` }}
      >
        {label}
      </span>
    </div>
  )
}

function PulsingDot({ color = '#22c55e' }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: color }} />
    </span>
  )
}

export function DiscordPrism() {
  const { data, status, realtime } = useLiveQuery({
    fetcher: fetchStats,
    initial: serverInsights,
    table: 'server_stats',
    applyRealtime: (payload, prev) => payload.new || prev,
  })
  const [lastPing] = useState(() => new Date())

  const online     = data?.approximate_presence_count ?? 0
  const conn3ctors = data?.conn3ctor_count             ?? 0
  const total      = data?.total_members               ?? 0
  const color = statusColor(status)
  const syncedAt = data?.updated_at ? new Date(data.updated_at) : lastPing

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.8, duration: 1.1, type: 'spring', stiffness: 80 }}
      className="absolute bottom-20 right-3 md:right-10 lg:right-20 z-[100] pointer-events-auto"
      style={{ perspective: 1200 }}
    >
      <motion.div
        animate={{ y: [-6, 6, -6] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div
          className="absolute -inset-6 rounded-[44px] blur-3xl opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #C9A96E 0%, transparent 70%)' }}
        />

        <div
          className="relative w-[300px] rounded-[28px] overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.18) inset',
            backdropFilter: 'blur(28px)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[28px]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#C9A96E]/8 via-transparent to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)' }} />
          </div>

          <div className="relative flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(88,101,242,0.2)', border: '1px solid rgba(88,101,242,0.3)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#5865F2">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.461-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028z"/>
                </svg>
              </div>
              <div>
                <div className="font-['Josefin_Sans'] text-[0.72rem] font-semibold tracking-[0.15em] uppercase" style={{ color: 'rgba(237,232,220,0.9)' }}>
                  {data?.name || 'CONN3CTIVITY'}
                </div>
                <div className="font-['Josefin_Sans'] text-[0.42rem] tracking-[0.3em] uppercase mt-0.5" style={{ color: 'rgba(237,232,220,0.35)' }}>
                  Server Insights
                </div>
              </div>
            </div>

            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-full"
              style={{
                background: `${color}1F`,
                border: `1px solid ${color}4D`,
              }}
            >
              <PulsingDot color={color} />
              <span className="font-['Josefin_Sans'] text-[0.4rem] tracking-[0.25em] uppercase font-semibold" style={{ color }}>
                {statusLabel(status, { realtime })}
              </span>
            </div>
          </div>

          <div className="mx-5 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

          <div className="grid grid-cols-3 gap-px px-5 py-5">
            <StatBlock label="Online"     value={online}     color="#22c55e"              accent />
            <StatBlock label="Conn3ctors" value={conn3ctors} color="#C9A96E"              accent />
            <StatBlock label="Members"    value={total}      color="rgba(237,232,220,0.7)" />
          </div>

          <div className="mx-5 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

          <div className="flex items-center justify-between px-5 py-3">
            <span className="font-['Josefin_Sans'] text-[0.4rem] tracking-[0.25em] uppercase" style={{ color: 'rgba(237,232,220,0.25)' }}>
              {syncedAt
                ? `Synced ${syncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Connecting…'}
            </span>
            <div className="flex items-center gap-1">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                  className="w-0.5 rounded-full"
                  style={{ height: 8, background: color }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
