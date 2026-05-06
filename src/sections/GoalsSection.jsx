import { motion } from 'framer-motion'
import { use3DTilt } from '../hooks/use3DTilt'

const MOTTO_WORDS = ['SEARCH', 'FIND', 'CONN3CT']
const WORD_COLORS = ['#EDE8DC', '#C9A96E', '#EDE8DC']

function MottoWord({ word, color, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9, delay: index * 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="relative inline-block"
    >
      <motion.span
        style={{
          fontFamily: "'Josefin Sans', sans-serif",
          fontWeight: 100,
          fontSize: 'clamp(0.85rem, 3.5vw, 6rem)',
          color,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          display: 'block',
          whiteSpace: 'nowrap',
          textShadow: index === 1 ? '0 0 40px rgba(201,169,110,0.4)' : '0 0 30px rgba(237,232,220,0.15)',
        }}
        whileHover={{ scale: 1.05, opacity: 0.9 }}
        transition={{ duration: 0.3 }}
      >
        {word}
      </motion.span>
    </motion.div>
  )
}

function StatItem({ value, label, color, index }) {
  const { ref, rotateX, rotateY, handleMouseMove, handleMouseLeave } = use3DTilt(
    { damping: 25, stiffness: 200, mass: 0.5 }, 8
  )

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 + 0.3, duration: 0.6 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="text-center rounded-sm p-6 holo-card"
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: '800px',
        background: 'rgba(237,232,220,0.02)',
        border: `1px solid ${color}20`,
      }}
    >
      <div
        className="mb-2"
        style={{
          fontFamily: "'Josefin Sans', sans-serif",
          fontWeight: 200,
          fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
          letterSpacing: '0.1em',
          color,
          transform: 'translateZ(20px)',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "'Josefin Sans', sans-serif",
          fontWeight: 300,
          fontSize: '0.6rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'var(--text-faint)',
          transform: 'translateZ(10px)',
        }}
      >
        {label}
      </div>
    </motion.div>
  )
}

function ActionCard({ item, index }) {
  const { ref, rotateX, rotateY, handleMouseMove, handleMouseLeave } = use3DTilt(
    { damping: 20, stiffness: 200, mass: 0.5 }, 14
  )

  return (
    <motion.div
      ref={ref}
      key={item.title}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15, duration: 0.6 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="rounded-3xl p-8 relative overflow-hidden group holo-card"
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        border: `1px solid ${item.color}20`,
        background: 'rgba(237,232,220,0.02)',
      }}
    >
      {/* Animated glow orb on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 60% at 30% 30%, ${item.color}10, transparent 70%)`,
        }}
      />

      <div style={{ transform: 'translateZ(40px)', transformStyle: 'preserve-3d' }}>
        <div
          className="text-4xl mb-4"
          style={{ transform: 'translateZ(20px)' }}
        >
          {item.icon}
        </div>
        <h3
          className="font-orbitron font-bold text-lg mb-3 tracking-wide"
          style={{ color: item.color, transform: 'translateZ(15px)' }}
        >
          {item.title}
        </h3>
        <p
          className="font-space text-sm leading-relaxed"
          style={{ color: 'rgba(240,244,255,0.6)', transform: 'translateZ(10px)' }}
        >
          {item.desc}
        </p>
      </div>

      {/* Bottom glint line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{ background: `linear-gradient(90deg, transparent, ${item.color}60, transparent)` }}
      />
    </motion.div>
  )
}

const ACTION_CARDS = [
  {
    icon: '🔍',
    title: 'SEARCH',
    desc: 'We find projects and communities ready to grow together',
    color: '#00d4ff',
  },
  {
    icon: '🎯',
    title: 'FIND',
    desc: 'We identify strong connections between projects',
    color: '#a855f7',
  },
  {
    icon: '🔗',
    title: 'CONN3CT',
    desc: 'We build partnerships that help communities grow',
    color: '#e879f9',
  },
]

export function GoalsSection() {
  return (
    <section
      id="connect"
      className="relative py-24 md:py-36 px-4 overflow-hidden"
    >
      {/* Lightweight CSS gradient — no Three.js canvas near footer */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(201,169,110,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 60% 60% at 50% 100%, rgba(237,232,220,0.04) 0%, transparent 70%)
          `,
        }}
      />

      <div className="max-w-7xl mx-auto relative z-[2]">
        {/* Motto */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="tag-gold inline-flex mb-8">
            OUR MISSION
          </motion.div>

          <div className="flex flex-nowrap items-center justify-center gap-4 md:gap-10 w-full px-2">
            {MOTTO_WORDS.map((word, i) => (
              <div key={word} className="flex items-center shrink-0">
                <MottoWord word={word} color={WORD_COLORS[i]} index={i} />
              </div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.8 }}
            className="font-inter text-base max-w-2xl mx-auto mt-8"
            style={{ color: 'var(--text-muted)', lineHeight: 1.85 }}
          >
            CONN3CTIVITY connects Web3 projects and communities We create partnerships that bring real value
          </motion.p>
        </div>

        {/* Stats — 3D tilt cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          <StatItem value="9+" label="Partner Communities" color="var(--cream)" index={0} />
          <StatItem value="10" label="Team Members" color="var(--gold)" index={1} />
          <StatItem value="∞" label="Connections Made" color="var(--cream-muted)" index={2} />
          <StatItem value="1" label="Vision" color="var(--gold)" index={3} />
        </div>

        {/* Action cards — full 3D tilt */}
        <div className="mt-20 grid md:grid-cols-3 gap-6">
          {ACTION_CARDS.map((item, i) => (
            <ActionCard key={item.title} item={item} index={i} />
          ))}
        </div>

        {/* Contact Banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-24 p-[1px] rounded-3xl relative overflow-hidden"
          style={{ background: 'linear-gradient(90deg, rgba(237,232,220,0.1), rgba(201,169,110,0.3), rgba(237,232,220,0.1))' }}
        >
          <div className="rounded-3xl p-8 md:p-12 relative overflow-hidden" style={{ background: 'rgba(11,10,8,0.9)', backdropFilter: 'blur(20px)' }}>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <h3 className="font-orbitron font-bold text-xl md:text-2xl mb-3" style={{ color: 'var(--cream)' }}>
                  ENQUIRIES & SERVICES
                </h3>
                <p className="font-space text-sm md:text-base leading-relaxed max-w-xl" style={{ color: 'var(--text-muted)' }}>
                  For Enquiries, Marketing Services, UGC Campaigns, AMAs.
                </p>
              </div>
              <motion.a
                href="https://x.com/thejasich"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-3 px-8 py-4 rounded-full font-orbitron font-bold text-sm tracking-widest whitespace-nowrap"
                style={{ 
                  background: 'var(--gold)', 
                  color: 'var(--void)',
                  boxShadow: '0 0 30px rgba(201,169,110,0.3)'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                CONTACT THEJASICH
              </motion.a>
            </div>
            
            {/* Background glow for the banner */}
            <div 
              className="absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(201,169,110,0.15) 0%, transparent 70%)',
                filter: 'blur(30px)'
              }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
