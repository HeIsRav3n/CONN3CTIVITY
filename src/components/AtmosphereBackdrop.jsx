import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

// The vignette is a full screen radial wash, so its radii need to follow the
// viewport: on narrow screens the fixed desktop radii leave the edges
// uncovered and the wash reads as a hard band.
function useNarrowViewport() {
  const [narrow, setNarrow] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 768px)').matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia('(max-width: 768px)')
    const onChange = () => setNarrow(mq.matches)
    onChange()
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  return narrow
}

export function AtmosphereBackdrop({ opacity = 0.28 }) {
  const reducedMotion = usePrefersReducedMotion()
  const narrow = useNarrowViewport()

  // Wider, taller wash on small screens so the vignette still covers the
  // section edges instead of collapsing into a band.
  const vignette = narrow
    ? 'radial-gradient(ellipse 130% 95% at 50% 45%, rgba(11,10,8,0.18) 0%, rgba(11,10,8,0.88) 100%)'
    : 'radial-gradient(ellipse 75% 65% at 50% 45%, rgba(11,10,8,0.18) 0%, rgba(11,10,8,0.88) 100%)'

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {!reducedMotion && (
        <>
          <div
            className="cinematic-aurora cinematic-aurora-a"
            style={{ opacity }}
          />
          <div
            className="cinematic-aurora cinematic-aurora-b"
            style={{ opacity: opacity * 0.85 }}
          />
        </>
      )}
      <div
        className="absolute inset-0"
        style={{ background: vignette }}
      />
    </div>
  )
}
