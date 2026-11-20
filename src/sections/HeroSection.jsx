import { useRef } from 'react'
import { motion, MotionConfig, useScroll, useTransform } from 'framer-motion'
import { GoldPrism } from '../components/three/GoldPrism'
import { HandshakeConnect } from '../components/HandshakeConnect'
import { luxuryEase } from '../lib/motion'
import { useCountUp } from '../hooks/useCountUp'
import { fetchStats, statusLabel, statusColor } from '../lib/api'
import { useLiveQuery } from '../hooks/useLiveQuery'
import serverInsights from '../data/serverInsights.json'

// ─── Animated Letter ──────────────────────────────────────────────────────────
function AnimatedLetter({ char, index }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 72, rotateX: -88, filter: 'blur(14px)' }}
      animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
      transition={{
        duration: 1.05,
        delay: 0.12 + index * 0.05,
        ease: luxuryEase,
      }}
      style={{ display: 'inline-block', transformOrigin: '50% 100%' }}
    >
      {char === ' ' ? '\u00A0' : char}
    </motion.span>
  )
}

function CinematicField() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="cinematic-aurora cinematic-aurora-a" />
      <div className="cinematic-aurora cinematic-aurora-b" />
      <div className="cinematic-ray cinematic-ray-1" />
      <div className="cinematic-ray cinematic-ray-2" />
      <div className="cinematic-ray cinematic-ray-3" />
    </div>
  )
}

// ─── Scroll Cue ───────────────────────────────────────────────────────────────
// DESIGN CHANGE (PR #2, decisive pass): this is no longer thin gold text on
// the black hero. Three live-preview rounds all saw the old cue as faint
// dark olive-grey even though its colour really was solid #C9A96E at
// weight 600 with no fade — and the real cause was stacking, not colour:
// this element had NO z-index, while the hero's bottom fade mask is
// z-[1] and the clear-zone/vignette overlays are z-[2]. The mask is 140px
// tall and solid #0B0A08 for its bottom 28px, fading up; the cue sits at
// bottom-4, right inside it, so it was painted UNDER ~80%-opaque black.
// Gold at 20% over black is exactly the dull olive-brown the live checks
// saw. So the cue is now a solid gold pill (bright #E8C878 background,
// near-black #0B0A08 text, weight 800) on z-20, above every hero overlay,
// with a solid gold chevron. Text on a solid contrasting surface cannot
// read faint: the pill's contrast is ~11:1, measured from rendered pixels
// in headless Chrome, not from a CSS colour-pair ratio.
function ScrollCue() {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
      <span style={{
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: '0.95rem',
        fontWeight: 800,
        letterSpacing: '0.22em',
        color: '#0B0A08',
        background: '#E8C878',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        padding: '10px 20px 9px 23px',
        borderRadius: 999,
        boxShadow: '0 0 0 1px rgba(232,200,120,0.95), 0 0 28px rgba(232,200,120,0.45), 0 6px 18px rgba(0,0,0,0.6)',
      }}>SCROLL TO EXPLORE</span>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
          <path d="M1 1l8 8 8-8" stroke="#E8C878" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
    </div>
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

  const tagWords = ['SEARCH', 'FIND', 'CONN3CT']

  // Parallax stays bounded: heroY clamps at -120px and the canvas scale at
  // 1.12, so the hero can never drift or blow up on long pages.
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -120])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0])
  const canvasScale = useTransform(scrollYProgress, [0, 0.4], [1, 1.12])

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="home"
        ref={containerRef}
        className="relative min-h-screen overflow-hidden flex items-center justify-center pb-24"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 50% -10%, rgba(201,169,110,0.12) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 85% 70%, rgba(237,232,220,0.04) 0%, transparent 50%),
            #0B0A08
          `,
        }}
      >
        <motion.div className="absolute inset-0 z-0" style={{ scale: canvasScale }}>
          <CinematicField />
        </motion.div>

        <motion.div
          className="pointer-events-none absolute left-[2%] top-[18%] z-[1] hidden h-[min(36vw,320px)] w-[min(36vw,320px)] opacity-90 xl:block"
          style={{ scale: canvasScale }}
          aria-hidden="true"
        >
          <GoldPrism className="h-full w-full" />
        </motion.div>

        {/* ── Hero mascots — in-section, above the hero background.
            The fixed GlobalMascots layer sits behind <main> (z-10), so the
            hero's opaque background hides it here; these two flank the
            stats bar at the bottom corners so the mascots are actually
            visible in the hero, as planned. ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.9, duration: 0.9, ease: luxuryEase }}
          className="pointer-events-none absolute bottom-[6%] left-[2%] z-[3] hidden w-[min(18vw,240px)] xl:block"
          aria-hidden="true"
        >
          <motion.img
            src="/mascot-gm-transparent.png"
            alt=""
            className="h-auto w-full"
            style={{ filter: 'drop-shadow(0 0 34px rgba(201,169,110,0.32)) drop-shadow(0 16px 30px rgba(0,0,0,0.35))' }}
            animate={{ y: [-8, 8] }}
            transition={{ duration: 6.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0, duration: 0.9, ease: luxuryEase }}
          className="pointer-events-none absolute bottom-[6%] right-[2%] z-[3] hidden w-[min(15vw,200px)] xl:block"
          aria-hidden="true"
        >
          <motion.img
            src="/mascot-cm-transparent.png"
            alt=""
            className="h-auto w-full"
            style={{ filter: 'drop-shadow(0 0 34px rgba(201,169,110,0.32)) drop-shadow(0 16px 30px rgba(0,0,0,0.35))' }}
            animate={{ y: [8, -8] }}
            transition={{ duration: 7.1, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          />
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
              radial-gradient(ellipse 55% 50% at 50% 42%,
                rgba(11,10,8,0.78) 0%,
                rgba(11,10,8,0.45)  40%,
                transparent 72%
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
            className="mb-6 flex items-center justify-center flex-nowrap"
            style={{
              fontFamily: "'Josefin Sans', sans-serif",
              fontWeight: 100,
              fontSize: 'clamp(1.35rem, 7vw, 7.5rem)',
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
              initial={{ opacity: 0, scale: 0.5, rotateY: -90, filter: 'blur(12px)' }}
              animate={{ opacity: 1, scale: 1, rotateY: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.1, delay: 0.28, ease: luxuryEase }}
              onClick={onThreeClick}
              aria-label="Open Conn3ctivity game"
              style={{
                color: '#C9A96E',
                textShadow: '0 0 28px rgba(201,169,110,0.35)',
                cursor: 'pointer',
                display: 'inline-block',
                transformOrigin: '50% 50%',
                padding: '0 0.05em',
                background: 'none',
                border: 'none',
                font: 'inherit',
              }}
              whileHover={{ scale: 1.08, textShadow: '0 0 40px rgba(201,169,110,0.55)' }}
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
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.95, duration: 0.9, ease: luxuryEase }}
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

          <HandshakeConnect />

          {/* Subline */}
          <motion.p
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 1.25, duration: 0.9, ease: luxuryEase }}
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
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 1.55, duration: 0.9, ease: luxuryEase }}
            className="flex items-center justify-center gap-4 flex-wrap mb-8"
          >
            <motion.a
              href="#map"
              className="gold-sheen w-full max-w-[320px] justify-center sm:w-auto"
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
              className="w-full max-w-[320px] justify-center sm:w-auto"
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
    </MotionConfig>
  )
}
