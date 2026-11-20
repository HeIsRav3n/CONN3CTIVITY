import { motion, MotionConfig } from 'framer-motion'
import { CommunityCard } from '../components/CommunityCard'
import { AtmosphereBackdrop } from '../components/AtmosphereBackdrop'
import { PARTNERSHIPS } from '../data/siteData'
import { fadeIn, fadeUp, staggerContainer, viewportOnce } from '../lib/motion'

export function PartnershipsSection() {
  return (
    <MotionConfig reducedMotion="user">
    <section id="partnerships" className="relative py-24 md:py-36 px-4 overflow-hidden">
      <AtmosphereBackdrop opacity={0.22} />

      <div className="max-w-7xl mx-auto relative z-[2]">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="text-center mb-14"
        >
          <motion.div
            variants={fadeUp}
            className="tag-gold inline-flex mb-8"
          >
            Partner Network
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="heading-primary mb-4"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', color: 'var(--cream)' }}
          >
            Our <span style={{ color: 'var(--gold)' }}>Allies</span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="font-['Josefin_Sans'] text-sm max-w-xl mx-auto"
            style={{ color: 'var(--text-muted)', fontWeight: 300, letterSpacing: '0.06em' }}
          >
            Web3 communities and protocols building together. Hover to connect.
          </motion.p>
        </motion.div>

        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-3xl mx-auto" style={{ perspective: 900 }}
        >
          {PARTNERSHIPS.map((partner, index) => (
            <CommunityCard key={partner.id} partner={partner} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
    </MotionConfig>
  )
}
