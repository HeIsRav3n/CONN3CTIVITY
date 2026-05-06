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
  const [discordUser, setDiscordUser] = useState(null)
  const device = useDeviceCapability()
  const lenisRef = useRef(null)

  // Discord OAuth2 Implicit Flow Handler
  useEffect(() => {
    const fetchDiscordUser = async (token) => {
      try {
        const res = await fetch('https://discord.com/api/users/@me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const user = await res.json();
          setDiscordUser(user);
        } else {
          // Token invalid or expired
          localStorage.removeItem('discord_token');
        }
      } catch (err) {
        console.error("Failed to fetch Discord user", err);
      }
    };

    // 1. Check URL for token (Redirected from Discord)
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        localStorage.setItem('discord_token', token);
        // Clear the hash securely without refreshing
        window.history.replaceState(null, null, window.location.pathname + window.location.search);
        fetchDiscordUser(token);
      }
    } else {
      // 2. Check local storage for existing session
      const storedToken = localStorage.getItem('discord_token');
      if (storedToken) {
        fetchDiscordUser(storedToken);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('discord_token');
    setDiscordUser(null);
  };

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
      <Navbar 
        visible={navVisible} 
        onThreeClick={() => setGameOpen(true)} 
        user={discordUser}
        onLogout={handleLogout}
      />

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
