import { useState, useMemo, lazy, Suspense, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import scammers from '../data/scammers.json'

// The investigation modal (chat history plus evidence images) is a separate
// chunk that only loads when a case is actually opened.
const InvestigationModal = lazy(() =>
  import('./DetectivityModal').then((m) => ({ default: m.InvestigationModal })),
)

// Threat titles are slash-joined handles ("Metafriends/Moriusa/VeeFriends/
// Jirasan Fake CM"). They must wrap ONLY after a slash: overflow-wrap:
// anywhere splits mid-word ("VEEFRI/ENDS"), which reads as a typo. Each
// slash segment is a nowrap unit and a <wbr /> after every "/" is the only
// break opportunity, so words are never split.
function ThreatTitle({ title }) {
  const segments = String(title || '').split('/')
  return (
    <>
      {segments.map((segment, i) => (
        <Fragment key={`${segment}-${i}`}>
          <span style={{ whiteSpace: 'nowrap' }}>{segment}</span>
          {i < segments.length - 1 && (
            <>
              {'/'}
              <wbr />
            </>
          )}
        </Fragment>
      ))}
    </>
  )
}

function ScammerCard({ item, index, onView }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-72px 0px' }}
      transition={{ delay: index * 0.1, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="p-[1px] rounded-2xl relative overflow-hidden group"
      style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.1))'
      }}
    >
      <div className="bg-[#0f0e0c] w-full h-full rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between z-10">

        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(239, 68, 68, 0.1) 0%, transparent 70%)'
          }}
        />

        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <span className="font-orbitron text-[0.6rem] tracking-[0.2em] text-red-500/60 uppercase">Threat Level: High</span>
          </div>

          <h3
            className="font-orbitron font-bold text-lg mb-3 leading-tight text-cream group-hover:text-red-400 transition-colors"
            title={item.title}
            style={{ overflowWrap: 'normal', wordBreak: 'normal', hyphens: 'none' }}
          >
            <ThreatTitle title={item.title} />
          </h3>

          <p className="font-space text-xs text-cream/40 line-clamp-2 mb-4 leading-relaxed">
            {item.description || 'Investigation details locked in Discord database.'}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <span className="font-space text-[0.65rem] text-white/30 uppercase tracking-widest">Verification</span>
            <span className="font-space text-[0.65rem] font-bold text-red-500 uppercase tracking-widest">
              Verified Threat
            </span>
          </div>

          <button
            type="button"
            onClick={() => onView(item)}
            className="w-full py-2.5 min-h-[44px] bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl font-orbitron text-[0.65rem] tracking-widest text-red-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            VIEW INVESTIGATION
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export function DetectivitySection() {
  const [selectedCase, setSelectedCase] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return scammers
    return scammers.filter((s) =>
      s.title?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      String(s.id || '').toLowerCase().includes(q),
    )
  }, [search])

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
            className="heading-primary uppercase mb-6"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', color: 'var(--cream)' }}
          >
            Known <span className="text-red-500">Threats</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-['Josefin_Sans'] text-base max-w-2xl mx-auto"
            style={{ color: 'var(--text-muted)' }}
          >
            To keep our community safe, we actively track and expose scammers, imposters, and malicious actors operating in the Web3 space. Verified reports from the Detectivity Discord channel.
          </motion.p>

          {(() => {
            const newest = scammers.reduce((max, s) => {
              const t = s.timestamp ? new Date(s.timestamp).getTime() : 0
              return t > max ? t : max
            }, 0)
            if (!newest) return null
            return (
              <p className="mt-4 font-josefin text-[0.55rem] tracking-[0.25em] uppercase text-cream/30">
                Snapshot · {new Date(newest).toLocaleDateString()}
              </p>
            )
          })()}

          {/* Search the threat database */}
          <div className="relative max-w-md mx-auto mt-8">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search threats by name or case ID…"
              aria-label="Search threats"
              className="w-full px-4 py-3 min-h-[44px] rounded-full font-['Josefin_Sans'] text-sm outline-none"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: 'var(--cream)',
              }}
            />
            {search.trim() && (
              <p className="mt-3 font-josefin text-[0.65rem] tracking-[0.25em] uppercase text-cream/40" role="status">
                {filtered.length} of {scammers.length} threats
              </p>
            )}
          </div>
        </div>

        {/* Scammers Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((scammer, i) => (
              <ScammerCard key={scammer.id} item={scammer} index={i} onView={setSelectedCase} />
            ))}
          </div>
        ) : (
          <p className="text-center font-space text-sm text-cream/40" role="status">
            No threats match that search.
          </p>
        )}
      </div>

      <AnimatePresence>
        {selectedCase && (
          <Suspense fallback={null}>
            <InvestigationModal item={selectedCase} onClose={() => setSelectedCase(null)} />
          </Suspense>
        )}
      </AnimatePresence>
    </section>
  )
}
