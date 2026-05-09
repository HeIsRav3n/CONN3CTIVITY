import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import scammers from '../data/scammers.json'

console.log('Detectivity Database Loaded:', scammers.length, 'entries');

function ScammerCard({ item, index, onView }) {
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

          <h3 className="font-orbitron font-bold text-lg mb-3 leading-tight text-cream group-hover:text-red-400 transition-colors">
            {item.title}
          </h3>
          
          <p className="font-space text-xs text-cream/40 line-clamp-2 mb-4 leading-relaxed">
            {item.description || "Investigation details locked in Discord database."}
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
            onClick={() => onView(item)}
            className="w-full py-2.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl font-orbitron text-[0.65rem] tracking-widest text-red-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            VIEW INVESTIGATION
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function InvestigationModal({ item, onClose }) {
  if (!item) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 backdrop-blur-xl bg-black/80"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-4xl max-h-[85vh] bg-[#0c0b0a] border border-red-500/20 rounded-3xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(239,68,68,0.15)]"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-red-500/5">
          <div className="flex flex-col">
            <span className="font-orbitron text-[0.6rem] tracking-[0.3em] text-red-500 uppercase mb-1">Investigation Log</span>
            <h2 className="font-orbitron font-bold text-xl md:text-2xl text-cream truncate max-w-md">{item.title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-cream transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* Left Column: Chat Log */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <h4 className="font-orbitron text-[0.65rem] tracking-[0.2em] text-white/40 uppercase border-b border-white/5 pb-2">Conversation History</h4>
              
              <div className="flex flex-col gap-4">
                {item.chat && item.chat.length > 0 ? (
                  item.chat.filter(msg => msg.content || (msg.attachments && msg.attachments.length > 0)).map((msg, i) => (
                    <div key={i} className="flex flex-col gap-1.5 p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="font-orbitron text-[0.6rem] text-red-400/80 tracking-wider">@{msg.author}</span>
                        <span className="font-space text-[0.55rem] text-white/20">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="font-space text-sm text-cream/80 whitespace-pre-wrap leading-relaxed">
                        {msg.content || "Sent an attachment or empty message."}
                      </p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {msg.attachments.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded-lg overflow-hidden border border-white/10 hover:border-red-500/50 transition-colors">
                              <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-white/20 font-space text-sm italic">No chat history recovered from Discord.</p>
                )}
              </div>
            </div>

            {/* Right Column: Details */}
            <div className="flex flex-col gap-8">
              <div>
                <h4 className="font-orbitron text-[0.65rem] tracking-[0.2em] text-white/40 uppercase border-b border-white/5 pb-2 mb-4">Case Metadata</h4>
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/20 uppercase font-space tracking-widest">Case ID</span>
                    <span className="text-xs text-cream/60 font-mono">{item.id}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/20 uppercase font-space tracking-widest">Report Date</span>
                    <span className="text-xs text-cream/60 font-space">{new Date(item.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/20 uppercase font-space tracking-widest">Status</span>
                    <span className="text-xs text-red-500 font-bold font-space uppercase">Confirmed Scammer</span>
                  </div>
                </div>
              </div>

              {item.images && item.images.length > 0 && (
                <div>
                  <h4 className="font-orbitron text-[0.65rem] tracking-[0.2em] text-white/40 uppercase border-b border-white/5 pb-2 mb-4">Evidence Gallery</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {item.images.map((img, i) => (
                      <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-xl overflow-hidden border border-white/5 hover:border-red-500/50 transition-all active:scale-95">
                        <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
        
        {/* Modal Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-center">
          <a 
            href={`https://discord.com/channels/1265954062789120050/${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-orbitron text-xs font-bold tracking-widest rounded-xl transition-all shadow-lg hover:shadow-red-600/20"
          >
            VIEW FULL THREAD ON DISCORD
          </a>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function DetectivitySection() {
  const [selectedCase, setSelectedCase] = useState(null);

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
            <ScammerCard key={scammer.id} item={scammer} index={i} onView={setSelectedCase} />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedCase && (
          <InvestigationModal item={selectedCase} onClose={() => setSelectedCase(null)} />
        )}
      </AnimatePresence>
    </section>
  )
}
