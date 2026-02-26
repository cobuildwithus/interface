import { MAX_DPR } from "./constants";
import { rand, randCentered } from "./orbit-utils";
import type { Attractor, Particle } from "./types";

type InitParticlesInput = {
  width: number;
  height: number;
  prefersReducedMotion: boolean;
  devicePixelRatio: number;
};

type InitParticlesOutput = {
  particles: Particle[];
  sortedIndices: number[];
  desiredParticleCount: number;
  spawnCooldown: number;
};

export const createParticle = (
  width: number,
  height: number,
  { minOffset = 50, maxOffset = 150 }: { minOffset?: number; maxOffset?: number } = {}
): Particle => {
  const edge = Math.floor(Math.random() * 4);
  const offset = rand(minOffset, maxOffset);

  let x: number;
  let y: number;
  if (edge === 0) {
    x = Math.random() * width;
    y = -offset;
  } else if (edge === 1) {
    x = width + offset;
    y = Math.random() * height;
  } else if (edge === 2) {
    x = Math.random() * width;
    y = height + offset;
  } else {
    x = -offset;
    y = Math.random() * height;
  }

  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const targetX = centerX + randCentered(width * 0.2);
  const targetY = centerY + randCentered(height * 0.2);
  const dx = targetX - x;
  const dy = targetY - y;
  const mag = Math.hypot(dx, dy) || 1;
  const radialDirX = dx / mag;
  const radialDirY = dy / mag;
  const radialSpeed = rand(0.1, 0.24);
  const tangentialSpeed = randCentered(0.05);
  const tangentDirX = -radialDirY;
  const tangentDirY = radialDirX;

  return {
    x,
    y,
    z: rand(-80, 140),
    vx: radialDirX * radialSpeed + tangentDirX * tangentialSpeed + randCentered(0.01),
    vy: radialDirY * radialSpeed + tangentDirY * tangentialSpeed + randCentered(0.01),
    vz: 0,
    size: rand(0.5, 2),
    opacity: rand(0.3, 0.7),
    mass: 1,
    alive: true,
    fadeOut: 1,
    targetAttractorIdx: -1,
  };
};

export const spawnInitialEdgeParticle = (width: number, height: number): Particle => {
  const edge = Math.floor(Math.random() * 4);
  const inset = rand(6, 42);
  let x: number;
  let y: number;

  if (edge === 0) {
    x = rand(0, width);
    y = inset;
  } else if (edge === 1) {
    x = width - inset;
    y = rand(0, height);
  } else if (edge === 2) {
    x = rand(0, width);
    y = height - inset;
  } else {
    x = inset;
    y = rand(0, height);
  }

  const cx = width / 2;
  const cy = height / 2;
  const jitteredTargetX = cx + randCentered(width * 0.25);
  const jitteredTargetY = cy + randCentered(height * 0.25);
  const dx = jitteredTargetX - x;
  const dy = jitteredTargetY - y;
  const mag = Math.hypot(dx, dy) || 1;
  const radialDirX = dx / mag;
  const radialDirY = dy / mag;
  const inwardSpeed = rand(0.0015, 0.008);
  const tangentDirX = -radialDirY;
  const tangentDirY = radialDirX;
  const tangentialSpeed = randCentered(0.04);
  const jitterX = randCentered(0.008);
  const jitterY = randCentered(0.008);

  return {
    x,
    y,
    z: rand(-10, 10),
    vx: radialDirX * inwardSpeed + tangentDirX * tangentialSpeed + jitterX,
    vy: radialDirY * inwardSpeed + tangentDirY * tangentialSpeed + jitterY,
    vz: 0,
    size: rand(0.5, 2),
    opacity: rand(0.3, 0.7),
    mass: 1,
    alive: true,
    fadeOut: 1,
    targetAttractorIdx: -1,
  };
};

export const initAttractors = (width: number, height: number): Attractor[] =>
  Array.from({ length: 12 }, () => {
    const baseX = rand(width * 0.1, width * 0.9);
    const baseY = rand(height * 0.15, height * 0.85);
    return {
      x: baseX,
      y: baseY,
      baseX,
      baseY,
      mass: rand(0.3, 0.8),
      vx: randCentered(0.15),
      vy: randCentered(0.15),
      absorbedMass: 0,
      brightness: rand(0.08, 0.13),
    };
  });

export const initParticles = ({
  width,
  height,
  prefersReducedMotion,
  devicePixelRatio,
}: InitParticlesInput): InitParticlesOutput => {
  const baseCount = Math.min(270, Math.floor(width / 5));
  const dpr = Math.min(prefersReducedMotion ? 1 : MAX_DPR, devicePixelRatio || 1);
  const mobileScale = width < 640 ? 0.55 : width < 1024 ? 0.8 : 1;
  const targetCount = Math.round((baseCount * mobileScale) / Math.sqrt(dpr));
  const initialCount = Math.max(6, Math.round(targetCount * 0.15));
  const particles = Array.from({ length: initialCount }, () =>
    spawnInitialEdgeParticle(width, height)
  );
  const sortedIndices = particles.map((_, i) => i);

  return {
    particles,
    sortedIndices,
    desiredParticleCount: targetCount,
    spawnCooldown: 0,
  };
};
