import { BUCKET_SIZES_MS, MAX_POINTS, MIN_BUCKET_MS } from "./constants";

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function bucketKey(timestampMs: number, bucketSizeMs: number): number {
  return Math.floor(timestampMs / bucketSizeMs) * bucketSizeMs;
}

export function minDefined(...values: Array<number | null | undefined>): number | null {
  let result: number | null = null;
  for (const value of values) {
    if (value === null || value === undefined) continue;
    result = result === null ? value : Math.min(result, value);
  }
  return result;
}

export function chooseBucketSizeMs(startMs: number, endMs: number): number {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return MIN_BUCKET_MS;
  }
  const rangeMs = endMs - startMs;
  const target = Math.max(MIN_BUCKET_MS, Math.ceil(rangeMs / MAX_POINTS));
  for (const size of BUCKET_SIZES_MS) {
    if (size >= target) return size;
  }
  return BUCKET_SIZES_MS[BUCKET_SIZES_MS.length - 1]!;
}
