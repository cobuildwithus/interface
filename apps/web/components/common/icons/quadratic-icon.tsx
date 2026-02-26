"use client";

interface Props {
  size?: number;
  className?: string;
}

export function QuadraticIcon({ size = 20, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <style>
        {`
          @keyframes quad-pulse {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
          }
          .quad-node { animation: quad-pulse 2s ease-in-out infinite; }
          .quad-d1 { animation-delay: 0s; }
          .quad-d2 { animation-delay: 0.15s; }
          .quad-d3 { animation-delay: 0.3s; }
          .quad-d4 { animation-delay: 0.45s; }
          @media (prefers-reduced-motion: reduce) {
            .quad-node { animation: none; opacity: 1; }
          }
        `}
      </style>

      {/* Tree branches */}
      <path
        d="M12 5 L12 9 M12 9 L6 14 M12 9 L18 14 M6 14 L4 19 M6 14 L8 19 M18 14 L16 19 M18 14 L20 19"
        stroke="#34d399"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Root node */}
      <circle cx="12" cy="5" r="2.5" fill="#10b981" className="quad-node quad-d1" />

      {/* Mid nodes */}
      <circle cx="6" cy="14" r="2" fill="#34d399" className="quad-node quad-d2" />
      <circle cx="18" cy="14" r="2" fill="#34d399" className="quad-node quad-d2" />

      {/* Leaf nodes */}
      <circle cx="4" cy="19" r="1.5" fill="#6ee7b7" className="quad-node quad-d3" />
      <circle cx="8" cy="19" r="1.5" fill="#6ee7b7" className="quad-node quad-d4" />
      <circle cx="16" cy="19" r="1.5" fill="#6ee7b7" className="quad-node quad-d3" />
      <circle cx="20" cy="19" r="1.5" fill="#6ee7b7" className="quad-node quad-d4" />
    </svg>
  );
}
