import { motion } from 'framer-motion'
import { CommunityCard } from '../components/CommunityCard'
import { PARTNERSHIPS } from '../data/siteData'
import { PartnershipsBackground } from '../components/three/SectionBackgrounds'

export function PartnershipsSection() {
  return (
    <section
      id="partnerships"
      className="relative py-24 md:py-36 px-4 overflow-hidden"
    >
      {/* Three.js Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <PartnershipsBackground />
      </div>
      {/* Gradient overlay to keep text readable */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 100% 70% at 50% 50%, rgba(11,10,8,0.55) 0%, rgba(11,10,8,0.85) 100%)',
        }}
      />


      <div className="max-w-7xl mx-auto relative z-[2]">
        {/* Section header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{
              background: 'rgba(0, 212, 255, 0.08)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-glow" />
            <span className="font-space text-xs tracking-widest" style={{ color: '#00d4ff' }}>
              PARTNER NETWORK
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
            <span className="text-gradient-cyan">OUR</span>{' '}
            <span style={{ color: 'var(--conn-white)' }}>ALLIES</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-space text-base max-w-xl mx-auto"
            style={{ color: 'rgba(240,244,255,0.55)' }}
          >
            Web3 communities and protocols building together Hover to connect
          </motion.p>
        </div>

        {/* Partnership grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {PARTNERSHIPS.map((partner, index) => (
            <CommunityCard
              key={partner.id}
              partner={partner}
              index={index}
            />
          ))}
        </div>

        {/* Decorative connector lines */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-16 flex items-center justify-center gap-4"
        >
          <div className="h-px flex-1 max-w-xs" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.4))' }} />
          <div
            className="font-orbitron text-xs tracking-widest px-4"
            style={{ color: 'rgba(0,212,255,0.5)' }}
          >
            SEARCH FIND CONN3CT
          </div>
          <div className="h-px flex-1 max-w-xs" style={{ background: 'linear-gradient(270deg, transparent, rgba(0,212,255,0.4))' }} />
        </motion.div>
      </div>
    </section>
  )
}
