const KEY = 'conn3ctivity_sound_muted'
const listeners = new Set()

function readMuted() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

let muted = typeof window !== 'undefined' ? readMuted() : false

export function isSoundMuted() {
  return muted
}

export function setSoundMuted(next) {
  muted = Boolean(next)
  try {
    localStorage.setItem(KEY, muted ? '1' : '0')
  } catch {
    // ignore quota / private mode
  }
  listeners.forEach((fn) => {
    try { fn(muted) } catch { /* ignore */ }
  })

  if (typeof document !== 'undefined') {
    const welcome = document.getElementById('welcome-audio')
    if (welcome) {
      welcome.muted = muted
      if (muted) {
        try { welcome.pause() } catch { /* ignore */ }
      }
    }
  }
}

export function toggleSoundMuted() {
  setSoundMuted(!muted)
  return muted
}

export function subscribeSoundMuted(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
