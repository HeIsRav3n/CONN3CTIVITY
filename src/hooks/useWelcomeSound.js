import { useEffect, useRef } from 'react'

const WELCOME_SRC = '/welcome-conn3ctivity.ogg'
const STORAGE_KEY = 'conn3ctivity_welcome_played_at'

/**
 * Plays the Discord soundboard "Welcome to connectivity" on each page load.
 * If the browser blocks autoplay, unlocks on the first user gesture.
 */
export function useWelcomeSound({ enabled = true } = {}) {
  const playedRef = useRef(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined

    const audio = new Audio(WELCOME_SRC)
    audio.preload = 'auto'
    audio.volume = 0.85

    const play = async () => {
      if (playedRef.current) return
      try {
        await audio.play()
        playedRef.current = true
        try {
          sessionStorage.setItem(STORAGE_KEY, String(Date.now()))
        } catch {
          // ignore storage errors
        }
        cleanup()
      } catch {
        // Autoplay blocked — wait for gesture
      }
    }

    const onGesture = () => {
      play()
    }

    const cleanup = () => {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
      window.removeEventListener('touchstart', onGesture)
    }

    // Try immediately (works when browser allows autoplay with sound)
    play()

    window.addEventListener('pointerdown', onGesture, { passive: true })
    window.addEventListener('keydown', onGesture)
    window.addEventListener('touchstart', onGesture, { passive: true })

    return () => {
      cleanup()
      audio.pause()
      audio.src = ''
    }
  }, [enabled])
}
