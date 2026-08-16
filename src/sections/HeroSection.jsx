import { useRef } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { VennAtmosphere } from '../components/VennAtmosphere'
import { useCountUp } from '../hooks/useCountUp'
import { fetchStats, statusLabel, statusColor } from '../lib/api'
import { useLiveQuery } from '../hooks/useLiveQuery'
import serverInsights from '../data/serverInsights.json'

// ─── Scroll Progress Bar ──────────────────────────────────────────────────────
function ScrollProgressBar({ progress }) {
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] z-[100] origin-left"
      style={{
        scaleX: progress,
        background: 'linear-gradient(90deg, #C9A96E, #EDE8DC)',
      }}
    />
  )
}

// ─── Animated Letter ──────────────────────────────────────────────────────────
function AnimatedLetter({ char, index }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 60, rotateX: -90 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        duration: 0.9,
        delay: index * 0.045,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{ display: 'inline-block', transformOrigin: '50% 100%' }}
    >
      {char === ' ' ? '\u00A0' : char}
    </motion.span>
  )
}

// ─── Scroll Cue ───────────────────────────────────────────────────────────────
function ScrollCue() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.5, duration: 1 }}
      className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
    >
      <span style={{
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: '0.55rem',
        letterSpacing: '0.4em',
        color: 'rgba(237,232,220,0.3)',
        textTransform: 'uppercase',
      }}>SCROLL TO EXPLORE</span>
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 1,
          height: 40,
          background: 'linear-gradient(180deg, rgba(201,169,110,0.6), transparent)',
        }}
      />
    </motion.div>
  )
}

// ─── Hero Live Stats Bar ──────────────────────────────────────────────────────
function HeroLiveBar() {
  const { data: stats, status, realtime } = useLiveQuery({
    fetcher: fetchStats,
    initial: serverInsights,
    table: 'server_stats',
    applyRealtime: (payload, prev) => payload.new || prev,
  })

  const online     = useCountUp(stats?.approximate_presence_count ?? 0, 1800)
  const conn3ctors = useCountUp(stats?.conn3ctor_count            ?? 0, 2000)
  const total      = useCountUp(stats?.total_members              ?? 0, 2200)
  const color = statusColor(status)

  const items = [
    { label: 'Online',      value: online,     color: '#22c55e' },
    { label: 'Conn3ctors',  value: conn3ctors, color: '#C9A96E' },
    { label: 'Members',     value: total,      color: 'rgba(237,232,220,0.6)' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.8, duration: 0.8 }}
      className="flex items-center justify-center gap-0 overflow-hidden flex-wrap max-w-full"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)',
        width: 'fit-content',
        margin: '0 auto',
        borderRadius: 2,
      }}
    >
      {/* Live dot */}
      <div className="flex items-center gap-2 pl-4 pr-3 border-r border-white/5">
        <span className="relative flex h-1.5 w-1.5">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70"
            style={{ background: color }}
          />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: color }} />
        </span>
        <span
          className="font-['Josefin_Sans'] text-[0.42rem] tracking-[0.3em] uppercase"
          style={{ color }}
        >
          {statusLabel(status, { realtime })}
        </span>
      </div>

      {/* Stats */}
      {items.map((item, i) => (
        <div
          key={item.label}
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ borderRight: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
        >
          <span
            className="font-['Josefin_Sans'] font-light text-sm tabular-nums"
            style={{ color: item.color }}
          >
            {item.value.toLocaleString()}
          </span>
          <span
            className="font-['Josefin_Sans'] text-[0.42rem] tracking-[0.25em] uppercase"
            style={{ color: 'rgba(237,232,220,0.3)' }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </motion.div>
  )
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
export function HeroSection({ onThreeClick }) {
  const containerRef = useRef(null)

  const { scrollYProgress } = useScroll()
  const smoothProgress = useSpring(scrollYProgress, { damping: 30, stiffness: 100 })

  const tagWords = ['SEARCH', 'FIND', 'CONN3CT']

  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -120])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0])
  const canvasScale = useTransform(scrollYProgress, [0, 0.4], [1, 1.12])

  return (
    <>
      <ScrollProgressBar progress={smoothProgress} />

      <section
        id="home"
        ref={containerRef}
        className="relative min-h-screen overflow-hidden flex items-center justify-center"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 50% -10%, rgba(201,169,110,0.12) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 85% 70%, rgba(237,232,220,0.04) 0%, transparent 50%),
            #0B0A08
          `,
        }}
      >
        {/* ── Venn Atmosphere ── */}
        <motion.div
          className="absolute inset-0 z-0"
          style={{ scale: canvasScale }}
        >
          <VennAtmosphere />
        </motion.div>

        {/* ── TOP mask — hides particles behind the navbar ── */}
        <div
          className="absolute top-0 left-0 right-0 z-[1] pointer-events-none"
          style={{
            height: '100px',
            background: 'linear-gradient(180deg, #0B0A08 0%, #0B0A08 30%, transparent 100%)',
          }}
        />

        {/* ── BOTTOM mask — fades out particles before next section ── */}
        <div
          className="absolute bottom-0 left-0 right-0 z-[1] pointer-events-none"
          style={{
            height: '140px',
            background: 'linear-gradient(0deg, #0B0A08 0%, #0B0A08 20%, transparent 100%)',
          }}
        />

        {/* ── CENTER clear zone — erases particles behind the title text ── */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 65% 60% at 50% 40%,
                rgba(11,10,8,0.92) 0%,
                rgba(11,10,8,0.6)  35%,
                rgba(11,10,8,0.15) 60%,
                transparent 75%
              )
            `,
          }}
        />

        {/* ── Noise overlay ── */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '128px 128px',
            mixBlendMode: 'overlay',
          }}
        />

        {/* ── Vignette edges ── */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, rgba(11,10,8,0.7) 100%)',
          }}
        />


        {/* ── Hero Text ── */}
        <motion.div
          className="relative z-10 text-center px-6 select-none"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          {/* Brand title — Venn logo split: CONN | 3 | CTIVITY */}
          <div
            className="mb-6 flex items-center justify-center flex-wrap"
            style={{
              fontFamily: "'Josefin Sans', sans-serif",
              fontWeight: 100,
              fontSize: 'clamp(1.55rem, 7vw, 7.5rem)',
              letterSpacing: 'clamp(0.05em, 0.9vw, 0.28em)',
              textTransform: 'uppercase',
              color: '#EDE8DC',
              perspective: '800px',
              lineHeight: 1,
              gap: 'clamp(0.2rem, 1vw, 1rem)',
              width: '100%',
              maxWidth: '100%',
            }}
          >
            {/* Left segment: CONN */}
            <span style={{ display: 'inline-flex' }}>
              {'CONN'.split('').map((char, i) => (
                <AnimatedLetter key={i} char={char} index={i} />
              ))}
            </span>

            {/* Center intersection: 3 (gold, clickable) */}
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.5, rotateY: -90 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 1, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={onThreeClick}
              aria-label="Open Conn3ctivity game"
              style={{
                color: '#C9A96E',
                textShadow: '0 0 50px rgba(201,169,110,0.8), 0 0 100px rgba(201,169,110,0.3)',
                cursor: 'pointer',
                display: 'inline-block',
                transformOrigin: '50% 50%',
                padding: '0 0.05em',
                background: 'none',
                border: 'none',
                font: 'inherit',
              }}
              whileHover={{ scale: 1.15, textShadow: '0 0 80px rgba(201,169,110,1)' }}
            >
              3
            </motion.button>

            {/* Right segment: CTIVITY */}
            <span style={{ display: 'inline-flex' }}>
              {'CTIVITY'.split('').map((char, i) => (
                <AnimatedLetter key={i} char={char} index={i + 5} />
              ))}
            </span>
          </div>

          {/* Motto */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="flex items-center justify-center gap-4 mb-10 flex-wrap"
          >
            {tagWords.map((word, i) => (
              <span key={word} className="flex items-center gap-4">
                <span style={{
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontWeight: 200,
                  fontSize: 'clamp(0.75rem, 2vw, 1.1rem)',
                  letterSpacing: '0.35em',
                  color: i === 2 ? '#C9A96E' : 'rgba(237,232,220,0.5)',
                  textTransform: 'uppercase',
                  textShadow: i === 2 ? '0 0 30px rgba(201,169,110,0.5)' : 'none',
                }}>
                  {word}
                </span>
                {i < tagWords.length - 1 && (
                  <span style={{ color: 'rgba(201,169,110,0.3)', fontSize: '0.7rem' }}>✦</span>
                )}
              </span>
            ))}
          </motion.div>

          {/* Subline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            style={{
              fontFamily: "'Josefin Sans', sans-serif",
              fontWeight: 300,
              fontSize: 'clamp(0.75rem, 1.5vw, 0.95rem)',
              letterSpacing: '0.1em',
              color: 'rgba(237,232,220,0.38)',
              maxWidth: '38ch',
              margin: '0 auto 2rem',
              lineHeight: 1.9,
            }}
          >
            We find projects. We build bridges. We grow communities.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="flex items-center justify-center gap-4 flex-wrap mb-8"
          >
            <motion.a
              href="#map"
              whileHover={{
                scale: 1.04,
                boxShadow: '0 0 40px rgba(201,169,110,0.35)',
              }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.85rem 2.2rem',
                background: 'rgba(201,169,110,1)',
                color: '#0B0A08',
                fontFamily: "'Josefin Sans', sans-serif",
                fontWeight: 600,
                fontSize: '0.7rem',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                borderRadius: '3px',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
              }}
            >
              EXPLORE THE MAP
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </motion.a>

            <motion.a
              href="#connect"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.85rem 2.2rem',
                background: 'transparent',
                color: 'rgba(237,232,220,0.7)',
                fontFamily: "'Josefin Sans', sans-serif",
                fontWeight: 300,
                fontSize: '0.7rem',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                borderRadius: '3px',
                border: '1px solid rgba(237,232,220,0.18)',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(8px)',
              }}
            >
              REQUEST ACCESS
            </motion.a>
          </motion.div>

          {/* Quiet live pulse — secondary to brand */}
          <HeroLiveBar />
        </motion.div>

        <ScrollCue />
      </section>
    </>
  )
}
