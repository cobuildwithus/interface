type QuadraticResult = {
  score: number;
  backers: number;
  contribution: number;
};

/**
 * Calculates quadratic score for a single cast's eligible contributions.
 * Score = (sum of sqrt(tokens))^2
 * Also returns the total eligible contribution (for gap math).
 */
export function calculateQuadraticScore(
  eligibleBackerTotals: Map<string, number>
): QuadraticResult {
  let sumSqrt = 0;
  let backers = 0;
  let contribution = 0;

  for (const tokens of eligibleBackerTotals.values()) {
    if (tokens <= 0) continue;
    contribution += tokens;
    sumSqrt += Math.sqrt(tokens);
    backers += 1;
  }

  return { score: sumSqrt * sumSqrt, backers, contribution };
}

/**
 * Calculates quadratic scores for all casts from their aggregations.
 */
export function calculateAllQuadraticScores(
  aggregations: Map<string, { eligibleBackerTotals: Map<string, number> }>
): Map<string, QuadraticResult> {
  const results = new Map<string, QuadraticResult>();

  for (const [hashLower, stats] of aggregations) {
    results.set(hashLower, calculateQuadraticScore(stats.eligibleBackerTotals));
  }

  return results;
}

/**
 * Distributes the quadratic match pool.
 * Primary: CQF (gap-based). Fallback: QF-score proportional if total gap is 0.
 * If both gap and score are 0, split evenly across round hashes.
 */
export function distributeMatchPool(
  quadraticByHash: Map<string, QuadraticResult>,
  roundHashCount: number,
  totalPool: number
): { matchByHash: Map<string, number>; totalScore: number } {
  const EPS = 1e-9;
  let totalGap = 0;
  const gaps = new Map<string, number>();

  for (const [hash, { score, contribution }] of quadraticByHash.entries()) {
    const gap = Math.max(score - contribution, 0);
    gaps.set(hash, gap);
    totalGap += gap;
  }

  const matchByHash = new Map<string, number>();
  if (totalGap > EPS) {
    // Primary CQF allocation: proportional to gap
    const matchScale = totalPool / totalGap;
    for (const [hash, gap] of gaps) {
      matchByHash.set(hash, gap * matchScale);
    }
    return { matchByHash, totalScore: totalGap };
  }

  // Fallback: use QF scores to allocate the pool
  let totalScore = 0;
  for (const { score } of quadraticByHash.values()) {
    totalScore += score;
  }

  if (totalScore > EPS) {
    const matchScale = totalPool / totalScore;
    for (const [hash, { score }] of quadraticByHash) {
      matchByHash.set(hash, score * matchScale);
    }
    return { matchByHash, totalScore };
  }

  // Final fallback: even split when nothing else to do
  const evenSplit = roundHashCount > 0 ? totalPool / roundHashCount : 0;
  for (const hash of quadraticByHash.keys()) {
    matchByHash.set(hash, evenSplit);
  }

  return { matchByHash, totalScore };
}
