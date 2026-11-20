import { motion, MotionConfig } from 'framer-motion'
import { BioPod } from '../components/BioPod'
import { AtmosphereBackdrop } from '../components/AtmosphereBackdrop'
import { TEAM } from '../data/siteData'
import { fadeIn, fadeUp, staggerContainer, viewportOnce } from '../lib/motion'

export function TeamSection() {
  return (
    <MotionConfig reducedMotion="user">
    <section id="team" className="relative py-24 md:py-36 px-4 overflow-hidden">
      <AtmosphereBackdrop opacity={0.18} />

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
            The Crew
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="heading-primary mb-4"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', color: 'var(--cream)' }}
          >
            Meet the <span style={{ color: 'var(--gold)' }}>Team</span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="font-['Josefin_Sans'] text-sm max-w-xl mx-auto"
            style={{ color: 'var(--text-muted)', fontWeight: 300, letterSpacing: '0.06em' }}
          >
            Our crew. Each member is a specialist.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 mt-5 tag-cream"
          >
            <span style={{ color: 'var(--gold)' }}>{TEAM.length}</span>
            <span>Members</span>
          </motion.div>
        </motion.div>

        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3"
        >
          {TEAM.map((member, index) => (
            <BioPod key={member.id} member={member} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
    </MotionConfig>
  )
}
