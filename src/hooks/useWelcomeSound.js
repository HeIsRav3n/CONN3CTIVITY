import { useEffect } from 'react'

/**
 * Module-level singleton so React Strict Mode remounts don't kill playback mid-play.
 */
let welcomeAudio = null
let welcomePlayed = false
let welcomePlaying = false

const WELCOME_SRC = '/welcome-conn3ctivity.mp3'
const WELCOME_FALLBACK = '/welcome-conn3ctivity.ogg'

function getWelcomeAudio() {
  if (typeof window === 'undefined') return null
  if (welcomeAudio) return welcomeAudio

  const el = document.getElementById('welcome-audio')
  if (el) {
    welcomeAudio = el
    welcomeAudio.volume = 0.9
    return welcomeAudio
  }

  welcomeAudio = new Audio(WELCOME_SRC)
  welcomeAudio.preload = 'auto'
  welcomeAudio.volume = 0.9
  welcomeAudio.setAttribute('playsinline', 'true')
  welcomeAudio.setAttribute('webkit-playsinline', 'true')
  return welcomeAudio
}

async function tryPlayWelcome() {
  if (welcomePlayed || welcomePlaying) return welcomePlayed
  const audio = getWelcomeAudio()
  if (!audio) return false

  welcomePlaying = true
  try {
    audio.muted = false
    if (audio.readyState < 2) {
      try { audio.load() } catch { /* ignore */ }
    }
    try { audio.currentTime = 0 } catch { /* ignore */ }
    await audio.play()
    welcomePlayed = true
    welcomePlaying = false
    return true
  } catch {
    if (audio.src && !String(audio.src).includes('.ogg')) {
      try {
        audio.src = WELCOME_FALLBACK
        await audio.play()
        welcomePlayed = true
        welcomePlaying = false
        return true
      } catch {
        welcomePlaying = false
        return false
      }
    }
    welcomePlaying = false
    return false
  }
}

/**
 * Auto-plays welcome on load via singleton + early HTML audio.
 * Does not pause/destroy audio on effect cleanup (fixes Strict Mode killing playback).
 */
export function useWelcomeSound({ enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return undefined

    getWelcomeAudio()
    tryPlayWelcome()

    const times = [0, 80, 250, 600, 1200, 2500, 5000]
    const timers = times.map((ms) => window.setTimeout(() => tryPlayWelcome(), ms))

    const onCanPlay = () => tryPlayWelcome()
    const audio = getWelcomeAudio()
    audio?.addEventListener('canplaythrough', onCanPlay)

    const onPageShow = () => tryPlayWelcome()
    window.addEventListener('pageshow', onPageShow)

    // Invisible unlock: many browsers count document visibility / focus as engagement
    const onFocus = () => tryPlayWelcome()
    window.addEventListener('focus', onFocus)

    return () => {
      timers.forEach(clearTimeout)
      audio?.removeEventListener('canplaythrough', onCanPlay)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('focus', onFocus)
      // Never pause the singleton here
    }
  }, [enabled])
}

/** Call from index.html inline script as early as possible */
export function bootWelcomeSound() {
  if (typeof window === 'undefined') return
  getWelcomeAudio()
  tryPlayWelcome()
}
