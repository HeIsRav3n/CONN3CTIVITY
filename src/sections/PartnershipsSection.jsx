import { motion } from 'framer-motion'
import { CommunityCard } from '../components/CommunityCard'
import { AtmosphereBackdrop } from '../components/AtmosphereBackdrop'
import { PARTNERSHIPS } from '../data/siteData'

export function PartnershipsSection() {
  return (
    <section id="partnerships" className="relative py-24 md:py-36 px-4 overflow-hidden">
      <AtmosphereBackdrop opacity={0.22} />

      <div className="max-w-7xl mx-auto relative z-[2]">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="tag-gold inline-flex mb-8"
          >
            Partner Network
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="heading-primary mb-4"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', color: 'var(--cream)' }}
          >
            Our <span style={{ color: 'var(--gold)' }}>Allies</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-['Josefin_Sans'] text-sm max-w-xl mx-auto"
            style={{ color: 'var(--text-muted)', fontWeight: 300, letterSpacing: '0.06em' }}
          >
            Web3 communities and protocols building together. Hover to connect.
          </motion.p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-3xl mx-auto" style={{ perspective: 900 }}>
          {PARTNERSHIPS.map((partner, index) => (
            <CommunityCard key={partner.id} partner={partner} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
