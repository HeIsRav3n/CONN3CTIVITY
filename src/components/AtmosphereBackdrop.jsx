export function AtmosphereBackdrop({ opacity = 0.28 }) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <img
        src="/atmosphere-venn.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 65% at 50% 45%, rgba(11,10,8,0.25) 0%, rgba(11,10,8,0.88) 100%)',
        }}
      />
    </div>
  )
}
