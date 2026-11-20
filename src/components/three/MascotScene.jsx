import { motion } from 'framer-motion'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

// MascotScene — a pure CSS 3D card for the transparent mascot art.
//
// The mascots are flat illustrated PNGs with true transparency, so a
// WebGL canvas rendering a textured plane adds nothing except a renderer,
// a context and a failure mode. This card floats and tilts in plain CSS
// with a gold glow and a soft cinematic ground shadow, and it works on
// every device, including browsers without WebGL.
export function MascotScene({ src, alt, hover = false, className = '' }) {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <div className={className} style={{ perspective: 800 }}>
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={reducedMotion ? { y: 0 } : { y: [0, -8, 0] }}
        transition={{ duration: 5.5, repeat: reducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: hover ? -10 : 0, rotateX: hover ? 6 : 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 160 }}
        >
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-contain"
            style={{ filter: 'drop-shadow(0 0 26px rgba(201,169,110,0.35))' }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '18%',
              right: '18%',
              bottom: '3%',
              height: '7%',
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, transparent 70%)',
              filter: 'blur(3px)',
              pointerEvents: 'none',
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}
