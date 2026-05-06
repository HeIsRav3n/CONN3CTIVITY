import { useState } from 'react'
import { motion } from 'framer-motion'
import { use3DTilt } from '../hooks/use3DTilt'

export function CommunityCard({ partner, index }) {
  const [hovered, setHovered] = useState(false)
  const { ref, rotateX, rotateY, handleMouseMove, handleMouseLeave: handleTiltLeave } = use3DTilt({ damping: 20, stiffness: 200, mass: 0.5 }, 12)

  const handleMouseLeave = () => {
    setHovered(false)
    handleTiltLeave()
  }

  return (
    <motion.div
      ref={ref}
      id={`partner-card-${partner.id}`}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <a
        href={partner.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div
          className="rounded-2xl p-5 flex flex-col items-center gap-3 relative overflow-hidden h-full w-full"
          style={{
            transform: 'translateZ(30px)',
            transformStyle: 'preserve-3d',
            background: hovered ? 'var(--surface-2)' : 'var(--surface)',
            border: hovered
              ? `1px solid ${partner.color}55`
              : '1px solid var(--border)',
            transition: 'border 0.3s ease, background 0.3s ease',
          }}
        >


          <div
            className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-black/40"
            style={{
              transition: 'all 0.3s ease',
              transform: 'translateZ(50px)',
            }}
          >
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
              className="hidden w-full h-full items-center justify-center text-xl font-orbitron font-bold rounded-2xl"
              style={{ background: `${partner.color}22`, color: partner.color }}
            >
              {partner.name[0]}
            </div>
          </div>

          <div className="text-center">
            <p
              className="font-orbitron font-bold text-sm tracking-wider"
              style={{ color: hovered ? partner.color : 'var(--conn-white)' }}
            >
              {partner.name}
            </p>
            <p className="font-space text-xs mt-1" style={{ color: 'rgba(240,244,255,0.5)' }}>
              {partner.handle}
            </p>
          </div>

          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-space font-medium"
            style={{
              background: `${partner.color}15`,
              border: `1px solid ${partner.color}40`,
              color: partner.color,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Visit
          </div>
        </div>
      </a>
    </motion.div>
  )
}
