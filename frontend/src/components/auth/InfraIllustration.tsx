/**
 * Hand-authored infrastructure-themed SVG for the login branding panel.
 * Depicts a server stack connected to nodes (VMs / apps) — echoing the
 * topology graph in the app. Pure SVG, no external assets.
 */
export default function InfraIllustration() {
  return (
    <svg
      viewBox="0 0 420 360"
      width="100%"
      style={{ maxWidth: 420, height: "auto" }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rackGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="nodeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>
      </defs>

      {/* connection lines (behind everything) */}
      <g stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2">
        <line x1="150" y1="120" x2="300" y2="70" />
        <line x1="150" y1="150" x2="320" y2="150" />
        <line x1="150" y1="180" x2="300" y2="235" />
        <line x1="300" y1="70" x2="320" y2="150" />
        <line x1="320" y1="150" x2="300" y2="235" />
      </g>

      {/* server rack */}
      <g>
        <rect x="60" y="90" width="90" height="120" rx="10" fill="url(#rackGrad)" />
        {/* rack units */}
        {[104, 130, 156, 182].map((y) => (
          <g key={y}>
            <rect x="72" y={y} width="66" height="16" rx="3" fill="#1677ff" fillOpacity="0.15" />
            <circle cx="80" cy={y + 8} r="3" fill="#52c41a" />
            <rect x="92" y={y + 6} width="38" height="3" rx="1.5" fill="#1677ff" fillOpacity="0.4" />
          </g>
        ))}
      </g>

      {/* node 1 — VM (top right) */}
      <g>
        <circle cx="300" cy="70" r="26" fill="url(#nodeGrad)" />
        <rect x="289" y="60" width="22" height="18" rx="3" fill="#52c41a" fillOpacity="0.25" />
        <rect x="292" y="64" width="16" height="2.5" rx="1" fill="#52c41a" />
        <rect x="292" y="69" width="16" height="2.5" rx="1" fill="#52c41a" />
      </g>

      {/* node 2 — app (middle right) */}
      <g>
        <circle cx="320" cy="150" r="30" fill="url(#nodeGrad)" />
        <rect x="307" y="138" width="26" height="24" rx="4" fill="#fa8c16" fillOpacity="0.25" />
        <circle cx="320" cy="150" r="6" fill="#fa8c16" />
      </g>

      {/* node 3 — VM (bottom right) */}
      <g>
        <circle cx="300" cy="235" r="26" fill="url(#nodeGrad)" />
        <rect x="289" y="225" width="22" height="18" rx="3" fill="#722ed1" fillOpacity="0.25" />
        <rect x="292" y="229" width="16" height="2.5" rx="1" fill="#722ed1" />
        <rect x="292" y="234" width="16" height="2.5" rx="1" fill="#722ed1" />
      </g>

      {/* floating accent dots */}
      <circle cx="180" cy="60" r="4" fill="#ffffff" fillOpacity="0.6" />
      <circle cx="360" cy="110" r="5" fill="#ffffff" fillOpacity="0.5" />
      <circle cx="250" cy="300" r="4" fill="#ffffff" fillOpacity="0.6" />
      <circle cx="90" cy="250" r="5" fill="#ffffff" fillOpacity="0.4" />
    </svg>
  );
}
