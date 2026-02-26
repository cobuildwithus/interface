import { getNeighborKeys, gridKey, isOnScreen, toScreen } from "./orbit-utils";
import type { Particle } from "./types";

type GridInput = {
  grid: Map<string, number[]>;
  particles: Particle[];
  width: number;
  height: number;
};

type ConnectionInput = GridInput & {
  ctx: CanvasRenderingContext2D;
  centerX: number;
  centerY: number;
};

type AttractionInput = {
  grid: Map<string, number[]>;
  particles: Particle[];
};

export const buildSpatialGrid = ({ grid, particles, width, height }: GridInput) => {
  for (const cell of grid.values()) cell.length = 0;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (!p.alive || p.fadeOut < 1) continue;
    if (p.x < 50 || p.x > width - 50 || p.y < 50 || p.y > height - 50) continue;
    const key = gridKey(p.x, p.y);
    const cell = grid.get(key);
    if (cell) cell.push(i);
    else grid.set(key, [i]);
  }
};

export const applyParticleAttraction = ({ grid, particles }: AttractionInput) => {
  for (const [key, indices] of grid) {
    const neighborKeys = getNeighborKeys(key);
    for (let ii = 0; ii < indices.length; ii++) {
      const a = particles[indices[ii]];
      for (const nKey of neighborKeys) {
        const neighbors = grid.get(nKey);
        if (!neighbors) continue;
        for (let jj = nKey === key ? ii + 1 : 0; jj < neighbors.length; jj++) {
          const b = particles[neighbors[jj]];
          if (!b.alive || b.fadeOut < 1) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 225 || distSq > 3600) continue;
          const dist = Math.sqrt(distSq);
          const dirX = dx / dist;
          const dirY = dy / dist;
          const baseForce = (0.00015 * (a.mass + b.mass)) / dist;
          const swirlForce = (0.00006 * (a.mass + b.mass)) / dist;

          a.vx += dirX * baseForce;
          a.vy += dirY * baseForce;
          b.vx -= dirX * baseForce;
          b.vy -= dirY * baseForce;

          const tangentX = -dirY;
          const tangentY = dirX;
          a.vx += tangentX * swirlForce;
          a.vy += tangentY * swirlForce;
          b.vx -= tangentX * swirlForce;
          b.vy -= tangentY * swirlForce;
        }
      }
    }
  }
};

export const applyParticleCollisions = ({ grid, particles }: AttractionInput) => {
  for (const [key, indices] of grid) {
    const neighborKeys = getNeighborKeys(key);
    for (let ii = 0; ii < indices.length; ii++) {
      const a = particles[indices[ii]];
      for (const nKey of neighborKeys) {
        const neighbors = grid.get(nKey);
        if (!neighbors) continue;
        for (let jj = nKey === key ? ii + 1 : 0; jj < neighbors.length; jj++) {
          const b = particles[neighbors[jj]];
          if (!b.alive || b.fadeOut < 1) continue;

          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dz = a.z - b.z;
          const distSq = dx * dx + dy * dy + dz * dz;
          const threshold = (a.size + b.size) * 2;

          if (distSq < threshold * threshold) {
            const total = a.mass + b.mass;
            const [s, d] = a.mass >= b.mass ? [a, b] : [b, a];
            s.vx = (s.vx * s.mass + d.vx * d.mass) / total;
            s.vy = (s.vy * s.mass + d.vy * d.mass) / total;
            s.vz = (s.vz * s.mass + d.vz * d.mass) / total;
            s.x = (s.x * s.mass + d.x * d.mass) / total;
            s.y = (s.y * s.mass + d.y * d.mass) / total;
            s.z = (s.z * s.mass + d.z * d.mass) / total;
            s.mass = total;
            s.size = Math.min(8, Math.sqrt(total) * 1.2);
            s.opacity = Math.min(0.9, s.opacity + 0.05);
            d.alive = false;
          }
        }
      }
    }
  }
};

export const drawConnections = ({
  ctx,
  grid,
  particles,
  centerX,
  centerY,
  width,
  height,
}: ConnectionInput) => {
  ctx.lineWidth = 0.5;
  for (const [key, indices] of grid) {
    const neighborKeys = getNeighborKeys(key);
    for (let ii = 0; ii < indices.length; ii++) {
      const a = particles[indices[ii]];
      if (a.fadeOut < 0.5) continue;

      const sa = toScreen(a, centerX, centerY);
      if (!isOnScreen(sa.x, sa.y, width, height)) continue;

      for (const nKey of neighborKeys) {
        const neighbors = grid.get(nKey);
        if (!neighbors) continue;
        for (let jj = nKey === key ? ii + 1 : 0; jj < neighbors.length; jj++) {
          const b = particles[neighbors[jj]];
          if (b.fadeOut < 0.5) continue;

          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dz = a.z - b.z;
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq >= 3600) continue;

          const sb = toScreen(b, centerX, centerY);
          if (!isOnScreen(sb.x, sb.y, width, height)) continue;

          const opacity = (1 - Math.sqrt(distSq) / 60) * 0.04 * Math.min(a.fadeOut, b.fadeOut);
          ctx.strokeStyle = `rgba(255,255,255,${opacity})`;
          ctx.beginPath();
          ctx.moveTo(sa.x, sa.y);
          ctx.lineTo(sb.x, sb.y);
          ctx.stroke();
        }
      }
    }
  }
};
