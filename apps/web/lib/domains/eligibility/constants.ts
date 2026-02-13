/**
 * Hard-coded global eligibility threshold for Neynar score.
 * Users with a score below this value are ineligible for posting and boosts.
 */
export const NEYNAR_ELIGIBILITY_MIN_SCORE = 0.55 as const;

/**
 * Check if a neynar score indicates the user is ineligible for boosts.
 * Returns true if score is null (unknown) or below threshold.
 */
export function isNeynarScoreIneligible(score: number | null): boolean {
  return score === null || score < NEYNAR_ELIGIBILITY_MIN_SCORE;
}
