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

  const springConfig = { damping: 25, stiffness: 100, mass: 1 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  // GM Mascot Parallax
  const gmX = useTransform(smoothX, [-0.5, 0.5], [-30, 30])
  const gmY = useTransform(smoothY, [-0.5, 0.5], [-30, 30])
  const gmRotateX = useTransform(smoothY, [-0.5, 0.5], [10, -10])
  const gmRotateY = useTransform(smoothX, [-0.5, 0.5], [-10, 10])

  // CM Mascot Parallax (reverse)
  const cmX = useTransform(smoothX, [-0.5, 0.5], [40, -40])
  const cmY = useTransform(smoothY, [-0.5, 0.5], [40, -40])
  const cmRotateX = useTransform(smoothY, [-0.5, 0.5], [-15, 15])
  const cmRotateY = useTransform(smoothX, [-0.5, 0.5], [15, -15])

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden" style={{ perspective: '1000px' }}>
      <motion.div 
        className="absolute top-24 -left-10 md:left-0 opacity-20 md:opacity-30 w-56 md:w-72 xl:w-96"
        style={{
          x: gmX,
          y: gmY,
          rotateX: gmRotateX,
          rotateY: gmRotateY,
          transformStyle: 'preserve-3d'
        }}
        animate={{
          y: ["-5%", "5%"],
          rotateZ: [-2, 2],
        }}
        transition={{
          y: { duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
          rotateZ: { duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
        }}
      >
        <img 
          src="/mascot-gm-transparent.png" 
          alt="GM Mascot" 
          className="w-full h-auto" 
          style={{ filter: 'drop-shadow(0px 20px 30px rgba(237,232,220,0.1))' }}
        />
      </motion.div>

      <motion.div 
        className="absolute -bottom-10 -right-10 md:right-0 opacity-20 md:opacity-30 w-56 md:w-72 xl:w-96"
        style={{
          x: cmX,
          y: cmY,
          rotateX: cmRotateX,
          rotateY: cmRotateY,
          transformStyle: 'preserve-3d'
        }}
        animate={{
          y: ["5%", "-5%"],
          rotateZ: [2, -2],
        }}
        transition={{
          y: { duration: 5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
          rotateZ: { duration: 7, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
        }}
      >
        <img 
          src="/mascot-cm-transparent.png" 
          alt="CM Mascot" 
          className="w-full h-auto"
          style={{ filter: 'drop-shadow(0px -20px 30px rgba(220,180,90,0.1))' }} 
        />
      </motion.div>
    </div>
  )
}
