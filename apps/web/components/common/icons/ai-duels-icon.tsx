"use client";

interface Props {
  size?: number;
  className?: string;
}

export function AIDuelsIcon({ size = 24, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <style>
        {`
          @keyframes duel-glow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          .duel-left { animation: duel-glow 2s ease-in-out infinite; }
          .duel-right { animation: duel-glow 2s ease-in-out infinite 0.5s; }
          @media (prefers-reduced-motion: reduce) {
            .duel-left, .duel-right { animation: none; opacity: 1; }
          }
        `}
      </style>

      {/* Left bolt */}
      <path d="M3 12L8 6L7 11H10L5 18L6 13H3Z" fill="#a78bfa" className="duel-left" />

      {/* Right bolt (mirrored) */}
      <path d="M21 12L16 6L17 11H14L19 18L18 13H21Z" fill="#8b5cf6" className="duel-right" />

      {/* Center spark */}
      <circle cx="12" cy="12" r="1.5" fill="#c4b5fd" />
    </svg>
  );
}
