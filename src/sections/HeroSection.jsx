import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { VennAtmosphere } from '../components/VennAtmosphere'
import { SITE_DATA } from '../data/siteData'

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
function AnimatedLetter({ char, index, total }) {
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
        <span style={{ color: '#C9A96E', textShadow: '0 0 40px rgba(201,169,110,0.7)' }}>{char}</span>
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

// ─── Hero Section ─────────────────────────────────────────────────────────────
export function HeroSection() {
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

  const brand = 'CONN3CTIVITY'
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

          {/* Brand title */}
          <div
            className="mb-6 overflow-hidden"
            style={{
              fontFamily: "'Josefin Sans', sans-serif",
              fontWeight: 100,
              fontSize: 'clamp(2.8rem, 10vw, 9rem)',
              letterSpacing: 'clamp(0.15em, 1.5vw, 0.45em)',
              textTransform: 'uppercase',
              color: '#EDE8DC',
              perspective: '800px',
              lineHeight: 1,
            }}
          >
            {brand.split('').map((char, i) => (
              <AnimatedLetter key={i} char={char} index={i} total={brand.length} />
            ))}
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
              margin: '0 auto 2.5rem',
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

        {/* ── Stats strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.9, duration: 0.8 }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 hidden md:flex items-center gap-10"
        >
          {[
            { val: '9+', label: 'Partners' },
            { val: '10', label: 'Team' },
            { val: '∞', label: 'Connections' },
          ].map(({ val, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span style={{
                fontFamily: "'Josefin Sans', sans-serif",
                fontWeight: 200,
                fontSize: '1.6rem',
                letterSpacing: '0.08em',
                color: '#C9A96E',
                lineHeight: 1,
              }}>{val}</span>
              <span style={{
                fontFamily: "'Josefin Sans', sans-serif",
                fontWeight: 300,
                fontSize: '0.55rem',
                letterSpacing: '0.35em',
                color: 'rgba(237,232,220,0.3)',
                textTransform: 'uppercase',
              }}>{label}</span>
            </div>
          ))}
        </motion.div>

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
