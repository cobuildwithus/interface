import { BASE_POINT_SCALE } from "./shaders";

export const getPointScale = () => BASE_POINT_SCALE * window.devicePixelRatio;

export const chooseDotCount = () => {
  const dpr = window.devicePixelRatio || 1;
  const base = window.innerWidth < 768 ? 80000 : 150000;
  return Math.floor(base * Math.min(dpr, 2));
};
