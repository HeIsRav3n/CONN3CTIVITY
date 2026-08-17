import { useState } from 'react'
import { motion } from 'framer-motion'

export function BioPod({ member, index }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      id={`team-pod-${member.id}`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <a
        href={member.url || undefined}
        target={member.url ? '_blank' : undefined}
        rel={member.url ? 'noopener noreferrer' : undefined}
        className="block"
        style={{ cursor: member.url ? 'pointer' : 'default' }}
      >
        <div
          className="relative overflow-hidden h-full w-full"
          style={{
            background: hovered ? 'var(--surface-2)' : 'var(--surface)',
            border: hovered ? `1px solid ${member.color}50` : '1px solid var(--border)',
            borderRadius: 2,
            transition: 'border 0.25s ease, background 0.25s ease',
            padding: '1.25rem 1rem',
          }}
        >
          <div className="relative flex flex-col items-center text-center gap-3">
            <div
              className="w-16 h-16 rounded-full overflow-hidden"
              style={{ border: `1px solid ${member.color}50` }}
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
                className="hidden w-full h-full items-center justify-center text-xl font-['Josefin_Sans']"
                style={{ background: `${member.color}22`, color: member.color }}
              >
                {member.name[0]}
              </div>
            </div>

            <div
              className="px-2.5 py-0.5 font-['Josefin_Sans'] text-[0.55rem] tracking-[0.18em] uppercase"
              style={{
                background: `${member.badgeColor}12`,
                border: `1px solid ${member.badgeColor}40`,
                color: member.badgeColor,
                borderRadius: 2,
              }}
            >
              {member.badge}
            </div>

            <div>
              <h3
                className="font-['Josefin_Sans'] text-sm tracking-[0.1em] uppercase"
                style={{ color: hovered ? member.color : 'var(--cream)', fontWeight: 400 }}
              >
                {member.name}
              </h3>
              <p className="font-['Josefin_Sans'] text-[0.65rem] mt-1 tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {member.role}
              </p>
            </div>

            {member.handle && (
              <div
                className="flex items-center gap-1.5 font-['Josefin_Sans'] text-[0.6rem] tracking-widest"
                style={{ color: 'var(--text-faint)' }}
              >
                @{member.handle}
              </div>
            )}
          </div>
        </div>
      </a>
    </motion.div>
  )
}
