export function HeroMesh() {
  return (
    <svg
      class="hero-mesh"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="0.5" cy="0.5" r="0.3" fill="currentColor" opacity="0.1" />
        </pattern>

        <linearGradient id="fade-left" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="var(--bg)" stop-opacity="0.8" />
          <stop offset="50%" stop-color="var(--bg)" stop-opacity="0" />
        </linearGradient>

        <linearGradient id="fade-right" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="var(--bg)" stop-opacity="0.8" />
          <stop offset="50%" stop-color="var(--bg)" stop-opacity="0" />
        </linearGradient>

        <linearGradient id="fade-top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="var(--bg)" stop-opacity="0.8" />
          <stop offset="50%" stop-color="var(--bg)" stop-opacity="0" />
        </linearGradient>

        <linearGradient id="fade-bottom" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="var(--bg)" stop-opacity="0.8" />
          <stop offset="50%" stop-color="var(--bg)" stop-opacity="0" />
        </linearGradient>

        <radialGradient id="accent-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.08" />
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
        </radialGradient>
      </defs>

      <rect width="100" height="100" fill="url(#grid)" class="text-[var(--text)]" />

      <ellipse cx="50" cy="50" rx="40" ry="30" fill="url(#accent-glow)" />

      <rect x="0" y="0" width="30" height="100" fill="url(#fade-left)" />
      <rect x="70" y="0" width="30" height="100" fill="url(#fade-right)" />
      <rect x="0" y="0" width="100" height="30" fill="url(#fade-top)" />
      <rect x="0" y="70" width="100" height="30" fill="url(#fade-bottom)" />

      <line
        x1="20"
        y1="30"
        x2="80"
        y2="30"
        stroke="var(--accent)"
        stroke-width="0.15"
        stroke-opacity="0.2"
        stroke-dasharray="2 4"
      />
      <line
        x1="15"
        y1="70"
        x2="85"
        y2="70"
        stroke="var(--accent)"
        stroke-width="0.15"
        stroke-opacity="0.15"
        stroke-dasharray="3 5"
      />
    </svg>
  );
}
