import { useEffect, useState } from 'react'

export function HoneypotTarpit({ state }) {
  const [timeLeft, setTimeLeft] = useState(0)
  const [logs, setLogs] = useState([])
  const [glitch, setGlitch] = useState(false)


  useEffect(() => {
    if (state === 'breach') {
      let count = 5
      
      const glitcheffect = setInterval(() => setGlitch(g => !g), 150)
      
      const interval = setInterval(() => {
        setLogs(prev => [...prev, `[SYSTEM] Tracing IP origin... isolations active. Shutdown in ${count}s`])
        count--
        if (count < 0) {
          clearInterval(interval)
          // Trigger shutdown locally
          const unlockTime = Date.now() + 5 * 60 * 1000 // 5 minutes
          localStorage.setItem('tarpit_timeout', unlockTime)
          window.location.href = '/' // Redirect to home to trigger reboot mode
        }
      }, 1000)
      return () => {
        clearInterval(interval)
        clearInterval(glitcheffect)
      }
    }

    if (state === 'rebooting') {
      const unlockTime = parseInt(localStorage.getItem('tarpit_timeout') || '0', 10)
      
      const interval = setInterval(() => {
        const remaining = Math.floor((unlockTime - Date.now()) / 1000)
        if (remaining <= 0) {
          localStorage.removeItem('tarpit_timeout')
          window.location.reload()
        } else {
          setTimeLeft(remaining)
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [state])

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  return (
    <div className="fixed inset-0 bg-[#050000] z-[9999] flex flex-col items-center justify-center p-6" style={{ fontFamily: '"Courier New", Courier, monospace' }}>
      
      {/* CRT Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

      {state === 'breach' ? (
        <div className={`w-full max-w-3xl ${glitch ? 'translate-x-1 -translate-y-1' : ''}`}>
          <h1 className="text-5xl font-black mb-2 text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse">
            CRITICAL SECURITY ALERT
          </h1>
          <h2 className="text-2xl text-red-500 mb-8 border-b border-red-900 pb-4">
            UNAUTHORIZED ACCESS DETECTED AT {window.location.pathname.toUpperCase()}
          </h2>
          
          <div className="bg-red-950/20 p-6 border border-red-900/50 rounded flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
            <div className="text-red-400 opacity-80">{'>'} MALICIOUS PAYLOAD INTERCEPTED</div>
            <div className="text-red-400 opacity-80">{'>'} DEFENSE PROTOCOL ALPHA ENGAGED</div>
            <div className="text-red-400 opacity-80">{'>'} LOGGING CONNECTION METADATA...</div>
            {logs.map((log, i) => (
              <div key={i} className="text-red-500 font-bold">{'>'} {log}</div>
            ))}
            <div className="text-white bg-red-600 inline-block px-2 py-1 mt-4 animate-bounce self-start font-bold uppercase">
              {'>'} INITIATING EMERGENCY SHUTDOWN...
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-2xl text-center">
          <div className="w-24 h-24 mx-auto border-4 border-red-900 rounded-full flex items-center justify-center mb-8 relative">
            <div className="absolute inset-2 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-red-500">🛡️</span>
          </div>

          <h1 className="text-3xl font-bold mb-4 text-red-500 tracking-widest uppercase drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
            SYSTEM IN LOCKDOWN
          </h1>
          <p className="mb-10 text-red-400/70 text-sm tracking-widest uppercase">
            The platform has been temporarily shut down locally to protect against a detected threat.
          </p>
          
          <div className="text-7xl font-bold mb-12 text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)] flex justify-center gap-4">
            <span>{mins.toString().padStart(2, '0')}</span>
            <span className="animate-pulse">:</span>
            <span>{secs.toString().padStart(2, '0')}</span>
          </div>
          
          <p className="text-xs text-red-500/50 uppercase tracking-[0.5em] animate-pulse">
            Hot restart initiated... Stand by.
          </p>
        </div>
      )}
    </div>
  )
}
