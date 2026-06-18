import { useEffect, useRef, useState } from 'react'

export function useCountUp(target, duration = 1400) {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)
  const raf = useRef(null)

  useEffect(() => {
    const from = fromRef.current
    const to   = Number(target) || 0
    if (from === to) return

    const start = performance.now()

    const step = (now) => {
      const t = Math.min((now - start) / duration, 1)
      // Ease out expo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      const val = Math.round(from + (to - from) * eased)
      setDisplay(val)
      if (t < 1) {
        raf.current = requestAnimationFrame(step)
      } else {
        fromRef.current = to
      }
    }

    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(step)

    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return display
}
