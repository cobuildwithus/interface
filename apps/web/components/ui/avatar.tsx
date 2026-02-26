"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: ReactNode;
  size?: number;
  square?: boolean;
}

function resolveFallbackText(value: string): string {
  const trimmed = value.trim();
  const lettersOnly = (input: string) => input.replace(/[^a-z]/gi, "");
  if (/^0x[0-9a-f]{2,}$/i.test(trimmed)) {
    const shortened = lettersOnly(trimmed.replace(/^0x/i, "")).slice(0, 2).toUpperCase();
    return shortened || "??";
  }
  const fallback = lettersOnly(trimmed).slice(0, 2).toUpperCase();
  return fallback || "??";
}

function Avatar({ src, alt = "", fallback, size = 40, square = false }: AvatarProps) {
  const [error, setError] = useState(false);

  const showFallback = !src || error;
  const fallbackContent = typeof fallback === "string" ? resolveFallbackText(fallback) : fallback;
  const borderRadius = square ? "rounded-sm" : "rounded-full";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden ${borderRadius} text-sm font-medium text-zinc-300 ${showFallback ? "bg-zinc-700" : ""}`}
      style={{ width: size, height: size }}
    >
      {showFallback ? (
        fallbackContent
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={`${size}px`}
          className="object-cover"
          loading="lazy"
          unoptimized
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

export { Avatar };
