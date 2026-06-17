import { useState } from 'react'
import { motion } from 'framer-motion'
import { use3DTilt } from '../hooks/use3DTilt'

export function BioPod({ member, index }) {
  const [hovered, setHovered] = useState(false)
  const { ref, rotateX, rotateY, handleMouseMove, handleMouseLeave: handleTiltLeave } = use3DTilt({ damping: 20, stiffness: 200, mass: 0.5 }, 12)

  const handleMouseLeave = () => {
    setHovered(false)
    handleTiltLeave()
  }

  return (
    <motion.div
      ref={ref}
      id={`team-pod-${member.id}`}
      initial={{ opacity: 0, y: 40, scale: 0.85 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
      transition={{ duration: 0.6, delay: index * 0.07 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <a
        href={member.url || undefined}
        target={member.url ? '_blank' : undefined}
        rel={member.url ? 'noopener noreferrer' : undefined}
        className="block"
        style={{ cursor: member.url ? 'pointer' : 'default' }}
      >
        <div
          className="relative rounded-3xl overflow-hidden h-full w-full"
          style={{
            transform: 'translateZ(30px)',
            transformStyle: 'preserve-3d',
            background: hovered
              ? `var(--surface-2)`
              : 'var(--surface)',
            border: hovered
              ? `1px solid ${member.color}60`
              : '1px solid var(--border)',
            transition: 'border 0.3s ease, background 0.3s ease',
            padding: '24px',
          }}
        >
          <div className="relative flex flex-col items-center text-center gap-4" style={{ transform: 'translateZ(40px)' }}>
            {/* Avatar */}
            <div className="relative">
              <div
                className="w-20 h-20 rounded-full overflow-hidden"
                style={{
                  boxShadow: hovered
                    ? `0 0 25px ${member.glowColor}, 0 0 50px ${member.glowColor}50`
                    : `0 0 10px ${member.glowColor}30`,
                  border: `2px solid ${member.color}60`,
                  transition: 'box-shadow 0.4s ease',
                }}
              >
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                <div
                  className="hidden w-full h-full items-center justify-center text-2xl font-orbitron font-black"
                  style={{ background: `${member.color}22`, color: member.color }}
                >
                  {member.name[0]}
                </div>
              </div>
            </div>

            {/* Badge */}
            <div
              className="px-3 py-1 rounded-full font-orbitron text-xs font-bold tracking-widest"
              style={{
                background: `${member.badgeColor}15`,
                border: `1px solid ${member.badgeColor}50`,
                color: member.badgeColor,
              }}
            >
              {member.badge}
            </div>

            {/* Name */}
            <div>
              <h3
                className="font-orbitron font-bold text-lg tracking-wide"
                style={{ color: hovered ? member.color : 'var(--conn-white)' }}
              >
                {member.name}
              </h3>
              <p className="font-space text-sm mt-1" style={{ color: 'rgba(240,244,255,0.6)' }}>
                {member.role}
              </p>
            </div>

            {/* Handle */}
            {member.handle && (
              <div
                className="flex items-center gap-1.5 font-space text-xs font-medium"
                style={{ color: 'rgba(240,244,255,0.45)' }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ color: member.color }}>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                {member.handle}
              </div>
            )}
          </div>
        </div>
      </a>
    </motion.div>
  )
}
