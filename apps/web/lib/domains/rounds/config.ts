// Canonical list of round display variants (single source of truth).
export const ROUND_VARIANTS = ["default", "ideas", "media"] as const;

export type RoundVariant = (typeof ROUND_VARIANTS)[number];

export const ROUND_VARIANT_OPTIONS = [
  {
    value: "default" as const,
    label: "Default",
    activeClassName: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  },
  {
    value: "ideas" as const,
    label: "Ideas",
    activeClassName: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  },
  {
    value: "media" as const,
    label: "Media",
    activeClassName: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  },
];

export const normalizeRoundVariant = (variant: string | null | undefined): RoundVariant => {
  if (ROUND_VARIANTS.includes(variant as RoundVariant)) {
    return variant as RoundVariant;
  }
  return "default";
};
