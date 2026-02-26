"use client";

import { Globe } from "./globe";

interface BuildSectionProps {
  label: string;
  fireworkTrigger: number;
  isAnimating: boolean;
}

export function BuildSection({ label, fireworkTrigger, isAnimating }: BuildSectionProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-xs tracking-widest text-neutral-500 uppercase">Build</div>
      <div className="relative h-[240px] w-80 overflow-hidden sm:w-96">
        <Globe className="absolute inset-0" fireworkTrigger={fireworkTrigger} />
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span
            className={`rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm transition-all duration-150 ${
              isAnimating ? "scale-95 opacity-0" : "scale-100 opacity-100"
            }`}
          >
            {label}
          </span>
        </div>
      </div>
      <p className="max-w-xs text-center text-xs text-neutral-400">
        Builders make grassroots impact and post evidence online.
      </p>
    </div>
  );
}
