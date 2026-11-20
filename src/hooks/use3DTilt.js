import { useMotionValue, useSpring, useTransform } from 'framer-motion'

// 3D tilt driven by framer-motion MotionValues. No ref is involved: the
// mouse handler measures the element from event.currentTarget, so the
// object returned here contains no ref value and render may safely read
// rotateX / rotateY and pass the handlers to JSX (react-hooks/refs stays
// clean). Callers must not attach a ref for this hook; there is none.
export function use3DTilt(springConfig = { damping: 20, stiffness: 200, mass: 0.5 }, maxTilt = 15) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x, springConfig)
  const mouseYSpring = useSpring(y, springConfig)

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [maxTilt, -maxTilt])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-maxTilt, maxTilt])

  const handleMouseMove = (e) => {
    const el = e?.currentTarget
    if (!el || typeof el.getBoundingClientRect !== 'function') return
    const rect = el.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return { rotateX, rotateY, handleMouseMove, handleMouseLeave }
}
