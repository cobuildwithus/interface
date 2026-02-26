import { TAU } from "./constants";
import { isOnScreen, toScreen } from "./orbit-utils";
import type { Particle } from "./types";

type DrawParticlesInput = {
  ctx: CanvasRenderingContext2D;
  particles: Particle[];
  sortedIndices: number[];
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

export const drawParticles = ({
  ctx,
  particles,
  sortedIndices,
  centerX,
  centerY,
  width,
  height,
}: DrawParticlesInput) => {
  for (const idx of sortedIndices) {
    const p = particles[idx];
    if (p.fadeOut <= 0) continue;

    const { x: sx, y: sy, scale } = toScreen(p, centerX, centerY);
    if (!isOnScreen(sx, sy, width, height)) continue;

    const size = p.size * scale;
    const opacity = p.opacity * (0.3 + (p.z + 250) / 1000) * scale * p.fadeOut;

    if (p.mass > 2) {
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 3);
      glow.addColorStop(0, `rgba(255,255,255,${opacity * 0.3})`);
      glow.addColorStop(0.5, `rgba(255,255,255,${opacity * 0.1})`);
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, sy, size * 3, 0, TAU);
      ctx.fill();
    }

    ctx.fillStyle = `rgba(255,255,255,${opacity})`;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(0.5, size), 0, TAU);
    ctx.fill();

    if (p.fadeOut >= 1) {
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 0.3) {
        const trailLen = Math.min(speed * 8, 15) * scale;
        const tx = sx - p.vx * trailLen;
        const ty = sy - p.vy * trailLen;
        const trail = ctx.createLinearGradient(sx, sy, tx, ty);
        trail.addColorStop(0, `rgba(255,255,255,${opacity * 0.3})`);
        trail.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = trail;
        ctx.lineWidth = size * 0.3;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    }
  }
};
