"use client";

import { useEffect, useState } from "react";

const examples = [
  "longevity studies",
  "public parks",
  "space research",
  "local journalism",
  "open-source",
  "community gardens",
  "local skate parks",
  "indie games",
  "UFO investigations",
  "climate action",
  "ocean cleanups",
  "indie films",
  "disaster relief",
];

export function RotatingExample() {
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % examples.length);
        setIsVisible(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className={`inline-block transition-all duration-400 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {examples[index]}
    </span>
  );
}
