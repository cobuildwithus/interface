"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { MAX_DPR } from "./constants";
import { initAttractors, initParticles } from "./orbit-factories";
import {
  applyParticleAttraction,
  applyParticleCollisions,
  buildSpatialGrid,
  drawConnections,
} from "./orbit-grid";
import { drawParticles } from "./orbit-render";
import {
  respawnDeadParticles,
  spawnParticles,
  updateAttractors,
  updateParticles,
} from "./orbit-update";
import type { Attractor, MouseState, Particle } from "./types";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useCapitalOrbit(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const particlesRef = useRef<Particle[]>([]);
  const attractorsRef = useRef<Attractor[]>([]);
  const animationRef = useRef<number>(0);
  const sortedIndicesRef = useRef<number[]>([]);
  const desiredParticleCountRef = useRef(0);
  const spawnCooldownRef = useRef(0);
  const mouseRef = useRef<MouseState>({
    x: 0,
    y: 0,
    active: false,
  });

  useIsomorphicLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const gridRef = new Map<string, number[]>();
    let isIntersecting = true;

    const resize = () => {
      const rawDpr = window.devicePixelRatio || 1;
      const dpr = Math.min(prefersReducedMotion.matches ? 1 : MAX_DPR, rawDpr);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const initAttractorState = () => {
      attractorsRef.current = initAttractors(width, height);
    };

    const initParticleState = () => {
      const { particles, sortedIndices, desiredParticleCount, spawnCooldown } = initParticles({
        width,
        height,
        prefersReducedMotion: prefersReducedMotion.matches,
        devicePixelRatio: window.devicePixelRatio || 1,
      });
      particlesRef.current = particles;
      sortedIndicesRef.current = sortedIndices;
      desiredParticleCountRef.current = desiredParticleCount;
      spawnCooldownRef.current = spawnCooldown;
    };

    const shouldRun = () => document.visibilityState === "visible" && isIntersecting;

    const animate = () => {
      if (!shouldRun()) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const attractors = attractorsRef.current;
      const particles = particlesRef.current;
      const sortedIndices = sortedIndicesRef.current;

      let centerX = 0;
      let centerY = 0;
      for (const a of attractors) {
        centerX += a.x;
        centerY += a.y;
      }
      centerX /= attractors.length;
      centerY /= attractors.length;

      updateAttractors(ctx, attractors);
      updateParticles({
        particles,
        attractors,
        mouse: mouseRef.current,
        width,
        height,
        centerX,
        centerY,
        viewportCenterX: width * 0.5,
        viewportCenterY: height * 0.5,
      });

      spawnParticles({
        particles,
        sortedIndices,
        desiredParticleCount: desiredParticleCountRef.current,
        spawnCooldownRef,
        width,
        height,
      });

      buildSpatialGrid({ grid: gridRef, particles, width, height });
      applyParticleAttraction({ grid: gridRef, particles });
      applyParticleCollisions({ grid: gridRef, particles });
      respawnDeadParticles({ particles, width, height });

      sortedIndices.sort((a, b) => particles[a].z - particles[b].z);

      drawParticles({
        ctx,
        particles,
        sortedIndices,
        centerX,
        centerY,
        width,
        height,
      });

      drawConnections({
        ctx,
        grid: gridRef,
        particles,
        centerX,
        centerY,
        width,
        height,
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    resize();
    initAttractorState();
    initParticleState();
    animate();

    const handleResize = () => {
      const oldWidth = width;
      resize();

      const widthChanged = Math.abs(width - oldWidth) > 1;

      if (widthChanged) {
        initAttractorState();
        initParticleState();
      }
    };
    const handleVisibility = () => {
      if (shouldRun()) {
        if (!animationRef.current) animate();
      } else {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
    };
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };
    const handleMotionChange = () => {
      resize();
      initAttractorState();
      initParticleState();
    };

    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              isIntersecting = entries.some((entry) => entry.isIntersecting);
              handleVisibility();
            },
            { threshold: 0.1 }
          )
        : null;
    if (observer) observer.observe(canvas);

    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    prefersReducedMotion.addEventListener("change", handleMotionChange);

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (observer) observer.disconnect();
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      prefersReducedMotion.removeEventListener("change", handleMotionChange);
    };
  }, []);
}
