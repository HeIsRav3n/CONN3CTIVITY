import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

/**
 * CursorGlow — a soft radial gradient that follows the mouse.
 * Uses raw DOM manipulation (no React state) so it never causes re-renders.
 *
 * The large aura lags behind the pointer for a smooth trailing feel;
 * the small dot snaps to the pointer so it stays precise. Positioning
 * uses transform: translate3d() (compositor only) instead of left/top.
 */
export function CursorGlow() {
  const reducedMotion = usePrefersReducedMotion()
  const glowRef = useRef(null)
  const dotRef = useRef(null)
  const target = useRef({ x: -400, y: -400 })
  const glowPos = useRef({ x: -400, y: -400 })
  const rafId = useRef(null)

  useEffect(() => {
    if (reducedMotion) return undefined

    const onMove = (e) => {
      target.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove, { passive: true })

    // Smooth animation loop
    const tick = () => {
      // Large aura — lag behind slightly for smoothness
      glowPos.current.x += (target.current.x - glowPos.current.x) * 0.07
      glowPos.current.y += (target.current.y - glowPos.current.y) * 0.07

      if (glowRef.current) {
        glowRef.current.style.transform =
          `translate3d(${glowPos.current.x}px, ${glowPos.current.y}px, 0) translate(-50%, -50%)`
      }
      if (dotRef.current) {
        dotRef.current.style.transform =
          `translate3d(${target.current.x}px, ${target.current.y}px, 0) translate(-50%, -50%)`
      }
      rafId.current = requestAnimationFrame(tick)
    }
    rafId.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId.current)
    }
  }, [reducedMotion])

  if (reducedMotion) return null

  return (
    <>
      {/* Large ambient glow */}
      <div
        ref={glowRef}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          pointerEvents: 'none',
          zIndex: 9998,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,169,110,0.055) 0%, rgba(168,85,247,0.025) 40%, transparent 70%)',
          transform: 'translate3d(-400px, -400px, 0) translate(-50%, -50%)',
          mixBlendMode: 'screen',
          willChange: 'transform',
        }}
      />
      {/* Precise dot */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          pointerEvents: 'none',
          zIndex: 9999,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'rgba(201,169,110,0.7)',
          transform: 'translate3d(-400px, -400px, 0) translate(-50%, -50%)',
          boxShadow: '0 0 8px 3px rgba(201,169,110,0.35)',
          willChange: 'transform',
        }}
      />
    </>
  )
}
