import './VennAtmosphere.css'

const CX1 = 285   // left circle center x
const CX2 = 615   // right circle center x
const CY  = 250   // shared center y
const R   = 200   // radius

// Intersection points (x=450, y=250±113)
const IX  = (CX1 + CX2) / 2          // 450
const IY1 = CY - Math.round(Math.sqrt(R * R - ((CX2 - CX1) / 2) ** 2))  // 137
const IY2 = CY + Math.round(Math.sqrt(R * R - ((CX2 - CX1) / 2) ** 2))  // 363

// Text anchor positions
const CONN_X    = (CX1 - R + (CX2 - R)) / 2   // center of left non-overlap  ≈ 250
const THREE_X   = IX                             // 450
const CTIV_X    = ((CX1 + R) + (CX2 + R)) / 2  // center of right non-overlap ≈ 650
const TEXT_Y    = CY + 10                        // slight baseline shift

export function VennAtmosphere() {
  const lensMask = `M ${IX} ${IY1} A ${R} ${R} 0 0 1 ${IX} ${IY2} A ${R} ${R} 0 0 1 ${IX} ${IY1} Z`

  return (
    <div className="venn-wrapper">
      <svg
        className="venn-svg"
        viewBox="0 0 900 500"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          {/* Left circle gradient */}
          <linearGradient id="vgL" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#EDE8DC" stopOpacity="0.9" />
            <stop offset="60%"  stopColor="#C9A96E" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#E2DBD0" stopOpacity="0.2" />
          </linearGradient>

          {/* Right circle gradient */}
          <linearGradient id="vgR" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#E2DBD0" stopOpacity="0.2" />
            <stop offset="40%"  stopColor="#C9A96E" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#EDE8DC" stopOpacity="0.9" />
          </linearGradient>

          {/* Gold glow for the intersection */}
          <radialGradient id="vgLens" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#C9A96E" stopOpacity="0.18" />
            <stop offset="60%"  stopColor="#C9A96E" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#C9A96E" stopOpacity="0"    />
          </radialGradient>

          {/* Soft glow filter for the "3" */}
          <filter id="vGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Lens glow (intersection highlight) ── */}
        <path d={lensMask} fill="url(#vgLens)" />

        {/* ── Left circle (spins CW around its center) ── */}
        <g className="venn-group-left">
          <circle cx={CX1} cy={CY} r={R}
            fill="none"
            stroke="url(#vgL)"
            strokeWidth="1.4"
          />
          {/* Inner dashed echo ring */}
          <circle cx={CX1} cy={CY} r={R - 8}
            fill="none"
            stroke="rgba(237,232,220,0.12)"
            strokeWidth="0.8"
            strokeDasharray="3 18"
          />
          {/* Orbiting particle */}
          <g className="venn-particle-1">
            <circle cx={CX1} cy={CY - R} r="2.5"
              fill="#EDE8DC"
              opacity="0.7"
              filter="url(#vGlow)"
            />
          </g>
        </g>

        {/* ── Right circle (spins CCW around its center) ── */}
        <g className="venn-group-right">
          <circle cx={CX2} cy={CY} r={R}
            fill="none"
            stroke="url(#vgR)"
            strokeWidth="1.4"
          />
          <circle cx={CX2} cy={CY} r={R - 8}
            fill="none"
            stroke="rgba(237,232,220,0.12)"
            strokeWidth="0.8"
            strokeDasharray="3 18"
          />
          {/* Orbiting particle */}
          <g className="venn-particle-2">
            <circle cx={CX2} cy={CY + R} r="2.5"
              fill="#C9A96E"
              opacity="0.7"
              filter="url(#vGlow)"
            />
          </g>
        </g>

        {/* ── Vertical guide line through the intersection ── */}
        <line
          x1={IX} y1={IY1 + 20}
          x2={IX} y2={IY2 - 20}
          stroke="rgba(201,169,110,0.12)"
          strokeWidth="0.8"
          strokeDasharray="2 8"
        />

        {/* ── Static text layer — does NOT rotate ── */}
        {/* CONN */}
        <text
          x={CONN_X} y={TEXT_Y}
          fontFamily="'Josefin Sans', sans-serif"
          fontWeight="200"
          fontSize="30"
          letterSpacing="8"
          fill="rgba(237,232,220,0.70)"
          textAnchor="middle"
          className="venn-text"
        >CONN</text>

        {/* 3 — gold, in the intersection */}
        <text
          x={THREE_X} y={TEXT_Y + 4}
          fontFamily="'Josefin Sans', sans-serif"
          fontWeight="300"
          fontSize="36"
          fill="#C9A96E"
          textAnchor="middle"
          filter="url(#vGlow)"
          className="venn-text"
        >3</text>

        {/* CTIVITY */}
        <text
          x={CTIV_X} y={TEXT_Y}
          fontFamily="'Josefin Sans', sans-serif"
          fontWeight="200"
          fontSize="30"
          letterSpacing="8"
          fill="rgba(237,232,220,0.70)"
          textAnchor="middle"
          className="venn-text"
        >CTIVITY</text>
      </svg>
    </div>
  )
}
