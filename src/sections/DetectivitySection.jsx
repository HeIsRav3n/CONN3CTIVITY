import { motion } from 'framer-motion'
import scammers from '../data/scammers.json'

function ScammerCard({ item, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="p-[1px] rounded-2xl relative overflow-hidden group"
      style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.1))'
      }}
    >
      <div className="bg-[#0f0e0c] w-full h-full rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between z-10">
        
        {/* Subtle background glow on hover */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(239, 68, 68, 0.1) 0%, transparent 70%)'
          }}
        />

        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <span className="font-orbitron text-xs tracking-widest text-red-400/80 uppercase">Warning</span>
          </div>

          <h3 className="font-orbitron font-bold text-lg mb-2 leading-snug" style={{ color: 'var(--cream)' }}>
            {item.title}
          </h3>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
          <span className="font-space text-xs text-white/40">Reported by</span>
          <span className="font-space text-sm font-medium" style={{ color: 'var(--gold)' }}>
            @{item.author}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export function DetectivitySection() {
  return (
    <section id="detectivity" className="relative py-24 md:py-36 px-4 overflow-hidden">
      
      {/* Background ambient light */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
        <div className="w-full max-w-5xl h-96 opacity-20 blur-[100px] rounded-full" 
             style={{ background: 'radial-gradient(ellipse at center, #ef4444 0%, transparent 70%)' }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="tag-gold inline-flex mb-6"
            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}
          >
            DETECTIVITY DATABASE
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-orbitron font-bold text-4xl md:text-5xl lg:text-6xl uppercase tracking-wider mb-6"
            style={{ color: 'var(--cream)' }}
          >
            Known <span className="text-red-500">Threats</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-inter text-base max-w-2xl mx-auto"
            style={{ color: 'var(--text-muted)' }}
          >
            To keep our community safe, we actively track and expose scammers, imposters, and malicious actors operating in the Web3 space. Verified reports from the Detectivity Discord channel.
          </motion.p>
        </div>

        {/* Scammers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scammers.map((scammer, i) => (
            <ScammerCard key={scammer.id} item={scammer} index={i} />
          ))}
        </div>

      </div>
    </section>
  )
}
