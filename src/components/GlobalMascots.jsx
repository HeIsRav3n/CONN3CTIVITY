import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

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

  const springConfig = { damping: 22, stiffness: 120, mass: 0.8 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  const gmX = useTransform(smoothX, [-0.5, 0.5], [-22, 22])
  const gmY = useTransform(smoothY, [-0.5, 0.5], [-18, 18])
  const gmRotateY = useTransform(smoothX, [-0.5, 0.5], [-16, 16])
  const gmRotateX = useTransform(smoothY, [-0.5, 0.5], [10, -10])

  const cmX = useTransform(smoothX, [-0.5, 0.5], [26, -26])
  const cmY = useTransform(smoothY, [-0.5, 0.5], [20, -20])
  const cmRotateY = useTransform(smoothX, [-0.5, 0.5], [16, -16])
  const cmRotateX = useTransform(smoothY, [-0.5, 0.5], [-10, 10])

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden" style={{ perspective: 1200 }}>
      <motion.div
        className="absolute top-24 -left-10 md:left-0 opacity-[0.22] md:opacity-[0.38] w-52 md:w-64 xl:w-80"
        style={{
          x: gmX,
          y: gmY,
          rotateX: gmRotateX,
          rotateY: gmRotateY,
          transformStyle: 'preserve-3d',
        }}
        animate={{ y: ['-3%', '3%'], scale: [1, 1.035, 1] }}
        transition={{ duration: 5.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      >
        <img
          src="/mascot-gm-transparent.png"
          alt=""
          className="w-full h-auto"
          style={{ filter: 'drop-shadow(0 0 28px rgba(201,169,110,0.28)) drop-shadow(0 18px 28px rgba(0,0,0,0.5))' }}
        />
      </motion.div>

      <motion.div
        className="absolute -bottom-10 -right-10 md:right-0 opacity-[0.22] md:opacity-[0.38] w-52 md:w-64 xl:w-80"
        style={{
          x: cmX,
          y: cmY,
          rotateX: cmRotateX,
          rotateY: cmRotateY,
          transformStyle: 'preserve-3d',
        }}
        animate={{ y: ['3%', '-3%'], scale: [1, 1.04, 1] }}
        transition={{ duration: 6.4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      >
        <img
          src="/mascot-cm-transparent.png"
          alt=""
          className="w-full h-auto"
          style={{ filter: 'drop-shadow(0 0 28px rgba(201,169,110,0.28)) drop-shadow(0 18px 28px rgba(0,0,0,0.5))' }}
        />
      </motion.div>
    </div>
  )
}
