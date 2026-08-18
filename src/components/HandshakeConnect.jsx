import { motion } from 'framer-motion'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { luxuryEase } from '../lib/motion'

export function HandshakeConnect() {
  const reduced = usePrefersReducedMotion()

  return (
    <div
      className="relative mx-auto mb-8 flex h-[128px] w-[min(100%,280px)] items-center justify-center"
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-[18%] rounded-[40%]"
        style={{
          background: 'radial-gradient(circle, rgba(201,169,110,0.28) 0%, transparent 72%)',
          filter: 'blur(12px)',
        }}
        animate={reduced ? undefined : { opacity: [0.35, 0.8, 0.4], scale: [0.92, 1.08, 0.96] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {!reduced && (
        <motion.video
          src="/handshake.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="relative z-[1] h-full w-full object-contain"
          style={{ mixBlendMode: 'screen', height: '100%', width: '100%' }}
          initial={{ opacity: 0, scale: 0.88, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.15, delay: 0.45, ease: luxuryEase }}
        />
      )}
    </div>
  )
}
