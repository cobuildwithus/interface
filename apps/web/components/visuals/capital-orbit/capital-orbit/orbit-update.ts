import { EDGE_PULL, TAU } from "./constants";
import { randCentered } from "./orbit-utils";
import type { Attractor, MouseState, Particle } from "./types";
import { createParticle, spawnInitialEdgeParticle } from "./orbit-factories";

type UpdateParticlesInput = {
  particles: Particle[];
  attractors: Attractor[];
  mouse: MouseState;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  viewportCenterX: number;
  viewportCenterY: number;
};

type SpawnParticlesInput = {
  particles: Particle[];
  sortedIndices: number[];
  desiredParticleCount: number;
  spawnCooldownRef: { current: number };
  width: number;
  height: number;
};

type RespawnDeadInput = {
  particles: Particle[];
  width: number;
  height: number;
};

export const updateAttractors = (ctx: CanvasRenderingContext2D, attractors: Attractor[]) => {
  for (const a of attractors) {
    a.vx += (a.baseX - a.x) * 0.00008 + randCentered(0.008);
    a.vy += (a.baseY - a.y) * 0.00008 + randCentered(0.008);
    a.vx *= 0.995;
    a.vy *= 0.995;
    a.x += a.vx;
    a.y += a.vy;

    a.brightness = Math.max(0.08, a.brightness * 0.9985);

    const glowSize = 30 + a.mass * 20 + a.absorbedMass * 2;
    const grad = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, glowSize);
    grad.addColorStop(0, `rgba(255,255,255,${a.brightness * 0.5})`);
    grad.addColorStop(0.4, `rgba(255,255,255,${a.brightness * 0.15})`);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(a.x, a.y, glowSize, 0, TAU);
    ctx.fill();

    ctx.fillStyle = `rgba(255,255,255,${a.brightness * 0.8})`;
    ctx.beginPath();
    ctx.arc(a.x, a.y, Math.min(12, 1.5 + a.mass * 1.5 + a.absorbedMass * 0.3), 0, TAU);
    ctx.fill();
  }
};

export const updateParticles = ({
  particles,
  attractors,
  mouse,
  width,
  height,
  centerX,
  centerY,
  viewportCenterX,
  viewportCenterY,
}: UpdateParticlesInput) => {
  void centerY;
  for (const p of particles) {
    if (!p.alive) continue;

    if (p.fadeOut < 1) {
      p.fadeOut -= 0.025;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.x += p.vx;
      p.y += p.vy;

      if (p.fadeOut <= 0) {
        const target = attractors[p.targetAttractorIdx];
        if (target) {
          target.absorbedMass += p.mass * 0.1;
          target.brightness = Math.min(0.5, target.brightness + p.mass * 0.007);
        }
        Object.assign(p, createParticle(width, height));
      }
      continue;
    }

    let closestDist = Infinity;
    let closestIdx = -1;
    for (let i = 0; i < attractors.length; i++) {
      const a = attractors[i];
      const dx = a.x - p.x;
      const dy = a.y - p.y;
      const distSq = dx * dx + dy * dy + 100;
      const dist = Math.sqrt(distSq);
      const force = (a.mass * 25) / distSq;
      p.vx += (dx / dist) * force;
      p.vy += (dy / dist) * force;
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    if (mouse.active) {
      const mx = mouse.x;
      const my = mouse.y;
      const mdx = mx - p.x;
      const mdy = my - p.y;
      const mDistSq = mdx * mdx + mdy * mdy + 400;
      const mDist = Math.sqrt(mDistSq);
      const mouseForce = 6 / mDistSq;
      p.vx += (mdx / mDist) * mouseForce;
      p.vy += (mdy / mDist) * mouseForce;
    }

    const edgeFactorX = Math.abs(p.x - viewportCenterX) / Math.max(viewportCenterX, 1);
    const edgeFactorY = Math.abs(p.y - viewportCenterY) / Math.max(viewportCenterY, 1);
    const edgeFactor = Math.max(edgeFactorX, edgeFactorY);
    if (edgeFactor > 0.9) {
      const dirX = viewportCenterX - p.x;
      const dirY = viewportCenterY - p.y;
      const dirMag = Math.hypot(dirX, dirY) || 1;
      const pullFactor = ((edgeFactor - 0.9) / 0.1) * EDGE_PULL;
      p.vx += (dirX / dirMag) * pullFactor;
      p.vy += (dirY / dirMag) * pullFactor;
    }

    p.vz -= p.z * 0.0001;
    p.vx *= 0.996;
    p.vy *= 0.996;
    p.vz *= 0.99;

    const sideSpeedScale = p.x < centerX ? 0.85 : 0.45;
    p.x += p.vx * sideSpeedScale;
    p.y += p.vy * sideSpeedScale;
    p.z += p.vz;

    if (closestDist < 25) {
      p.fadeOut = 0.99;
      p.targetAttractorIdx = closestIdx;
    }

    if (
      Math.abs(p.x - width / 2) > width / 2 + 400 ||
      Math.abs(p.y - height / 2) > height / 2 + 400
    ) {
      Object.assign(p, createParticle(width, height));
    }
  }
};

export const spawnParticles = ({
  particles,
  sortedIndices,
  desiredParticleCount,
  spawnCooldownRef,
  width,
  height,
}: SpawnParticlesInput) => {
  if (particles.length < desiredParticleCount) {
    spawnCooldownRef.current -= 1;
    if (spawnCooldownRef.current <= 0) {
      const deficit = desiredParticleCount - particles.length;
      const waveSize = Math.min(4, Math.ceil(deficit / 25));
      for (let i = 0; i < waveSize && particles.length < desiredParticleCount; i++) {
        const newParticle = spawnInitialEdgeParticle(width, height);
        particles.push(newParticle);
        sortedIndices.push(particles.length - 1);
      }
      spawnCooldownRef.current = Math.max(6, Math.round(60 / waveSize));
    }
  } else {
    spawnCooldownRef.current = 0;
  }
};

export const respawnDeadParticles = ({ particles, width, height }: RespawnDeadInput) => {
  for (const p of particles) {
    if (!p.alive) Object.assign(p, createParticle(width, height));
  }
};
