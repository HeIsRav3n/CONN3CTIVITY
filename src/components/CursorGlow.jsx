import { useEffect, useRef } from 'react'

/**
 * CursorGlow — a soft radial gradient that follows the mouse.
 * Uses raw DOM manipulation (no React state) so it never causes re-renders.
 */
export function CursorGlow() {
  const glowRef = useRef(null)
  const dotRef = useRef(null)
  const pos = useRef({ x: -400, y: -400 })
  const dotPos = useRef({ x: -400, y: -400 })
  const rafId = useRef(null)

  useEffect(() => {
    const onMove = (e) => {
      pos.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove, { passive: true })

    // Smooth animation loop
    const tick = () => {
      // Large aura — lag behind slightly for smoothness
      dotPos.current.x += (pos.current.x - dotPos.current.x) * 0.07
      dotPos.current.y += (pos.current.y - dotPos.current.y) * 0.07

      if (glowRef.current) {
        glowRef.current.style.left = `${pos.current.x}px`
        glowRef.current.style.top = `${pos.current.y}px`
      }
      if (dotRef.current) {
        dotRef.current.style.left = `${dotPos.current.x}px`
        dotRef.current.style.top = `${dotPos.current.y}px`
      }
      rafId.current = requestAnimationFrame(tick)
    }
    rafId.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId.current)
    }
  }, [])

  return (
    <>
      {/* Large ambient glow */}
      <div
        ref={glowRef}
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: 9998,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,169,110,0.055) 0%, rgba(168,85,247,0.025) 40%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          mixBlendMode: 'screen',
          willChange: 'left, top',
        }}
      />
      {/* Precise dot */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: 9999,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'rgba(201,169,110,0.7)',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 8px 3px rgba(201,169,110,0.35)',
          willChange: 'left, top',
        }}
      />
    </>
  )
}
