import { useState, useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { useDeviceCapability } from './hooks/useDeviceCapability'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { HeroSection } from './sections/HeroSection'
import { AboutSection } from './sections/AboutSection'
import { PartnershipsSection } from './sections/PartnershipsSection'
import { TeamSection } from './sections/TeamSection'
import { GoalsSection } from './sections/GoalsSection'
import { MapSection } from './sections/MapSection'
import { GlobalMascots } from './components/GlobalMascots'
import { MascotTicTacToe } from './components/MascotTicTacToe'
import { CursorGlow } from './components/CursorGlow'
import { Analytics } from '@vercel/analytics/react'


export default function App() {
  const [navVisible, setNavVisible] = useState(true)
  const [gameOpen, setGameOpen] = useState(false)
  const device = useDeviceCapability()
  const lenisRef = useRef(null)

  useEffect(() => {
    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: device.isMobile ? 1.0 : 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: !device.isMobile,
      touchMultiplier: 1.5,
    })

    lenisRef.current = lenis

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [device.isMobile])

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--void)' }}>
      <CursorGlow />
      <Navbar visible={navVisible} onThreeClick={() => setGameOpen(true)} />

      <GlobalMascots />

      <MascotTicTacToe isOpen={gameOpen} onClose={() => setGameOpen(false)} />

      <main className="relative z-10">
        <HeroSection />
        <div>
          <AboutSection />
          <div className="section-divider mx-8" />
          <PartnershipsSection />
          <div className="section-divider mx-8" />
          <TeamSection />
          <div className="section-divider mx-8" />
          <MapSection />
          <div className="section-divider mx-8" />
          <GoalsSection />
        </div>
      </main>

      <Footer />
      <Analytics />
    </div>
  )
}
