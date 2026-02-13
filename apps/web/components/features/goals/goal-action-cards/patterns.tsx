export function GoalPattern() {
  return (
    <svg
      className="absolute top-0 -left-20 h-full w-1/2"
      viewBox="0 0 150 200"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Gentle rising circles */}
      <circle cx="60" cy="180" r="4" fill="white" opacity="0.15">
        <animate attributeName="cy" values="180;40" dur="6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0.08;0" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle cx="90" cy="180" r="3" fill="white" opacity="0.12">
        <animate attributeName="cy" values="180;50" dur="5s" begin="1s" repeatCount="indefinite" />
        <animate
          attributeName="opacity"
          values="0.15;0.05;0"
          dur="5s"
          begin="1s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="75" cy="180" r="5" fill="white" opacity="0.18">
        <animate attributeName="cy" values="180;30" dur="7s" begin="2s" repeatCount="indefinite" />
        <animate
          attributeName="opacity"
          values="0.2;0.06;0"
          dur="7s"
          begin="2s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Subtle connected nodes */}
      <g opacity="0.12">
        <circle cx="50" cy="70" r="6" fill="white">
          <animate
            attributeName="opacity"
            values="0.15;0.25;0.15"
            dur="4s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="100" cy="90" r="5" fill="white">
          <animate
            attributeName="opacity"
            values="0.15;0.25;0.15"
            dur="4s"
            begin="1s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="70" cy="120" r="4" fill="white">
          <animate
            attributeName="opacity"
            values="0.15;0.25;0.15"
            dur="4s"
            begin="2s"
            repeatCount="indefinite"
          />
        </circle>
        <line x1="50" y1="70" x2="100" y2="90" stroke="white" strokeWidth="1" opacity="0.5" />
        <line x1="100" y1="90" x2="70" y2="120" stroke="white" strokeWidth="1" opacity="0.5" />
        <line x1="70" y1="120" x2="50" y2="70" stroke="white" strokeWidth="1" opacity="0.5" />
      </g>
    </svg>
  );
}

export function HowItWorksPattern() {
  return (
    <svg
      className="absolute top-0 -left-16 h-full w-1/2"
      viewBox="0 0 150 200"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Slow rotating orbital ring */}
      <circle
        cx="75"
        cy="100"
        r="50"
        stroke="white"
        strokeWidth="0.5"
        fill="none"
        opacity="0.1"
        strokeDasharray="4 6"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 75 100"
          to="360 75 100"
          dur="60s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Center node */}
      <circle cx="75" cy="100" r="12" fill="white" opacity="0.15">
        <animate attributeName="opacity" values="0.12;0.2;0.12" dur="5s" repeatCount="indefinite" />
      </circle>
      <circle cx="75" cy="100" r="6" fill="white" opacity="0.25" />

      {/* Subtle outer nodes */}
      <circle cx="110" cy="70" r="5" fill="white" opacity="0.12">
        <animate attributeName="opacity" values="0.1;0.18;0.1" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="110" cy="130" r="4" fill="white" opacity="0.1">
        <animate
          attributeName="opacity"
          values="0.08;0.15;0.08"
          dur="4s"
          begin="1s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="40" cy="80" r="4" fill="white" opacity="0.1">
        <animate
          attributeName="opacity"
          values="0.08;0.15;0.08"
          dur="4s"
          begin="2s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Faint connection lines */}
      <g opacity="0.08">
        <line x1="75" y1="100" x2="110" y2="70" stroke="white" strokeWidth="1" />
        <line x1="75" y1="100" x2="110" y2="130" stroke="white" strokeWidth="1" />
        <line x1="75" y1="100" x2="40" y2="80" stroke="white" strokeWidth="1" />
      </g>

      {/* Slow data pulse */}
      <circle r="2" fill="white" opacity="0.2">
        <animateMotion dur="4s" repeatCount="indefinite" path="M75,100 L110,70" />
        <animate attributeName="opacity" values="0.25;0.1;0" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle r="2" fill="white" opacity="0.2">
        <animateMotion dur="4s" repeatCount="indefinite" begin="1.5s" path="M75,100 L110,130" />
        <animate
          attributeName="opacity"
          values="0.25;0.1;0"
          dur="4s"
          begin="1.5s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

export function EarnPattern() {
  return (
    <svg className="absolute inset-0 size-full opacity-20" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="25" stroke="white" strokeWidth="3" fill="none" />
      <path d="M50 35 L50 65 M40 45 L50 35 L60 45" stroke="white" strokeWidth="3" fill="none" />
    </svg>
  );
}

export function PacePattern() {
  return (
    <svg className="absolute inset-0 size-full opacity-30" viewBox="0 0 100 100">
      <path d="M10 80 L30 50 L50 60 L70 30 L90 40" stroke="white" strokeWidth="3" fill="none" />
      <circle cx="70" cy="30" r="6" fill="white" />
    </svg>
  );
}

export function ActiveBriefsPattern() {
  return (
    <svg className="absolute inset-0 size-full opacity-30" viewBox="0 0 100 100">
      <rect x="20" y="20" width="25" height="30" rx="3" fill="white" />
      <rect x="55" y="35" width="25" height="30" rx="3" fill="white" fillOpacity="0.6" />
    </svg>
  );
}

export function ConversionPattern() {
  return (
    <svg className="absolute inset-0 size-full opacity-30" viewBox="0 0 100 100">
      <circle
        cx="50"
        cy="50"
        r="30"
        stroke="white"
        strokeWidth="8"
        fill="none"
        strokeDasharray="120 70"
      />
    </svg>
  );
}

export function ContributorsPattern() {
  return (
    <svg className="absolute inset-0 size-full opacity-30" viewBox="0 0 100 100">
      <circle cx="35" cy="45" r="12" fill="white" />
      <circle cx="65" cy="45" r="12" fill="white" />
      <circle cx="50" cy="65" r="10" fill="white" fillOpacity="0.6" />
    </svg>
  );
}

export function CodePattern() {
  return (
    <svg className="absolute inset-0 size-full opacity-25" viewBox="0 0 100 100">
      {/* Code brackets */}
      <path
        d="M25 35 L15 50 L25 65"
        stroke="white"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M75 35 L85 50 L75 65"
        stroke="white"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {/* Slash in middle */}
      <line x1="55" y1="30" x2="45" y2="70" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function VideoPattern() {
  return (
    <svg className="absolute inset-0 size-full opacity-25" viewBox="0 0 100 100">
      {/* Play button circle */}
      <circle cx="50" cy="50" r="28" stroke="white" strokeWidth="3" fill="none" />
      {/* Play triangle */}
      <path d="M42 35 L42 65 L68 50 Z" fill="white" />
    </svg>
  );
}

export function BudgetPattern() {
  return (
    <svg className="absolute inset-0 size-full opacity-25" viewBox="0 0 100 100">
      {/* Document */}
      <rect
        x="25"
        y="15"
        width="50"
        height="65"
        rx="4"
        stroke="white"
        strokeWidth="3"
        fill="none"
      />
      {/* Lines on document */}
      <line x1="35" y1="35" x2="65" y2="35" stroke="white" strokeWidth="2" />
      <line x1="35" y1="47" x2="65" y2="47" stroke="white" strokeWidth="2" />
      <line x1="35" y1="59" x2="55" y2="59" stroke="white" strokeWidth="2" />
      {/* Checkmark badge */}
      <circle cx="70" cy="70" r="12" fill="white" />
    </svg>
  );
}

export function DesignPattern() {
  return (
    <svg className="absolute inset-0 size-full opacity-25" viewBox="0 0 100 100">
      {/* Pen/brush */}
      <path d="M70 20 L80 30 L35 75 L25 80 L30 70 Z" stroke="white" strokeWidth="2" fill="none" />
      {/* Color palette circle */}
      <circle cx="30" cy="35" r="15" stroke="white" strokeWidth="2" fill="none" />
      <circle cx="30" cy="35" r="5" fill="white" />
    </svg>
  );
}

export function FeedbackPattern() {
  return (
    <svg className="absolute inset-0 size-full opacity-25" viewBox="0 0 100 100">
      {/* Speech bubble */}
      <path
        d="M20 25 L80 25 Q85 25 85 30 L85 55 Q85 60 80 60 L45 60 L30 75 L30 60 L20 60 Q15 60 15 55 L15 30 Q15 25 20 25"
        stroke="white"
        strokeWidth="3"
        fill="none"
      />
      {/* Dots inside */}
      <circle cx="35" cy="42" r="4" fill="white" />
      <circle cx="50" cy="42" r="4" fill="white" />
      <circle cx="65" cy="42" r="4" fill="white" />
    </svg>
  );
}

export function VotePattern() {
  return (
    <svg className="absolute inset-0 size-full opacity-25" viewBox="0 0 100 100">
      {/* Ballot box */}
      <rect
        x="25"
        y="40"
        width="50"
        height="40"
        rx="3"
        stroke="white"
        strokeWidth="3"
        fill="none"
      />
      {/* Slot */}
      <rect x="40" y="38" width="20" height="6" fill="white" />
      {/* Paper going in */}
      <rect
        x="42"
        y="20"
        width="16"
        height="25"
        rx="2"
        stroke="white"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}
