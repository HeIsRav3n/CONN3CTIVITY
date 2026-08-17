import { motion } from 'framer-motion'

export function HandshakeConnect() {
  return (
    <div
      className="relative mx-auto mb-8 flex h-[110px] w-[min(100%,320px)] items-center justify-center"
      aria-hidden="true"
    >
      <motion.div
        className="absolute h-28 w-28 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(201,169,110,0.35) 0%, transparent 70%)',
        }}
        animate={{ scale: [0.7, 1.2, 0.85], opacity: [0.2, 0.7, 0.25] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.img
        src="/logo-3d.png"
        alt=""
        className="absolute h-[92px] w-[92px] object-contain"
        initial={{ x: -72, opacity: 0, rotate: -18 }}
        animate={{ x: -18, opacity: 1, rotate: 0 }}
        transition={{ duration: 1.15, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.img
        src="/logo-3d.png"
        alt=""
        className="absolute h-[92px] w-[92px] object-contain"
        initial={{ x: 72, opacity: 0, rotate: 18 }}
        animate={{ x: 18, opacity: 1, rotate: 0 }}
        transition={{ duration: 1.15, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.div
        className="absolute h-16 w-16 rounded-full"
        style={{
          border: '1px solid rgba(201,169,110,0.55)',
          boxShadow: '0 0 24px rgba(201,169,110,0.35)',
        }}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.4, 1.15, 1], opacity: [0, 1, 0.35] }}
        transition={{ duration: 1.6, delay: 1.1, repeat: Infinity, repeatDelay: 1.4, ease: 'easeOut' }}
      />
    </div>
  )
}
