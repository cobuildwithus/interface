export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  opacity: number;
  mass: number;
  alive: boolean;
  fadeOut: number;
  targetAttractorIdx: number;
}

export interface Attractor {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  mass: number;
  vx: number;
  vy: number;
  absorbedMass: number;
  brightness: number;
}

export type MouseState = {
  x: number;
  y: number;
  active: boolean;
};
