import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { luxuryEase } from '../lib/motion'

// Soft cinematic shadow under the gold glow. The black part stays light:
// a heavy black drop shadow would read as a sticker edge on the dark theme.
const MASCOT_SHADOW =
  'drop-shadow(0 0 34px rgba(201,169,110,0.32)) drop-shadow(0 16px 30px rgba(0,0,0,0.35))'

export function GlobalMascots() {
  const reducedMotion = usePrefersReducedMotion()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // The mascots are a fixed layer behind <main> (z-1 under z-10), so in the
  // Mission section the near-opaque stat/action cards render on top of the
  // CM eagle and slice its left side with a hard dark rectangle edge. The
  // PNG itself is truly transparent (corners alpha 0) — the rectangle is
  // the card edge cutting across the eagle. Fade the whole fixed layer out
  // while #connect is in view instead of letting the cards cut the art.
  const [inMission, setInMission] = useState(false)
  useEffect(() => {
    const target = document.getElementById('connect')
    if (!target || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      ([entry]) => setInMission(entry.isIntersecting && entry.intersectionRatio >= 0.15),
      { threshold: [0, 0.15, 0.4] },
    )
    io.observe(target)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (reducedMotion) return undefined
    const handleMouseMove = (e) => {
      const xPct = (e.clientX / window.innerWidth) - 0.5
      const yPct = (e.clientY / window.innerHeight) - 0.5
      mouseX.set(xPct)
      mouseY.set(yPct)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY, reducedMotion])

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
    <motion.div
      className="fixed inset-0 pointer-events-none z-[1] overflow-hidden"
      style={{ perspective: 1400 }}
      animate={{ opacity: inMission ? 0 : 1 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      <motion.div
        className="absolute top-24 -left-10 md:left-0 w-52 md:w-64 xl:w-80"
        style={reducedMotion ? { transformStyle: 'preserve-3d' } : {
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
          animate={reducedMotion ? { y: 0 } : { y: [-10, 10], scale: [1, 1.04, 1] }}
          transition={{ duration: 6.2, repeat: reducedMotion ? 0 : Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        >
          <img
            src="/mascot-gm-transparent.png"
            alt=""
            className="w-full h-auto opacity-[0.34] md:opacity-[0.52]"
            style={{ filter: MASCOT_SHADOW }}
          />
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute -bottom-10 -right-10 md:right-0 w-52 md:w-64 xl:w-80"
        style={reducedMotion ? { transformStyle: 'preserve-3d' } : {
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
          animate={reducedMotion ? { y: 0 } : { y: [10, -10], scale: [1, 1.045, 1] }}
          transition={{ duration: 7.1, repeat: reducedMotion ? 0 : Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        >
          <img
            src="/mascot-cm-transparent.png"
            alt=""
            className="w-full h-auto opacity-[0.34] md:opacity-[0.52]"
            style={{ filter: MASCOT_SHADOW }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
