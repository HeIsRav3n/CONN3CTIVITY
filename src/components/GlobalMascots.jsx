import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { luxuryEase } from '../lib/motion'

export function GlobalMascots() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  useEffect(() => {
    const handleMouseMove = (e) => {
      const xPct = (e.clientX / window.innerWidth) - 0.5
      const yPct = (e.clientY / window.innerHeight) - 0.5
      mouseX.set(xPct)
      mouseY.set(yPct)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  const springConfig = { damping: 20, stiffness: 110, mass: 0.85 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  const gmX = useTransform(smoothX, [-0.5, 0.5], [-28, 28])
  const gmY = useTransform(smoothY, [-0.5, 0.5], [-22, 22])
  const gmRotateY = useTransform(smoothX, [-0.5, 0.5], [-18, 18])
  const gmRotateX = useTransform(smoothY, [-0.5, 0.5], [12, -12])

  const cmX = useTransform(smoothX, [-0.5, 0.5], [32, -32])
  const cmY = useTransform(smoothY, [-0.5, 0.5], [24, -24])
  const cmRotateY = useTransform(smoothX, [-0.5, 0.5], [18, -18])
  const cmRotateX = useTransform(smoothY, [-0.5, 0.5], [-12, 12])

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden" style={{ perspective: 1400 }}>
      <motion.div
        className="absolute top-24 -left-10 md:left-0 opacity-[0.34] md:opacity-[0.52] w-52 md:w-64 xl:w-80"
        style={{
          x: gmX,
          y: gmY,
          rotateX: gmRotateX,
          rotateY: gmRotateY,
          transformStyle: 'preserve-3d',
        }}
        initial={{ opacity: 0, filter: 'blur(16px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 1.2, ease: luxuryEase }}
      >
        <motion.div
          animate={{ y: [-10, 10], scale: [1, 1.04, 1] }}
          transition={{ duration: 6.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        >
          <img
            src="/mascot-gm-transparent.png"
            alt=""
            className="w-full h-auto"
            style={{ filter: 'drop-shadow(0 0 34px rgba(201,169,110,0.32)) drop-shadow(0 22px 32px rgba(0,0,0,0.55))' }}
          />
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute -bottom-10 -right-10 md:right-0 opacity-[0.34] md:opacity-[0.52] w-52 md:w-64 xl:w-80"
        style={{
          x: cmX,
          y: cmY,
          rotateX: cmRotateX,
          rotateY: cmRotateY,
          transformStyle: 'preserve-3d',
        }}
        initial={{ opacity: 0, filter: 'blur(16px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 1.3, delay: 0.12, ease: luxuryEase }}
      >
        <motion.div
          animate={{ y: [10, -10], scale: [1, 1.045, 1] }}
          transition={{ duration: 7.1, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        >
          <img
            src="/mascot-cm-transparent.png"
            alt=""
            className="w-full h-auto"
            style={{ filter: 'drop-shadow(0 0 34px rgba(201,169,110,0.32)) drop-shadow(0 22px 32px rgba(0,0,0,0.55))' }}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}
