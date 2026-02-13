import { COBUILD_JUICEBOX_PROJECT_ID } from "@/lib/domains/token/juicebox/constants";

export const PROJECT_ID = COBUILD_JUICEBOX_PROJECT_ID;

export const MIN_BUCKET_MS = 60 * 1000; // 1 minute
export const MAX_POINTS = 240;
export const BUCKET_SIZES_MS = [
  60 * 1000, // 1m
  5 * 60 * 1000, // 5m
  15 * 60 * 1000, // 15m
  30 * 60 * 1000, // 30m
  60 * 60 * 1000, // 1h
  2 * 60 * 60 * 1000, // 2h
  6 * 60 * 60 * 1000, // 6h
  12 * 60 * 60 * 1000, // 12h
  24 * 60 * 60 * 1000, // 1d
  2 * 24 * 60 * 60 * 1000, // 2d
  7 * 24 * 60 * 60 * 1000, // 7d
];
