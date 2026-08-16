import { motion } from 'framer-motion'
import { SITE_DATA } from '../data/siteData'
import { use3DTilt } from '../hooks/use3DTilt'



function MascotCard({ name, role, desc, img, color, delay }) {
  const { ref, rotateX, rotateY, handleMouseMove, handleMouseLeave } = use3DTilt({ damping: 20, stiffness: 200, mass: 0.5 }, 15)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="rounded-2xl p-4 relative overflow-hidden group w-full h-full"
      style={{
        background: 'rgba(237,232,220,0.02)',
        border: `1px solid ${color}30`,
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        willChange: 'transform',
      }}
    >
      {/* Hover glow backdrop */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(ellipse 70% 70% at 50% 20%, ${color}08, transparent 70%)` }}
      />
      <div 
        className="aspect-square rounded-xl overflow-hidden mb-5 relative flex items-end justify-center"
        style={{ transform: 'translateZ(60px)' }}
      >
        <img 
          src={img} 
          alt={name} 
          className="w-[90%] h-[90%] object-contain transition-transform duration-700 group-hover:scale-105" 
          style={{ filter: `drop-shadow(0px 10px 20px ${color}30)` }}
        />
      </div>

      <div className="relative z-10" style={{ transform: 'translateZ(40px)' }}>
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-orbitron font-black text-xl" style={{ color }}>{name}</h3>
          <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${color}50, transparent)` }} />
        </div>
        <p className="font-space text-[0.65rem] tracking-widest uppercase mb-2" style={{ color: 'var(--conn-white)' }}>{role}</p>
        <p className="font-['Josefin_Sans'] text-xs leading-relaxed" style={{ color: 'var(--text-faint)' }}>{desc}</p>
      </div>
      {/* Bottom border glint */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${color}80, transparent)` }}
      />
    </motion.div>
  )
}

export function AboutSection() {
  return (
    <section
      id="about"
      className="relative py-28 md:py-40 px-6 overflow-hidden"
    >
      {/* Ambient animated gradient background (high-performance CSS only) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ rotate: [0, 360], scale: [1, 1.1, 1] }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          className="absolute w-[800px] h-[800px] -top-[400px] -left-[300px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #C9A96E 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ rotate: [360, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
          className="absolute w-[600px] h-[600px] bottom-[-200px] right-[-200px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #EDE8DC 0%, transparent 70%)' }}
        />
      </div>
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">

          {/* Left — text */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              {/* Tag */}
              <div className="tag-cream inline-flex mb-8">What We Are</div>

              <h2
                className="heading-primary mb-6"
                style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', color: 'var(--cream)' }}
              >
                The Art of<br />
                <span style={{ color: 'var(--gold)' }}>Collaboration</span>
              </h2>

              <p
                className="font-['Josefin_Sans'] mb-5 leading-relaxed"
                style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.85, fontWeight: 300 }}
              >
                CONN3CTIVITY is a Web3 community built on meaningful partnerships. We are Collaboration
                Managers (CMs) who connect projects and communities.
              </p>

              <p
                className="font-['Josefin_Sans'] mb-10 leading-relaxed"
                style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.85, fontWeight: 300 }}
              >
                Whether you are a new project looking for exposure or an established
                protocol seeking alliances, CONN3CTIVITY is your network.
              </p>

              <motion.a
                href={SITE_DATA.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                id="about-twitter-link"
                className="inline-flex items-center gap-3 btn-outline px-7 py-3 rounded-sm text-sm"
                whileHover={{
                  scale: 1.04,
                  y: -2,
                  boxShadow: '0 12px 40px rgba(201,169,110,0.2)',
                  borderColor: 'rgba(201,169,110,0.6)',
                }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <XIcon size={14} />
                Follow conn3ctivity_
              </motion.a>
            </motion.div>
          </div>

          {/* Right — mascots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <MascotCard 
              name="GM" 
              role="Good Morning" 
              desc="The greeting that starts every connection."
              img="/mascot-gm-transparent.png" 
              color="var(--cream)" 
              delay={0.2} 
            />
            <MascotCard 
              name="CM" 
              role="Collab Manager" 
              desc="Could You DM? The question that opens doors." 
              img="/mascot-cm-transparent.png" 
              color="var(--gold)" 
              delay={0.3} 
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function XIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}
