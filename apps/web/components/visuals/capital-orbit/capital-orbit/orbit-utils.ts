import { GRID_SIZE, PERSPECTIVE } from "./constants";

type Position3d = { x: number; y: number; z: number };

type ScreenPoint = {
  x: number;
  y: number;
  scale: number;
};

export const rand = (min: number, max: number) => min + Math.random() * (max - min);

export const randCentered = (range: number) => (Math.random() - 0.5) * range;

export const toScreen = (p: Position3d, cx: number, cy: number): ScreenPoint => {
  const scale = PERSPECTIVE / (PERSPECTIVE + p.z);
  return {
    x: p.x * scale + (1 - scale) * cx,
    y: p.y * scale + (1 - scale) * cy,
    scale,
  };
};

export const isOnScreen = (x: number, y: number, width: number, height: number) =>
  x >= -10 && x <= width + 10 && y >= -10 && y <= height + 10;

export const gridKey = (x: number, y: number) =>
  `${Math.floor(x / GRID_SIZE)},${Math.floor(y / GRID_SIZE)}`;

export const getNeighborKeys = (key: string) => {
  const [gx, gy] = key.split(",").map(Number);
  return [key, `${gx + 1},${gy}`, `${gx},${gy + 1}`, `${gx + 1},${gy + 1}`];
};
