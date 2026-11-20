import { useEffect } from 'react'
import { motion } from 'framer-motion'

// Heavy investigation view: chat history plus evidence images. Kept in its
// own chunk so it only loads when a case is actually opened.
export function InvestigationModal({ item, onClose }) {
  useEffect(() => {
    if (!item) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    // Keep the page behind the modal from scrolling while it is open.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [item, onClose])

  if (!item) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 backdrop-blur-xl bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-4xl max-h-[85vh] bg-[#0c0b0a] border border-red-500/20 rounded-3xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(239,68,68,0.15)]"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between gap-4 bg-red-500/5">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-orbitron text-[0.6rem] tracking-[0.3em] text-red-500 uppercase mb-1">Investigation Log</span>
            <h2 className="font-orbitron font-bold text-xl md:text-2xl text-cream truncate">{item.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close investigation"
            className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-cream transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* Left Column: Chat Log — second on tablet and mobile, where the
                case metadata answers the first question before the log. */}
            <div className="order-2 lg:order-1 lg:col-span-2 flex flex-col gap-6">
              <h4 className="font-orbitron text-[0.65rem] tracking-[0.2em] text-white/40 uppercase border-b border-white/5 pb-2">Conversation History</h4>

              <div className="flex flex-col gap-4">
                {item.chat && item.chat.length > 0 ? (
                  item.chat.filter(msg => msg.content || (msg.attachments && msg.attachments.length > 0)).map((msg, i) => (
                    <div key={i} className="flex flex-col gap-1.5 p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-orbitron text-[0.6rem] text-red-400/80 tracking-wider">
                          {msg.author === 'Rick' || msg.author === 'jasich' || msg.author === '7xbunny' || msg.author === '0xjeeya' ? 'Verified Reporter' : 'Community Member'}
                        </span>
                        <span className="font-space text-[0.55rem] text-white/20 shrink-0">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="font-space text-sm text-cream/80 whitespace-pre-wrap leading-relaxed break-words">
                        {msg.content || 'Sent an attachment or empty message.'}
                      </p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {msg.attachments.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded-lg overflow-hidden border border-white/10 hover:border-red-500/50 transition-colors">
                              <img src={url} alt="Attachment" loading="lazy" decoding="async" className="w-full h-full object-cover" />
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

            {/* Right Column: Details — first on tablet and mobile. */}
            <div className="order-1 lg:order-2 flex flex-col gap-8">
              <div>
                <h4 className="font-orbitron text-[0.65rem] tracking-[0.2em] text-white/40 uppercase border-b border-white/5 pb-2 mb-4">Case Metadata</h4>
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/20 uppercase font-space tracking-widest">Case ID</span>
                    <span className="text-xs text-cream/60 font-mono break-all">{item.id}</span>
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
                        <img src={img} alt="Evidence" loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
            className="flex items-center gap-3 px-6 py-3 min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-orbitron text-xs font-bold tracking-widest rounded-xl transition-all shadow-lg hover:shadow-red-600/20"
          >
            VIEW FULL THREAD ON DISCORD
          </a>
        </div>
      </motion.div>
    </motion.div>
  )
}
