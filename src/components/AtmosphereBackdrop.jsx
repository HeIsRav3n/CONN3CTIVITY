export function AtmosphereBackdrop({ opacity = 0.28 }) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div
        className="cinematic-aurora cinematic-aurora-a"
        style={{ opacity }}
      />
      <div
        className="cinematic-aurora cinematic-aurora-b"
        style={{ opacity: opacity * 0.85 }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 65% at 50% 45%, rgba(11,10,8,0.18) 0%, rgba(11,10,8,0.88) 100%)',
        }}
      />
    </div>
  )
}
