import { useState, useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { useDeviceCapability } from './hooks/useDeviceCapability'
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
import { supabase } from './lib/supabase'
import { HoneypotTarpit } from './components/HoneypotTarpit'
import { useSoundEffects } from './hooks/useSoundEffects'


export default function App() {
  const [navVisible, setNavVisible] = useState(true)
  const [gameOpen, setGameOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [discordUser, setDiscordUser] = useState(null)
  const device = useDeviceCapability()
  const lenisRef = useRef(null)
  const { playHover, playClick } = useSoundEffects()

  // Global Sound Event Listeners
  useEffect(() => {
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
  }, [playHover, playClick])

  // Auth Handler: Supabase Auth (Secure) OR Discord Implicit Flow (Fallback)
  useEffect(() => {
    if (supabase) {
      // 1. Supabase Auth Flow
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setDiscordUser({
            id: session.user.id,
            username: session.user.user_metadata.custom_claims?.global_name || session.user.user_metadata.name || session.user.user_metadata.full_name,
            avatar_url: session.user.user_metadata.avatar_url
          });
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setDiscordUser({
            id: session.user.id, // We use Supabase user ID here for RLS
            username: session.user.user_metadata.custom_claims?.global_name || session.user.user_metadata.name || session.user.user_metadata.full_name,
            avatar_url: session.user.user_metadata.avatar_url
          });
        } else {
          setDiscordUser(null);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      // 2. Custom Fallback Flow
      const fetchDiscordUser = async (token) => {
        try {
          const res = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const user = await res.json();
            setDiscordUser(user);
          } else {
            localStorage.removeItem('discord_token');
          }
        } catch (err) {
          console.error("Failed to fetch Discord user", err);
        }
      };

      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('access_token');
        if (token) {
          localStorage.setItem('discord_token', token);
          window.history.replaceState(null, null, window.location.pathname + window.location.search);
          fetchDiscordUser(token);
        }
      } else {
        const storedToken = localStorage.getItem('discord_token');
        if (storedToken) {
          fetchDiscordUser(storedToken);
        }
      }
    }
  }, []);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
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

  // --- CRAZY ASS SECURITY SYSTEM (HONEYPOT & SHUTDOWN) ---
  const path = window.location.pathname.toLowerCase()
  const isHackAttempt = ['/wp-admin', '/phpmyadmin', '/.env', '/config.json', '/shell.php', '/backup.zip', '/database.sql'].some(p => path.includes(p))
  const isRebooting = parseInt(localStorage.getItem('tarpit_timeout') || '0', 10) > Date.now()

  if (isRebooting) {
    return <HoneypotTarpit state="rebooting" />
  }

  if (isHackAttempt) {
    return <HoneypotTarpit state="breach" />
  }

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--void)' }}>
      <CursorGlow />
      <Navbar 
        visible={navVisible} 
        user={discordUser}
        onLogout={handleLogout}
        onProfileClick={() => setProfileOpen(true)}
      />

      <GlobalMascots />

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
