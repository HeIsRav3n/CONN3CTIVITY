import { useEffect, useRef } from 'react'

const WELCOME_SRC = '/welcome-conn3ctivity.mp3'
const WELCOME_FALLBACK = '/welcome-conn3ctivity.ogg'

/**
 * Auto-plays "Welcome to Conn3ctivity" when the site loads.
 * Retries briefly after mount; if the browser blocks sound, plays on the first gesture.
 */
export function useWelcomeSound({ enabled = true } = {}) {
  const playedRef = useRef(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined

    const audio = new Audio(WELCOME_SRC)
    audio.preload = 'auto'
    audio.volume = 0.9
    audio.setAttribute('playsinline', 'true')

    let cancelled = false
    let retryTimer = null

    const markPlayed = () => {
      playedRef.current = true
      cleanup()
    }

    const play = async () => {
      if (cancelled || playedRef.current) return true
      try {
        audio.muted = false
        if (audio.readyState === 0) audio.load()
        audio.currentTime = 0
        await audio.play()
        markPlayed()
        return true
      } catch {
        // Try OGG if MP3 failed to decode
        if (audio.src && !audio.src.endsWith(WELCOME_FALLBACK)) {
          audio.src = WELCOME_FALLBACK
          try {
            await audio.play()
            markPlayed()
            return true
          } catch {
            // still blocked
          }
        }
        return false
      }
    }

    const onGesture = () => { play() }
    const onReady = () => { play() }

    const cleanup = () => {
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
      window.removeEventListener('touchstart', onGesture)
      window.removeEventListener('scroll', onGesture)
      window.removeEventListener('pageshow', onReady)
      document.removeEventListener('visibilitychange', onVis)
      audio.removeEventListener('canplaythrough', onReady)
      if (retryTimer) {
        window.clearInterval(retryTimer)
        retryTimer = null
      }
    }

    const onVis = () => {
      if (document.visibilityState === 'visible') onReady()
    }

    audio.addEventListener('canplaythrough', onReady)
    window.addEventListener('pageshow', onReady)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pointerdown', onGesture, { passive: true })
    window.addEventListener('keydown', onGesture)
    window.addEventListener('touchstart', onGesture, { passive: true })
    window.addEventListener('scroll', onGesture, { passive: true, once: true })

    audio.load()
    play()

    // Retry for a few seconds while media decodes / policies settle
    let ticks = 0
    retryTimer = window.setInterval(() => {
      ticks += 1
      if (playedRef.current || cancelled || ticks > 20) {
        window.clearInterval(retryTimer)
        retryTimer = null
        return
      }
      play()
    }, 400)

    const t1 = window.setTimeout(() => play(), 150)
    const t2 = window.setTimeout(() => play(), 600)

    return () => {
      cancelled = true
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      cleanup()
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
  }, [enabled])
}
