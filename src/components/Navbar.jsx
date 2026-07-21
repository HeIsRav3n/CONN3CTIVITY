import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { SITE_DATA } from '../data/siteData'
import { supabase } from '../lib/supabase'

// Mini Venn logo for navbar — 3D tilt on hover
function NavLogo() {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { damping: 20, stiffness: 200 })
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { damping: 20, stiffness: 200 })
  const [clicked, setClicked] = useState(false)

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  const handleMouseLeave = () => { x.set(0); y.set(0) }

  const handleThreeClick = () => {
    setClicked(true)
    setTimeout(() => setClicked(false), 600)
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: '600px' }}
    >
      <svg viewBox="0 0 300 70" width="120" height="28" fill="none" aria-label="CONN3CTIVITY">
        {/* Left circle */}
        <circle cx="118" cy="35" r="42" stroke="rgba(237,232,220,0.50)" strokeWidth="1.1" />
        {/* Right circle */}
        <circle cx="182" cy="35" r="42" stroke="rgba(237,232,220,0.50)" strokeWidth="1.1" />
        {/* CONN */}
        <text x="140" y="39"
          fontFamily="'Josefin Sans', sans-serif"
          fontWeight="200" fontSize="11" letterSpacing="2"
          fill="rgba(237,232,220,0.85)" textAnchor="end"
        >CONN</text>

        {/* Pulse ring behind "3" */}
        <circle
          cx="150" cy="35" r="10"
          fill="rgba(201,169,110,0.06)"
          stroke="rgba(201,169,110,0.35)"
          strokeWidth="0.8"
        >
          <animate attributeName="r" values="9;13;9" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" />
        </circle>

        {/* Click ripple */}
        {clicked && (
          <circle cx="150" cy="35" r="18" fill="none" stroke="rgba(201,169,110,0.5)" strokeWidth="1.5">
            <animate attributeName="r" from="8" to="22" dur="0.5s" fill="freeze" />
            <animate attributeName="opacity" from="1" to="0" dur="0.5s" fill="freeze" />
          </circle>
        )}

        {/* "3" — clickable intersection accent */}
        <text
          x="150" y="40"
          fontFamily="'Josefin Sans', sans-serif"
          fontWeight="300" fontSize="15"
          fill="#C9A96E"
          textAnchor="middle"
          onClick={handleThreeClick}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >3</text>

        {/* Invisible larger hit area for the "3" */}
        <rect
          x="138" y="24" width="24" height="22"
          fill="transparent"
          onClick={handleThreeClick}
          style={{ cursor: 'pointer' }}
        />

        {/* CTIVITY */}
        <text x="160" y="39"
          fontFamily="'Josefin Sans', sans-serif"
          fontWeight="200" fontSize="11" letterSpacing="2"
          fill="rgba(237,232,220,0.85)" textAnchor="start"
        >CTIVITY</text>
      </svg>
    </motion.div>
  )
}

export function Navbar({ user, onLogout, onProfileClick }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Track active section via IntersectionObserver
  useEffect(() => {
    const sections = ['home', 'about', 'mvc-spotlight', 'partnerships', 'team', 'map', 'detectivity', 'connect']
    const observers = sections.map((id) => {
      const el = document.getElementById(id)
      if (!el) return null
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id) },
        { threshold: 0.3 }
      )
      obs.observe(el)
      return obs
    })
    return () => observers.forEach((o) => o?.disconnect())
  }, [])

  const navLinks = [
    { label: 'Home',         href: '#home',         id: 'home' },
    { label: 'About',        href: '#about',         id: 'about' },
    { label: 'Partnerships', href: '#partnerships',  id: 'partnerships' },
    { label: 'Team',         href: '#team',          id: 'team' },
    { label: 'Map',          href: '#map',           id: 'map' },
    { label: 'Connect',      href: '#connect',       id: 'connect' },
  ]

  const getSectionLink = (sectionId) => {
    const map = { 'mvc-spotlight': 'about', 'detectivity': 'connect' }
    return map[sectionId] || sectionId
  }

  return (
    <motion.nav
      id="navbar"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: scrolled
          ? 'rgba(11,10,8,0.88)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(28px) saturate(1.4)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(28px) saturate(1.4)' : 'none',
        borderBottom: scrolled
          ? '1px solid rgba(201,169,110,0.12)'
          : 'none',
        boxShadow: scrolled
          ? '0 1px 0 0 rgba(201,169,110,0.06), 0 8px 32px rgba(0,0,0,0.3)'
          : 'none',
        transition: 'all 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
          {/* Gold top accent line — appears on scroll */}
          <motion.div
            animate={{ scaleX: scrolled ? 1 : 0, opacity: scrolled ? 1 : 0 }}
            transition={{ duration: 0.5 }}
            className="absolute top-0 left-0 right-0 h-[1px] origin-left"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.5) 40%, rgba(237,232,220,0.6) 50%, rgba(201,169,110,0.5) 60%, transparent)' }}
          />

          <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
            {/* Logo */}
            <motion.a
              href="#home"
              whileHover={{ opacity: 0.85 }}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <NavLogo />
            </motion.a>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-10">
              {navLinks.map((link) => {
                const isActive = getSectionLink(activeSection) === link.id
                return (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    style={{
                      fontFamily: "'Josefin Sans', sans-serif",
                      fontWeight: 300,
                      fontSize: '0.72rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: isActive
                        ? 'rgba(201,169,110,0.95)'
                        : 'rgba(237,232,220,0.5)',
                      position: 'relative',
                      paddingBottom: '2px',
                      transition: 'color 0.3s ease',
                    }}
                    whileHover={{
                      color: 'rgba(237,232,220,1)',
                      y: -1,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {link.label}
                    {/* Active underline */}
                    <motion.span
                      animate={{ scaleX: isActive ? 1 : 0, opacity: isActive ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        left: 0,
                        right: 0,
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, #C9A96E, transparent)',
                        transformOrigin: 'center',
                        display: 'block',
                      }}
                    />
                  </motion.a>
                )
              })}
            </div>

            {/* CTA buttons */}
            <div className="flex items-center gap-3">
              {/* X handle */}
              <motion.a
                href={SITE_DATA.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="twitter-handle-link"
                className="hidden md:flex items-center gap-2"
                style={{
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontWeight: 300,
                  fontSize: '0.65rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(237,232,220,0.45)',
                  border: '1px solid rgba(237,232,220,0.12)',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '2px',
                }}
                whileHover={{ color: 'rgba(237,232,220,0.85)', borderColor: 'rgba(237,232,220,0.3)' }}
              >
                <XIcon size={10} />
                conn3ctivity_
              </motion.a>

              {/* Discord Auth UI */}
              {user ? (
                <div className="hidden md:flex items-center gap-3 ml-2">
                  <div 
                    onClick={onProfileClick}
                    className="flex items-center gap-2 px-2 py-1 bg-white/5 border border-white/10 rounded-full cursor-pointer hover:bg-white/10 hover:border-[#C9A96E]/50 transition-colors"
                  >
                    <img 
                      src={user.avatar_url || `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} 
                      alt={user.username}
                      className="w-6 h-6 rounded-full border border-gold/50 object-cover"
                    />
                    <span className="text-[0.65rem] font-space text-cream/80 pr-2">{user.username}</span>
                  </div>
                  <button 
                    onClick={onLogout}
                    className="text-[0.6rem] font-orbitron text-cream/40 hover:text-red-400 uppercase tracking-widest transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <motion.button
                  onClick={async () => {
                    if (!supabase) {
                      console.error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
                      return
                    }
                    const redirectUrl = window.location.hostname === 'localhost' 
                      ? window.location.origin 
                      : 'https://conn3ctivity-eight.vercel.app/';

                    await supabase.auth.signInWithOAuth({
                      provider: 'discord',
                      options: { redirectTo: redirectUrl }
                    });
                  }}
                  className="hidden md:flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs px-4 py-2.5 rounded-sm transition-colors"
                  style={{ fontSize: '0.65rem', letterSpacing: '0.18em', fontFamily: "'Josefin Sans', sans-serif", fontWeight: 600 }}
                  whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(88,101,242,0.4)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                  </svg>
                  Login
                </motion.button>
              )}

              {/* Mobile menu toggle */}
              <motion.button
                id="mobile-menu-button"
                className="md:hidden p-2"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav-menu"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                style={{ color: 'rgba(237,232,220,0.7)' }}
              >
                <MenuIcon open={menuOpen} />
              </motion.button>
            </div>
          </div>

          {/* Mobile menu */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                id="mobile-nav-menu"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden overflow-hidden"
                style={{
                  background: 'rgba(11,10,8,0.97)',
                  borderTop: '1px solid rgba(201,169,110,0.1)',
                }}
              >
                <div className="px-6 py-6 flex flex-col gap-5">
                  {navLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      style={{
                        fontFamily: "'Josefin Sans', sans-serif",
                        fontWeight: 300,
                        fontSize: '0.75rem',
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase',
                        color: getSectionLink(activeSection) === link.id
                          ? 'rgba(201,169,110,0.9)'
                          : 'rgba(237,232,220,0.65)',
                      }}
                      onClick={() => setMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  ))}
                  <a
                    href={SITE_DATA.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: "'Josefin Sans', sans-serif",
                      fontWeight: 400,
                      fontSize: '0.7rem',
                      letterSpacing: '0.25em',
                      textTransform: 'uppercase',
                      color: '#0B0A08',
                      background: '#C9A96E',
                      padding: '0.7rem 1.2rem',
                      borderRadius: '2px',
                      textDecoration: 'none',
                      textAlign: 'center',
                    }}
                    onClick={() => setMenuOpen(false)}
                  >
                    Follow Us On X
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
  )
}

function XIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function MenuIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="7" x2="21" y2="7" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="17" x2="21" y2="17" />
        </>
      )}
    </svg>
  )
}
