"use client";

import { useRef } from "react";
import { useCapitalOrbit } from "./capital-orbit/use-capital-orbit";

export function CapitalOrbit() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useCapitalOrbit(canvasRef);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 0 }}
    />
  );
}
