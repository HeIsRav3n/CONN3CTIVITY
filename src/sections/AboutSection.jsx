import { useState } from 'react'
import { motion } from 'framer-motion'
import { SITE_DATA } from '../data/siteData'
import { AtmosphereBackdrop } from '../components/AtmosphereBackdrop'
import { MascotScene } from '../components/three/MascotScene'
import { use3DTilt } from '../hooks/use3DTilt'

function MascotCard({ name, role, desc, img, color, delay }) {
  const [hover, setHover] = useState(false)
  const tilt = use3DTilt({ damping: 18, stiffness: 180, mass: 0.4 }, 8)

  return (
    <motion.div
      ref={tilt.ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      onMouseMove={tilt.handleMouseMove}
      onMouseLeave={() => {
        tilt.handleMouseLeave()
        setHover(false)
      }}
      onMouseEnter={() => setHover(true)}
      className="p-4 relative overflow-hidden group w-full h-full"
      style={{
        background: 'rgba(237,232,220,0.02)',
        border: `1px solid ${color}28`,
        borderRadius: 2,
        transformStyle: 'preserve-3d',
        rotateX: tilt.rotateX,
        rotateY: tilt.rotateY,
      }}
    >
      <div className="aspect-square overflow-hidden mb-4 relative">
        <MascotScene src={img} alt={name} hover={hover} className="absolute inset-0" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-['Josefin_Sans'] text-lg tracking-[0.14em] uppercase" style={{ color, fontWeight: 400 }}>{name}</h3>
          <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${color}40, transparent)` }} />
        </div>
        <p className="font-['Josefin_Sans'] text-[0.65rem] tracking-[0.18em] uppercase mb-2" style={{ color: 'var(--cream)' }}>{role}</p>
        <p className="font-['Josefin_Sans'] text-xs leading-relaxed" style={{ color: 'var(--text-faint)', fontWeight: 300 }}>{desc}</p>
      </div>
    </motion.div>
  )
}

export function AboutSection() {
  return (
    <section
      id="about"
      className="relative py-28 md:py-40 px-6 overflow-hidden"
    >
      <AtmosphereBackdrop opacity={0.14} />
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">

          <div>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="tag-cream inline-flex mb-8">What We Are</div>

              <h2
                className="heading-primary mb-6"
                style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', color: 'var(--cream)' }}
              >
                The Art of<br />
                <span style={{ color: 'var(--gold)' }}>Collaboration</span>
              </h2>

              <p
                className="font-['Josefin_Sans'] mb-5 leading-relaxed"
                style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.85, fontWeight: 300 }}
              >
                CONN3CTIVITY is a Web3 community built on meaningful partnerships. We are Collaboration
                Managers (CMs) who connect projects and communities.
              </p>

              <p
                className="font-['Josefin_Sans'] mb-10 leading-relaxed"
                style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.85, fontWeight: 300 }}
              >
                Whether you are a new project looking for exposure or an established
                protocol seeking alliances, CONN3CTIVITY is your network.
              </p>

              <motion.a
                href={SITE_DATA.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="about-twitter-link"
                className="inline-flex items-center gap-3 btn-outline px-7 py-3 rounded-sm text-sm"
                whileHover={{
                  scale: 1.04,
                  y: -2,
                  boxShadow: '0 12px 40px rgba(201,169,110,0.2)',
                  borderColor: 'rgba(201,169,110,0.6)',
                }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <XIcon size={14} />
                Follow conn3ctivity_
              </motion.a>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5" style={{ perspective: 900 }}>
            <MascotCard
              name="GM"
              role="Good Morning"
              desc="The greeting that starts every connection."
              img="/mascot-gm-transparent.png"
              color="var(--cream)"
              delay={0.2}
            />
            <MascotCard
              name="CM"
              role="Collab Manager"
              desc="Could You DM? The question that opens doors."
              img="/mascot-cm-transparent.png"
              color="var(--gold)"
              delay={0.3}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function XIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
