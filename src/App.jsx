import { useState, useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { motion, useScroll, useSpring } from 'framer-motion'
import { useDeviceCapability } from './hooks/useDeviceCapability'
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { HeroSection } from './sections/HeroSection'
import { AboutSection } from './sections/AboutSection'
import { MVCSection } from './sections/MVCSection'
import { PartnershipsSection } from './sections/PartnershipsSection'
import { TeamSection } from './sections/TeamSection'
import { GoalsSection } from './sections/GoalsSection'
import { MapSection } from './sections/MapSection'
import { DetectivitySection } from './sections/DetectivitySection'
import { GlobalMascots } from './components/GlobalMascots'
import { MascotTicTacToe } from './components/MascotTicTacToe'
import { CursorGlow } from './components/CursorGlow'
import { ProfileModal } from './components/ProfileModal'
import { Analytics } from '@vercel/analytics/react'
import { supabase, userFromSession } from './lib/supabase'
import { HoneypotTarpit } from './components/HoneypotTarpit'
import { useSoundEffects } from './hooks/useSoundEffects'
import { useWelcomeSound } from './hooks/useWelcomeSound'

// Page scroll progress bar — app level, not tied to the hero, so it stays
// mounted and accurate across every section.
function ScrollProgressBar({ progress }) {
  return (
    <motion.div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-[2px] z-[100] origin-left"
      style={{
        scaleX: progress,
        background: 'linear-gradient(90deg, #C9A96E, #EDE8DC)',
      }}
    />
  )
}


export default function App() {
  // Remove the HTML loading skeleton once React has mounted
  useEffect(() => {
    const el = document.getElementById('app-loading')
    if (el) el.style.opacity = '0'
    const t = setTimeout(() => { if (el) el.remove() }, 400)
    return () => clearTimeout(t)
  }, [])

  const [gameOpen, setGameOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [discordUser, setDiscordUser] = useState(null)
  const device = useDeviceCapability()
  const reducedMotion = usePrefersReducedMotion()
  const lenisRef = useRef(null)
  const { playHover, playClick } = useSoundEffects()
  useWelcomeSound({ enabled: !reducedMotion })

  const { scrollYProgress } = useScroll()
  const smoothProgress = useSpring(scrollYProgress, { damping: 30, stiffness: 100 })

  // Global Sound Event Listeners
  useEffect(() => {
    if (reducedMotion) return undefined

    const handleMouseOver = (e) => {
      if (e.target.closest('a, button, [role="button"]')) {
        playHover()
      }
    }
    const handleClick = (e) => {
      if (e.target.closest('a, button, [role="button"]')) {
        playClick()
      }
    }

    document.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('click', handleClick)
    }
  }, [playHover, playClick, reducedMotion])

  // Auth — Supabase Discord OAuth only
  useEffect(() => {
    if (!supabase) return undefined

    const applySession = (session) => {
      setDiscordUser(userFromSession(session))
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('[auth] getSession', error.message)
      applySession(data?.session)
      const params = new URLSearchParams(window.location.search)
      if (params.has('code') || params.has('error')) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.hash)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setDiscordUser(null);
  };

  useEffect(() => {
    if (reducedMotion || device.isMobile) return undefined

    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 1.5,
    })

    lenisRef.current = lenis

    let rafId = 0
    function raf(time) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [device.isMobile, reducedMotion])

  // --- CRAZY ASS SECURITY SYSTEM (HONEYPOT & SHUTDOWN) ---
  const path = window.location.pathname.toLowerCase()
  const isHackAttempt = ['/wp-admin', '/phpmyadmin', '/.env', '/config.json', '/shell.php', '/backup.zip', '/database.sql'].some(p => path.includes(p))
  let tarpitUntil = 0
  try {
    tarpitUntil = parseInt(localStorage.getItem('tarpit_timeout') || '0', 10) || 0
  } catch { /* private mode */ }
  const isRebooting = tarpitUntil > Date.now()

  if (isRebooting) {
    return <HoneypotTarpit state="rebooting" />
  }

  if (isHackAttempt) {
    return <HoneypotTarpit state="breach" />
  }

  const showAmbientFx = !reducedMotion && !device.isMobile

  return (
    <div className="relative min-h-screen overflow-x-clip w-full" style={{ background: 'var(--void)' }}>
      <ScrollProgressBar progress={smoothProgress} />
      {showAmbientFx && <CursorGlow />}
      <Navbar
        user={discordUser}
        onLogout={handleLogout}
        onProfileClick={() => setProfileOpen(true)}
      />

      {showAmbientFx && <GlobalMascots />}

      <MascotTicTacToe isOpen={gameOpen} onClose={() => setGameOpen(false)} user={discordUser} />
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} user={discordUser} />

      <main className="relative z-10">
        <HeroSection onThreeClick={() => setGameOpen(true)} />
        <div>
          <AboutSection />
          <div className="section-divider mx-8" />
          <MVCSection />
          <div className="section-divider mx-8" />
          <PartnershipsSection />
          <div className="section-divider mx-8" />
          <TeamSection />
          <div className="section-divider mx-8" />
          <MapSection />
          <div className="section-divider mx-8" />
          <DetectivitySection />
          <div className="section-divider mx-8" />
          <GoalsSection />
        </div>
      </main>

      <Footer />
      <Analytics />
    </div>
  )
}
