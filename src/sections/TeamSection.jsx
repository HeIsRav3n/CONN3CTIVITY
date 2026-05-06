import { motion } from 'framer-motion'
import { BioPod } from '../components/BioPod'
import { TEAM } from '../data/siteData'
import { TeamBackground } from '../components/three/SectionBackgrounds'

export function TeamSection() {
  return (
    <section
      id="team"
      className="relative py-24 md:py-36 px-4 overflow-hidden"
    >
      {/* Three.js Galaxy Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <TeamBackground />
      </div>
      {/* Overlay */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 100% 70% at 50% 50%, rgba(11,10,8,0.5) 0%, rgba(11,10,8,0.88) 100%)',
        }}
      />


      <div className="max-w-7xl mx-auto relative z-[2]">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
            }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse-glow" style={{ background: '#a855f7' }} />
            <span className="font-space text-xs tracking-widest" style={{ color: '#a855f7' }}>
              THE CREW
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-orbitron font-black mb-4"
            style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
          >
            <span className="text-gradient-purple">MEET THE</span>{' '}
            <span style={{ color: 'var(--conn-white)' }}>TEAM</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-space text-base max-w-xl mx-auto"
            style={{ color: 'rgba(240,244,255,0.55)' }}
          >
            Our crew Each member is a specialist
          </motion.p>

          {/* Member count */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full"
            style={{
              background: 'rgba(168,85,247,0.08)',
              border: '1px solid rgba(168,85,247,0.15)',
            }}
          >
            <span className="font-orbitron font-bold text-xs" style={{ color: '#a855f7' }}>
              {TEAM.length}
            </span>
            <span className="font-space text-xs" style={{ color: 'rgba(240,244,255,0.4)' }}>
              MEMBERS
            </span>
          </motion.div>
        </div>

        {/* Team grid — 2 col mobile, 3 tablet, 4 desktop, 5 XL */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {TEAM.map((member, index) => (
            <BioPod
              key={member.id}
              member={member}
              index={index}
            />
          ))}
        </div>

        {/* Bottom decoration */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-16 flex items-center justify-center gap-4"
        >
          <div className="h-px flex-1 max-w-xs" style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.4))' }} />
          <div
            className="font-orbitron text-xs tracking-widest px-4"
            style={{ color: 'rgba(168,85,247,0.5)' }}
          >
            THE CONN3CTIVITY CREW
          </div>
          <div className="h-px flex-1 max-w-xs" style={{ background: 'linear-gradient(270deg, transparent, rgba(168,85,247,0.4))' }} />
        </motion.div>
      </div>
    </section>
  )
}
