export type RankTier = {
  name: string;
  badges: number;
  minActivity: number;
};

const RANK_TIERS: RankTier[] = [
  { name: "Legendary", minActivity: 388, badges: 5 },
  { name: "Hero Member", minActivity: 240, badges: 5 },
  { name: "Sr. Member", minActivity: 120, badges: 4 },
  { name: "Full Member", minActivity: 60, badges: 3 },
  { name: "Member", minActivity: 30, badges: 2 },
  { name: "Jr. Member", minActivity: 15, badges: 1 },
  { name: "Newbie", minActivity: 1, badges: 0 },
  { name: "Brand New", minActivity: 0, badges: 0 },
];

const JR_MEMBER_MIN_ACTIVITY = 15;
const NEYNAR_ACTIVITY_BONUS_MAX = 10;

export function toSafeCount(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function toSafeNeynarScore(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function getEffectiveActivity(activity: number, neynarScore: number): number {
  if (activity >= JR_MEMBER_MIN_ACTIVITY) return activity;
  const bonus = Math.floor(neynarScore * NEYNAR_ACTIVITY_BONUS_MAX);
  return Math.min(activity + bonus, JR_MEMBER_MIN_ACTIVITY);
}

function getRankTier(activity: number): RankTier {
  for (const tier of RANK_TIERS) {
    if (activity >= tier.minActivity) {
      return tier;
    }
  }
  return RANK_TIERS[RANK_TIERS.length - 1]!;
}

export function computeRankTier(
  activity: number | null | undefined,
  neynarScore: number | null | undefined
): RankTier {
  const safeActivity = toSafeCount(activity);
  const safeScore = toSafeNeynarScore(neynarScore);
  const effectiveActivity = getEffectiveActivity(safeActivity, safeScore);
  return getRankTier(effectiveActivity);
}
