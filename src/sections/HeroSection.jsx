import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { VennAtmosphere } from '../components/VennAtmosphere'
import { DiscordPrism } from '../components/DiscordPrism'
import { CryptoRadar } from '../components/CryptoRadar'
import { SITE_DATA } from '../data/siteData'
import { useCountUp } from '../hooks/useCountUp'
import { sql } from '../lib/neon'
import serverInsights from '../data/serverInsights.json'

// ─── Scroll Progress Bar ──────────────────────────────────────────────────────
function ScrollProgressBar({ progress }) {
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] z-[100] origin-left"
      style={{
        scaleX: progress,
        background: 'linear-gradient(90deg, #C9A96E, #EDE8DC, #a855f7)',
      }}
    />
  )
}

// ─── Animated Letter ──────────────────────────────────────────────────────────
function AnimatedLetter({ char, index, total, onThreeClick }) {
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
      {char === '3' ? (
        <span 
          onClick={onThreeClick}
          style={{ 
            color: '#C9A96E', 
            textShadow: '0 0 40px rgba(201,169,110,0.7)',
            cursor: 'pointer' 
          }}
          className="hover:text-white transition-colors"
        >
          {char}
        </span>
      ) : char === ' ' ? '\u00A0' : char}
    </motion.span>
  )
}

// ─── Live Scroll Frame Counter ────────────────────────────────────────────────
function ScrollFrameCounter({ scrollY }) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const update = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const progress = Math.min(1, scrollY.current / Math.max(1, maxScroll))
      setFrame(Math.round(progress * 999))
    }
    window.addEventListener('scroll', update)
    return () => window.removeEventListener('scroll', update)
  }, [scrollY])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2 }}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-1"
    >
      <div style={{
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: '0.55rem',
        letterSpacing: '0.3em',
        color: 'rgba(201,169,110,0.4)',
        textTransform: 'uppercase',
      }}>FRAME</div>
      <div style={{
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: '1.1rem',
        fontWeight: 200,
        letterSpacing: '0.15em',
        color: 'rgba(201,169,110,0.6)',
        lineHeight: 1,
      }}>
        {String(frame).padStart(3, '0')}
      </div>
    </motion.div>
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
  const [stats, setStats] = useState(serverInsights)
  const [live, setLive]   = useState(false)

  useEffect(() => {
    async function fetch() {
      try {
        const rows = await sql`SELECT approximate_presence_count, conn3ctor_count, total_members FROM server_stats ORDER BY updated_at DESC LIMIT 1`
        if (rows.length) { setStats(rows[0]); setLive(true) }
      } catch {}
    }
    fetch()
    const id = setInterval(fetch, 10000)
    return () => clearInterval(id)
  }, [])

  const online     = useCountUp(stats?.approximate_presence_count ?? 0, 1800)
  const conn3ctors = useCountUp(stats?.conn3ctor_count            ?? 0, 2000)
  const total      = useCountUp(stats?.total_members              ?? 0, 2200)

  const items = [
    { label: 'Online',      value: online,     color: '#22c55e' },
    { label: 'Conn3ctors',  value: conn3ctors, color: '#C9A96E' },
    { label: 'Members',     value: total,      color: 'rgba(237,232,220,0.6)' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.3, duration: 0.8 }}
      className="flex items-center justify-center gap-0 mb-10 overflow-hidden rounded-full"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        width: 'fit-content',
        margin: '0 auto 2.5rem',
      }}
    >
      {/* Live dot */}
      <div className="flex items-center gap-2 pl-4 pr-3 border-r border-white/5">
        <span className="relative flex h-1.5 w-1.5">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70"
            style={{ background: live ? '#22c55e' : '#C9A96E' }}
          />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: live ? '#22c55e' : '#C9A96E' }} />
        </span>
        <span
          className="font-['Josefin_Sans'] text-[0.42rem] tracking-[0.3em] uppercase"
          style={{ color: live ? '#22c55e' : '#C9A96E' }}
        >
          {live ? 'Live' : 'Cache'}
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
  const scrollY = useRef(0)
  const containerRef = useRef(null)

  const { scrollYProgress } = useScroll()
  const smoothProgress = useSpring(scrollYProgress, { damping: 30, stiffness: 100 })

  // Track raw scrollY in a ref for Three.js (avoids React re-renders)
  useEffect(() => {
    const onScroll = () => { scrollY.current = window.scrollY }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const tagWords = ['SEARCH', 'FIND', 'CONN3CT']

  // Parallax transforms on scroll
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -120])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0])
  const canvasScale = useTransform(scrollYProgress, [0, 0.4], [1, 1.12])

  return (
    <>
      <ScrollProgressBar progress={smoothProgress} />
      <ScrollFrameCounter scrollY={scrollY} />

      <section
        id="home"
        ref={containerRef}
        className="relative min-h-screen overflow-hidden flex items-center justify-center"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 50% -10%, rgba(201,169,110,0.12) 0%, transparent 55%),
            radial-gradient(ellipse 80% 60% at 80% 60%, rgba(168,85,247,0.07) 0%, transparent 50%),
            radial-gradient(ellipse 60% 50% at 20% 80%, rgba(0,212,255,0.06) 0%, transparent 50%),
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
          {/* Pre-badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="inline-flex items-center gap-3 mb-8 px-5 py-2 rounded-full"
            style={{
              background: 'rgba(201,169,110,0.08)',
              border: '1px solid rgba(201,169,110,0.2)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: '#C9A96E',
                boxShadow: '0 0 8px 2px rgba(201,169,110,0.6)',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
            <span style={{
              fontFamily: "'Josefin Sans', sans-serif",
              fontSize: '0.6rem',
              letterSpacing: '0.4em',
              color: 'rgba(201,169,110,0.85)',
              textTransform: 'uppercase',
            }}>
              The Web3 Connection Layer
            </span>
          </motion.div>

          {/* Brand title — Venn logo split: CONN | 3 | CTIVITY */}
          <div
            className="mb-6 flex items-center justify-center"
            style={{
              fontFamily: "'Josefin Sans', sans-serif",
              fontWeight: 100,
              fontSize: 'clamp(2.8rem, 10vw, 9rem)',
              letterSpacing: 'clamp(0.15em, 1.5vw, 0.45em)',
              textTransform: 'uppercase',
              color: '#EDE8DC',
              perspective: '800px',
              lineHeight: 1,
              gap: 'clamp(0.4rem, 1.5vw, 1.2rem)',
            }}
          >
            {/* Left segment: CONN */}
            <span style={{ display: 'inline-flex' }}>
              {'CONN'.split('').map((char, i) => (
                <AnimatedLetter key={i} char={char} index={i} total={12} />
              ))}
            </span>

            {/* Center intersection: 3 (gold, clickable) */}
            <motion.span
              initial={{ opacity: 0, scale: 0.5, rotateY: -90 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 1, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={onThreeClick}
              style={{
                color: '#C9A96E',
                textShadow: '0 0 50px rgba(201,169,110,0.8), 0 0 100px rgba(201,169,110,0.3)',
                cursor: 'pointer',
                display: 'inline-block',
                transformOrigin: '50% 50%',
                padding: '0 0.05em',
              }}
              whileHover={{ scale: 1.15, textShadow: '0 0 80px rgba(201,169,110,1)' }}
            >
              3
            </motion.span>

            {/* Right segment: CTIVITY */}
            <span style={{ display: 'inline-flex' }}>
              {'CTIVITY'.split('').map((char, i) => (
                <AnimatedLetter key={i} char={char} index={i + 5} total={12} />
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

          {/* Live stats bar */}
          <HeroLiveBar />

          {/* Subline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.8 }}
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
            transition={{ delay: 1.8, duration: 0.8 }}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            <motion.a
              href="#about"
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
              EXPLORE THE NETWORK
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </motion.a>

            <motion.a
              href={SITE_DATA.twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
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
              <XIcon size={12} />
              conn3ctivity_
            </motion.a>
          </motion.div>
        </motion.div>

        {/* ── 3D Market Radar (BTC, ETH, SOL) ── */}
        <CryptoRadar />

        {/* ── 3D Discord Server Insights Prism ── */}
        <DiscordPrism />

        <ScrollCue />
      </section>
    </>
  )
}

function XIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
