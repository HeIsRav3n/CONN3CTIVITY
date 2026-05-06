import './VennAtmosphere.css';

export function VennAtmosphere() {
  return (
    <div className="venn-wrapper">
      <svg className="venn-svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Gradients */}
          <linearGradient id="vennGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4af37" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#7b3fe4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="vennGradRight" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7b3fe4" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#d4af37" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>

          {/* Core glow filter */}
          <filter id="vennGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Brighter overlap center glow */}
          <radialGradient id="vennOverlapGlow">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
            <stop offset="40%" stopColor="#d4af37" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#7b3fe4" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className="venn-color-shift" filter="url(#vennGlow)">
          {/* Overlap background glow */}
          <ellipse cx="400" cy="300" rx="60" ry="140" fill="url(#vennOverlapGlow)" />

          {/* Connecting line / energy trail */}
          <line x1="400" y1="100" x2="400" y2="500" stroke="#d4af37" strokeWidth="0.5" opacity="0.15" strokeDasharray="2 6" />
          
          <line x1="200" y1="300" x2="600" y2="300" stroke="#7b3fe4" strokeWidth="0.5" opacity="0.1" strokeDasharray="1 4" />

          {/* Left Circle */}
          <g className="venn-group-left">
            <circle cx="350" cy="300" r="180" fill="none" stroke="url(#vennGradLeft)" strokeWidth="1.2" />
            <circle cx="350" cy="300" r="175" fill="none" stroke="url(#vennGradLeft)" strokeWidth="0.5" opacity="0.5" strokeDasharray="1 10" />
            {/* Particles */}
            <g className="venn-particle-1">
              <circle cx="530" cy="300" r="1.5" fill="#fff" filter="drop-shadow(0 0 4px #d4af37)" />
              <circle cx="170" cy="300" r="1" fill="#fff" opacity="0.6" filter="drop-shadow(0 0 2px #d4af37)" />
            </g>
          </g>

          {/* Right Circle */}
          <g className="venn-group-right">
            <circle cx="450" cy="300" r="180" fill="none" stroke="url(#vennGradRight)" strokeWidth="1.2" />
            <circle cx="450" cy="300" r="175" fill="none" stroke="url(#vennGradRight)" strokeWidth="0.5" opacity="0.5" strokeDasharray="1 10" />
            {/* Particles */}
            <g className="venn-particle-2">
              <circle cx="270" cy="300" r="1.5" fill="#fff" filter="drop-shadow(0 0 4px #7b3fe4)" />
              <circle cx="630" cy="300" r="1" fill="#fff" opacity="0.6" filter="drop-shadow(0 0 2px #7b3fe4)" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
