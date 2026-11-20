import { useEffect, useRef, useState } from 'react'

export function HoneypotTarpit({ state }) {
  const [timeLeft, setTimeLeft] = useState(0)
  const [logs, setLogs] = useState([])
  const [glitch, setGlitch] = useState(false)
  const headingRef = useRef(null)
  const [reducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )

  // Move focus into the takeover so screen readers announce it at once.
  useEffect(() => {
    headingRef.current?.focus()
  }, [state])

  useEffect(() => {
    if (state === 'breach') {
      let count = 5

      const glitcheffect = reducedMotion
        ? null
        : setInterval(() => setGlitch(g => !g), 150)

      const interval = setInterval(() => {
        setLogs(prev => [...prev.slice(-6), `[SYSTEM] Tracing IP origin... isolations active. Shutdown in ${count}s`])
        count--
        if (count < 0) {
          clearInterval(interval)
          // Trigger shutdown locally
          const unlockTime = Date.now() + 5 * 60 * 1000 // 5 minutes
          try { localStorage.setItem('tarpit_timeout', String(unlockTime)) } catch { /* private mode */ }
          window.location.href = '/' // Redirect to home to trigger reboot mode
        }
      }, 1000)
      return () => {
        clearInterval(interval)
        if (glitcheffect) clearInterval(glitcheffect)
      }
    }

    if (state === 'rebooting') {
      let unlockTime = 0
      try {
        unlockTime = parseInt(localStorage.getItem('tarpit_timeout') || '0', 10) || 0
      } catch { /* private mode */ }

      const interval = setInterval(() => {
        const remaining = Math.floor((unlockTime - Date.now()) / 1000)
        if (remaining <= 0) {
          try { localStorage.removeItem('tarpit_timeout') } catch { /* private mode */ }
          window.location.reload()
        } else {
          setTimeLeft(remaining)
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [state, reducedMotion])

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const countdownLabel = `Lockdown ends in ${mins} minutes ${secs} seconds`

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="tarpit-heading"
      aria-describedby="tarpit-description"
      className="fixed inset-0 bg-[#050000] z-[9999] flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ fontFamily: '"Courier New", Courier, monospace' }}
    >

      {/* CRT Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" aria-hidden="true" />

      {state === 'breach' ? (
        <div className={`relative w-full max-w-3xl ${glitch ? 'translate-x-1 -translate-y-1' : ''}`}>
          <h1
            id="tarpit-heading"
            ref={headingRef}
            tabIndex={-1}
            className={`text-3xl sm:text-5xl font-black mb-2 text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)] break-words ${reducedMotion ? '' : 'animate-pulse'}`}
          >
            CRITICAL SECURITY ALERT
          </h1>
          <h2 id="tarpit-description" className="text-lg sm:text-2xl text-red-500 mb-8 border-b border-red-900 pb-4 break-words">
            UNAUTHORIZED ACCESS DETECTED AT {window.location.pathname.toUpperCase()}
          </h2>

          <div className="bg-red-950/20 p-4 sm:p-6 border border-red-900/50 rounded flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-red-500/5 animate-pulse" aria-hidden="true" />
            <div className="relative text-red-400 opacity-80 break-words">{'>'} MALICIOUS PAYLOAD INTERCEPTED</div>
            <div className="relative text-red-400 opacity-80 break-words">{'>'} DEFENSE PROTOCOL ALPHA ENGAGED</div>
            <div className="relative text-red-400 opacity-80 break-words">{'>'} LOGGING CONNECTION METADATA...</div>
            <div role="log" aria-live="polite" className="relative flex flex-col gap-2">
              {logs.map((log, i) => (
                <div key={i} className="text-red-500 font-bold break-words">{'>'} {log}</div>
              ))}
            </div>
            <div className={`relative text-white bg-red-600 inline-block px-2 py-1 mt-4 self-start font-bold uppercase break-words ${reducedMotion ? '' : 'animate-bounce'}`}>
              {'>'} INITIATING EMERGENCY SHUTDOWN...
            </div>
          </div>
        </div>
      ) : (
        <div className="relative w-full max-w-2xl text-center">
          <div className="w-24 h-24 mx-auto border-4 border-red-900 rounded-full flex items-center justify-center mb-8 relative" aria-hidden="true">
            <div className={`absolute inset-2 border-4 border-red-500 border-t-transparent rounded-full ${reducedMotion ? '' : 'animate-spin'}`} />
            <span className="text-red-500">🛡️</span>
          </div>
          <span className="sr-only">System locked</span>

          <h1
            id="tarpit-heading"
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl sm:text-3xl font-bold mb-4 text-red-500 tracking-widest uppercase drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] break-words"
          >
            SYSTEM IN LOCKDOWN
          </h1>
          <p id="tarpit-description" className="mb-10 text-red-400/70 text-sm tracking-widest uppercase break-words">
            The platform has been temporarily shut down locally to protect against a detected threat.
          </p>

          <div
            role="status"
            aria-live="polite"
            aria-label={countdownLabel}
            className="text-5xl sm:text-7xl font-bold mb-12 text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)] flex justify-center gap-2 sm:gap-4 tabular-nums"
          >
            <span>{mins.toString().padStart(2, '0')}</span>
            <span className={reducedMotion ? '' : 'animate-pulse'} aria-hidden="true">:</span>
            <span>{secs.toString().padStart(2, '0')}</span>
          </div>

          <p className={`text-xs text-red-500/50 uppercase tracking-[0.5em] break-words ${reducedMotion ? '' : 'animate-pulse'}`}>
            Hot restart initiated... Stand by.
          </p>
        </div>
      )}
    </div>
  )
}
