import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { SITE_DATA } from '../data/siteData'

// Mini Venn logo for navbar — 3D tilt on hover + clickable "3"
function NavLogo({ onThreeClick }) {
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
    if (onThreeClick) onThreeClick()
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

export function Navbar({ visible = false, onThreeClick }) {
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
    const sections = ['home', 'about', 'partnerships', 'team', 'connect']
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

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          id="navbar"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
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
              <NavLogo onThreeClick={onThreeClick} />
            </motion.a>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-10">
              {navLinks.map((link) => {
                const isActive = activeSection === link.id
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

              {/* Enquiries — Twitter DM */}
              <motion.a
                href="https://x.com/thejasich"
                target="_blank"
                rel="noopener noreferrer"
                id="twitter-enquiry-btn"
                className="hidden md:flex items-center gap-2 btn-primary text-xs px-4 py-2.5 rounded-sm"
                style={{ fontSize: '0.65rem', letterSpacing: '0.18em', textDecoration: 'none' }}
                whileHover={{ scale: 1.03, boxShadow: '0 0 24px rgba(201,169,110,0.35)' }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Pulse dot */}
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#0B0A08',
                  boxShadow: '0 0 4px 1px rgba(11,10,8,0.5)',
                  animation: 'pulse 2s ease-in-out infinite',
                  flexShrink: 0,
                }} />
                Enquire
              </motion.a>

              {/* Mobile menu toggle */}
              <motion.button
                id="mobile-menu-button"
                className="md:hidden p-2"
                onClick={() => setMenuOpen(!menuOpen)}
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
                        color: activeSection === link.id
                          ? 'rgba(201,169,110,0.9)'
                          : 'rgba(237,232,220,0.65)',
                      }}
                      onClick={() => setMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  ))}
                  <a
                    href="https://x.com/thejasich"
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
                    Enquire via Twitter
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
      )}
    </AnimatePresence>
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
