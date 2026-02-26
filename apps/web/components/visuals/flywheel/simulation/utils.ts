import type { InteractionType } from "../social-post";

export type InteractionCounts = { like: number; comment: number; recast: number };

export function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function shallowEqualCounts(a: InteractionCounts, b: InteractionCounts) {
  return a.like === b.like && a.comment === b.comment && a.recast === b.recast;
}

export function shallowEqualFlash(
  a: Record<InteractionType, boolean>,
  b: Record<InteractionType, boolean>
) {
  return a.like === b.like && a.comment === b.comment && a.recast === b.recast;
}
