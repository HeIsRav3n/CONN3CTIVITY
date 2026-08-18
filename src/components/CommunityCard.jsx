import { useState } from 'react'
import { motion } from 'framer-motion'
import { use3DTilt } from '../hooks/use3DTilt'
import { luxuryEase, viewportOnce } from '../lib/motion'

export function CommunityCard({ partner, index }) {
  const [hovered, setHovered] = useState(false)
  const tilt = use3DTilt({ damping: 20, stiffness: 200, mass: 0.45 }, 7)

  return (
    <motion.div
      id={`partner-card-${partner.id}`}
      ref={tilt.ref}
      initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={viewportOnce}
      transition={{ duration: 0.55, delay: index * 0.05, ease: luxuryEase }}
      whileHover={{ y: -6 }}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={tilt.handleMouseMove}
      onMouseLeave={() => {
        setHovered(false)
        tilt.handleMouseLeave()
      }}
      style={{
        rotateX: tilt.rotateX,
        rotateY: tilt.rotateY,
        transformStyle: 'preserve-3d',
      }}
    >
      <a href={partner.url} target="_blank" rel="noopener noreferrer" className="block">
        <div
          className="p-5 flex flex-col items-center gap-3 h-full w-full gold-sheen"
          style={{
            background: hovered ? 'var(--surface-2)' : 'var(--surface)',
            border: hovered ? `1px solid ${partner.color}44` : '1px solid var(--border)',
            borderRadius: 2,
            transition: 'border 0.25s ease, background 0.25s ease',
            boxShadow: hovered ? `0 18px 40px rgba(0,0,0,0.35), 0 0 24px ${partner.color}18` : 'none',
          }}
        >
          <div className="relative w-14 h-14 overflow-hidden" style={{ borderRadius: 2 }}>
            <img
              src={partner.avatar}
              alt={partner.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            <div
              className="hidden w-full h-full items-center justify-center text-lg font-['Josefin_Sans'] font-semibold"
              style={{ background: `${partner.color}22`, color: partner.color }}
            >
              {partner.name[0]}
            </div>
          </div>

          <div className="text-center">
            <p
              className="font-['Josefin_Sans'] text-sm tracking-[0.12em] uppercase"
              style={{ color: hovered ? partner.color : 'var(--cream)', fontWeight: 400 }}
            >
              {partner.name}
            </p>
            <p className="font-['Josefin_Sans'] text-[0.65rem] mt-1 tracking-widest" style={{ color: 'var(--text-faint)' }}>
              {partner.handle}
            </p>
          </div>
        </div>
      </a>
    </motion.div>
  )
}
